import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { UserRole } from '../schemas/user.schema';

export class UserRo {
  @Expose()
  @ApiProperty({ description: 'User ID', example: '507f1f77bcf86cd799439011' })
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @Expose()
  @ApiProperty({ description: 'First name', example: 'John' })
  firstName: string;

  @Expose()
  @ApiProperty({ description: 'Last name', example: 'Doe' })
  lastName: string;

  @Expose()
  @ApiProperty({ description: 'Email address', example: 'john.doe@example.com' })
  email: string;

  @Expose()
  @ApiProperty({ description: 'Username', example: 'john_doe' })
  username: string;

  @Expose()
  @ApiProperty({ description: 'User role', enum: UserRole, example: UserRole.OrgUser })
  role: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Organization ID', example: '507f1f77bcf86cd799439011' })
  @Transform(({ obj }) => obj.organization?.toString() ?? null)
  organization: string | null;

  @Expose()
  @ApiProperty({ description: 'User creation timestamp', example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @Expose()
  @ApiProperty({ description: 'User update timestamp', example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
