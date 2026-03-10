import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { AddTrainingDto } from './dto/add-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { EmployeeDetailRo } from './dto/employee-detail.ro';
import { EmployeeListItemRo } from './dto/employee-list-item.ro';
import { TrainingRo } from './dto/training.ro';
import { PaginatedRo } from './dto/paginated.ro';
import { PaginatedEmployeesRo } from './dto/paginated-employees.ro';
import { PaginatedCourseReportRo } from './dto/paginated-course-report.ro';
import { ProgramStatsRo } from './dto/program-stats.ro';
import { CourseReportRowRo } from './dto/course-report-row.ro';
import { DiscomfortSummaryRo } from './dto/discomfort-summary.ro';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IdDto } from '../common/dto/id.dto';

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(JwtAuthGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, type: EmployeeDetailRo })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(@Body() dto: CreateEmployeeDto): Promise<EmployeeDetailRo> {
    return this.employeeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List employees with pagination and filtering' })
  @ApiResponse({ status: 200, type: PaginatedEmployeesRo })
  async findAll(
    @Query() query: QueryEmployeesDto,
  ): Promise<PaginatedRo<EmployeeListItemRo>> {
    return this.employeeService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get program-wide statistics' })
  @ApiResponse({ status: 200, type: ProgramStatsRo })
  async getStats(): Promise<ProgramStatsRo> {
    return this.employeeService.getStats();
  }

  @Get('reports/:course')
  @ApiOperation({ summary: 'Get report data for a specific course' })
  @ApiParam({ name: 'course', example: 'Self Assessment' })
  @ApiResponse({ status: 200, type: PaginatedCourseReportRo })
  async getCourseReport(
    @Param('course') course: string,
    @Query() query: QueryEmployeesDto,
  ): Promise<PaginatedRo<CourseReportRowRo>> {
    return this.employeeService.getCourseReport(course, query);
  }

  @Get('reports/:course/body-aggregation')
  @ApiOperation({ summary: 'Get aggregated body part data for a course' })
  @ApiParam({ name: 'course', example: 'Self Assessment' })
  @ApiQuery({
    name: 'dataPath',
    required: false,
    example: 'bodyPartsDiscomfort',
    description: 'Dot-notated path within courseData',
  })
  @ApiResponse({ status: 200, type: DiscomfortSummaryRo })
  async getBodyAggregation(
    @Param('course') course: string,
    @Query('dataPath') dataPath: string = 'bodyPartsDiscomfort',
  ): Promise<DiscomfortSummaryRo> {
    return this.employeeService.aggregateBodyPartData(course, dataPath);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee detail by ID' })
  @ApiResponse({ status: 200, type: EmployeeDetailRo })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findOne(@Param() { id }: IdDto): Promise<EmployeeDetailRo> {
    return this.employeeService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, type: EmployeeDetailRo })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async update(
    @Param() { id }: IdDto,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeDetailRo> {
    return this.employeeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee' })
  @ApiResponse({ status: 200, description: 'Employee deleted' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async remove(@Param() { id }: IdDto): Promise<void> {
    return this.employeeService.remove(id);
  }

  @Post(':id/trainings')
  @ApiOperation({ summary: 'Add a training to an employee' })
  @ApiResponse({ status: 201, type: TrainingRo })
  async addTraining(
    @Param() { id }: IdDto,
    @Body() dto: AddTrainingDto,
  ): Promise<TrainingRo> {
    return this.employeeService.addTraining(id, dto);
  }

  @Patch(':id/trainings/:trainingId')
  @ApiOperation({ summary: 'Update a training' })
  @ApiParam({ name: 'trainingId' })
  @ApiResponse({ status: 200, type: TrainingRo })
  async updateTraining(
    @Param() { id }: IdDto,
    @Param('trainingId') trainingId: string,
    @Body() dto: UpdateTrainingDto,
  ): Promise<TrainingRo> {
    return this.employeeService.updateTraining(id, trainingId, dto);
  }

  @Delete(':id/trainings/:trainingId')
  @ApiOperation({ summary: 'Remove a training' })
  @ApiParam({ name: 'trainingId' })
  @ApiResponse({ status: 200, description: 'Training removed' })
  async removeTraining(
    @Param() { id }: IdDto,
    @Param('trainingId') trainingId: string,
  ): Promise<void> {
    return this.employeeService.removeTraining(id, trainingId);
  }
}
