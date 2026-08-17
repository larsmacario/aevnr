import { useEffect, useState } from "react";
import { M, TYPE } from "../theme";
import { MButton } from "./MButton";
import type { ExpressBaselineLevel, ExpressBaselineMetric, ExpressPerformanceBaseline } from "../lib/preferences";
import { useI18n } from "../lib/i18n";

type MetricKey = "pushUps" | "pullUps" | "bodyweightSquats" | "sixMinuteDistanceM";

function metricFrom(baseline: ExpressPerformanceBaseline | null | undefined, key: MetricKey): ExpressBaselineMetric | undefined {
  return baseline?.[key];
}

export function ExpressPerformanceBaselineForm({ baseline, onSave, onCancel, saving = false }: {
  baseline: ExpressPerformanceBaseline | null;
  onSave: (value: ExpressPerformanceBaseline) => void | Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}) {
  const { t } = useI18n();
  const levels: { id: ExpressBaselineLevel; label: string }[] = [
    { id: "beginner", label: t("baseline.beginner") },
    { id: "intermediate", label: t("baseline.intermediate") },
    { id: "advanced", label: t("baseline.advanced") },
  ];
  const metrics: { key: MetricKey; title: string; question: string; unit: string; max: number; pullUp?: boolean }[] = [
    { key: "pushUps", title: t("baseline.push.title"), question: t("baseline.push.question"), unit: t("baseline.reps"), max: 500 },
    { key: "pullUps", title: t("baseline.pull.title"), question: t("baseline.pull.question"), unit: t("baseline.reps"), max: 200, pullUp: true },
    { key: "bodyweightSquats", title: t("baseline.legs.title"), question: t("baseline.legs.question"), unit: t("baseline.reps"), max: 500 },
    { key: "sixMinuteDistanceM", title: t("baseline.cardio.title"), question: t("baseline.cardio.question"), unit: "m", max: 5000 },
  ];
  const [values, setValues] = useState<Record<MetricKey, ExpressBaselineMetric | undefined>>({
    pushUps: metricFrom(baseline, "pushUps"), pullUps: metricFrom(baseline, "pullUps"), bodyweightSquats: metricFrom(baseline, "bodyweightSquats"), sixMinuteDistanceM: metricFrom(baseline, "sixMinuteDistanceM"),
  });

  useEffect(() => setValues({
    pushUps: metricFrom(baseline, "pushUps"), pullUps: metricFrom(baseline, "pullUps"), bodyweightSquats: metricFrom(baseline, "bodyweightSquats"), sixMinuteDistanceM: metricFrom(baseline, "sixMinuteDistanceM"),
  }), [baseline]);

  const setMetric = (key: MetricKey, value: ExpressBaselineMetric | undefined) => setValues((current) => ({ ...current, [key]: value }));
  const save = () => onSave({ version: 1, updatedAt: new Date().toISOString(), ...values });

  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div><div style={{ fontFamily: M.label, fontWeight: 700, fontSize: 22, color: M.fg }}>{t("baseline.title")}</div><p style={{ margin: "5px 0 0", color: M.mut, fontSize: TYPE.bodySm, lineHeight: 1.45 }}>{t("baseline.description")}</p></div>
    {metrics.map((metric) => {
      const current = values[metric.key];
      return <div key={metric.key} style={{ padding: "13px", borderRadius: 14, background: M.card, border: `1px solid ${M.line2}` }}>
        <div style={{ fontSize: TYPE.caption, color: M.mut, fontWeight: 700, letterSpacing: 1 }}>{metric.title}</div>
        <div style={{ marginTop: 4, color: M.fg, fontSize: TYPE.bodySm, lineHeight: 1.4 }}>{metric.question}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}><input aria-label={t("baseline.valueAria", { title: metric.title })} type="number" inputMode="numeric" min={0} max={metric.max} value={current?.value ?? ""} placeholder={metric.unit} onChange={(event) => { const number = event.target.value === "" ? undefined : Math.min(metric.max, Math.max(0, Math.round(Number(event.target.value)))); setMetric(metric.key, number === undefined || !Number.isFinite(number) ? undefined : { value: number }); }} style={{ width: 84, minHeight: 38, boxSizing: "border-box", borderRadius: 9, border: `1px solid ${M.line}`, background: M.bg, color: M.fg, padding: "0 10px", fontSize: TYPE.body }} /><span style={{ color: M.mut, fontSize: TYPE.bodySm }}>{metric.unit}</span></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>{levels.map((level) => <MButton key={level.id} type="button" variant={current?.level === level.id ? "primary" : "secondary"} size="sm" onClick={() => setMetric(metric.key, { level: level.id })}>{level.label}</MButton>)}<MButton type="button" variant={current?.skipped ? "primary" : "ghost"} size="sm" onClick={() => setMetric(metric.key, { skipped: true })}>{t("baseline.skip")}</MButton>{metric.pullUp ? <MButton type="button" variant={current?.unavailable ? "primary" : "ghost"} size="sm" onClick={() => setMetric(metric.key, { unavailable: true })}>{t("baseline.noBar")}</MButton> : null}</div>
      </div>;
    })}
    <MButton type="button" variant="primary" size="md" fullWidth loading={saving} onClick={() => void save()}>{t("baseline.continue")}</MButton>
    <MButton type="button" variant="ghost" size="sm" fullWidth disabled={saving} onClick={onCancel}>{t("common.cancel")}</MButton>
  </div>;
}
