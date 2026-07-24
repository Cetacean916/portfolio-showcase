(function () {
  const projects = window.PORTFOLIO_PROJECTS || [];
  const root = document.querySelector("[data-case-root]");
  const id = window.PF07_STATIC_CASE_ID || new URLSearchParams(window.location.search).get("id");
  const project = projects.find((item) => item.id === id);
  const escape = (value) => String(value).replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
  const list = (items) => items.map((item) => `<li>${escape(item)}</li>`).join("");

  if (!project) {
    document.title = "사례를 찾을 수 없습니다 | Junsoo Work Index";
    root.innerHTML = `<section class="not-found"><p class="eyebrow">CASE NOT FOUND</p><h1>사례를 찾을 수 없습니다</h1><p>작업 목록에서 확인할 사례를 다시 선택해주세요.</p><a class="primary-button link-button" href="index.html#work">작업 목록</a></section>`;
    return;
  }

  if (project.id === "pf07" && project.refinement) {
    const requestedLanguage = window.PF07_STATIC_LANGUAGE || new URLSearchParams(window.location.search).get("lang");
    const language = requestedLanguage === "en" ? "en" : "ko";
    const copy = project.refinement.locales[language];
    const publicMedia = "assets/media/pf07";
    const currentUi = `${publicMedia}/current-ui/${language}`;
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
    const mediaCard = (item, featured = false) => {
      const videoId = `pf07-video-${language}-${item.id}`;
      const chapterLabel = language === "en" ? `${item.title} chapters` : `${item.title} 구간`;
      const captionsLabel = language === "en" ? "English captions" : "한국어 자막";
      return `<article class="pf07-media-card${featured ? " is-featured" : ""}">
        <header><div><p class="eyebrow">${escape(item.label)}</p><h3>${escape(item.title)}</h3></div><span>${escape(item.duration)}</span></header>
        <p>${escape(item.summary)}</p>
        <video id="${escape(videoId)}" controls playsinline preload="metadata" poster="${escape(item.poster)}">
          <source src="${escape(item.src)}" type="video/mp4">
          <track kind="captions" srclang="${escape(language)}" label="${escape(captionsLabel)}" src="${escape(item.captions)}" default>
          ${escape(copy.videoFallback)}
        </video>
        <div class="pf07-chapters" aria-label="${escape(chapterLabel)}">${item.chapters.map(([time, label]) => `<button type="button" data-video-target="${escape(videoId)}" data-video-start="${escape(time)}"><span>${escape(time)}</span>${escape(label)}</button>`).join("")}</div>
      </article>`;
    };

    document.documentElement.lang = copy.htmlLang;
    document.body.dataset.pf07Language = language;
    document.title = `${copy.pageTitle} | Junsoo Work Index`;
    document.querySelector('meta[name="description"]').setAttribute("content", copy.metaDescription);
    setMeta('meta[property="og:type"]', "content", "article");
    setMeta('meta[property="og:locale"]', "content", language === "en" ? "en_US" : "ko_KR");
    setMeta('meta[property="og:title"]', "content", copy.pageTitle);
    setMeta('meta[property="og:description"]', "content", copy.metaDescription);
    setMeta('meta[property="og:image"]', "content", `https://cetacean916.github.io/portfolio-showcase/assets/media/pf07/refinement/brand/${language === "en" ? "BRAND-008_og-en.png" : "BRAND-007_og-ko.png"}`);
    setMeta('meta[property="og:url"]', "content", `https://cetacean916.github.io/portfolio-showcase/case-pf07-${language}.html`);
    const canonical = document.querySelector('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "canonical" }));
    canonical.href = `https://cetacean916.github.io/portfolio-showcase/case-pf07-${language}.html`;

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

    const heroImage = `${currentUi}/storefront-home-desktop.png`;
    const heroMobileImage = `${currentUi}/storefront-home-mobile.png`;
    const laneLabels = language === "en"
      ? ["Storefront and catalog", "Product selection", "Completed order", "Received-order review", "Waiting to retry", "Recovered order"]
      : ["상점과 상품 탐색", "상품 선택", "주문 완료", "접수된 주문 확인", "재시도 대기", "복구된 주문"];
    const shopperFigures = [
      [`${currentUi}/storefront-shop-desktop.png`, laneLabels[0]],
      [`${currentUi}/product-detail-desktop.png`, laneLabels[1]],
      [`${currentUi}/order-complete-desktop.png`, laneLabels[2]],
    ];
    const operatorFigures = [
      [`${currentUi}/operator-console-desktop.png`, laneLabels[3]],
      [`${currentUi}/operator-retrying-desktop.png`, laneLabels[4]],
      [`${currentUi}/operator-recovered-desktop.png`, laneLabels[5]],
    ];
    const connectedFigures = project.refinement.connectedAssets.map((relative, index) => [
      `${project.refinement.mediaBase}/${relative}`,
      copy.connectedLabels[index],
    ]);
    const recoveryStateDetails = language === "en"
      ? ["The first delivery completes and its effect is checkpointed.", "HTTP 503 stays attached to the same durable event and enters bounded wait.", "Attempt two returns HTTP 200 without replaying completed effects."]
      : ["첫 전달이 완료되고 외부 효과가 checkpoint로 남습니다.", "HTTP 503이 같은 내구 이벤트에 결속된 채 제한 재시도 대기로 들어갑니다.", "완료 효과를 중복하지 않고 2회차 HTTP 200으로 수렴합니다."];
    const connectedStateDetails = language === "en"
      ? ["Signed workflow execution", "Masked Contact and Deal checkpoints", "One PAYMENT_CONFIRMED message effect"]
      : ["서명된 workflow 실행", "마스킹된 Contact·Deal checkpoint", "PAYMENT_CONFIRMED 메시지 효과 1회"];
    const finalStateDetails = language === "en"
      ? ["The exact public Linux package passed clean start and recovery.", "Five buyer packages cover the bounded delivery environments.", "Every public asset matched its reviewed size and SHA-256.", "The public tag resolves to the reviewed source and build."]
      : ["공개된 정확한 Linux 패키지로 clean start와 복구를 확인했습니다.", "사용 환경별 배포 파일 5종과 실행 경계를 함께 제공합니다.", "공개 자산 모두가 검토된 크기와 SHA-256에 일치했습니다.", "공개 태그가 검토된 소스와 빌드를 정확히 가리킵니다."];
    const finalProofCards = copy.finalProofLabels.map((label, index) => `<article class="pf07-proof"><span>${String(index + 1).padStart(2, "0")}</span><h3>${escape(label)}</h3><p>${escape(finalStateDetails[index])}</p></article>`).join("");
    const finalFigures = project.refinement.postCandidateAssets.map((relative, index) => {
      const source = `${project.refinement.mediaBase}/${relative}`;
      return `<figure class="pf07-final-figure"><a href="${escape(source)}" target="_blank" rel="noopener" data-release-evidence><img src="${escape(source)}" alt="${escape(copy.finalProofLabels[index])}" loading="lazy"></a><figcaption>${escape(copy.finalProofLabels[index])}</figcaption></figure>`;
    }).join("");
    const releaseDownloads = project.refinement.releaseAssets.map((asset, index) => `<a class="pf07-download" href="${escape(asset.url)}" target="_blank" rel="noopener" aria-label="${escape(copy.downloadLabels[index])}: ${escape(asset.filename)}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${escape(copy.downloadLabels[index])}</strong><code>${escape(asset.filename)}</code><small>SHA-256 ${escape(asset.sha256.slice(0, 16))}…</small><b>${escape(copy.downloadAction)} ↗</b></a>`).join("");
    const scorecardRows = copy.scorecard.map(([label, value, gate]) => `<tr><th scope="row">${escape(label)}</th><td>${escape(value)}</td><td><code>${escape(gate)}</code></td></tr>`).join("");
    const evidenceLinks = project.refinement.evidenceUrls.map((url, index) => `<a href="${escape(url)}" target="_blank" rel="noopener"><span>${escape(copy.evidenceLabels[index])}</span><b>${escape(copy.evidenceAction)}</b></a>`).join("");
    const guidedMedia = mediaCard(copy.media.items[0], true);
    const detailedMedia = copy.media.items.slice(1).map((item) => mediaCard(item)).join("");
    const scorecardSection = `<section class="pf07-section case-scorecard" aria-labelledby="pf07-scorecard-title" data-proof-scorecard><div class="pf07-section-heading"><div><p class="eyebrow">OBSERVED SCORECARD</p><h2 id="pf07-scorecard-title">${escape(copy.scorecardTitle)}</h2></div><p>${escape(copy.scorecardIntro)}</p></div><div class="scorecard-wrap" tabindex="0" aria-labelledby="pf07-scorecard-title"><table><thead><tr>${copy.scorecardHeaders.map((heading) => `<th scope="col">${escape(heading)}</th>`).join("")}</tr></thead><tbody>${scorecardRows}</tbody></table></div></section>`;
    const evidenceSection = `<section class="pf07-section case-evidence-links" aria-labelledby="pf07-evidence-title" data-evidence-links><div class="pf07-section-heading"><div><p class="eyebrow">BUYER-VERIFIABLE LINKS</p><h2 id="pf07-evidence-title">${escape(copy.evidenceTitle)}</h2></div><p>${escape(copy.evidenceIntro)}</p></div><div class="evidence-link-grid">${evidenceLinks}</div></section>`;
    const claimsSection = `<section class="pf07-section case-claims" aria-labelledby="pf07-claims-title" data-claims-boundary><div class="pf07-section-heading"><div><p class="eyebrow">CLAIMS BOUNDARY</p><h2 id="pf07-claims-title">${escape(copy.claimsTitle)}</h2></div><p data-hosting-availability><b>Hosting:</b> ${escape(copy.hostingAvailability)}</p></div><p class="pf07-claims-intro">${escape(copy.claimsIntro)}</p><div class="claims-grid"><article><h3>${escape(copy.provesTitle)}</h3><ul>${list(copy.whatProves)}</ul></article><article><h3>${escape(copy.notProvesTitle)}</h3><ul>${list(copy.doesNotProve)}</ul></article></div></section>`;
    const releaseAction = project.refinement.releaseUrl
      ? `<a class="text-link" href="${escape(project.refinement.releaseUrl)}" target="_blank" rel="noopener">${escape(copy.releaseAction)} ↗</a>`
      : "";
    const implementationTitle = language === "en" ? "What keeps each order moving behind the service" : "서비스 뒤에서 주문을 끝까지 이어가는 방식";
    const implementationIntro = language === "en"
      ? "The technical path begins only after the customer journey is complete. From there, the service records progress, prevents duplicate effects, and makes recovery visible to the operator."
      : "기술 처리는 고객의 구매가 끝난 뒤에 시작됩니다. 이후 주문의 진행 상태를 남기고, 완료된 처리를 중복하지 않으며, 필요한 복구를 운영자가 확인할 수 있게 합니다.";
    const releaseIdentityLabel = language === "en" ? "CURRENT PUBLIC RELEASE" : "현재 공개 배포판";
    const laneStep = (items) => `<ol class="pf07-lane-steps">${items.map(([title, text], index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><h4>${escape(title)}</h4><p>${escape(text)}</p></div></li>`).join("")}</ol>`;

    root.innerHTML = `<article class="pf07-case case-page" data-pf07-case>
      <header class="pf07-hero">
        <div class="pf07-hero-copy"><a class="breadcrumb" href="index.html#work">${escape(copy.breadcrumb)}</a><p class="eyebrow">${escape(copy.eyebrow)}</p><h1><span class="pf07-product-name">OFFSET / COMMERCE + OPERATIONS</span>${escape(copy.title)}</h1><p class="pf07-lead">${escape(copy.lead)}</p><p class="pf07-summary">${escape(copy.summary)}</p><div class="pf07-actions"><a class="primary-button link-button" href="#service-overview">${escape(copy.overviewAction)}</a>${releaseAction}<a class="text-link" href="${escape(project.refinement.repositoryUrl)}" target="_blank" rel="noopener">${escape(copy.sourceAction)} ↗</a></div></div>
        <div class="pf07-hero-media"><nav class="pf07-language" aria-label="${escape(copy.languageLabel)}"><a href="case-pf07-ko.html"${language === "ko" ? ' aria-current="page"' : ""}>KO</a><a href="case-pf07-en.html"${language === "en" ? ' aria-current="page"' : ""}>EN</a></nav><figure><picture><source media="(max-width: 760px)" srcset="${escape(heroMobileImage)}"><img src="${escape(heroImage)}" alt="${escape(copy.pageTitle)}"></picture></figure></div>
      </header>
      <section class="pf07-orientation" aria-labelledby="pf07-orientation-title"><div><p class="eyebrow">${escape(copy.orientation.eyebrow)}</p><h2 id="pf07-orientation-title">${escape(copy.orientation.title)}</h2></div><p>${escape(copy.orientation.body)}</p><dl class="pf07-facts">${copy.facts.map(([value, label]) => `<div><dt>${escape(value)}</dt><dd>${escape(label)}</dd></div>`).join("")}</dl></section>
      <section class="pf07-section pf07-service-overview" id="service-overview" aria-labelledby="pf07-overview-title"><div class="pf07-section-heading"><div><p class="eyebrow">${escape(copy.overview.eyebrow)}</p><h2 id="pf07-overview-title">${escape(copy.overview.title)}</h2></div><p>${escape(copy.overview.description)}</p></div><div class="pf07-service-lanes"><article class="pf07-role-lane is-shopper"><header><p class="eyebrow">SHOPPER</p><h3>${escape(copy.overview.shopperTitle)}</h3><p>${escape(copy.overview.shopperIntro)}</p></header><div class="pf07-lane-visuals">${figures(shopperFigures, "pf07-lane-figure")}</div>${laneStep(copy.overview.shopperSteps)}</article><div class="pf07-role-handoff"><span>ORDER COMPLETE</span><p>${escape(copy.overview.handoff)}</p></div><article class="pf07-role-lane is-operator"><header><p class="eyebrow">OPERATOR</p><h3>${escape(copy.overview.operatorTitle)}</h3><p>${escape(copy.overview.operatorIntro)}</p></header><div class="pf07-lane-visuals">${figures(operatorFigures, "pf07-lane-figure")}</div>${laneStep(copy.overview.operatorSteps)}</article></div></section>
      <section class="pf07-section pf07-guided-media" id="pf07-execution-media" aria-labelledby="pf07-guided-title"><div class="pf07-section-heading"><div><p class="eyebrow">${escape(copy.media.guidedEyebrow)}</p><h2 id="pf07-guided-title">${escape(copy.media.guidedTitle)}</h2></div><p>${escape(copy.media.guidedSummary)}</p></div>${guidedMedia}</section>
      <section class="pf07-section pf07-detailed-media" aria-labelledby="pf07-detail-title"><div class="pf07-section-heading"><div><p class="eyebrow">${escape(copy.media.detailEyebrow)}</p><h2 id="pf07-detail-title">${escape(copy.media.detailTitle)}</h2></div><p>${escape(copy.media.detailSummary)}</p></div><div class="pf07-media-grid">${detailedMedia}</div></section>
      <section class="pf07-section pf07-implementation" aria-labelledby="pf07-implementation-title"><div class="pf07-section-heading"><div><p class="eyebrow">IMPLEMENTATION + PROOF</p><h2 id="pf07-implementation-title">${escape(implementationTitle)}</h2></div><p>${escape(implementationIntro)}</p></div><div class="pf07-problem-solution"><article><p class="eyebrow">PROBLEM</p><h3>${escape(copy.problemTitle)}</h3><p>${escape(copy.problem)}</p></article><article><p class="eyebrow">SOLUTION</p><h3>${escape(copy.solutionTitle)}</h3><p>${escape(copy.solution)}</p></article></div></section>
      <section class="pf07-section pf07-path" id="delivery-path"><div class="pf07-section-heading"><div><p class="eyebrow">DELIVERY PATH</p><h2>${escape(copy.pathTitle)}</h2></div><p>${escape(copy.pathIntro)}</p></div><div class="pf07-path-steps">${cards(copy.pathSteps.map(([, title, text]) => [title, text]), "pf07-step")}</div></section>
      <section class="pf07-section pf07-observation"><div class="pf07-section-heading"><div><p class="eyebrow">OBSERVED RECOVERY</p><h2>${escape(copy.recoveryTitle)}</h2></div><p>${escape(copy.recoveryIntro)}</p></div><div class="pf07-state-grid">${cards(copy.recoveryLabels.map((label, index) => [label, recoveryStateDetails[index]]), "pf07-state")}</div></section>
      <section class="pf07-section pf07-connected"><div class="pf07-section-heading"><div><p class="eyebrow">CONNECTED_MODE</p><h2>${escape(copy.connectedTitle)}</h2></div><p>${escape(copy.connectedIntro)}</p></div><div class="pf07-connected-grid">${cards(copy.connectedLabels.map((label, index) => [label, connectedStateDetails[index]]), "pf07-connected-state")}</div><div class="pf07-section-heading pf07-evidence-heading"><div><p class="eyebrow">CONNECTED EVIDENCE</p><h3>${escape(copy.connectedEvidenceTitle)}</h3></div><p>${escape(copy.connectedEvidenceIntro)}</p></div><div class="pf07-evidence-figure-grid" data-connected-evidence>${figures(connectedFigures, "pf07-evidence-figure")}</div></section>
      ${scorecardSection}${evidenceSection}${claimsSection}
      <section class="pf07-section pf07-final"><div class="pf07-section-heading"><div><p class="eyebrow">PUBLIC RELEASE EVIDENCE</p><h2>${escape(copy.finalProofTitle)}</h2></div><p>${escape(copy.finalProofIntro)}</p></div><div class="pf07-proof-grid">${finalProofCards}</div><div class="pf07-final-grid">${finalFigures}</div></section>
      <section class="pf07-section pf07-delivery"><div class="pf07-section-heading"><div><p class="eyebrow">PUBLIC DELIVERY</p><h2>${escape(copy.packageTitle)}</h2></div><p>${escape(copy.packageIntro)}</p></div><aside class="pf07-candidate-state" data-delivery-release-boundary><b>${escape(releaseIdentityLabel)}</b><code>${escape(project.refinement.currentDelivery.releaseTag)}</code><span>${escape(project.refinement.currentDelivery.publicationState)}</span></aside><div class="pf07-package-grid">${cards(copy.packages, "pf07-package")}</div><div class="pf07-download-grid" aria-label="${escape(copy.downloadAction)}">${releaseDownloads}</div></section>
      <section class="pf07-section pf07-scope"><div class="pf07-section-heading"><div><p class="eyebrow">BUYER FIT</p><h2>${escape(copy.scopeTitle)}</h2></div></div><div class="pf07-scope-grid"><article><h3>${escape(copy.fitTitle)}</h3><ul>${list(copy.fit)}</ul></article><article><h3>${escape(copy.nonFitTitle)}</h3><ul>${list(copy.nonFit)}</ul></article></div></section>
      <aside class="pf07-boundary"><b>${escape(copy.boundaryTitle)}</b><p>${escape(copy.boundary)}</p></aside>
      <nav class="case-bottom-nav" aria-label="${escape(copy.nav.menu)}"><a class="primary-button link-button" href="index.html#work">${escape(copy.nav.work)}</a><a class="text-link" href="inquiry-automation.html">${escape(copy.nav.service)}</a></nav>
    </article>`;
    root.querySelectorAll("[data-video-target][data-video-start]").forEach((button) => {
      button.addEventListener("click", () => {
        const video = document.getElementById(button.dataset.videoTarget);
        const parts = button.dataset.videoStart.split(":").map(Number);
        if (!video || parts.some(Number.isNaN)) return;
        video.currentTime = parts.reduce((total, part) => (total * 60) + part, 0);
        video.focus();
      });
    });
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
