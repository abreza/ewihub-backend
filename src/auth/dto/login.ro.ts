import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LoginRo {
  @Expose()
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  access_token: string;
}
