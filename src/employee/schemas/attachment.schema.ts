import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: true, timestamps: true })
export class Attachment {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ type: String, default: null })
  label: string | null;

  @Prop({ type: String, default: null })
  uploadedBy: string | null;

  createdAt: Date;
  updatedAt: Date;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);
