import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadAttachmentDto {
  @ApiPropertyOptional({ description: 'Optional label or description for the file' })
  @IsString()
  @IsOptional()
  label?: string;
}
