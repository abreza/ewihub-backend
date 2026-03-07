import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { TrainingRo } from './training.ro';

export class EmployeeDetailRo {
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
  @ApiProperty({ description: 'All trainings', type: [TrainingRo] })
  @Type(() => TrainingRo)
  trainings: TrainingRo[];

  @Expose()
  @ApiProperty({ description: 'Creation timestamp' })
  @Transform(({ obj }) => obj.createdAt?.toISOString?.() ?? obj.createdAt)
  createdAt: string;

  @Expose()
  @ApiProperty({ description: 'Update timestamp' })
  @Transform(({ obj }) => obj.updatedAt?.toISOString?.() ?? obj.updatedAt)
  updatedAt: string;
}
