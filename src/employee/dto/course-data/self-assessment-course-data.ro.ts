import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { BodyPart } from './self-assessment-course-data.dto';

export class DemographicRo {
  @Expose()
  @ApiPropertyOptional()
  age: string | null;

  @Expose()
  @ApiPropertyOptional()
  heightRaw: string | null;

  @Expose()
  @ApiPropertyOptional()
  heightInches: number | null;

  @Expose()
  @ApiPropertyOptional()
  handedness: string | null;

  @Expose()
  @ApiPropertyOptional()
  wearsBifocals: boolean;

  @Expose()
  @ApiPropertyOptional()
  visualIssue: string | null;

  @Expose()
  @ApiPropertyOptional()
  computerTime: string | null;

  @Expose()
  @ApiPropertyOptional()
  dualMonitors: boolean;

  @Expose()
  @ApiPropertyOptional()
  usesLaptop: boolean;

  @Expose()
  @ApiPropertyOptional()
  sitToStand: string | null;

  @Expose()
  @ApiPropertyOptional()
  chairAdjustable: boolean;
}

export class DiscomfortRo {
  @Expose()
  @ApiProperty()
  area: string;

  @Expose()
  @ApiPropertyOptional()
  severity: number | null;
}


export class IssuesRo {
  @Expose()
  @ApiPropertyOptional({ type: [String] }) recommendations: string[];

  @Expose()
  @ApiPropertyOptional({ type: [String] }) actionItems: string[];

  @Expose()
  @ApiPropertyOptional({ type: [String] }) suggestions: string[];

  @Expose()
  @ApiPropertyOptional()
  result: string | null;

  @Expose()
  @ApiPropertyOptional()
  raw: string | null;

  @Expose()
  @ApiPropertyOptional({ type: [String] }) other: string[];
}


export class BodyPartDiscomfortRo {
  @Expose()
  @ApiProperty({ enum: BodyPart, description: 'Body part key', example: BodyPart.RightKnee })
  bodyPart: BodyPart;

  @Expose()
  @ApiProperty({ description: 'Non-zero severity level', example: 2 })
  severity: number;
}


export class SelfAssessmentCourseDataRo {
  @Expose()
  @ApiPropertyOptional({ type: DemographicRo })
  @Type(() => DemographicRo)
  demographic: DemographicRo | null;

  @Expose()
  @ApiPropertyOptional({ type: [DiscomfortRo] })
  @Type(() => DiscomfortRo)
  discomforts: DiscomfortRo[];

  @Expose()
  @ApiPropertyOptional({ type: [String] })
  actions: string[];

  @Expose()
  @ApiPropertyOptional({ type: [String] })
  equipment: string[];

  @Expose()
  @ApiPropertyOptional({ type: IssuesRo })
  @Type(() => IssuesRo)
  issues: IssuesRo | null;

  @Expose()
  @ApiPropertyOptional()
  result: string | null;

  @Expose()
  @ApiPropertyOptional({ type: [BodyPartDiscomfortRo], description: 'Body parts with non-zero severity' })
  @Type(() => BodyPartDiscomfortRo)
  bodyPartsDiscomfort: BodyPartDiscomfortRo[];
}
