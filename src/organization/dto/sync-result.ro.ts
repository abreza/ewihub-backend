import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SyncResultRo {
  @Expose()
  @ApiProperty({ description: 'Whether the sync completed', example: true })
  success: boolean;

  @Expose()
  @ApiProperty({ description: 'Human-readable summary', example: 'Synced 42 employees from ewihub.com' })
  message: string;

  @Expose()
  @ApiProperty({ description: 'Number of profiles scraped', example: 42 })
  totalScraped: number;

  @Expose()
  @ApiProperty({ description: 'New employees created', example: 10 })
  created: number;

  @Expose()
  @ApiProperty({ description: 'Existing employees updated', example: 32 })
  updated: number;

  @Expose()
  @ApiProperty({ description: 'Per-employee errors (non-fatal)', type: [String] })
  errors: string[];
}
