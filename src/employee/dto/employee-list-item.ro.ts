import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';

export class TrainingStatusRo {
  @Expose()
  @ApiProperty({ description: 'Course name' })
  course: string;

  @Expose()
  @ApiProperty({ description: 'Training status' })
  status: string;
}

export class EmployeeListItemRo {
  @Expose()
  @ApiProperty({ description: 'Employee ID' })
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @Expose()
  @ApiProperty({ description: 'Employee full name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Employee email' })
  email: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Legacy profile URL' })
  oldProfileUrl: string | null;

  @Expose()
  @ApiProperty({
    description: 'Status per course',
    type: [TrainingStatusRo],
  })
  @Type(() => TrainingStatusRo)
  trainingStatuses: TrainingStatusRo[];
}
