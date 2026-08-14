import type { LibraryExercise, LibraryPlan } from "../../data";
import type { DailyFact } from "../facts";

export type SyncOpType =
  | "UPSERT_DAILY_CHECKIN"
  | "SAVE_SESSION"
  | "ADVANCE_PLAN"
  | "CREATE_PLAN"
  | "UPDATE_PLAN"
  | "UPDATE_PLAN_WEEKDAYS"
  | "DELETE_PLAN"
  | "SET_ACTIVE_PLAN"
  | "CREATE_EXERCISE"
  | "UPDATE_EXERCISE"
  | "DELETE_EXERCISE"
  | "TOGGLE_FACT_SAVED";

/** Opaque payload — shape depends on `op`; parsed in syncEngine. */
export type SyncPayload = Record<string, unknown>;

export interface SyncQueueEntry {
  id: string;
  userId: string;
  op: SyncOpType;
  payload: SyncPayload;
  createdAt: number;
  retries: number;
  lastError?: string;
}

export interface CachedPlanRow {
  planId: string;
  userId: string;
  plan: LibraryPlan;
  updatedAt: number;
}

export interface CachedExercisesRow {
  userId: string;
  items: LibraryExercise[];
  updatedAt: number;
}

export interface MetaRow {
  userId: string;
  lastFullSyncAt: number;
}

export interface CachedDailyCheckinRow {
  id: string;
  userId: string;
  checkinDate: string;
  sleepHours: number;
  sleepQuality: number;
  stressLevel: number;
  energyLevel: number;
  note?: string;
  updatedAt: number;
}

export interface CachedFactRow {
  id: string;
  userId: string;
  assignmentId: string;
  localDate: string;
  fact: DailyFact;
  pendingSavedSync: boolean;
  updatedAt: number;
}
