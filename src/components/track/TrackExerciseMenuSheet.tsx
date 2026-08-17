import { BottomSheet } from "../BottomSheet";
import { Icon } from "../Icon";
import { M } from "../../theme";
import { useI18n } from "../../lib/i18n";

export interface TrackExerciseMenuSheetProps {
  open: boolean;
  exerciseName: string;
  hasVideo: boolean;
  showSupersetAction: boolean;
  linkedToPrevious: boolean;
  onClose: () => void;
  onVideo?: () => void;
  onEditSets?: () => void;
  onGuide?: () => void;
  onHistory: () => void;
  onNotes?: () => void;
  onRemove: () => void;
  onToggleSuperset?: () => void;
  /** Nur Sätze bearbeiten + Aus Session entfernen (Verlauf/Video/Supersatz ausgeblendet). */
  variant?: "full" | "actions";
}

function MenuAction({
  label,
  icon,
  onClick,
  danger = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 4px",
        background: "none",
        border: "none",
        borderBottom: "1px solid " + M.line2,
        cursor: "pointer",
        color: danger ? M.danger : M.fg,
        fontSize: 15,
        fontWeight: 600,
        textAlign: "left",
      }}
    >
      <Icon name={icon} size={18} stroke={2} color={danger ? M.danger : M.mut2} />
      {label}
    </button>
  );
}

export function TrackExerciseMenuSheet({
  open,
  exerciseName,
  hasVideo,
  showSupersetAction,
  linkedToPrevious,
  onClose,
  onVideo,
  onEditSets,
  onGuide,
  onHistory,
  onNotes,
  onRemove,
  onToggleSuperset,
  variant = "full",
}: TrackExerciseMenuSheetProps) {
  const { t } = useI18n();
  const compact = variant === "actions";

  return (
    <BottomSheet open={open} onClose={onClose} aria-label={t("exerciseMenu.aria", { name: exerciseName })} fitContent>
      <div style={{ padding: "4px 20px 20px" }}>
        <div
          style={{
            fontFamily: M.display,
            fontWeight: 400,
            fontSize: 18,
            color: M.fg,
            marginBottom: 8,
            paddingRight: 8,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {exerciseName}
        </div>
        {hasVideo && onVideo && !compact ? (
          <MenuAction
            label={t("exerciseMenu.video")}
            icon="play"
            onClick={() => {
              onClose();
              onVideo();
            }}
          />
        ) : null}
        {onEditSets ? (
          <MenuAction
            label={t("exerciseMenu.editSets")}
            icon="edit"
            onClick={() => {
              onClose();
              onEditSets();
            }}
          />
        ) : null}
        {onGuide ? (
          <MenuAction
            label={t("exerciseMenu.guide")}
            icon="list"
            onClick={() => {
              onClose();
              onGuide();
            }}
          />
        ) : null}
        {onNotes ? (
          <MenuAction
            label={t("exerciseMenu.notes")}
            icon="edit"
            onClick={() => {
              onClose();
              onNotes();
            }}
          />
        ) : null}
        <MenuAction
          label={t("exerciseMenu.history")}
          icon="history"
          onClick={() => {
            onClose();
            onHistory();
          }}
        />
        {showSupersetAction && onToggleSuperset && !compact ? (
          <MenuAction
            label={linkedToPrevious ? t("exerciseMenu.unlinkSuperset") : t("exerciseMenu.linkPrevious")}
            icon="layers"
            onClick={() => {
              onClose();
              onToggleSuperset();
            }}
          />
        ) : null}
        <MenuAction
          label={t("exerciseMenu.remove")}
          icon="trash"
          danger
          onClick={() => {
            onClose();
            onRemove();
          }}
        />
      </div>
    </BottomSheet>
  );
}
