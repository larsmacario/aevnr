import { useState } from "react";
import { M } from "../theme";
import { fmt, TIMER_DEFAULTS, TIMER_MODES, type TimerMode } from "../lib/engine";
import { createAiConsentGrant, hasAiConsent, usePreferences, type AevnrFocus } from "../lib/preferences";
import { DASHBOARD_MODULE_IDS, type DashboardModuleId } from "../lib/dashboardPersonalization";
import { TimerSoundPackPicker } from "../components/TimerSoundPackPicker";
import { TimerConfigPanel } from "../components/TimerConfigPanel";
import { MStepper, MSwitch } from "../components/widgets";
import { MButton } from "../components/MButton";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { BottomSheet } from "../components/BottomSheet";
import { AiConsentStep } from "../components/AiConsentStep";
import { ExpressPerformanceBaselineForm } from "../components/ExpressPerformanceBaselineForm";
import { OwnerLabsSection } from "../components/settings/OwnerLabsSection";
import { useAuth } from "../lib/auth";
import { isOwnerLabsVisible } from "../lib/ownerLabs";
import { useI18n } from "../lib/i18n";
import type { AppLanguage } from "../lib/language";
import type { TranslationKey } from "../locales/de";

export interface SettingsScreenProps {
  onBack: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          fontSize: 13,
          letterSpacing: 1.5,
          color: M.mut,
          fontWeight: 700,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          background: M.card,
          border: "1px solid " + M.line2,
          borderRadius: 16,
          padding: "16px 16px 14px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  hint,
  children,
  last,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "12px 0",
        borderBottom: last ? "none" : "1px solid " + M.line2,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{label}</div>
        {hint && <div style={{ color: M.mut, fontSize: 13, marginTop: 3 }}>{hint}</div>}
      </div>
      <div style={{ flex: "0 0 auto" }}>{children}</div>
    </div>
  );
}

