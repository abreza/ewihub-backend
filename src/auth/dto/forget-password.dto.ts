import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgetPasswordDto {
  @ApiProperty({ description: 'User email address', example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
