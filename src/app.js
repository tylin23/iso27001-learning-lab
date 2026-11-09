import { levels, standardSources, terms } from "./lessons.js";
import { comparisons } from "./compare.js";
import { annexThemes, chapters, clauses, controlMap } from "./standard.js";
import {
  buildSummary, chapterLevels, chapterOpen, isSolved, legacyStorageKey, levelClauses, levelLabel,
  levelOpen, levelPassed, levelsForClause, migrateLegacy, newEntry, nextLevel,
  passedClauses, permissions, readProgress, recordValue, roles, setLabSetting, settings, storageKey,
} from "./progress.js";

const main = document.querySelector("#main");
const announcer = document.querySelector("#announcer");
const number = (index) => String(index + 1).padStart(2, "0");
const levelPath = (level) => `#/level/${level.id}`;
const hasRecords = () => levels.some((level) =>
  level.steps.some((step, index) => isSolved(step, progress[level.id]?.[index])),
);
const chapterOf = (id) => chapters.find((chapter) => chapter.id === id);
let progress = {};
let canSave = true;
let lessonStep = 0;

// v2 還沒有資料時，沿用 v1 的進度並搬到新的關卡 id。
function loadStored() {
  const raw = localStorage.getItem(storageKey);
  return raw === null ? migrateLegacy(localStorage.getItem(legacyStorageKey)) : readProgress(raw);
}

try {
  progress = loadStored();
} catch {
  canSave = false;
}

function refreshProgress() {
  if (!canSave) return;
  try {
    progress = loadStored();
  } catch {
    canSave = false;
  }
}

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
    canSave = true;
  } catch {
    canSave = false;
  }
}

function assisted(level) {
  return progress[level.id]?.some((entry) => entry?.hinted || entry?.incorrect);
}

function priorRecord(levelId, stepIndex) {
  const level = levels.find(({ id }) => id === levelId);
  const step = level.steps[stepIndex];
  const entry = progress[levelId]?.[stepIndex];
  return isSolved(step, entry) ? [step.record, recordValue(step, entry)] : null;
}

function overview(label, title, intro) {
  return `<header class="page-intro">
    <p class="eyebrow">${label}</p><h1>${title}</h1><p>${intro}</p>
  </header>`;
}

function home() {
  const next = nextLevel(progress);
  const done = levels.filter((level) => levelPassed(level, progress)).length;
  const started = Object.values(progress).some((entries) => entries.some(Boolean));
  const startLabel = done === levels.length ? "查看案件檔案" : started ? "繼續上次任務" : "開始值班";
  return `<section class="hero">
    <div class="hero-copy">
      <p class="eyebrow"><span class="signal"></span> CASE 01 / 名冊外露事件</p>
      <h1>今天，由你<span>值班。</span></h1>
      <p>明天就是活動日。有人發現，只要拿到連結，就能看到整份報名名冊。<strong>你會先做什麼？</strong></p>
      <div class="actions">
        <a class="button primary" href="${next ? levelPath(next) : "#/file"}">${startLabel}<span aria-hidden="true">↗</span></a>
        <a class="button secondary" href="#/map">看闖關地圖</a>
      </div>
      <ul class="hero-facts"><li>零資安背景</li><li>全程虛構案例</li><li>隨時暫停續玩</li></ul>
    </div>
    <div class="case-art" aria-hidden="true">
      <div class="art-top"><span>01 / CASE FILE</span><span class="art-signal">● 待接手</span></div>
      <div class="paper paper-under"></div>
      <div class="paper paper-main">
        <div class="paper-head"><span>案件編號 #01</span><span>內部演練</span></div>
        <strong>活動報名名冊</strong>
        <div class="paper-row"><i></i><span></span><span></span></div>
        <div class="paper-row"><i></i><span></span><span></span></div>
        <div class="paper-row"><i></i><span></span><span></span></div>
        <div class="paper-alert"><b>!</b> 分享權限待確認</div>
      </div>
      <div class="art-bottom"><span>TRAINING SIMULATION</span><span>資料存取 / ACCESS</span></div>
    </div>
  </section>
  <section class="route-preview">
    <div class="section-title"><div><p class="eyebrow">學習路線</p><h2>跟著條文，從發現問題走到交得出證據。</h2></div>
      <a class="text-link" href="#/map">查看全部 ${levels.length} 關 →</a>
    </div>
    <div class="preview-grid">
      <article><span class="mini-mark">01</span><h3>先看見問題</h3><p>切換身分，親手測試誰可以看名冊。</p></article>
      <article><span class="mini-mark">02</span><h3>逐條走過標準</h3><p>第 4 到 10 章的 25 條要求，一條一關，並附上白話說明。</p></article>
      <article><span class="mini-mark">03</span><h3>挑對控制措施</h3><p>附錄 A 四個主題，加上 93 項控制總表隨時查。</p></article>
    </div>
  </section>`;
}

