import {
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Username', example: 'john_doe', minLength: 3 })
  @IsString()
  @MinLength(3)
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ description: 'Password', example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Whether the user is a super user', example: false })
  @IsBoolean()
  @IsOptional()
  isAdmin?: boolean;
}
