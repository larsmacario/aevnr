import { M } from "../theme";
import { Icon } from "./Icon";
import { MButton } from "./MButton";
import { useI18n } from "../lib/i18n";

export interface AiConsentStepProps {
  onOpenPrivacy: () => void;
  onAccept?: () => void;
  onBack?: () => void;
  /** Settings-Sheet: Buttons inline anzeigen. Im Wizard übernimmt der Footer die Aktion. */
  showActions?: boolean;
  saving?: boolean;
}

export function AiConsentStep({
  onOpenPrivacy,
  onAccept,
  onBack,
  showActions = false,
  saving = false,
}: AiConsentStepProps) {
  const { t } = useI18n();
  const dataCategories = ["aiConsent.data.anamnesis", "aiConsent.data.body", "aiConsent.data.profile", "aiConsent.data.goal", "aiConsent.data.history", "aiConsent.data.feedback", "aiConsent.data.photos"] as const;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: M.brandSoft,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: M.brand,
            }}
          >
            <Icon name="sparkles" size={24} color={M.brand} />
          </div>
        </div>
        <h2
          style={{
            fontFamily: M.label,
            fontSize: 24,
            fontWeight: 700,
            margin: "0 0 6px 0",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            textAlign: "center",
          }}
        >
          {t("aiConsent.title")}
        </h2>
        <p style={{ color: M.mut, fontSize: 14, margin: 0, lineHeight: 1.5, textAlign: "center" }}>
          {t("aiConsent.description")}
        </p>
      </div>

      <div
        style={{
          padding: "14px 16px",
          borderRadius: 14,
          background: M.card,
          border: "1px solid " + M.line,
        }}
      >
        <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 8 }}>
          {t("aiConsent.provider")}
        </div>
        <p style={{ color: M.fg, fontSize: 14, margin: "0 0 12px 0", lineHeight: 1.45 }}>
          <strong>Anthropic, PBC</strong> (San Francisco, USA)
        </p>

        <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 8 }}>
          {t("aiConsent.purpose")}
        </div>
        <p style={{ color: M.fg, fontSize: 14, margin: "0 0 12px 0", lineHeight: 1.45 }}>
          {t("aiConsent.purposeText")}
        </p>

        <div style={{ fontSize: 13, letterSpacing: 1.4, color: M.mut, fontWeight: 700, marginBottom: 8 }}>
          {t("aiConsent.data")}
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, color: M.fg, fontSize: 13.5, lineHeight: 1.5 }}>
          {dataCategories.map((item) => (
            <li key={item} style={{ marginBottom: 6 }}>
              {t(item)}
            </li>
          ))}
        </ul>
      </div>

      <p style={{ color: M.mut2, fontSize: 13, lineHeight: 1.45, margin: 0 }}>
        {t("aiConsent.privacyPrefix")}{" "}
        <button
          type="button"
          onClick={onOpenPrivacy}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            color: M.mut,
            fontSize: "inherit",
            fontFamily: "inherit",
            textDecoration: "underline",
            textUnderlineOffset: 2,
            cursor: "pointer",
          }}
        >
          {t("aiConsent.privacy")}
        </button>
        .
      </p>

      {showActions && onAccept && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <MButton type="button" onClick={onAccept} variant="primary" size="md" fullWidth disabled={saving}>
            {saving ? t("aiConsent.saving") : t("aiConsent.accept")}
          </MButton>
          {onBack && (
            <MButton type="button" onClick={onBack} variant="ghost" size="md" fullWidth disabled={saving}>
              {t("common.cancel")}
            </MButton>
          )}
        </div>
      )}
    </div>
  );
}
