import { levels } from "./lessons.js";

export const storageKey = "iso27001-learning-lab.v1";
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
    lines.push(level.title);
    level.steps.forEach((step, index) => {
      const entry = entries?.[index];
      if (isSolved(step, entry)) lines.push(`• ${step.record}｜${recordValue(step, entry)}`);
    });
    lines.push("");
  }
  return lines.join("\n");
}
