(function () {
  const projects = window.PORTFOLIO_PROJECTS || [];
  const root = document.querySelector("[data-case-root]");
  const id = new URLSearchParams(window.location.search).get("id");
  const project = projects.find((item) => item.id === id);
  const escape = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const list = (items) => items.map((item) => `<li>${escape(item)}</li>`).join("");

  if (!project) {
    document.title = "사례를 찾을 수 없습니다 | Junsoo Work Index";
    root.innerHTML = `<section class="not-found"><p class="eyebrow">CASE NOT FOUND</p><h1>사례를 찾을 수 없습니다</h1><p>작업 목록에서 확인할 사례를 다시 선택해주세요.</p><a class="primary-button link-button" href="index.html#work">작업 목록</a></section>`;
    return;
  }

  if (project.id === "pf07" && project.refinement) {
    const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
    const language = requestedLanguage === "en" ? "en" : "ko";
    const copy = project.refinement.locales[language];
    const media = project.refinement.mediaBase;
    const publicMedia = "assets/media/pf07";
    const localized = (base) => `${media}/${base}_${language}.svg`;
    const capture = (base) => `${media}/own-ui-captures/during-implementation/${base}${language === "en" ? "_en" : ""}.png`;
    const setMeta = (selector, attribute, value) => {
      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement("meta");
        const match = selector.match(/meta\[(name|property)="([^"]+)"\]/);
        if (match) element.setAttribute(match[1], match[2]);
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };
    const cards = (items, className) => items.map((item, index) => `<article class="${className}"><span>${String(index + 1).padStart(2, "0")}</span><h3>${escape(item[0])}</h3><p>${escape(item[1])}</p>${item[2] ? `<small>${escape(item[2])}</small>` : ""}</article>`).join("");
    const figures = (items, className) => items.map(([source, caption]) => `<figure class="${className}"><img src="${escape(source)}" alt="${escape(caption)}" loading="eager"><figcaption>${escape(caption)}</figcaption></figure>`).join("");
    const linkedFigures = (items, className) => items.map(([source, caption]) => `<figure class="${className}"><a href="${escape(source)}" target="_blank" rel="noopener" aria-label="${escape(caption)}"><img src="${escape(source)}" alt="${escape(caption)}" loading="eager"></a><figcaption>${escape(caption)}</figcaption></figure>`).join("");

    document.documentElement.lang = copy.htmlLang;
    document.body.dataset.pf07Language = language;
    document.title = `${copy.pageTitle} | Junsoo Work Index`;
    document.querySelector('meta[name="description"]').setAttribute("content", copy.metaDescription);
    setMeta('meta[property="og:type"]', "content", "article");
    setMeta('meta[property="og:locale"]', "content", language === "en" ? "en_US" : "ko_KR");
    setMeta('meta[property="og:title"]', "content", copy.pageTitle);
    setMeta('meta[property="og:description"]', "content", copy.metaDescription);
    setMeta('meta[property="og:image"]', "content", `https://cetacean916.github.io/portfolio-showcase/${media}/brand/BRAND-00${language === "en" ? "8_og-en.png" : "7_og-ko.png"}`);
    const canonical = document.querySelector('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "canonical" }));
    canonical.href = `https://cetacean916.github.io/portfolio-showcase/case.html?id=pf07&lang=${language}`;
    document.querySelector('link[rel="icon"]').href = `${media}/brand/BRAND-003_favicon.svg`;

    const skip = document.querySelector(".skip-link");
    skip.textContent = copy.nav.skip;
    const brand = document.querySelector(".site-header .brand");
    brand.setAttribute("aria-label", copy.nav.home);
    const nav = document.querySelector(".site-header .main-nav");
    nav.setAttribute("aria-label", copy.nav.menu);
    const navLinks = nav.querySelectorAll("a");
    [copy.nav.work, copy.nav.service, copy.nav.standard].forEach((label, index) => { navLinks[index].textContent = label; });
    document.querySelector(".site-header .header-cta").textContent = copy.nav.back;
    const footer = document.querySelectorAll(".site-footer p");
    footer[0].textContent = copy.footer[0];
    footer[1].textContent = copy.footer[1];

    const heroImage = localized("case/CASE-001_case-hero");
    const recoveryFigures = [
      [capture("CASE-010_admin-normal"), copy.recoveryLabels[0]],
      [capture("CASE-011_admin-retry-wait"), copy.recoveryLabels[1]],
      [capture("CASE-012_admin-recovered"), copy.recoveryLabels[2]],
    ];
    const connectedFigures = [
      [`${media}/own-ui-captures/during-implementation/CASE-014_n8n-execution-evidence.svg`, copy.connectedLabels[0]],
      [`${media}/own-ui-captures/during-implementation/CASE-015_hubspot-deal-contact-evidence.svg`, copy.connectedLabels[1]],
      [`${media}/own-ui-captures/during-implementation/CASE-016_slack-delivery-evidence.svg`, copy.connectedLabels[2]],
    ];
    const finalFigures = project.refinement.postCandidateAssets.map((relativePath, index) => [`${media}/${relativePath}`, copy.finalProofLabels[index]]);
    const releaseDownloads = project.refinement.releaseAssets.map((asset, index) => `<a class="pf07-download" href="${escape(asset.url)}" target="_blank" rel="noopener" aria-label="${escape(copy.downloadLabels[index])}: ${escape(asset.filename)}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escape(copy.downloadLabels[index])}</strong><code>${escape(asset.filename)}</code><small>SHA-256 ${escape(asset.sha256.slice(0, 16))}…</small><b>${escape(copy.downloadAction)} ↗</b></a>`).join("");
    const scorecardRows = copy.scorecard.map(([label, value, gate]) => `<tr><th scope="row">${escape(label)}</th><td>${escape(value)}</td><td><code>${escape(gate)}</code></td></tr>`).join("");
    const evidenceLinks = project.refinement.evidenceUrls.map((url, index) => `<a href="${escape(url)}" target="_blank" rel="noopener"><span>${escape(copy.evidenceLabels[index])}</span><b>${escape(copy.evidenceAction)}</b></a>`).join("");
    const videoSections = `<section class="pf07-section case-video recovery-video" aria-labelledby="pf07-recovery-video-title"><div class="pf07-section-heading"><div><p class="eyebrow">FAILURE → RETRY → RECOVERY</p><h2 id="pf07-recovery-video-title">${escape(copy.recoveryVideoTitle)}</h2></div><p>${escape(copy.recoveryVideoSummary)}</p></div><video controls preload="metadata" poster="${publicMedia}/video-poster.png"><source src="${publicMedia}/recovery-clip.mp4" type="video/mp4">${escape(copy.videoFallback)}</video></section><section class="pf07-section case-video" aria-labelledby="pf07-normal-video-title"><div class="pf07-section-heading"><div><p class="eyebrow">CONTINUOUS EXECUTION</p><h2 id="pf07-normal-video-title">${escape(copy.normalVideoTitle)}</h2></div><p>${escape(copy.normalVideoSummary)}</p></div><video controls preload="metadata" poster="${publicMedia}/video-poster.png"><source src="${publicMedia}/demo-video.mp4" type="video/mp4">${escape(copy.videoFallback)}</video></section>`;
    const scorecardSection = `<section class="pf07-section case-scorecard" aria-labelledby="pf07-scorecard-title" data-proof-scorecard><div class="pf07-section-heading"><div><p class="eyebrow">OBSERVED SCORECARD</p><h2 id="pf07-scorecard-title">${escape(copy.scorecardTitle)}</h2></div><p>${escape(copy.scorecardIntro)}</p></div><div class="scorecard-wrap" tabindex="0" aria-labelledby="pf07-scorecard-title"><table><thead><tr>${copy.scorecardHeaders.map((heading) => `<th scope="col">${escape(heading)}</th>`).join("")}</tr></thead><tbody>${scorecardRows}</tbody></table></div></section>`;
    const evidenceSection = `<section class="pf07-section case-evidence-links" aria-labelledby="pf07-evidence-title" data-evidence-links><div class="pf07-section-heading"><div><p class="eyebrow">BUYER-VERIFIABLE LINKS</p><h2 id="pf07-evidence-title">${escape(copy.evidenceTitle)}</h2></div><p>${escape(copy.evidenceIntro)}</p></div><div class="evidence-link-grid">${evidenceLinks}</div></section>`;
    const claimsSection = `<section class="pf07-section case-claims" aria-labelledby="pf07-claims-title" data-claims-boundary><div class="pf07-section-heading"><div><p class="eyebrow">CLAIMS BOUNDARY</p><h2 id="pf07-claims-title">${escape(copy.claimsTitle)}</h2></div><p data-hosting-availability><b>Hosting:</b> ${escape(copy.hostingAvailability)}</p></div><p class="pf07-claims-intro">${escape(copy.claimsIntro)}</p><div class="claims-grid"><article><h3>${escape(copy.provesTitle)}</h3><ul>${list(copy.whatProves)}</ul></article><article><h3>${escape(copy.notProvesTitle)}</h3><ul>${list(copy.doesNotProve)}</ul></article></div></section>`;
    const releaseAction = project.refinement.releaseUrl
      ? `<a class="primary-button link-button" href="${escape(project.refinement.releaseUrl)}" target="_blank" rel="noopener">${escape(copy.releaseAction)}</a>`
      : "";

    root.innerHTML = `<article class="pf07-case case-page" data-pf07-case>
      <header class="pf07-hero">
        <div class="pf07-hero-copy"><a class="breadcrumb" href="index.html#work">${escape(copy.breadcrumb)}</a><p class="eyebrow">${escape(copy.eyebrow)}</p><h1><span class="pf07-product-name">OddRoom OrderOps</span>${escape(copy.title)}</h1><p class="pf07-lead">${escape(copy.lead)}</p><p class="pf07-summary">${escape(copy.summary)}</p><div class="pf07-actions"><a class="primary-button link-button" href="${escape(project.refinement.repositoryUrl)}" target="_blank" rel="noopener">${escape(copy.sourceAction)}</a>${releaseAction}<a class="text-link" href="#delivery-path">${escape(copy.pathTitle)}</a></div></div>
        <div class="pf07-hero-media"><nav class="pf07-language" aria-label="${escape(copy.languageLabel)}"><a href="case.html?id=pf07&lang=ko"${language === "ko" ? ' aria-current="page"' : ""}>KO</a><a href="case.html?id=pf07&lang=en"${language === "en" ? ' aria-current="page"' : ""}>EN</a></nav><figure><img src="${escape(heroImage)}" alt="${escape(copy.pageTitle)}"></figure></div>
      </header>
      <dl class="pf07-facts">${copy.facts.map(([value, label]) => `<div><dt>${escape(value)}</dt><dd>${escape(label)}</dd></div>`).join("")}</dl>
      <section class="pf07-problem-solution"><article><p class="eyebrow">PROBLEM</p><h2>${escape(copy.problemTitle)}</h2><p>${escape(copy.problem)}</p></article><article><p class="eyebrow">SOLUTION</p><h2>${escape(copy.solutionTitle)}</h2><p>${escape(copy.solution)}</p></article></section>
      <section class="pf07-section pf07-path" id="delivery-path"><div class="pf07-section-heading"><div><p class="eyebrow">DELIVERY PATH</p><h2>${escape(copy.pathTitle)}</h2></div><p>${escape(copy.pathIntro)}</p></div><figure class="pf07-wide-media"><img src="${escape(localized("case/CASE-002_system-boundary"))}" alt="${escape(copy.pathTitle)}"></figure><div class="pf07-path-steps">${cards(copy.pathSteps.map(([, title, text]) => [title, text]), "pf07-step")}</div></section>
      <section class="pf07-section"><div class="pf07-section-heading"><div><p class="eyebrow">BUYER + OPERATOR SURFACES</p><h2>${escape(copy.surfacesTitle)}</h2></div><p>${escape(copy.surfacesIntro)}</p></div><div class="pf07-surface-grid">${cards(copy.surfaces, "pf07-surface")}</div><div class="pf07-diagram-pair"><figure><img src="${escape(localized("case/CASE-003_event-state"))}" alt="${escape(copy.surfacesTitle)}"></figure><figure><img src="${escape(localized("case/CASE-004_recovery-paths"))}" alt="${escape(copy.recoveryTitle)}"></figure></div></section>
      <section class="pf07-section pf07-observation"><div class="pf07-section-heading"><div><p class="eyebrow">OBSERVED RECOVERY</p><h2>${escape(copy.recoveryTitle)}</h2></div><p>${escape(copy.recoveryIntro)}</p></div><div class="pf07-capture-grid">${figures(recoveryFigures, "pf07-capture")}</div></section>
      <section class="pf07-section pf07-connected"><div class="pf07-section-heading"><div><p class="eyebrow">CONNECTED_MODE</p><h2>${escape(copy.connectedTitle)}</h2></div><p>${escape(copy.connectedIntro)}</p></div><div class="pf07-evidence-grid">${figures(connectedFigures, "pf07-evidence")}</div></section>
      ${videoSections}
      <section class="pf07-section"><div class="pf07-section-heading"><div><p class="eyebrow">DELIVERY OPTIONS</p><h2>${escape(copy.packageTitle)}</h2></div><p>${escape(copy.packageIntro)}</p></div><div class="pf07-package-grid">${cards(copy.packages, "pf07-package")}</div><div class="pf07-download-grid" aria-label="${escape(copy.downloadAction)}">${releaseDownloads}</div></section>
      <section class="pf07-section pf07-final"><div class="pf07-section-heading"><div><p class="eyebrow">FINAL OBSERVED DELIVERY</p><h2>${escape(copy.finalProofTitle)}</h2></div><p>${escape(copy.finalProofIntro)}</p></div><div class="pf07-final-grid">${linkedFigures(finalFigures, "pf07-final-figure")}</div></section>
      ${scorecardSection}${evidenceSection}${claimsSection}
      <section class="pf07-section pf07-scope"><div class="pf07-section-heading"><div><p class="eyebrow">BUYER FIT</p><h2>${escape(copy.scopeTitle)}</h2></div></div><div class="pf07-scope-grid"><article><h3>${escape(copy.fitTitle)}</h3><ul>${list(copy.fit)}</ul></article><article><h3>${escape(copy.nonFitTitle)}</h3><ul>${list(copy.nonFit)}</ul></article></div></section>
      <aside class="pf07-boundary"><b>${escape(copy.boundaryTitle)}</b><p>${escape(copy.boundary)}</p></aside>
      <nav class="case-bottom-nav" aria-label="${escape(copy.nav.menu)}"><a class="primary-button link-button" href="index.html#work">${escape(copy.nav.work)}</a><a class="text-link" href="inquiry-automation.html">${escape(copy.nav.service)}</a></nav>
    </article>`;
    return;
  }

  document.title = `${project.title} | Junsoo Work Index`;
  document.querySelector('meta[name="description"]').setAttribute("content", project.summary);
  const facts = project.facts.map(([value, label]) => `<div><dt>${escape(value)}</dt><dd>${escape(label)}</dd></div>`).join("");
  const proof = project.proof.map((item, index) => `<article><span>0${index + 1}</span><p>${escape(item)}</p></article>`).join("");
  const gallery = project.gallery.map((image, index) => `<figure><img src="${escape(image)}" alt="${escape(project.title)} 상세 자료 ${index + 1}" width="1200" height="1350" loading="${index === 0 ? "eager" : "lazy"}"></figure>`).join("");
  const primaryAction = project.liveUrl
    ? `<a class="primary-button link-button" href="${escape(project.liveUrl)}" target="_blank" rel="noopener">라이브 사이트</a>`
    : project.sourceUrl
      ? `<a class="primary-button link-button" href="${escape(project.sourceUrl)}" target="_blank" rel="noopener">공개 소스</a>`
    : project.demo
      ? `<a class="primary-button link-button" href="${escape(project.demo.url)}" target="_blank" rel="noopener">체험 데모</a>`
      : project.video
        ? `<a class="primary-button link-button" href="#execution-video">실행 영상 보기</a>`
      : `<a class="primary-button link-button" href="#gallery-title">검증 화면 보기</a>`;
  const secondaryVideoAction = project.demo && project.video ? `<a class="text-link" href="#execution-video">실행 영상 보기</a>` : "";
  const demoSection = project.demo
    ? `<section class="case-demo" aria-labelledby="demo-title"><div class="section-heading compact"><div><p class="eyebrow">INTERACTIVE TRIAL</p><h2 id="demo-title">브라우저 체험판</h2></div><p>${escape(project.demo.summary)}</p></div><div class="demo-callout"><div><b>공개 샘플 범위</b><p>${escape(project.demo.boundary)}</p></div><a class="primary-button link-button" href="${escape(project.demo.url)}" target="_blank" rel="noopener">새 창에서 체험하기</a></div></section>`
    : "";
  const videoSection = project.video
    ? `<section class="case-video" id="execution-video" aria-labelledby="video-title"><div class="section-heading compact"><div><p class="eyebrow">RECORDED WALKTHROUGH</p><h2 id="video-title">실행 영상</h2></div><p>${escape(project.videoSummary)}</p></div><video controls preload="metadata" poster="${escape(project.videoPoster || project.image)}"><source src="${escape(project.video)}" type="video/mp4">브라우저가 영상을 지원하지 않습니다.</video></section>`
    : "";
  const recoveryVideoSection = project.recoveryVideo
    ? `<section class="case-video recovery-video" aria-labelledby="recovery-video-title"><div class="section-heading compact"><div><p class="eyebrow">FAILURE → RETRY → RECOVERY</p><h2 id="recovery-video-title">복구 짧은 클립</h2></div><p>${escape(project.recoveryVideoSummary)}</p></div><video controls preload="metadata" poster="${escape(project.gallery[1] || project.image)}"><source src="${escape(project.recoveryVideo)}" type="video/mp4">브라우저가 영상을 지원하지 않습니다.</video></section>`
    : "";
  const scorecardSection = project.proofScorecard
    ? `<section class="case-scorecard" aria-labelledby="scorecard-title" data-proof-scorecard><div class="section-heading compact"><div><p class="eyebrow">OBSERVED SCORECARD</p><h2 id="scorecard-title">Proof scorecard</h2></div><p>보호 raw observation에서 공개-safe 수치와 acceptance ID만 연결했습니다.</p></div><div class="scorecard-wrap" tabindex="0" aria-labelledby="scorecard-title"><table><thead><tr><th scope="col">관찰 항목</th><th scope="col">실제 수치</th><th scope="col">근거</th></tr></thead><tbody>${project.proofScorecard.map(([label, value, gate]) => `<tr><th scope="row">${escape(label)}</th><td>${escape(value)}</td><td><code>${escape(gate)}</code></td></tr>`).join("")}</tbody></table></div></section>`
    : "";
  const evidenceSection = project.evidenceLinks
    ? `<section class="case-evidence-links" aria-labelledby="evidence-links-title" data-evidence-links><div class="section-heading compact"><div><p class="eyebrow">BUYER-VERIFIABLE LINKS</p><h2 id="evidence-links-title">소스와 공개 근거</h2></div><p>raw evidence, credential, runtime, backup은 공개 저장소에 포함하지 않습니다.</p></div><div class="evidence-link-grid">${project.evidenceLinks.map(([label, url]) => `<a href="${escape(url)}" target="_blank" rel="noopener"><span>${escape(label)}</span><b>열기 ↗</b></a>`).join("")}</div></section>`
    : "";
  const claimsSection = project.whatProves && project.doesNotProve
    ? `<section class="case-claims" aria-labelledby="claims-title" data-claims-boundary><div class="section-heading compact"><div><p class="eyebrow">CLAIMS BOUNDARY</p><h2 id="claims-title">What this proves / does not prove</h2></div><p data-hosting-availability><b>Hosting:</b> ${escape(project.hostingAvailability)}</p></div><div class="claims-grid"><article><h3>What this proves</h3><ul>${list(project.whatProves)}</ul></article><article><h3>What this does not prove</h3><ul>${list(project.doesNotProve)}</ul></article></div><div class="buyer-fit-grid"><article><h3>Buyer fit</h3><p>${escape(project.buyerFit)}</p></article><article><h3>Buyer non-fit</h3><p>${escape(project.buyerNonFit)}</p></article></div></section>`
    : "";
  const liveSection = project.liveUrl
    ? `<section class="live-case"><div><p class="eyebrow">PUBLIC BUILD</p><h2>공개된 결과물</h2><p>14개 페이지와 동적 UI를 실제 배포 주소에서 확인할 수 있습니다.</p></div><a class="primary-button link-button" href="${escape(project.liveUrl)}" target="_blank" rel="noopener">OddRoom 열기</a></section>`
    : "";

  root.innerHTML = `<article class="case-page accent-${escape(project.accent)}">
    <header class="case-hero"><div class="case-hero-copy"><a class="breadcrumb" href="index.html#work">전체 작업 / ${escape(project.code)}</a><p class="eyebrow">VERIFIED SELF-INITIATED WORK</p><h1>${escape(project.title)}</h1><p class="case-lead">${escape(project.short)}</p><p>${escape(project.summary)}</p><div class="case-actions">${primaryAction}${secondaryVideoAction}<a class="text-link" href="#scope">제작 범위</a></div></div><figure class="case-cover"><img src="${escape(project.image)}" alt="${escape(project.title)} 대표 화면" width="1200" height="1200"></figure></header>
    <dl class="case-facts">${facts}</dl>
    <section class="case-narrative"><article><p class="eyebrow">PROBLEM</p><h2>문제</h2><p>${escape(project.problem)}</p></article><article><p class="eyebrow">SOLUTION</p><h2>해결</h2><p>${escape(project.solution)}</p></article></section>
    <section class="proof-section" aria-labelledby="proof-title"><div class="section-heading compact"><div><p class="eyebrow">EVIDENCE</p><h2 id="proof-title">검증 근거</h2></div><p>등록 문구와 화면 수치는 아래 근거에서 가져왔습니다.</p></div><div class="proof-grid">${proof}</div></section>
    <section class="case-gallery" aria-labelledby="gallery-title"><div class="section-heading compact"><div><p class="eyebrow">DELIVERED VIEW</p><h2 id="gallery-title">작업 화면</h2></div><p>화면, 사용 흐름, 결과와 경계를 분리해 정리했습니다.</p></div><div class="gallery-grid">${gallery}</div></section>
    ${demoSection}${recoveryVideoSection}${videoSection}${scorecardSection}${evidenceSection}${claimsSection}${liveSection}
    <section class="scope-section" id="scope" aria-labelledby="scope-title"><div class="section-heading compact"><div><p class="eyebrow">SERVICE BOUNDARY</p><h2 id="scope-title">포함·제외 범위</h2></div><p>실제 의뢰에서는 샘플과 성공 기준을 확인한 뒤 범위를 확정합니다.</p></div><div class="scope-grid"><article><h3>포함</h3><ul>${list(project.included)}</ul></article><article><h3>제외·별도 협의</h3><ul>${list(project.excluded)}</ul></article><article><h3>적용 기술</h3><div class="tech-list">${project.tech.map((item) => `<span>${escape(item)}</span>`).join("")}</div></article></div></section>
    <aside class="disclosure"><b>포트폴리오 고지</b><p>${escape(project.disclosure)}</p></aside>
    <nav class="case-bottom-nav" aria-label="사례 이동"><a class="primary-button link-button" href="index.html#work">전체 작업 보기</a><a class="text-link" href="index.html#capabilities">서비스 범위 보기</a></nav>
  </article>`;
})();
