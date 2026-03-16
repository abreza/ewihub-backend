import * as cheerio from 'cheerio';
import { ATTR_ALIASES, BODY_PART_ALIASES } from './constants';
import {
  OrgEditPageData,
  ScrapedEmployee,
  ScrapedTraining,
  TransformedTraining,
} from './types';

export class EwihubScraperParser {
  extractCsrfToken(html: string): string | undefined {
    const $ = cheerio.load(html);
    return $('input[name="_token"]').val() as string | undefined;
  }

  parseOrgEditPage(html: string): OrgEditPageData {
    const $ = cheerio.load(html);

    const csrfToken =
      ($('#form-organization input[name="_token"]').val() as string) || '';
    const name =
      ($('#form-organization input[name="name"]').val() as string) || '';
    const abbreviation =
      ($('#form-organization input[name="abbreviation"]').val() as string) ||
      '';
    const notes =
      ($('#form-organization textarea[name="notes"]').val() as string) || '';
    const active = $('#form-organization input[name="active"]').is(':checked');
    const departmentsEnabled = $(
      '#form-organization input[name="departments_enabled"]',
    ).is(':checked');

    const courses: Record<string, string> = {};
    $(
      '#form-organization input[type="checkbox"][name^="courses"]',
    ).each((_, el) => {
      const $el = $(el);
      if ($el.is(':checked')) {
        courses[$el.attr('name')!] = $el.val() as string;
      }
    });

    const users: OrgEditPageData['users'] = [];
    $('#tbl-users tbody tr').each((_, row) => {
      const $row = $(row);
      const status = $row.attr('data-status') || 'db';
      const id = $row.attr('data-id') || '';
      const userName =
        $row.find('td[data-name="name"]').text().trim() ||
        ($row.find('td').eq(0).text().trim());
      const email =
        $row.find('td[data-name="email"]').text().trim() ||
        ($row.find('td').eq(1).text().trim());
      const password =
        $row.find('td[data-name="password"]').text().trim() || '****';

      if (email) {
        users.push({ status, id, name: userName, email, password });
      }
    });

    return {
      csrfToken,
      name,
      abbreviation,
      notes,
      active,
      departmentsEnabled,
      courses,
      users,
    };
  }

  parseEmployeeLinks(html: string): string[] {
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

  parseEmployeeProfile(
    html: string,
    profileUrl: string,
  ): ScrapedEmployee {
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

  transformScrapedTraining(st: ScrapedTraining): TransformedTraining {
    const a = st.attributes;
    const status = this.mapStatus(st.status);

    const result: TransformedTraining = {
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

  private parseBodyDiagram(
    $: cheerio.CheerioAPI,
  ): Record<string, number> | null {
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
        const tag = (
          (el as any).tagName ||
          (el as any).name ||
          ''
        ).toLowerCase();
        if (tag !== 'path') return;

        const classes = $(el).attr('class') || '';
        const match = classes.match(
          /([\w-]+)\s+body-part\s+spectrum-(\d+)/,
        );
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
      demographic:
        demographic && Object.keys(demographic).length > 0
          ? demographic
          : null,
      discomforts,
      actions,
      equipment,
      issues,
      result,
      bodyPartsDiscomfort,
    };
  }

  private parseDemographic(
    a: Record<string, string>,
  ): Record<string, any> | null {
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
    const parts = raw
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const part of parts) {
      const ageMatch = part.match(/^Age:\s*(.+)/i);
      if (ageMatch) {
        demo.age = ageMatch[1].trim();
        continue;
      }

      const heightMatch = part.match(/^Height:\s*(.+)/i);
      if (heightMatch) {
        demo.heightRaw = heightMatch[1].trim();
        demo.heightInches = this.parseHeight(heightMatch[1].trim());
        continue;
      }

      if (/left.?handed/i.test(part)) {
        demo.handedness = 'left';
        continue;
      }
      if (/right.?handed/i.test(part)) {
        demo.handedness = 'right';
        continue;
      }
      if (/has dual monitors/i.test(part)) {
        demo.dualMonitors = true;
        continue;
      }
      if (/uses laptop/i.test(part)) {
        demo.usesLaptop = true;
        continue;
      }
      if (/wears bifocals/i.test(part)) {
        demo.wearsBifocals = true;
        continue;
      }
      if (/chair height is adjustable/i.test(part)) {
        demo.chairAdjustable = true;
        continue;
      }
      if (/chair height is not adjustable/i.test(part)) {
        demo.chairAdjustable = false;
        continue;
      }

      const sitStandMatch = part.match(/sit to stand desk:\s*(.+)/i);
      if (sitStandMatch) {
        demo.sitToStand = sitStandMatch[1].trim();
        continue;
      }

      const compTimeMatch = part.match(/computer time:\s*(.+)/i);
      if (compTimeMatch) {
        demo.computerTime = compTimeMatch[1].trim();
        continue;
      }
    }

    return demo;
  }

  private parseDiscomforts(
    a: Record<string, string>,
  ): { area: string; severity: number | null }[] {
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
    const lower = raw
      .toLowerCase()
      .replace(/[_\-]+/g, ' ')
      .trim();
    return ATTR_ALIASES[lower] || lower;
  }

  private attr(
    attributes: Record<string, string>,
    ...keys: string[]
  ): string | null {
    for (const k of keys) {
      if (
        attributes[k] != null &&
        attributes[k] !== '' &&
        attributes[k] !== '-'
      ) {
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
    return raw
      .split(/\s*,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
}