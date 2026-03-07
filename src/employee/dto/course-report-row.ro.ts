import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CourseReportRowRo {
  @Expose()
  @ApiProperty({ description: 'Employee ID' })
  employeeId: string;

  @Expose()
  @ApiProperty({ description: 'Employee name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Employee email' })
  email: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Legacy profile URL' })
  oldProfileUrl: string | null;

  @Expose()
  @ApiProperty({ description: 'Course name' })
  course: string;

  @Expose()
  @ApiProperty({ description: 'Training status' })
  status: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Start date' })
  startedDate: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Completion date' })
  completedDate: string | null;

  @Expose()
  @ApiPropertyOptional({
    description: 'Course-specific result extracted from courseData',
  })
  result: string | null;
}