function mapPage() {
  const next = nextLevel(progress);
  const done = levels.filter((level) => levelPassed(level, progress)).length;
  const covered = passedClauses(progress).length;
  return `${overview("LEARNING MAP / 學習路線", "闖關地圖", "跟著 ISO/IEC 27001:2022 的條文逐條闖關。章與章依序解鎖，同一章內可以自由選關，已完成的關卡可回頭複習。")}
  <section class="map-meter panel" aria-label="闖關進度">
    <strong>已完成 ${done} / ${levels.length} 關 · 條文 ${covered} / ${clauses.length}</strong>
    <progress value="${done}" max="${levels.length}" aria-label="已完成關卡"></progress>
  </section>
  ${chapters.map((chapter) => {
    const list = chapterLevels(chapter.id);
    if (!list.length) return "";
    const open = chapterOpen(chapter.id, progress);
    const finished = list.filter((level) => levelPassed(level, progress)).length;
    return `<section class="chapter" aria-labelledby="ch-${chapter.id}">
      <div class="chapter-head"><div><p class="eyebrow">${chapter.label}</p><h2 id="ch-${chapter.id}">${chapter.title}</h2><p class="chapter-blurb">${chapter.blurb}</p></div>
        <span class="status ${open && finished < list.length ? "active" : ""}">${open ? `${finished} / ${list.length}` : "待解鎖"}</span></div>
      <ol class="level-list">${list.map((level) => {
        const index = levels.indexOf(level);
        const passed = levelPassed(level, progress);
        const current = level === next;
        const status = passed ? (assisted(level) ? "已完成 · 建議複習" : "已完成") : !open ? "待解鎖" : progress[level.id]?.some(Boolean) ? "進行中" : "可開始";
        const tag = level.clauses?.length ? `條文 ${level.clauses.join("、")}` : level.controls?.length ? "附錄 A" : chapter.label;
        const detail = `<span class="level-index">${number(index)}</span><span class="level-info"><small>${tag}</small><strong>${level.title}</strong></span><span class="status ${current ? "active" : ""}">${status}</span>`;
        return `<li>${open
          ? `<a class="level-row" href="${levelPath(level)}" ${current ? 'aria-current="step"' : ""}>${detail}</a>`
          : `<div class="level-row locked">${detail}</div>`}</li>`;
      }).join("")}</ol>
    </section>`;
  }).join("")}`;
}

function coveragePage() {
  const passed = new Set(passedClauses(progress));
  const review = levels.filter((level) => levelPassed(level, progress) && assisted(level));
  return `${overview("COVERAGE / 條文覆蓋", "條文覆蓋總表", "ISO/IEC 27001:2022 第 4 到 10 章共 25 條要求，每一條都有對應的關卡。這裡只放白話說明，標準原文請見官方來源。")}
    <section class="map-meter panel">
      <strong>已通過 ${passed.size} / ${clauses.length} 條</strong>
      <progress value="${passed.size}" max="${clauses.length}" aria-label="已通過條文"></progress>
    </section>
    ${review.length ? `<p class="callout">建議複習：${review.map((level) => `<a class="text-link" href="${levelPath(level)}">${level.title}</a>`).join("、")}</p>` : ""}
    ${chapters.filter((chapter) => clauses.some((clause) => clause[1] === chapter.id)).map((chapter) => `
      <section class="panel clause-chapter"><h2>${chapter.label}｜${chapter.title}</h2>
      <table class="clause-table"><thead><tr><th scope="col">條文</th><th scope="col">白話說明</th><th scope="col">關卡</th></tr></thead><tbody>
      ${clauses.filter((clause) => clause[1] === chapter.id).map(([id, , title, plain, amd]) => {
        const found = levelsForClause(id);
        return `<tr><th scope="row">${id}${amd ? ' <span class="amd" title="Amd 1:2024 有異動">Amd 1</span>' : ""}</th>
          <td><strong>${title}</strong><br><span>${plain}</span></td>
          <td>${found.map((level) => levelOpen(level, progress)
            ? `<a class="text-link" href="${levelPath(level)}">${level.title}</a>` : level.title).join("、")}<br>
            <span class="status ${passed.has(id) ? "active" : ""}">${passed.has(id) ? "已通過" : "未通過"}</span></td></tr>`;
      }).join("")}
      </tbody></table></section>`).join("")}
    <p class="callout">標準第 1 到 3 章（範圍、引用標準、用語）不是要求事項，相關名詞放在 <a class="text-link" href="#/terms">名詞卡</a>。附錄 A 請見 <a class="text-link" href="#/annex">附錄 A 總表</a>。</p>`;
}

