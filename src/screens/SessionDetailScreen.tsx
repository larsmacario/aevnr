import { useState } from "react";
import { M } from "../theme";
import { deleteSession, useSession } from "../lib/db";
import { formatSetSummary } from "../lib/exerciseSets";
import { formatTimerDetailMetrics, isTimerSession } from "../lib/timerSession";
import { groupExercisesByBlock, type TrainingBlockType } from "../lib/planBlocks";
import { Icon } from "../components/Icon";
import { MTag } from "../components/widgets";
import { PlanBlockSection } from "../components/PlanBlockSection";
import { SupersetBlock } from "../components/SupersetBlock";
import { segmentExercises } from "../lib/superset";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { MButton } from "../components/MButton";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { useI18n } from "../lib/i18n";
export interface SessionDetailScreenProps {
  sessionId: string;
  trackLoading?: boolean;
  onBack: () => void;
  onEdit: (sessionId: string) => void;
  onDeleted: () => void;
}

function formatPerformedAt(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionDetailScreen({
  sessionId,
  trackLoading,
  onBack,
  onEdit,
  onDeleted,
}: SessionDetailScreenProps) {
  const { locale, t } = useI18n();
  const { data: session, loading, error } = useSession(sessionId);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDelete = async () => {
    if (!session) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteSession(session.id);
      setDeleteConfirmOpen(false);
      onDeleted();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : t("session.deleteFailed"));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: M.mut, fontSize: 14 }}>
        {t("session.loading")}
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 22 }}>
        <div style={{ color: M.mut, fontSize: 14 }}>{error ?? t("session.notFound")}</div>
        <MButton onClick={onBack} variant="primary" size="sm">
          {t("common.back")}
        </MButton>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader onBack={onBack} title={t("session.title")} />

      {actionError && <div style={{ padding: "0 22px 8px", color: M.danger, fontSize: 13 }}>{actionError}</div>}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 22px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: M.numeric, fontWeight: 700, fontSize: 30, lineHeight: 1.1 }}>{session.name}</div>
          {session.pr && <MTag>PR</MTag>}
        </div>
        <div style={{ fontSize: 13, color: M.mut, marginTop: 8, fontWeight: 600 }}>{formatPerformedAt(session.performedAt, locale)}</div>

        {session.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            {session.tags.map((t) => (
              <MTag key={t}>{t}</MTag>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 14,
            fontSize: 14,
            color: M.mut,
            fontWeight: 600,
            flexWrap: "wrap",
          }}
        >
          {isTimerSession(session.tags) ? (
            formatTimerDetailMetrics(session).map((part, i) => (
              <span key={part} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {i === 0 && <Icon name="timer" size={15} stroke={2} color={M.mut} />}
                {part}
              </span>
            ))
          ) : (
            <>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="clock" size={15} stroke={2} color={M.mut} />
                {t("session.minutes", { count: session.dur })}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="bolt" size={15} color={M.mut} />
                {t("session.volume", { value: session.vol.toFixed(1) })}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="list" size={15} stroke={2} color={M.mut} />
                {t("session.sets", { count: session.sets })}
              </span>
            </>
          )}
        </div>

        {session.skippedBlocks.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 13, color: M.mut, fontWeight: 600 }}>
            {t("session.skipped", { blocks: session.skippedBlocks.map((block: TrainingBlockType) => t(block === "warmup" ? "block.warmup" : block === "skill" ? "block.skill" : block === "strength" ? "block.strength" : "block.metcon")).join(", ") })}
          </div>
        )}

        {session.exercises.length > 0 && (
          <>
            <div style={{ marginTop: 18, fontSize: 13, letterSpacing: 1.5, color: M.mut, fontWeight: 700 }}>{t("session.exercises")}</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
              {groupExercisesByBlock(
                session.exercises.map((ex) => ({ ...ex, blockType: ex.blockType ?? "strength" })),
              ).map(({ block, exercises: blockExercises }) => {
                const skipped = session.skippedBlocks.includes(block);
                if (blockExercises.length === 0 && !skipped) return null;
                return (
                  <PlanBlockSection key={block} block={block} skipped={skipped}>
                    {blockExercises.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {segmentExercises(blockExercises).map((seg) => {
                          const renderEx = (ex: (typeof session.exercises)[number]) => (
                            <div
                              key={ex.id}
                              style={{
                                padding: "10px 12px",
                                borderRadius: 12,
                                background: M.card,
                                border: "1px solid " + M.line2,
                                fontSize: 13,
                                fontWeight: 600,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    background: M.accSoft,
                                    color: M.acc,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flex: "0 0 auto",
                                  }}
                                >
                                  <Icon name="dumbbell" size={16} stroke={2} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: M.fg }}>{ex.name}</div>
                                  {ex.note && (
                                    <div style={{ color: M.mut, fontSize: 13, marginTop: 2, fontWeight: 500 }}>{ex.note}</div>
                                  )}
                                </div>
                                <span style={{ color: M.mut2, fontSize: 13, flex: "0 0 auto" }}>
                                  {formatSetSummary(ex.sets, ex.metric)}
                                </span>
                              </div>
                              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                                {ex.sets.map((s, si) => (
                                  <div
                                    key={si}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "6px 8px",
                                      borderRadius: 8,
                                      background: s.done ? M.accSoft : "transparent",
                                      color: s.done ? M.fg : M.mut2,
                                      fontSize: 14,
                                    }}
                                  >
                                    <span>{t("session.set", { number: si + 1 })}</span>
                                    <span style={{ fontFamily: M.display, fontWeight: 400, display: "inline-flex", alignItems: "center", gap: 6 }}>
                                      {s.kg} kg × {s.reps}
                                      {s.done && <Icon name="check" size={14} stroke={2.6} color={M.acc} />}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                          if (seg.kind === "single") return renderEx(seg.exercise);
                          return (
                            <SupersetBlock key={seg.exercises.map((e) => e.id).join("-")}>
                              {seg.exercises.map((ex) => renderEx(ex))}
                            </SupersetBlock>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: M.mut, fontWeight: 500 }}>{t("session.notCompleted")}</div>
                    )}
                  </PlanBlockSection>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div style={{ padding: "10px 22px 14px", display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid " + M.line2 }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "stretch", gap: 8, flexWrap: "nowrap" }}>
          <MButton
            disabled={busy || trackLoading}
            onClick={() => onEdit(session.id)}
            variant="secondary"
            size="sm"
            style={{ flex: 1, minWidth: 0, background: M.card }}
          >
            <Icon name="edit" size={16} stroke={2} color={M.fg} />
            {t("session.edit")}
          </MButton>
          <MButton
            disabled={busy || trackLoading}
            onClick={() => setDeleteConfirmOpen(true)}
            variant="danger"
            size="icon"
            aria-label={t("session.deleteAria")}
            style={{ flexShrink: 0 }}
          >
            <Icon name="trash" size={16} stroke={2} color={M.mut2} />
          </MButton>
        </div>
      </div>

      <DeleteConfirmDialog
        open={deleteConfirmOpen && !!session}
        title={t("session.delete.title")}
        message={session ? t("session.delete.message", { name: session.name }) : null}
        step2Title={t("session.delete.step2Title")}
        step2Message={session ? t("session.delete.step2Message", { name: session.name }) : null}
        busy={busy}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
