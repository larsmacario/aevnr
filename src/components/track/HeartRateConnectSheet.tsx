import { APP_NAME, M } from "../../theme";
import { BottomSheet } from "../BottomSheet";
import { MButton } from "../MButton";
import { Icon } from "../Icon";
import type { HeartRateConnectionStatus } from "../../lib/heartRate/bleHeartRate";
import { useI18n } from "../../lib/i18n";

export interface HeartRateConnectSheetProps {
  open: boolean;
  onClose: () => void;
  status: HeartRateConnectionStatus;
  bpm: number | null;
  deviceName: string | null;
  isSupported: boolean;
  isBusy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function HeartRateConnectSheet({
  open,
  onClose,
  status,
  bpm,
  deviceName,
  isSupported,
  isBusy,
  onConnect,
  onDisconnect,
}: HeartRateConnectSheetProps) {
  const { t } = useI18n();
  const connected = status === "connected";

  return (
    <BottomSheet open={open} onClose={onClose} position="absolute" zIndex={40} aria-label={t("heartRate.sensor")}>
      <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 22, color: M.fg, marginBottom: 8 }}>
        {t("heartRate.sensor")}
      </div>
      <p style={{ color: M.mut, fontSize: 14, lineHeight: 1.45, margin: "0 0 18px" }}>
        {t("heartRate.description")}
      </p>

      {!isSupported ? (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: M.panel,
            border: "1px solid " + M.line2,
            color: M.mut,
            fontSize: 14,
            lineHeight: 1.45,
            marginBottom: 16,
          }}
        >
          {t("heartRate.unsupported", { app: APP_NAME })}
        </div>
      ) : connected ? (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: M.panel,
            border: "1px solid " + M.brandBorder,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="heart" size={20} fill={M.brand} color={M.brand} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: M.fg, fontSize: 15 }}>{deviceName ?? t("heartRate.connected")}</div>
              <div style={{ color: M.mut, fontSize: 13, marginTop: 4 }}>
                {bpm != null ? `${bpm} bpm` : t("heartRate.waiting")}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 14,
            background: M.panel,
            border: "1px solid " + M.line2,
            color: M.mut,
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {status === "connecting"
            ? t("heartRate.connecting")
            : t("heartRate.disconnected")}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {connected ? (
          <MButton type="button" variant="secondary" size="md" fullWidth disabled={isBusy} onClick={onDisconnect}>
            {t("heartRate.disconnect")}
          </MButton>
        ) : (
          <MButton
            type="button"
            variant="primary"
            size="md"
            fullWidth
            disabled={!isSupported || isBusy}
            onClick={onConnect}
          >
            <Icon name="heart" size={16} color={M.brandInk} /> {t("heartRate.connect")}
          </MButton>
        )}
        <MButton type="button" variant="ghost" size="md" fullWidth onClick={onClose}>
          {t("heartRate.close")}
        </MButton>
      </div>
    </BottomSheet>
  );
}
