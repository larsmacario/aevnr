import { formatWaterAmount } from "../lib/hydration";
import { M } from "../theme";
import { BottomSheet } from "./BottomSheet";
import { Icon } from "./Icon";
import { MButton } from "./MButton";
import { useI18n } from "../lib/i18n";

export interface QuickTrackingSheetProps {
  open: boolean;
  proteinToday: number;
  proteinTargetG: number;
  waterTodayMl: number;
  waterTargetMl: number;
  waterQuickAmountsMl: readonly number[];
  waterBusy?: boolean;
  onClose: () => void;
  onOpenExpress: () => void;
  onOpenProtein: () => void;
  onAddWater: (amountMl: number) => void;
  onOpenWaterAmount: () => void;
}

function Progress({ label, value, target, icon }: { label: string; value: string; target: string; icon: string }) {
  const { t } = useI18n();
  return (
    <div style={{ flex: 1, minWidth: 0, padding: "12px", borderRadius: 14, background: M.cardHi }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: M.mut, fontSize: 12, fontWeight: 700, letterSpacing: 0.6 }}>
        <Icon name={icon} size={15} color={M.mut} stroke={2} />
        {label}
      </div>
      <div style={{ marginTop: 7, color: M.fg, fontSize: 17, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ marginTop: 2, color: M.mut, fontSize: 12 }}>{t("quick.of", { target })}</div>
    </div>
  );
}

export function QuickTrackingSheet({
  open,
  proteinToday,
  proteinTargetG,
  waterTodayMl,
  waterTargetMl,
  waterQuickAmountsMl,
  waterBusy = false,
  onClose,
  onOpenExpress,
  onOpenProtein,
  onAddWater,
  onOpenWaterAmount,
}: QuickTrackingSheetProps) {
  const { locale, t } = useI18n();
  return (
    <BottomSheet open={open} onClose={onClose} aria-label={t("quick.title")}>
      <div style={{ fontFamily: M.display, fontWeight: 650, fontSize: 20, color: M.fg }}>{t("quick.title")}</div>
      <p style={{ margin: "6px 0 16px", color: M.mut, fontSize: 13, lineHeight: 1.45 }}>
        {t("quick.description")}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <Progress label={t("quick.protein")} value={`${proteinToday} g`} target={`${proteinTargetG} g`} icon="flame" />
        <Progress label={t("quick.water")} value={formatWaterAmount(waterTodayMl, locale)} target={formatWaterAmount(waterTargetMl, locale)} icon="droplet" />
      </div>

      <MButton type="button" variant="primary" size="md" fullWidth onClick={onOpenExpress} style={{ borderRadius: 14, justifyContent: "flex-start", paddingLeft: 16 }}>
        <Icon name="dumbbell" size={18} stroke={2} />
        {t("quick.startExpress")}
      </MButton>

      <div style={{ marginTop: 18, marginBottom: 9, color: M.mut, fontSize: 12, fontWeight: 700, letterSpacing: 1.1 }}>{t("quick.nutrition")}</div>
      <MButton type="button" variant="secondary" size="md" fullWidth onClick={onOpenProtein} style={{ borderRadius: 14, justifyContent: "flex-start", paddingLeft: 16 }}>
        <Icon name="flame" size={18} stroke={2} />
        {t("quick.trackProtein")}
      </MButton>

      <div style={{ marginTop: 15, marginBottom: 9, color: M.mut, fontSize: 12, fontWeight: 700, letterSpacing: 1.1 }}>{t("quick.addWater")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {waterQuickAmountsMl.map((amountMl, index) => (
          <MButton key={`${index}-${amountMl}`} type="button" variant="secondary" size="md" disabled={waterBusy} onClick={() => onAddWater(amountMl)}>
            +{amountMl} ml
          </MButton>
        ))}
      </div>
      <MButton type="button" variant="ghost" size="md" fullWidth disabled={waterBusy} onClick={onOpenWaterAmount} style={{ marginTop: 8, color: M.fg }}>
        {t("quick.otherAmount")}
      </MButton>
    </BottomSheet>
  );
}
