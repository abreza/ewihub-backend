import { IsString, IsNotEmpty, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncEwihubDto {
  @ApiProperty({
    description: 'EWI Hub login email (organization user credential)',
    example: 'admin@company.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'EWI Hub login password',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
