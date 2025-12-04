// src/db/sqlite.ts
// Central place to open the SQLite database and create all tables.
//
// We use expo-sqlite's classic API and wrap table creation in a Promise
// so the rest of the app can just call initDatabase() once at startup.

import * as SQLite from "expo-sqlite";

export type AppDatabase = SQLite.WebSQLDatabase;

let dbInstance: AppDatabase | null = null;

/**
 * Get (or lazily open) the SQLite database instance.
 * We use a single file for the whole app.
 */
export function getDatabase(): AppDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabase("cadet_trb.db");
  }
  return dbInstance;
}

/**
 * Initialize all tables if they do not exist.
 * This is safe to call multiple times; CREATE TABLE IF NOT EXISTS is idempotent.
 */
export function initDatabase(): Promise<void> {
  const db = getDatabase();

  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        // 1) Cadet profile
        tx.executeSql(`
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
        `);

        // 2) Vessel
        tx.executeSql(`
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
        `);

        // 3) Sea service deployment (contracts)
        tx.executeSql(`
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
        `);

        // 4) Training task template (static TRB tasks)
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS training_task_template (
            id TEXT PRIMARY KEY NOT NULL,
            section_code TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            stream TEXT NOT NULL,
            is_mandatory INTEGER NOT NULL
          );
        `);

        // 5) Training task progress (cadet-specific)
        tx.executeSql(`
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
        `);

        // 6) Task evidence (files per progress)
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS task_evidence (
            id TEXT PRIMARY KEY NOT NULL,
            task_progress_id TEXT NOT NULL,
            local_uri TEXT NOT NULL,
            mime_type TEXT,
            file_size_bytes INTEGER,
            created_at TEXT
          );
        `);

        // 7) Diary / watchkeeping entries (all types)
        tx.executeSql(`
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
      },
      (error) => {
        console.error("Error creating tables", error);
        reject(error);
      },
      () => {
        console.log("SQLite tables are ready");
        resolve();
      }
    );
  });
}
