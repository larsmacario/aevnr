import { useMemo, useState } from "react";
import { AlertSheet } from "../components/AlertSheet";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { MetabolicLogSheet } from "../components/MetabolicLogSheet";
import { ScreenBackHeader, ScreenScroll } from "../components/ScreenScroll";
import { useAuth } from "../lib/auth";
import { createMetabolicLog, deleteMetabolicLog, updateMetabolicLog, useMetabolicLogs, useSessions } from "../lib/db";
import { buildMetabolicWeekSummary, type MetabolicLog, type MetabolicLogInput } from "../lib/metabolic";
import { toLocalDateKey } from "../lib/hydration";
import { M } from "../theme";
import { useI18n } from "../lib/i18n";
import type { TranslationKey } from "../locales/de";

function sevenDaysAgoIso(): string {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

const CARD_STYLE = { padding: 16, borderRadius: 18, background: M.card, border: `1px solid ${M.line2}`, boxShadow: M.shadow };

export function MetabolismScreen({ onBack }: { onBack: () => void }) {
  const { locale, t } = useI18n();
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
    } catch (cause) { setAlert(cause instanceof Error ? cause.message : t("metabolism.saveError")); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    if (!user || !deleteTarget) return;
    setBusy(true);
    try { await deleteMetabolicLog(user.id, deleteTarget.id); setDeleteTarget(null); refresh(); }
    catch (cause) { setAlert(cause instanceof Error ? cause.message : t("metabolism.deleteError")); }
    finally { setBusy(false); }
  };

  return <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
    <ScreenBackHeader onBack={onBack} title={t("metabolism.title")} trailing={<MButton type="button" variant="ghost" size="icon" aria-label={t("metabolism.add")} onClick={() => { setEditing(null); setSheetOpen(true); }}><Icon name="plus" size={20} color={M.brand} /></MButton>} />
    <ScreenScroll bottom="default">
      <div style={{ ...CARD_STYLE, background: M.panel }}>
        <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700 }}>{t("metabolism.context")}</div>
        <div style={{ marginTop: 6, color: M.fg, fontSize: 16, fontWeight: 700 }}>{t("metabolism.observe")}</div>
        <p style={{ margin: "6px 0 0", color: M.mut, fontSize: 13, lineHeight: 1.5 }}>{t("metabolism.disclaimer")}</p>
      </div>
      <MButton type="button" variant="primary" size="md" fullWidth onClick={() => { setEditing(null); setSheetOpen(true); }} style={{ margin: "14px 0 18px" }}>{t("metabolism.log")}</MButton>
      <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>{t("metabolism.impulses")}</div>
      <div style={{ ...CARD_STYLE, marginBottom: 18 }}>
        {[
          [t("metabolism.impulse.sleep.title"), t("metabolism.impulse.sleep.detail")],
          [t("metabolism.impulse.satiety.title"), t("metabolism.impulse.satiety.detail")],
          [t("metabolism.impulse.movement.title"), t("metabolism.impulse.movement.detail")],
          [t("metabolism.impulse.sitting.title"), t("metabolism.impulse.sitting.detail")],
          [t("metabolism.impulse.timing.title"), t("metabolism.impulse.timing.detail")],
        ].map(([title, detail], index) => <div key={title} style={{ display: "flex", gap: 10, padding: index ? "12px 0 0" : 0, marginTop: index ? 12 : 0, borderTop: index ? `1px solid ${M.line2}` : undefined }}><span style={{ color: M.brand, fontWeight: 800, fontSize: 13, minWidth: 16 }}>{index + 1}</span><div><div style={{ color: M.fg, fontWeight: 700, fontSize: 14 }}>{title}</div><div style={{ marginTop: 2, color: M.mut, fontSize: 12, lineHeight: 1.4 }}>{detail}</div></div></div>)}
      </div>
      <p style={{ margin: "-6px 2px 18px", color: M.mut2, fontSize: 12, lineHeight: 1.45 }}>{t("metabolism.medical")}</p>
      {loading ? <div style={{ color: M.mut, padding: "22px 0" }}>{t("metabolism.loading")}</div> : error ? <div style={{ color: M.danger, padding: "22px 0" }}>{error}</div> : <>
        <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>{t("metabolism.lastSeven")}</div>
        <div style={{ ...CARD_STYLE, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}><div style={{ color: M.fg, fontSize: 16, fontWeight: 700 }}>{t(summary.count === 1 ? "metabolism.mealCount_one" : "metabolism.mealCount_other", { count: summary.count })}</div><span style={{ color: M.brand, fontSize: 13, fontWeight: 700 }}>{t("metabolism.rhythm", { percent: Math.round(summary.progress * 100) })}</span></div>
          <div style={{ height: 4, borderRadius: 4, background: M.line2, margin: "12px 0 10px", overflow: "hidden" }}><div style={{ width: `${Math.round(summary.progress * 100)}%`, height: "100%", background: M.brand, borderRadius: 4 }} /></div>
          {sufficientData ? <div style={{ color: M.mut, fontSize: 13, lineHeight: 1.5 }}>{t("metabolism.average", { energy: summary.energyLevel ?? 0, satiety: summary.satietyLevel ?? 0 })}</div> : <div style={{ color: M.mut, fontSize: 13, lineHeight: 1.5 }}>{t("metabolism.moreNeeded")}</div>}
        </div>
        {sufficientData ? <>
          <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>{t("metabolism.patterns")}</div>
          <div style={{ display: "grid", gap: 8, marginBottom: 18 }}>{summary.timePatterns.map((pattern) => <div key={pattern.label} style={CARD_STYLE}><div style={{ color: M.fg, fontWeight: 700 }}>{t(`metabolism.time.${pattern.label}` as TranslationKey)}</div><div style={{ marginTop: 4, color: M.mut, fontSize: 13 }}>{t("metabolism.patternDetail", { count: pattern.count, energy: pattern.energyLevel, satiety: pattern.satietyLevel })}</div></div>)}</div>
          {(summary.trainingDay || summary.restDay) ? <div style={{ ...CARD_STYLE, marginBottom: 18 }}><div style={{ color: M.fg, fontWeight: 700 }}>{t("metabolism.compare")}</div><div style={{ marginTop: 5, color: M.mut, fontSize: 13, lineHeight: 1.5 }}>{summary.trainingDay ? t("metabolism.trainingDays", { count: summary.trainingDay.count, energy: summary.trainingDay.energyLevel, satiety: summary.trainingDay.satietyLevel }) : t("metabolism.noTrainingMeal")} {summary.restDay ? t("metabolism.otherDays", { count: summary.restDay.count, energy: summary.restDay.energyLevel, satiety: summary.restDay.satietyLevel }) : ""}</div></div> : null}
        </> : null}
        <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>{t("metabolism.entries")}</div>
        {(logs ?? []).length === 0 ? <div style={{ ...CARD_STYLE, color: M.mut, fontSize: 14, lineHeight: 1.5 }}>{t("metabolism.empty")}</div> : <div style={{ display: "grid", gap: 8 }}>{(logs ?? []).map((log) => <div key={log.id} style={{ ...CARD_STYLE, display: "flex", alignItems: "center", gap: 10 }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: M.fg, fontWeight: 700 }}>{t(`metabolism.quality.${log.mealQuality}` as TranslationKey)}</div><div style={{ marginTop: 3, color: M.mut, fontSize: 12 }}>{t("metabolism.entryDetail", { date: new Date(log.loggedAt).toLocaleString(locale, { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }), energy: log.energyLevel, satiety: log.satietyLevel })}</div>{log.note ? <div style={{ marginTop: 4, color: M.mut2, fontSize: 12, lineHeight: 1.4 }}>{log.note}</div> : null}</div><MButton type="button" variant="ghost" size="icon" aria-label={t("metabolism.edit")} onClick={() => { setEditing(log); setSheetOpen(true); }}><Icon name="edit" size={17} color={M.mut} /></MButton><MButton type="button" variant="ghost" size="icon" aria-label={t("metabolism.delete")} onClick={() => setDeleteTarget(log)}><Icon name="trash" size={17} color={M.mut} /></MButton></div>)}</div>}
      </>}
    </ScreenScroll>
    <MetabolicLogSheet open={sheetOpen} current={editing} busy={busy} onClose={() => { if (!busy) { setSheetOpen(false); setEditing(null); } }} onSave={save} />
    <DeleteConfirmDialog open={!!deleteTarget} title={t("metabolism.deleteTitle")} message={t("metabolism.deleteMessage")} busy={busy} onCancel={() => setDeleteTarget(null)} onConfirm={remove} />
    <AlertSheet open={!!alert} title={t("metabolism.notSaved")} message={alert ?? ""} onClose={() => setAlert(null)} />
  </div>;
}
