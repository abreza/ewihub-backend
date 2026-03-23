import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { DEFAULT_FOLLOW_UP_STATUSES } from 'src/employee/constants/follow-up-statuses';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  abbreviation: string;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: String, default: null })
  logo: string | null;

  @Prop({ required: true, unique: true })
  apiKey: string;

  @Prop({ type: [String], default: [] })
  courses: string[];

  @Prop({ default: false })
  enableDepartments: boolean;

  @Prop({ default: true })
  active: boolean;

  @Prop({ type: [String], default: ['Default'] })
  departments: string[];

  @Prop({ default: false })
  enableFollowUpStatus: boolean;

  @Prop({ type: [String], default: DEFAULT_FOLLOW_UP_STATUSES })
  followUpStatuses: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

OrganizationSchema.index({ apiKey: 1 }, { unique: true });
OrganizationSchema.index({ abbreviation: 1 });
