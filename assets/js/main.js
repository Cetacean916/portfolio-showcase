(function () {
  const projects = window.PORTFOLIO_PROJECTS || [];
  const grid = document.querySelector("[data-project-grid]");
  const empty = document.querySelector("[data-empty-state]");
  const filters = [...document.querySelectorAll("[data-filter]")];
  const brief = "안녕하세요. 포트폴리오를 보고 문의드립니다.\n1. 필요한 서비스:\n2. 현재 문제 또는 반복 업무:\n3. 샘플 자료 제공 가능 여부:\n4. 원하는 결과물:\n5. 희망 일정:\n6. 반드시 포함하거나 제외할 범위:";

  const escape = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const cards = projects.map((project) => {
    const facts = project.facts.map(([value, label]) => `<span><b>${escape(value)}</b>${escape(label)}</span>`).join("");
    return `<article class="project-card accent-${escape(project.accent)}" data-project-card data-filters="${escape(project.filters.join(" "))}">
      <a class="project-image" href="case.html?id=${encodeURIComponent(project.id)}" aria-label="${escape(project.title)} 상세 보기"><img src="${escape(project.image)}" alt="${escape(project.title)} 실제 화면" width="1200" height="1200" loading="lazy"></a>
      <div class="project-body"><div class="project-meta"><span>${escape(project.code)}</span><span>자체 제작 · 검증 완료</span></div><h3><a href="case.html?id=${encodeURIComponent(project.id)}">${escape(project.title)}</a></h3><p class="project-short">${escape(project.short)}</p><p>${escape(project.summary)}</p><div class="fact-row">${facts}</div><div class="card-actions"><a class="primary-button link-button" href="case.html?id=${encodeURIComponent(project.id)}">사례 보기</a>${project.liveUrl ? `<a class="text-link" href="${escape(project.liveUrl)}" target="_blank" rel="noopener">라이브 사이트</a>` : project.video ? `<a class="text-link" href="${escape(project.video)}">실행 영상</a>` : ""}</div></div>
    </article>`;
  }).join("");
  if (grid) grid.innerHTML = cards;

  function applyFilter(filter) {
    let visible = 0;
    document.querySelectorAll("[data-project-card]").forEach((card) => {
      const show = filter === "all" || card.dataset.filters.split(" ").includes(filter);
      card.hidden = !show;
      if (show) visible += 1;
    });
    filters.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.filter === filter)));
    if (empty) empty.hidden = visible !== 0;
  }
  filters.forEach((button) => button.addEventListener("click", () => applyFilter(button.dataset.filter)));

  document.querySelectorAll("[data-copy-brief]").forEach((button) => button.addEventListener("click", async () => {
    const statuses = document.querySelectorAll("[data-copy-status]");
    try {
      await navigator.clipboard.writeText(brief);
      statuses.forEach((node) => { node.textContent = "상담 문구를 복사했습니다."; });
      button.textContent = "복사 완료";
      window.setTimeout(() => { button.textContent = button.classList.contains("header-cta") ? "상담 문구 복사" : "상담 시작 문구 복사"; }, 1800);
    } catch {
      statuses.forEach((node) => { node.textContent = "브라우저에서 복사 권한을 허용한 뒤 다시 시도해주세요."; });
    }
  }));
})();
