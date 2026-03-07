import { raw } from '@nestjs/mongoose';
import { BodyPart } from '../../dto/course-data/self-assessment-course-data.dto';

export const selfAssessmentRawSchema = {
  demographic: raw({
    age: { type: String },
    heightRaw: { type: String },
    heightInches: { type: Number, default: null },
    handedness: { type: String },
    wearsBifocals: { type: Boolean, default: false },
    visualIssue: { type: String },
    computerTime: { type: String },
    dualMonitors: { type: Boolean, default: false },
    usesLaptop: { type: Boolean, default: false },
    sitToStand: { type: String },
    chairAdjustable: { type: Boolean },
  }),
  discomforts: [
    raw({
      area: { type: String },
      severity: { type: Number, default: null },
    }),
  ],
  actions: { type: [String], default: [] },
  equipment: { type: [String], default: [] },
  issues: raw({
    recommendations: { type: [String], default: [] },
    actionItems: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    result: { type: String, default: null },
    raw: { type: String, default: null },
    other: { type: [String], default: [] },
  }),
  result: { type: String, default: null },
  bodyPartsDiscomfort: [
    raw({
      bodyPart: { type: String, enum: Object.values(BodyPart) },
      severity: { type: Number },
    }),
  ],
};
