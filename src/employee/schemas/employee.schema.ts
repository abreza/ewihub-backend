import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Training, TrainingSchema } from './training.schema';
import { Attachment, AttachmentSchema } from './attachment.schema';
import { Note, NoteSchema } from './note.schema';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true })
export class Employee {
  @Prop({ type: String, default: null })
  lmsLearnerId: string | null;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ type: String, default: null })
  oldProfileUrl: string | null;

  @Prop({ type: Types.ObjectId, ref: 'Organization', default: null })
  organization: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  department: string | null;

  @Prop({ type: String, default: null })
  followUpStatus: string | null;

  @Prop({ type: [TrainingSchema], default: [] })
  trainings: Training[];

  @Prop({ type: [AttachmentSchema], default: [] })
  attachments: Attachment[];

  @Prop({ type: [NoteSchema], default: [] })
  notes: Note[];

  createdAt: Date;
  updatedAt: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.index({ name: 'text', email: 'text' });
EmployeeSchema.index({ 'trainings.course': 1 });
EmployeeSchema.index({ 'trainings.status': 1 });
EmployeeSchema.index({ organization: 1 });
EmployeeSchema.index({ email: 1, organization: 1 });
