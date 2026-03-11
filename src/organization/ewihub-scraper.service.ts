import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as cheerio from 'cheerio';
import { Employee, EmployeeDocument } from '../employee/schemas/employee.schema';

const MAX_RETRIES = 3;
const DELAY_MS = 500;
const CONCURRENCY = 10;

const ATTR_ALIASES: Record<string, string> = {
  started: 'startedOn',
  'started on': 'startedOn',
  completed: 'completedOn',
  'completed on': 'completedOn',
  age: 'age',
  height: 'height',
  'dominant hand': 'dominantHand',
  dominanthand: 'dominantHand',
  handedness: 'dominantHand',
  bifocals: 'bifocals',
  'visual issue': 'visualIssue',
  visualissue: 'visualIssue',
  'computer time': 'computerTime',
  computertime: 'computerTime',
  'dual monitor': 'dualMonitor',
  dualmonitor: 'dualMonitor',
  'dual monitors': 'dualMonitor',
  laptop: 'laptop',
  'sit to stand': 'sitToStand',
  sittostand: 'sitToStand',
  'sit to stand desk': 'sitToStand',
  demographic: 'demographic',
  demographics: 'demographic',
  discomfort: 'discomfort',
  discomforts: 'discomfortAreas',
  'discomfort areas': 'discomfortAreas',
  discomfortareas: 'discomfortAreas',
  'adjustment result': 'adjustmentResult',
  adjustmentresult: 'adjustmentResult',
  action: 'actionNeeded',
  actions: 'actionNeeded',
  'action needed': 'actionNeeded',
  actionneeded: 'actionNeeded',
  equipment: 'equipmentNeeded',
  'equipment needed': 'equipmentNeeded',
  equipmentneeded: 'equipmentNeeded',
  result: 'result',
  issues: 'adjustmentResult',
};

const BODY_PART_ALIASES: Record<string, string> = {
  'upper-back': 'upperBack',
  'mid-back': 'midBack',
  'lower-back': 'lowerBack',
  buttocks: 'buttocks',
  head: 'head',
  neck: 'neck',
  eyes: 'eyes',
  'left-shoulder': 'leftShoulder',
  'right-shoulder': 'rightShoulder',
  'left-upper-arm': 'leftUpperArm',
  'right-upper-arm': 'rightUpperArm',
  'left-elbow': 'leftElbow',
  'right-elbow': 'rightElbow',
  'left-lower-arm': 'leftLowerArm',
  'right-lower-arm': 'rightLowerArm',
  'left-wrist': 'leftWrist',
  'right-wrist': 'rightWrist',
  'left-hand': 'leftHand',
  'right-hand': 'rightHand',
  'left-thigh': 'leftThigh',
  'right-thigh': 'rightThigh',
  'left-knee': 'leftKnee',
  'right-knee': 'rightKnee',
  'left-lower-leg': 'leftLowerLeg',
  'right-lower-leg': 'rightLowerLeg',
  'left-foot-or-ankle': 'leftFootOrAnkle',
  'right-foot-or-ankle': 'rightFootOrAnkle',
};

class HttpSession {
  private cookies: Record<string, string> = {};

  private storeCookies(res: Response): void {
    const raw: string[] =
      (res.headers as any).getSetCookie?.() ??
      (res.headers as any).raw?.()['set-cookie'] ??
      [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const [name, ...rest] = pair.split('=');
      this.cookies[name.trim()] = rest.join('=').trim();
    }
  }

  private cookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async fetch(url: string, opts: RequestInit & { headers?: Record<string, string> } = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      Connection: 'keep-alive',
      Cookie: this.cookieHeader(),
      ...(opts.headers as Record<string, string>),
    };

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url, {
          ...opts,
          headers,
          redirect: 'manual',
        });

        this.storeCookies(res);

        if ([301, 302, 303, 307, 308].includes(res.status)) {
          const location = res.headers.get('location');
          if (location) {
            const next = new URL(location, url).href;
            return this.fetch(next);
          }
        }

        return res;
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          const wait = attempt * 2000;
          await new Promise((r) => setTimeout(r, wait));
        } else {
          throw err;
        }
      }
    }

    throw new Error(`Failed to fetch ${url} after ${MAX_RETRIES} retries`);
  }
}


interface ScrapedTraining {
  course: string;
  status: string;
  attributes: Record<string, string>;
  bodyDiagram?: Record<string, number> | null;
}

