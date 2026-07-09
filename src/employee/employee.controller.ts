import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Request } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { EmployeeService } from './employee.service';
import { EmployeeReportingService } from './employee-reporting.service';
import { EmployeeLmsService } from './employee-lms.service';
import { EmployeeAttachmentService } from './employee-attachment.service';
import { EmployeeNoteService } from './employee-note.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { QueryEmployeesDto } from './dto/query-employees.dto';
import { AddTrainingDto } from './dto/add-training.dto';
import { UpdateTrainingDto } from './dto/update-training.dto';
import { UploadAttachmentDto } from './dto/upload-attachment.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NoteRo } from './dto/note.ro';
import { EmployeeDetailRo } from './dto/employee-detail.ro';
import { EmployeeListItemRo } from './dto/employee-list-item.ro';
import { TrainingRo } from './dto/training.ro';
import { AttachmentRo, AttachmentWithUrlRo } from './dto/attachment.ro';
import { PaginatedRo } from './dto/paginated.ro';
import { PaginatedEmployeesRo } from './dto/paginated-employees.ro';
import { PaginatedCourseReportRo } from './dto/paginated-course-report.ro';
import { ProgramStatsRo } from './dto/program-stats.ro';
import { CourseReportRowRo } from './dto/course-report-row.ro';
import { DiscomfortSummaryRo } from './dto/discomfort-summary.ro';
import { ChartAggregationRo } from './dto/chart-aggregation.ro';
import { LmsPayloadDto } from './dto/lms-payload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { IdDto } from '../common/dto/id.dto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

function getOrgFilter(req: Request): string | null {
  return (req as any).organizationFilter ?? null;
}

