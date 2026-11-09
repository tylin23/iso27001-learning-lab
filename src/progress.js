import { levels } from "./lessons.js";
import { annexThemes, chapters, clauseMap, clauses, controlMap } from "./standard.js";

export const storageKey = "iso27001-learning-lab.v2";
export const legacyStorageKey = "iso27001-learning-lab.v1";
// v1 的關卡 id 對應到 v2。步驟序號不變。
export const legacyLevelIds = {
  access: "access", scope: "c4_3", risk: "c6_1_2", treatment: "c6_1_3",
  incident: "annex_org", audit: "c9_2", transfer: "transfer",
};
export const settings = {
  public: "拿到連結的人都能看",
  closed: "暫停所有人存取",
  team: "僅限值班小組",
};
export const roles = { guest: "外部訪客", staff: "報到同仁" };

export function permissions(setting, role) {
  return setting === "public" || (setting === "team" && role === "staff");
}

export function labPassed(entry) {
  return entry?.setting === "team" && entry.tested?.guest && entry.tested?.staff;
}

export function setLabSetting(entry, setting) {
  if (entry.setting !== setting) {
    entry.setting = setting;
    entry.tested = { guest: false, staff: false };
  }
}

export function newEntry(step) {
  return step.type === "lab"
    ? { setting: "public", role: "guest", tested: { guest: false, staff: false }, hinted: false }
    : { choice: null, incorrect: false, hinted: false };
}

export function isSolved(step, entry) {
  return step.type === "lab" ? Boolean(labPassed(entry)) : Boolean(step.options[entry?.choice]?.[1]);
}

export function levelPassed(level, progress) {
  return level.steps.every((step, index) => isSolved(step, progress[level.id]?.[index]));
}

export function nextLevel(progress) {
  return levels.find((level) => !levelPassed(level, progress));
}

export const chapterLevels = (chapterId) => levels.filter((level) => level.chapter === chapterId);

// 章與章之間依序解鎖，同一章內可自由選關。
export function chapterOpen(chapterId, progress) {
  for (const chapter of chapters) {
    if (chapter.id === chapterId) return true;
    if (!chapterLevels(chapter.id).every((level) => levelPassed(level, progress))) return false;
  }
  return false;
}

export function levelOpen(level, progress) {
  return chapterOpen(level.chapter, progress);
}

export function levelClauses(level) {
  return (level.clauses ?? []).map((id) => clauseMap.get(id));
}

export function levelLabel(level) {
  if (level.clauses?.length) return level.clauses.map((id) => `${id} ${clauseMap.get(id)[2]}`).join("、");
  if (level.controls?.length) return `附錄 A｜${annexThemes.find((theme) => theme.id === level.theme).title}`;
  return level.standard;
}

export function levelsForClause(id) {
  return levels.filter((level) => level.clauses?.includes(id));
}

export function levelsForControl(id) {
  return levels.filter((level) => level.controls?.includes(id));
}

export function passedClauses(progress) {
  return clauses.filter(([id]) => {
    const found = levelsForClause(id);
    return found.length > 0 && found.every((level) => levelPassed(level, progress));
  }).map(([id]) => id);
}

export function coverageGaps() {
  return {
    clauses: clauses.map(([id]) => id).filter((id) => !levelsForClause(id).length),
    themes: annexThemes.filter((theme) => !levels.some((level) => level.theme === theme.id)).map((theme) => theme.id),
    unknownClauses: levels.flatMap((level) => level.clauses ?? []).filter((id) => !clauseMap.has(id)),
    unknownControls: levels.flatMap((level) => level.controls ?? []).filter((id) => !controlMap.has(id)),
  };
}

// 把 v1 的進度搬到 v2 的關卡 id。無法辨識的內容會被略過。
export function migrateLegacy(raw) {
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!saved || typeof saved !== "object") return {};
  const mapped = {};
  for (const [oldId, newId] of Object.entries(legacyLevelIds)) {
    if (Array.isArray(saved[oldId])) mapped[newId] = saved[oldId];
  }
  return readProgress(JSON.stringify(mapped));
}

export function readProgress(raw) {
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch {
    return {};
  }

  const progress = {};
  for (const level of levels) {
    if (!Array.isArray(saved?.[level.id])) continue;
    progress[level.id] = level.steps.map((step, index) => {
      const entry = saved[level.id][index];
      if (!entry || typeof entry !== "object") return null;
      if (step.type === "lab") {
        return {
          setting: typeof entry.setting === "string" && Object.hasOwn(settings, entry.setting) ? entry.setting : "public",
          role: typeof entry.role === "string" && Object.hasOwn(roles, entry.role) ? entry.role : "guest",
          tested: { guest: entry.tested?.guest === true, staff: entry.tested?.staff === true },
          hinted: entry.hinted === true,
        };
      }
      return {
        choice: Number.isInteger(entry.choice) && step.options[entry.choice] ? entry.choice : null,
        incorrect: entry.incorrect === true,
        hinted: entry.hinted === true,
      };
    });
  }
  return progress;
}

export function recordValue(step, entry) {
  if (step.type === "lab") return "僅限值班小組。已驗證外部訪客無法查看，報到同仁仍可查詢。";
  return step.options[entry.choice][0];
}

export function buildSummary(progress) {
  const lines = ["資安值班室｜學習案件摘要", "以下是虛構案件的教學演練紀錄。", ""];
  for (const level of levels) {
    const entries = progress[level.id];
    if (!level.steps.some((step, index) => isSolved(step, entries?.[index]))) continue;
    lines.push(`${level.title}（${levelLabel(level)}）`);
    level.steps.forEach((step, index) => {
      const entry = entries?.[index];
      if (isSolved(step, entry)) lines.push(`• ${step.record}｜${recordValue(step, entry)}`);
    });
    lines.push("");
  }
  const passed = passedClauses(progress);
  if (passed.length) {
    lines.push(`已通過條文（${passed.length} / ${clauses.length}）：${passed.join("、")}`, "");
  }
  return lines.join("\n");
}
