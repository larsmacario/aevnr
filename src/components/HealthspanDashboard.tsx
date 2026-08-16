import { useState } from "react";
import { M } from "../theme";
import { MButton } from "./MButton";
import type { CoachRecommendation, HealthspanDomain } from "../lib/healthspan";

type CoachProps = { recommendation: CoachRecommendation; generating?: boolean; reasons: string[]; onCheckin: () => void; onOpenTimer: () => void; onOpenRecovery: (section?: "protein" | "water" | "checkin") => void; onOpenMetabolism: () => void; onOpenExpress: () => void; onStartStrength?: () => void };

export function DashboardCoach({ recommendation, generating = false, reasons, onCheckin, onOpenTimer, onOpenRecovery, onOpenMetabolism, onOpenExpress, onStartStrength }: CoachProps) {
  const [accepted, setAccepted] = useState(false);
  return <section style={{ marginTop: 18 }}>
    <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>DEIN TAGES-COACH</div>
    <div style={{ padding: 18, borderRadius: 20, background: M.panel, border: `1px solid ${M.line}`, boxShadow: M.shadow }}>
      <div style={{ fontSize: 13, letterSpacing: 1.1, color: M.mut, fontWeight: 700 }}>HEUTE</div><div style={{ marginTop: 5, fontSize: 16, color: M.fg, fontWeight: 700 }}>{generating ? "Deine Tagesempfehlung entsteht …" : accepted ? "Empfehlung vorgemerkt" : recommendation.title}</div><div style={{ marginTop: 4, color: M.mut, fontSize: 13, lineHeight: 1.45 }}>{generating ? "Check-in, Wochenfortschritt und dein Training werden berücksichtigt." : accepted ? "Du behältst die Kontrolle über deine Einheit." : recommendation.detail}</div>
      {!generating && !accepted ? <div style={{ marginTop: 8, color: M.mut2, fontSize: 12, lineHeight: 1.4 }}>Priorisiert durch {reasons.join(" und ")}.</div> : null}
      {!generating && !accepted && recommendation.action === "recover" && recommendation.title === "Tages-Check-in" ? <MButton fullWidth variant="primary" size="md" onClick={onCheckin} style={{ marginTop: 14 }}>Check-in öffnen</MButton> : null}
      {!generating && !accepted && recommendation.action === "reduce" ? <MButton fullWidth variant="primary" size="md" onClick={onOpenExpress} style={{ marginTop: 14 }}>Express Tracking öffnen</MButton> : null}
      {!generating && !accepted && recommendation.action === "endurance" ? <MButton fullWidth variant="primary" size="md" onClick={() => { setAccepted(true); onOpenTimer(); }} style={{ marginTop: 14 }}>Zone-2-Timer starten</MButton> : null}
      {!generating && !accepted && recommendation.action === "nutrition" ? <MButton fullWidth variant="secondary" size="md" onClick={() => onOpenRecovery("protein")} style={{ marginTop: 14 }}>Protein & Wasser öffnen</MButton> : null}
      {!generating && !accepted && recommendation.action === "metabolism" ? <MButton fullWidth variant="secondary" size="md" onClick={onOpenMetabolism} style={{ marginTop: 14 }}>Stoffwechsel-Rhythmus öffnen</MButton> : null}
      {!generating && !accepted && recommendation.action === "recover" && recommendation.title !== "Tages-Check-in" ? <MButton fullWidth variant="secondary" size="md" onClick={() => onOpenRecovery("checkin")} style={{ marginTop: 14 }}>Erholung ansehen</MButton> : null}
      {!generating && !accepted && recommendation.action === "strength" && onStartStrength ? <MButton fullWidth variant="primary" size="md" onClick={onStartStrength} style={{ marginTop: 14 }}>Krafteinheit starten</MButton> : null}
      {!generating && !accepted && (recommendation.action === "strength" && !onStartStrength || recommendation.action === "maintain") ? <MButton fullWidth variant="secondary" size="md" onClick={() => setAccepted(true)} style={{ marginTop: 14 }}>Empfehlung bestätigen</MButton> : null}
    </div>
  </section>;
}

export function splitHealthspanDomains(domains: HealthspanDomain[]): { gridDomains: HealthspanDomain[]; recoveryDomain?: HealthspanDomain } {
  return {
    gridDomains: domains.filter((domain) => domain.id !== "recovery"),
    recoveryDomain: domains.find((domain) => domain.id === "recovery"),
  };
}

export function HealthspanDashboard({ domains, onOpenMetabolism, onOpenRecovery }: { domains: HealthspanDomain[]; onOpenMetabolism?: () => void; onOpenRecovery?: () => void }) {
  const { gridDomains, recoveryDomain } = splitHealthspanDomains(domains);
  const cardStyle = { padding: 14, background: M.card, border: `1px solid ${M.line2}`, borderRadius: 18, boxShadow: M.shadow };
  return <section style={{ marginTop: 18 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}><div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700 }}>HEALTHSPAN</div><span style={{ color: M.mut, fontSize: 12 }}>Diese Woche</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
      {gridDomains.map((domain) => <div key={domain.id} role={domain.id === "metabolism" ? "button" : undefined} tabIndex={domain.id === "metabolism" ? 0 : undefined} onClick={domain.id === "metabolism" ? onOpenMetabolism : undefined} onKeyDown={domain.id === "metabolism" ? (event) => { if (event.key === "Enter" || event.key === " ") onOpenMetabolism?.(); } : undefined} style={{ ...cardStyle, cursor: domain.id === "metabolism" ? "pointer" : undefined }}><div style={{ color: M.fg, fontWeight: 650, fontSize: 14 }}>{domain.label}</div><div style={{ height: 4, borderRadius: 4, background: M.line2, margin: "12px 0 8px", overflow: "hidden" }}><div style={{ width: `${Math.round(domain.progress * 100)}%`, height: "100%", background: M.brand, borderRadius: 4 }} /></div><div style={{ color: M.mut, fontSize: 12, lineHeight: 1.35 }}>{domain.detail}</div></div>)}
    </div>
    {recoveryDomain ? <div role="button" tabIndex={0} onClick={onOpenRecovery} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpenRecovery?.(); }} style={{ ...cardStyle, marginTop: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: M.fg, fontWeight: 650, fontSize: 14 }}>{recoveryDomain.label}</div><div style={{ height: 4, borderRadius: 4, background: M.line2, margin: "12px 0 8px", overflow: "hidden" }}><div style={{ width: `${Math.round(recoveryDomain.progress * 100)}%`, height: "100%", background: M.brand, borderRadius: 4 }} /></div><div style={{ color: M.mut, fontSize: 12, lineHeight: 1.35 }}>{recoveryDomain.detail}</div></div><span style={{ color: M.mut, fontSize: 18, lineHeight: 1 }} aria-hidden>›</span></div> : null}
  </section>;
}
