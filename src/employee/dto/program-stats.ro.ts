import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CourseStatsRo {
  @Expose()
  @ApiProperty()
  course: string;

  @Expose()
  @ApiProperty()
  enrolled: number;

  @Expose()
  @ApiProperty()
  completed: number;

  @Expose()
  @ApiProperty()
  inProgress: number;

  @Expose()
  @ApiProperty({ description: 'Status breakdown', type: Object })
  statusBreakdown: Record<string, number>;
}

export class ProgramStatsRo {
  @Expose()
  @ApiProperty()
  totalEmployees: number;

  @Expose()
  @ApiProperty({ type: [CourseStatsRo] })
  courses: CourseStatsRo[];

  @Expose()
  @ApiProperty()
  completionRate: number;
}
