export enum Course {
  OfficeErgonomics = 'Office Ergonomics',
  SelfAssessment = 'Self Assessment',
}

export enum TrainingStatus {
  Pending = 'pending',
  Started = 'started',
  Completed = 'completed',
  Finished = 'finished',
  Pass = 'pass',
  Action = 'action',
  Assessment = 'assessment',
}

export const COMPLETED_STATUSES: string[] = [
  TrainingStatus.Completed,
  TrainingStatus.Finished,
  TrainingStatus.Pass,
  TrainingStatus.Action,
  TrainingStatus.Assessment,
];

export const IN_PROGRESS_STATUSES: string[] = [
  TrainingStatus.Pending,
  TrainingStatus.Started,
];
