import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Course } from '../constants';
import { SelfAssessmentCourseDataDto } from './course-data/self-assessment-course-data.dto';
import { OfficeErgonomicsCourseDataDto } from './course-data/office-ergonomics-course-data.dto';

export type CourseDataDto =
  | SelfAssessmentCourseDataDto
  | OfficeErgonomicsCourseDataDto;

export class AddTrainingDto {
  @ApiProperty({ description: 'Course name', example: 'Self Assessment' })
  @IsString()
  @IsNotEmpty()
  course: string;

  @ApiProperty({ description: 'Training status', example: 'pass' })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({
    description: 'Training start date',
    example: '1/15/2024',
  })
  @IsString()
  @IsOptional()
  startedDate?: string;

  @ApiPropertyOptional({
    description: 'Training completion date',
    example: '1/20/2024',
  })
  @IsString()
  @IsOptional()
  completedDate?: string;

  @ApiPropertyOptional({
    description: 'Course-specific data payload',
    oneOf: [
      { $ref: '#/components/schemas/SelfAssessmentCourseDataDto' },
      { $ref: '#/components/schemas/OfficeErgonomicsCourseDataDto' },
    ],
  })
  @ValidateNested()
  @Type((obj) => {
    switch (obj?.object?.course) {
      case Course.SelfAssessment:
        return SelfAssessmentCourseDataDto;
      case Course.OfficeErgonomics:
        return OfficeErgonomicsCourseDataDto;
      default:
        return SelfAssessmentCourseDataDto;
    }
  })
  @IsOptional()
  courseData?: CourseDataDto;
}
