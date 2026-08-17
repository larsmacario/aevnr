import { useEffect, useState } from "react";
import { M } from "../../theme";
import { useAuth } from "../../lib/auth";
import { useContentColumnStyle } from "../../lib/responsive";
import { AppLogo } from "../../components/AppLogo";
import { MButton } from "../../components/MButton";
import { useI18n } from "../../lib/i18n";

export type AuthStep = "login" | "signup" | "forgot" | "reset";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  background: M.card,
  color: M.fg,
  fontFamily: M.body,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
};

const linkBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: M.acc,
  fontFamily: M.body,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  padding: 0,
};

type AuthFlowProps = {
  initialStep?: AuthStep;
};

export function AuthFlow({ initialStep = "login" }: AuthFlowProps) {
  const { t } = useI18n();
  const auth = useAuth();
  const columnStyle = useContentColumnStyle();
  const [step, setStep] = useState<AuthStep>(initialStep);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    setError(null);
    setInfo(null);
  }, [step]);

  const submitLogin = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await auth.signIn(email.trim(), password);
    setBusy(false);
    if (err) setError(err);
  };

  const submitSignup = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await auth.signUp(email.trim(), password, {
      displayName: displayName.trim() || undefined,
    });
    setBusy(false);
    if (err) setError(err);
  };

  const submitForgot = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await auth.requestPasswordReset(email.trim());
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setInfo(t("auth.codeSent"));
    setStep("reset");
  };

  const submitReset = async () => {
    setBusy(true);
    setError(null);
    const { error: verifyErr } = await auth.verifyResetToken(email.trim(), token.trim());
    if (verifyErr) {
      setBusy(false);
      setError(verifyErr);
      return;
    }
    const { error: pwErr } = await auth.updatePassword(newPassword);
    setBusy(false);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    setInfo(t("auth.passwordUpdated"));
    setStep("login");
    setToken("");
    setNewPassword("");
  };

  const titles: Record<AuthStep, string> = {
    login: t("auth.title.login"),
    signup: t("auth.title.signup"),
    forgot: t("auth.title.forgot"),
    reset: t("auth.title.reset"),
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: M.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 22px",
        boxSizing: "border-box",
      }}
    >
      <div style={columnStyle}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          <AppLogo size={52} />
        </div>

        <div style={{ fontFamily: M.display, fontWeight: 400, fontSize: 26, marginBottom: 18 }}>{titles[step]}</div>

        {error && (
          <div
            style={{
              background: M.dangerSoft,
              border: "1px solid M.dangerBorder",
              borderRadius: 12,
              padding: "12px 14px",
              color: M.danger,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}
        {info && (
          <div
            style={{
              background: M.accSoft,
              border: "1px solid " + M.line,
              borderRadius: 12,
              padding: "12px 14px",
              color: M.acc,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {info}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(step === "login" || step === "signup" || step === "forgot" || step === "reset") && (
            <input
              type="email"
              placeholder={t("auth.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              style={inputStyle}
            />
          )}

          {step === "signup" && (
            <input
              type="text"
              placeholder={t("auth.displayName")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              style={inputStyle}
            />
          )}

          {(step === "login" || step === "signup") && (
            <input
              type="password"
              placeholder={t("auth.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={step === "signup" ? "new-password" : "current-password"}
              style={inputStyle}
            />
          )}

          {step === "reset" && (
            <>
              <input
                type="text"
                placeholder={t("auth.resetCode")}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                style={inputStyle}
              />
              <input
                type="password"
                placeholder={t("auth.newPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                style={inputStyle}
              />
            </>
          )}
        </div>

        {step === "login" && (
          <>
            <MButton disabled={busy} onClick={submitLogin} variant="primary" size="md" fullWidth style={{ marginTop: 8 }}>
              {t("auth.action.login")}
            </MButton>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button type="button" style={linkBtn} onClick={() => setStep("forgot")}>
                {t("auth.forgot")}
              </button>
              <button type="button" style={linkBtn} onClick={() => setStep("signup")}>
                {t("auth.create")}
              </button>
            </div>
          </>
        )}

        {step === "signup" && (
          <>
            <MButton disabled={busy} onClick={submitSignup} variant="primary" size="md" fullWidth style={{ marginTop: 8 }}>
              {t("auth.action.signup")}
            </MButton>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" style={linkBtn} onClick={() => setStep("login")}>
                {t("auth.hasAccount")}
              </button>
            </div>
          </>
        )}

        {step === "forgot" && (
          <>
            <MButton disabled={busy} onClick={submitForgot} variant="primary" size="md" fullWidth style={{ marginTop: 8 }}>
              {t("auth.action.sendCode")}
            </MButton>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" style={linkBtn} onClick={() => setStep("login")}>
                {t("auth.backToLogin")}
              </button>
            </div>
          </>
        )}

        {step === "reset" && (
          <>
            <MButton disabled={busy} onClick={submitReset} variant="primary" size="md" fullWidth style={{ marginTop: 8 }}>
              {t("auth.action.savePassword")}
            </MButton>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" style={linkBtn} onClick={() => setStep("login")}>
                {t("auth.backToLogin")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
