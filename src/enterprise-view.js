import { chapters, controls, requirements, sources, workedCase } from "./enterprise.js";

const items = new Map([...requirements, ...controls].map((item) => [item.id, item]));
const sourceLink = ([label, url], reference = "") =>
  `<a href="${url}">${label}${reference ? ` · ${reference}` : ""} ↗</a>`;

function itemCard(id) {
  const item = items.get(id);
  const control = id.startsWith("A.");
  const amendment = ["4.1", "4.2"].includes(id);
  const refs = control
    ? [sourceLink(sources.requirements, `附錄 A ${id}`), sourceLink(sources.guidance, `控制 ${id.slice(2)}`)]
    : [sourceLink(sources.requirements, `第 ${id} 條`)];
  if (amendment) refs.push(sourceLink(sources.amendment, `第 ${id} 條修正`));

  return `<details class="clause-item" data-case-item data-kind="${control ? "control" : "requirement"}">
    <summary>${id} ${item.title}</summary>
    <dl class="clause-fields">
      ${item.focus ? `<div><dt>要求重點</dt><dd>${item.focus}</dd></div>` : ""}
      <div><dt>稽核問題</dt><dd>${item.question}</dd></div>
      <div><dt>可抽查證據</dt><dd>${item.evidence}</dd></div>
      <div><dt>對應來源</dt><dd>${refs.join(" · ")}</dd></div>
    </dl>
  </details>`;
}

export function enterprisePage() {
  return `<header class="page-intro">
    <p class="eyebrow">ENTERPRISE AUDIT / 企業案例</p>
    <h1>雲診通的三天稽核</h1>
    <p>你是獨立於受稽流程的內部稽核員。從範圍、風險和帳號一路追到名冊事故與矯正複查，用同一家公司練習把要求、問題與證據連起來。</p>
    <p><a class="text-link" href="#/audit">← 回稽核備考</a></p>
  </header>
  <section class="panel audit-panel" aria-labelledby="case-guide-title">
    <h2 id="case-guide-title">案例怎麼用</h2>
    <p>可依故事順序走查，也可直接用條號定位。${requirements.length} 張條文卡涵蓋第 4–10 章及有獨立編號的子條款，另有附錄 A 全部 ${controls.length} 項控制。第 1–3 章供確認標準範圍、引用文件及用語。各條文字母分項的精確措辭請查正式版本。</p>
    <p class="callout"><strong>先釐清適用性</strong> · 這是教材的完整覆蓋。公司應依 6.1.3 決定必要控制，用附錄 A 比對有無遺漏，再在 SoA 記錄納入理由、實施狀態及排除附錄 A 控制的理由。證據欄是抽樣方向，不代表單靠一份文件就能判定符合。</p>
    <p>以下公司、人物及紀錄均為虛構。問題與證據例為原創，要求採繁中轉述。來源連結指向 ISO 官方標準頁，請依卡片標示的條號在正式版本中查閱。</p>
  </section>
  <section class="panel audit-panel" aria-labelledby="case-filter-title">
    <h2 id="case-filter-title">依故事或條號查找</h2>
    <div class="case-filters">
      <label>故事章節<select id="case-chapter"><option value="">全部章節</option>${chapters.map(({ id, title }) => `<option value="${id}">${title}</option>`).join("")}</select></label>
      <label>項目類型<select id="case-kind"><option value="">條文與控制</option><option value="requirement">管理系統條文</option><option value="control">附錄 A 控制</option></select></label>
      <label>條號或關鍵字<input id="case-query" type="search" placeholder="例如 A.5.18、9.3.2、撤權"></label>
    </div>
    <p id="case-results" role="status"></p>
  </section>
  ${chapters.map((chapter, index) => `<section class="panel audit-panel" data-case-chapter="${chapter.id}" aria-labelledby="case-${chapter.id}">
    <p class="eyebrow">0${index + 1} / ${chapter.day}</p>
    <h2 id="case-${chapter.id}">${chapter.title}</h2>
    <p>${chapter.story}</p>
    <p class="case-interview"><strong>先訪談誰</strong> · ${chapter.interview}</p>
    ${[...chapter.requirements, ...chapter.controls].map(itemCard).join("")}
  </section>`).join("")}
  <section class="panel audit-panel" aria-labelledby="case-finding-title">
    <h2 id="case-finding-title">結案練習｜把資料寫成稽核發現</h2>
    <p>用下列資料先寫一段「準則 → 客觀證據 → 落差」。再分開寫當下修正與後續矯正措施的查證方向。</p>
    <dl class="clause-fields">
      <div><dt>已知準則</dt><dd>${workedCase.criteria}</dd></div>
      <div><dt>案例證據包</dt><dd>${workedCase.evidence}</dd></div>
    </dl>
    <details class="clause-item"><summary>看參考寫法與複查方向</summary>
      <dl class="clause-fields">
        <div><dt>稽核發現</dt><dd>${workedCase.finding}</dd></div>
        <div><dt>複查方向</dt><dd>${workedCase.followUp}</dd></div>
      </dl>
    </details>
  </section>`;
}

export function wireEnterprisePage(root) {
  const chapterSelect = root.querySelector("#case-chapter");
  const kind = root.querySelector("#case-kind");
  const search = root.querySelector("#case-query");
  const results = root.querySelector("#case-results");
  const sections = [...root.querySelectorAll("[data-case-chapter]")];
  const update = () => {
    const query = search.value.normalize("NFKC").trim().toLowerCase();
    let count = 0;
    for (const section of sections) {
      let visible = 0;
      for (const card of section.querySelectorAll("[data-case-item]")) {
        card.hidden = Boolean(
          (kind.value && card.dataset.kind !== kind.value)
          || (query && !card.textContent.toLowerCase().includes(query)),
        );
        if (!card.hidden) visible += 1;
      }
      section.hidden = !visible || Boolean(chapterSelect.value && section.dataset.caseChapter !== chapterSelect.value);
      if (!section.hidden) count += visible;
    }
    results.textContent = count ? `顯示 ${count} 個條文與控制項目` : "查無項目，請調整章節、類型或關鍵字。";
  };
  chapterSelect.addEventListener("change", update);
  kind.addEventListener("change", update);
  search.addEventListener("input", update);
  update();
}
