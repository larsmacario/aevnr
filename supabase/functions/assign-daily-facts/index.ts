import { hasCronSecret, localParts, normalizeLanguage, normalizeTopics, selectUnseenFact, serviceClient } from "../_shared/facts.ts";

const headers = { "Content-Type": "application/json" };

Deno.serve(async (req) => {
  if (req.method !== "POST" || !hasCronSecret(req)) return new Response(JSON.stringify({ error: "Nicht autorisiert." }), { status: 401, headers });
  try {
    const db = serviceClient();
    const { data: profiles, error } = await db.from("profiles").select("id, preferences").limit(5000);
    if (error) throw error;
    let assigned = 0;
    for (const profile of profiles ?? []) {
      const preferences = profile.preferences as Record<string, unknown> | null;
      const topics = normalizeTopics(preferences?.factTopics);
      const language = normalizeLanguage(preferences?.language);
      const timezone = typeof preferences?.factTimezone === "string" ? preferences.factTimezone : "Europe/Berlin";
      let local;
      try { local = localParts(timezone); } catch { continue; }
      if (local.hour !== 6 || local.minute > 1 || topics.length === 0) continue;
      const { data: existing, error: existingError } = await db.from("user_daily_facts").select("id").eq("user_id", profile.id).eq("local_date", local.date).eq("language", language).maybeSingle();
      if (existingError) throw existingError;
      if (existing) continue;
      const fact = await selectUnseenFact(profile.id, topics, language);
      if (!fact) continue;
      const { error: insertError } = await db.from("user_daily_facts").insert({ user_id: profile.id, fact_id: fact.id, local_date: local.date, language, timezone });
      if (insertError && insertError.code !== "23505") throw insertError;
      assigned += 1;
    }
    return new Response(JSON.stringify({ assigned }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Zuweisung fehlgeschlagen" }), { status: 502, headers });
  }
});
