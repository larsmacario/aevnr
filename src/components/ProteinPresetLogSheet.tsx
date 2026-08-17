import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { NutritionStepperStack } from "./NutritionStepperStack";
import { createProteinLog, type ProteinLogSource } from "../lib/db";
import { calcProteinG } from "../lib/foodProduct";
import type { RecoveryFoodPreset } from "../lib/recoveryEngine";
import { useI18n } from "../lib/i18n";

export interface ProteinPresetLogSheetProps {
  open: boolean;
  preset: RecoveryFoodPreset | null;
  onClose: () => void;
  onSaved: () => void;
  userId: string;
  logSource?: Extract<ProteinLogSource, "quick" | "post_workout">;
}

export function ProteinPresetLogSheet({
  open,
  preset,
  onClose,
  onSaved,
  userId,
  logSource = "quick",
}: ProteinPresetLogSheetProps) {
  const { t } = useI18n();
  const [proteinPer100g, setProteinPer100g] = useState(20);
  const [amountG, setAmountG] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !preset) return;
    setProteinPer100g(preset.proteinPer100g);
    setAmountG(preset.defaultAmountG);
    setBusy(false);
    setError(null);
  }, [open, preset?.id]);

  const previewProtein = useMemo(
    () =>
      preset
        ? calcProteinG({
            amountG,
            proteinPer100g,
            basis: "per_100g",
          })
        : 0,
    [preset, amountG, proteinPer100g],
  );

  const handleSave = async () => {
    if (!preset || proteinPer100g <= 0 || amountG <= 0) {
      setError(t("recovery.sheet.protein.invalid"));
      return;
    }
    if (previewProtein <= 0) {
      setError(t("recovery.sheet.protein.amountInvalid"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createProteinLog(userId, {
        proteinG: previewProtein,
        label: preset.label,
        amountG,
        source: logSource,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("recovery.sheet.protein.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (!preset) return null;

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={t("recovery.sheet.preset.aria", { label: preset.label })}>
      <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 20, marginBottom: 8 }}>{preset.label}</div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut, lineHeight: 1.45 }}>
        {t("recovery.sheet.preset.description")}
      </p>

      {error ? (
        <div style={{ color: M.danger, fontSize: 13, marginBottom: 12, lineHeight: 1.45 }}>{error}</div>
      ) : null}

      <NutritionStepperStack
        fields={[
          {
            id: "proteinPer100g",
            label: t("recovery.sheet.protein.per100"),
            value: Math.round(proteinPer100g * 10) / 10,
            step: 0.5,
            min: 0.5,
            onChange: setProteinPer100g,
          },
          {
            id: "amountG",
            label: preset.amountHint ?? t("recovery.sheet.protein.amount"),
            value: amountG,
            step: preset.id === "shake" ? 5 : 10,
            min: 5,
            onChange: setAmountG,
          },
        ]}
      />
      <div style={{ fontSize: 14, color: M.brand, fontWeight: 700, marginTop: 16, marginBottom: 16, textAlign: "center" }}>
        {t("recovery.sheet.protein.preview", { amount: previewProtein })}
      </div>
      <MButton type="button" variant="primary" size="md" fullWidth disabled={busy} onClick={() => void handleSave()}>
        {t("recovery.sheet.protein.add")}
      </MButton>
    </BottomSheet>
  );
}
