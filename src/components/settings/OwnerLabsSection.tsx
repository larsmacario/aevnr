import {
  medianMs,
  readFrictionMetricsLog,
  useOwnerLabs,
  type FrictionSessionMetrics,
} from "../../lib/ownerLabs";
import { M } from "../../theme";
import { MSwitch } from "../widgets";
import { useI18n } from "../../lib/i18n";

function formatMetricsSummary(entry: FrictionSessionMetrics, t: ReturnType<typeof useI18n>["t"]): string {
  const med = medianMs(entry.setDurationsMs);
  const medStr = med != null ? t("ownerLabs.median", { seconds: (med / 1000).toFixed(1) }) : "—";
  return t("ownerLabs.summary", { mode: entry.mode, sets: entry.setsLogged, taps: entry.tapCount, overrides: entry.overrideCount, median: medStr });
}

export function OwnerLabsSection() {
  const { t } = useI18n();
  const { flags, updateFlags } = useOwnerLabs(null);
  const metricsLog = readFrictionMetricsLog();

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 0",
          borderBottom: "1px solid " + M.line2,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{t("ownerLabs.frictionTitle")}</div>
          <div style={{ color: M.mut, fontSize: 13, marginTop: 3, lineHeight: 1.45 }}>
            {t("ownerLabs.frictionText")}
          </div>
        </div>
        <MSwitch
          checked={flags.frictionKillerTurbo}
          onChange={(v) => updateFlags({ frictionKillerTurbo: v })}
        />
      </div>

      <div style={{ padding: "12px 0", borderBottom: metricsLog.length ? "1px solid " + M.line2 : "none" }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{t("ownerLabs.testTitle")}</div>
        <div style={{ color: M.mut, fontSize: 13, lineHeight: 1.5 }}>
          {t("ownerLabs.testA")}
          <br />
          {t("ownerLabs.testB")}
        </div>
      </div>

      {metricsLog.length > 0 ? (
        <div style={{ paddingTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, color: M.mut, marginBottom: 8 }}>
            {t("ownerLabs.recent")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {metricsLog.slice(0, 5).map((entry, i) => (
              <div
                key={`${entry.startedAt}-${i}`}
                style={{
                  fontSize: 13,
                  color: M.mut2,
                  lineHeight: 1.45,
                  fontFamily: M.body,
                }}
              >
                {formatMetricsSummary(entry, t)}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
