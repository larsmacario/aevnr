import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAiConsent } from "../_shared/aiConsent.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const url = Deno.env.get("SUPABASE_URL") ?? "";
const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

const tool = { name: "create_daily_session", description: "Erstellt eine sichere, nicht-medizinische Tages-Session.", input_schema: { type: "object", properties: {
  mode: { type: "string", enum: ["strength", "zone2"] }, rationale: { type: "string" },
  exercises: { type: "array", items: { type: "object", properties: { catalogExerciseId: { type: "string" }, sets: { type: "number" }, reps: { type: "number" } }, required: ["catalogExerciseId", "sets", "reps"] } },
  durationMin: { type: "number" }, device: { type: "string" },
}, required: ["mode", "rationale"] } };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Nur POST erlaubt." }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const blocked = await requireAiConsent(req, corsHeaders, url, anon, service, "Für die KI-Tages-Session ist deine Einwilligung zur KI-Nutzung (Anthropic) erforderlich.");
  if (blocked) return blocked;
  try {
    const body = await req.json();
    const language = body?.language === "en" ? "en" : "de";
    const readiness = body?.readiness === "reduce" ? "reduce" : "ready";
    const preferences = Array.isArray(body?.preferences) ? body.preferences.slice(0, 6) : [];
    const history = Array.isArray(body?.history) ? body.history.slice(0, 30) : [];
    const exercises = Array.isArray(body?.exercises) ? body.exercises.slice(0, 120) : [];
    const profileContext = body?.profileContext && typeof body.profileContext === "object" ? body.profileContext : {};
    const performanceBaseline = body?.performanceBaseline && typeof body.performanceBaseline === "object" ? body.performanceBaseline : null;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const system = language === "en"
      ? "You are an expert strength and endurance coach for an express training system. The user's active language setting is ENGLISH ('en'). You must output rationale and device strictly in English. Never use German."
      : "Du bist ein Kraft- und Ausdauer-Coach für ein Express-Trainingssystem. Die aktive Spracheinstellung des Nutzers ist DEUTSCH ('de'). Du musst rationale und device strikt auf Deutsch ausgeben.";
    const prompt = language === "de"
      ? `SPRACHVORGABE: DEUTSCH. Erstelle eine Tages-Session für Express Tracking. rationale und device ausschließlich auf Deutsch. Keine Diagnose, keine medizinischen Aussagen. Bereitschaft: ${readiness}. Wünsche: ${preferences.join(", ") || "keine"}. Profilkontext: ${JSON.stringify(profileContext)}. Freiwillige Startwerte (nur Leistungsorientierung, keine Diagnose): ${JSON.stringify(performanceBaseline)}. Bei reduce darf mode nur zone2 oder sehr leichtes strength sein (max. 2 Sätze je Übung). Berücksichtige diese Trainingshistorie der letzten 30 Tage: ${JSON.stringify(history)}. Verwende ausschließlich catalogExerciseId aus diesem Katalog: ${JSON.stringify(exercises)}. Bei fehlenden oder übersprungenen Startwerten konservativ planen. Bei zone2: durationMin 10-90 und optionale device. Bei strength: 2-6 Übungen, sets 1-4, reps 5-20.`
      : `LANGUAGE REQUIREMENT: ENGLISH. Create a daily Express Tracking session. Write rationale and device strictly in English. No diagnosis or medical claims. Readiness: ${readiness}. Preferences: ${preferences.join(", ") || "none"}. Profile context: ${JSON.stringify(profileContext)}. Optional baselines (performance guidance only, not diagnosis): ${JSON.stringify(performanceBaseline)}. When readiness is reduce, mode may only be zone2 or very light strength (max 2 sets per exercise). Consider this training history from the last 30 days: ${JSON.stringify(history)}. Use only catalogExerciseId values from this catalog: ${JSON.stringify(exercises)}. Plan conservatively when baselines are missing or skipped. For zone2: durationMin 10-90 and optional device. For strength: 2-6 exercises, sets 1-4, reps 5-20.`;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        system,
        tools: [tool],
        tool_choice: { type: "tool", name: "create_daily_session" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) throw new Error("KI-Anbieter nicht erreichbar");
    const data = await response.json();
    const result = data.content?.find((entry: { type?: string }) => entry.type === "tool_use")?.input;
    if (!result || (result.mode !== "strength" && result.mode !== "zone2")) throw new Error("Ungültige KI-Antwort");
    const validCatalogIds = new Set(exercises.map((exercise: { id?: unknown }) => exercise?.id).filter((id: unknown): id is string => typeof id === "string"));
    if (result.mode === "strength" && (!Array.isArray(result.exercises) || result.exercises.length < 1 || result.exercises.some((entry: { catalogExerciseId?: unknown; sets?: unknown; reps?: unknown }) => !validCatalogIds.has(String(entry.catalogExerciseId)) || !Number.isFinite(Number(entry.sets)) || !Number.isFinite(Number(entry.reps))))) throw new Error("KI-Antwort enthält ungültige Übungen");
    if (result.mode === "zone2" && (!Number.isFinite(Number(result.durationMin)) || Number(result.durationMin) < 10 || Number(result.durationMin) > 90)) throw new Error("KI-Antwort enthält keine gültige Dauer");
    if (readiness === "reduce" && result.mode === "strength" && Array.isArray(result.exercises) && result.exercises.some((entry: { sets?: unknown }) => Number(entry.sets) > 2)) throw new Error("KI-Antwort überschreitet die Belastungsgrenze");
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "KI-Session fehlgeschlagen" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