interface ScrapedEmployee {
  name: string;
  email: string;
  profileUrl: string;
  trainings: ScrapedTraining[];
  bodyDiagram: Record<string, number> | null;
}

export interface SyncResult {
  success: boolean;
  message: string;
  totalScraped: number;
  created: number;
  updated: number;
  errors: string[];
}


@Injectable()
export class EwihubScraperService {
  private readonly logger = new Logger(EwihubScraperService.name);

  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) { }


  async scrapeAndSync(
    orgId: string,
    email: string,
    password: string,
  ): Promise<SyncResult> {
    const session = new HttpSession();

    this.logger.log(`Logging in to ewihub.com as ${email}...`);
    await this.login(session, email, password);
    this.logger.log('Login successful');

    this.logger.log('Fetching employee directory...');
    const links = await this.fetchEmployeeLinks(session);
    this.logger.log(`Found ${links.length} employee link(s)`);

    if (links.length === 0) {
      return {
        success: true,
        message: 'No employees found on ewihub.com for this account',
        totalScraped: 0,
        created: 0,
        updated: 0,
        errors: [],
      };
    }

    this.logger.log(`Scraping ${links.length} profiles (concurrency=${CONCURRENCY})...`);
    const scraped = await this.scrapeProfiles(session, links);
    this.logger.log(`Scraped ${scraped.length} employee profiles`);

    const result = await this.upsertEmployees(orgId, scraped);
    this.logger.log(
      `Sync complete: created=${result.created} updated=${result.updated} errors=${result.errors.length}`,
    );

    return result;
  }


  private async login(session: HttpSession, email: string, password: string): Promise<void> {
    const loginPageRes = await session.fetch('https://ewihub.com/login');
    const loginPageHtml = await loginPageRes.text();
    const token = this.extractCsrfToken(loginPageHtml);

    if (!token) {
      throw new BadRequestException('Could not retrieve CSRF token from ewihub.com login page');
    }

    const loginRes = await session.fetch('https://ewihub.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        _token: token,
        email,
        password,
        remember: 'on',
      }).toString(),
    });

    const postLoginHtml = await loginRes.text();
    if (postLoginHtml.includes('These credentials do not match')) {
      throw new UnauthorizedException('EWI Hub login failed — invalid credentials');
    }
  }


  private async fetchEmployeeLinks(session: HttpSession): Promise<string[]> {
    const res = await session.fetch('https://ewihub.com/employees?length=-1');
    let html = await res.text();
    let links = this.parseEmployeeLinks(html);

    if (links.length === 0) {
      const res2 = await session.fetch('https://ewihub.com/employees');
      html = await res2.text();
      links = this.parseEmployeeLinks(html);
    }

    return links;
  }


  private async scrapeProfiles(
    session: HttpSession,
    links: string[],
  ): Promise<ScrapedEmployee[]> {
    const results: ScrapedEmployee[] = [];
    let idx = 0;

    const worker = async () => {
      while (idx < links.length) {
        const i = idx++;
        try {
          const res = await session.fetch(links[i]);
          const html = await res.text();
          results[i] = this.parseEmployeeProfile(html, links[i]);
          await new Promise((r) => setTimeout(r, DELAY_MS));
        } catch (err) {
          this.logger.warn(`Failed to scrape ${links[i]}: ${(err as Error).message}`);
          results[i] = null as any;
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, links.length) }, () => worker()),
    );

    return results.filter(Boolean);
  }


  private async upsertEmployees(
    orgId: string,
    employees: ScrapedEmployee[],
  ): Promise<SyncResult> {
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const scraped of employees) {
      try {
        let employee = await this.employeeModel
          .findOne({ email: scraped.email, organization: new Types.ObjectId(orgId) })
          .exec();

        if (!employee) {
          employee = new this.employeeModel({
            name: scraped.name,
            email: scraped.email,
            oldProfileUrl: scraped.profileUrl || null,
            organization: new Types.ObjectId(orgId),
            trainings: [],
          });
          created++;
        } else {
          if (scraped.name && scraped.name !== employee.name) {
            employee.name = scraped.name;
          }
          if (scraped.profileUrl) {
            employee.oldProfileUrl = scraped.profileUrl;
          }
          updated++;
        }

        this.mergeTrainings(employee, scraped);
        await employee.save();
      } catch (err) {
        const msg = `Failed to upsert ${scraped.email}: ${(err as Error).message}`;
        this.logger.warn(msg);
        errors.push(msg);
      }
    }

    return {
      success: true,
      message: `Synced ${employees.length} employees from ewihub.com`,
      totalScraped: employees.length,
      created,
      updated,
      errors,
    };
  }

  private mergeTrainings(employee: EmployeeDocument, scraped: ScrapedEmployee): void {
    for (const st of scraped.trainings) {
      const parsed = this.transformScrapedTraining(st);
      const existing = employee.trainings.find((t) => t.course === parsed.course);

      if (existing) {
        existing.status = parsed.status;
        if (parsed.startedDate) existing.startedDate = parsed.startedDate;
        if (parsed.completedDate) existing.completedDate = parsed.completedDate;
        if (parsed.courseData) existing.courseData = parsed.courseData;
      } else {
        employee.trainings.push(parsed as any);
      }
    }
  }


  private extractCsrfToken(html: string): string | undefined {
    const $ = cheerio.load(html);
    return $('input[name="_token"]').val() as string | undefined;
  }

  private parseEmployeeLinks(html: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    $('#tblReport tbody tr a.employee-link').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        links.push(href.startsWith('http') ? href : `https://ewihub.com${href}`);
      }
    });
    return links;
  }

  private parseEmployeeProfile(html: string, profileUrl: string): ScrapedEmployee {
    const $ = cheerio.load(html);

    const name = $('.widget-user-username').text().trim() || 'Unknown';
    const email = $('.widget-user-desc').text().trim() || 'Unknown';
    const trainings: ScrapedTraining[] = [];
    const bodyDiagram = this.parseBodyDiagram($);

    $('.timeline-item').each((_, item) => {
      const courseName = $(item).find('.timeline-header a').text().trim();
      if (!courseName) return;

      const status = $(item).find('.ribbon').text().trim() || 'Unknown';
      const attributes: Record<string, string> = {};

      $(item)
        .find('.timeline-body table tr')
        .each((__, row) => {
          const rawKey = $(row).find('th').text().trim().replace(/:$/, '');
          let val = $(row)
            .find('td')
            .html()
            ?.replace(/<br\s*\/?>/gi, ', ')
            .replace(/<\/?[^>]+(>|$)/g, '')
            .replace(/\s\s+/g, ' ')
            .trim();
          if (val?.endsWith(',')) val = val.slice(0, -1);

          if (rawKey && val) {
            const key = this.normaliseAttrKey(rawKey);
            attributes[key] = val;
          }
        });

      const entry: ScrapedTraining = { course: courseName, status, attributes };
      if (/self.?assessment/i.test(courseName) && bodyDiagram) {
        entry.bodyDiagram = bodyDiagram;
      }
      trainings.push(entry);
    });

    return { name, email, trainings, bodyDiagram, profileUrl };
  }

  private parseBodyDiagram($: cheerio.CheerioAPI): Record<string, number> | null {
    const diagram: Record<string, number> = {};
    let found = false;

    $('.body-part-text').each((_, el) => {
      const classes = $(el).attr('class') || '';
      const match = classes.match(/([\w-]+)-text\s+body-part-text/);
      if (!match) return;

      const rawPart = match[1];
      const camel = BODY_PART_ALIASES[rawPart] || rawPart;
      const severity = parseInt($(el).text().trim(), 10);

      if (!isNaN(severity)) {
        diagram[camel] = severity;
        found = true;
      }
    });

    if (!found) {
      $('.body-part').each((_, el) => {
        const tag = ((el as any).tagName || (el as any).name || '').toLowerCase();
        if (tag !== 'path') return;

        const classes = $(el).attr('class') || '';
        const match = classes.match(/([\w-]+)\s+body-part\s+spectrum-(\d+)/);
        if (!match) return;

        const rawPart = match[1];
        if (rawPart === 'left-eye' || rawPart === 'right-eye') return;

        const camel = BODY_PART_ALIASES[rawPart] || rawPart;
        const severity = parseInt(match[2], 10);

        if (!isNaN(severity)) {
          diagram[camel] = severity;
          found = true;
        }
      });

      if (!diagram.eyes) {
        $('path.eyes').each((_, el) => {
          const classes = $(el).attr('class') || '';
          const m = classes.match(/spectrum-(\d+)/);
          if (m && !diagram.eyes) {
            diagram.eyes = parseInt(m[1], 10);
            found = true;
          }
        });
      }
    }

    return found ? diagram : null;
  }


  private transformScrapedTraining(st: ScrapedTraining): {
    course: string;
    status: string;
    startedDate: string | null;
    completedDate: string | null;
    courseData: Record<string, any> | null;
  } {
    const a = st.attributes;
    const status = this.mapStatus(st.status);

    const result: any = {
      course: st.course,
      status,
      startedDate: this.attr(a, 'startedOn') || null,
      completedDate: this.attr(a, 'completedOn') || null,
      courseData: null,
    };

    if (st.course === 'Self Assessment' && status !== 'pending') {
      result.courseData = this.buildSelfAssessmentData(a, st.bodyDiagram);
    }

    return result;
  }

  private buildSelfAssessmentData(
    a: Record<string, string>,
    bodyDiagramRaw: Record<string, number> | null | undefined,
  ): Record<string, any> {
    const demographic = this.parseDemographic(a);
    const discomforts = this.parseDiscomforts(a);
    const actions = this.parseActions(a);
    const equipment = this.parseEquipment(a);
    const issues = this.parseIssues(a);
    const result = this.attr(a, 'result') || null;

    let bodyPartsDiscomfort: { bodyPart: string; severity: number }[] = [];
    if (bodyDiagramRaw) {
      bodyPartsDiscomfort = Object.entries(bodyDiagramRaw)
        .filter(([, sev]) => sev > 0)
        .map(([bodyPart, severity]) => ({ bodyPart, severity }));
    }

    return {
      demographic: demographic && Object.keys(demographic).length > 0 ? demographic : null,
      discomforts,
      actions,
      equipment,
      issues,
      result,
      bodyPartsDiscomfort,
    };
  }

  private parseDemographic(a: Record<string, string>): Record<string, any> | null {
    const demo: Record<string, any> = {};

    const age = this.attr(a, 'age');
    if (age) demo.age = age;

    const heightRaw = this.attr(a, 'height');
    if (heightRaw) {
      demo.heightRaw = heightRaw;
      demo.heightInches = this.parseHeight(heightRaw);
    }

    const hand = this.attr(a, 'dominantHand');
    if (hand) demo.handedness = /left/i.test(hand) ? 'left' : 'right';

    const bifocals = this.attr(a, 'bifocals');
    if (bifocals != null) demo.wearsBifocals = this.toBool(bifocals);

    const visualIssue = this.attr(a, 'visualIssue');
    if (visualIssue != null) demo.visualIssue = visualIssue;

    const computerTime = this.attr(a, 'computerTime');
    if (computerTime != null) demo.computerTime = computerTime;

    const dualMon = this.attr(a, 'dualMonitor');
    if (dualMon != null) demo.dualMonitors = this.toBool(dualMon);

    const laptop = this.attr(a, 'laptop');
    if (laptop != null) demo.usesLaptop = this.toBool(laptop);

    const sitToStand = this.attr(a, 'sitToStand');
    if (sitToStand != null) demo.sitToStand = sitToStand;

    const compositeRaw = this.attr(a, 'demographic');
    if (compositeRaw) {
      const parsed = this.parseDemographicString(compositeRaw);
      for (const [k, v] of Object.entries(parsed)) {
        if (demo[k] === undefined) demo[k] = v;
      }
    }

    if (demo.dualMonitors === undefined) demo.dualMonitors = false;
    if (demo.usesLaptop === undefined) demo.usesLaptop = false;
    if (demo.wearsBifocals === undefined) demo.wearsBifocals = false;

    return Object.keys(demo).length > 3 ? demo : null;
  }

  private parseDemographicString(raw: string): Record<string, any> {
    if (!raw || raw === '-') return {};
    const demo: Record<string, any> = {};
    const parts = raw.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);

    for (const part of parts) {
      const ageMatch = part.match(/^Age:\s*(.+)/i);
      if (ageMatch) { demo.age = ageMatch[1].trim(); continue; }

      const heightMatch = part.match(/^Height:\s*(.+)/i);
      if (heightMatch) {
        demo.heightRaw = heightMatch[1].trim();
        demo.heightInches = this.parseHeight(heightMatch[1].trim());
        continue;
      }

      if (/left.?handed/i.test(part)) { demo.handedness = 'left'; continue; }
      if (/right.?handed/i.test(part)) { demo.handedness = 'right'; continue; }
      if (/has dual monitors/i.test(part)) { demo.dualMonitors = true; continue; }
      if (/uses laptop/i.test(part)) { demo.usesLaptop = true; continue; }
      if (/wears bifocals/i.test(part)) { demo.wearsBifocals = true; continue; }
      if (/chair height is adjustable/i.test(part)) { demo.chairAdjustable = true; continue; }
      if (/chair height is not adjustable/i.test(part)) { demo.chairAdjustable = false; continue; }

      const sitStandMatch = part.match(/sit to stand desk:\s*(.+)/i);
      if (sitStandMatch) { demo.sitToStand = sitStandMatch[1].trim(); continue; }

      const compTimeMatch = part.match(/computer time:\s*(.+)/i);
      if (compTimeMatch) { demo.computerTime = compTimeMatch[1].trim(); continue; }
    }

    return demo;
  }

  private parseDiscomforts(a: Record<string, string>): { area: string; severity: number | null }[] {
    const areas: { area: string; severity: number | null }[] = [];
    const seen = new Set<string>();

    const areasRaw = this.attr(a, 'discomfortAreas');
    if (areasRaw) {
      for (const entry of this.splitList(areasRaw)) {
        const m = entry.match(/^(.+?):\s*(\d+)$/);
        const area = m ? m[1].trim() : entry;
        const severity = m ? parseInt(m[2], 10) : null;
        if (!seen.has(area.toLowerCase())) {
          seen.add(area.toLowerCase());
          areas.push({ area, severity });
        }
      }
    }

    const discomfortRaw = this.attr(a, 'discomfort');
    if (discomfortRaw && !seen.has(discomfortRaw.toLowerCase())) {
      areas.push({ area: discomfortRaw, severity: null });
    }

    return areas;
  }

  private parseEquipment(a: Record<string, string>): string[] {
    return this.splitList(this.attr(a, 'equipmentNeeded') || '');
  }

  private parseActions(a: Record<string, string>): string[] {
    return this.splitList(this.attr(a, 'actionNeeded') || '');
  }

  private parseIssues(a: Record<string, string>): Record<string, any> {
    const adjustmentResult = this.attr(a, 'adjustmentResult');
    const result = this.attr(a, 'result');

    const parsed: Record<string, any> = {
      recommendations: [],
      actionItems: [],
      suggestions: [],
      result: result || null,
      raw: adjustmentResult || null,
      other: [],
    };

    const raw = adjustmentResult || '';
    if (!raw || raw === '-' || /^no issues$/i.test(raw.trim())) return parsed;

    const equipMatch = raw.match(
      /Recommend Equipment:\s*([^A-Z]*?)(?=Action Items:|Suggestions:|$)/i,
    );
    if (equipMatch) parsed.recommendations = this.splitList(equipMatch[1]);

    const actionMatch = raw.match(
      /Action Items:\s*(.+?)(?=Recommend Equipment:|Suggestions:|$)/i,
    );
    if (actionMatch) parsed.actionItems = this.splitList(actionMatch[1]);

    const suggestMatch = raw.match(/Suggestions:\s*(.+)/i);
    if (suggestMatch) parsed.suggestions = [suggestMatch[1].trim()];

    if (
      parsed.recommendations.length === 0 &&
      parsed.actionItems.length === 0 &&
      parsed.suggestions.length === 0
    ) {
      parsed.other = this.splitList(raw);
    }

    return parsed;
  }


  private normaliseAttrKey(raw: string): string {
    const lower = raw.toLowerCase().replace(/[_\-]+/g, ' ').trim();
    return ATTR_ALIASES[lower] || lower;
  }

  private attr(attributes: Record<string, string>, ...keys: string[]): string | null {
    for (const k of keys) {
      if (attributes[k] != null && attributes[k] !== '' && attributes[k] !== '-') {
        return attributes[k];
      }
    }
    return null;
  }

  private mapStatus(raw: string): string {
    const statusMap: Record<string, string> = {
      pass: 'pass',
      action: 'action',
      assessment: 'assessment',
      completed: 'completed',
      finished: 'finished',
      started: 'started',
      pending: 'pending',
    };
    return statusMap[raw.toLowerCase()] || raw.toLowerCase();
  }

  private toBool(val: any): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      return ['true', 'yes', '1', 'on'].includes(val.trim().toLowerCase());
    }
    return !!val;
  }

  private parseHeight(raw: string): number | null {
    if (!raw) return null;
    const m = raw.match(/(\d+)'\s*-?\s*(\d+(?:\.\d+)?)/);
    if (!m) return null;
    return parseInt(m[1], 10) * 12 + parseFloat(m[2]);
  }

  private splitList(raw: string): string[] {
    if (!raw || raw === '-') return [];
    return raw.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean);
  }
}
