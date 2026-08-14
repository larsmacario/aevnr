import type { DailyFact } from "../facts";
import { localDb } from "./localDb";

export type CachedFact = DailyFact & { assignmentId: string };

function rowId(userId: string, assignmentId: string) {
  return `${userId}:${assignmentId}`;
}

export async function getCachedFactForDate(userId: string, localDate: string): Promise<CachedFact | null> {
  const row = await localDb.facts.where("[userId+localDate]").equals([userId, localDate]).first();
  return row ? { ...row.fact, assignmentId: row.assignmentId } : null;
}

export async function getCachedFacts(userId: string): Promise<CachedFact[]> {
  const rows = await localDb.facts.where("userId").equals(userId).toArray();
  return rows.sort((a, b) => b.localDate.localeCompare(a.localDate)).map((row) => ({ ...row.fact, assignmentId: row.assignmentId }));
}

export async function cacheFact(userId: string, fact: CachedFact, pendingSavedSync = false): Promise<void> {
  await localDb.facts.put({
    id: rowId(userId, fact.assignmentId), userId, assignmentId: fact.assignmentId,
    localDate: fact.localDate, fact: { ...fact }, pendingSavedSync, updatedAt: Date.now(),
  });
}

export async function setCachedFactSaved(userId: string, assignmentId: string, saved: boolean, pendingSavedSync: boolean): Promise<void> {
  const id = rowId(userId, assignmentId);
  const row = await localDb.facts.get(id);
  if (!row) return;
  await localDb.facts.put({ ...row, fact: { ...row.fact, saved }, pendingSavedSync, updatedAt: Date.now() });
}
