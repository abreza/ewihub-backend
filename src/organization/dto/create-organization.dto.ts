import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization full name', example: 'EWI Works' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Abbreviated name', example: 'EWI' })
  @IsString()
  @IsNotEmpty()
  abbreviation: string;

  @ApiPropertyOptional({ description: 'Optional notes', example: 'Contact info...' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Logo URL or base64', example: '/uploads/logo.png' })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({
    description: 'Enabled courses',
    example: ['Self Assessment', 'Office Ergonomics'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  courses?: string[];

  @ApiPropertyOptional({ description: 'Enable department tracking', default: false })
  @IsBoolean()
  @IsOptional()
  enableDepartments?: boolean;

  @ApiPropertyOptional({ description: 'Whether organization is active', default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Enable follow-up status tracking for Self Assessment', default: false })
  @IsBoolean()
  @IsOptional()
  enableFollowUpStatus?: boolean;

  @ApiPropertyOptional({
    description: 'Custom follow-up status options',
    type: [String],
    example: ['Not Assigned', 'Assigned', 'Case Closed'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  followUpStatuses?: string[];
}