function annexPage() {
  return `${overview("ANNEX A / 控制措施", "附錄 A 控制總表", "附錄 A 共 93 項控制，分四個主題。每個主題有一關情境練習；標示「有關卡」的是情境中練到的控制，其餘供查閱。")}
    ${annexThemes.map((theme) => {
      const level = levels.find((item) => item.theme === theme.id);
      const open = level && levelOpen(level, progress);
      const done = level && levelPassed(level, progress);
      return `<section class="panel clause-chapter"><div class="record-title"><h2>${theme.title} · ${theme.range}（${theme.controls.length} 項）</h2>
        ${level ? (open ? `<a class="text-link" href="${levelPath(level)}">${done ? "複習" : "前往"}關卡</a>` : '<span class="status">待解鎖</span>') : ""}</div>
        <table class="clause-table"><thead><tr><th scope="col">編號</th><th scope="col">控制</th><th scope="col">練習</th></tr></thead><tbody>
        ${theme.controls.map(([id, name, plain]) => `<tr><th scope="row">${id}</th><td><strong>${name}</strong><br><span>${plain}</span></td>
          <td>${level?.controls.includes(id) ? `<span class="status ${done ? "active" : ""}">${done ? "已練習" : "有關卡"}</span>` : '<span class="muted">供查閱</span>'}</td></tr>`).join("")}
        </tbody></table></section>`;
    }).join("")}
    <p class="callout">說明為原創白話摘要，實作細節請參考 ISO/IEC 27002:2022。</p>`;
}

function filePage() {
  const entries = levels.map((level, index) => {
    const records = level.steps.flatMap((step, stepIndex) => {
      const entry = progress[level.id]?.[stepIndex];
      return isSolved(step, entry) ? [[step.record, recordValue(step, entry)]] : [];
    });
    if (!records.length) return "";
    const passed = levelPassed(level, progress);
    return `<article class="panel record">
      <div class="record-title"><span class="mini-mark">${number(index)}</span><h2>${level.title}</h2>
      <a class="text-link" href="${levelPath(level)}">${passed ? "複習" : "繼續"}</a></div>
      ${passed ? `<p class="badge"><span aria-hidden="true">✦</span> ${level.badge} · ${assisted(level) ? "練習後完成 · 建議複習" : "首次獨立完成"}</p>` : ""}
      <dl>${records.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
    </article>`;
  }).join("");
  const next = nextLevel(progress);
  const draft = next && progress[next.id]?.some(Boolean);
  return `${overview("CASE FILE / 你的紀錄", "我的案件檔案", "已完成的判斷、驗證和徽章會收在這裡。學習紀錄保存在目前的瀏覽器。")}
    ${draft ? `<p class="callout">有一份進行中的草稿 · <a class="text-link" href="${levelPath(next)}">${next.title}</a></p>` : ""}
    ${entries ? `<div class="actions file-actions"><button type="button" class="button primary" id="download">下載案件摘要 <span aria-hidden="true">↓</span></button></div>
      <div class="records">${entries}</div>`
      : `<div class="panel empty"><span class="mini-mark" aria-hidden="true">＋</span><h2>案件檔案等你補上第一筆紀錄。</h2><p>完成一次權限驗證後，結果就會出現在這裡。</p><a class="button primary" href="${levelPath(levels[0])}">前往第一關 →</a></div>`}`;
}

function termsPage() {
  return `${overview("GLOSSARY / 隨時查閱", "資安名詞卡", "遇到陌生的詞，可以從日常工作情境理解它。")}
    <div class="terms-grid">${terms.map(([term, explanation]) =>
      `<article class="panel term"><h2>${term}</h2><p>${explanation}</p></article>`,
    ).join("")}</div>
    <section class="panel sources">
      <h2>教材依據</h2><p>網站用原創情境解說標準概念。這份學習紀錄適用於課堂演練。</p>
      <ul>${standardSources.map(([label, url]) => `<li><a href="${url}">${label} ↗</a></li>`).join("")}</ul>
    </section>`;
}

