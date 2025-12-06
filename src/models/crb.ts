// src/models/crb.ts
// Shared types used across the Cadet TRB app.

export type CadetStream = "DECK" | "ENGINE" | "ETO";

// STATUS ENUM
export type TaskStatus = "PENDING" | "SUBMITTED" | "VERIFIED" | "APPROVED";




export type CadetProfile = {
  id: string;
  fullName: string;
  dateOfBirth?: string;
  stream: CadetStream;
  dischargeBookNo?: string;
  passportNo?: string;
  academyName?: string;
  academyId?: string;
  nextOfKinName?: string;
  nextOfKinContact?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TrainingContacts = {
  masterName?: string;
  masterId?: string;
  chiefEngineerName?: string;
  chiefEngineerId?: string;
  dstoName?: string;
  dstoId?: string;
};

export type SeaServiceDeployment = {
  id: string;
  cadetId: string;
  vesselId: string;
  vesselName?: string;
  vesselFlagState?: string;
  vesselType?: string;
  role: string;
  signOnDate: string;
  signOffDate?: string;
  signOnPort?: string;
  signOffPort?: string;
  totalDaysOnboard?: number;
  totalSeaDays?: number;
  totalPortDays?: number;
  voyageSummary?: string;
  trainingContacts: TrainingContacts;
  testimonialText?: string;
  testimonialSignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ----- Tasks & Competence -----

// export type TaskStatus = "PENDING" | "SUBMITTED" | "VERIFIED" | "APPROVED";

// export type TrainingTaskTemplate = {
//   id: string;
//   sectionCode: string; // e.g. "NAV", "CARGO", "SAFETY"
//   title: string;
//   description: string;
//   stream: CadetStream;
//   isMandatory: boolean;
// };

// export type TrainingTaskProgress = {
//   id: string;
//   cadetId: string;
//   templateId: string;
//   status: TaskStatus;
//   lastStatusChangeAt?: string;
//   reflectionText?: string;
//   verifiedById?: string;
//   verifiedByName?: string;
//   verifiedAt?: string;
//   approvedByMasterId?: string;
//   approvedByMasterName?: string;
//   approvedAt?: string;
//   createdAt?: string;
//   updatedAt?: string;
// };

export type TrainingTaskWithProgress = {
  template: TrainingTaskTemplate;
  progress: TrainingTaskProgress;
};

// ----- Diary & Watchkeeping -----

export type DiaryEntryType = "DAILY" | "BRIDGE" | "ENGINE";

export type DiaryEntry = {
  id: string;
  cadetId: string;
  deploymentId?: string;
  date: string; // YYYY-MM-DD
  entryType: DiaryEntryType;
  timeStart?: string; // HH:mm
  timeEnd?: string;   // HH:mm
  summary?: string;
  positionLat?: string;
  positionLon?: string;
  courseOverGroundDeg?: number;
  speedOverGroundKnots?: number;
  weatherSummary?: string;
  role?: string;
  steeringMinutes?: number;
  machineryMonitored?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ---- Tasks & Competence (Training Record Book) ----



export type TrainingTaskTemplate = {
  id: string;
  sectionCode: string;
  title: string;
  description: string;
  stream: CadetStream; // "DECK" | "ENGINE" | "ETO"
  isMandatory: boolean;
};

export type TrainingTaskProgress = {
  id: string;
  cadetId: string;
  templateId: string;
  status: TaskStatus;
  lastStatusChangeAt?: string;
  reflectionText?: string;
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  approvedByMasterId?: string;
  approvedByMasterName?: string;
  approvedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
