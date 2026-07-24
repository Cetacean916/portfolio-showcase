(function () {
  const projects = window.PORTFOLIO_PROJECTS || [];
  const grid = document.querySelector("[data-project-grid]");
  const empty = document.querySelector("[data-empty-state]");
  const filters = [...document.querySelectorAll("[data-filter]")];

  const escape = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const orderedProjects = [...projects].sort((left, right) => {
    if (left.id === "pf07") return -1;
    if (right.id === "pf07") return 1;
    return 0;
  });
  const cards = orderedProjects.map((project, index) => {
    const facts = project.facts.map(([value, label]) => `<span><b>${escape(value)}</b>${escape(label)}</span>`).join("");
    const caseHref = project.caseUrl || `case.html?id=${encodeURIComponent(project.id)}`;
    const featured = project.id === "pf07";
    const secondaryAction = project.refinement?.releaseUrl
      ? `<a class="text-link" href="${escape(project.refinement.releaseUrl)}" target="_blank" rel="noopener">1.0.3 릴리즈</a>`
      : project.liveUrl
        ? `<a class="text-link" href="${escape(project.liveUrl)}" target="_blank" rel="noopener">라이브 사이트</a>`
        : project.demo
          ? `<a class="text-link" href="${escape(project.demo.url)}" target="_blank" rel="noopener">체험 데모</a>`
          : project.video
            ? `<a class="text-link" href="${escape(project.video)}">실행 영상</a>`
            : "";
    const releaseLabel = featured ? "LATEST · 1.0.3" : `INDEX · ${String(index + 1).padStart(2, "0")}`;
    return `<article class="project-card accent-${escape(project.accent)}${featured ? " project-card--featured" : ""}" data-project-card data-filters="${escape(project.filters.join(" "))}">
      <a class="project-image" href="${escape(caseHref)}" aria-label="${escape(project.title)} 상세 보기"><span class="project-image-label">${releaseLabel}</span><img src="${escape(project.image)}" alt="${escape(project.title)} 실제 화면" width="1200" height="1200" loading="${featured ? "eager" : "lazy"}"></a>
      <div class="project-body"><div class="project-meta"><span>${escape(project.code)}</span><span>${featured ? "PUBLIC RELEASE · VERIFIED" : "SELF-BUILT · VERIFIED"}</span></div><h3><a href="${escape(caseHref)}">${escape(project.title)}</a></h3><p class="project-short">${escape(project.short)}</p><p>${escape(project.summary)}</p><div class="fact-row">${facts}</div><div class="card-actions"><a class="primary-button link-button" href="${escape(caseHref)}">사례 보기 <span aria-hidden="true">↗</span></a>${secondaryAction}</div></div>
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
})();
