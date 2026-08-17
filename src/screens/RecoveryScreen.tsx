import { useMemo, useState } from "react";
import { AlertSheet } from "../components/AlertSheet";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { ManualProteinLogSheet } from "../components/ManualProteinLogSheet";
import { ProteinTargetSheet } from "../components/ProteinTargetSheet";
import { ProteinPresetLogSheet } from "../components/ProteinPresetLogSheet";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { WaterAmountSheet } from "../components/WaterAmountSheet";
import { WaterQuickAmountsSheet } from "../components/WaterQuickAmountsSheet";
import { WaterTargetSheet } from "../components/WaterTargetSheet";
import { useAuth } from "../lib/auth";
import {
  createWaterLog,
  deleteProteinLog,
  deleteWaterLog,
  sumProteinToday,
  sumWaterToday,
  useProteinLogsToday,
  useWaterLogsLastSevenDays,
  useWaterLogsToday,
  type ProteinLog,
  type WaterLog,
} from "../lib/db";
import {
  aggregateWaterLastSevenDays,
  formatWaterAmount,
} from "../lib/hydration";
import { usePreferences } from "../lib/preferences";
import { RECOVERY_FOOD_PRESETS, type RecoveryFoodPreset } from "../lib/recoveryEngine";
import { useRecoveryTargets } from "../lib/recoveryTarget";
import { useDailyCheckins } from "../lib/db";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { APP_NAME, M } from "../theme";
import { useI18n } from "../lib/i18n";

export type RecoverySection = "protein" | "water" | "checkin";

export interface RecoveryScreenProps {
  onBack: () => void;
  initialSection?: RecoverySection;
}

type DeleteTarget =
  | { kind: "protein"; log: ProteinLog }
  | { kind: "water"; log: WaterLog };

