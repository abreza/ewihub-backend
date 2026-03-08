import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { Training } from './schemas/training.schema';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { AddTrainingDto } from './dto/add-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { EmployeeListItemRo } from './dto/employee-list-item.ro';
import { EmployeeDetailRo } from './dto/employee-detail.ro';
import { TrainingRo } from './dto/training.ro';
import { PaginatedRo } from './dto/paginated.ro';
import { CourseReportRowRo } from './dto/course-report-row.ro';
import { ProgramStatsRo, CourseStatsRo } from './dto/program-stats.ro';
import { DiscomfortSummaryRo } from './dto/discomfort-summary.ro';
import { COMPLETED_STATUSES, IN_PROGRESS_STATUSES } from './constants';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) { }

  async create(dto: CreateEmployeeDto): Promise<EmployeeDetailRo> {
    const existing = await this.employeeModel.findOne({ email: dto.email }).exec();
    if (existing) {
      throw new ConflictException('Employee with this email already exists');
    }
    const employee = new this.employeeModel(dto);
    const saved = await employee.save();
    return plainToInstance(EmployeeDetailRo, saved.toObject(), { excludeExtraneousValues: true });
  }

  async findAll(query: QueryEmployeesDto): Promise<PaginatedRo<EmployeeListItemRo>> {
    const filter: QueryFilter<EmployeeDocument> = {};

    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (query.course) {
      filter['trainings.course'] = query.course;
    }

    if (query.status) {
      filter['trainings.status'] = query.status;
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [employees, total] = await Promise.all([
      this.employeeModel.find(filter).skip(skip).limit(limit).exec(),
      this.employeeModel.countDocuments(filter).exec(),
    ]);

    const data = employees.map((emp) => this.toListItemRo(emp));

    return plainToInstance(
      PaginatedRo<EmployeeListItemRo>,
      {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      { excludeExtraneousValues: true },
    ) as PaginatedRo<EmployeeListItemRo>;
  }

  async findOne(id: string): Promise<EmployeeDetailRo> {
    const employee = await this.findEmployeeOrFail(id);
    return plainToInstance(EmployeeDetailRo, employee.toObject(), { excludeExtraneousValues: true });
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeDetailRo> {
    const employee = await this.findEmployeeOrFail(id);

    if (dto.email && dto.email !== employee.email) {
      const existing = await this.employeeModel
        .findOne({ email: dto.email, _id: { $ne: employee._id } })
        .exec();
      if (existing) {
        throw new ConflictException('Employee with this email already exists');
      }
    }

    Object.assign(employee, dto);
    const saved = await employee.save();
    return plainToInstance(EmployeeDetailRo, saved.toObject(), { excludeExtraneousValues: true });
  }

  async remove(id: string): Promise<void> {
    const employee = await this.findEmployeeOrFail(id);
    await this.employeeModel.findByIdAndDelete(employee._id).exec();
  }

  async addTraining(
    employeeId: string,
    dto: AddTrainingDto,
  ): Promise<TrainingRo> {
    const employee = await this.findEmployeeOrFail(employeeId);

    const training = {
      course: dto.course,
      status: dto.status,
      startedDate: dto.startedDate || null,
      completedDate: dto.completedDate || null,
      courseData: dto.courseData || null,
    };

    employee.trainings.push(training);
    const saved = await employee.save();
    const added = saved.trainings[saved.trainings.length - 1] as any;
    return plainToInstance(TrainingRo, added.toObject?.() ?? added, { excludeExtraneousValues: true });
  }

  async updateTraining(
    employeeId: string,
    trainingId: string,
    dto: UpdateTrainingDto,
  ): Promise<TrainingRo> {
    const employee = await this.findEmployeeOrFail(employeeId);

    const trainings = employee.trainings as Types.DocumentArray<Training>;
    const training = trainings.id(trainingId);
    if (!training) {
      throw new NotFoundException(`Training ${trainingId} not found`);
    }

    if (dto.status !== undefined) training.status = dto.status;
    if (dto.startedDate !== undefined) training.startedDate = dto.startedDate;
    if (dto.completedDate !== undefined) training.completedDate = dto.completedDate;
    if (dto.courseData !== undefined) training.courseData = dto.courseData;

    await employee.save();
    return plainToInstance(TrainingRo, (training as any).toObject?.() ?? training, { excludeExtraneousValues: true });
  }

  async removeTraining(
    employeeId: string,
    trainingId: string,
  ): Promise<void> {
    const employee = await this.findEmployeeOrFail(employeeId);

    const trainings = employee.trainings as Types.DocumentArray<Training>;
    const training = trainings.id(trainingId);
    if (!training) {
      throw new NotFoundException(`Training ${trainingId} not found`);
    }

    training.deleteOne();
    await employee.save();
  }

  async getStats(): Promise<ProgramStatsRo> {
    const employees = await this.employeeModel.find().exec();
    const totalEmployees = employees.length;

    const courseMap = new Map<
      string,
      { enrolled: number; completed: number; inProgress: number; breakdown: Record<string, number> }
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
      totalEnrolled > 0 ? Math.round((totalCompleted / totalEnrolled) * 100) : 0;

    return plainToInstance(
      ProgramStatsRo,
      { totalEmployees, courses, completionRate },
      { excludeExtraneousValues: true },
    );
  }

  async getCourseReport(
    course: string,
    query: QueryEmployeesDto,
  ): Promise<PaginatedRo<CourseReportRowRo>> {
    const filter: QueryFilter<EmployeeDocument> = {
      'trainings.course': course,
    };

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

    const [employees, total] = await Promise.all([
      this.employeeModel.find(filter).skip(skip).limit(limit).exec(),
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
  ): Promise<DiscomfortSummaryRo> {
    const employees = await this.employeeModel
      .find({ 'trainings.course': course })
      .exec();

    const countMap: Record<string, number> = {};
    const sumMap: Record<string, number> = {};

    for (const emp of employees) {
      const training = emp.trainings.find((t) => t.course === course);
      const parts = this.resolvePath(training?.courseData, dataPath);
      if (!Array.isArray(parts)) continue;

      for (const entry of parts) {
        const key = entry?.bodyPart;
        const severity = entry?.severity;
        if (typeof key === 'string' && typeof severity === 'number' && severity > 0) {
          countMap[key] = (countMap[key] || 0) + 1;
          sumMap[key] = (sumMap[key] || 0) + severity;
        }
      }
    }

    const countData: Record<string, number> = {};
    const avgData: Record<string, number> = {};
    const details: { key: string; count: number; totalSeverity: number; avgSeverity: number }[] = [];

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

  async count(): Promise<number> {
    return this.employeeModel.countDocuments().exec();
  }

  async seedFromArray(data: any[]): Promise<number> {
    const docs = data.map((raw) => this.transformSeedEmployee(raw));
    const result = await this.employeeModel.insertMany(docs);
    return result.length;
  }

  private transformSeedEmployee(raw: any): Partial<Employee> {
    const trainings = (raw.trainings || []).map((t: any) =>
      this.transformSeedTraining(t),
    );

    return {
      name: raw.name,
      email: raw.email,
      oldProfileUrl: raw.oldProfileUrl || null,
      trainings,
    };
  }

  private transformSeedTraining(raw: any): any {
    const { course, status, startedDate, completedDate, ...courseData } = raw;
    return {
      course,
      status,
      startedDate: startedDate || null,
      completedDate: completedDate || null,
      courseData: Object.keys(courseData).length > 0 ? courseData : null,
    };
  }

  private async findEmployeeOrFail(id: string): Promise<EmployeeDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    return employee;
  }

  private toListItemRo(emp: EmployeeDocument): EmployeeListItemRo {
    const obj = emp.toObject();
    const seen = new Set<string>();
    const trainingStatuses = [];

    for (const t of obj.trainings) {
      if (!seen.has(t.course)) {
        seen.add(t.course);
        trainingStatuses.push({ course: t.course, status: t.status });
      }
    }

    return plainToInstance(
      EmployeeListItemRo,
      { ...obj, trainingStatuses },
      { excludeExtraneousValues: true },
    );
  }

  private resolvePath(obj: any, path: string): any {
    if (!obj) return null;
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }
}
