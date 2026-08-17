import { useState, type CSSProperties } from "react";
import { M } from "../theme";
import { Icon } from "./Icon";
import { useI18n } from "../lib/i18n";

export interface OneRmPercentInfoCardProps {
  compact?: boolean;
  style?: CSSProperties;
  defaultOpen?: boolean;
}

export function OneRmPercentInfoCard({ compact = false, style, defaultOpen = false }: OneRmPercentInfoCardProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid " + M.line,
        background: M.card,
        overflow: "hidden",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: compact ? "12px 14px" : "14px 16px",
          border: "none",
          borderBottom: open ? "1px solid " + M.line2 : "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
          font: "inherit",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <Icon name="calculator" size={18} color={M.acc} stroke={2} />
          <span
            style={{
              fontFamily: M.numeric,
              fontWeight: 700,
              fontSize: compact ? 14 : 15,
              letterSpacing: 0.3,
              color: M.acc,
            }}
          >
            {t("oneRm.infoTitle")}
          </span>
        </div>
        <Icon name={open ? "chevD" : "chevR"} size={16} color={M.mut2} stroke={2.2} style={{ flexShrink: 0 }} />
      </button>

      {open && (
        <div
          style={{
            padding: compact ? "12px 14px" : "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: compact ? 8 : 10,
          }}
        >
          <p style={{ margin: 0, fontSize: compact ? 12.5 : 13.5, lineHeight: 1.55, color: M.fg }}>
            {t("oneRm.infoText")}
          </p>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: M.accSoft,
              fontSize: compact ? 12 : 12.5,
              lineHeight: 1.5,
              color: M.fg,
            }}
          >
            <span style={{ fontWeight: 700, color: M.acc }}>{t("oneRm.howTitle")}</span>{" "}
            {t("oneRm.howText")}
          </div>

          <p style={{ margin: 0, fontSize: compact ? 11.5 : 12, lineHeight: 1.45, color: M.mut }}>
            {t("oneRm.planHint")}
          </p>
        </div>
      )}
    </div>
  );
}
