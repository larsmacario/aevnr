import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

export const FACT_TOPICS = ["gut_health", "nutrition", "sleep", "movement", "cardiovascular", "mental_health", "metabolism", "healthy_aging"] as const;
export type FactTopic = (typeof FACT_TOPICS)[number];

const topicQueries: Record<FactTopic, string> = {
  gut_health: "(gut microbiome OR gastrointestinal health) AND (systematic review[Publication Type] OR meta-analysis[Publication Type])",
  nutrition: "nutrition dietary pattern health AND (systematic review[Publication Type] OR meta-analysis[Publication Type])",
  sleep: "sleep health adults AND (systematic review[Publication Type] OR meta-analysis[Publication Type])",
  movement: "physical activity health adults AND (systematic review[Publication Type] OR meta-analysis[Publication Type])",
  cardiovascular: "cardiovascular health prevention AND (systematic review[Publication Type] OR meta-analysis[Publication Type])",
  mental_health: "mental health lifestyle adults AND (systematic review[Publication Type] OR meta-analysis[Publication Type])",
  metabolism: "metabolic health lifestyle AND (systematic review[Publication Type] OR meta-analysis[Publication Type])",
  healthy_aging: "healthy aging longevity AND (systematic review[Publication Type] OR meta-analysis[Publication Type])",
};

export function normalizeTopics(raw: unknown): FactTopic[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((value): value is FactTopic => typeof value === "string" && FACT_TOPICS.includes(value as FactTopic)))].slice(0, 3);
}

export function localParts(timeZone: string, date = new Date()): { date: string; hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const part = (name: string) => parts.find((entry) => entry.type === name)?.value ?? "00";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, hour: Number(part("hour")), minute: Number(part("minute")) };
}

export function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}

export function hasCronSecret(req: Request): boolean {
  const expected = Deno.env.get("FACTS_CRON_SECRET");
  return Boolean(expected && req.headers.get("x-facts-cron-secret") === expected);
}

export async function selectUnseenFact(userId: string, topics: FactTopic[]) {
  const db = serviceClient();
  const { data: assigned, error: assignedError } = await db.from("user_daily_facts").select("fact_id").eq("user_id", userId);
  if (assignedError) throw assignedError;
  const seen = new Set((assigned ?? []).map((entry) => entry.fact_id));
  const { data: candidates, error } = await db.from("health_facts").select("id, topic").eq("status", "published").in("topic", topics).order("published_at", { ascending: true }).limit(250);
  if (error) throw error;
  const unseen = (candidates ?? []).filter((entry) => !seen.has(entry.id));
  if (unseen.length === 0) return null;
  return unseen[Math.floor(Math.random() * unseen.length)];
}

export async function pubmedStudies(topic: FactTopic): Promise<Array<{ pmid: string; title: string; authors: string; journal: string; year: number; publicationType: string; abstract: string }>> {
  const params = new URLSearchParams({ db: "pubmed", term: topicQueries[topic], retmode: "json", retmax: "5", sort: "relevance" });
  const search = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?${params}`);
  if (!search.ok) throw new Error("PubMed-Suche nicht erreichbar");
  const ids = ((await search.json()) as { esearchresult?: { idlist?: string[] } }).esearchresult?.idlist?.filter((id) => /^\d+$/.test(id)).slice(0, 3) ?? [];
  if (ids.length === 0) throw new Error("Keine PubMed-Studien gefunden");
  const summary = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`);
  if (!summary.ok) throw new Error("PubMed-Metadaten nicht erreichbar");
  const records = (await summary.json() as { result?: Record<string, Record<string, unknown>> }).result ?? {};
  const abstracts = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=${ids.join(",")}`);
  const xml = abstracts.ok ? await abstracts.text() : "";
  return ids.map((pmid) => {
    const record = records[pmid] ?? {};
    const article = xml.match(new RegExp(`<PubmedArticle>[^]*?<PMID[^>]*>${pmid}</PMID>([^]*?)</PubmedArticle>`))?.[1] ?? "";
    const abstract = [...article.matchAll(/<AbstractText[^>]*>([^<]*)<\/AbstractText>/g)].map((match) => match[1]).join(" ").replace(/\s+/g, " ").trim();
    const authors = Array.isArray(record.authors) ? (record.authors as Array<{ name?: string }>).map((author) => author.name).filter(Boolean).slice(0, 4).join(", ") : "PubMed";
    const pubdate = typeof record.pubdate === "string" ? record.pubdate : "";
    return { pmid, title: String(record.title ?? "PubMed-Studie"), authors: authors || "PubMed", journal: String(record.fulljournalname ?? record.source ?? "PubMed"), year: Number(pubdate.match(/\b(19|20)\d{2}\b/)?.[0] ?? new Date().getFullYear()), publicationType: Array.isArray(record.pubtype) ? (record.pubtype as string[]).join(", ") : "", abstract };
  });
}
