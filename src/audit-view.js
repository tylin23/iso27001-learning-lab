import { clauseById, clauses, drills, lessonClauses } from "./audit.js";
import { standardSources } from "./lessons.js";

function clauseText({ focus, evidence }) {
  return `<dl class="clause-fields">
    <div><dt>要求重點</dt><dd>${focus}</dd></div>
    <div><dt>可查證的證據例</dt><dd>${evidence}</dd></div>
  </dl>`;
}

export function lessonClausePanel(level, stepIndex) {
  const ids = lessonClauses[level.id][stepIndex];
  return `<details class="standard-note clause-note">
    <summary>比對條文與證據 · ${ids.join("、")}</summary>
    <p>${level.standard}</p>
    ${ids.map((id) => {
      const item = clauseById[id];
      return `<div class="clause-item"><strong>${id} ${item.title}</strong>${clauseText(item)}</div>`;
    }).join("")}
    <a class="text-link" href="#/audit">開啟稽核備考與條文索引 →</a>
  </details>`;
}

export function auditPage() {
  return `<header class="page-intro">
    <p class="eyebrow">AUDIT PRACTICE / 條文與證據</p>
    <h1>稽核員備考</h1>
    <p>先從情境找準則，再挑客觀證據，最後寫出可查證的發現。可先用原版標準查找，再回來對照解析。</p>
    <p class="audit-home"><a class="button primary" href="#/enterprise">開始企業案例 · 雲診通 →</a></p>
  </header>
  <section class="panel audit-panel" aria-labelledby="audit-method-title">
    <h2 id="audit-method-title">稽核判斷的三個步驟</h2>
    <ol class="context-grid">
      <li><strong>01 找稽核準則</strong><span>定位適用的標準條文、組織規範或其他要求。</span></li>
      <li><strong>02 取客觀證據</strong><span>用文件、紀錄、訪談或抽樣測試交叉查證，記下日期、樣本與來源。</span></li>
      <li><strong>03 比對並寫發現</strong><span>說明查到的事實與要求之間的落差。證據未齊時先列待查。</span></li>
    </ol>
    <p class="callout"><strong>常考區分</strong> · 第 4–10 章是 ISMS 要求。附錄 A 是參考控制集合，透過 6.1.3 比對是否漏掉必要控制。ISO/IEC 27002 提供控制實作指引。</p>
  </section>
  <section class="panel audit-panel" aria-labelledby="drills-title">
    <h2 id="drills-title">情境選題</h2>
    <p>先選最貼近題意的條文，再看查證方向。練習時可用「準則／證據／落差」寫一段自己的答案。</p>
    ${drills.map((drill, index) => `<details class="clause-item">
      <summary>${index + 1}. ${drill.title}</summary>
      <form class="audit-drill" data-drill="${index}">
        <fieldset>
          <legend>${drill.scenario}</legend>
          ${drill.options.map((id) => `<label><input type="radio" name="clause" value="${id}" required> ${id} ${clauseById[id].title}</label>`).join("")}
        </fieldset>
        <button class="button secondary" type="submit">核對條文</button>
        <p class="feedback" role="status"></p>
      </form>
    </details>`).join("")}
  </section>
  <section class="panel audit-panel" aria-labelledby="clause-index-title">
    <h2 id="clause-index-title">ISO/IEC 27001:2022 條文索引</h2>
    <p>依第 4–10 章的主要條文整理。要求重點採繁中轉述，證據欄是查證示例。精確措辭與各子條款請查閱正式版本。</p>
    <label class="audit-search" for="clause-search">查條號或關鍵字</label>
    <input type="search" id="clause-search" placeholder="例如 6.1.3、風險、稽核">
    <p id="clause-count" role="status"></p>
    ${clauses.map((item) => `<details class="clause-item" data-clause-card>
      <summary>${item.id} ${item.title}</summary>
      ${clauseText(item)}
    </details>`).join("")}
  </section>
  <section class="panel audit-panel" aria-labelledby="audit-sources-title">
    <h2 id="audit-sources-title">正式版本與來源</h2>
    <p>備考基準為 ISO/IEC 27001:2022 與 Amd 1:2024。題型、允許攜帶的文件及其他指定教材以報考單位公告為準。</p>
    <ul>${standardSources.map(([label, url]) => `<li><a href="${url}">${label} ↗</a></li>`).join("")}</ul>
  </section>`;
}

export function wireAuditPage(root) {
  const cards = [...root.querySelectorAll("[data-clause-card]")];
  root.querySelector("#clause-search").addEventListener("input", (event) => {
    const query = event.target.value.normalize("NFKC").trim().toLowerCase();
    for (const card of cards) {
      card.hidden = !card.textContent.toLowerCase().includes(query);
    }
    root.querySelector("#clause-count").textContent = query
      ? `符合條件的條文：${cards.filter((card) => !card.hidden).length}`
      : "";
  });
  for (const form of root.querySelectorAll("[data-drill]")) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const drill = drills[Number(form.dataset.drill)];
      const correct = new FormData(form).get("clause") === drill.answer;
      const feedback = form.querySelector("[role='status']");
      feedback.className = `feedback ${correct ? "ok" : "retry"}`;
      feedback.textContent = correct
        ? `條文選對了。 ${drill.model}`
        : "再核對題目要查的是規劃、實際執行，還是後續改善，再試一次。";
    });
  }
}
