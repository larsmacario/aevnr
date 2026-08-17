import { useEffect, useMemo, useState } from "react";
import { M } from "../theme";
import type { SessionExercise } from "../data";
import { sessionMetrics } from "../lib/engine";
import { updateSession, useExercises, useSession } from "../lib/db";
import { usePreferences } from "../lib/preferences";
import { MTag } from "../components/widgets";
import { SessionExerciseEditor } from "../components/SessionExerciseEditor";
import { MButton } from "../components/MButton";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { useI18n } from "../lib/i18n";

export interface SessionEditScreenProps {
  sessionId: string;
  onBack: () => void;
  onSave: () => void;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const fieldLabel: React.CSSProperties = {
  fontSize: 13,
  letterSpacing: 1.5,
  color: M.mut,
  fontWeight: 700,
  marginBottom: 8,
};

const fieldInput: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid " + M.line,
  background: M.card,
  color: M.fg,
  fontSize: 15,
  fontWeight: 600,
  outline: "none",
  boxSizing: "border-box",
};

export function SessionEditScreen({ sessionId, onBack, onSave }: SessionEditScreenProps) {
  const { t } = useI18n();
  const { data: session, loading, error } = useSession(sessionId);
  const { data: library, loading: libraryLoading, reload: reloadExercises } = useExercises();
  const { preferences } = usePreferences();
  const [name, setName] = useState("");
  const [performedAt, setPerformedAt] = useState("");
  const [dur, setDur] = useState("0");
  const [isPr, setIsPr] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const metrics = useMemo(() => sessionMetrics(exercises), [exercises]);

  useEffect(() => {
    if (!session || initialized) return;
    setName(session.name);
    setPerformedAt(toDatetimeLocal(session.performedAt));
    setDur(String(session.dur));
    setIsPr(session.pr);
    setTags([...session.tags]);
    setExercises(session.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })));
    setInitialized(true);
  }, [session, initialized]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag));

  const handleSave = async () => {
    if (!session) return;
    const durationMin = Math.max(1, Math.round(Number(dur) || 0));
    const trimmedName = name.trim() || session.name;

    setSaving(true);
    setSaveError(null);
    try {
      await updateSession(session.id, {
        name: trimmedName,
        tags,
        durationMin,
        volumeKg: metrics.volumeKg,
        setCount: metrics.setCount,
        isPr,
        performedAt: new Date(performedAt).toISOString(),
        exercises: exercises.map((e) => ({
          name: e.name,
          note: e.note,
          blockType: e.blockType,
          blockFormat: e.blockFormat,
          blockId: e.blockId,
          supersetId: e.supersetId,
          catalogExerciseId: e.catalogExerciseId,
          perceivedEffort: e.perceivedEffort,
          metric: e.metric,
          sets: e.sets,
        })),
      });
      onSave();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : t("session.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !initialized) {
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
      <ScreenBackHeader
        onBack={onBack}
        title={t("session.editTitle")}
        trailing={
          <MButton
            disabled={saving || exercises.length === 0}
            onClick={handleSave}
            variant="ghost"
            size="sm"
            loading={saving}
            style={{ fontFamily: M.label, color: M.fg, letterSpacing: 0.4 }}
          >
            {t("session.save")}
          </MButton>
        }
      />

      {saveError && <div style={{ padding: "0 22px 8px", color: M.danger, fontSize: 13 }}>{saveError}</div>}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `0 22px ${SCROLL_BOTTOM_PADDING}px`, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div style={fieldLabel}>{t("session.field.name")}</div>
          <input value={name} onChange={(e) => setName(e.target.value)} style={fieldInput} />
        </div>

        <div>
          <div style={fieldLabel}>{t("session.field.dateTime")}</div>
          <input
            type="datetime-local"
            value={performedAt}
            onChange={(e) => setPerformedAt(e.target.value)}
            style={fieldInput}
          />
        </div>

        <div>
          <div style={fieldLabel}>{t("session.field.duration")}</div>
          <input type="number" min={1} value={dur} onChange={(e) => setDur(e.target.value)} style={fieldInput} />
        </div>

        <div>
          <div style={fieldLabel}>{t("session.field.tags")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => removeTag(t)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
              >
                <MTag>{t} ×</MTag>
              </button>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder={t("session.field.addTag")}
              style={{ ...fieldInput, flex: "1 1 120px", minWidth: 100, padding: "8px 12px", fontSize: 13 }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsPr((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid " + (isPr ? M.acc : M.line),
            background: isPr ? M.accSoft : M.card,
            cursor: "pointer",
            color: M.fg,
          }}
        >
          <span style={{ fontFamily: M.display, fontWeight: 400, fontSize: 15 }}>{t("session.field.personalRecord")}</span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.6,
              color: isPr ? M.accInk : M.mut,
              background: isPr ? M.acc : M.line2,
              padding: "4px 10px",
              borderRadius: 6,
            }}
          >
            {isPr ? t("session.field.on") : t("session.field.off")}
          </span>
        </button>

        <div>
          <div style={fieldLabel}>{t("session.field.exercises")}</div>
          <SessionExerciseEditor
            exercises={exercises}
            onChange={setExercises}
            library={library ?? []}
            libraryLoading={libraryLoading}
            onLibraryChange={() => reloadExercises()}
            defaultSets={preferences.defaultSets}
            defaultReps={preferences.defaultReps}
          />
        </div>
      </div>
    </div>
  );
}
