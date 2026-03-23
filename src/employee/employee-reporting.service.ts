import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { PaginatedRo } from './dto/paginated.ro';
import { CourseReportRowRo } from './dto/course-report-row.ro';
import { ProgramStatsRo, CourseStatsRo } from './dto/program-stats.ro';
import { DiscomfortSummaryRo } from './dto/discomfort-summary.ro';
import { ChartAggregationRo } from './dto/chart-aggregation.ro';
import { COMPLETED_STATUSES, IN_PROGRESS_STATUSES } from './constants';

@Injectable()
export class EmployeeReportingService {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) { }

  private applyOrgFilter(
    filter: QueryFilter<EmployeeDocument>,
    orgFilter: string | null,
  ): void {
    if (orgFilter) {
      filter.organization = new Types.ObjectId(orgFilter);
    }
  }

  async getStats(orgFilter: string | null): Promise<ProgramStatsRo> {
    const filter: QueryFilter<EmployeeDocument> = {};
    this.applyOrgFilter(filter, orgFilter);

    const employees = await this.employeeModel.find(filter).exec();
    const totalEmployees = employees.length;

    const courseMap = new Map<
      string,
      {
        enrolled: number;
        completed: number;
        inProgress: number;
        breakdown: Record<string, number>;
      }
    >();

    for (const emp of employees) {
      const seen = new Set<string>();
      for (const t of emp.trainings) {
        if (seen.has(t.course)) continue;
        seen.add(t.course);

        if (!courseMap.has(t.course)) {
          courseMap.set(t.course, {
            enrolled: 0,
            completed: 0,
            inProgress: 0,
            breakdown: {},
          });
        }

        const stats = courseMap.get(t.course)!;
        stats.enrolled++;
        stats.breakdown[t.status] = (stats.breakdown[t.status] || 0) + 1;

        if (COMPLETED_STATUSES.includes(t.status)) {
          stats.completed++;
        } else if (IN_PROGRESS_STATUSES.includes(t.status)) {
          stats.inProgress++;
        }
      }
    }

    let totalEnrolled = 0;
    let totalCompleted = 0;

    const courses: CourseStatsRo[] = [];
    for (const [course, stats] of courseMap.entries()) {
      totalEnrolled += stats.enrolled;
      totalCompleted += stats.completed;
      courses.push(
        plainToInstance(
          CourseStatsRo,
          {
            course,
            enrolled: stats.enrolled,
            completed: stats.completed,
            inProgress: stats.inProgress,
            statusBreakdown: stats.breakdown,
          },
          { excludeExtraneousValues: true },
        ),
      );
    }

    const completionRate =
      totalEnrolled > 0
        ? Math.round((totalCompleted / totalEnrolled) * 100)
        : 0;

    return plainToInstance(
      ProgramStatsRo,
      { totalEmployees, courses, completionRate },
      { excludeExtraneousValues: true },
    );
  }

  async getCourseReport(
    course: string,
    query: QueryEmployeesDto,
    orgFilter: string | null,
  ): Promise<PaginatedRo<CourseReportRowRo>> {
    const filter: QueryFilter<EmployeeDocument> = {
      'trainings.course': course,
    };
    this.applyOrgFilter(filter, orgFilter);

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (query.status) {
      filter['trainings'] = {
        $elemMatch: { course, status: query.status },
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const sortField = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortOrder === 'asc' ? 1 : -1;

    const [employees, total] = await Promise.all([
      this.employeeModel
        .find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.employeeModel.countDocuments(filter).exec(),
    ]);

    const data = employees.map((emp) => {
      const obj = emp.toObject();
      const training = obj.trainings.find((t) => t.course === course);
      return plainToInstance(
        CourseReportRowRo,
        {
          employeeId: obj._id.toString(),
          name: obj.name,
          email: obj.email,
          oldProfileUrl: obj.oldProfileUrl,
          course,
          status: training?.status ?? 'not_taken',
          startedDate: training?.startedDate ?? null,
          completedDate: training?.completedDate ?? null,
          result: training?.courseData?.result ?? null,
          followUpStatus: training?.followUpStatus ?? null,
        },
        { excludeExtraneousValues: true },
      );
    });

    return plainToInstance(
      PaginatedRo<CourseReportRowRo>,
      {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
      { excludeExtraneousValues: true },
    ) as PaginatedRo<CourseReportRowRo>;
  }

  async aggregateBodyPartData(
    course: string,
    dataPath: string,
    orgFilter: string | null,
  ): Promise<DiscomfortSummaryRo> {
    const filter: QueryFilter<EmployeeDocument> = {
      'trainings.course': course,
    };
    this.applyOrgFilter(filter, orgFilter);

    const employees = await this.employeeModel.find(filter).exec();

    const countMap: Record<string, number> = {};
    const sumMap: Record<string, number> = {};

    for (const emp of employees) {
      const training = emp.trainings.find((t) => t.course === course);
      const parts = this.resolvePath(training?.courseData, dataPath);
      if (!Array.isArray(parts)) continue;

      for (const entry of parts) {
        const key = entry?.bodyPart;
        const severity = entry?.severity;
        if (
          typeof key === 'string' &&
          typeof severity === 'number' &&
          severity > 0
        ) {
          countMap[key] = (countMap[key] || 0) + 1;
          sumMap[key] = (sumMap[key] || 0) + severity;
        }
      }
    }

    const countData: Record<string, number> = {};
    const avgData: Record<string, number> = {};
    const details: {
      key: string;
      count: number;
      totalSeverity: number;
      avgSeverity: number;
    }[] = [];

    for (const key of Object.keys(countMap)) {
      const count = countMap[key];
      const total = sumMap[key];
      countData[key] = count;
      avgData[key] = Math.round(total / count);
      details.push({
        key,
        count,
        totalSeverity: total,
        avgSeverity: Math.round(total / count),
      });
    }

    details.sort((a, b) => b.count - a.count);

    return plainToInstance(
      DiscomfortSummaryRo,
      { countData, avgData, details },
      { excludeExtraneousValues: true },
    );
  }

  async aggregateChartData(
    course: string,
    orgFilter: string | null,
  ): Promise<ChartAggregationRo> {
    const filter: QueryFilter<EmployeeDocument> = {
      'trainings.course': course,
    };
    this.applyOrgFilter(filter, orgFilter);

    const employees = await this.employeeModel.find(filter).exec();

    const resultCounts: Record<string, number> = {};
    const issueCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};
    const equipmentCounts: Record<string, number> = {};

    for (const emp of employees) {
      const training = emp.trainings.find((t) => t.course === course);
      if (!training) continue;

      const cd = training.courseData as Record<string, any> | null;

      const resultLabel = this.mapStatusToResultLabel(training.status);
      if (resultLabel) {
        resultCounts[resultLabel] = (resultCounts[resultLabel] || 0) + 1;
      }

      if (!cd || IN_PROGRESS_STATUSES.includes(training.status)) continue;

      const issueLabel = this.buildIssueLabel(cd);
      if (issueLabel) {
        issueCounts[issueLabel] = (issueCounts[issueLabel] || 0) + 1;
      }

      const actions = cd.actions;
      if (Array.isArray(actions)) {
        for (const action of actions) {
          if (typeof action === 'string' && action.trim()) {
            actionCounts[action.trim()] =
              (actionCounts[action.trim()] || 0) + 1;
          }
        }
      }

      const equipment = cd.equipment;
      if (Array.isArray(equipment)) {
        for (const item of equipment) {
          if (typeof item === 'string' && item.trim()) {
            equipmentCounts[item.trim()] =
              (equipmentCounts[item.trim()] || 0) + 1;
          }
        }
      }
    }

    return plainToInstance(
      ChartAggregationRo,
      {
        result: resultCounts,
        issues: issueCounts,
        actions: actionCounts,
        equipment: equipmentCounts,
      },
      { excludeExtraneousValues: true },
    );
  }

  private mapStatusToResultLabel(status: string): string | null {
    switch (status) {
      case 'pass':
      case 'completed':
      case 'finished':
        return 'Pass';
      case 'action':
        return 'Action Needed';
      case 'assessment':
        return 'Assessment';
      case 'pending':
      case 'started':
        return 'In Progress';
      default:
        return status || null;
    }
  }

  private buildIssueLabel(cd: Record<string, any>): string | null {
    const issues = cd.issues;

    if (issues?.raw && typeof issues.raw === 'string' && issues.raw.trim()) {
      const raw = issues.raw.trim();
      if (/^no\s*issues?$/i.test(raw)) return 'No issues';
      return raw;
    }

    const parts: string[] = [];

    const recs = issues?.recommendations;
    if (Array.isArray(recs) && recs.length > 0) {
      parts.push('Recommend Equipment:  ' + recs.join(', '));
    }

    const actionItems = issues?.actionItems;
    if (Array.isArray(actionItems) && actionItems.length > 0) {
      parts.push('Action Items:  ' + actionItems.join(', '));
    }

    const suggestions = issues?.suggestions;
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      parts.push('Suggestions:  ' + suggestions.join(', '));
    }

    if (parts.length > 0) {
      return parts.join('  ');
    }

    return 'No issues';
  }

  private resolvePath(obj: any, path: string): any {
    if (!obj) return null;
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }
}
