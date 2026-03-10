import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PaginationMetaRo } from './paginated.ro';
import { CourseReportRowRo } from './course-report-row.ro';

export class PaginatedCourseReportRo {
  @Expose()
  @ApiProperty({ type: [CourseReportRowRo] })
  @Type(() => CourseReportRowRo)
  data: CourseReportRowRo[];

  @Expose()
  @ApiProperty({ type: PaginationMetaRo })
  @Type(() => PaginationMetaRo)
  meta: PaginationMetaRo;
}
