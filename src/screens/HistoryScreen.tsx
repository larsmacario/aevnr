import { useEffect } from "react";
import { M } from "../theme";
import { useSessions } from "../lib/db";
import { formatTimerHistorySubtitle, isTimerSession } from "../lib/timerSession";
import { Icon } from "../components/Icon";
import { MStat } from "../components/widgets";
import { floatNavContentInset } from "../components/FloatNav";
import { MButton } from "../components/MButton";
import { useI18n } from "../lib/i18n";

export interface HistoryScreenProps {
  onOpenSession: (sessionId: string) => void;
  onOpenStats: () => void;
  refreshKey?: number;
}

export function HistoryScreen({ onOpenSession, onOpenStats, refreshKey = 0 }: HistoryScreenProps) {
  const { t } = useI18n();
  const { data: history, loading, error, reload } = useSessions();

  useEffect(() => {
    reload();
  }, [refreshKey, reload]);

  const list = history ?? [];
  const totV = list.reduce((a, h) => a + h.vol, 0);
  const totT = list.reduce((a, h) => a + h.dur, 0);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "4px 22px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontFamily: M.numeric, fontWeight: 700, fontSize: 30, lineHeight: 1 }}>{t("history.title")}</div>
          <MButton type="button" onClick={onOpenStats} variant="secondary" size="sm" style={{ flexShrink: 0, color: M.fg }}>
            {t("history.stats")}
            <Icon name="chevR" size={12} color={M.mut} stroke={2.2} />
          </MButton>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <MStat label={t("home.stats.sessions").toLocaleUpperCase()} value={list.length} sub={t("history.total")} />
          <MStat label={t("home.stats.volume")} value={`${totV.toFixed(1)}t`} sub={t("history.total")} />
          <MStat label={t("history.time")} value={list.length ? `${(totT / 60).toFixed(1)}h` : "0h"} sub={t("history.trained")} />
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `0 22px ${floatNavContentInset("bottom")}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {loading && <div style={{ color: M.mut, fontSize: 14 }}>{t("history.loading")}</div>}
        {error && <div style={{ color: M.danger, fontSize: 14 }}>{error}</div>}
        {!loading && list.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: M.mut,
              textAlign: "center",
              padding: "40px 20px",
              gap: 12,
              marginTop: 24,
            }}
          >
            <Icon name="list" size={32} color={M.mut2} stroke={2} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>{t("history.empty")}</div>
            <div style={{ fontSize: 13 }}>{t("history.emptyDetail")}</div>
          </div>
        )}
        {list.map((h) => (
          <button
            key={h.id}
            onClick={() => onOpenSession(h.id)}
            style={{
              width: "100%",
              textAlign: "left",
              background: h.pr ? M.accSoft : M.card,
              border: "1px solid " + (h.pr ? M.acc : M.line2),
              borderLeft: h.pr ? "3px solid " + M.acc : "1px solid " + M.line2,
              borderRadius: 14,
              padding: "12px 14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div
                  style={{
                    fontFamily: M.label,
                    fontWeight: 700,
                    fontSize: 20,
                    lineHeight: 1.1,
                    letterSpacing: 0.2,
                    color: M.fg,
                  }}
                >
                  {h.name}
                </div>
                {h.pr && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: 0.6,
                      color: M.accInk,
                      background: M.acc,
                      padding: "2px 7px",
                      borderRadius: 6,
                    }}
                  >
                    PR
                  </span>
                )}
              </div>
              <div style={{ fontSize: 14, color: M.mut, marginTop: 5, fontWeight: 600 }}>
                {h.day} · {h.date} ·{" "}
                {isTimerSession(h.tags)
                  ? formatTimerHistorySubtitle(h)
                  : t("history.sessionMeta", { minutes: h.dur, volume: h.vol.toFixed(1), sets: h.sets })}
              </div>
            </div>
            <Icon name="chevR" size={20} color={M.mut2} stroke={2.2} />
          </button>
        ))}
      </div>
    </div>
  );
}
