import { M } from "../theme";
import { toYouTubeEmbedUrl } from "../lib/youtube";
import { BottomSheet } from "./BottomSheet";
import { Icon } from "./Icon";
import { useI18n } from "../lib/i18n";

export interface ExerciseVideoSheetProps {
  open: boolean;
  exerciseName: string;
  youtubeUrl: string;
  onClose: () => void;
}

export function ExerciseVideoSheet({ open, exerciseName, youtubeUrl, onClose }: ExerciseVideoSheetProps) {
  const { t } = useI18n();
  const embedUrl = toYouTubeEmbedUrl(youtubeUrl);

  return (
    <BottomSheet open={open} onClose={onClose} zIndex={30} aria-label={t("exerciseVideo.aria", { name: exerciseName })}>
      <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700 }}>{t("exerciseVideo.title")}</div>
            <div
              style={{
                fontFamily: M.label,
                fontWeight: 700,
                fontSize: 20,
                lineHeight: 1.15,
                marginTop: 4,
                color: M.fg,
              }}
            >
              {exerciseName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("exerciseDetail.close")}
            style={{
              background: "none",
              border: "none",
              color: M.mut2,
              cursor: "pointer",
              padding: 4,
              display: "flex",
              flexShrink: 0,
            }}
          >
            <Icon name="x" size={22} stroke={2.2} />
          </button>
        </div>

        {embedUrl ? (
          <div
            style={{
              position: "relative",
              width: "100%",
              paddingBottom: "56.25%",
              borderRadius: 12,
              overflow: "hidden",
              background: "#000",
              border: "1px solid " + M.line2,
            }}
          >
            <iframe
              title={t("exerciseVideo.youtubeTitle", { name: exerciseName })}
              src={embedUrl}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: "none",
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <div style={{ color: M.mut, fontSize: 14, lineHeight: 1.45 }}>
            {t("exerciseVideo.invalid")}
          </div>
        )}

        <p style={{ color: M.mut2, fontSize: 13, lineHeight: 1.4, marginTop: 12, marginBottom: 0 }}>
          {t("exerciseVideo.playbackHint")}
        </p>
      </div>
    </BottomSheet>
  );
}
