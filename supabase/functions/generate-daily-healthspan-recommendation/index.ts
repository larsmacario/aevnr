import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAiConsent } from "../_shared/aiConsent.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const url = Deno.env.get("SUPABASE_URL") ?? "";
const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const model = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

const tool = { name: "recommend_daily_healthspan_action", description: "Gibt genau eine sichere, nicht-medizinische Tagesaktion zurück.", input_schema: { type: "object", properties: {
  action: { type: "string", enum: ["strength", "reduce", "endurance", "recover", "nutrition", "maintain"] },
  title: { type: "string" }, detail: { type: "string" },
  trainingAlternative: { type: "string", enum: ["reduce_volume", "zone_2"] },
}, required: ["action", "title", "detail"] } };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Nur POST erlaubt." }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const blocked = await requireAiConsent(req, corsHeaders, url, anon, service, "Für die KI-Tagesempfehlung ist deine Einwilligung zur KI-Nutzung (Anthropic) erforderlich.");
  if (blocked) return blocked;
  try {
    const body = await req.json();
    const checkin = body?.checkin && typeof body.checkin === "object" ? body.checkin : null;
    const week = body?.week && typeof body.week === "object" ? body.week : {};
    const history = Array.isArray(body?.history) ? body.history.slice(0, 30) : [];
    const activePlan = body?.activePlan && typeof body.activePlan === "object" ? body.activePlan : null;
    if (!checkin) throw new Error("Check-in fehlt");
    const readinessLow = Number(checkin.sleepHours) < 6 || Number(checkin.energyLevel) <= 4 || Number(checkin.stressLevel) >= 8;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "KI nicht konfiguriert." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const prompt = `Erstelle genau eine verständliche Tagesaktion für eine Healthspan-App. Keine Diagnose, Therapie, Risikobewertung oder medizinische Aussage. Check-in: ${JSON.stringify(checkin)}. Wochenstand: ${JSON.stringify(week)}. Trainingshistorie der letzten 30 Tage: ${JSON.stringify(history)}. Aktiver Plan: ${JSON.stringify(activePlan)}. Erlaubte Aktionen: strength (nächsten Plan-Tag trainieren), reduce (Express Tracking öffnen und Belastung selbst reduzieren), endurance (Zone-2-Timer), recover (Erholung priorisieren), nutrition (eine konkrete nächste Protein-/Wasser-Gewohnheit), maintain (Kurs halten). Titel maximal 55 Zeichen, Detail maximal 180 Zeichen und konkret. ${readinessLow ? "WICHTIG: Niedrige Belastbarkeit: action darf nur reduce, endurance oder recover sein; niemals strength." : ""}`;
    const response = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model, max_tokens: 450, tools: [tool], tool_choice: { type: "tool", name: "recommend_daily_healthspan_action" }, messages: [{ role: "user", content: prompt }] }) });
    if (!response.ok) throw new Error("KI-Anbieter nicht erreichbar");
    const data = await response.json();
    const result = data.content?.find((entry: { type?: string }) => entry.type === "tool_use")?.input;
    const actions = ["strength", "reduce", "endurance", "recover", "nutrition", "maintain"];
    if (!result || !actions.includes(result.action) || typeof result.title !== "string" || typeof result.detail !== "string") throw new Error("Ungültige KI-Antwort");
    if (readinessLow && result.action === "strength") throw new Error("KI-Antwort überschreitet die Belastungsgrenze");
    return new Response(JSON.stringify({ action: result.action, title: result.title.slice(0, 55), detail: result.detail.slice(0, 180), trainingAlternative: result.trainingAlternative === "reduce_volume" || result.trainingAlternative === "zone_2" ? result.trainingAlternative : undefined }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "KI-Tagesempfehlung fehlgeschlagen" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
});
