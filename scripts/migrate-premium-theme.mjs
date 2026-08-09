#!/usr/bin/env node
/**
 * One-shot migration script for Premium Longevity redesign.
 * Run: node scripts/migrate-premium-theme.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "src");

const DISPLAY_FILES = new Set([
  "PlansScreen.tsx",
  "HomeScreen.tsx",
  "WelcomeScreen.tsx",
  "AboutScreen.tsx",
  "ProfileScreen.tsx",
  "SettingsScreen.tsx",
  "HistoryScreen.tsx",
  "ExercisesScreen.tsx",
  "StatsScreen.tsx",
  "RecoveryScreen.tsx",
  "SupportScreen.tsx",
  "TrackScreen.tsx",
  "PlanDetailScreen.tsx",
  "PlanBuilderScreen.tsx",
  "SessionDetailScreen.tsx",
  "SessionEditScreen.tsx",
  "BodyTrackerScreen.tsx",
  "OnboardingWizard.tsx",
  "AITrainingPlanWizard.tsx",
  "ExpressTrackingSetupScreen.tsx",
  "ConfirmSheet.tsx",
  "AlertSheet.tsx",
  "DeleteConfirmDialog.tsx",
  "WelcomeHero.tsx",
  "AiConsentStep.tsx",
  "AppSidePanel.tsx",
  "ExerciseFormSheet.tsx",
  "ExercisePickerSheet.tsx",
  "ExerciseDetailSheet.tsx",
  "ExerciseVideoSheet.tsx",
  "ExerciseHistorySheet.tsx",
  "MetconConfigSheet.tsx",
  "MetricCategorySheet.tsx",
  "OneRmCalculatorSheet.tsx",
  "IntervalTimerSheet.tsx",
  "TimerLeaveSheet.tsx",
  "WeekPlannerSheet.tsx",
  "WorkoutFinishSheet.tsx",
  "SyncStatusSheet.tsx",
  "AvatarActionSheet.tsx",
  "AvatarCropSheet.tsx",
  "WaterAmountSheet.tsx",
  "WaterTargetSheet.tsx",
  "WaterQuickAmountsSheet.tsx",
  "ManualProteinLogSheet.tsx",
  "ProteinPresetLogSheet.tsx",
  "HeartRateConnectSheet.tsx",
  "TrackExerciseMenuSheet.tsx",
  "TrackExerciseNoteSheet.tsx",
  "ExerciseSetEditSheet.tsx",
  "TrackAutopilotBootOverlay.tsx",
  "ExpressWorkoutCompleteView.tsx",
  "TimerSettingsStep.tsx",
  "TimerTypeStep.tsx",
  "AuthFlow.tsx",
]);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (/\.(tsx|ts)$/.test(ent.name)) acc.push(p);
  }
  return acc;
}

function migrateContent(filePath, content) {
  const base = path.basename(filePath);
  if (base === "theme.ts") return content;

  let c = content;

  // Remove deprecated theme imports/usages
  c = c.replace(/,\s*buttonReleaseGlowStyle/g, "");
  c = c.replace(/buttonReleaseGlowStyle,\s*/g, "");
  c = c.replace(/import\s*\{\s*buttonReleaseGlowStyle\s*\}\s*from\s*["'][^"']+["'];\s*/g, "");

  // Brand token renames
  c = c.replace(/M\.brandButtonGradient/g, "M.acc");
  c = c.replace(/M\.brandButtonGlow/g, '""');
  c = c.replace(/M\.brandGlow/g, '""');
  c = c.replace(/M\.brandGradientSubtle/g, "M.panel");
  c = c.replace(/M\.brandGradient(?!Subtle)/g, "M.brandSoft");

  // Danger colors
  c = c.replace(/#ff8a8a/gi, "M.danger");
  c = c.replace(/#ff5e5e/gi, "M.danger");
  c = c.replace(/#f5b4b4/gi, "M.danger");
  c = c.replace(/#f87171/gi, "M.danger");
  c = c.replace(/#ef4444/gi, "M.danger");
  c = c.replace(/rgba\(255,\s*80,\s*80,\s*\.12\)/g, "M.dangerSoft");
  c = c.replace(/rgba\(255,\s*80,\s*80,\s*\.25\)/g, "M.dangerBorder");
  c = c.replace(/rgba\(245,\s*180,\s*180,\s*\.35\)/g, "M.dangerBorder");
  c = c.replace(/rgba\(245,\s*180,\s*180,\s*\.08\)/g, "M.dangerSoft");
  c = c.replace(/rgba\(239,\s*68,\s*68,\s*[^)]+\)/g, "M.dangerSoft");

  // Dark backgrounds -> light
  c = c.replace(/#141414/g, "M.bg");
  c = c.replace(/#1c1c1c/g, "M.panel");
  c = c.replace(/#262626/g, "M.card");
  c = c.replace(/#323232/g, "M.cardHi");
  c = c.replace(/#101010/g, "M.panel");
  c = c.replace(/#151915/g, "M.panel");
  c = c.replace(/#121512/g, "M.panel");
  c = c.replace(/#0a0a0a/g, "M.fg");
  c = c.replace(/#0a1a0a/g, "M.fg");
  c = c.replace(/#fafafa/g, "M.fg");
  c = c.replace(/#7ef67b/gi, "M.brand");

  // Lime rgba
  c = c.replace(/rgba\(126,\s*246,\s*123,\s*[^)]+\)/g, "M.brandSoft");
  c = c.replace(/rgba\(200,\s*255,\s*0,\s*[^)]+\)/g, "M.brandSoft");
  c = c.replace(/rgba\(212,\s*255,\s*0,\s*[^)]+\)/g, "M.brandSoft");
  c = c.replace(/rgba\(10,\s*26,\s*10,\s*[^)]+\)/g, "M.mut2");

  // White-on-dark rgba -> light theme
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.11\)/g, "M.line");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.07\)/g, "M.line2");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.58\)/g, "M.mut");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.32\)/g, "M.mut2");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.10\)/g, "M.accSoft");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.08\)/g, "M.overlayLight");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.12\)/g, "M.line");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.06\)/g, "M.line2");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.03\)/g, "M.line2");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.015\)/g, "M.line2");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*\.02\)/g, "M.line2");
  c = c.replace(/rgba\(255,\s*255,\s*255,\s*0\.03\)/g, "M.line2");

  // Dark overlays -> light
  c = c.replace(/rgba\(20,\s*20,\s*20,\s*\.72\)/g, "M.overlay");
  c = c.replace(/rgba\(20,\s*20,\s*20,\s*\.65\)/g, "M.overlay");
  c = c.replace(/rgba\(5,\s*7,\s*5,\s*\.6\)/g, "M.overlay");
  c = c.replace(/rgba\(0,\s*0,\s*0,\s*\.45\)/g, "M.overlay");
  c = c.replace(/rgba\(0,\s*0,\s*0,\s*\.6\)/g, "M.overlay");
  c = c.replace(/rgba\(0,\s*0,\s*0,\s*\.5\)/g, "M.overlay");
  c = c.replace(/rgba\(0,\s*0,\s*0,\s*\.4\)/g, "M.overlay");
  c = c.replace(/rgba\(0,\s*0,\s*0,\s*\.32\)/g, "M.shadow");
  c = c.replace(/rgba\(0,\s*0,\s*0,\s*\.3\)/g, "M.overlay");

  // Remove backdrop blur
  c = c.replace(/backdropFilter:\s*"blur\([^"]+\)"[^,]*,?\s*/g, "");
  c = c.replace(/WebkitBackdropFilter:\s*"blur\([^"]+\)"[^,]*,?\s*/g, "");

  // LOGO references
  c = c.replace(/LOGO_ICON|LOGO_WORDMARK/g, "APP_NAME");

  // Font: categorize M.disp
  if (c.includes("M.disp")) {
    if (DISPLAY_FILES.has(base)) {
      // Headlines / sheet titles -> display; keep numeric contexts
      c = c.replace(/fontFamily:\s*M\.disp/g, (match, offset) => {
        const slice = c.slice(Math.max(0, offset - 200), offset + 200);
        if (/tabular-nums|fontVariantNumeric|TimerClock|Stepper|fontSize:\s*(3[0-9]|[4-9][0-9])/.test(slice)) {
          return "fontFamily: M.numeric";
        }
        if (/textTransform:\s*["']uppercase["']|letterSpacing:\s*[01]\./.test(slice)) {
          return "fontFamily: M.label";
        }
        return "fontFamily: M.display";
      });
    } else {
      c = c.replace(/fontFamily:\s*M\.disp/g, "fontFamily: M.numeric");
    }
  }

  // Headline weight normalization where display is used
  if (DISPLAY_FILES.has(base)) {
    c = c.replace(/fontFamily:\s*M\.display[^}]*fontWeight:\s*800/g, (m) =>
      m.replace("fontWeight: 800", "fontWeight: 400"),
    );
    c = c.replace(/fontFamily:\s*M\.display[^}]*fontWeight:\s*700/g, (m) =>
      m.replace("fontWeight: 700", "fontWeight: 400"),
    );
  }

  // Ensure M import if M. tokens used
  if (/\bM\.(danger|brand|bg|panel|card|fg|mut|overlay|display|numeric|label)\b/.test(c)) {
    if (!c.includes('from "../theme"') && !c.includes('from "../../theme"') && !c.includes('from "../../../theme"') && !c.includes('from "../theme.ts"')) {
      // theme.ts itself
      if (!base.endsWith("theme.ts") && c.includes("M.")) {
        // try to add import - skip complex cases
      }
    }
  }

  // APP_NAME import for former LOGO
  if (/\bAPP_NAME\b/.test(c) && !c.includes("APP_NAME") && c.includes("from \"../theme\"")) {
    c = c.replace(/from "\.\.\/theme"/, 'from "../theme"');
  }

  return c;
}

const files = walk(SRC);
let changed = 0;
for (const f of files) {
  const orig = fs.readFileSync(f, "utf8");
  const next = migrateContent(f, orig);
  if (next !== orig) {
    fs.writeFileSync(f, next);
    changed++;
  }
}
console.log(`Migrated ${changed} files.`);
