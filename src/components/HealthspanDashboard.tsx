import { useState } from "react";
import { M } from "../theme";
import { MButton } from "./MButton";
import type { CoachRecommendation, HealthspanDomain } from "../lib/healthspan";

export function HealthspanDashboard({ domains, recommendation, generating = false, onCheckin, onOpenTimer, onOpenRecovery, onOpenExpress, onStartStrength }: { domains: HealthspanDomain[]; recommendation: CoachRecommendation; generating?: boolean; onCheckin: () => void; onOpenTimer: () => void; onOpenRecovery: (section?: "protein" | "water" | "checkin") => void; onOpenExpress: () => void; onStartStrength?: () => void }) {
  const [accepted, setAccepted] = useState(false);
  return <section style={{ marginTop: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}><div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700 }}>HEALTHSPAN</div><span style={{ color: M.mut, fontSize: 12 }}>Diese Woche</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
      {domains.map((domain) => <div key={domain.id} style={{ padding: 14, background: M.card, border: `1px solid ${M.line2}`, borderRadius: 16 }}><div style={{ color: M.fg, fontWeight: 650, fontSize: 14 }}>{domain.label}</div><div style={{ height: 4, borderRadius: 4, background: M.line2, margin: "12px 0 8px", overflow: "hidden" }}><div style={{ width: `${Math.round(domain.progress * 100)}%`, height: "100%", background: M.brand, borderRadius: 4 }} /></div><div style={{ color: M.mut, fontSize: 12, lineHeight: 1.35 }}>{domain.detail}</div></div>)}
    </div>
    <div style={{ marginTop: 10, padding: 16, borderRadius: 16, background: M.panel, border: `1px solid ${M.line}` }}>
      <div style={{ fontSize: 13, letterSpacing: 1.1, color: M.mut, fontWeight: 700 }}>HEUTE</div><div style={{ marginTop: 5, fontSize: 16, color: M.fg, fontWeight: 700 }}>{generating ? "Deine Tagesempfehlung entsteht …" : accepted ? "Empfehlung vorgemerkt" : recommendation.title}</div><div style={{ marginTop: 4, color: M.mut, fontSize: 13, lineHeight: 1.45 }}>{generating ? "Check-in, Wochenfortschritt und dein Training werden berücksichtigt." : accepted ? "Du behältst die Kontrolle über deine Einheit." : recommendation.detail}</div>
      {!generating && !accepted && recommendation.action === "recover" && recommendation.title === "Tages-Check-in" ? <MButton fullWidth variant="primary" size="md" onClick={onCheckin} style={{ marginTop: 14 }}>Check-in öffnen</MButton> : null}
      {!generating && !accepted && recommendation.action === "reduce" ? <MButton fullWidth variant="primary" size="md" onClick={onOpenExpress} style={{ marginTop: 14 }}>Express Tracking öffnen</MButton> : null}
      {!generating && !accepted && recommendation.action === "endurance" ? <MButton fullWidth variant="primary" size="md" onClick={() => { setAccepted(true); onOpenTimer(); }} style={{ marginTop: 14 }}>Zone-2-Timer starten</MButton> : null}
      {!generating && !accepted && recommendation.action === "nutrition" ? <MButton fullWidth variant="secondary" size="md" onClick={() => onOpenRecovery("protein")} style={{ marginTop: 14 }}>Protein & Wasser öffnen</MButton> : null}
      {!generating && !accepted && recommendation.action === "recover" && recommendation.title !== "Tages-Check-in" ? <MButton fullWidth variant="secondary" size="md" onClick={() => onOpenRecovery("checkin")} style={{ marginTop: 14 }}>Erholung ansehen</MButton> : null}
      {!generating && !accepted && recommendation.action === "strength" && onStartStrength ? <MButton fullWidth variant="primary" size="md" onClick={onStartStrength} style={{ marginTop: 14 }}>Krafteinheit starten</MButton> : null}
      {!generating && !accepted && (recommendation.action === "strength" && !onStartStrength || recommendation.action === "maintain") ? <MButton fullWidth variant="secondary" size="md" onClick={() => setAccepted(true)} style={{ marginTop: 14 }}>Empfehlung bestätigen</MButton> : null}
    </div>
  </section>;
}
