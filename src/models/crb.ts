// src/models/crb.ts
// Shared types used across the Cadet TRB app.

export type CadetStream = "DECK" | "ENGINE" | "ETO";

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
