import { useEffect, useMemo, useRef, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { Icon } from "../components/Icon";
import { usePreferences } from "../lib/preferences";
import { MButton } from "../components/MButton";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { floatNavContentInset } from "../components/FloatNav";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { UserAvatar } from "../components/UserAvatar";
import { AvatarCropSheet } from "../components/AvatarCropSheet";
import { AvatarActionSheet } from "../components/AvatarActionSheet";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { FACT_TOPICS, type FactTopic } from "../lib/facts";
import { useI18n } from "../lib/i18n";
import type { TranslationKey } from "../locales/de";
export interface ProfileScreenProps {
  onBack: () => void;
  mode?: "push" | "tab";
}

type EditableField = "displayName" | "gender" | "birthDate" | "email";

const rowLabelStyle: React.CSSProperties = {
  fontSize: 13,
  color: M.mut,
  letterSpacing: 0.2,
};

const rowValueStyle: React.CSSProperties = {
  fontSize: 17,
  color: M.fg,
  fontFamily: M.body,
  fontWeight: 650,
  lineHeight: 1.25,
  textAlign: "right",
};

const compactInputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  borderRadius: 10,
  border: "1px solid " + M.line,
  background: M.panel,
  color: M.fg,
  fontFamily: M.body,
  fontSize: 14,
  padding: "0 10px",
  outline: "none",
  boxSizing: "border-box",
};

const smallOutlineBtn: React.CSSProperties = {
  height: 40,
  borderRadius: 9,
  border: "1px solid " + M.line,
  background: "transparent",
  color: M.fg,
  fontFamily: M.label,
  fontSize: 13,
  letterSpacing: 0.6,
  fontWeight: 700,
  padding: "0 12px",
  cursor: "pointer",
};

function formatBirthDate(value: string | null | undefined, locale: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(locale);
}

function capitalizeFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ProfileScreen({ onBack, mode = "push" }: ProfileScreenProps) {
  const { locale, t } = useI18n();
  const {
    user,
    profile,
    signOut,
    deleteAccount,
    updateDisplayName,
    updateBirthDate,
    updateEmail,
    changePassword,
    updateAvatar,
    removeAvatar,
  } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [birthDate, setBirthDate] = useState(profile?.birth_date ?? "");
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(preferences.gender);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyName, setBusyName] = useState(false);
  const [busyBirthDate, setBusyBirthDate] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [busyDelete, setBusyDelete] = useState(false);
  const [avatarActionOpen, setAvatarActionOpen] = useState(false);
  const [cropSheetOpen, setCropSheetOpen] = useState(false);
  const [removeAvatarOpen, setRemoveAvatarOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [avatarCacheKey, setAvatarCacheKey] = useState(0);
  const [factTopicsEditing, setFactTopicsEditing] = useState(false);
  const [factTopicsDraft, setFactTopicsDraft] = useState<FactTopic[]>(preferences.factTopics);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile?.display_name]);

  useEffect(() => {
    setEmail(user?.email ?? "");
  }, [user?.email]);

  useEffect(() => {
    setBirthDate(profile?.birth_date ?? "");
  }, [profile?.birth_date]);

  useEffect(() => {
    setGender(preferences.gender);
  }, [preferences.gender]);

  useEffect(() => {
    if (!factTopicsEditing) setFactTopicsDraft(preferences.factTopics);
  }, [preferences.factTopics, factTopicsEditing]);

  useEffect(() => {
    return () => {
      if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    };
  }, [selectedImageUrl]);

  const clearFeedback = () => {
    setError(null);
    setInfo(null);
  };

  const submitDisplayName = async () => {
    clearFeedback();
    setBusyName(true);
    const { error: err } = await updateDisplayName(displayName);
    setBusyName(false);
    if (err) {
      setError(err);
      return;
    }
    setEditingField(null);
    setInfo(t("profile.saved.name"));
  };

  const submitEmail = async () => {
    clearFeedback();
    setBusyEmail(true);
    const { error: err } = await updateEmail(email);
    setBusyEmail(false);
    if (err) {
      setError(err);
      return;
    }
    setEditingField(null);
    setInfo(t("profile.saved.email"));
  };

  const submitBirthDate = async () => {
    clearFeedback();
    setBusyBirthDate(true);
    const normalized = birthDate.trim() ? birthDate.trim() : null;
    const { error: err } = await updateBirthDate(normalized);
    setBusyBirthDate(false);
    if (err) {
      setError(err);
      return;
    }
    setEditingField(null);
    setInfo(t("profile.saved.birthDate"));
  };

  const submitGender = async () => {
    clearFeedback();
    updatePreferences({ gender }, true);
    setEditingField(null);
    setInfo(t("profile.saved.gender"));
  };

  const toggleFactTopic = (topic: FactTopic) => {
    setFactTopicsDraft((current) => current.includes(topic)
      ? current.filter((entry) => entry !== topic)
      : current.length < 3 ? [...current, topic] : current);
  };

  const saveFactTopics = async () => {
    if (factTopicsDraft.length === 0) {
      setError(t("profile.error.fact"));
      return;
    }
    clearFeedback();
    await updatePreferences({ factTopics: factTopicsDraft }, true);
    setFactTopicsEditing(false);
    setInfo(t("profile.saved.facts"));
  };

  const submitPassword = async () => {
    clearFeedback();
    if (newPassword !== confirmPassword) {
      setError(t("profile.error.passwordMatch"));
      return;
    }
    setBusyPassword(true);
    const { error: err } = await changePassword(currentPassword, newPassword);
    setBusyPassword(false);
    if (err) {
      setError(err);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setInfo(t("profile.saved.password"));
    setPasswordOpen(false);
  };

  const handleDeleteAccount = async () => {
    clearFeedback();
    setBusyDelete(true);
    const { error: err } = await deleteAccount();
    setBusyDelete(false);
    if (err) {
      setDeleteAccountOpen(false);
      setError(err);
      return;
    }
    setDeleteAccountOpen(false);
  };

  const avatarName = displayName || profile?.display_name || t("home.athlete");
  const avatarPath = profile?.avatar_path ?? null;

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarPress = () => {
    clearFeedback();
    if (avatarPath) {
      setAvatarActionOpen(true);
      return;
    }
    openFilePicker();
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(t("profile.error.image"));
      return;
    }
    if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
    const url = URL.createObjectURL(file);
    setSelectedImageUrl(url);
    setCropSheetOpen(true);
  };

  const closeCropSheet = () => {
    setCropSheetOpen(false);
    if (selectedImageUrl) {
      URL.revokeObjectURL(selectedImageUrl);
      setSelectedImageUrl(null);
    }
  };

  const handleAvatarSave = async (blob: Blob) => {
    clearFeedback();
    setBusyAvatar(true);
    const { error: err } = await updateAvatar(blob);
    setBusyAvatar(false);
    if (err) {
      setError(err);
      return;
    }
    setAvatarCacheKey((k) => k + 1);
    closeCropSheet();
    setInfo(t("profile.saved.avatar"));
  };

  const handleRemoveAvatar = async () => {
    clearFeedback();
    setBusyAvatar(true);
    const { error: err } = await removeAvatar();
    setBusyAvatar(false);
    setRemoveAvatarOpen(false);
    if (err) {
      setError(err);
      return;
    }
    setAvatarCacheKey((k) => k + 1);
    setInfo(t("profile.removed.avatar"));
  };

  const profileRows = useMemo(
    () => [
      { key: "displayName", label: t("profile.name"), value: displayName || "—", icon: "user", editable: true },
      { key: "gender", label: t("profile.gender"), value: preferences.gender ? t(`profile.gender.${preferences.gender}` as TranslationKey) : "—", icon: "users", editable: true },
      { key: "birthDate", label: t("profile.birthDate"), value: formatBirthDate(profile?.birth_date, locale), icon: "calendar", editable: true },
      { key: "email", label: t("auth.email"), value: user?.email ?? "—", icon: "mail", editable: true },
      { key: "userId", label: t("profile.userId"), value: user?.id ?? "—", icon: "copy", editable: false, copyable: true },
      {
        key: "role",
        label: t("profile.role"),
        value: typeof profile?.role === "string" ? capitalizeFirst(profile.role) : "User",
        icon: "flag",
        editable: false,
      },
    ],
    [displayName, preferences.gender, profile?.birth_date, profile?.role, user?.email, user?.id, locale, t],
  );

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setInfo(t("profile.copied", { label }));
    } catch {
      setError(t("profile.copyFailed", { label }));
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader
        onBack={onBack}
        title={t("profile.title")}
        backHidden={mode === "tab"}
        trailing={<span style={{ width: 40, flexShrink: 0 }} aria-hidden />}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFileSelected(file);
        }}
      />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `0 22px ${mode === "tab" ? floatNavContentInset("bottom") : "24px"}`,
        }}
      >
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

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            marginBottom: 22,
            paddingTop: 4,
          }}
        >
          <UserAvatar
            size={96}
            displayName={avatarName}
            avatarPath={avatarPath}
            cacheKey={avatarCacheKey}
            onClick={handleAvatarPress}
          />
          <button
            type="button"
            onClick={handleAvatarPress}
            style={{
              background: "none",
              border: "none",
              color: M.mut,
              fontSize: 13,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            {t("profile.avatarChange")}
          </button>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>{t("profile.info")}</div>
            <div style={{ color: M.mut2, fontSize: 12, fontWeight: 600 }}>{t("profile.account")}</div>
          </div>
          <div
            style={{
              background: M.card,
              border: "1px solid " + M.line2,
              borderRadius: 20,
              padding: "4px 16px",
              boxShadow: "0 8px 22px rgba(24,24,27,0.035)",
            }}
          >
            {profileRows.map((row, idx) => {
              const isEditing = editingField === row.key;
              const showDivider = idx < profileRows.length - 1;

              return (
                <div key={row.key}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      minHeight: 62,
                      padding: "7px 0",
                    }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: M.accSoft, display: "flex", alignItems: "center", justifyContent: "center", color: M.fg, flexShrink: 0 }}>
                      <Icon name={row.icon} size={15} stroke={2} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={rowLabelStyle}>{row.label}</div>
                      <div style={{ ...rowValueStyle, marginTop: 2, fontSize: row.key === "userId" ? 13 : row.key === "email" ? 15 : 17, fontFamily: row.key === "userId" ? M.numeric : M.body, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.value}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                      {row.copyable && typeof row.value === "string" && row.value !== "—" && (
                        <button
                          onClick={() => copyValue(row.value, row.label)}
                          style={{ width: 28, height: 28, borderRadius: 14, background: "transparent", border: "none", color: M.mut2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          aria-label={t("profile.copyAria", { label: row.label })}
                        >
                          <Icon name="copy" size={15} stroke={1.8} />
                        </button>
                      )}
                      {row.editable && (
                        <button
                          onClick={() => {
                            clearFeedback();
                            setEditingField(isEditing ? null : (row.key as EditableField));
                          }}
                          style={{ width: 28, height: 28, borderRadius: 14, background: "transparent", border: "none", color: M.mut2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                          aria-label={t("profile.editAria", { label: row.label })}
                        >
                          <Icon name="edit" size={15} stroke={2} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && row.key === "displayName" && (
                    <div style={{ padding: "0 0 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        type="text"
                        placeholder={t("profile.displayName")}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        autoComplete="name"
                        style={compactInputStyle}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button onClick={() => setEditingField(null)} style={smallOutlineBtn}>
                          {t("profile.cancel")}
                        </button>
                        <button
                          disabled={busyName}
                          onClick={submitDisplayName}
                          style={{ ...smallOutlineBtn, border: "none", background: M.acc, color: M.accInk, cursor: busyName ? "wait" : "pointer" }}
                        >
                          {t("profile.save")}
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && row.key === "gender" && (
                    <div style={{ padding: "0 0 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <select
                        value={gender ?? ""}
                        onChange={(e) => setGender((e.target.value || null) as "male" | "female" | "other" | null)}
                        style={compactInputStyle}
                      >
                        <option value="">{t("profile.gender.choose")}</option>
                        <option value="male">{t("profile.gender.male")}</option>
                        <option value="female">{t("profile.gender.female")}</option>
                        <option value="other">{t("profile.gender.other")}</option>
                      </select>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button onClick={() => setEditingField(null)} style={smallOutlineBtn}>
                          {t("profile.cancel")}
                        </button>
                        <button onClick={submitGender} style={{ ...smallOutlineBtn, border: "none", background: M.acc, color: M.accInk }}>
                          {t("profile.save")}
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && row.key === "email" && (
                    <div style={{ padding: "0 0 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        type="email"
                        placeholder={t("auth.email")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        style={compactInputStyle}
                      />
                      <div style={{ fontSize: 13, color: M.mut, lineHeight: 1.45 }}>
                        {t("profile.emailHint")}
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button onClick={() => setEditingField(null)} style={smallOutlineBtn}>
                          {t("profile.cancel")}
                        </button>
                        <button
                          disabled={busyEmail}
                          onClick={submitEmail}
                          style={{ ...smallOutlineBtn, border: "none", background: M.acc, color: M.accInk, cursor: busyEmail ? "wait" : "pointer" }}
                        >
                          {t("profile.save")}
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && row.key === "birthDate" && (
                    <div style={{ padding: "0 0 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        style={compactInputStyle}
                      />
                      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <button onClick={() => setEditingField(null)} style={smallOutlineBtn}>
                          {t("profile.cancel")}
                        </button>
                        <button
                          disabled={busyBirthDate}
                          onClick={submitBirthDate}
                          style={{
                            ...smallOutlineBtn,
                            border: "none",
                            background: M.acc,
                            color: M.accInk,
                            cursor: busyBirthDate ? "wait" : "pointer",
                          }}
                        >
                          {t("profile.save")}
                        </button>
                      </div>
                    </div>
                  )}

                  {showDivider && <div style={{ height: 1, background: M.line2 }} />}
                </div>
              );
            })}

            <div style={{ height: 1, background: M.line2 }} />

            <button
              onClick={() => setPasswordOpen((v) => !v)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: M.fg,
                padding: "12px 0 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 10, ...rowLabelStyle, color: M.fg }}><span style={{ width: 32, height: 32, borderRadius: 10, background: M.accSoft, display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name="lock" size={15} color={M.fg} /></span>{t("profile.passwordChange")}</span>
              <Icon name={passwordOpen ? "chevD" : "chevR"} size={16} stroke={2.2} color={M.mut} />
            </button>

            {passwordOpen && (
              <div style={{ padding: "0 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                <input
                  type="password"
                  placeholder={t("profile.currentPassword")}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  style={compactInputStyle}
                />
                <input
                  type="password"
                  placeholder={t("auth.newPassword")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  style={compactInputStyle}
                />
                <input
                  type="password"
                  placeholder={t("profile.confirmPassword")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  style={compactInputStyle}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    disabled={busyPassword}
                    onClick={submitPassword}
                    style={{ ...smallOutlineBtn, border: "none", background: M.acc, color: M.accInk, cursor: busyPassword ? "wait" : "pointer" }}
                  >
                    {t("profile.passwordSave")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}><div style={{ fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>{t("profile.facts")}</div>{!factTopicsEditing ? <MButton type="button" variant="ghost" size="sm" onClick={() => { clearFeedback(); setFactTopicsDraft(preferences.factTopics); setFactTopicsEditing(true); }} style={{ minHeight: 32, padding: "0 2px", color: M.fg }}>{t("common.edit")} <Icon name="edit" size={14} /></MButton> : <span style={{ fontSize: 12, color: M.mut, fontWeight: 600 }}>{factTopicsDraft.length}/3</span>}</div>
          <div style={{ background: M.card, border: "1px solid " + M.line2, borderRadius: 16, padding: 14 }}>
            <div style={{ color: M.mut, fontSize: 13, lineHeight: 1.45, marginBottom: 12 }}>{factTopicsEditing ? t("profile.factsEdit") : preferences.factTopics.length ? t("profile.factsSelected") : t("profile.factsEmpty")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {factTopicsEditing ? FACT_TOPICS.map((topic) => <MButton key={topic} type="button" variant={factTopicsDraft.includes(topic) ? "primary" : "secondary"} size="sm" onClick={() => toggleFactTopic(topic)} disabled={!factTopicsDraft.includes(topic) && factTopicsDraft.length >= 3}>{t(`fact.${topic}` as TranslationKey)}</MButton>) : preferences.factTopics.map((topic) => <span key={topic} style={{ height: 36, display: "inline-flex", alignItems: "center", padding: "0 14px", borderRadius: 18, background: M.accSoft, color: M.fg, fontSize: 13, fontWeight: 650 }}>{t(`fact.${topic}` as TranslationKey)}</span>)}
            </div>
            {factTopicsEditing ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}><MButton type="button" variant="secondary" size="sm" onClick={() => { setFactTopicsDraft(preferences.factTopics); setFactTopicsEditing(false); }}>{t("common.cancel")}</MButton><MButton type="button" variant="primary" size="sm" onClick={() => void saveFactTopics()}>{t("profile.save")}</MButton></div> : null}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              letterSpacing: 1.5,
              color: M.mut,
              fontWeight: 700,
              marginBottom: 10,
            }}
          >
            {t("profile.actions")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <MButton
              onClick={() => setInfo(t("profile.restoreInfo"))}
              variant="secondary"
              size="sm"
              fullWidth
              style={{ justifyContent: "space-between", textAlign: "left" }}
            >
              {t("profile.restore")}
              <Icon name="chevR" size={14} stroke={2.1} color={M.mut} />
            </MButton>
            <MButton
              onClick={() => void signOut()}
              variant="secondary"
              size="sm"
              fullWidth
              style={{ justifyContent: "space-between", textAlign: "left" }}
            >
              {t("menu.logout")}
              <Icon name="chevR" size={14} stroke={2.1} color={M.mut} />
            </MButton>
            <MButton
              onClick={() => setDeleteAccountOpen(true)}
              variant="danger"
              size="sm"
              fullWidth
              style={{ justifyContent: "space-between", textAlign: "left" }}
            >
              {t("profile.deleteAccount")}
              <Icon name="chevR" size={14} stroke={2.1} color={M.mut} />
            </MButton>
          </div>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteAccountOpen}
        title={t("profile.delete.title")}
        message={
          <>
            <p style={{ margin: "0 0 10px" }}>{t("profile.delete.intro")}</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>{t("profile.delete.profile")}</li>
              <li>{t("profile.delete.plans")}</li>
              <li>{t("profile.delete.history")}</li>
              <li>{t("profile.delete.exercises")}</li>
              <li>{t("profile.delete.body")}</li>
              <li>{t("profile.delete.support")}</li>
              <li>{t("profile.delete.login")}</li>
            </ul>
            <p style={{ margin: "10px 0 0" }}>{t("profile.delete.keep")}</p>
            <p style={{ margin: "10px 0 0" }}>{t("profile.delete.warning")}</p>
          </>
        }
        step2Title={t("profile.delete.finalTitle")}
        step2Message={t("profile.delete.finalMessage")}
        busy={busyDelete}
        onCancel={() => setDeleteAccountOpen(false)}
        onConfirm={handleDeleteAccount}
      />

      <AvatarActionSheet
        open={avatarActionOpen}
        onClose={() => setAvatarActionOpen(false)}
        onChoosePhoto={openFilePicker}
        onRemovePhoto={() => setRemoveAvatarOpen(true)}
      />

      <AvatarCropSheet
        open={cropSheetOpen}
        imageSrc={selectedImageUrl}
        busy={busyAvatar}
        onClose={closeCropSheet}
        onSave={handleAvatarSave}
      />

      <ConfirmSheet
        open={removeAvatarOpen}
        title={t("profile.avatarRemove.title")}
        message={t("profile.avatarRemove.message")}
        confirmLabel={t("profile.avatarRemove.confirm")}
        icon="trash"
        onCancel={() => setRemoveAvatarOpen(false)}
        onConfirm={() => void handleRemoveAvatar()}
      />
    </div>
  );
}
