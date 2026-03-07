import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Training, TrainingSchema } from './training.schema';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true })
export class Employee {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ type: String, default: null })
  oldProfileUrl: string | null;

  @Prop({ type: [TrainingSchema], default: [] })
  trainings: Training[];

  createdAt: Date;
  updatedAt: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

EmployeeSchema.index({ name: 'text', email: 'text' });
EmployeeSchema.index({ 'trainings.course': 1 });
EmployeeSchema.index({ 'trainings.status': 1 });
