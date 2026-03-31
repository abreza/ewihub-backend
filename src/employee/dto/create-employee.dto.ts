import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ description: 'Employee full name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Employee email',
    example: 'john.doe@company.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'Legacy profile URL',
    example: '/employees/123/john-doe',
  })
  @IsString()
  @IsOptional()
  oldProfileUrl?: string;

  @ApiPropertyOptional({ description: 'Follow-up status', example: 'Not Assigned' })
  @IsString()
  @IsOptional()
  followUpStatus?: string;
}
