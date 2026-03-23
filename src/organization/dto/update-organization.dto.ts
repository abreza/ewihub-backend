import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ description: 'Organization full name' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Abbreviated name' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  abbreviation?: string;

  @ApiPropertyOptional({ description: 'Optional notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Logo URL or base64' })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({ description: 'Enabled courses', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  courses?: string[];

  @ApiPropertyOptional({ description: 'Enable department tracking' })
  @IsBoolean()
  @IsOptional()
  enableDepartments?: boolean;

  @ApiPropertyOptional({ description: 'Whether organization is active' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Enable follow-up status tracking for Self Assessment' })
  @IsBoolean()
  @IsOptional()
  enableFollowUpStatus?: boolean;

  @ApiPropertyOptional({ description: 'Custom follow-up status options', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  followUpStatuses?: string[];
}
