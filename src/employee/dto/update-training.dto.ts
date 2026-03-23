import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiExtraModels, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { SelfAssessmentCourseDataDto } from './course-data/self-assessment-course-data.dto';
import { OfficeErgonomicsCourseDataDto } from './course-data/office-ergonomics-course-data.dto';
import { CourseDataDto } from './add-training.dto';

@ApiExtraModels(SelfAssessmentCourseDataDto, OfficeErgonomicsCourseDataDto)
export class UpdateTrainingDto {
  @ApiPropertyOptional({ description: 'Training status' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Training start date' })
  @IsString()
  @IsOptional()
  startedDate?: string;

  @ApiPropertyOptional({ description: 'Training completion date' })
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
  @Type(() => SelfAssessmentCourseDataDto)
  @IsOptional()
  courseData?: CourseDataDto;

  @ApiPropertyOptional({ description: 'Follow-up status' })
  @IsString()
  @IsOptional()
  followUpStatus?: string;
}