export function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { profile } = useAuth();
  const showOwnerLabs = isOwnerLabsVisible(profile);
  const { preferences, updatePreferences, saving } = usePreferences();
  const { language, locale, setLanguage, t } = useI18n();
  const [timerMode, setTimerMode] = useState<TimerMode>("emom");
  const [aiConsentSheetOpen, setAiConsentSheetOpen] = useState(false);
  const [baselineSheetOpen, setBaselineSheetOpen] = useState(false);

  const legalBaseUrl = (import.meta.env.VITE_LEGAL_BASE_URL ?? "https://rephive.app").replace(/\/$/, "");
  const openDatenschutz = () => {
    window.open(`${legalBaseUrl}/datenschutz`, "_blank", "noopener,noreferrer");
  };

  const aiConsentGranted = hasAiConsent(preferences);

  const handleAiConsentToggle = (enabled: boolean) => {
    if (!enabled) {
      updatePreferences({ aiConsent: null }, true);
      return;
    }
    setAiConsentSheetOpen(true);
  };

  const handleGrantAiConsent = async () => {
    try {
      await updatePreferences({ aiConsent: createAiConsentGrant() }, true);
      setAiConsentSheetOpen(false);
    } catch {
      // saving state resets via preferences provider
    }
  };

  const timerCfg = preferences.timerDefaults[timerMode];
  const setTimerCfg = (p: Partial<typeof timerCfg>) => {
    updatePreferences({
      timerDefaults: {
        [timerMode]: { ...preferences.timerDefaults[timerMode], ...p },
      },
    });
  };

  const resetTimerDefaults = () => {
    updatePreferences({ timerDefaults: JSON.parse(JSON.stringify(TIMER_DEFAULTS)) }, true);
  };
  const toggleDashboardModule = (module: DashboardModuleId) => {
    const hiddenModules = preferences.dashboard.hiddenModules.includes(module)
      ? preferences.dashboard.hiddenModules.filter((entry) => entry !== module)
      : [...preferences.dashboard.hiddenModules, module];
    updatePreferences({ dashboard: { ...preferences.dashboard, hiddenModules } }, true);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader
        onBack={onBack}
        title={t("settings.title")}
        trailing={
          <span style={{ width: 24, fontSize: 13, color: saving ? M.acc : "transparent", fontWeight: 700 }}>
            {saving ? "…" : ""}
          </span>
        }
      />

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `0 22px ${SCROLL_BOTTOM_PADDING}px` }}>
        <Section title={t("settings.language.section")}>
          <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{t("settings.language.label")}</div>
          <div style={{ color: M.mut, fontSize: 13, marginTop: 3 }}>{t("settings.language.hint")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            {(["de", "en"] as AppLanguage[]).map((option) => (
              <MButton key={option} type="button" variant={language === option ? "primary" : "secondary"} size="md" onClick={() => void setLanguage(option)}>
                {t(`language.name.${option}` as TranslationKey)}
              </MButton>
            ))}
          </div>
        </Section>

        <Section title={t("settings.training.section")}>
          <SettingRow label={t("settings.training.rest")} hint={t("settings.training.restHint")}>
            <MStepper
              value={preferences.restSeconds}
              min={30}
              max={180}
              step={15}
              fmt={fmt}
              onChange={(v) => updatePreferences({ restSeconds: v })}
            />
          </SettingRow>
          <SettingRow label={t("settings.training.autoRest")} hint={t("settings.training.autoRestHint")}>
            <MSwitch
              checked={preferences.autoRest}
              onChange={(v) => updatePreferences({ autoRest: v }, true)}
            />
          </SettingRow>
          <SettingRow label={t("settings.training.upperIncrement")} hint={t("settings.training.upperIncrementHint")}>
            <MStepper
              value={preferences.weightIncrementUpperKg}
              min={1}
              max={10}
              step={0.5}
              fmt={(v) => `${v} kg`}
              onChange={(v) => updatePreferences({ weightIncrementUpperKg: v }, true)}
            />
          </SettingRow>
          <SettingRow label={t("settings.training.lowerIncrement")} hint={t("settings.training.lowerIncrementHint")} last>
            <MStepper
              value={preferences.weightIncrementLowerKg}
              min={2.5}
              max={10}
              step={0.5}
              fmt={(v) => `${v} kg`}
              onChange={(v) => updatePreferences({ weightIncrementLowerKg: v }, true)}
            />
          </SettingRow>
        </Section>

        <Section title={t("settings.builder.section")}>
          <SettingRow label={t("settings.builder.sets")}>
            <MStepper
              value={preferences.defaultSets}
              min={1}
              max={10}
              onChange={(v) => updatePreferences({ defaultSets: v })}
            />
          </SettingRow>
          <SettingRow label={t("settings.builder.reps")} last>
            <MStepper
              value={preferences.defaultReps}
              min={1}
              max={30}
              onChange={(v) => updatePreferences({ defaultReps: v })}
            />
          </SettingRow>
        </Section>

        <Section title={t("settings.dashboard.section")}>
          <SettingRow label={t("settings.dashboard.auto")} hint={t("settings.dashboard.autoHint")}>
            <MSwitch checked={preferences.dashboard.autoPrioritize} onChange={(autoPrioritize) => updatePreferences({ dashboard: { ...preferences.dashboard, autoPrioritize } }, true)} />
          </SettingRow>
          <div style={{ padding: "12px 0", borderBottom: "1px solid " + M.line2 }}>
            <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{t("settings.dashboard.focus")}</div>
            <div style={{ color: M.mut, fontSize: 13, marginTop: 3 }}>{t("settings.dashboard.focusHint")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
              <MButton type="button" size="sm" variant={preferences.dashboard.focusOverride === null ? "primary" : "secondary"} onClick={() => updatePreferences({ dashboard: { ...preferences.dashboard, focusOverride: null } }, true)}>{t("common.automatic")}</MButton>
              {(["strength", "endurance", "energy", "body_composition"] as AevnrFocus[]).map((focus) => <MButton key={focus} type="button" size="sm" variant={preferences.dashboard.focusOverride === focus ? "primary" : "secondary"} onClick={() => updatePreferences({ dashboard: { ...preferences.dashboard, focusOverride: focus } }, true)}>{t(`focus.${focus}` as TranslationKey)}</MButton>)}
            </div>
          </div>
          <div style={{ paddingTop: 12 }}>
            <div style={{ color: M.fg, fontWeight: 600, fontSize: 15 }}>{t("settings.dashboard.modules")}</div>
            <div style={{ color: M.mut, fontSize: 13, marginTop: 3 }}>{t("settings.dashboard.modulesHint")}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
              {DASHBOARD_MODULE_IDS.map((module) => <MButton key={module} type="button" size="sm" variant={preferences.dashboard.hiddenModules.includes(module) ? "secondary" : "primary"} onClick={() => toggleDashboardModule(module)}>{t(`dashboard.${module}` as TranslationKey)}</MButton>)}
            </div>
          </div>
        </Section>

        <Section title={t("settings.data.section")}>
          <SettingRow
            label={t("settings.data.consent")}
            hint={t("settings.data.consentHint")}
          >
            <MSwitch checked={aiConsentGranted} onChange={handleAiConsentToggle} />
          </SettingRow>
          <SettingRow
            label={t("settings.data.baseline")}
            hint={preferences.expressPerformanceBaseline ? t("settings.data.updated", { date: new Date(preferences.expressPerformanceBaseline.updatedAt).toLocaleDateString(locale) }) : t("settings.data.baselineHint")}
            last
          >
            <MButton type="button" variant="secondary" size="sm" onClick={() => setBaselineSheetOpen(true)}>{t("common.edit")}</MButton>
          </SettingRow>
          {preferences.expressPerformanceBaseline ? <MButton type="button" variant="ghost" size="sm" fullWidth onClick={() => updatePreferences({ expressPerformanceBaseline: null }, true)} style={{ marginTop: 8, color: M.danger }}>{t("settings.data.deleteBaseline")}</MButton> : null}
        </Section>

        {showOwnerLabs ? (
          <Section title="LABS">
            <OwnerLabsSection />
          </Section>
        ) : null}

        <Section title={t("settings.timer.section")}>
          <TimerSoundPackPicker
            enabled={preferences.timerSounds}
            packId={preferences.timerSoundPack}
            onEnabledChange={(v) => updatePreferences({ timerSounds: v }, true)}
            onPackChange={(id) => updatePreferences({ timerSoundPack: id }, true)}
          />
          <div
            style={{
              display: "flex",
              gap: 6,
              background: M.panel,
              padding: 4,
              borderRadius: 12,
              border: "1px solid " + M.line2,
              marginBottom: 14,
              marginTop: 16,
            }}
          >
            {TIMER_MODES.map((m) => (
              <MButton
                key={m.id}
                onClick={() => setTimerMode(m.id)}
                variant={timerMode === m.id ? "primary" : "ghost"}
                size="sm"
                style={{
                  flex: 1,
                  fontFamily: M.label,
                  fontSize: 13,
                  letterSpacing: 0.3,
                  ...(timerMode === m.id ? null : { color: M.mut }),
                }}
              >
                {m.name}
              </MButton>
            ))}
          </div>
          <TimerConfigPanel mode={timerMode} cfg={timerCfg} setCfg={setTimerCfg} layout="wrap" />
          <MButton
            onClick={resetTimerDefaults}
            variant="secondary"
            size="sm"
            fullWidth
            style={{ marginTop: 14, color: M.mut, fontFamily: M.body, fontWeight: 600 }}
          >
            {t("settings.timer.reset")}
          </MButton>
        </Section>

        <div style={{ fontSize: 13, color: M.mut2, textAlign: "center", paddingTop: 4 }}>
          {t("settings.saved")}
        </div>
      </div>

      <BottomSheet
        open={aiConsentSheetOpen}
        onClose={() => setAiConsentSheetOpen(false)}
        position="absolute"
        zIndex={40}
        aria-label={t("settings.aiConsent.aria")}
      >
        <AiConsentStep
          onOpenPrivacy={openDatenschutz}
          onAccept={handleGrantAiConsent}
          onBack={() => setAiConsentSheetOpen(false)}
          showActions
          saving={saving}
        />
      </BottomSheet>
      <BottomSheet open={baselineSheetOpen} onClose={() => setBaselineSheetOpen(false)} position="absolute" zIndex={40} aria-label={t("settings.baseline.aria")}>
        <ExpressPerformanceBaselineForm baseline={preferences.expressPerformanceBaseline} onSave={async (baseline) => { await updatePreferences({ expressPerformanceBaseline: baseline }, true); setBaselineSheetOpen(false); }} onCancel={() => setBaselineSheetOpen(false)} saving={saving} />
      </BottomSheet>
    </div>
  );
}
