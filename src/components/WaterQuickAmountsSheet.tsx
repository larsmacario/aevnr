import { useEffect, useState } from "react";
import {
  clampWaterQuickAmountMl,
  DEFAULT_WATER_QUICK_AMOUNTS_ML,
  WATER_QUICK_AMOUNT_MIN_ML,
  WATER_TARGET_STEP_ML,
  type WaterQuickAmounts,
} from "../lib/hydration";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { NutritionStepperStack } from "./NutritionStepperStack";
import { useI18n } from "../lib/i18n";

export interface WaterQuickAmountsSheetProps {
  open: boolean;
  amountsMl: WaterQuickAmounts;
  onClose: () => void;
  onSave: (amountsMl: WaterQuickAmounts) => void | Promise<void>;
}

export function WaterQuickAmountsSheet({ open, amountsMl, onClose, onSave }: WaterQuickAmountsSheetProps) {
  const { t } = useI18n();
  const [values, setValues] = useState<WaterQuickAmounts>(amountsMl);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues([...amountsMl]);
    setBusy(false);
  }, [open, amountsMl]);

  const setAmount = (index: number, value: number) => {
    setValues((current) => {
      const next = [...current] as WaterQuickAmounts;
      next[index] = clampWaterQuickAmountMl(value);
      return next;
    });
  };

  const save = async (next: WaterQuickAmounts) => {
    setBusy(true);
    try {
      await onSave(next);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={t("recovery.sheet.quick.aria")}>
      <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 20, marginBottom: 8 }}>{t("recovery.sheet.quick.title")}</div>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut, lineHeight: 1.45 }}>
        {t("recovery.sheet.quick.description")}
      </p>
      <NutritionStepperStack
        fields={values.map((value, index) => ({
          id: `quickAmount${index}`,
          label: t("recovery.sheet.quick.amount", { number: index + 1 }),
          value,
          step: WATER_TARGET_STEP_ML,
          min: WATER_QUICK_AMOUNT_MIN_ML,
          onChange: (next) => setAmount(index, next),
        }))}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <MButton
          type="button"
          variant="secondary"
          size="md"
          disabled={busy}
          onClick={() => setValues([...DEFAULT_WATER_QUICK_AMOUNTS_ML])}
          style={{ flex: 1 }}
        >
          {t("recovery.sheet.quick.default")}
        </MButton>
        <MButton type="button" variant="primary" size="md" disabled={busy} onClick={() => void save(values)} style={{ flex: 1 }}>
          {t("recovery.sheet.save")}
        </MButton>
      </div>
    </BottomSheet>
  );
}
