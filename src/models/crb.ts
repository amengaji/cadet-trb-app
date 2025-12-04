// src/models/crb.ts

// High-level enums / value types
export type CadetStream = "DECK" | "ENGINE" | "ETO";

export type VesselType =
  | "TANKER"
  | "BULK_CARRIER"
  | "CONTAINER"
  | "GENERAL_CARGO"
  | "PASSENGER"
  | "OFFSHORE"
  | "OTHER";

export type SeaServiceRole =
  | "CADET"
  | "TRAINEE_ENGINEER"
  | "TRAINEE_ETO"
  | "OTHER";

export type TaskStatus = "PENDING" | "SUBMITTED" | "VERIFIED" | "APPROVED";

export type DiaryEntryType = "DAILY" | "BRIDGE_WATCH" | "ENGINE_WATCH";

// ----------------------
// Cadet & Vessel Models
// ----------------------

/**
 * Core identification for a cadet using the TRB.
 * This is roughly "who owns this record book".
 */
export interface CadetProfile {
  id: string; // local UUID or server ID
  fullName: string;
  dateOfBirth?: string; // ISO date e.g. "2003-04-15"
  stream: CadetStream; // DECK / ENGINE / ETO

  dischargeBookNumber?: string;
  passportNumber?: string;

  academyName?: string;
  academyId?: string; // if linked to an institute in backend

  nextOfKinName?: string;
  nextOfKinContact?: string;

  createdAt?: string; // ISO date-time
  updatedAt?: string; // ISO date-time
}

/**
 * Basic vessel identity for sea service records.
 */
export interface VesselIdentity {
  id: string; // local / server ID
  name: string;
  imoNumber?: string;
  callSign?: string;
  flagState?: string;
  vesselType?: VesselType;

  grossTonnage?: number;
  lengthOverallMeters?: number;
  designDraftMeters?: number;

  // Basic engine / machinery summary
  mainEngineModel?: string; // e.g. "MAN B&W 6S60ME-C"
  mainEnginePowerKw?: number;
  generatorDetails?: string;
  boilerType?: string;

  // Optional list of navigational equipment as a simple string for now
  navigationEquipmentSummary?: string;

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Key officers relevant for training & endorsements on a given vessel.
 */
export interface VesselTrainingContacts {
  masterName?: string;
  masterId?: string; // If linked to backend user
  chiefEngineerName?: string;
  chiefEngineerId?: string;
  dstoName?: string; // Designated Shipboard Training Officer
  dstoId?: string;
}

// ----------------------
// Sea Service Models
// ----------------------

/**
 * A single deployment / contract for a cadet on a vessel.
 * This is the backbone for sea service calculations.
 */
export interface SeaServiceDeployment {
  id: string; // local / server ID
  cadetId: string;
  vesselId: string;

  role: SeaServiceRole; // CADET / TRAINEE_ENGINEER / etc.

  signOnDate: string; // ISO date
  signOffDate?: string; // ISO date
  signOnPort?: string;
  signOffPort?: string;

  // Derived / stored totals (can be recalculated if needed)
  totalDaysOnboard?: number;
  totalSeaDays?: number; // underway at sea
  totalPortDays?: number; // in port / alongside

  voyageSummary?: string; // e.g. "Singapore – Fujairah – Rotterdam"

  trainingContacts?: VesselTrainingContacts;

  testimonialText?: string; // Master/CE testimonial
  testimonialSignedAt?: string; // ISO date-time

  createdAt?: string;
  updatedAt?: string;
}

// ----------------------
// Task / Competence Models
// ----------------------

/**
 * Static definition of a training task (from the TRB book).
 * This is like the "master list" aligned with STCW / company TRB.
 */
export interface TrainingTaskTemplate {
  id: string; // ID of the task in the template
  sectionCode: string; // e.g. "4.1", "A-II/1-3"
  title: string; // short label
  description: string; // full text as per TRB
  stream: CadetStream; // which stream this applies to
  isMandatory: boolean;
}

/**
 * Evidence attached to a performed task (photo, video, note).
 * In the app we will store URIs/paths; backend can map to S3 etc.
 */
export interface TaskEvidence {
  id: string;
  taskProgressId: string; // link to TrainingTaskProgress
  localUri: string; // file path on device
  mimeType?: string;
  fileSizeBytes?: number;
  createdAt?: string;
}

/**
 * Cadet-specific progress for a given TrainingTaskTemplate.
 * This is where we track status, reflection, and approvals.
 */
export interface TrainingTaskProgress {
  id: string;
  cadetId: string;
  templateId: string; // reference to TrainingTaskTemplate.id

  status: TaskStatus; // PENDING / SUBMITTED / VERIFIED / APPROVED
  lastStatusChangeAt?: string;

  // Cadet self-reflection (what they learned)
  reflectionText?: string;

  // Who verified / approved onboard
  verifiedById?: string; // officer ID (backend user)
  verifiedByName?: string;
  verifiedAt?: string;

  approvedByMasterId?: string;
  approvedByMasterName?: string;
  approvedAt?: string;

  evidence?: TaskEvidence[];

  createdAt?: string;
  updatedAt?: string;
}

// ----------------------
// Diary / Watchkeeping Models
// ----------------------

/**
 * Base fields shared by diary and watchkeeping entries.
 */
export interface DiaryEntryBase {
  id: string;
  cadetId: string;
  deploymentId?: string; // which contract this entry belongs to
  date: string; // ISO date
  entryType: DiaryEntryType; // DAILY / BRIDGE_WATCH / ENGINE_WATCH

  createdAt?: string;
  updatedAt?: string;
}

/**
 * Free-text daily diary entry (non-watch-specific).
 */
export interface DailyDiaryEntry extends DiaryEntryBase {
  entryType: "DAILY";
  summary: string; // e.g. "Assisted 3/O with chart corrections..."
}

/**
 * Bridge watchkeeping entry (Deck).
 */
export interface BridgeWatchEntry extends DiaryEntryBase {
  entryType: "BRIDGE_WATCH";
  timeStart: string; // ISO time or full ISO datetime
  timeEnd: string;

  positionLat?: string; // simple string for now, e.g. "01°16'N"
  positionLon?: string; // e.g. "103°54'E"

  courseOverGroundDeg?: number;
  speedOverGroundKnots?: number;

  weatherSummary?: string;
  role?: string; // e.g. "On wheel", "Assisting OOW"

  steeringMinutes?: number; // time actually on wheel
}

/**
 * Engine room watchkeeping entry (Engine / ETO).
 */
export interface EngineWatchEntry extends DiaryEntryBase {
  entryType: "ENGINE_WATCH";
  timeStart: string;
  timeEnd: string;

  machineryMonitoredSummary?: string; // e.g. "ME lube oil system, DG #2, Boiler"
  remarks?: string;
}

/**
 * Discriminated union of all diary/watch entries.
 * Use entry.entryType to narrow it in code.
 */
export type AnyDiaryEntry =
  | DailyDiaryEntry
  | BridgeWatchEntry
  | EngineWatchEntry;
