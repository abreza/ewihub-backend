export interface OrgEditPageData {
  csrfToken: string;
  name: string;
  abbreviation: string;
  notes: string;
  active: boolean;
  departmentsEnabled: boolean;
  courses: Record<string, string>;
  users: {
    status: string;
    id: string;
    name: string;
    email: string;
    password: string;
  }[];
}

export interface ScrapedTraining {
  course: string;
  status: string;
  attributes: Record<string, string>;
  bodyDiagram?: Record<string, number> | null;
}

export interface ScrapedEmployee {
  name: string;
  email: string;
  profileUrl: string;
  trainings: ScrapedTraining[];
  bodyDiagram: Record<string, number> | null;
}

export interface SyncResult {
  success: boolean;
  message: string;
  totalScraped: number;
  created: number;
  updated: number;
  errors: string[];
}

export interface TransformedTraining {
  course: string;
  status: string;
  startedDate: string | null;
  completedDate: string | null;
  courseData: Record<string, any> | null;
}