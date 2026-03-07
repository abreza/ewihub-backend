import {
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsOptional,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DemographicDto {
  @ApiPropertyOptional({ example: '25-34' })
  @IsString()
  @IsOptional()
  age?: string;

  @ApiPropertyOptional({ example: '5\'10"' })
  @IsString()
  @IsOptional()
  heightRaw?: string;

  @ApiPropertyOptional({ example: 70 })
  @IsNumber()
  @IsOptional()
  heightInches?: number | null;

  @ApiPropertyOptional({ example: 'right' })
  @IsString()
  @IsOptional()
  handedness?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  wearsBifocals?: boolean;

  @ApiPropertyOptional({ example: 'none' })
  @IsString()
  @IsOptional()
  visualIssue?: string;

  @ApiPropertyOptional({ example: '6-8 hours' })
  @IsString()
  @IsOptional()
  computerTime?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  dualMonitors?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  usesLaptop?: boolean;

  @ApiPropertyOptional({ example: 'sit only' })
  @IsString()
  @IsOptional()
  sitToStand?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  chairAdjustable?: boolean;
}


export class DiscomfortDto {
  @ApiProperty({ example: 'lower_back' })
  @IsString()
  area: string;

  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  severity?: number | null;
}


export class IssuesDto {
  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  recommendations?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actionItems?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  suggestions?: string[];

  @ApiPropertyOptional({ example: 'pass' })
  @IsString()
  @IsOptional()
  result?: string | null;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  raw?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  other?: string[];
}

export enum BodyPart {
  UpperBack = 'upperBack',
  MidBack = 'midBack',
  LowerBack = 'lowerBack',
  Buttocks = 'buttocks',
  Head = 'head',
  Neck = 'neck',
  Eyes = 'eyes',
  LeftShoulder = 'leftShoulder',
  RightShoulder = 'rightShoulder',
  LeftUpperArm = 'leftUpperArm',
  RightUpperArm = 'rightUpperArm',
  LeftElbow = 'leftElbow',
  RightElbow = 'rightElbow',
  LeftLowerArm = 'leftLowerArm',
  RightLowerArm = 'rightLowerArm',
  LeftWrist = 'leftWrist',
  RightWrist = 'rightWrist',
  LeftHand = 'leftHand',
  RightHand = 'rightHand',
  LeftThigh = 'leftThigh',
  RightThigh = 'rightThigh',
  LeftKnee = 'leftKnee',
  RightKnee = 'rightKnee',
  LeftLowerLeg = 'leftLowerLeg',
  RightLowerLeg = 'rightLowerLeg',
  LeftFootOrAnkle = 'leftFootOrAnkle',
  RightFootOrAnkle = 'rightFootOrAnkle',
}

export class BodyPartDiscomfortDto {
  @ApiProperty({ enum: BodyPart, example: BodyPart.RightKnee, description: 'Body part key' })
  @IsEnum(BodyPart)
  bodyPart: BodyPart;

  @ApiProperty({ example: 2, description: 'Non-zero severity level' })
  @IsNumber()
  @Min(1)
  severity: number;
}

export class SelfAssessmentCourseDataDto {
  @ApiPropertyOptional({ type: DemographicDto })
  @ValidateNested()
  @Type(() => DemographicDto)
  @IsOptional()
  demographic?: DemographicDto | null;

  @ApiPropertyOptional({ type: [DiscomfortDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscomfortDto)
  @IsOptional()
  discomforts?: DiscomfortDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  actions?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  equipment?: string[];

  @ApiPropertyOptional({ type: IssuesDto })
  @ValidateNested()
  @Type(() => IssuesDto)
  @IsOptional()
  issues?: IssuesDto | null;

  @ApiPropertyOptional({ example: 'pass' })
  @IsString()
  @IsOptional()
  result?: string | null;

  @ApiPropertyOptional({ type: [BodyPartDiscomfortDto], description: 'Body parts with non-zero severity' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BodyPartDiscomfortDto)
  @IsOptional()
  bodyPartsDiscomfort?: BodyPartDiscomfortDto[];
}
