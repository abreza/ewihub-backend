import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SeedResultRo {
  @Expose()
  @ApiProperty({ description: 'Number of organizations created', example: 3 })
  organizationsCreated: number;

  @Expose()
  @ApiProperty({ description: 'Number of users created', example: 8 })
  usersCreated: number;

  @Expose()
  @ApiProperty({ description: 'Non-fatal errors encountered', type: [String] })
  errors: string[];
}
