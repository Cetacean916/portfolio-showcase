import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmpRoot = process.env.PORTFOLIO_SCRATCH_ROOT || process.env.TMPDIR || "/tmp";
await fs.mkdir(tmpRoot, { recursive: true });
const profile = mkdtempSync(path.join(tmpRoot, "portfolio-showcase-chrome-"));
const screenshotDir = path.join(tmpRoot, "portfolio-showcase-smoke");
await fs.rm(screenshotDir, { recursive: true, force: true });
await fs.mkdir(screenshotDir, { recursive: true });
const errors = [];
const runtimeErrors = [];
const externalRequests = [];
let screenshotCount = 0;
let viewportPageCount = 0;

const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".png": "image/png", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".mp4": "video/mp4", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain" };
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    let target = path.resolve(root, `.${requested}`);
    if (!target.startsWith(root)) throw new Error("forbidden");
    if ((await fs.stat(target)).isDirectory()) target = path.join(target, "index.html");
    const body = await fs.readFile(target);
    response.writeHead(200, { "content-type": mime[path.extname(target)] || "application/octet-stream", "cache-control": "no-store" });
    response.end(body);
  } catch { response.writeHead(404); response.end("Not found"); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const cdpPort = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const chrome = spawn("google-chrome", ["--headless=new", `--remote-debugging-port=${cdpPort}`, "--no-sandbox", "--no-first-run", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(message); };

try {
  for (let index = 0; index < 60; index += 1) {
    try { if ((await fetch(`http://127.0.0.1:${cdpPort}/json/version`)).ok) break; } catch {}
    if (index === 59) throw new Error("Chrome CDP startup timeout");
    await sleep(150);
  }
  const target = await (await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(base)}`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map();
  let serial = 0;
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails?.text || "runtime exception");
    if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") runtimeErrors.push(message.params.entry.text);
    if (message.method === "Network.requestWillBeSent") {
      const requestUrl = message.params.request?.url || "";
      if (!requestUrl.startsWith(base) && !/^(?:data:|blob:|about:)/.test(requestUrl)) externalRequests.push(requestUrl);
    }
    if (message.id && pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timer); message.error ? item.reject(new Error(JSON.stringify(message.error))) : item.resolve(message.result); }
  };
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("CDP websocket timeout")), 10000); ws.onopen = () => { clearTimeout(timer); resolve(); }; ws.onerror = reject; });
  const send = (method, params = {}) => new Promise((resolve, reject) => { const id = ++serial; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000); pending.set(id, { resolve, reject, timer }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => { const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.text); return result.result.value; };
  await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable"); await send("Network.enable");

  const allTests = [
    ["index-desktop", "index.html", 1440, 1000], ["index-tablet", "index.html", 900, 900], ["index-mobile", "index.html", 390, 844], ["index-small", "index.html", 360, 740],
    ["service-desktop", "inquiry-automation.html", 1440, 1000], ["service-tablet", "inquiry-automation.html", 900, 900], ["service-mobile", "inquiry-automation.html", 390, 844], ["service-small", "inquiry-automation.html", 360, 740],
    ...["oddroom", "pf01", "pf02", "pf03", "pf04", "pf06"].flatMap((id) => [[`case-${id}-desktop`, `case.html?id=${id}`, 1440, 1000], [`case-${id}-mobile`, `case.html?id=${id}`, 390, 844]]),
    ...["ko", "en"].flatMap((language) => [[`case-pf07-${language}-desktop`, `case-pf07-${language}.html`, 1440, 1000], [`case-pf07-${language}-tablet`, `case-pf07-${language}.html`, 768, 900], [`case-pf07-${language}-mobile`, `case-pf07-${language}.html`, 390, 844]]),
    ["demo-pf01-narrow", "demos/pf01/", 320, 740],
    ...["pf01", "pf02", "pf03", "pf04"].flatMap((id) => [
      [`demo-${id}-desktop`, `demos/${id}/`, 1440, 1000],
      [`demo-${id}-tablet`, `demos/${id}/`, 1024, 768],
      [`demo-${id}-mobile`, `demos/${id}/`, 390, 844],
      [`demo-${id}-small`, `demos/${id}/`, 360, 740],
    ]),
  ];
  const smokeFilter = process.env.PORTFOLIO_SMOKE_FILTER;
  const tests = smokeFilter ? allTests.filter(([name]) => name.includes(smokeFilter)) : allTests;
  assert(tests.length > 0, `no smoke tests matched PORTFOLIO_SMOKE_FILTER=${smokeFilter}`);
  viewportPageCount = tests.length;
  for (const [name, page, width, height] of tests) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await send("Page.navigate", { url: `${base}${page}` });
    for (let index = 0; index < 80; index += 1) { if (await evaluate("document.readyState === 'complete'")) break; await sleep(100); }
    await sleep(220);
    const audit = await evaluate(`(() => {
      const broken = [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src);
      const visibleControls = [...document.querySelectorAll('button,a')].filter((node) => { const style=getComputedStyle(node); const rect=node.getBoundingClientRect(); return style.display!=='none' && style.visibility!=='hidden' && rect.width>0 && rect.height>0; });
      const clipped = visibleControls.filter((node) => node.scrollWidth > node.clientWidth + 2 || node.scrollHeight > node.clientHeight + 2).map((node) => node.textContent.trim().slice(0,40));
      const isDemo = location.pathname.includes('/demos/');
      const inputsWithoutLabels = [...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter((node) => {
        if (node.getAttribute('aria-label') || node.getAttribute('aria-labelledby')) return false;
        return !node.id || !document.querySelector('label[for="' + CSS.escape(node.id) + '"]');
      }).map((node) => node.id || node.tagName);
      const smallTouchTargets = innerWidth <= 390 ? visibleControls.filter((node) => {
        if (node.classList.contains('skip-link')) return false;
        const rect = node.getBoundingClientRect();
        return rect.width < 42 || rect.height < 42;
      }).map((node) => node.textContent.trim().slice(0,40)) : [];
      const criticalSmallTouchTargets = innerWidth <= 390 ? [...document.querySelectorAll('.brand,.header-cta,.filter-bar button,.breadcrumb,.case-actions a,.pf07-actions a,.pf07-language a,.card-actions a,.service-actions a,.service-actions button,.service-case-actions a,.service-contact button')].filter((node) => {
        const style=getComputedStyle(node); const rect=node.getBoundingClientRect();
        if (style.display==='none' || style.visibility==='hidden' || rect.width===0 || rect.height===0) return false;
        return rect.width < 43.5 || rect.height < 43.5;
      }).map((node) => node.textContent.trim().slice(0,40)) : [];
      const customInquirySmallTargets = innerWidth <= 390 ? [...document.querySelectorAll('[data-test="custom-channel"],[data-test="custom-message"],[data-test="custom-submit"]')].filter((node) => {
        const style=getComputedStyle(node); const rect=node.getBoundingClientRect();
        if (style.display==='none' || style.visibility==='hidden' || rect.width===0 || rect.height===0) return false;
        return rect.width < 43.5 || rect.height < 43.5;
      }).map((node) => node.getAttribute('data-test') + ':' + Math.round(node.getBoundingClientRect().width) + 'x' + Math.round(node.getBoundingClientRect().height)) : [];
      const aiBoundary = document.querySelector('[data-test="ai-boundary"]');
      const aiBoundaryAudit = aiBoundary ? (() => {
        const style = getComputedStyle(aiBoundary);
        const rect = aiBoundary.getBoundingClientRect();
        const wide = aiBoundary.querySelector('.boundary-copy-wide');
        const compact = aiBoundary.querySelector('.boundary-copy-compact');
        return {
          position: style.position,
          top: style.top,
          zIndex: style.zIndex,
          fontSize: parseFloat(style.fontSize),
          background: style.backgroundColor,
          color: style.color,
          borderBottomColor: style.borderBottomColor,
          textAlign: style.textAlign,
          height: rect.height,
          wideVisible: wide ? getComputedStyle(wide).display !== 'none' : false,
          compactVisible: compact ? getComputedStyle(compact).display !== 'none' : false,
        };
      })() : null;
      return {
        title: document.title,
        h1: document.querySelector('h1')?.textContent.trim() || '',
        broken,
        clipped,
        scrollWidth: document.documentElement.scrollWidth,
        viewport: innerWidth,
        cards: document.querySelectorAll('[data-project-card]').length,
        caseRoot: Boolean(document.querySelector('.case-page,.pf07-case')),
        pf07Root: Boolean(document.querySelector('.pf07-case')),
        pf07CurrentUiSources: [...document.querySelectorAll('.pf07-hero-media img,.pf07-current-surface img')].map((node) => node.getAttribute('src') || node.currentSrc),
        pf07ConnectedEvidenceSources: [...document.querySelectorAll('[data-connected-evidence] img')].map((node) => node.getAttribute('src') || node.currentSrc),
        pf07ReleaseEvidenceSources: [...document.querySelectorAll('[data-release-evidence]')].map((node) => node.getAttribute('href')),
        pf07VideoCount: document.querySelectorAll('.pf07-case video').length,
        pf07VideoLanguageBoundary: Boolean(document.querySelector('[data-video-language-boundary]')),
        pf07DeliveryReleaseBoundary: Boolean(document.querySelector('[data-delivery-release-boundary]')),
        htmlLanguage: document.documentElement.lang,
        hangulCount: (document.body.innerText.match(/[ㄱ-ㆎ가-힣]/g) || []).length,
        serviceRoot: Boolean(document.querySelector('.service-intro')),
        isDemo,
        inputsWithoutLabels,
        smallTouchTargets,
        criticalSmallTouchTargets,
        customInquirySmallTargets,
        aiBoundaryAudit,
        liveRegion: Boolean(document.querySelector('[aria-live], [role="status"]')),
      };
    })()`);
    assert(audit.title && audit.h1, `${name}: title or H1 missing`);
    assert(audit.broken.length === 0, `${name}: broken images ${audit.broken.join(",")}`);
    assert(audit.clipped.length === 0, `${name}: clipped controls ${audit.clipped.join(",")}`);
    assert(audit.scrollWidth <= audit.viewport + 1, `${name}: horizontal overflow ${audit.scrollWidth}/${audit.viewport}`);
    assert(audit.criticalSmallTouchTargets.length === 0, `${name}: critical touch targets below 44px ${audit.criticalSmallTouchTargets.join(",")}`);
    assert(audit.customInquirySmallTargets.length === 0, `${name}: custom inquiry controls below 44px ${audit.customInquirySmallTargets.join(",")}`);
    if (page === "demos/pf01/") {
      assert(audit.aiBoundaryAudit?.position === "sticky" && audit.aiBoundaryAudit.top === "64px" && audit.aiBoundaryAudit.zIndex === "29", `${name}: PF01 AI boundary is not the expected sticky layer ${JSON.stringify(audit.aiBoundaryAudit)}`);
      assert(audit.aiBoundaryAudit.fontSize >= 13 && audit.aiBoundaryAudit.background === "rgb(255, 247, 227)" && audit.aiBoundaryAudit.color === "rgb(102, 81, 37)" && audit.aiBoundaryAudit.borderBottomColor === "rgb(220, 203, 158)" && audit.aiBoundaryAudit.height < height * 0.32, `${name}: PF01 AI boundary palette or height mismatch ${JSON.stringify(audit.aiBoundaryAudit)}`);
      assert(width <= 480 ? audit.aiBoundaryAudit.textAlign === "left" : audit.aiBoundaryAudit.textAlign === "center", `${name}: PF01 AI boundary alignment mismatch ${JSON.stringify(audit.aiBoundaryAudit)}`);
      assert(width <= 480 ? audit.aiBoundaryAudit.compactVisible && !audit.aiBoundaryAudit.wideVisible : audit.aiBoundaryAudit.wideVisible && !audit.aiBoundaryAudit.compactVisible, `${name}: PF01 responsive AI boundary copy mismatch ${JSON.stringify(audit.aiBoundaryAudit)}`);
    }
    if (page.startsWith("index")) assert(audit.cards === 7, `${name}: expected 7 cards, found ${audit.cards}`);
    if (page.startsWith("inquiry-automation")) assert(audit.serviceRoot, `${name}: service page did not render`);
    if (page.startsWith("case")) assert(audit.caseRoot, `${name}: case did not render`);
    if (page.startsWith("case-pf07-") || page.includes("id=pf07")) {
      assert(audit.pf07Root, `${name}: PF07 refinement case did not render`);
      assert(audit.pf07ConnectedEvidenceSources.length === 3
        && ["CASE-014", "CASE-015", "CASE-016"].every((id) => audit.pf07ConnectedEvidenceSources.some((source) => source.includes(id))), `${name}: connected evidence is not buyer-reachable ${JSON.stringify(audit.pf07ConnectedEvidenceSources)}`);
      assert(audit.pf07ReleaseEvidenceSources.length === 4
        && ["CASE-017", "CASE-018", "CASE-019", "CASE-020"].every((id) => audit.pf07ReleaseEvidenceSources.some((source) => source.includes(id))), `${name}: public 1.0.1 release evidence is not buyer-reachable ${JSON.stringify(audit.pf07ReleaseEvidenceSources)}`);
      assert(audit.pf07DeliveryReleaseBoundary, `${name}: current public delivery identity is not visibly established`);
      const english = page.includes("lang=en") || page.includes("-en.html");
      const localeSegment = english ? "/current-ui/en/" : "/current-ui/ko/";
      assert(audit.pf07CurrentUiSources.length === 6 && audit.pf07CurrentUiSources.every((source) => source.includes(localeSegment)), `${name}: localized current UI source binding failed ${JSON.stringify(audit.pf07CurrentUiSources)}`);
      if (english) {
        assert(audit.htmlLanguage === "en" && audit.hangulCount === 0, `${name}: English-only presentation failed lang=${audit.htmlLanguage} hangul=${audit.hangulCount}`);
        assert(audit.pf07VideoCount === 0 && audit.pf07VideoLanguageBoundary, `${name}: Korean runtime video leaked into the English presentation`);
      } else {
        assert(audit.htmlLanguage === "ko", `${name}: Korean presentation lang mismatch ${audit.htmlLanguage}`);
        assert(audit.pf07VideoCount === 2 && !audit.pf07VideoLanguageBoundary, `${name}: Korean execution media presentation failed`);
      }
    }
    if (page.startsWith("demos/")) {
      assert(audit.isDemo, `${name}: demo did not render`);
      assert(audit.liveRegion, `${name}: demo has no live status region`);
      assert(audit.inputsWithoutLabels.length === 0, `${name}: unlabeled inputs ${audit.inputsWithoutLabels.join(",")}`);
      assert(audit.smallTouchTargets.length === 0, `${name}: touch targets below 42px ${audit.smallTouchTargets.join(",")}`);
    }
    const scrollStops = await evaluate(`(() => {
      const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const stops = [];
      for (let y = 0; y < max; y += Math.max(1, innerHeight - 80)) stops.push(y);
      if (!stops.length || stops.at(-1) !== max) stops.push(max);
      return stops;
    })()`);
    for (let tileIndex = 0; tileIndex < scrollStops.length; tileIndex += 1) {
      await evaluate(`window.scrollTo(0, ${scrollStops[tileIndex]})`);
      await sleep(120);
      if (page === "demos/pf01/") {
        const stickyBoundary = await evaluate(`(() => {
          const header=document.querySelector('.demo-topbar').getBoundingClientRect();
          const banner=document.querySelector('[data-test="ai-boundary"]').getBoundingClientRect();
          return { headerBottom:header.bottom, bannerTop:banner.top, bannerBottom:banner.bottom, bannerHeight:banner.height, viewport:innerHeight };
        })()`);
        assert(Math.abs(stickyBoundary.bannerTop - stickyBoundary.headerBottom) <= 1.5 && stickyBoundary.bannerTop >= -0.5 && stickyBoundary.bannerBottom < stickyBoundary.viewport * 0.4, `${name} scroll ${tileIndex}: sticky AI boundary overlap/framing mismatch ${JSON.stringify(stickyBoundary)}`);
      }
      const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
      const suffix = tileIndex === 0 ? "" : `-scroll-${String(tileIndex).padStart(2, "0")}`;
      await fs.writeFile(path.join(screenshotDir, `${name}${suffix}.png`), Buffer.from(screenshot.data, "base64"));
      screenshotCount += 1;
    }
  }

  const openDemo = async (id) => {
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${base}demos/${id}/` });
    for (let index = 0; index < 80; index += 1) {
      if (await evaluate("document.readyState === 'complete'")) break;
      await sleep(100);
    }
    await sleep(180);
  };
  const installDownloadSpy = async () => evaluate(`(() => {
    window.__downloadAudit = [];
    window.__downloadBlobs = new Map();
    const createObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = createObjectURL(blob);
      window.__downloadBlobs.set(url, blob);
      return url;
    };
    const anchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) {
        window.__downloadAudit.push({ filename: this.download, blob: window.__downloadBlobs.get(this.href) });
        return;
      }
      return anchorClick.call(this);
    };
  })()`);
  const readDownloads = async () => evaluate(`Promise.all((window.__downloadAudit || []).map(async (item) => ({ filename: item.filename, text: item.blob ? await item.blob.text() : '' })))`);

  await openDemo("pf01");
  await installDownloadSpy();
  const pf01Focus = await evaluate(`(() => { const node=document.querySelector('[data-test="run"]'); node.focus(); const style=getComputedStyle(node); return { outline: style.outlineStyle, color: style.outlineColor }; })()`);
  assert(pf01Focus.outline === "solid" && pf01Focus.color === "rgb(111, 74, 0)", `PF01 focus contrast token mismatch ${JSON.stringify(pf01Focus)}`);
  const pf01InitialBatch = await evaluate(`(() => ({
    id: document.querySelector('[data-test="batch-id"]').textContent.trim(),
    source: document.querySelector('[data-test="batch-source"]').textContent.trim(),
    generateLabel: document.querySelector('[data-test="generate"]').textContent.trim(),
    boundary: document.querySelector('.boundary-note').textContent.replace(/\s+/g, ' ').trim(),
  }))()`);
  assert(pf01InitialBatch.id.includes("BASE-001") && pf01InitialBatch.source === "비식별 기준 배치" && pf01InitialBatch.generateLabel.includes("새 합성 문의 5건") && pf01InitialBatch.boundary.includes("규칙 기반 공개 데모") && pf01InitialBatch.boundary.includes("사용을 승인한 AI API") && pf01InitialBatch.boundary.includes("별도 협의"), `PF01 initial batch disclosure mismatch ${JSON.stringify(pf01InitialBatch)}`);
  await evaluate("document.querySelector('[data-test=\"generate\"]').click()");
  await sleep(80);
  const pf01GeneratedFirst = await evaluate(`(() => ({
    id: document.querySelector('[data-test="batch-id"]').textContent.trim(),
    source: document.querySelector('[data-test="batch-source"]').textContent.trim(),
    ticketIds: [...document.querySelectorAll('.ticket-item strong')].map((node) => node.textContent.split(' · ')[0]),
    channels: [...document.querySelectorAll('.ticket-item')].map((node) => node.getAttribute('aria-label')),
    rows: document.querySelectorAll('#resultRows tr:not(.empty-row)').length,
  }))()`);
  assert(pf01GeneratedFirst.id.includes("SYN-") && pf01GeneratedFirst.source === "새로 생성한 합성 배치" && pf01GeneratedFirst.ticketIds.length === 5 && new Set(pf01GeneratedFirst.ticketIds).size === 5 && pf01GeneratedFirst.rows === 0, `PF01 first generated batch mismatch ${JSON.stringify(pf01GeneratedFirst)}`);
  await evaluate("document.querySelector('[data-test=\"generate\"]').click()");
  await sleep(80);
  const pf01GeneratedSecond = await evaluate(`(() => ({
    id: document.querySelector('[data-test="batch-id"]').textContent.trim(),
    messages: [...document.querySelectorAll('.ticket-item p')].map((node) => node.textContent.trim()),
    details: [...document.querySelectorAll('.ticket-item')].map((node) => node.getAttribute('aria-label')),
  }))()`);
  assert(pf01GeneratedSecond.id.includes("SYN-") && pf01GeneratedSecond.id !== pf01GeneratedFirst.id && pf01GeneratedSecond.messages.length === 5 && new Set(pf01GeneratedSecond.messages).size === 5, `PF01 replacement batch mismatch ${JSON.stringify(pf01GeneratedSecond)}`);
  await evaluate("document.querySelector('[data-test=\"run\"]').click()");
  await sleep(120);
  const pf01Run = await evaluate(`(() => ({
    total: document.querySelector('[data-test="count-total"]').textContent.trim(),
    urgent: document.querySelector('[data-test="count-urgent"]').textContent.trim(),
    categories: document.querySelector('[data-test="count-categories"]').textContent.trim(),
    drafts: document.querySelector('[data-test="count-drafts"]').textContent.trim(),
    rows: document.querySelectorAll('#resultRows tr:not(.empty-row)').length,
    channels: [...document.querySelectorAll('#resultRows tr:not(.empty-row) td:nth-child(2)')].map((node) => node.textContent.trim()),
    state: document.querySelector('[data-test="result-state"]').textContent.trim(),
  }))()`);
  assert(pf01Run.total === "5" && pf01Run.urgent === "2" && pf01Run.categories === "5" && pf01Run.drafts === "5" && pf01Run.rows === 5 && new Set(pf01Run.channels).size === 3, `PF01 interaction mismatch ${JSON.stringify(pf01Run)}`);
  await evaluate(`(() => { const select=document.querySelector('[data-test="filter"]'); select.value='urgent'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  assert(await evaluate("document.querySelector('[data-test=\"count-visible\"]').textContent.trim()") === "2건", "PF01 urgent filter failed");
  await evaluate("document.querySelector('[data-test=\"download\"]').click()");
  const pf01Downloads = await readDownloads();
  assert(pf01Downloads.length === 1 && pf01Downloads[0].filename === "pf01-trial-classification.csv" && pf01Downloads[0].text.includes("문의 ID") && pf01Downloads[0].text.trim().split(/\r?\n/).length === 6 && !/01[016789]-\d{3,4}-\d{4}/.test(pf01Downloads[0].text), "PF01 CSV content or filename mismatch");
  await evaluate("document.querySelector('[data-test=\"reset\"]').click()");
  const pf01Reset = await evaluate(`(() => ({ urgent: document.querySelector('[data-test="count-urgent"]').textContent.trim(), id: document.querySelector('[data-test="batch-id"]').textContent.trim() }))()`);
  assert(pf01Reset.urgent === "-" && pf01Reset.id.includes("BASE-001"), `PF01 reset failed ${JSON.stringify(pf01Reset)}`);

  await evaluate("document.querySelector('[data-test=\"custom-submit\"]').click()");
  const pf01EmptyCustom = await evaluate(`(() => ({
    total: document.querySelector('[data-test="count-total"]').textContent.trim(),
    status: document.querySelector('[data-test="custom-status"]').textContent.trim(),
    focused: document.activeElement === document.querySelector('[data-test="custom-message"]'),
  }))()`);
  assert(pf01EmptyCustom.total === "5" && pf01EmptyCustom.status.includes("입력해 주세요") && pf01EmptyCustom.focused, `PF01 empty custom validation failed ${JSON.stringify(pf01EmptyCustom)}`);

  await evaluate(`(() => {
    document.querySelector('[data-test="custom-channel"]').value='웹 폼';
    const input=document.querySelector('[data-test="custom-message"]');
    input.value='배송된 상품이 파손되어 교환하고 싶습니다.';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('#customInquiryForm').requestSubmit();
  })()`);
  await sleep(100);
  const pf01CustomExchange = await evaluate(`(() => ({
    total: document.querySelector('[data-test="count-total"]').textContent.trim(),
    urgent: document.querySelector('[data-test="count-urgent"]').textContent.trim(),
    rows: document.querySelectorAll('#resultRows tr:not(.empty-row)').length,
    meta: document.querySelector('#selectedMeta').textContent.trim(),
    category: document.querySelector('#selectedCategory').textContent.trim(),
    reason: document.querySelector('#selectedReason').textContent.trim(),
    source: document.querySelector('[data-test="batch-source"]').textContent.trim(),
    counter: document.querySelector('[data-test="custom-message-count"]').textContent.trim(),
  }))()`);
  assert(pf01CustomExchange.total === "6" && pf01CustomExchange.urgent === "2" && pf01CustomExchange.rows === 6 && pf01CustomExchange.meta.includes("CUSTOM-001") && pf01CustomExchange.meta.includes("직접 입력") && pf01CustomExchange.category === "교환 요청" && pf01CustomExchange.reason.includes("키워드 점수 2") && pf01CustomExchange.source.includes("직접 1건") && pf01CustomExchange.counter === "0 / 500", `PF01 scored custom classification failed ${JSON.stringify(pf01CustomExchange)}`);
  await evaluate("document.querySelector('#selectedMessage').scrollIntoView({ block: 'center' })");
  await sleep(100);
  const pf01CustomScreenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  await fs.writeFile(path.join(screenshotDir, "demo-pf01-custom-result-desktop.png"), Buffer.from(pf01CustomScreenshot.data, "base64"));
  screenshotCount += 1;

  await installDownloadSpy();
  await evaluate("document.querySelector('[data-test=\"download\"]').click()");
  const pf01CustomDownload = await readDownloads();
  assert(pf01CustomDownload.length === 1 && pf01CustomDownload[0].text.includes("직접 입력") && pf01CustomDownload[0].text.includes("배송된 상품이 파손되어 교환하고 싶습니다.") && pf01CustomDownload[0].text.trim().split(/\r?\n/).length === 7, "PF01 direct-inquiry CSV mismatch");

  await evaluate("document.querySelector('[data-test=\"generate\"]').click()");
  const pf01CustomPreserved = await evaluate(`(() => ({
    total: document.querySelector('[data-test="count-total"]').textContent.trim(),
    custom: [...document.querySelectorAll('.ticket-item strong')].some((node) => node.textContent.includes('CUSTOM-001')),
    rows: document.querySelectorAll('#resultRows tr:not(.empty-row)').length,
    source: document.querySelector('[data-test="batch-source"]').textContent.trim(),
  }))()`);
  assert(pf01CustomPreserved.total === "6" && pf01CustomPreserved.custom && pf01CustomPreserved.rows === 0 && pf01CustomPreserved.source.includes("직접 1건"), `PF01 custom preservation across generation failed ${JSON.stringify(pf01CustomPreserved)}`);

  await evaluate(`(() => {
    const input=document.querySelector('[data-test="custom-message"]');
    input.value='=HYPERLINK("x") <img src=x> 사용 방법을 자세히 알려주세요.';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('#customInquiryForm').requestSubmit();
  })()`);
  await sleep(80);
  const pf01CustomUnknown = await evaluate(`(() => ({
    total: document.querySelector('[data-test="count-total"]').textContent.trim(),
    category: document.querySelector('#selectedCategory').textContent.trim(),
    reason: document.querySelector('#selectedReason').textContent.trim(),
    injected: document.querySelector('#ticketList img, #selectedMessage img, #ticketList script, #selectedMessage script') !== null,
  }))()`);
  assert(pf01CustomUnknown.total === "7" && pf01CustomUnknown.category === "일반 문의" && pf01CustomUnknown.reason.includes("명확한 분류 단서 없음") && !pf01CustomUnknown.injected, `PF01 unknown/XSS custom classification failed ${JSON.stringify(pf01CustomUnknown)}`);
  await installDownloadSpy();
  await evaluate("document.querySelector('[data-test=\"download\"]').click()");
  const pf01FormulaDownload = await readDownloads();
  assert(pf01FormulaDownload.length === 1 && pf01FormulaDownload[0].text.includes("\"'=HYPERLINK") && pf01FormulaDownload[0].text.trim().split(/\r?\n/).length === 8, "PF01 custom CSV formula defense failed");

  await evaluate(`(() => {
    const form=document.querySelector('#customInquiryForm');
    const input=document.querySelector('[data-test="custom-message"]');
    for(let index=0; index<8; index+=1){ input.value='별도 일반 문의 ' + index; input.dispatchEvent(new Event('input',{bubbles:true})); form.requestSubmit(); }
  })()`);
  const pf01CustomLimit = await evaluate(`(() => ({
    total: document.querySelector('[data-test="count-total"]').textContent.trim(),
    disabled: document.querySelector('[data-test="custom-submit"]').disabled,
    label: document.querySelector('[data-test="custom-submit"]').textContent.trim(),
    status: document.querySelector('[data-test="custom-status"]').textContent.trim(),
  }))()`);
  assert(pf01CustomLimit.total === "15" && pf01CustomLimit.disabled && pf01CustomLimit.label.includes("10건 완료") && pf01CustomLimit.status.includes("최대 10건"), `PF01 custom limit failed ${JSON.stringify(pf01CustomLimit)}`);
  await evaluate("document.querySelector('[data-test=\"reset\"]').click()");
  const pf01CustomReset = await evaluate(`(() => ({
    total: document.querySelector('[data-test="count-total"]').textContent.trim(),
    disabled: document.querySelector('[data-test="custom-submit"]').disabled,
    custom: [...document.querySelectorAll('.ticket-item strong')].some((node) => node.textContent.includes('CUSTOM-')),
  }))()`);
  assert(pf01CustomReset.total === "5" && !pf01CustomReset.disabled && !pf01CustomReset.custom, `PF01 custom reset failed ${JSON.stringify(pf01CustomReset)}`);

  await openDemo("pf02");
  await installDownloadSpy();
  const pf02Focus = await evaluate(`(() => { const node=document.querySelector('[data-test="run"]'); node.focus(); const style=getComputedStyle(node); return { outline: style.outlineStyle, color: style.outlineColor }; })()`);
  assert(pf02Focus.outline === "solid" && pf02Focus.color === "rgb(111, 74, 0)", `PF02 focus contrast token mismatch ${JSON.stringify(pf02Focus)}`);
  const runPf02Preset = async (preset) => {
    await evaluate(`(() => { const select=document.querySelector('[data-test="preset"]'); select.value=${JSON.stringify(preset)}; select.dispatchEvent(new Event('change',{bubbles:true})); document.querySelector('[data-test="run"]').click(); })()`);
    await sleep(180);
    return evaluate(`(() => ({
      stored: document.querySelector('[data-test="count-stored"]').textContent.trim(),
      authorized: document.querySelector('[data-test="count-authorized"]').textContent.trim(),
      review: document.querySelector('[data-test="count-review"]').textContent.trim(),
      failed: document.querySelector('[data-test="count-failed"]').textContent.trim(),
      status: document.querySelector('#responseStatus').textContent.trim(),
    }))()`);
  };
  const pf02Normal = await runPf02Preset("normal");
  assert(pf02Normal.stored === "2" && pf02Normal.status === "new", `PF02 normal flow mismatch ${JSON.stringify(pf02Normal)}`);
  const pf02NotificationReady = await evaluate(`(() => ({
    disabled: document.querySelector('[data-test="browser-notification"]').disabled,
    status: document.querySelector('[data-test="browser-notification-status"]').textContent.trim(),
  }))()`);
  assert(!pf02NotificationReady.disabled && pf02NotificationReady.status.includes("TRIAL-001"), `PF02 browser notification readiness mismatch ${JSON.stringify(pf02NotificationReady)}`);
  await evaluate(`(() => {
    window.__notificationAudit = { requests: 0, notifications: [] };
    let permission = 'default';
    class TrialNotification {
      static get permission() { return permission; }
      static async requestPermission() { window.__notificationAudit.requests += 1; permission = 'granted'; return permission; }
      constructor(title, options) { window.__notificationAudit.notifications.push({ title, options }); }
    }
    Object.defineProperty(globalThis, 'Notification', { configurable: true, value: TrialNotification });
    renderBrowserNotification();
    document.querySelector('[data-test="browser-notification"]').click();
  })()`);
  await sleep(80);
  const pf02BrowserNotification = await evaluate(`(() => ({
    audit: window.__notificationAudit,
    permission: document.querySelector('[data-test="browser-notification-permission"]').textContent.trim(),
    status: document.querySelector('[data-test="browser-notification-status"]').textContent.trim(),
  }))()`);
  assert(pf02BrowserNotification.audit.requests === 1 && pf02BrowserNotification.audit.notifications.length === 1 && pf02BrowserNotification.audit.notifications[0].title === "PF02 로컬 처리 알림" && pf02BrowserNotification.audit.notifications[0].options.body.includes("TRIAL-001") && !pf02BrowserNotification.audit.notifications[0].options.body.includes("example.invalid") && pf02BrowserNotification.permission === "사용 가능" && pf02BrowserNotification.status.includes("브라우저 알림"), `PF02 browser notification mismatch ${JSON.stringify(pf02BrowserNotification)}`);
  const pf02Auth = await runPf02Preset("auth-failure");
  assert(pf02Auth.stored === "2" && pf02Auth.status === "unauthorized", `PF02 auth flow mismatch ${JSON.stringify(pf02Auth)}`);
  const pf02Missing = await runPf02Preset("missing-email");
  assert(pf02Missing.stored === "3" && pf02Missing.status === "missing_email", `PF02 missing-email flow mismatch ${JSON.stringify(pf02Missing)}`);
  const pf02Duplicate = await runPf02Preset("duplicate");
  assert(pf02Duplicate.stored === "4" && pf02Duplicate.status === "duplicate_candidate", `PF02 duplicate flow mismatch ${JSON.stringify(pf02Duplicate)}`);
  const pf02Failure = await runPf02Preset("notification-failure");
  assert(pf02Failure.stored === "5" && pf02Failure.authorized === "4" && pf02Failure.review === "2" && pf02Failure.failed === "1" && pf02Failure.status === "received_but_notification_failed", `PF02 notification flow mismatch ${JSON.stringify(pf02Failure)}`);
  assert(await evaluate("document.querySelector('[data-test=\"browser-notification\"]').disabled") === true, "PF02 failed notification must not enable local browser notification");
  await evaluate("document.querySelector('[data-test=\"mode-email\"]').click()");
  assert(await evaluate("document.querySelector('[data-test=\"mode-email\"]').getAttribute('aria-pressed')") === "true", "PF02 Email mode failed");
  await evaluate("document.querySelector('[data-test=\"download\"]').click()");
  const pf02Downloads = await readDownloads();
  assert(pf02Downloads.length === 1 && pf02Downloads[0].filename === "pf02-public-trial-rows.csv" && pf02Downloads[0].text.includes("run_id") && pf02Downloads[0].text.includes("MASK-") && pf02Downloads[0].text.includes("simulated_slack") && pf02Downloads[0].text.includes("le***@example.invalid") && pf02Downloads[0].text.includes("se***@example.invalid") && !pf02Downloads[0].text.includes("lead.a@example.invalid") && !pf02Downloads[0].text.includes("seed.lead@example.invalid") && !pf02Downloads[0].text.includes("sent_slack") && pf02Downloads[0].text.trim().split(/\r?\n/).length === 6 && !/01[016789]-\d{3,4}-\d{4}/.test(pf02Downloads[0].text), "PF02 CSV content, simulation labeling, masking, or filename mismatch");
  await evaluate("document.querySelector('[data-test=\"reset\"]').click()");
  assert(await evaluate("document.querySelector('[data-test=\"count-stored\"]').textContent.trim()") === "1", "PF02 reset failed");
  await evaluate("document.querySelector('[data-test=\"run\"]').click(); document.querySelector('[data-test=\"run\"]').click()");
  await sleep(180);
  assert(await evaluate("document.querySelector('[data-test=\"count-stored\"]').textContent.trim()") === "2", "PF02 double-submit serialization failed");
  await evaluate("document.querySelector('[data-test=\"reset\"]').click()");

  await openDemo("pf03");
  await installDownloadSpy();
  const pf03FileFocus = await evaluate(`(() => {
    const input=document.querySelector('[data-test="pf03-file-input"]');
    input.focus();
    const label=input.closest('label');
    const style=getComputedStyle(label);
    return { active: document.activeElement === input, focusWithin: label.matches(':focus-within'), outline: style.outlineStyle, color: style.outlineColor };
  })()`);
  assert(pf03FileFocus.active && pf03FileFocus.focusWithin && pf03FileFocus.outline === "solid" && pf03FileFocus.color === "rgb(0, 107, 98)", `PF03 file focus indicator failed ${JSON.stringify(pf03FileFocus)}`);
  await evaluate("document.querySelector('[data-test=\"pf03-load-sample\"]').click(); document.querySelector('[data-test=\"pf03-run\"]').click()");
  await sleep(120);
  const pf03Run = await evaluate(`(() => ({
    total: document.querySelector('[data-test="pf03-count-total"]').textContent.trim(),
    clean: document.querySelector('[data-test="pf03-count-clean"]').textContent.trim(),
    invalid: document.querySelector('[data-test="pf03-count-invalid"]').textContent.trim(),
    duplicate: document.querySelector('[data-test="pf03-count-duplicate"]').textContent.trim(),
  }))()`);
  assert(JSON.stringify(pf03Run) === JSON.stringify({ total: "21", clean: "8", invalid: "11", duplicate: "2" }), `PF03 count mismatch ${JSON.stringify(pf03Run)}`);
  await evaluate("document.querySelector('[data-test=\"pf03-tab-invalid\"]').click()");
  assert(await evaluate("document.querySelectorAll('[data-test=\"pf03-result-rows\"] tr').length") === 11, "PF03 invalid tab mismatch");
  await evaluate("document.querySelector('[data-test=\"pf03-tab-duplicate\"]').click()");
  assert(await evaluate("document.querySelectorAll('[data-test=\"pf03-result-rows\"] tr').length") === 2, "PF03 duplicate tab mismatch");
  await evaluate("document.querySelector('[data-test=\"pf03-download-clean\"]').click(); document.querySelector('[data-test=\"pf03-download-invalid\"]').click(); document.querySelector('[data-test=\"pf03-download-duplicate\"]').click()");
  const pf03Downloads = await readDownloads();
  assert(JSON.stringify(pf03Downloads.map((item) => item.filename)) === JSON.stringify(["clean_rows.csv", "invalid_rows.csv", "duplicate_rows.csv"]), `PF03 CSV filenames mismatch ${JSON.stringify(pf03Downloads.map((item) => item.filename))}`);
  assert(pf03Downloads.every((item) => item.text.includes("ID") && !/01[016789]-\d{3,4}-\d{4}/.test(item.text)), "PF03 CSV content mismatch");
  assert(JSON.stringify(pf03Downloads.map((item) => item.text.trim().split(/\r?\n/).length)) === JSON.stringify([9, 12, 3]), "PF03 CSV row-count contract mismatch");
  await installDownloadSpy();
  await evaluate(`(() => {
    const input=document.querySelector('[data-test="pf03-source-input"]');
    input.value='order_id,order_date,customer,phone,amount,status\\n=ID,2026-07-01,+NAME,@PHONE,10,-STATUS';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    document.querySelector('[data-test="pf03-run"]').click();
    document.querySelector('[data-test="pf03-download-clean"]').click();
  })()`);
  const pf03FormulaDownload = await readDownloads();
  assert(pf03FormulaDownload.length === 1 && pf03FormulaDownload[0].filename === "clean_rows.csv" && ["'=ID", "'+NAME", "'@PHONE", "'-STATUS"].every((token) => pf03FormulaDownload[0].text.includes(token)), "PF03 formula-prefix defense failed");
  await evaluate("document.querySelector('[data-test=\"pf03-reset\"]').click()");
  assert(await evaluate("document.querySelector('[data-test=\"pf03-count-total\"]').textContent.trim()") === "21", "PF03 reset failed");

  await openDemo("pf04");
  await installDownloadSpy();
  const pf04Focus = await evaluate(`(() => { const node=document.querySelector('[data-test="pf04-add-employee"]'); node.focus(); const style=getComputedStyle(node); return { outline: style.outlineStyle, color: style.outlineColor }; })()`);
  assert(pf04Focus.outline === "solid" && pf04Focus.color === "rgb(31, 95, 156)", `PF04 focus contrast token mismatch ${JSON.stringify(pf04Focus)}`);
  const pf04Initial = await evaluate(`(() => ['total','pending','complete','approved'].map((name) => document.querySelector('[data-test="pf04-count-' + name + '"]').textContent.trim()))()`);
  assert(JSON.stringify(pf04Initial) === JSON.stringify(["3", "1", "2", "1"]), `PF04 initial state mismatch ${JSON.stringify(pf04Initial)}`);
  await evaluate("document.querySelector('[data-test=\"pf04-add-submit\"]').click()");
  await sleep(100);
  assert(await evaluate("document.querySelector('[data-test=\"pf04-count-total\"]').textContent.trim()") === "4", "PF04 create failed");
  await evaluate("document.querySelector('[data-test=\"pf04-approve\"]').click()");
  assert(await evaluate("document.querySelector('[data-test=\"pf04-count-approved\"]').textContent.trim()") === "2", "PF04 approve failed");
  await evaluate(`(() => document.querySelector('[data-action="select"][data-id="LR-260701"]').click())()`);
  await evaluate("document.querySelector('[data-test=\"pf04-reject\"]').click()");
  const pf04Decisions = await evaluate(`(() => ['total','pending','complete','approved'].map((name) => document.querySelector('[data-test="pf04-count-' + name + '"]').textContent.trim()))()`);
  assert(JSON.stringify(pf04Decisions) === JSON.stringify(["4", "0", "4", "2"]), `PF04 decision mismatch ${JSON.stringify(pf04Decisions)}`);
  await evaluate(`(() => { const select=document.querySelector('[data-test="pf04-filter-team"]'); select.value='개발'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  assert(await evaluate("document.querySelector('[data-test=\"pf04-filtered-count\"]').textContent.trim()") === "2건 표시", "PF04 team filter failed");
  const pf04FilteredSelection = await evaluate(`(() => ({ meta: document.querySelector('#selectedMeta').textContent.trim(), status: document.querySelector('[data-test="pf04-selected-status"]').textContent.trim() }))()`);
  assert(pf04FilteredSelection.meta.includes("개발") && pf04FilteredSelection.status === "승인", `PF04 filtered selection is stale ${JSON.stringify(pf04FilteredSelection)}`);
  await evaluate("document.querySelector('[data-test=\"pf04-export\"]').click()");
  const pf04Downloads = await readDownloads();
  assert(pf04Downloads.length === 1 && pf04Downloads[0].filename === "leave_requests_filtered.csv" && pf04Downloads[0].text.includes("신청 번호") && pf04Downloads[0].text.trim().split(/\r?\n/).length === 3, "PF04 filtered CSV content or filename mismatch");
  await evaluate("document.querySelector('[data-test=\"pf04-reset\"]').click()");
  const pf04Reset = await evaluate(`(() => ['total','pending','complete'].map((name) => document.querySelector('[data-test="pf04-count-' + name + '"]').textContent.trim()))()`);
  assert(JSON.stringify(pf04Reset) === JSON.stringify(["3", "1", "2"]), `PF04 reset mismatch ${JSON.stringify(pf04Reset)}`);

  await send("Page.navigate", { url: `${base}index.html` }); await sleep(250);
  const rootFocus = await evaluate(`(() => { const node=document.querySelector('[data-filter="all"]'); node.focus(); const style=getComputedStyle(node); return { outline: style.outlineStyle, color: style.outlineColor }; })()`);
  assert(rootFocus.outline === "solid" && rootFocus.color === "rgb(111, 74, 0)", `root focus contrast token mismatch ${JSON.stringify(rootFocus)}`);
  const filterAudit = await evaluate(`(() => { document.querySelector('[data-filter="backend"]').click(); return [...document.querySelectorAll('[data-project-card]')].filter((card) => !card.hidden).map((card) => card.querySelector('h3').textContent.trim()); })()`);
  assert(filterAudit.length === 2 && filterAudit.some((title) => title.includes("Spring Boot")) && filterAudit.some((title) => title.includes("OFFSET / PF07")), "filter interaction failed");

  await evaluate(`(() => {
    window.__copiedBrief = '';
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => { window.__copiedBrief = value; } } });
    const button = document.querySelector('.copy-control--header [data-copy-brief]');
    button.focus();
    button.click();
  })()`);
  await sleep(100);
  const copySuccess = await evaluate(`(() => {
    const control=document.querySelector('.copy-control--header');
    const button=control.querySelector('[data-copy-brief]');
    const status=control.querySelector('[data-copy-status]');
    const buttonRect=button.getBoundingClientRect();
    const statusRect=status.getBoundingClientRect();
    return {
      copied: window.__copiedBrief,
      status: status.textContent.trim(),
      state: status.dataset.state,
      focusRetained: document.activeElement === button,
      busyCleared: !button.hasAttribute('aria-busy') && button.dataset.copyPending !== 'true',
      describedBy: button.getAttribute('aria-describedby'),
      statusId: status.id,
      distance: statusRect.top - buttonRect.bottom,
      visible: getComputedStyle(status).display !== 'none' && statusRect.width > 0 && statusRect.height > 0,
    };
  })()`);
  assert(copySuccess.copied.includes("1. 필요한 서비스:") && copySuccess.status.includes("이용하시는 문의 채널에 붙여넣고") && copySuccess.state === "success" && copySuccess.focusRetained && copySuccess.busyCleared && copySuccess.describedBy === copySuccess.statusId && copySuccess.visible && copySuccess.distance >= 0 && copySuccess.distance <= 16, `copy success feedback mismatch ${JSON.stringify(copySuccess)}`);

  await evaluate(`(() => {
    document.querySelector('.contact-section').scrollIntoView({ block: 'center' });
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: () => false });
    const button = document.querySelector('.contact-section [data-copy-brief]');
    button.focus();
    button.click();
  })()`);
  await sleep(100);
  const copyFailure = await evaluate(`(() => {
    const control=document.querySelector('.contact-section [data-copy-control]');
    const button=control.querySelector('[data-copy-brief]');
    const status=control.querySelector('[data-copy-status]');
    const buttonRect=button.getBoundingClientRect();
    const statusRect=status.getBoundingClientRect();
    return { status:status.textContent.trim(), state:status.dataset.state, focusRetained:document.activeElement===button, busyCleared:!button.hasAttribute('aria-busy')&&button.dataset.copyPending!=='true', distance:statusRect.top-buttonRect.bottom, visible:getComputedStyle(status).display!=='none' && statusRect.width>0 && statusRect.height>0 };
  })()`);
  assert(copyFailure.status.includes("자동 복사에 실패했습니다") && copyFailure.state === "error" && copyFailure.focusRetained && copyFailure.busyCleared && copyFailure.visible && copyFailure.distance >= 0 && copyFailure.distance <= 28, `copy failure feedback mismatch ${JSON.stringify(copyFailure)}`);

  await send("Page.navigate", { url: `${base}inquiry-automation.html` }); await sleep(250);
  const serviceAudit = await evaluate(`(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent.trim(),
    caseOrder: [...document.querySelectorAll('.service-case')].map((node) => node.id),
    links: [...document.querySelectorAll('.service-case-actions a')].map((node) => node.getAttribute('href')),
    copyLabels: [...document.querySelectorAll('[data-copy-brief]')].map((node) => node.textContent.trim()),
    boundary: document.querySelector('#boundaries')?.textContent.replace(/\s+/g,' ').trim(),
  }))()`);
  assert(serviceAudit.title.includes("문의·접수 업무 자동화") && serviceAudit.h1 === "문의·접수 업무 자동화", `service identity mismatch ${JSON.stringify(serviceAudit)}`);
  assert(JSON.stringify(serviceAudit.caseOrder) === JSON.stringify(["core-flow", "ai-extension", "management-extension"]), `service composition order mismatch ${JSON.stringify(serviceAudit.caseOrder)}`);
  assert(["case.html?id=pf02", "demos/pf02/", "case.html?id=pf01", "demos/pf01/", "case.html?id=pf04", "demos/pf04/"].every((link) => serviceAudit.links.includes(link)), `service direct links missing ${JSON.stringify(serviceAudit.links)}`);
  assert(serviceAudit.copyLabels.length === 3 && serviceAudit.copyLabels.every((label) => label === "문의 내용 작성 양식 복사") && serviceAudit.boundary.includes("공개 체험과 실제 구축을 구분") && serviceAudit.boundary.includes("AI 정확도 100% 보장"), `service boundary or neutral CTA mismatch ${JSON.stringify(serviceAudit)}`);

  if (externalRequests.length) errors.push(...[...new Set(externalRequests)].map((item) => `external browser request: ${item}`));
  if (runtimeErrors.length) errors.push(...runtimeErrors.map((item) => `browser runtime: ${item}`));
  ws.close();
} catch (error) { errors.push(error.stack || error.message); }
finally {
  const chromeExit = new Promise((resolve) => chrome.once("exit", resolve));
  chrome.kill("SIGTERM");
  await Promise.race([chromeExit, sleep(2000)]);
  await new Promise((resolve) => server.close(resolve));
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); } catch {}
}

const report = {
  status: errors.length ? "FAIL" : "PASS",
  checkedAt: new Date().toISOString(),
  screenshots: "RUN_SCOPED_SCRATCH_ONLY",
  viewportPageCount,
  screenshotCount,
  errors,
};
await fs.mkdir(path.join(root, "validation"), { recursive: true });
await fs.writeFile(path.join(root, "validation/browser-smoke.json"), `${JSON.stringify(report, null, 2)}\n`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`BROWSER_SMOKE_PASS: ${viewportPageCount} viewport/page combinations, ${screenshotCount} viewport screenshots; screenshots=${screenshotDir}`);
