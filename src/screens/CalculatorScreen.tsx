import { OneRmCalculatorBody } from "../components/OneRmCalculatorBody";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { useI18n } from "../lib/i18n";

export interface CalculatorScreenProps {
  onBack: () => void;
}

export function CalculatorScreen({ onBack }: CalculatorScreenProps) {
  const { t } = useI18n();
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader onBack={onBack} title={t("oneRm.screenTitle")} />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `0 22px ${SCROLL_BOTTOM_PADDING}px`,
        }}
      >
        <OneRmCalculatorBody />
      </div>
    </div>
  );
}
