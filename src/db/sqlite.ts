// src/db/sqlite.ts
// Single place to open the SQLite database and create all tables.
// Uses expo-sqlite (new API) and exposes small helpers: initDatabase, run, getAll.

import * as SQLite from "expo-sqlite";
import type { SQLiteDatabase } from "expo-sqlite";

let dbInstance: SQLiteDatabase | null = null;

/**
 * Get (or lazily open) the SQLite database instance.
 * We use a single file: cadet_trb.db
 */
export function getDatabase(): SQLiteDatabase {
  if (!dbInstance) {
    // This creates/opens a persistent on-device database file.
    dbInstance = SQLite.openDatabaseSync("cadet_trb.db");
  }
  return dbInstance;
}

/**
 * Initialize all tables if they do not exist.
 * Uses execAsync with multiple CREATE TABLE statements.
 * This is safe to call multiple times.
 */
export async function initDatabase(): Promise<void> {
  const db = getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS cadet_profile (
      id TEXT PRIMARY KEY NOT NULL,
      full_name TEXT NOT NULL,
      date_of_birth TEXT,
      stream TEXT NOT NULL,
      discharge_book_no TEXT,
      passport_no TEXT,
      academy_name TEXT,
      academy_id TEXT,
      next_of_kin_name TEXT,
      next_of_kin_contact TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS vessel (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      imo_number TEXT,
      call_sign TEXT,
      flag_state TEXT,
      vessel_type TEXT,
      gross_tonnage REAL,
      length_overall_m REAL,
      design_draft_m REAL,
      main_engine_model TEXT,
      main_engine_power_kw REAL,
      generator_details TEXT,
      boiler_type TEXT,
      nav_equipment_summary TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sea_service_deployment (
      id TEXT PRIMARY KEY NOT NULL,
      cadet_id TEXT NOT NULL,
      vessel_id TEXT NOT NULL,
      role TEXT NOT NULL,
      sign_on_date TEXT NOT NULL,
      sign_off_date TEXT,
      sign_on_port TEXT,
      sign_off_port TEXT,
      total_days_onboard INTEGER,
      total_sea_days INTEGER,
      total_port_days INTEGER,
      voyage_summary TEXT,
      master_name TEXT,
      master_id TEXT,
      chief_engineer_name TEXT,
      chief_engineer_id TEXT,
      dsto_name TEXT,
      dsto_id TEXT,
      testimonial_text TEXT,
      testimonial_signed_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS training_task_template (
      id TEXT PRIMARY KEY NOT NULL,
      section_code TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      stream TEXT NOT NULL,
      is_mandatory INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS training_task_progress (
      id TEXT PRIMARY KEY NOT NULL,
      cadet_id TEXT NOT NULL,
      template_id TEXT NOT NULL,
      status TEXT NOT NULL,
      last_status_change_at TEXT,
      reflection_text TEXT,
      verified_by_id TEXT,
      verified_by_name TEXT,
      verified_at TEXT,
      approved_by_master_id TEXT,
      approved_by_master_name TEXT,
      approved_at TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS task_evidence (
      id TEXT PRIMARY KEY NOT NULL,
      task_progress_id TEXT NOT NULL,
      local_uri TEXT NOT NULL,
      mime_type TEXT,
      file_size_bytes INTEGER,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS diary_entry (
      id TEXT PRIMARY KEY NOT NULL,
      cadet_id TEXT NOT NULL,
      deployment_id TEXT,
      date TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      time_start TEXT,
      time_end TEXT,
      summary TEXT,
      position_lat TEXT,
      position_lon TEXT,
      course_over_ground_deg REAL,
      speed_over_ground_knots REAL,
      weather_summary TEXT,
      role TEXT,
      steering_minutes INTEGER,
      machinery_monitored TEXT,
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  console.log("SQLite tables are ready (cadet_trb.db)");
}

/**
 * Run a non-SELECT statement (INSERT/UPDATE/DELETE).
 */
export async function run(sql: string, params: any[] = []): Promise<void> {
  const db = getDatabase();
  await db.runAsync(sql, params);
}

/**
 * Run a SELECT that returns multiple rows.
 */
export async function getAll<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<T>(sql, params);
  return rows;
}

/**
 * Run a SELECT that returns a single row (or undefined).
 */
export async function getFirstRow<T = any>(
  sql: string,
  params: any[] = []
): Promise<T | undefined> {
  const db = getDatabase();
  const row = await db.getFirstAsync<T>(sql, params);
  return row ?? undefined;
}
