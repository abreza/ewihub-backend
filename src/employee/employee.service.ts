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

@Injectable()
export class EmployeeService {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) { }

  async create(dto: CreateEmployeeDto, orgFilter: string | null): Promise<EmployeeDetailRo> {
    const emailFilter: any = { email: dto.email };
    if (orgFilter) {
      emailFilter.organization = new Types.ObjectId(orgFilter);
    }

    const existing = await this.employeeModel.findOne(emailFilter).exec();
    if (existing) {
      throw new ConflictException('Employee with this email already exists');
    }

    const employee = new this.employeeModel({
      ...dto,
      organization: orgFilter ? new Types.ObjectId(orgFilter) : null,
    });
    const saved = await employee.save();
    return plainToInstance(EmployeeDetailRo, saved.toObject(), { excludeExtraneousValues: true });
  }

  async findAll(
    query: QueryEmployeesDto,
    orgFilter: string | null,
  ): Promise<PaginatedRo<EmployeeListItemRo>> {
    const filter: QueryFilter<EmployeeDocument> = {};

    if (orgFilter) {
      filter.organization = new Types.ObjectId(orgFilter);
    }

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

    const data = employees.map((emp) => this.toListItemRo(emp));

    return plainToInstance(
      PaginatedRo<EmployeeListItemRo>,
      {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
      { excludeExtraneousValues: true },
    ) as PaginatedRo<EmployeeListItemRo>;
  }

  async findOne(id: string, orgFilter: string | null): Promise<EmployeeDetailRo> {
    const employee = await this.findEmployeeOrFail(id, orgFilter);
    return plainToInstance(EmployeeDetailRo, employee.toObject(), { excludeExtraneousValues: true });
  }

  async update(
    id: string,
    dto: UpdateEmployeeDto,
    orgFilter: string | null,
  ): Promise<EmployeeDetailRo> {
    const employee = await this.findEmployeeOrFail(id, orgFilter);

    if (dto.email && dto.email !== employee.email) {
      const emailFilter: any = { email: dto.email, _id: { $ne: employee._id } };
      if (orgFilter) {
        emailFilter.organization = new Types.ObjectId(orgFilter);
      }
      const existing = await this.employeeModel.findOne(emailFilter).exec();
      if (existing) {
        throw new ConflictException('Employee with this email already exists');
      }
    }

    Object.assign(employee, dto);
    const saved = await employee.save();
    return plainToInstance(EmployeeDetailRo, saved.toObject(), { excludeExtraneousValues: true });
  }

  async remove(id: string, orgFilter: string | null): Promise<void> {
    const employee = await this.findEmployeeOrFail(id, orgFilter);
    await this.employeeModel.findByIdAndDelete(employee._id).exec();
  }

  async addTraining(
    employeeId: string,
    dto: AddTrainingDto,
    orgFilter: string | null,
  ): Promise<TrainingRo> {
    const employee = await this.findEmployeeOrFail(employeeId, orgFilter);

    employee.trainings.push({
      course: dto.course,
      status: dto.status,
      startedDate: dto.startedDate || null,
      completedDate: dto.completedDate || null,
      courseData: dto.courseData || null,
      followUpStatus: dto.followUpStatus || null,
    });

    const saved = await employee.save();
    const added = saved.trainings[saved.trainings.length - 1] as any;
    return plainToInstance(TrainingRo, added.toObject?.() ?? added, { excludeExtraneousValues: true });
  }

  async updateTraining(
    employeeId: string,
    trainingId: string,
    dto: UpdateTrainingDto,
    orgFilter: string | null,
  ): Promise<TrainingRo> {
    const employee = await this.findEmployeeOrFail(employeeId, orgFilter);

    const trainings = employee.trainings as Types.DocumentArray<Training>;
    const training = trainings.id(trainingId);
    if (!training) {
      throw new NotFoundException(`Training ${trainingId} not found`);
    }

    if (dto.status !== undefined) training.status = dto.status;
    if (dto.startedDate !== undefined) training.startedDate = dto.startedDate;
    if (dto.completedDate !== undefined) training.completedDate = dto.completedDate;
    if (dto.courseData !== undefined) training.courseData = dto.courseData;
    if (dto.followUpStatus !== undefined) training.followUpStatus = dto.followUpStatus;

    await employee.save();
    return plainToInstance(TrainingRo, (training as any).toObject?.() ?? training, { excludeExtraneousValues: true });
  }

  async removeTraining(
    employeeId: string,
    trainingId: string,
    orgFilter: string | null,
  ): Promise<void> {
    const employee = await this.findEmployeeOrFail(employeeId, orgFilter);

    const trainings = employee.trainings as Types.DocumentArray<Training>;
    const training = trainings.id(trainingId);
    if (!training) {
      throw new NotFoundException(`Training ${trainingId} not found`);
    }

    training.deleteOne();
    await employee.save();
  }

  async count(): Promise<number> {
    return this.employeeModel.countDocuments().exec();
  }

  async seedFromArray(data: any[]): Promise<number> {
    const docs = data.map((raw) => this.transformSeedEmployee(raw));
    const result = await this.employeeModel.insertMany(docs);
    return result.length;
  }

  async findEmployeeOrFail(
    id: string,
    orgFilter: string | null = null,
  ): Promise<EmployeeDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Employee ${id} not found`);
    }
    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) {
      throw new NotFoundException(`Employee ${id} not found`);
    }

    if (orgFilter) {
      const empOrgId = employee.organization?.toString() ?? null;
      if (empOrgId !== orgFilter) {
        throw new NotFoundException(`Employee ${id} not found`);
      }
    }

    return employee;
  }

  private toListItemRo(emp: EmployeeDocument): EmployeeListItemRo {
    const obj = emp.toObject();
    const seen = new Set<string>();
    const trainingStatuses: { course: string; status: string }[] = [];

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
}
