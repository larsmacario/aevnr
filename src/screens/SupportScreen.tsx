import { useEffect, useState } from "react";
import { M } from "../theme";
import { Icon } from "../components/Icon";
import { useAuth } from "../lib/auth";
import { submitSupportRequest, type SupportCategory } from "../lib/support";
import { MButton } from "../components/MButton";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { useI18n } from "../lib/i18n";
import type { TranslationKey } from "../locales/de";

const CATEGORIES = [
  { id: "bug", label: "Bug" },
  { id: "question", label: "Frage" },
  { id: "feedback", label: "Feedback" },
  { id: "account", label: "Konto" },
  { id: "other", label: "Sonstiges" },
] as const;

type CategoryId = SupportCategory;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  background: M.card,
  color: M.fg,
  fontFamily: M.body,
  fontSize: 16,
  outline: "none",
  boxSizing: "border-box",
  WebkitAppearance: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontSize: 13,
  letterSpacing: 1.2,
  color: M.mut,
  fontWeight: 700,
};

export interface SupportScreenProps {
  onBack: () => void;
}

export function SupportScreen({ onBack }: SupportScreenProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [category, setCategory] = useState<CategoryId>("question");
  const [email, setEmail] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    if (!trimmedEmail.includes("@")) {
      setError(t("support.error.email"));
      return;
    }
    if (trimmedMessage.length < 10) {
      setError(t("support.error.message"));
      return;
    }
    if (!user?.id) {
      setError(t("support.error.auth"));
      return;
    }

    setSubmitting(true);
    try {
      await submitSupportRequest({
        userId: user.id,
        category,
        contactEmail: trimmedEmail,
        message: trimmedMessage,
      });
      setSent(true);
    } catch {
      setError(t("support.error.send"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader onBack={onBack} title={t("support.title")} />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `4px 22px ${SCROLL_BOTTOM_PADDING}px`,
        }}
      >
        {sent ? (
          <div
            style={{
              marginTop: 24,
              padding: "24px 20px",
              borderRadius: 16,
              background: M.card,
              border: "1px solid " + M.line2,
              textAlign: "center",
            }}
          >
            <Icon name="check" size={32} stroke={2.5} color={M.acc} />
            <p
              style={{
                margin: "16px 0 8px",
                fontFamily: M.display,
                fontSize: 24,
                fontWeight: 400,
                color: M.fg,
              }}
            >
              {t("support.thanks")}
            </p>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: M.mut }}>
              {t("support.received", { email: email.trim() || t("support.yourAddress") })}
            </p>
            <MButton type="button" onClick={onBack} variant="primary" size="md" fullWidth style={{ marginTop: 20 }}>
              {t("common.back")}
            </MButton>
          </div>
        ) : (
          <>
            <p style={{ margin: "0 0 20px", fontSize: 15, lineHeight: 1.55, color: M.mut }}>
              {t("support.intro")}
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <span style={labelStyle}>{t("support.topic")}</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {CATEGORIES.map((c) => {
                    const active = category === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 999,
                          border: "1px solid " + (active ? M.acc : M.line2),
                          background: active ? "color-mix(in oklab, " + M.acc + " 18%, transparent)" : M.panel,
                          color: active ? M.acc : M.mut,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {t(`support.category.${c.id}` as TranslationKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="support-email">
                  {t("support.email")}
                </label>
                <input
                  id="support-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle} htmlFor="support-message">
                  {t("support.message")}
                </label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  placeholder={t("support.placeholder")}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    minHeight: 140,
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {error ? (
                <p style={{ margin: "0 0 12px", fontSize: 14, color: M.danger }}>{error}</p>
              ) : null}

              <MButton type="submit" disabled={submitting} variant="primary" size="md" fullWidth loading={submitting}>
                {submitting ? t("support.sending") : t("support.send")}
              </MButton>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
