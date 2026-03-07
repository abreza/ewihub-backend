import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class BodyPartAggregationRo {
  @Expose()
  @ApiProperty({ description: 'Body part key' })
  key: string;

  @Expose()
  @ApiProperty({ description: 'Number of reports' })
  count: number;

  @Expose()
  @ApiProperty({ description: 'Sum of severity values' })
  totalSeverity: number;

  @Expose()
  @ApiProperty({ description: 'Average severity' })
  avgSeverity: number;
}

export class DiscomfortSummaryRo {
  @Expose()
  @ApiProperty({ description: 'Count per body part', type: Object })
  countData: Record<string, number>;

  @Expose()
  @ApiProperty({ description: 'Average severity per body part', type: Object })
  avgData: Record<string, number>;

  @Expose()
  @ApiProperty({
    description: 'Detailed aggregation per body part',
    type: [BodyPartAggregationRo],
  })
  details: BodyPartAggregationRo[];
}
