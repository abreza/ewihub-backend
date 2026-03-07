import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ForgetPasswordRo {
  @Expose()
  @ApiProperty({
    description: 'Success message',
    example: 'If the email exists, a password reset link has been sent',
  })
  message: string;

  @Expose()
  @ApiProperty({
    description: 'Reset token (only returned in development mode for testing)',
    example: 'abc123...',
    required: false,
  })
  resetToken?: string;
}
