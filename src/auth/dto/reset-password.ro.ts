import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ResetPasswordRo {
  @Expose()
  @ApiProperty({
    description: 'Success message',
    example: 'Password has been reset successfully',
  })
  message: string;
}
