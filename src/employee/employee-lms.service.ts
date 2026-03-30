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
import { COMPLETED_STATUSES, IN_PROGRESS_STATUSES } from './constants';

const COURSE_SLUG_MAP: Record<string, string> = {
  'self-assessment': 'Self Assessment',
  'office-ergonomics': 'Office Ergonomics',
};

const DISCOMFORT_AREA_TO_BODY_PART: Record<string, string> = {
  'head': 'head',
  'neck': 'neck',
  'eyes': 'eyes',
  'upper back': 'upperBack',
  'mid back': 'midBack',
  'lower back': 'lowerBack',
  'buttocks': 'buttocks',
  'left shoulder': 'leftShoulder',
  'right shoulder': 'rightShoulder',
  'left upper arm': 'leftUpperArm',
  'right upper arm': 'rightUpperArm',
  'left elbow': 'leftElbow',
  'right elbow': 'rightElbow',
  'left lower arm': 'leftLowerArm',
  'right lower arm': 'rightLowerArm',
  'left wrist': 'leftWrist',
  'right wrist': 'rightWrist',
  'left hand': 'leftHand',
  'right hand': 'rightHand',
  'left thigh': 'leftThigh',
  'right thigh': 'rightThigh',
  'left knee': 'leftKnee',
  'right knee': 'rightKnee',
  'left lower leg': 'leftLowerLeg',
  'right lower leg': 'rightLowerLeg',
  'left foot or ankle': 'leftFootOrAnkle',
  'right foot or ankle': 'rightFootOrAnkle',
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

    const now = new Date().toLocaleDateString('en-US');

    const existingTrainings = employee.trainings.filter(
      (t) => t.course === courseName,
    );
    const existingTraining = existingTrainings.length > 0
      ? existingTrainings[existingTrainings.length - 1]
      : null;

    if (status === 'started') {
      if (!existingTraining || COMPLETED_STATUSES.includes(existingTraining.status)) {
        const training: any = {
          course: courseName,
          status,
          startedDate: now,
          completedDate: null,
          courseData: null,
          followUpStatus: null,
        };
        employee.trainings.push(training);
      } else {
        existingTraining.status = status;
        existingTraining.startedDate = now;
        existingTraining.completedDate = null;
        existingTraining.courseData = null;
      }
    } else {
      if (existingTraining && IN_PROGRESS_STATUSES.includes(existingTraining.status)) {
        existingTraining.status = status;
        existingTraining.completedDate = payload.data?.completedOn || now;
        if (courseData) {
          existingTraining.courseData = courseData;
        }
      } else if (!existingTraining) {
        const training: any = {
          course: courseName,
          status,
          startedDate: null,
          completedDate: payload.data?.completedOn || now,
          courseData,
          followUpStatus: null,
        };
        employee.trainings.push(training);
      } else {
        const training: any = {
          course: courseName,
          status,
          startedDate: existingTraining.startedDate, // carry forward if any
          completedDate: payload.data?.completedOn || now,
          courseData,
          followUpStatus: null,
        };
        employee.trainings.push(training);
      }
    }

    await employee.save();

    this.logger.log(
      `LMS data received: org=${org.abbreviation} employee=${payload.email} course=${courseName} status=${status}`,
    );

    return {
      success: true,
      message: `Training record updated for ${payload.email}`,
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
    if (raw.discomfort && typeof raw.discomfort !== 'string') {
      bodyPartsDiscomfort = this.parseBodyPartDiscomfort(raw.discomfort);
    }
    if (bodyPartsDiscomfort.length === 0 && discomforts.length > 0) {
      bodyPartsDiscomfort = this.deriveBodyPartsFromDiscomforts(discomforts);
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
      return val.map((item) => {
        if (typeof item === 'string') {
          return this.parseDiscomfortEntry(item);
        }
        return { area: item.area || item.bodyPart, severity: item.severity ?? null };
      });
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
          .map((entry: string) => this.parseDiscomfortEntry(entry));
      }
    }
    return [];
  }

  private parseDiscomfortEntry(entry: string): { area: string; severity: number | null } {
    const match = entry.match(/^(.+?)\s*:\s*(\d+)$/);
    if (match) {
      return {
        area: match[1].trim(),
        severity: parseInt(match[2], 10),
      };
    }
    return { area: entry.trim(), severity: null };
  }

  private deriveBodyPartsFromDiscomforts(
    discomforts: { area: string; severity: number | null }[],
  ): { bodyPart: string; severity: number }[] {
    const result: { bodyPart: string; severity: number }[] = [];

    for (const d of discomforts) {
      if (d.severity == null || d.severity <= 0) continue;

      const key = d.area.toLowerCase().trim();
      const bodyPart = DISCOMFORT_AREA_TO_BODY_PART[key];

      if (bodyPart) {
        result.push({ bodyPart, severity: d.severity });
      } else {
        const found = Object.entries(DISCOMFORT_AREA_TO_BODY_PART).find(
          ([displayName]) => key.includes(displayName) || displayName.includes(key),
        );
        if (found) {
          result.push({ bodyPart: found[1], severity: d.severity });
        }
      }
    }

    return result;
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
