import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { Course } from '../constants';
import { SelfAssessmentCourseDataRo } from './course-data/self-assessment-course-data.ro';
import { OfficeErgonomicsCourseDataRo } from './course-data/office-ergonomics-course-data.ro';

export type CourseDataRo =
  | SelfAssessmentCourseDataRo
  | OfficeErgonomicsCourseDataRo
  | null;

export class TrainingRo {
  @Expose()
  @ApiProperty({ description: 'Training ID' })
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

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
    description: 'Course-specific data',
    oneOf: [
      { $ref: '#/components/schemas/SelfAssessmentCourseDataRo' },
      { $ref: '#/components/schemas/OfficeErgonomicsCourseDataRo' },
    ],
  })
  @Type((obj) => {
    switch (obj?.object?.course) {
      case Course.SelfAssessment:
        return SelfAssessmentCourseDataRo;
      case Course.OfficeErgonomics:
        return OfficeErgonomicsCourseDataRo;
      default:
        return SelfAssessmentCourseDataRo;
    }
  })
  courseData: CourseDataRo;
}