function labControls(entry, solved) {
  const visible = permissions(entry.setting, entry.role);
  const tested = entry.tested[entry.role];
  return `<div class="simulator">
    <div class="sim-controls">
      <label for="access-setting">分享權限</label>
      <select id="access-setting" ${solved ? "disabled" : ""}>
        ${Object.entries(settings).map(([id, label]) => `<option value="${id}" ${entry.setting === id ? "selected" : ""}>${label}</option>`).join("")}
      </select>
      <fieldset><legend>目前用誰的身分看？</legend>
        <div class="role-list">${Object.entries(roles).map(([id, label]) =>
          `<button type="button" class="role-button" data-role="${id}" aria-pressed="${entry.role === id}">${label}</button>`,
        ).join("")}</div>
      </fieldset>
      <button class="button secondary" type="button" id="run-check" ${tested ? "disabled" : ""}>驗證目前身分</button>
      <ul class="check-list">${Object.entries(roles).map(([id, label]) => {
        const result = entry.tested[id] ? (permissions(entry.setting, id) ? "可查看" : "無法查看") : "待驗證";
        return `<li><span>${label}</span><strong>${result}</strong></li>`;
      }).join("")}</ul>
    </div>
    <div class="mock-screen">
      <p class="mock-bar"><span>•••</span> 模擬系統 / 報名名冊</p>
      <div class="mock-content">
        <span class="status">${roles[entry.role]}視角</span>
        ${visible ? `<h3>市民健康講座</h3><p>此區僅顯示虛構資料</p>
          <table><thead><tr><th scope="col">姓名</th><th scope="col">聯絡欄位</th></tr></thead>
          <tbody><tr><td>測試參加者 A</td><td>示例電話 A</td></tr><tr><td>測試參加者 B</td><td>示例電話 B</td></tr></tbody></table>
          <details class="hint"><summary>試著修改名冊</summary><p>這個身分只有查看權限。修改權限另外授予資料管理者，可降低誤改造成的完整性風險。</p></details>`
          : "<h3>你沒有存取權限</h3><p>請聯繫資料管理者確認是否需要授權。</p>"}
      </div>
    </div>
  </div>`;
}

function labFeedback(entry, solved) {
  if (solved) return ["ok", "兩種身分都驗證完成。訪客看不到資料，報到同仁仍可工作。"];
  if (!entry.tested[entry.role]) return null;
  if (entry.setting === "public") return ["retry", "外部訪客仍可查看。試著限制連結的分享對象。"];
  if (entry.setting === "closed") return ["retry", "全關也會擋住報到同仁。試著只開給需要名冊的人。"];
  return ["ok", "這個身分符合預期。請再驗證另一種身分。"];
}

