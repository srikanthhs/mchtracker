export type UserRole = 'admin' | 'dph_officer' | 'bdo' | 'viewer';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  block?: string;
  active: boolean;
  lastLogin?: any;
  createdAt?: any;
}

export interface ContactLog {
  id: string;
  date: string;
  outcome: string;
  type: 'SMS' | 'Call' | 'Visit';
  remarks?: string;
  performedBy?: string;
}

export interface PatientRecord {
  id: string; // PICME No
  b: string;  // Block
  p: string;  // PHC
  h: string;  // HSC
  n: string;  // Mother Name
  hu: string; // Husband Name
  e: string;  // EDD (YYYY-MM-DD)
  a: number | null; // Age
  ph: string; // Phone
  g: string;  // Gravida
  pa: string; // Para
  r: string[]; // Risk flags
  pp?: string; // Planned place
  pt?: string; // Place type
  pd?: string; // Actual place of delivery
  lv?: string; // Last visit date
  rm?: string; // Remarks
  as?: string; // Admission status
  ds?: string; // Delivery status
  dd?: string; // Delivery date
  fp?: string; // Family planning
  mo?: string; // Mentor OG
  mop?: string; // Mentor opinion
  cl?: ContactLog[]; // Contact logs
}

export interface RiskCategory {
  label: string;
  min: number;
  color: string;
  bg: string;
  bd: string;
  cls: string;
}

export interface AlertSchedule {
  id: string;
  type: string;
  alertIdx: number;
  date: string;
  block?: string;
  risk?: string;
  fired: boolean;
  firedAt?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorId: string;
  createdAt: any;
}
