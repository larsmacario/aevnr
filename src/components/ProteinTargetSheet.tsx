import { useEffect, useState } from "react";
import type { ProteinTargetMode } from "../lib/preferences";
import {
  clampProteinTargetG,
  PROTEIN_TARGET_MIN_G,
  PROTEIN_TARGET_STEP_G,
} from "../lib/proteinTarget";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { NutritionStepperStack } from "./NutritionStepperStack";
import { useI18n } from "../lib/i18n";

export interface ProteinTargetSheetProps {
  open: boolean;
  mode: ProteinTargetMode;
  targetG: number;
  onClose: () => void;
  onSave: (value: { proteinTargetMode: ProteinTargetMode; proteinTargetG: number | null }) => void | Promise<void>;
}

export function ProteinTargetSheet({ open, mode, targetG, onClose, onSave }: ProteinTargetSheetProps) {
  const { t } = useI18n();
  const [selectedMode, setSelectedMode] = useState<ProteinTargetMode>(mode);
  const [value, setValue] = useState(targetG);
  const [busy, setBusy] = useState(false);
  const options: { id: ProteinTargetMode; label: string; detail: string }[] = [
    { id: "plan", label: t("recovery.sheet.target.plan"), detail: t("recovery.sheet.target.planDetail") },
    { id: "body", label: t("recovery.sheet.target.body"), detail: t("recovery.sheet.target.bodyDetail") },
    { id: "manual", label: t("recovery.sheet.target.manual"), detail: t("recovery.sheet.target.manualDetail") },
  ];

  useEffect(() => {
    if (!open) return;
    setSelectedMode(mode);
    setValue(targetG);
    setBusy(false);
  }, [open, mode, targetG]);

  const save = async () => {
    setBusy(true);
    try {
      await onSave({
        proteinTargetMode: selectedMode,
        proteinTargetG: selectedMode === "manual" ? clampProteinTargetG(value) : null,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={t("recovery.sheet.target.proteinAria")}>
      <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 20, marginBottom: 8 }}>{t("recovery.sheet.target.proteinTitle")}</div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut, lineHeight: 1.45 }}>{t("recovery.sheet.target.proteinDescription")}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((option) => (
          <MButton key={option.id} type="button" variant={selectedMode === option.id ? "primary" : "secondary"} size="md" onClick={() => setSelectedMode(option.id)} style={{ display: "block", textAlign: "left", height: "auto", padding: "12px 14px" }}>
            <span style={{ display: "block", fontWeight: 700 }}>{option.label}</span>
            <span style={{ display: "block", marginTop: 3, fontSize: 12, color: selectedMode === option.id ? M.bg : M.mut, fontWeight: 500, lineHeight: 1.35 }}>{option.detail}</span>
          </MButton>
        ))}
      </div>
      {selectedMode === "manual" ? (
        <div style={{ marginTop: 18 }}>
          <NutritionStepperStack fields={[{ id: "proteinTarget", label: t("recovery.sheet.target.grams"), value, step: PROTEIN_TARGET_STEP_G, min: PROTEIN_TARGET_MIN_G, onChange: (next) => setValue(clampProteinTargetG(next)) }]} />
        </div>
      ) : null}
      <MButton type="button" variant="primary" size="md" fullWidth disabled={busy} onClick={() => void save()} style={{ marginTop: 18 }}>{t("recovery.sheet.save")}</MButton>
    </BottomSheet>
  );
}
