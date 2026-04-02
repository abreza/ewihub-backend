import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';

export class AttachmentRo {
  @Expose()
  @ApiProperty({ description: 'Attachment ID' })
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @Expose()
  @ApiProperty({ description: 'S3 object key' })
  key: string;

  @Expose()
  @ApiProperty({ description: 'Original file name', example: 'report.pdf' })
  originalName: string;

  @Expose()
  @ApiProperty({ description: 'MIME type', example: 'application/pdf' })
  mimeType: string;

  @Expose()
  @ApiProperty({ description: 'File size in bytes', example: 204800 })
  size: number;

  @Expose()
  @ApiPropertyOptional({ description: 'User-provided label' })
  label: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'User ID of uploader' })
  uploadedBy: string | null;

  @Expose()
  @ApiProperty({ description: 'Upload timestamp' })
  @Transform(({ obj }) => obj.createdAt?.toISOString?.() ?? obj.createdAt)
  createdAt: string;
}

export class AttachmentWithUrlRo extends AttachmentRo {
  @Expose()
  @ApiProperty({ description: 'Pre-signed download URL (temporary)' })
  url: string;
}
