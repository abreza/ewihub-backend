import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { TrainingRo } from './training.ro';
import { AttachmentRo } from './attachment.ro';
import { NoteRo } from './note.ro';

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
  @ApiPropertyOptional({ description: 'Organization ID' })
  @Transform(({ obj }) => obj.organization?.toString() ?? obj.organization)
  organization: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Department name' })
  department: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Follow-up status' })
  followUpStatus: string | null;

  @Expose()
  @ApiProperty({ description: 'All trainings', type: [TrainingRo] })
  @Type(() => TrainingRo)
  trainings: TrainingRo[];

  @Expose()
  @ApiProperty({ description: 'File attachments', type: [AttachmentRo] })
  @Type(() => AttachmentRo)
  attachments: AttachmentRo[];

  @Expose()
  @ApiProperty({ description: 'Manager/admin notes (Markdown)', type: [NoteRo] })
  @Type(() => NoteRo)
  notes: NoteRo[];

  @Expose()
  @ApiProperty({ description: 'Creation timestamp' })
  @Transform(({ obj }) => obj.createdAt?.toISOString?.() ?? obj.createdAt)
  createdAt: string;

  @Expose()
  @ApiProperty({ description: 'Update timestamp' })
  @Transform(({ obj }) => obj.updatedAt?.toISOString?.() ?? obj.updatedAt)
  updatedAt: string;
}
