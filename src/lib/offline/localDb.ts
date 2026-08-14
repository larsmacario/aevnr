import Dexie, { type Table } from "dexie";
import type { CachedDailyCheckinRow, CachedExercisesRow, CachedFactRow, CachedPlanRow, MetaRow, SyncQueueEntry } from "./types";

class RephiveLocalDb extends Dexie {
  plans!: Table<CachedPlanRow, string>;
  exercises!: Table<CachedExercisesRow, string>;
  syncQueue!: Table<SyncQueueEntry, string>;
  meta!: Table<MetaRow, string>;
  dailyCheckins!: Table<CachedDailyCheckinRow, string>;
  facts!: Table<CachedFactRow, string>;

  constructor() {
    super("rephive_local");
    this.version(1).stores({
      plans: "planId, userId, updatedAt",
      exercises: "userId, updatedAt",
      syncQueue: "id, userId, createdAt",
      meta: "userId",
    });
    this.version(2).stores({
      plans: "planId, userId, updatedAt",
      exercises: "userId, updatedAt",
      syncQueue: "id, userId, createdAt",
      meta: "userId",
      dailyCheckins: "id, userId, [userId+checkinDate], updatedAt",
    });
    this.version(3).stores({
      plans: "planId, userId, updatedAt",
      exercises: "userId, updatedAt",
      syncQueue: "id, userId, createdAt",
      meta: "userId",
      dailyCheckins: "id, userId, [userId+checkinDate], updatedAt",
      facts: "id, userId, assignmentId, [userId+localDate], updatedAt",
    });
  }
}

export const localDb = new RephiveLocalDb();

export async function clearLocalDataForUser(userId: string): Promise<void> {
  await localDb.transaction("rw", [localDb.plans, localDb.exercises, localDb.syncQueue, localDb.meta, localDb.dailyCheckins, localDb.facts], async () => {
    await localDb.plans.where("userId").equals(userId).delete();
    await localDb.exercises.where("userId").equals(userId).delete();
    await localDb.syncQueue.where("userId").equals(userId).delete();
    await localDb.meta.where("userId").equals(userId).delete();
    await localDb.dailyCheckins.where("userId").equals(userId).delete();
    await localDb.facts.where("userId").equals(userId).delete();
  });
}

export async function clearAllLocalData(): Promise<void> {
  await localDb.transaction("rw", [localDb.plans, localDb.exercises, localDb.syncQueue, localDb.meta, localDb.dailyCheckins, localDb.facts], async () => {
    await localDb.plans.clear();
    await localDb.exercises.clear();
    await localDb.syncQueue.clear();
    await localDb.meta.clear();
    await localDb.dailyCheckins.clear();
    await localDb.facts.clear();
  });
}
