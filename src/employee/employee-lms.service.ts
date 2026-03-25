import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { LmsPayloadDto } from './dto/lms-payload.dto';
import { OrganizationService } from '../organization/organization.service';

const COURSE_SLUG_MAP: Record<string, string> = {
  'self-assessment': 'Self Assessment',
  'office-ergonomics': 'Office Ergonomics',
};

@Injectable()
export class EmployeeLmsService {
  private readonly logger = new Logger(EmployeeLmsService.name);

  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    private readonly organizationService: OrganizationService,
  ) { }

  async receiveLmsData(payload: LmsPayloadDto): Promise<{ success: boolean; message: string }> {
    const org = await this.organizationService.findByApiKey(payload.apiKey);
    if (!org) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    const courseName = COURSE_SLUG_MAP[payload.course] || payload.course;

    if (org.courses.length > 0 && !org.courses.includes(courseName)) {
      throw new BadRequestException(
        `Course "${courseName}" is not enabled for this organization`,
      );
    }

    if (org.enableDepartments && payload.department) {
      await this.organizationService.ensureDepartment(
        (org._id as any).toString(),
        payload.department,
      );
    }

    let employee = await this.employeeModel
      .findOne({ email: payload.email, organization: org._id })
      .exec();

    if (!employee) {
      employee = new this.employeeModel({
        lmsLearnerId: payload.id || null,
        name: payload.name,
        email: payload.email,
        organization: org._id,
        department: payload.department,
        trainings: [],
      });
    } else {
      if (payload.id) {
        employee.lmsLearnerId = payload.id;
      }
      if (payload.name && payload.name !== employee.name) {
        employee.name = payload.name;
      }
      if (payload.department) {
        employee.department = payload.department;
      }
    }

    const status = this.mapLmsStatus(payload.status);
    const courseData = payload.data
      ? this.transformCourseData(courseName, payload.data)
      : null;

    const existingTraining = employee.trainings.find(
      (t) => t.course === courseName,
    );

    const now = new Date().toLocaleDateString('en-US');

    if (existingTraining) {
      existingTraining.status = status;
      if (status === 'started' && !existingTraining.startedDate) {
        existingTraining.startedDate = now;
      }
      if (this.isCompletedLmsStatus(status)) {
        existingTraining.completedDate = payload.data?.completedOn || now;
      }
      if (courseData) {
        existingTraining.courseData = courseData;
      }
    } else {
      const training: any = {
        course: courseName,
        status,
        startedDate: status === 'started' ? now : null,
        completedDate: this.isCompletedLmsStatus(status)
          ? payload.data?.completedOn || now
          : null,
        courseData,
      };
      employee.trainings.push(training);
    }

    await employee.save();

    this.logger.log(
      `LMS data received: org=${org.abbreviation} employee=${payload.email} course=${courseName} status=${status}`,
    );

    return {
      success: true,
      message: `Training record ${existingTraining ? 'updated' : 'created'} for ${payload.email}`,
    };
  }

  private mapLmsStatus(rawStatus: string): string {
    const statusMap: Record<string, string> = {
      started: 'started',
      finished: 'finished',
      completed: 'completed',
      pass: 'pass',
      action: 'action',
      assessment: 'assessment',
    };
    return statusMap[rawStatus.toLowerCase()] || rawStatus;
  }

  private isCompletedLmsStatus(status: string): boolean {
    return ['completed', 'finished', 'pass', 'action', 'assessment'].includes(status);
  }

  private transformCourseData(
    courseName: string,
    raw: Record<string, any>,
  ): Record<string, any> | null {
    if (courseName === 'Self Assessment') {
      return this.transformSelfAssessment(raw);
    }
    if (courseName === 'Office Ergonomics') {
      return this.transformOfficeErgonomics(raw);
    }
    return raw;
  }

  private transformSelfAssessment(raw: Record<string, any>): Record<string, any> {
    const demographic: Record<string, any> = {};

    if (raw.age !== undefined) demographic.age = String(raw.age);
    if (raw.height !== undefined) demographic.heightRaw = String(raw.height);
    if (raw.dominantHand !== undefined) demographic.handedness = String(raw.dominantHand);
    if (raw.bifocals !== undefined) demographic.wearsBifocals = this.toBool(raw.bifocals);
    if (raw.visualIssue !== undefined) demographic.visualIssue = String(raw.visualIssue);
    if (raw.computerTime !== undefined) demographic.computerTime = String(raw.computerTime);
    if (raw.dualMonitor !== undefined) demographic.dualMonitors = this.toBool(raw.dualMonitor);
    if (raw.laptop !== undefined) demographic.usesLaptop = this.toBool(raw.laptop);
    if (raw.sitToStand !== undefined) demographic.sitToStand = String(raw.sitToStand);
    if (raw.postureAchieved !== undefined) demographic.chairAdjustable = this.toBool(raw.postureAchieved);

    if (raw.demographic) {
      try {
        const parsed =
          typeof raw.demographic === 'string'
            ? JSON.parse(raw.demographic)
            : raw.demographic;
        Object.assign(demographic, parsed);
      } catch { }
    }

    let discomforts: any[] = [];
    if (raw.discomfortAreas) {
      discomforts = this.parseDiscomfortAreas(raw.discomfortAreas);
    }

    let bodyPartsDiscomfort: any[] = [];
    if (raw.discomfort) {
      bodyPartsDiscomfort = this.parseBodyPartDiscomfort(raw.discomfort);
    }

    const actions = this.parseStringList(raw.actionNeeded);
    const equipment = this.parseStringList(raw.equipmentNeeded);

    const issues: Record<string, any> = {
      recommendations: [],
      actionItems: actions,
      suggestions: [],
      result: raw.TMISresult || raw.result || null,
      raw: raw.result || null,
      other: [],
    };

    if (raw.adjustmentResult) {
      issues.suggestions = this.parseStringList(raw.adjustmentResult);
    }

    return {
      demographic: Object.keys(demographic).length > 0 ? demographic : null,
      discomforts,
      actions,
      equipment,
      issues,
      result: raw.TMISresult || raw.result || null,
      bodyPartsDiscomfort,
    };
  }

  private transformOfficeErgonomics(raw: Record<string, any>): Record<string, any> {
    return raw;
  }

  private toBool(val: any): boolean {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
      return (
        val.toLowerCase() === 'true' ||
        val === '1' ||
        val.toLowerCase() === 'yes'
      );
    }
    return !!val;
  }

  private parseStringList(val: any): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    const str = String(val);
    if (!str || str.toLowerCase() === 'none') return [];
    return str
      .split(/[,;|]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  private parseDiscomfortAreas(val: any): any[] {
    if (Array.isArray(val)) {
      return val.map((item) =>
        typeof item === 'string'
          ? { area: item, severity: null }
          : { area: item.area || item.bodyPart, severity: item.severity ?? null },
      );
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return this.parseDiscomfortAreas(parsed);
      } catch {
        return val
          .split(/[,;|]/)
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((area: string) => ({ area, severity: null }));
      }
    }
    return [];
  }

  private parseBodyPartDiscomfort(val: any): any[] {
    if (Array.isArray(val)) {
      return val
        .filter((item) => item.bodyPart && item.severity > 0)
        .map((item) => ({
          bodyPart: item.bodyPart,
          severity: Number(item.severity),
        }));
    }
    if (typeof val === 'string') {
      try {
        const parsed = JSON.parse(val);
        return this.parseBodyPartDiscomfort(parsed);
      } catch {
        return [];
      }
    }
    return [];
  }
}
