import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ description: 'Employee full name' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Employee email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Legacy profile URL' })
  @IsString()
  @IsOptional()
  oldProfileUrl?: string;

  @ApiPropertyOptional({ description: 'Follow-up status' })
  @IsString()
  @IsOptional()
  followUpStatus?: string;
}
