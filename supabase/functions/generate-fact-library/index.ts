import { FACT_TOPICS, hasCronSecret, pubmedStudies, serviceClient, type FactTopic } from "../_shared/facts.ts";

const headers = { "Content-Type": "application/json" };
const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const appActions = ["checkin", "breathing", "express", "protein", "water", "ai_plan"] as const;
type AppAction = (typeof appActions)[number];
type Study = Awaited<ReturnType<typeof pubmedStudies>>[number];

const allowedActions: Record<FactTopic, AppAction[]> = {
  gut_health: [], nutrition: ["protein", "water"], sleep: ["checkin"], movement: ["express"],
  cardiovascular: ["express"], mental_health: ["breathing", "checkin"], metabolism: [], healthy_aging: ["ai_plan"],
};

function hash(value: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then((buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join(""));
}

async function askForFact(apiKey: string, topic: FactTopic, studies: Study[], existing?: { title: string; body: string }) {
  const tool = { name: "create_cited_health_fact", input_schema: { type: "object", properties: {
    title: { type: "string" }, body: { type: "string" }, actionTitle: { type: "string" }, actionBody: { type: "string" },
    appAction: { type: ["string", "null"], enum: [...appActions, null] }, pmids: { type: "array", items: { type: "string" } },
  }, required: ["title", "body", "actionTitle", "actionBody", "appAction", "pmids"] } };
  const existingText = existing ? `Der Fakt existiert bereits. Behalte ihn wortgleich bei: Titel „${existing.title}", Text „${existing.body}".` : "Erstelle einen neuen Fakt.";
  const prompt = `${existingText} Schreibe einen kurzen deutschsprachigen Healthspan-Fakt zum Thema ${topic} und eine kleine, alltagstaugliche Handlung „Für dich ausprobieren“. Verwende ausschließlich die folgenden PubMed-Studien. Sowohl Fakt als auch Handlung müssen durch mindestens eine der angegebenen PMIDs gestützt sein. Keine Diagnose, Therapie, Heilversprechen, Dosierung oder absolute Kausalbehauptung. Der Fakt: Titel 8–100 Zeichen, Text 40–700 Zeichen. Handlung: Titel 4–100 Zeichen, Text 20–500 Zeichen. appAction darf nur ${JSON.stringify(allowedActions[topic])} oder null sein. Quellen: ${JSON.stringify(studies)}`;
  const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 900, tools: [tool], tool_choice: { type: "tool", name: "create_cited_health_fact" }, messages: [{ role: "user", content: prompt }] }) });
  if (!response.ok) throw new Error("KI-Anbieter nicht erreichbar");
  const result = (await response.json()).content?.find((entry: { type?: string }) => entry.type === "tool_use")?.input;
  const pmids = Array.isArray(result?.pmids) ? result.pmids.filter((pmid: unknown): pmid is string => typeof pmid === "string" && studies.some((study) => study.pmid === pmid)) : [];
  const appAction = typeof result?.appAction === "string" && allowedActions[topic].includes(result.appAction as AppAction) ? result.appAction as AppAction : null;
  if (typeof result?.title !== "string" || typeof result?.body !== "string" || typeof result?.actionTitle !== "string" || typeof result?.actionBody !== "string" || pmids.length === 0 || result.title.length > 120 || result.body.length < 40 || result.body.length > 1200 || result.actionTitle.length < 4 || result.actionTitle.length > 100 || result.actionBody.length < 20 || result.actionBody.length > 500) throw new Error("Ungültiger oder unbelegter Faktenentwurf");
  return { title: result.title.trim(), body: result.body.trim(), actionTitle: result.actionTitle.trim(), actionBody: result.actionBody.trim(), appAction, pmids };
}

Deno.serve(async (req) => {
  if (req.method !== "POST" || !hasCronSecret(req)) return new Response(JSON.stringify({ error: "Nicht autorisiert." }), { status: 401, headers });
  try {
    const body = await req.json().catch(() => ({}));
    const requested = Array.isArray(body?.topics) ? body.topics.filter((topic: unknown): topic is FactTopic => typeof topic === "string" && FACT_TOPICS.includes(topic as FactTopic)) : FACT_TOPICS;
    const limit = Math.min(3, Math.max(1, Number(body?.limitPerTopic) || 1));
    const db = serviceClient();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) throw new Error("KI nicht konfiguriert.");
    let created = 0;
    let enriched = 0;
    for (const topic of requested) {
      const { data: missingActions, error: missingError } = await db.from("health_facts").select("id, title, body, health_fact_sources(pmid, title, authors, journal, publication_year, publication_type)").eq("topic", topic).eq("status", "published").is("action_title", null).limit(limit);
      if (missingError) throw missingError;
      for (const existing of missingActions ?? []) {
        const studies = (existing.health_fact_sources ?? []).map((source: Record<string, unknown>) => ({ pmid: String(source.pmid), title: String(source.title), authors: String(source.authors), journal: String(source.journal), year: Number(source.publication_year), publicationType: String(source.publication_type ?? ""), abstract: "" }));
        if (!studies.length) continue;
        const draft = await askForFact(apiKey, topic, studies, { title: existing.title, body: existing.body });
        const { error } = await db.from("health_facts").update({ action_title: draft.actionTitle, action_body: draft.actionBody, app_action: draft.appAction }).eq("id", existing.id);
        if (error) throw error;
        enriched += 1;
      }
      const { count, error: countError } = await db.from("health_facts").select("id", { count: "exact", head: true }).eq("topic", topic).eq("status", "published");
      if (countError) throw countError;
      if ((count ?? 0) >= 14) continue;
      for (let i = 0; i < limit; i += 1) {
        const studies = await pubmedStudies(topic);
        const draft = await askForFact(apiKey, topic, studies);
        const contentHash = await hash(`${topic}|${draft.title}|${draft.body}`);
        const { data: fact, error: factError } = await db.from("health_facts").insert({ topic, title: draft.title, body: draft.body, action_title: draft.actionTitle, action_body: draft.actionBody, app_action: draft.appAction, content_hash: contentHash, status: "published", published_at: new Date().toISOString() }).select("id").single();
        if (factError?.code === "23505") continue;
        if (factError || !fact) throw factError ?? new Error("Fakt konnte nicht gespeichert werden");
        const sources = studies.filter((study) => draft.pmids.includes(study.pmid)).map((study) => ({ fact_id: fact.id, pmid: study.pmid, title: study.title, authors: study.authors, journal: study.journal, publication_year: study.year, publication_type: study.publicationType || null, pubmed_url: `https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/` }));
        const { error: sourceError } = await db.from("health_fact_sources").insert(sources);
        if (sourceError) throw sourceError;
        created += 1;
      }
    }
    return new Response(JSON.stringify({ created, enriched }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Bibliothek konnte nicht ergänzt werden" }), { status: 502, headers });
  }
});
