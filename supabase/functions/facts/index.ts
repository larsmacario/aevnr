import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { localParts, normalizeTopics, selectUnseenFact, serviceClient } from "../_shared/facts.ts";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Content-Type": "application/json" };

async function currentUser(req: Request) {
  const token = req.headers.get("Authorization");
  if (!token) return null;
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: token } } });
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Nur POST erlaubt." }), { status: 405, headers });
  const user = await currentUser(req);
  if (!user) return new Response(JSON.stringify({ error: "Authentifizierung erforderlich." }), { status: 401, headers });
  try {
    const body = await req.json().catch(() => ({}));
    const db = serviceClient();
    const { data: profile, error: profileError } = await db.from("profiles").select("preferences").eq("id", user.id).single();
    if (profileError) throw profileError;
    const preferences = profile.preferences as Record<string, unknown> | null;
    const topics = normalizeTopics(preferences?.factTopics);
    const requestedTimezone = typeof body?.timezone === "string" ? body.timezone : null;
    const timezone = requestedTimezone ?? (typeof preferences?.factTimezone === "string" ? preferences.factTimezone : "Europe/Berlin");
    const local = localParts(timezone);

    if (body?.action === "toggle_saved") {
      const assignmentId = typeof body?.assignmentId === "string" ? body.assignmentId : "";
      const saved = body?.saved === true;
      const { error } = await db.from("user_daily_facts").update({ saved_at: saved ? new Date().toISOString() : null }).eq("id", assignmentId).eq("user_id", user.id);
      if (error) throw error;
    }

    if (topics.length === 0) return new Response(JSON.stringify({ state: "needs_topics" }), { headers });
    if (body?.action !== "toggle_saved") {
      const { data: existing, error: existingError } = await db.from("user_daily_facts").select("id").eq("user_id", user.id).eq("local_date", local.date).maybeSingle();
      if (existingError) throw existingError;
      if (!existing) {
        const fact = await selectUnseenFact(user.id, topics);
        if (fact) {
          const { error: insertError } = await db.from("user_daily_facts").insert({ user_id: user.id, fact_id: fact.id, local_date: local.date, timezone });
          if (insertError && insertError.code !== "23505") throw insertError;
        }
      }
    }

    const query = db.from("user_daily_facts").select("id, local_date, saved_at, health_facts(id, topic, title, body, action_title, action_body, app_action, health_fact_sources(pmid, title, authors, journal, publication_year, publication_type, pubmed_url))").eq("user_id", user.id);
    const { data: assignment, error } = body?.view === "history"
      ? await query.order("local_date", { ascending: false }).limit(120)
      : body?.view === "saved"
        ? await query.not("saved_at", "is", null).order("saved_at", { ascending: false }).limit(20)
        : await query.eq("local_date", local.date).maybeSingle();
    if (error) throw error;
    const rows = Array.isArray(assignment) ? assignment : assignment ? [assignment] : [];
    const facts = rows.map((row: any) => ({
      assignmentId: row.id,
      localDate: row.local_date,
      saved: Boolean(row.saved_at),
      ...(row.health_facts ?? {}),
      action: row.health_facts?.action_title && row.health_facts?.action_body ? {
        title: row.health_facts.action_title,
        body: row.health_facts.action_body,
        appAction: row.health_facts.app_action,
      } : null,
      sources: (row.health_facts?.health_fact_sources ?? []).map((source: Record<string, unknown>) => ({
        pmid: source.pmid,
        title: source.title,
        authors: source.authors,
        journal: source.journal,
        publicationYear: source.publication_year,
        publicationType: source.publication_type,
        pubmedUrl: source.pubmed_url,
      })),
    }));
    return new Response(JSON.stringify({ state: facts.length > 0 ? "ready" : "preparing", fact: facts[0] ?? null, facts }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Fakten konnten nicht geladen werden." }), { status: 502, headers });
  }
});
