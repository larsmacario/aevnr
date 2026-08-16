import { useEffect, useState } from "react";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { M } from "../theme";
import { MEAL_QUALITY_LABELS, type MealQuality, type MetabolicLog, type MetabolicLogInput } from "../lib/metabolic";

function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function MetabolicLogSheet({ open, current, busy, onClose, onSave }: { open: boolean; current?: MetabolicLog | null; busy?: boolean; onClose: () => void; onSave: (input: MetabolicLogInput) => void | Promise<void> }) {
  const [loggedAt, setLoggedAt] = useState("");
  const [mealQuality, setMealQuality] = useState<MealQuality>("balanced");
  const [energyLevel, setEnergyLevel] = useState(6);
  const [satietyLevel, setSatietyLevel] = useState(6);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoggedAt(toLocalInputValue(current?.loggedAt ?? new Date().toISOString()));
    setMealQuality(current?.mealQuality ?? "balanced");
    setEnergyLevel(current?.energyLevel ?? 6);
    setSatietyLevel(current?.satietyLevel ?? 6);
    setNote(current?.note ?? "");
  }, [open, current]);

  const score = (label: string, value: number, setValue: (value: number) => void) => (
    <label style={{ display: "block", marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14, fontWeight: 650 }}><span>{label}</span><span style={{ color: M.brand }}>{value}/10</span></div>
      <input aria-label={label} type="range" min={1} max={10} step={1} value={value} onChange={(event) => setValue(Number(event.target.value))} style={{ width: "100%", accentColor: M.brand }} />
    </label>
  );

  return <BottomSheet open={open} onClose={onClose} aria-label="Mahlzeit und Befinden">
    <div style={{ padding: "0 2px" }}>
      <div style={{ color: M.fg, fontFamily: M.display, fontSize: 28, letterSpacing: 0.4 }}>MAHLZEIT & BEFINDEN</div>
      <p style={{ color: M.mut, fontSize: 14, lineHeight: 1.5, margin: "6px 0 18px" }}>Beobachte deinen persönlichen Rhythmus. Diese Angaben messen weder Insulin noch Blutzucker.</p>
      <label style={{ display: "block", fontSize: 14, fontWeight: 650, marginBottom: 8 }}>Zeitpunkt</label>
      <input aria-label="Zeitpunkt" type="datetime-local" value={loggedAt} onChange={(event) => setLoggedAt(event.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 12, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: "inherit" }} />
      <div style={{ fontSize: 14, fontWeight: 650, margin: "18px 0 8px" }}>Mahlzeitgefühl</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {(Object.keys(MEAL_QUALITY_LABELS) as MealQuality[]).map((quality) => <MButton key={quality} type="button" variant={mealQuality === quality ? "primary" : "secondary"} size="sm" onClick={() => setMealQuality(quality)}>{MEAL_QUALITY_LABELS[quality]}</MButton>)}
      </div>
      {score("Energie danach", energyLevel, setEnergyLevel)}
      {score("Sättigung danach", satietyLevel, setSatietyLevel)}
      <label style={{ display: "block", fontSize: 14, fontWeight: 650, margin: "18px 0 8px" }}>Notiz <span style={{ color: M.mut, fontWeight: 400 }}>(optional)</span></label>
      <textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder="Was ist dir aufgefallen?" style={{ width: "100%", minHeight: 70, resize: "vertical", boxSizing: "border-box", padding: 12, borderRadius: 12, border: `1px solid ${M.line}`, background: M.card, color: M.fg, font: "inherit", marginBottom: 16 }} />
      <MButton fullWidth variant="primary" size="md" disabled={busy || !loggedAt} onClick={() => void onSave({ loggedAt: new Date(loggedAt).toISOString(), mealQuality, energyLevel, satietyLevel, note })}>{busy ? "Speichern…" : current ? "Eintrag speichern" : "Eintrag hinzufügen"}</MButton>
    </div>
  </BottomSheet>;
}