function lessonPage(level) {
  const index = levels.indexOf(level);
  const step = level.steps[lessonStep];
  const entry = progress[level.id]?.[lessonStep] ?? newEntry(step);
  const solved = isSolved(step, entry);
  const isLab = step.type === "lab";
  const chosen = isLab ? null : step.options[entry.choice];
  const feedback = isLab ? labFeedback(entry, solved) : chosen && [solved ? "ok" : "retry", chosen[2]];
  const records = (level.needs ?? []).map(([id, stepIndex]) => priorRecord(id, stepIndex)).filter(Boolean);
  const chapter = chapterOf(level.chapter);
  const lastStep = lessonStep === level.steps.length - 1;
  const next = levels[index + 1];
  const optionList = isLab ? labControls(entry, solved) :
    `<div class="options" role="group" aria-label="處理方式">${step.options.map(([text], option) =>
      `<button class="option ${entry.choice === option ? (solved ? "correct" : "incorrect") : ""}" type="button" data-option="${option}" aria-pressed="${entry.choice === option}" ${solved ? "disabled" : ""}><span class="option-letter" aria-hidden="true">${String.fromCharCode(65 + option)}</span><span>${text}</span></button>`,
    ).join("")}</div>`;
  return `<div class="breadcrumbs"><a href="#/map">闖關地圖</a><span aria-hidden="true">/</span><span>第 ${index + 1} 關</span></div>
    ${overview(`${number(index)} / ${chapter.label} · ${chapter.title}`, level.title, level.intro)}
    <section class="lesson panel" aria-labelledby="step-title">
      <div class="lesson-meta"><span class="status">步驟 ${lessonStep + 1} / ${level.steps.length}</span><progress value="${lessonStep + (solved ? 1 : 0)}" max="${level.steps.length}" aria-label="本關步驟"></progress></div>
      <p class="clause-tags" aria-label="對應條文">${level.clauses?.length ? level.clauses.map((id) => `<span class="clause-chip">條文 ${id}</span>`).join("") : level.controls?.length ? level.controls.map((id) => `<span class="clause-chip">附錄 A ${id}</span>`).join("") : `<span class="clause-chip">${level.standard}</span>`}</p>
      <h2 id="step-title">${step.title}</h2>
      <p class="prompt">${step.prompt}</p>
      ${records.length ? `<aside class="callout" aria-label="你的前情紀錄">
        <strong>從你的案件檔案帶入</strong>
        <ul>${records.map(([label, value]) => `<li>${label}｜${value}</li>`).join("")}</ul>
        ${level.needsNote ? `<p>${level.needsNote}</p>` : ""}
      </aside>` : ""}
      ${step.context ? `<ol class="context-grid" aria-label="情境線索">${step.context.map(([label, description]) =>
        `<li><strong>${label}</strong><span>${description}</span></li>`,
      ).join("")}</ol>` : ""}
      ${optionList}
      <div id="feedback" class="feedback ${feedback ? feedback[0] : ""}" tabindex="-1">${feedback ? `<strong>${feedback[0] === "ok" ? "驗證結果" : "再試一次"}</strong><p>${feedback[1]}</p>` : ""}</div>
      ${step.hint && !solved ? `<details id="hint" class="hint" ${entry.hinted ? "open" : ""}><summary>需要一個提示</summary><p>${step.hint}</p></details>` : ""}
      ${solved && lastStep ? `<p class="badge"><span aria-hidden="true">✦</span> 本關完成 · ${level.badge}</p>` : ""}
      <div class="lesson-bottom actions">
        ${lessonStep > 0 ? '<button type="button" class="button secondary" id="previous-step">← 上一步</button>' : ""}
        ${solved ? (lastStep
          ? `<a class="button primary" href="${next ? levelPath(next) : "#/file"}">${next ? "進入下一關" : "查看案件摘要"} →</a>`
          : '<button type="button" class="button primary" id="next-step">繼續下一步 →</button>') : ""}
      </div>
    </section>
    ${comparePanel(level)}
    <details class="standard-note"><summary>這一關對應哪個要求？</summary>${standardNote(level)}<p><a href="#/coverage">條文覆蓋總表</a> · <a href="#/terms">名詞與教材來源</a></p></details>`;
}

function comparePanel(level) {
  const rows = comparisons[level.id];
  if (!rows) return "";
  const passed = levelPassed(level, progress);
  return `<section class="panel compare" aria-labelledby="compare-title">
    <h2 id="compare-title">條文對照</h2>
    <p class="compare-note">${passed ? "把這一關的做法，逐項對回條文的要求。" : "先看這一關要練的條文重點；完成後會顯示每一項在情境裡怎麼對應。"}</p>
    <div class="table-wrap"><table class="clause-table"><thead><tr><th scope="col">條文</th><th scope="col">要求重點</th><th scope="col">本關對應</th></tr></thead><tbody>
    ${rows.map(([ref, point, how]) => `<tr><th scope="row">${ref}</th><td>${point}</td><td>${passed ? how : '<span class="muted">完成本關後顯示</span>'}</td></tr>`).join("")}
    </tbody></table></div>
  </section>`;
}

function standardNote(level) {
  if (level.clauses?.length) {
    return `<ul>${levelClauses(level).map(([id, , title, plain]) => `<li><strong>${id} ${title}</strong>：${plain}</li>`).join("")}</ul>`;
  }
  if (level.controls?.length) {
    return `<ul>${level.controls.map((id) => {
      const [, name, plain] = controlMap.get(id).control;
      return `<li><strong>${id} ${name}</strong>：${plain}</li>`;
    }).join("")}</ul>`;
  }
  return `<p>${levelLabel(level)}</p>`;
}

function loadEntry(level) {
  progress[level.id] ??= [];
  progress[level.id][lessonStep] ??= newEntry(level.steps[lessonStep]);
  return progress[level.id][lessonStep];
}

function wireLesson(level) {
  const step = level.steps[lessonStep];
  const change = (modify, focus) => {
    refreshProgress();
    modify(loadEntry(level));
    save();
    renderLesson(level, focus);
  };

  main.querySelectorAll("[data-option]").forEach((button) => button.addEventListener("click", () => {
    const option = Number(button.dataset.option);
    const [, correct, explanation] = step.options[option];
    change((entry) => {
      if (isSolved(step, entry)) return;
      entry.choice = option;
      if (!correct) entry.incorrect = true;
    }, correct ? "#feedback" : `[data-option="${option}"]:not(:disabled)`);
    if (!correct) announcer.textContent = explanation;
  }));
  main.querySelectorAll("[data-role]").forEach((button) => button.addEventListener("click", () => {
    const role = button.dataset.role;
    change((entry) => { entry.role = role; }, `[data-role="${role}"]`);
    const entry = progress[level.id][lessonStep];
    announcer.textContent = `${roles[role]}${permissions(entry.setting, role) ? "可以查看" : "無法查看"}名冊。`;
  }));
  main.querySelector("#access-setting")?.addEventListener("change", (event) => {
    change((entry) => {
      if (!isSolved(step, entry)) setLabSetting(entry, event.target.value);
    }, "#access-setting");
    const entry = progress[level.id][lessonStep];
    announcer.textContent = `${roles[entry.role]}${permissions(entry.setting, entry.role) ? "可以查看" : "無法查看"}名冊。`;
  });
  main.querySelector("#run-check")?.addEventListener("click", () => {
    change((entry) => { entry.tested[entry.role] = true; }, "#feedback");
  });
  const hint = main.querySelector("#hint");
  hint?.addEventListener("toggle", () => {
    if (hint.isConnected && hint.open) {
      refreshProgress();
      const entry = loadEntry(level);
      if (!isSolved(step, entry)) entry.hinted = true;
      save();
      renderStorageNotice();
    }
  });
  main.querySelector("#previous-step")?.addEventListener("click", () => {
    lessonStep -= 1;
    renderLesson(level, "#step-title");
  });
  main.querySelector("#next-step")?.addEventListener("click", () => {
    lessonStep += 1;
    renderLesson(level, "#step-title");
  });
}

function renderStorageNotice() {
  main.querySelector("#storage-notice")?.remove();
  if (!canSave) main.insertAdjacentHTML("afterbegin", '<p id="storage-notice" class="callout" role="status">目前無法將進度存入瀏覽器。你可以繼續練習，離開前請下載案件摘要。</p>');
}

function renderLesson(level, focus) {
  main.innerHTML = lessonPage(level);
  renderStorageNotice();
  wireLesson(level);
  const target = focus && main.querySelector(focus);
  if (target) {
    if (focus === "#step-title") target.tabIndex = -1;
    target.focus();
  }
}

function downloadSummary() {
  if (!hasRecords()) return;
  const url = URL.createObjectURL(new Blob([buildSummary(progress)], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "iso27001-case-summary.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function route(focus) {
  const path = location.hash.slice(1) || "/";
  const section = path.startsWith("/level/") ? "/map" : path;
  for (const link of document.querySelectorAll("nav a")) {
    if (link.hash === `#${section}`) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  if (path.startsWith("/level/")) {
    const level = levels.find(({ id }) => path === `/level/${id}`);
    if (level && levelOpen(level, progress)) {
      const firstUnsolved = level.steps.findIndex((step, index) => !isSolved(step, progress[level.id]?.[index]));
      lessonStep = Math.max(0, firstUnsolved);
      renderLesson(level);
    } else {
      main.innerHTML = `${overview("LEARNING MAP / 學習路線", "先從目前關卡繼續", "這個關卡尚未開放，或連結已失效。完成目前關卡就能往前。")}<a class="button primary" href="#/map">回闖關地圖 →</a>`;
    }
  } else {
    const pages = { "/": home, "/map": mapPage, "/coverage": coveragePage, "/annex": annexPage, "/file": filePage, "/terms": termsPage };
    main.innerHTML = (Object.hasOwn(pages, path) ? pages[path] : home)();
    main.querySelector("#download")?.addEventListener("click", downloadSummary);
  }
  renderStorageNotice();
  if (focus) {
    main.focus();
    window.scrollTo(0, 0);
  }
}

document.querySelector(".skip").addEventListener("click", (event) => {
  event.preventDefault();
  main.focus();
});
window.addEventListener("hashchange", () => {
  announcer.textContent = "";
  route(true);
});
window.addEventListener("storage", (event) => {
  if (!canSave || event.storageArea !== localStorage || (event.key !== storageKey && event.key !== null)) return;
  refreshProgress();
  route(false);
});
route(false);
