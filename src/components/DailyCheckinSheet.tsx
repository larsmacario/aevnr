import { useEffect, useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { M } from "../theme";
import type { DailyCheckin, DailyCheckinInput } from "../lib/healthspan";

export function DailyCheckinSheet({ open, current, busy, onClose, onSave }: { open: boolean; current?: DailyCheckin | null; busy?: boolean; onClose: () => void; onSave: (input: DailyCheckinInput) => void | Promise<void> }) {
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
  return <BottomSheet open={open} onClose={onClose} aria-label="Tages-Check-in">
    <div style={{ padding: "0 2px" }}>
      <div style={{ color: M.fg, fontFamily: M.display, fontSize: 28, letterSpacing: 0.4 }}>TAGES-CHECK-IN</div>
      <p style={{ color: M.mut, fontSize: 14, lineHeight: 1.5, margin: "6px 0 22px" }}>Damit ÆVNR deine Belastung passend einordnet – kein medizinischer Rat.</p>
      {field("Schlaf", sleepHours, 0, 12, setSleepHours, " h")}
      {field("Schlafqualität", sleepQuality, 1, 10, setSleepQuality, "/10")}
      {field("Stress", stressLevel, 1, 10, setStressLevel, "/10")}
      {field("Energie", energyLevel, 1, 10, setEnergyLevel, "/10")}
      <label style={{ display: "block", fontSize: 14, fontWeight: 650, marginBottom: 8 }}>Notiz <span style={{ color: M.mut, fontWeight: 400 }}>(optional)</span></label>
      <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Was beeinflusst deinen Tag?" style={{ width: "100%", minHeight: 70, resize: "vertical", boxSizing: "border-box", padding: 12, borderRadius: 12, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: "inherit", marginBottom: 16 }} />
      <MButton fullWidth variant="primary" size="md" disabled={busy} onClick={() => void onSave({ sleepHours, sleepQuality, stressLevel, energyLevel, note })}>{busy ? "Speichern…" : "Check-in speichern"}</MButton>
    </div>
  </BottomSheet>;
}
