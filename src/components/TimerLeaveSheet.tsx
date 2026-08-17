import { M } from "../theme";
import { Icon } from "./Icon";
import { BottomSheet } from "./BottomSheet";
import { MButton } from "./MButton";
import { useI18n } from "../lib/i18n";

export interface TimerLeaveSheetProps {
  open?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
}

export function TimerLeaveSheet({
  open = true,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel,
}: TimerLeaveSheetProps) {
  const { t } = useI18n();
  const resolvedTitle = title ?? t("timerLeave.title");
  const resolvedMessage = message ?? t("timerLeave.message");
  const resolvedConfirmLabel = confirmLabel ?? t("timerLeave.confirm");
  return (
    <BottomSheet open={open} onClose={onCancel} position="absolute" zIndex={40} aria-label={resolvedTitle}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          background: M.accSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
          flexShrink: 0,
        }}
      >
        <Icon name="timer" size={22} stroke={2.2} color={M.acc} />
      </div>
      <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 22, marginBottom: 8, flexShrink: 0 }}>{resolvedTitle}</div>
      <div style={{ color: M.mut, fontSize: 14, marginBottom: 18, lineHeight: 1.45, flexShrink: 0 }}>{resolvedMessage}</div>
      <MButton type="button" onClick={onConfirm} variant="primary" size="md" fullWidth style={{ marginBottom: 10, flexShrink: 0 }}>
        {resolvedConfirmLabel}
      </MButton>
      <MButton type="button" onClick={onCancel} variant="ghost" size="md" fullWidth style={{ flexShrink: 0 }}>
        {t("common.cancel")}
      </MButton>
    </BottomSheet>
  );
}
