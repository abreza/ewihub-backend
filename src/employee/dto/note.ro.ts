import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class NoteRo {
  @Expose()
  @ApiProperty({ description: 'Note ID' })
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @Expose()
  @ApiProperty({ description: 'Note content (Markdown)' })
  content: string;

  @Expose()
  @ApiPropertyOptional({ description: 'User ID of the author' })
  createdBy: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Display name of the author' })
  createdByName: string | null;

  @Expose()
  @ApiProperty({ description: 'Creation timestamp' })
  @Transform(({ obj }) => obj.createdAt?.toISOString?.() ?? obj.createdAt)
  createdAt: string;

  @Expose()
  @ApiProperty({ description: 'Last update timestamp' })
  @Transform(({ obj }) => obj.updatedAt?.toISOString?.() ?? obj.updatedAt)
  updatedAt: string;
}
