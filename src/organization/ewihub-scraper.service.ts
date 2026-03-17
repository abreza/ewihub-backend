import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import { Employee, EmployeeDocument } from '../employee/schemas/employee.schema';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import {
  CONCURRENCY,
  humanSleep,
} from './ewihub-scraper/constants';
import { HttpSession } from './ewihub-scraper/http-session';
import { EwihubScraperParser } from './ewihub-scraper/parser';
import {
  OrgEditPageData,
  ScrapedEmployee,
  SyncResult,
} from './ewihub-scraper/types';

export type { SyncResult } from './ewihub-scraper/types';

@Injectable()
export class EwihubScraperService {
  private readonly logger = new Logger(EwihubScraperService.name);
  private readonly parser = new EwihubScraperParser();

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
  ) { }

  async scrapeAndSync(orgId: string): Promise<SyncResult> {
    const adminEmail = this.configService.get<string>('EWIHUB_ADMIN_EMAIL');
    const adminPassword = this.configService.get<string>('EWIHUB_ADMIN_PASSWORD');
    if (!adminEmail || !adminPassword) {
      throw new BadRequestException(
        'EWIHUB_ADMIN_EMAIL and EWIHUB_ADMIN_PASSWORD must be set in environment',
      );
    }

    const org = await this.orgModel.findById(orgId).exec();
    if (!org) {
      throw new BadRequestException(`Organization ${orgId} not found`);
    }
    const orgAbbreviation = org.abbreviation.toLowerCase();

    const adminSession = new HttpSession();

    this.logger.log('Warming up session (visiting homepage)...');
    await adminSession.fetch('https://ewihub.com');

    this.logger.log(`Logging in to ewihub.com as admin (${adminEmail})...`);
    await this.login(adminSession, adminEmail, adminPassword);
    this.logger.log('Admin login successful');

    const editUrl = `https://ewihub.com/organizations/${orgAbbreviation}/edit`;
    this.logger.log(`Fetching org edit page: ${editUrl}`);
    const editRes = await adminSession.fetch(editUrl);
    const editHtml = await editRes.text();
    const pageData = this.parser.parseOrgEditPage(editHtml);

    const tempEmail = `_sync_${crypto.randomBytes(4).toString('hex')}@ewihub-temp.io`;
    const tempPassword = crypto.randomBytes(16).toString('base64url');
    const tempName = '_SyncBot';

    this.logger.log(`Creating temp user: ${tempEmail}`);
    await this.submitOrgForm(adminSession, orgAbbreviation, pageData, {
      action: 'add',
      name: tempName,
      email: tempEmail,
      password: tempPassword,
    });

    await humanSleep();

    const editRes2 = await adminSession.fetch(editUrl);
    const editHtml2 = await editRes2.text();
    const pageData2 = this.parser.parseOrgEditPage(editHtml2);
    const tempUserRow = pageData2.users.find((u) => u.email === tempEmail);

    try {
      const scraperSession = new HttpSession();

      await scraperSession.fetch('https://ewihub.com');

      this.logger.log(`Logging in as temp user: ${tempEmail}`);
      await this.login(scraperSession, tempEmail, tempPassword);
      this.logger.log('Temp user login successful');

      this.logger.log('Fetching employee directory...');
      const links = await this.fetchEmployeeLinks(scraperSession);
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

      this.logger.log(
        `Scraping ${links.length} profiles (concurrency=${CONCURRENCY})...`,
      );
      const scraped = await this.scrapeProfiles(scraperSession, links);
      this.logger.log(`Scraped ${scraped.length} employee profiles`);

      const result = await this.upsertEmployees(orgId, scraped);
      this.logger.log(
        `Sync complete: created=${result.created} updated=${result.updated} errors=${result.errors.length}`,
      );

      return result;
    } finally {
      this.logger.log(`Cleaning up temp user: ${tempEmail}`);
      try {
        const editRes3 = await adminSession.fetch(editUrl);
        const editHtml3 = await editRes3.text();
        const pageData3 = this.parser.parseOrgEditPage(editHtml3);
        const userToDelete = pageData3.users.find(
          (u) => u.email === tempEmail,
        );

        if (userToDelete) {
          await this.submitOrgForm(
            adminSession,
            orgAbbreviation,
            pageData3,
            {
              action: 'delete',
              id: userToDelete.id,
              name: userToDelete.name,
              email: userToDelete.email,
              password: '****',
            },
          );
          this.logger.log('Temp user deleted');
        } else {
          this.logger.warn(
            'Temp user not found in edit page — may have already been removed',
          );
        }
      } catch (cleanupErr) {
        this.logger.error(
          `Failed to delete temp user ${tempEmail}: ${(cleanupErr as Error).message}`,
        );
      }
    }
  }

  async scrapeAndSyncWithCredentials(
    orgId: string,
    email: string,
    password: string,
  ): Promise<SyncResult> {
    const session = new HttpSession();

    this.logger.log('Warming up session...');
    await session.fetch('https://ewihub.com');

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

    this.logger.log(
      `Scraping ${links.length} profiles (concurrency=${CONCURRENCY})...`,
    );
    const scraped = await this.scrapeProfiles(session, links);
    this.logger.log(`Scraped ${scraped.length} employee profiles`);

    const result = await this.upsertEmployees(orgId, scraped);
    this.logger.log(
      `Sync complete: created=${result.created} updated=${result.updated} errors=${result.errors.length}`,
    );

    return result;
  }

  private async submitOrgForm(
    session: HttpSession,
    orgAbbreviation: string,
    pageData: OrgEditPageData,
    userOp:
      | { action: 'add'; name: string; email: string; password: string }
      | {
        action: 'delete';
        id: string;
        name: string;
        email: string;
        password: string;
      },
  ): Promise<void> {
    const boundary = `----WebKitFormBoundary${crypto.randomBytes(8).toString('hex')}`;

    const parts: string[] = [];

    const addField = (name: string, value: string) => {
      parts.push(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`,
      );
    };

    addField('_token', pageData.csrfToken);
    addField('_method', 'PUT');

    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="logo"; filename=""\r\nContent-Type: application/octet-stream\r\n\r\n`,
    );

    addField('name', pageData.name);
    addField('abbreviation', pageData.abbreviation);
    addField('notes', pageData.notes);

    if (pageData.active) {
      addField('active', 'active');
    }

    if (pageData.departmentsEnabled) {
      addField('departments_enabled', 'departments_enabled');
    }

    for (const [courseName, courseValue] of Object.entries(pageData.courses)) {
      addField(courseName, courseValue);
    }

    addField('submit', '');

    for (const user of pageData.users) {
      if (userOp.action === 'delete' && user.id === userOp.id) {
        addField(
          'users[]',
          `deleted|||${user.id}|||${user.name}|||${user.email}|||${user.password}|||`,
        );
      } else {
        addField(
          'users[]',
          `${user.status}|||${user.id}|||${user.name}|||${user.email}|||${user.password}|||`,
        );
      }
    }

    if (userOp.action === 'add') {
      addField(
        'users[]',
        `created||||||${userOp.name}|||${userOp.email}|||${userOp.password}|||`,
      );
    }

    const body = parts.join('\r\n') + `\r\n--${boundary}--\r\n`;

    const res = await session.fetch(
      `https://ewihub.com/organizations/${orgAbbreviation}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body,
      },
    );

    const resText = await res.text();

    if (
      resText.includes('These credentials do not match') ||
      res.status >= 400
    ) {
      throw new BadRequestException(
        `Org form submission failed (status ${res.status})`,
      );
    }
  }

  private async login(
    session: HttpSession,
    email: string,
    password: string,
  ): Promise<void> {
    const loginPageRes = await session.fetch('https://ewihub.com/login');
    const loginPageHtml = await loginPageRes.text();
    const token = this.parser.extractCsrfToken(loginPageHtml);

    if (!token) {
      throw new BadRequestException(
        'Could not retrieve CSRF token from ewihub.com login page',
      );
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
      throw new UnauthorizedException(
        'EWI Hub login failed — invalid credentials',
      );
    }
  }

  private async fetchEmployeeLinks(session: HttpSession): Promise<string[]> {
    const res = await session.fetch('https://ewihub.com/employees?length=-1');
    let html = await res.text();
    let links = this.parser.parseEmployeeLinks(html);

    if (links.length === 0) {
      const res2 = await session.fetch('https://ewihub.com/employees');
      html = await res2.text();
      links = this.parser.parseEmployeeLinks(html);
    }

    for (let i = links.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [links[i], links[j]] = [links[j], links[i]];
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
          results[i] = this.parser.parseEmployeeProfile(html, links[i]);

          await humanSleep();
        } catch (err) {
          this.logger.warn(
            `Failed to scrape ${links[i]}: ${(err as Error).message}`,
          );
          results[i] = null as any;

          await humanSleep();
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, links.length) }, () =>
        worker(),
      ),
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
          .findOne({
            email: scraped.email,
            organization: new Types.ObjectId(orgId),
          })
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

  private mergeTrainings(
    employee: EmployeeDocument,
    scraped: ScrapedEmployee,
  ): void {
    for (const st of scraped.trainings) {
      const parsed = this.parser.transformScrapedTraining(st);
      const existing = employee.trainings.find(
        (t) => t.course === parsed.course,
      );

      if (existing) {
        existing.status = parsed.status;
        if (parsed.startedDate) existing.startedDate = parsed.startedDate;
        if (parsed.completedDate)
          existing.completedDate = parsed.completedDate;
        if (parsed.courseData) existing.courseData = parsed.courseData;
      } else {
        employee.trainings.push(parsed as any);
      }
    }
  }
}
