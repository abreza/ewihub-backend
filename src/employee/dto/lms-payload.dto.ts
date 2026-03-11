import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LmsPayloadDto {
  @ApiProperty({ description: 'Learner identifier', example: 'john@company.com' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Learner email', example: 'john@company.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'Learner full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Department', example: 'Default' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ description: 'Course slug', example: 'self-assessment' })
  @IsString()
  @IsNotEmpty()
  course: string;

  @ApiProperty({
    description: 'Training status',
    example: 'started',
    enum: ['started', 'finished'],
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiProperty({ description: 'Organization API key' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiPropertyOptional({
    description: 'Course-specific data payload (null for started, object for finished)',
    example: null,
  })
  @IsOptional()
  data?: Record<string, any> | null;
}
