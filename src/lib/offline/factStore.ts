import type { DailyFact } from "../facts";
import { localDb } from "./localDb";
import type { AppLanguage } from "../language";

export type CachedFact = DailyFact & { assignmentId: string };

function rowId(userId: string, assignmentId: string) {
  return `${userId}:${assignmentId}`;
}

export async function getCachedFactForDate(userId: string, language: AppLanguage, localDate: string): Promise<CachedFact | null> {
  const row = await localDb.facts.where("[userId+language+localDate]").equals([userId, language, localDate]).first();
  return row ? { ...row.fact, assignmentId: row.assignmentId } : null;
}

export async function getCachedFacts(userId: string, language: AppLanguage): Promise<CachedFact[]> {
  const rows = await localDb.facts.where("[userId+language]").equals([userId, language]).toArray();
  return rows.sort((a, b) => b.localDate.localeCompare(a.localDate)).map((row) => ({ ...row.fact, assignmentId: row.assignmentId }));
}

export async function cacheFact(userId: string, fact: CachedFact, pendingSavedSync = false): Promise<void> {
  await localDb.facts.put({
    id: rowId(userId, fact.assignmentId), userId, assignmentId: fact.assignmentId,
    localDate: fact.localDate, language: fact.language, fact: { ...fact }, pendingSavedSync, updatedAt: Date.now(),
  });
}

export async function cacheFacts(userId: string, facts: CachedFact[]): Promise<void> {
  await Promise.all(facts.map((fact) => cacheFact(userId, fact)));
}

export async function setCachedFactSaved(userId: string, assignmentId: string, saved: boolean, pendingSavedSync: boolean): Promise<void> {
  const id = rowId(userId, assignmentId);
  const row = await localDb.facts.get(id);
  if (!row) return;
  await localDb.facts.put({ ...row, fact: { ...row.fact, saved }, pendingSavedSync, updatedAt: Date.now() });
}
