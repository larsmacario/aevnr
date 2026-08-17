import { useEffect, useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { M } from "../theme";
import type { DailyCheckin, DailyCheckinInput } from "../lib/healthspan";
import { useI18n } from "../lib/i18n";

export function DailyCheckinSheet({ open, current, busy, onClose, onSave }: { open: boolean; current?: DailyCheckin | null; busy?: boolean; onClose: () => void; onSave: (input: DailyCheckinInput) => void | Promise<void> }) {
  const { t } = useI18n();
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(6);
  const [stressLevel, setStressLevel] = useState(5);
  const [energyLevel, setEnergyLevel] = useState(6);
  const [note, setNote] = useState("");
  useEffect(() => { if (open) { setSleepHours(current?.sleepHours ?? 7); setSleepQuality(current?.sleepQuality ?? 6); setStressLevel(current?.stressLevel ?? 5); setEnergyLevel(current?.energyLevel ?? 6); setNote(current?.note ?? ""); } }, [open, current]);
  const field = (label: string, value: number, min: number, max: number, setValue: (value: number) => void, suffix = "") => (
    <label style={{ display: "block", marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, fontWeight: 650 }}><span>{label}</span><span style={{ color: M.brand }}>{value}{suffix}</span></div>
      <input aria-label={label} type="range" min={min} max={max} step={suffix ? 0.5 : 1} value={value} onChange={(event) => setValue(Number(event.target.value))} style={{ width: "100%", accentColor: M.brand }} />
    </label>
  );
  return <BottomSheet open={open} onClose={onClose} aria-label={t("checkin.aria")}>
    <div style={{ padding: "0 2px" }}>
      <div style={{ color: M.fg, fontFamily: M.display, fontSize: 28, letterSpacing: 0.4 }}>{t("checkin.title")}</div>
      <p style={{ color: M.mut, fontSize: 14, lineHeight: 1.5, margin: "6px 0 22px" }}>{t("checkin.description")}</p>
      {field(t("checkin.sleep"), sleepHours, 0, 12, setSleepHours, " h")}
      {field(t("checkin.sleepQuality"), sleepQuality, 1, 10, setSleepQuality, "/10")}
      {field(t("checkin.stress"), stressLevel, 1, 10, setStressLevel, "/10")}
      {field(t("checkin.energy"), energyLevel, 1, 10, setEnergyLevel, "/10")}
      <label style={{ display: "block", fontSize: 14, fontWeight: 650, marginBottom: 8 }}>{t("checkin.note")} <span style={{ color: M.mut, fontWeight: 400 }}>({t("common.optional").toLocaleLowerCase()})</span></label>
      <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder={t("checkin.notePlaceholder")} style={{ width: "100%", minHeight: 70, resize: "vertical", boxSizing: "border-box", padding: 12, borderRadius: 12, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: "inherit", marginBottom: 16 }} />
      <MButton fullWidth variant="primary" size="md" disabled={busy} onClick={() => void onSave({ sleepHours, sleepQuality, stressLevel, energyLevel, note })}>{busy ? t("checkin.saving") : t("checkin.save")}</MButton>
    </div>
  </BottomSheet>;
}
