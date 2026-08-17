import { useState } from "react";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { MButton } from "../components/MButton";
import { useAuth } from "../lib/auth";
import { maxHrFromBirthDate } from "../lib/heartRate/heartRateZones";
import { M, TYPE } from "../theme";
import { useI18n } from "../lib/i18n";
import type { TranslationKey } from "../locales/de";

const DURATIONS = [20, 30, 45, 60] as const;
const DEVICES = ["walk", "bike", "treadmill", "rower", "free"] as const;

export function Zone2SetupScreen({ onBack, onStart, suggestion }: { onBack: () => void; onStart: (durationMin: number, device?: string, aiSuggested?: boolean) => void; suggestion?: { durationMin: number; device?: string; rationale?: string } }) {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [duration, setDuration] = useState<number | null>(null);
  const [device, setDevice] = useState<string | null>(null);
  const maxHr = maxHrFromBirthDate(profile?.birth_date);
  const zone2 = maxHr ? { min: Math.round(maxHr * 0.6), max: Math.round(maxHr * 0.7) } : null;
  return <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
    <ScreenBackHeader title={t("zone2.title")} onBack={onBack} />
    <div style={{ flex: 1, overflowY: "auto", padding: "0 22px 24px" }}>
      <p style={{ margin: "0 0 20px", color: M.mut, fontSize: TYPE.body, lineHeight: 1.5 }}>{t("zone2.intro")}</p>
      {suggestion ? <div style={{ margin: "0 0 18px", padding: "12px 14px", borderRadius: 12, background: M.cardHi, border: `1px solid ${M.line2}`, color: M.mut, fontSize: TYPE.bodySm, lineHeight: 1.45 }}><strong style={{ color: M.fg }}>{t("zone2.ai")}</strong><br />{suggestion.rationale}{suggestion.device ? ` · ${suggestion.device}` : ""}<br />{t("zone2.confirmDuration")}</div> : null}
      <div style={{ fontSize: TYPE.caption, letterSpacing: 1, fontWeight: 700, color: M.mut, marginBottom: 10 }}>{t("zone2.duration")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 22 }}>{DURATIONS.map((minutes) => <MButton key={minutes} variant={duration === minutes ? "primary" : "secondary"} size="md" onClick={() => setDuration(minutes)}>{t("zone2.minutes", { count: minutes })}</MButton>)}</div>
      <div style={{ fontSize: TYPE.caption, letterSpacing: 1, fontWeight: 700, color: M.mut, marginBottom: 10 }}>{t("zone2.type")} <span style={{ fontWeight: 400 }}>({t("common.optional").toLocaleLowerCase()})</span></div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{DEVICES.map((item) => <MButton key={item} variant={device === item ? "primary" : "secondary"} size="sm" onClick={() => setDevice(device === item ? null : item)}>{t(`zone2.device.${item}` as TranslationKey)}</MButton>)}</div>
      <div style={{ marginTop: 24, padding: "14px", borderRadius: 14, background: M.card, border: `1px solid ${M.line2}`, color: M.mut, fontSize: TYPE.bodySm, lineHeight: 1.5 }}>
        <strong style={{ color: M.fg }}>{t("zone2.breathing")}</strong><br />{t("zone2.breathingHint")}
        {zone2 ? <><br /><span style={{ display: "inline-block", marginTop: 8, color: M.fg }}>{t("zone2.range", { min: zone2.min, max: zone2.max })}</span></> : <><br /><span style={{ display: "inline-block", marginTop: 8 }}>{t("zone2.birthDateHint")}</span></>}
      </div>
    </div>
    <div style={{ padding: "10px 22px 24px", borderTop: `1px solid ${M.line2}` }}><MButton fullWidth variant="primary" size="md" disabled={!duration} onClick={() => duration && onStart(duration, device ? t(`zone2.device.${device}` as TranslationKey) : suggestion?.device ?? undefined, Boolean(suggestion))}>{t("zone2.start")}</MButton></div>
  </div>;
}
