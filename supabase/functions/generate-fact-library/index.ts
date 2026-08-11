import { FACT_TOPICS, hasCronSecret, pubmedStudies, serviceClient, type FactTopic } from "../_shared/facts.ts";

const headers = { "Content-Type": "application/json" };
const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

function hash(value: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then((buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join(""));
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
    for (const topic of requested) {
      const { count, error: countError } = await db.from("health_facts").select("id", { count: "exact", head: true }).eq("topic", topic).eq("status", "published");
      if (countError) throw countError;
      if ((count ?? 0) >= 14) continue;
      for (let i = 0; i < limit; i += 1) {
        const studies = await pubmedStudies(topic);
        const tool = { name: "create_cited_health_fact", input_schema: { type: "object", properties: { title: { type: "string" }, body: { type: "string" }, pmids: { type: "array", items: { type: "string" } } }, required: ["title", "body", "pmids"] } };
        const prompt = `Schreibe genau einen kurzen, deutschsprachigen Healthspan-Fakt zum Thema ${topic}. Verwende nur die folgenden PubMed-Studien. Keine Diagnose, Therapie, Heilversprechen oder absolute Kausalbehauptung. Formuliere vorsichtig und alltagstauglich. Titel maximal 100 Zeichen, Text 80-700 Zeichen. Nenne in pmids mindestens eine und ausschließlich PMID aus den Quellen. Quellen: ${JSON.stringify(studies)}`;
        const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 700, tools: [tool], tool_choice: { type: "tool", name: "create_cited_health_fact" }, messages: [{ role: "user", content: prompt }] }) });
        if (!response.ok) throw new Error("KI-Anbieter nicht erreichbar");
        const result = (await response.json()).content?.find((entry: { type?: string }) => entry.type === "tool_use")?.input;
        const pmids = Array.isArray(result?.pmids) ? result.pmids.filter((pmid: unknown): pmid is string => typeof pmid === "string" && studies.some((study) => study.pmid === pmid)) : [];
        if (typeof result?.title !== "string" || typeof result?.body !== "string" || pmids.length === 0 || result.title.length > 120 || result.body.length < 40 || result.body.length > 1200) throw new Error("Ungültiger oder unbelegter Faktenentwurf");
        const contentHash = await hash(`${topic}|${result.title.trim()}|${result.body.trim()}`);
        const { data: fact, error: factError } = await db.from("health_facts").insert({ topic, title: result.title.trim(), body: result.body.trim(), content_hash: contentHash, status: "published", published_at: new Date().toISOString() }).select("id").single();
        if (factError?.code === "23505") continue;
        if (factError || !fact) throw factError ?? new Error("Fakt konnte nicht gespeichert werden");
        const sources = studies.filter((study) => pmids.includes(study.pmid)).map((study) => ({ fact_id: fact.id, pmid: study.pmid, title: study.title, authors: study.authors, journal: study.journal, publication_year: study.year, publication_type: study.publicationType || null, pubmed_url: `https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/` }));
        const { error: sourceError } = await db.from("health_fact_sources").insert(sources);
        if (sourceError) throw sourceError;
        created += 1;
      }
    }
    return new Response(JSON.stringify({ created }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Bibliothek konnte nicht ergänzt werden" }), { status: 502, headers });
  }
});
