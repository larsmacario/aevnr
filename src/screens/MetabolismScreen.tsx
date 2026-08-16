import { useMemo, useState } from "react";
import { AlertSheet } from "../components/AlertSheet";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { MetabolicLogSheet } from "../components/MetabolicLogSheet";
import { ScreenBackHeader, ScreenScroll } from "../components/ScreenScroll";
import { useAuth } from "../lib/auth";
import { createMetabolicLog, deleteMetabolicLog, updateMetabolicLog, useMetabolicLogs, useSessions } from "../lib/db";
import { buildMetabolicWeekSummary, MEAL_QUALITY_LABELS, type MetabolicLog, type MetabolicLogInput } from "../lib/metabolic";
import { toLocalDateKey } from "../lib/hydration";
import { M } from "../theme";

function sevenDaysAgoIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function formatLoggedAt(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const CARD_STYLE = { padding: 16, borderRadius: 18, background: M.card, border: `1px solid ${M.line2}`, boxShadow: M.shadow };

export function MetabolismScreen({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MetabolicLog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MetabolicLog | null>(null);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const { data: logs, loading, error, reload } = useMetabolicLogs(sevenDaysAgoIso(), refreshKey);
  const { data: sessions } = useSessions();
  const summary = useMemo(() => buildMetabolicWeekSummary(logs ?? [], new Set((sessions ?? []).map((session) => toLocalDateKey(new Date(session.performedAt))))), [logs, sessions]);
  const sufficientData = summary.count >= 3;

  const refresh = () => { setRefreshKey((key) => key + 1); reload(); };
  const save = async (input: MetabolicLogInput) => {
    if (!user) return;
    setBusy(true);
    try {
      if (editing) await updateMetabolicLog(user.id, editing.id, input);
      else await createMetabolicLog(user.id, input);
      setSheetOpen(false); setEditing(null); refresh();
    } catch (cause) { setAlert(cause instanceof Error ? cause.message : "Eintrag konnte nicht gespeichert werden."); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!user || !deleteTarget) return;
    setBusy(true);
    try { await deleteMetabolicLog(user.id, deleteTarget.id); setDeleteTarget(null); refresh(); }
    catch (cause) { setAlert(cause instanceof Error ? cause.message : "Eintrag konnte nicht gelöscht werden."); }
    finally { setBusy(false); }
  };

  return <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
    <ScreenBackHeader onBack={onBack} title="STOFFWECHSEL-RHYTHMUS" trailing={<MButton type="button" variant="ghost" size="icon" aria-label="Eintrag hinzufügen" onClick={() => { setEditing(null); setSheetOpen(true); }}><Icon name="plus" size={20} color={M.brand} /></MButton>} />
    <ScreenScroll bottom="default">
      <div style={{ ...CARD_STYLE, background: M.panel }}>
        <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700 }}>DEIN KONTEXT</div>
        <div style={{ marginTop: 6, color: M.fg, fontSize: 16, fontWeight: 700 }}>Mahlzeiten bewusst beobachten</div>
        <p style={{ margin: "6px 0 0", color: M.mut, fontSize: 13, lineHeight: 1.5 }}>Diese Ansicht zeigt nur deine protokollierten Eindrücke. Sie misst weder Insulin noch Blutzucker und ersetzt keine medizinische Beratung.</p>
      </div>
      <MButton type="button" variant="primary" size="md" fullWidth onClick={() => { setEditing(null); setSheetOpen(true); }} style={{ margin: "14px 0 18px" }}>Mahlzeit & Befinden erfassen</MButton>
      <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>5 ALLTAGSIMPULSE</div>
      <div style={{ ...CARD_STYLE, marginBottom: 18 }}>
        {[
          ["Schlaf & Erholung", "Deinen Schlaf und Stress im Tages-Check-in ernst nehmen."],
          ["Sättigend starten", "Wenn es passt, eine protein- und ballaststoffreiche erste Mahlzeit wählen."],
          ["Bewegung einbauen", "Alltagsbewegung und Krafttraining als feste Basis nutzen."],
          ["Sitzzeit unterbrechen", "Lange Sitzphasen regelmäßig durch kurze Bewegung auflockern."],
          ["Eigenes Timing beobachten", "Mahlzeiten und Befinden protokollieren statt pauschalen Regeln zu folgen."],
        ].map(([title, detail], index) => <div key={title} style={{ display: "flex", gap: 10, padding: index ? "12px 0 0" : 0, marginTop: index ? 12 : 0, borderTop: index ? `1px solid ${M.line2}` : undefined }}><span style={{ color: M.brand, fontWeight: 800, fontSize: 13, minWidth: 16 }}>{index + 1}</span><div><div style={{ color: M.fg, fontWeight: 700, fontSize: 14 }}>{title}</div><div style={{ marginTop: 2, color: M.mut, fontSize: 12, lineHeight: 1.4 }}>{detail}</div></div></div>)}
      </div>
      <p style={{ margin: "-6px 2px 18px", color: M.mut2, fontSize: 12, lineHeight: 1.45 }}>Frühstücks- oder Kaffee-Timing ist kein allgemeiner Coach-Standard. Bei Diabetes, Schwangerschaft oder Medikamenten bitte individuell medizinisch abklären.</p>
      {loading ? <div style={{ color: M.mut, padding: "22px 0" }}>Laden…</div> : error ? <div style={{ color: M.danger, padding: "22px 0" }}>{error}</div> : <>
        <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>LETZTE 7 TAGE</div>
        <div style={{ ...CARD_STYLE, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><div style={{ color: M.fg, fontSize: 16, fontWeight: 700 }}>{summary.count} Mahlzeit{summary.count === 1 ? "" : "en"} protokolliert</div><span style={{ color: M.brand, fontSize: 13, fontWeight: 700 }}>{Math.round(summary.progress * 100)} % Rhythmus</span></div>
          <div style={{ height: 4, borderRadius: 4, background: M.line2, margin: "12px 0 10px", overflow: "hidden" }}><div style={{ width: `${Math.round(summary.progress * 100)}%`, height: "100%", background: M.brand, borderRadius: 4 }} /></div>
          {sufficientData ? <div style={{ color: M.mut, fontSize: 13, lineHeight: 1.5 }}>Durchschnitt danach: Energie {summary.energyLevel}/10 · Sättigung {summary.satietyLevel}/10</div> : <div style={{ color: M.mut, fontSize: 13, lineHeight: 1.5 }}>Ab drei Einträgen werden deine beschreibenden Wochenmuster sichtbar.</div>}
        </div>
        {sufficientData ? <>
          <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>BEOBACHTETE MUSTER</div>
          <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>{summary.timePatterns.map((pattern) => <div key={pattern.label} style={CARD_STYLE}><div style={{ color: M.fg, fontWeight: 700 }}>{pattern.label}</div><div style={{ marginTop: 4, color: M.mut, fontSize: 13 }}>{pattern.count} Einträge · Energie {pattern.energyLevel}/10 · Sättigung {pattern.satietyLevel}/10</div></div>)}</div>
          {(summary.trainingDay || summary.restDay) ? <div style={{ ...CARD_STYLE, marginBottom: 18 }}><div style={{ color: M.fg, fontWeight: 700 }}>Trainingstage im Vergleich</div><div style={{ marginTop: 5, color: M.mut, fontSize: 13, lineHeight: 1.5 }}>{summary.trainingDay ? `An Trainingstagen: ${summary.trainingDay.count} Einträge · Energie ${summary.trainingDay.energyLevel}/10 · Sättigung ${summary.trainingDay.satietyLevel}/10.` : "Noch keine Mahlzeit an einem Trainingstag protokolliert."} {summary.restDay ? ` An anderen Tagen: ${summary.restDay.count} Einträge · Energie ${summary.restDay.energyLevel}/10 · Sättigung ${summary.restDay.satietyLevel}/10.` : ""}</div></div> : null}
        </> : null}
        <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>DEINE EINTRÄGE</div>
        {(logs ?? []).length === 0 ? <div style={{ ...CARD_STYLE, color: M.mut, fontSize: 14, lineHeight: 1.5 }}>Starte mit einer Mahlzeit und deinem Befinden danach. Die Erfassung bleibt freiwillig.</div> : <div style={{ display: "grid", gap: 8 }}>{(logs ?? []).map((log) => <div key={log.id} style={{ ...CARD_STYLE, display: "flex", alignItems: "center", gap: 10 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: M.fg, fontWeight: 700 }}>{MEAL_QUALITY_LABELS[log.mealQuality]}</div><div style={{ marginTop: 3, color: M.mut, fontSize: 12 }}>{formatLoggedAt(log.loggedAt)} · Energie {log.energyLevel}/10 · Sättigung {log.satietyLevel}/10</div>{log.note ? <div style={{ marginTop: 4, color: M.mut2, fontSize: 12, lineHeight: 1.4 }}>{log.note}</div> : null}</div><MButton type="button" variant="ghost" size="icon" aria-label="Eintrag bearbeiten" onClick={() => { setEditing(log); setSheetOpen(true); }}><Icon name="edit" size={17} color={M.mut} /></MButton><MButton type="button" variant="ghost" size="icon" aria-label="Eintrag löschen" onClick={() => setDeleteTarget(log)}><Icon name="trash" size={17} color={M.mut} /></MButton></div>)}</div>}
      </>}
    </ScreenScroll>
    <MetabolicLogSheet open={sheetOpen} current={editing} busy={busy} onClose={() => { if (!busy) { setSheetOpen(false); setEditing(null); } }} onSave={save} />
    <DeleteConfirmDialog open={!!deleteTarget} title="Eintrag löschen?" message="Dieser Mahlzeit- und Befinden-Eintrag wird entfernt." busy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
    <AlertSheet open={!!alert} title="Nicht gespeichert" message={alert ?? ""} onClose={() => setAlert(null)} />
  </div>;
}
