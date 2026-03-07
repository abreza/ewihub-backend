import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { selfAssessmentRawSchema } from './courses/self-assessment.raw-schema';
import { officeErgonomicsRawSchema } from './courses/office-ergonomics.raw-schema';

@Schema({ _id: true })
export class Training {
  @Prop({ required: true })
  course: string;

  @Prop({ required: true })
  status: string;

  @Prop({ type: String, default: null })
  startedDate: string | null;

  @Prop({ type: String, default: null })
  completedDate: string | null;

  @Prop(
    raw({
      ...selfAssessmentRawSchema,
      ...officeErgonomicsRawSchema,
    }),
  )
  courseData: Record<string, any> | null;
}

export const TrainingSchema = SchemaFactory.createForClass(Training);