@ApiTags('Employees')
@ApiBearerAuth()
@Controller('employees')
@UseGuards(JwtAuthGuard, OrgMemberGuard)
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly reportingService: EmployeeReportingService,
    private readonly lmsService: EmployeeLmsService,
    private readonly attachmentService: EmployeeAttachmentService,
    private readonly noteService: EmployeeNoteService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new employee' })
  @ApiResponse({ status: 201, type: EmployeeDetailRo })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async create(
    @Req() req: Request,
    @Body() dto: CreateEmployeeDto,
  ): Promise<EmployeeDetailRo> {
    return this.employeeService.create(dto, getOrgFilter(req));
  }

  @Get()
  @ApiOperation({ summary: 'List employees with pagination and filtering' })
  @ApiResponse({ status: 200, type: PaginatedEmployeesRo })
  async findAll(
    @Req() req: Request,
    @Query() query: QueryEmployeesDto,
  ): Promise<PaginatedRo<EmployeeListItemRo>> {
    return this.employeeService.findAll(query, getOrgFilter(req));
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get program-wide statistics' })
  @ApiResponse({ status: 200, type: ProgramStatsRo })
  async getStats(@Req() req: Request): Promise<ProgramStatsRo> {
    return this.reportingService.getStats(getOrgFilter(req));
  }

  @Get('reports/:course')
  @ApiOperation({ summary: 'Get report data for a specific course' })
  @ApiParam({ name: 'course', example: 'Self Assessment' })
  @ApiResponse({ status: 200, type: PaginatedCourseReportRo })
  async getCourseReport(
    @Req() req: Request,
    @Param('course') course: string,
    @Query() query: QueryEmployeesDto,
  ): Promise<PaginatedRo<CourseReportRowRo>> {
    return this.reportingService.getCourseReport(
      course,
      query,
      getOrgFilter(req),
    );
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
    @Req() req: Request,
    @Param('course') course: string,
    @Query('dataPath') dataPath: string = 'bodyPartsDiscomfort',
  ): Promise<DiscomfortSummaryRo> {
    return this.reportingService.aggregateBodyPartData(
      course,
      dataPath,
      getOrgFilter(req),
    );
  }

  @Get('reports/:course/chart-aggregation')
  @ApiOperation({
    summary: 'Get aggregated chart data (result, issues, actions, equipment)',
  })
  @ApiParam({ name: 'course', example: 'Self Assessment' })
  @ApiResponse({ status: 200, type: ChartAggregationRo })
  async getChartAggregation(
    @Req() req: Request,
    @Param('course') course: string,
  ): Promise<ChartAggregationRo> {
    return this.reportingService.aggregateChartData(
      course,
      getOrgFilter(req),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee detail by ID' })
  @ApiResponse({ status: 200, type: EmployeeDetailRo })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async findOne(
    @Req() req: Request,
    @Param() { id }: IdDto,
  ): Promise<EmployeeDetailRo> {
    return this.employeeService.findOne(id, getOrgFilter(req));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update employee' })
  @ApiResponse({ status: 200, type: EmployeeDetailRo })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async update(
    @Req() req: Request,
    @Param() { id }: IdDto,
    @Body() dto: UpdateEmployeeDto,
  ): Promise<EmployeeDetailRo> {
    return this.employeeService.update(id, dto, getOrgFilter(req));
  }

  @Patch(':id/follow-up-status')
  @ApiOperation({ summary: 'Update follow-up status of an employee' })
  @ApiResponse({ status: 200, type: EmployeeDetailRo })
  async updateFollowUpStatus(
    @Req() req: Request,
    @Param() { id }: IdDto,
    @Body() body: { followUpStatus: string },
  ): Promise<EmployeeDetailRo> {
    return this.employeeService.update(
      id,
      { followUpStatus: body.followUpStatus },
      getOrgFilter(req),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete employee' })
  @ApiResponse({ status: 200, description: 'Employee deleted' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async remove(
    @Req() req: Request,
    @Param() { id }: IdDto,
  ): Promise<void> {
    const employee = await this.employeeService.findEmployeeOrFail(
      id,
      getOrgFilter(req),
    );
    await this.attachmentService.removeAllAttachments(employee);
    return this.employeeService.remove(id, getOrgFilter(req));
  }

  @Post(':id/trainings')
  @ApiOperation({ summary: 'Add a training to an employee' })
  @ApiResponse({ status: 201, type: TrainingRo })
  async addTraining(
    @Req() req: Request,
    @Param() { id }: IdDto,
    @Body() dto: AddTrainingDto,
  ): Promise<TrainingRo> {
    return this.employeeService.addTraining(id, dto, getOrgFilter(req));
  }

  @Patch(':id/trainings/:trainingId')
  @ApiOperation({ summary: 'Update a training' })
  @ApiParam({ name: 'trainingId' })
  @ApiResponse({ status: 200, type: TrainingRo })
  async updateTraining(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('trainingId') trainingId: string,
    @Body() dto: UpdateTrainingDto,
  ): Promise<TrainingRo> {
    return this.employeeService.updateTraining(
      id,
      trainingId,
      dto,
      getOrgFilter(req),
    );
  }

  @Delete(':id/trainings/:trainingId')
  @ApiOperation({ summary: 'Remove a training' })
  @ApiParam({ name: 'trainingId' })
  @ApiResponse({ status: 200, description: 'Training removed' })
  async removeTraining(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('trainingId') trainingId: string,
  ): Promise<void> {
    return this.employeeService.removeTraining(
      id,
      trainingId,
      getOrgFilter(req),
    );
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file attachment to an employee' })
  @ApiBody({
    description: 'File to attach (max 10 MB)',
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        label: { type: 'string', description: 'Optional label' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, type: AttachmentRo })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async uploadAttachment(
    @Req() req: Request,
    @Param() { id }: IdDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadAttachmentDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<AttachmentRo> {
    return this.attachmentService.upload(
      id,
      file,
      dto.label ?? null,
      user?.id ?? null,
      getOrgFilter(req),
    );
  }

  @Post(':id/attachments/bulk')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload multiple file attachments (max 10 files)' })
  @ApiBody({
    description: 'Files to attach (max 10 MB each)',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({ status: 201, type: [AttachmentRo] })
  async uploadAttachmentsBulk(
    @Req() req: Request,
    @Param() { id }: IdDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: CurrentUserType,
  ): Promise<AttachmentRo[]> {
    const results: AttachmentRo[] = [];
    for (const file of files) {
      const result = await this.attachmentService.upload(
        id,
        file,
        null,
        user?.id ?? null,
        getOrgFilter(req),
      );
      results.push(result);
    }
    return results;
  }

  @Get(':id/attachments')
  @ApiOperation({ summary: 'List all attachments for an employee (with download URLs)' })
  @ApiResponse({ status: 200, type: [AttachmentWithUrlRo] })
  async listAttachments(
    @Req() req: Request,
    @Param() { id }: IdDto,
  ): Promise<AttachmentWithUrlRo[]> {
    return this.attachmentService.listAttachments(id, getOrgFilter(req));
  }

  @Get(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Get a single attachment with a pre-signed download URL' })
  @ApiParam({ name: 'attachmentId' })
  @ApiResponse({ status: 200, type: AttachmentWithUrlRo })
  @ApiResponse({ status: 404, description: 'Employee or attachment not found' })
  async getAttachment(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<AttachmentWithUrlRo> {
    return this.attachmentService.getDownloadUrl(
      id,
      attachmentId,
      getOrgFilter(req),
    );
  }

  @Delete(':id/attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete an attachment from employee and S3' })
  @ApiParam({ name: 'attachmentId' })
  @ApiResponse({ status: 200, description: 'Attachment deleted' })
  @ApiResponse({ status: 404, description: 'Employee or attachment not found' })
  async removeAttachment(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<void> {
    return this.attachmentService.removeAttachment(
      id,
      attachmentId,
      getOrgFilter(req),
    );
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'List all notes for an employee (newest first)' })
  @ApiResponse({ status: 200, type: [NoteRo] })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async listNotes(
    @Req() req: Request,
    @Param() { id }: IdDto,
  ): Promise<NoteRo[]> {
    return this.noteService.listNotes(id, getOrgFilter(req));
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add a note to an employee' })
  @ApiResponse({ status: 201, type: NoteRo })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async addNote(
    @Req() req: Request,
    @Param() { id }: IdDto,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<NoteRo> {
    return this.noteService.addNote(
      id,
      dto.content,
      { id: user?.id ?? null, name: user?.username ?? null },
      getOrgFilter(req),
    );
  }

  @Patch(':id/notes/:noteId')
  @ApiOperation({ summary: 'Update a note' })
  @ApiParam({ name: 'noteId' })
  @ApiResponse({ status: 200, type: NoteRo })
  @ApiResponse({ status: 404, description: 'Employee or note not found' })
  async updateNote(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
  ): Promise<NoteRo> {
    return this.noteService.updateNote(
      id,
      noteId,
      dto.content,
      getOrgFilter(req),
    );
  }

  @Delete(':id/notes/:noteId')
  @ApiOperation({ summary: 'Delete a note from an employee' })
  @ApiParam({ name: 'noteId' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  @ApiResponse({ status: 404, description: 'Employee or note not found' })
  async removeNote(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('noteId') noteId: string,
  ): Promise<void> {
    return this.noteService.removeNote(id, noteId, getOrgFilter(req));
  }


  @Public()
  @Post('lms/receive')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Receive training data from LMS / Storyline',
  })
  @ApiResponse({ status: 200, description: 'Data received successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or inactive API key' })
  @ApiResponse({ status: 400, description: 'Bad request / course not enabled' })
  async receiveLmsData(
    @Body() payload: LmsPayloadDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.lmsService.receiveLmsData(payload);
  }
}
