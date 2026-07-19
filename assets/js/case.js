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