function ProgressRing({
  logged,
  target,
  valueLabel,
  targetLabel,
}: {
  logged: number;
  target: number;
  valueLabel: string;
  targetLabel: string;
}) {
  const { t } = useI18n();
  const pct = target > 0 ? Math.min(100, (logged / target) * 100) : 0;
  const size = 160;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={M.line2} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={M.brand}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (pct / 100) * circumference}
          style={{ transition: "stroke-dashoffset 0.35s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontFamily: M.numeric, fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{valueLabel}</div>
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 600, marginTop: 4 }}>
          {t("recovery.ring.target", { target: targetLabel })}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function RecoveryScreen({ onBack, initialSection = "protein" }: RecoveryScreenProps) {
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const [section, setSection] = useState<RecoverySection>(initialSection);
  const [proteinRefreshKey, setProteinRefreshKey] = useState(0);
  const [waterRefreshKey, setWaterRefreshKey] = useState(0);
  const proteinQuery = useProteinLogsToday(proteinRefreshKey);
  const waterTodayQuery = useWaterLogsToday(waterRefreshKey);
  const waterWeekQuery = useWaterLogsLastSevenDays(waterRefreshKey);
  const checkinQuery = useDailyCheckins(undefined, proteinRefreshKey + waterRefreshKey);
  const targets = useRecoveryTargets();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [alertSheet, setAlertSheet] = useState<{ title: string; message: string } | null>(null);
  const [activePreset, setActivePreset] = useState<RecoveryFoodPreset | null>(null);
  const [manualProteinOpen, setManualProteinOpen] = useState(false);
  const [proteinTargetOpen, setProteinTargetOpen] = useState(false);
  const [manualWaterOpen, setManualWaterOpen] = useState(false);
  const [waterTargetOpen, setWaterTargetOpen] = useState(false);
  const [quickAmountsOpen, setQuickAmountsOpen] = useState(false);

  const presets = useMemo(() => RECOVERY_FOOD_PRESETS.map((preset) => ({
    ...preset,
    label: t(preset.id === "shake" ? "recovery.preset.shake" : preset.id === "quark" ? "recovery.preset.quark" : preset.id === "skyr" ? "recovery.preset.skyr" : preset.id === "eier" ? "recovery.preset.eggs" : "recovery.preset.chicken"),
    amountHint: t(preset.id === "shake" ? "recovery.preset.powderAmount" : preset.id === "eier" ? "recovery.preset.eggsAmount" : "recovery.preset.amount"),
  })), [t]);

  const formatTime = (isoString: string) => new Date(isoString).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const formatProteinLog = (log: ProteinLog) => log.amountG && log.amountG > 0
    ? t("recovery.protein.logWithAmount", { label: log.label ?? t("recovery.protein.fallback"), protein: log.proteinG, amount: Math.round(log.amountG) })
    : t("recovery.protein.log", { label: log.label ?? t("recovery.protein.fallback"), protein: log.proteinG });

  const proteinToday = useMemo(() => sumProteinToday(proteinQuery.data ?? []), [proteinQuery.data]);
  const waterToday = useMemo(() => sumWaterToday(waterTodayQuery.data ?? []), [waterTodayQuery.data]);
  const waterDays = useMemo(
    () => aggregateWaterLastSevenDays(waterWeekQuery.data ?? [], new Date(), locale),
    [locale, waterWeekQuery.data],
  );

  const reloadProtein = () => {
    setProteinRefreshKey((key) => key + 1);
    proteinQuery.reload();
  };

  const reloadWater = () => {
    setWaterRefreshKey((key) => key + 1);
    waterTodayQuery.reload();
    waterWeekQuery.reload();
  };

  const addWater = async (amountMl: number) => {
    if (!user || quickBusy) return;
    setQuickBusy(true);
    try {
      await createWaterLog(user.id, { amountMl, source: "quick" });
      reloadWater();
    } catch (cause) {
      setAlertSheet({
        title: t("recovery.saveFailed"),
        message: cause instanceof Error ? cause.message : t("recovery.waterSaveFailed"),
      });
    } finally {
      setQuickBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      if (deleteTarget.kind === "protein") {
        await deleteProteinLog(deleteTarget.log.id);
        reloadProtein();
      } else {
        await deleteWaterLog(deleteTarget.log.id);
        reloadWater();
      }
      setDeleteTarget(null);
    } catch (cause) {
      setAlertSheet({
        title: t("recovery.error"),
        message: cause instanceof Error ? cause.message : t("recovery.deleteFailed"),
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const selectedLoading =
    targets.loading ||
    (section === "protein" ? proteinQuery.loading : section === "water" ? waterTodayQuery.loading || waterWeekQuery.loading : checkinQuery.loading);
  const selectedError = section === "protein" ? proteinQuery.error : section === "water" ? waterTodayQuery.error || waterWeekQuery.error : checkinQuery.error;
  const proteinRemaining = Math.max(0, targets.proteinTargetG - proteinToday);
  const waterRemaining = Math.max(0, targets.waterTargetMl - waterToday);
  const maxWaterChart = Math.max(targets.waterTargetMl, ...waterDays.map((day) => day.amountMl), 1);

  const deleteMessage = deleteTarget
    ? deleteTarget.kind === "protein"
      ? t("recovery.delete.message", { entry: formatProteinLog(deleteTarget.log) })
      : t("recovery.delete.message", { entry: formatWaterAmount(deleteTarget.log.amountMl, locale) })
    : "";

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader onBack={onBack} title={t("recovery.title")} />
      <div style={{ padding: "0 22px 16px", flexShrink: 0 }}>
        <div role="tablist" aria-label={t("recovery.tabs.aria")} style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: M.card }}>
          {(["protein", "water", "checkin"] as const).map((item) => (
            <MButton
              key={item}
              type="button"
              role="tab"
              aria-selected={section === item}
              variant={section === item ? "primary" : "ghost"}
              size="sm"
              onClick={() => setSection(item)}
              style={{ flex: 1, borderRadius: 10 }}
            >
              <Icon name={item === "protein" ? "flame" : item === "water" ? "droplet" : "heart"} size={15} stroke={2} />
              {item === "protein" ? t("recovery.tabs.protein") : item === "water" ? t("recovery.tabs.water") : t("recovery.tabs.checkin")}
            </MButton>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `0 22px ${SCROLL_BOTTOM_PADDING}px` }}>
        {selectedLoading ? (
          <div style={{ color: M.mut, fontSize: 14, padding: "24px 0" }}>{t("recovery.loading")}</div>
        ) : selectedError ? (
          <div style={{ color: M.danger, fontSize: 14, padding: "24px 0" }}>{selectedError}</div>
        ) : section === "protein" ? (
          <>
            <div style={{ padding: "8px 0 20px", display: "flex", justifyContent: "center" }}>
              <ProgressRing logged={proteinToday} target={targets.proteinTargetG} valueLabel={String(proteinToday)} targetLabel={`${targets.proteinTargetG} g`} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <span style={{ fontSize: 14, color: M.mut, textAlign: "center", lineHeight: 1.5 }}>
                {t(proteinRemaining > 0 ? "recovery.protein.goalOpen" : "recovery.protein.goalReached", { target: targets.proteinTargetG, remaining: proteinRemaining })}
              </span>
              <MButton type="button" variant="ghost" size="sm" onClick={() => setProteinTargetOpen(true)} style={{ padding: "4px 7px", color: M.brand, flexShrink: 0 }}>
                {t("recovery.changeTarget")}
              </MButton>
            </div>
            {targets.needsWeightHint ? (
              <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut2, textAlign: "center" }}>
                {t("recovery.protein.weightHint")}
              </p>
            ) : null}
            <MButton type="button" variant="primary" size="md" fullWidth onClick={() => setManualProteinOpen(true)} style={{ borderRadius: 14, marginBottom: 20 }}>
              {t("recovery.protein.track")}
            </MButton>
            <SectionLabel>{t("recovery.frequent")}</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {presets.map((preset) => (
                <MButton key={preset.id} type="button" variant="secondary" size="sm" onClick={() => setActivePreset(preset)} style={{ borderRadius: 999, padding: "8px 14px" }}>
                  {preset.label}
                </MButton>
              ))}
            </div>
            <SectionLabel>{t("recovery.today")}</SectionLabel>
            {!proteinQuery.data?.length ? (
              <div style={{ padding: 16, borderRadius: 14, background: M.card, border: `1px solid ${M.line2}`, fontSize: 14, color: M.mut, lineHeight: 1.5 }}>
                {t("recovery.protein.empty", { app: APP_NAME })}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {proteinQuery.data.map((log) => (
                  <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: M.card, border: `1px solid ${M.line2}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: M.fg }}>{formatProteinLog(log)}</div>
                      <div style={{ fontSize: 13, color: M.mut, marginTop: 2 }}>{formatTime(log.loggedAt)}</div>
                    </div>
                    <MButton type="button" variant="ghost" size="icon" aria-label={t("recovery.protein.deleteAria")} onClick={() => setDeleteTarget({ kind: "protein", log })} style={{ width: 36, height: 36, borderRadius: 10 }}>
                      <Icon name="trash" size={16} color={M.mut} stroke={2} />
                    </MButton>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : section === "water" ? (
          <>
            <div style={{ padding: "8px 0 20px", display: "flex", justifyContent: "center" }}>
              <ProgressRing logged={waterToday} target={targets.waterTargetMl} valueLabel={formatWaterAmount(waterToday, locale)} targetLabel={formatWaterAmount(targets.waterTargetMl, locale)} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <span style={{ fontSize: 14, color: M.mut }}>
                {waterRemaining > 0 ? t("recovery.water.remaining", { amount: formatWaterAmount(waterRemaining, locale) }) : t("recovery.water.reached")}
              </span>
              <MButton type="button" variant="ghost" size="sm" onClick={() => setWaterTargetOpen(true)} style={{ padding: "4px 7px", color: M.brand }}>
                {t("recovery.changeTarget")}
              </MButton>
            </div>
            {targets.waterNeedsWeightHint ? (
              <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut2, textAlign: "center" }}>
                {t("recovery.water.weightHint")}
              </p>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700 }}>
                {t("recovery.water.quick")}
              </div>
              <MButton type="button" variant="ghost" size="sm" onClick={() => setQuickAmountsOpen(true)} style={{ padding: "4px 7px", color: M.brand }}>
                {t("recovery.water.customize")}
              </MButton>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
              {preferences.waterQuickAmountsMl.map((amountMl, index) => (
                <MButton key={`${index}-${amountMl}`} type="button" variant="secondary" size="md" disabled={quickBusy} onClick={() => void addWater(amountMl)}>
                  +{amountMl} ml
                </MButton>
              ))}
            </div>
            <MButton type="button" variant="primary" size="md" fullWidth onClick={() => setManualWaterOpen(true)} style={{ borderRadius: 14, marginBottom: 22 }}>
              {t("recovery.water.other")}
            </MButton>
            <SectionLabel>{t("recovery.lastSevenDays")}</SectionLabel>
            <div style={{ padding: "14px 12px 12px", borderRadius: 16, background: M.card, border: `1px solid ${M.line2}`, marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 96 }}>
                {waterDays.map((day) => {
                  const reached = day.amountMl >= targets.waterTargetMl;
                  return (
                    <div key={day.dateKey} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div title={formatWaterAmount(day.amountMl, locale)} style={{ width: "100%", height: 70, display: "flex", alignItems: "flex-end" }}>
                        <div style={{ width: "100%", height: `${day.amountMl ? Math.max(6, (day.amountMl / maxWaterChart) * 70) : 3}px`, borderRadius: 5, background: reached ? M.brand : day.amountMl ? M.brandSoft : M.line }} />
                      </div>
                      <span style={{ fontSize: 12, color: day.dateKey === waterDays[6]?.dateKey ? M.fg : M.mut2, fontWeight: 700 }}>{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <SectionLabel>{t("recovery.today")}</SectionLabel>
            {!waterTodayQuery.data?.length ? (
              <div style={{ padding: 16, borderRadius: 14, background: M.card, border: `1px solid ${M.line2}`, fontSize: 14, color: M.mut }}>
                {t("recovery.water.empty")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {waterTodayQuery.data.map((log) => (
                  <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: M.card, border: `1px solid ${M.line2}` }}>
                    <Icon name="droplet" size={18} color={M.brand} stroke={2} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: M.fg }}>{formatWaterAmount(log.amountMl, locale)}</div>
                      <div style={{ fontSize: 13, color: M.mut, marginTop: 2 }}>{formatTime(log.loggedAt)}</div>
                    </div>
                    <MButton type="button" variant="ghost" size="icon" aria-label={t("recovery.water.deleteAria")} onClick={() => setDeleteTarget({ kind: "water", log })} style={{ width: 36, height: 36, borderRadius: 10 }}>
                      <Icon name="trash" size={16} color={M.mut} stroke={2} />
                    </MButton>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p style={{ margin: "8px 0 18px", fontSize: 14, color: M.mut, lineHeight: 1.5 }}>{t("recovery.checkin.context")}</p>
            {!checkinQuery.data?.length ? <div style={{ padding: 16, borderRadius: 14, background: M.card, border: `1px solid ${M.line2}`, color: M.mut, fontSize: 14 }}>{t("recovery.checkin.empty")}</div> : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{checkinQuery.data.slice(0, 7).map((entry) => <div key={entry.id} style={{ padding: "14px", borderRadius: 14, background: M.card, border: `1px solid ${M.line2}` }}><div style={{ color: M.fg, fontWeight: 650, fontSize: 14, marginBottom: 11 }}>{new Date(`${entry.checkinDate}T12:00:00`).toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "short" })}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}><div style={{ padding: "9px 8px", borderRadius: 10, background: M.cardHi }}><div style={{ color: M.mut, fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>{t("recovery.checkin.sleep")}</div><div style={{ marginTop: 3, color: M.fg, fontFamily: M.numeric, fontWeight: 700, fontSize: 17 }}>{entry.sleepHours.toFixed(1)} <span style={{ fontFamily: M.body, fontSize: 11 }}>h</span></div></div><div style={{ padding: "9px 8px", borderRadius: 10, background: M.cardHi }}><div style={{ color: M.mut, fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>{t("recovery.checkin.stress")}</div><div style={{ marginTop: 3, color: M.fg, fontFamily: M.numeric, fontWeight: 700, fontSize: 17 }}>{entry.stressLevel}<span style={{ fontFamily: M.body, fontSize: 11, color: M.mut }}> /10</span></div></div><div style={{ padding: "9px 8px", borderRadius: 10, background: M.cardHi }}><div style={{ color: M.mut, fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>{t("recovery.checkin.energy")}</div><div style={{ marginTop: 3, color: M.fg, fontFamily: M.numeric, fontWeight: 700, fontSize: 17 }}>{entry.energyLevel}<span style={{ fontFamily: M.body, fontSize: 11, color: M.mut }}> /10</span></div></div></div>{entry.note ? <div style={{ color: M.mut2, fontSize: 13, lineHeight: 1.4, marginTop: 11 }}>{entry.note}</div> : null}</div>)}</div>}
          </>
        )}
      </div>

      <DeleteConfirmDialog open={!!deleteTarget} title={t("recovery.delete.title")} message={deleteMessage} busy={deleteBusy} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <AlertSheet open={!!alertSheet} title={alertSheet?.title ?? ""} message={alertSheet?.message ?? ""} onClose={() => setAlertSheet(null)} />
      {user ? (
        <>
          <ProteinPresetLogSheet open={!!activePreset} preset={activePreset} onClose={() => setActivePreset(null)} onSaved={reloadProtein} userId={user.id} logSource="quick" />
          <ManualProteinLogSheet open={manualProteinOpen} onClose={() => setManualProteinOpen(false)} onSaved={reloadProtein} userId={user.id} />
          <ProteinTargetSheet
            open={proteinTargetOpen}
            mode={preferences.proteinTargetMode}
            targetG={preferences.proteinTargetG ?? targets.proteinTargetG}
            onClose={() => setProteinTargetOpen(false)}
            onSave={(proteinTarget) => updatePreferences(proteinTarget, true)}
          />
          <WaterAmountSheet open={manualWaterOpen} onClose={() => setManualWaterOpen(false)} onSaved={reloadWater} userId={user.id} />
          <WaterTargetSheet
            open={waterTargetOpen}
            targetMl={targets.waterTargetMl}
            onClose={() => setWaterTargetOpen(false)}
            onSave={(waterTargetMl) => updatePreferences({ waterTargetMl }, true)}
          />
          <WaterQuickAmountsSheet
            open={quickAmountsOpen}
            amountsMl={preferences.waterQuickAmountsMl}
            onClose={() => setQuickAmountsOpen(false)}
            onSave={(waterQuickAmountsMl) => updatePreferences({ waterQuickAmountsMl }, true)}
          />
        </>
      ) : null}
    </div>
  );
}
