import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ChartAggregationRo {
  @Expose()
  @ApiProperty({
    description: 'Aggregated result counts',
    example: { Pass: 408, 'Action Needed': 314, Assessment: 500 },
    type: Object,
  })
  result: Record<string, number>;

  @Expose()
  @ApiProperty({
    description: 'Aggregated issue counts across all completed trainings',
    type: Object,
  })
  issues: Record<string, number>;

  @Expose()
  @ApiProperty({
    description: 'Aggregated action item counts across all completed trainings',
    type: Object,
  })
  actions: Record<string, number>;

  @Expose()
  @ApiProperty({
    description: 'Aggregated equipment need counts across all completed trainings',
    type: Object,
  })
  equipment: Record<string, number>;
}
