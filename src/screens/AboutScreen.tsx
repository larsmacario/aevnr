import { APP_NAME, M } from "../theme";
import { AppLogo } from "../components/AppLogo";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { ScreenBackHeader } from "../components/ScreenScroll";
import {
  BLOCK_ACCENT,
  BLOCK_ORDER,
} from "../lib/planBlocks";
import { useI18n } from "../lib/i18n";

export interface AboutScreenProps {
  onBack: () => void;
}

export function AboutScreen({ onBack }: AboutScreenProps) {
  const { t } = useI18n();
  const efficiencyTips = [1, 2, 3].map((index) => ({
    title: t(`about.tip${index}.title` as "about.tip1.title"),
    text: t(`about.tip${index}.text` as "about.tip1.text"),
  }));
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader onBack={onBack} title={t("about.title", { app: APP_NAME.toUpperCase() })} />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `8px 22px ${SCROLL_BOTTOM_PADDING}px`,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <AppLogo variant="wordmark" size={48} style={{ margin: "0 auto 16px", justifyContent: "center" }} />
          <p
            style={{
              margin: 0,
              fontFamily: M.display,
              fontSize: 28,
              fontWeight: 400,
              lineHeight: 1.1,
              color: M.fg,
            }}
          >
            {t("about.tagline1")}
            <br />
            <span style={{ color: M.acc }}>{t("about.tagline2")}</span>
          </p>
        </div>

        <div
          style={{
            background: M.card,
            border: "1px solid " + M.line2,
            borderRadius: 16,
            padding: "14px 16px 18px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              fontSize: 13,
              letterSpacing: 1.4,
              color: M.mut,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            {t("about.whyTitle", { app: APP_NAME.toUpperCase() })}
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.6, color: M.mut }}>
            {t("about.why1", { app: APP_NAME })}
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.6, color: M.mut }}>
            {t("about.why2")}
          </p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: M.mut }}>
            {t("about.why3", { app: APP_NAME })}
          </p>
        </div>

        <div
          style={{
            fontSize: 13,
            letterSpacing: 1.4,
            color: M.mut,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          {t("about.blocks")}
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
          {BLOCK_ORDER.map((block, index) => {
            const accent = BLOCK_ACCENT[block];
            const prefix = `about.block.${block}` as const;
            return (
              <div
                key={block}
                style={{
                  background: M.card,
                  border: "1px solid " + M.line2,
                  borderRadius: 14,
                  padding: "14px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      flex: "0 0 auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: M.brandSoft,
                      color: M.brand,
                      fontFamily: M.display,
                      fontWeight: 400,
                      fontSize: 14,
                    }}
                    aria-hidden
                  >
                    {index + 1}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: accent,
                      }}
                    >
                      {t(`${prefix}.label` as "about.block.warmup.label")}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: M.mut2,
                        marginTop: 3,
                        lineHeight: 1.4,
                      }}
                    >
                      {t(`${prefix}.hint` as "about.block.warmup.hint")}
                    </div>
                    <p style={{ margin: "10px 0 8px", fontSize: 14, lineHeight: 1.55, color: M.mut }}>
                      <strong style={{ color: M.fg, fontWeight: 600 }}>{t("about.what")}</strong>{" "}
                      {t(`${prefix}.what` as "about.block.warmup.what")}
                    </p>
                    <p style={{ margin: "0 0 8px", fontSize: 14, lineHeight: 1.55, color: M.mut }}>
                      <strong style={{ color: M.fg, fontWeight: 600 }}>{t("about.why")}</strong>{" "}
                      {t(`${prefix}.why` as "about.block.warmup.why")}
                    </p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: M.mut2 }}>
                      <strong style={{ color: M.fg, fontWeight: 600 }}>{t("about.efficient")}</strong>{" "}
                      {t(`${prefix}.efficient` as "about.block.warmup.efficient")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            fontSize: 13,
            letterSpacing: 1.4,
            color: M.mut,
            fontWeight: 700,
            marginBottom: 12,
          }}
        >
          {t("about.tips")}
        </div>

        <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
          {efficiencyTips.map((tip) => (
            <div
              key={tip.title}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background: M.panel,
                border: "1px solid " + M.line2,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: M.fg, marginBottom: 4 }}>{tip.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.45, color: M.mut }}>{tip.text}</div>
            </div>
          ))}
        </div>

        <p
          style={{
            textAlign: "center",
            fontSize: 13,
            color: M.mut2,
            letterSpacing: 0.5,
            margin: 0,
          }}
        >
          {t("about.version", { version: __APP_VERSION__ })}
        </p>
        <p
          style={{
            marginTop: 8,
            textAlign: "center",
            fontSize: 13,
            color: M.mut2,
          }}
        >
          {t("about.author")}
        </p>
      </div>
    </div>
  );
}
