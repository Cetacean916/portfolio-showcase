import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const portfolioRoot = path.resolve(siteRoot, "..");
const productDir = path.join(
  portfolioRoot,
  "유형별 포트폴리오/01-AI-고객문의-요약분류-자동화",
);
const demoPath = "/demos/pf01/";
const demoRoot = path.join(siteRoot, demoPath);
const scratchRoot = path.join(process.env.HOME || os.homedir(), "tmp");
const videoPath = path.join(productDir, "registration-demo-video.mp4");
const reportPath = path.join(productDir, "evidence/registration-video-validation-report.json");

const CONFIG = {
  code: "PF01",
  demoBuildId: "PF01_PUBLIC_TRIAL_20260711_01",
  sourceRunId: "PF01_CONFIGURABLE_LIVE_20260628",
  readySelector: "#customInquiryForm",
  frames: [
    ["screenshots/15-registration-trial-input.png", "input"],
    ["screenshots/16-registration-trial-result.png", "result"],
    ["screenshots/17-registration-trial-proof.png", "proof"],
  ],
};

const FRAME_RATE = 15;
const VIDEO_WIDTH = 1440;
const VIDEO_HEIGHT = 1000;
const MIN_DURATION = 45;
const MAX_DURATION = 65;
const DIRECT_MESSAGE = "주문 식별정보 없이 문의드립니다. 배송 예정일이 지났고 운송장도 조회되지 않아 현재 출고 상태를 확인하고 싶습니다.";

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const assert = (value, message) => {
  if (!value) throw new Error(message);
};

const sha256Buffer = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256 = async (file) => sha256Buffer(await fs.readFile(file));

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status}): ${result.stderr || result.stdout || "no output"}`,
    );
  }
  return result;
};

const listFiles = async (root) => {
  const output = [];
  const visit = async (directory) => {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      if (entry.isFile()) output.push(absolute);
    }
  };
  await visit(root);
  return output.sort();
};

const digestDemoSource = async () => {
  const hash = crypto.createHash("sha256");
  for (const sourceRoot of [demoRoot, path.join(siteRoot, "demos/shared")]) {
    for (const file of await listFiles(sourceRoot)) {
      const relative = path.relative(siteRoot, file).split(path.sep).join("/");
      hash.update(relative);
      hash.update("\0");
      hash.update(await fs.readFile(file));
      hash.update("\0");
    }
  }
  for (const name of [
    "Pretendard-Regular.woff2",
    "Pretendard-SemiBold.woff2",
    "Pretendard-ExtraBold.woff2",
  ]) {
    const file = path.join(siteRoot, "assets/fonts", name);
    hash.update(path.relative(siteRoot, file).split(path.sep).join("/"));
    hash.update("\0");
    hash.update(await fs.readFile(file));
    hash.update("\0");
  }
  return hash.digest("hex");
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

const startStaticServer = async () => {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      let relative = decodeURIComponent(url.pathname);
      if (relative.endsWith("/")) relative += "index.html";
      const target = path.resolve(siteRoot, `.${relative}`);
      if (!target.startsWith(`${siteRoot}${path.sep}`)) throw new Error("forbidden");
      requests.push(relative);
      const body = await fs.readFile(target);
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": mimeTypes[path.extname(target)] || "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
    requests,
  };
};

const findFreePort = async () => {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  return port;
};

const findDisplay = async () => {
  for (let number = 151; number < 181; number += 1) {
    try {
      await fs.access(`/tmp/.X11-unix/X${number}`);
    } catch {
      return `:${number}`;
    }
  }
  throw new Error("No free X11 display found");
};

const stopProcess = async (child, signal = "SIGTERM") => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill(signal);
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(5000),
  ]);
  if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
};

const waitForUrl = async (url, attempts = 100) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // The local process is still starting.
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const connectCdp = async (port, allowedBaseUrl) => {
  let page;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) break;
    } catch {
      // Chrome is still starting.
    }
    await sleep(150);
  }
  if (!page) throw new Error("Chrome CDP page target did not appear");

  const socket = new WebSocket(page.webSocketDebuggerUrl);
  const pending = new Map();
  const runtimeErrors = [];
  const externalRequests = [];
  let serial = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") {
      runtimeErrors.push(
        message.params.exceptionDetails?.exception?.description
          || message.params.exceptionDetails?.text
          || "runtime exception",
      );
    }
    if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") {
      runtimeErrors.push(message.params.entry.text);
    }
    if (message.method === "Network.requestWillBeSent") {
      const requestUrl = message.params.request?.url || "";
      if (
        !requestUrl.startsWith(allowedBaseUrl)
        && !/^(?:about:|blob:|data:)/.test(requestUrl)
      ) {
        externalRequests.push(requestUrl);
      }
    }
    if (!message.id || !pending.has(message.id)) return;
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 30000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      awaitPromise: true,
      expression,
      returnByValue: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description || result.exceptionDetails.text,
      );
    }
    return result.result.value;
  };

  return {
    close: () => socket.close(),
    evaluate,
    externalRequests,
    runtimeErrors,
    send,
  };
};

const waitForSelector = async (cdp, selector) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await cdp.evaluate(
      `document.readyState === "complete" && Boolean(document.querySelector(${JSON.stringify(selector)}))`,
    );
    if (ready) return;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${selector}`);
};

const installRecordingOverlay = async (cdp) => {
  await cdp.send("Page.setBypassCSP", { enabled: true });
  await cdp.evaluate(`
(() => {
  document.getElementById("pf01VideoStatus")?.remove();
  document.getElementById("pf01VideoCursor")?.remove();
  document.getElementById("pf01VideoStyle")?.remove();
  const style = document.createElement("style");
  style.id = "pf01VideoStyle";
  style.textContent = \`
    #pf01VideoStatus {
      position: fixed;
      z-index: 100000;
      top: 112px;
      right: 18px;
      width: min(390px, calc(100vw - 36px));
      padding: 12px 14px;
      border: 1px solid rgba(255,255,255,.25);
      border-radius: 7px;
      background: rgba(23,63,48,.96);
      box-shadow: 0 14px 34px rgba(23,63,48,.2);
      color: #fff;
      font: 800 15px/1.45 Pretendard, system-ui, sans-serif;
      letter-spacing: 0;
      pointer-events: none;
    }
    #pf01VideoStatus small {
      display: block;
      margin-top: 4px;
      color: #fff2c9;
      font: 700 11px/1.35 ui-monospace, monospace;
    }
    #pf01VideoCursor {
      position: fixed;
      z-index: 100001;
      width: 24px;
      height: 24px;
      margin: -12px 0 0 -12px;
      border: 3px solid #fff;
      border-radius: 50%;
      background: #b97800;
      box-shadow: 0 0 0 5px rgba(185,120,0,.28);
      transition: left .42s ease, top .42s ease, transform .14s ease;
      pointer-events: none;
    }
    .pf01VideoFocus {
      outline: 4px solid #b97800 !important;
      outline-offset: 4px !important;
    }
  \`;
  document.head.append(style);
  const status = document.createElement("div");
  status.id = "pf01VideoStatus";
  status.innerHTML = ${JSON.stringify(`공개 체험판과 실제 연동 근거를 구분합니다.<small>DEMO_BUILD: ${CONFIG.demoBuildId}<br>SOURCE_RUN: ${CONFIG.sourceRunId} (별도 실행 근거)</small>`)};
  document.body.append(status);
  const cursor = document.createElement("div");
  cursor.id = "pf01VideoCursor";
  cursor.style.left = "300px";
  cursor.style.top = "220px";
  document.body.append(cursor);
  return true;
})()
`);
};

const setOverlayStatus = (cdp, text) => {
  const markup = `${text}<small>DEMO_BUILD: ${CONFIG.demoBuildId}<br>SOURCE_RUN: ${CONFIG.sourceRunId} (별도 실행 근거)</small>`;
  return cdp.evaluate(`
(() => {
  const node = document.getElementById("pf01VideoStatus");
  node.innerHTML = ${JSON.stringify(markup)};
  return true;
})()
`);
};

const focusElement = async (cdp, selector, label, delay = 1600) => {
  const found = await cdp.evaluate(`
(async () => {
  const target = document.querySelector(${JSON.stringify(selector)});
  if (!target) return false;
  target.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  await new Promise((resolve) => setTimeout(resolve, 420));
  document.querySelectorAll(".pf01VideoFocus").forEach((node) => node.classList.remove("pf01VideoFocus"));
  target.classList.add("pf01VideoFocus");
  const rect = target.getBoundingClientRect();
  const cursor = document.getElementById("pf01VideoCursor");
  cursor.style.left = Math.round(rect.left + Math.min(rect.width / 2, 310)) + "px";
  cursor.style.top = Math.round(rect.top + Math.min(rect.height / 2, 86)) + "px";
  return true;
})()
`);
  assert(found, `Missing recording selector: ${selector}`);
  if (label) await setOverlayStatus(cdp, label);
  await sleep(delay);
};

const clickElement = async (cdp, selector, label, delay = 2000) => {
  await focusElement(cdp, selector, label, 780);
  const clicked = await cdp.evaluate(`
(() => {
  const target = document.querySelector(${JSON.stringify(selector)});
  if (!target || target.disabled) return false;
  const cursor = document.getElementById("pf01VideoCursor");
  cursor.style.transform = "scale(.68)";
  target.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  target.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  target.click();
  setTimeout(() => { cursor.style.transform = "scale(1)"; }, 150);
  return true;
})()
`);
  assert(clicked, `Could not click recording selector: ${selector}`);
  await sleep(delay);
};

const setControlValue = async (cdp, selector, value, label, delay = 800) => {
  await focusElement(cdp, selector, label, 360);
  const changed = await cdp.evaluate(`
(() => {
  const target = document.querySelector(${JSON.stringify(selector)});
  if (!target) return false;
  target.focus();
  target.value = ${JSON.stringify(value)};
  target.dispatchEvent(new Event("input", { bubbles: true }));
  target.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
})()
`);
  assert(changed, `Could not set recording selector: ${selector}`);
  await sleep(delay);
};

const typeControlValue = async (cdp, selector, value, label) => {
  await focusElement(cdp, selector, label, 420);
  const typed = await cdp.evaluate(`
(async () => {
  const target = document.querySelector(${JSON.stringify(selector)});
  if (!target) return false;
  target.focus();
  target.value = "";
  target.dispatchEvent(new Event("input", { bubbles: true }));
  const value = ${JSON.stringify(value)};
  for (let index = 1; index <= value.length; index += 1) {
    target.value = value.slice(0, index);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 24));
  }
  return true;
})()
`);
  assert(typed, `Could not type into recording selector: ${selector}`);
  await sleep(1150);
};

const createTimeline = () => {
  const startedAt = Date.now();
  const lines = [];
  const markers = {};
  const elapsed = () => (Date.now() - startedAt) / 1000;
  const note = (message) => {
    const seconds = elapsed();
    lines.push(`${seconds.toFixed(2)}s ${message}`);
    return seconds;
  };
  const mark = (name, message) => {
    markers[name] = note(message);
  };
  return { lines, mark, markers, note };
};

const validateInitialBoundary = async (cdp) => {
  const audit = await cdp.evaluate(`({
    title: document.title,
    text: document.body.innerText,
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    bannerPosition: getComputedStyle(document.querySelector('[data-test="ai-boundary"]')).position,
    bannerTop: getComputedStyle(document.querySelector('[data-test="ai-boundary"]')).top,
    bannerFontSize: parseFloat(getComputedStyle(document.querySelector('[data-test="ai-boundary"]')).fontSize),
    composer: Boolean(document.querySelector('#customInquiryForm')),
    generator: Boolean(document.querySelector('[data-test="generate"]'))
  })`);
  assert(audit.title, "PF01 title missing");
  assert(audit.text.includes("규칙 기반 공개 데모"), "PF01 rule-based boundary missing");
  assert(audit.text.includes("외부 AI 연결 없이"), "PF01 no-external-AI boundary missing");
  assert(audit.text.includes("AI API·사내 API·온프레미스 모델"), "PF01 real integration boundary missing");
  assert(audit.text.includes("별도 사례 검증: 처리 15건 · 긴급 알림 4건 · AI 오류 0건"), "PF01 separate source evidence summary missing");
  assert(audit.bannerPosition === "sticky" && audit.bannerTop === "64px" && audit.bannerFontSize >= 13, `PF01 sticky boundary mismatch: ${JSON.stringify(audit)}`);
  assert(audit.composer && audit.generator, "PF01 interactive controls missing");
  assert(audit.width <= audit.viewport + 1, `PF01 horizontal overflow ${audit.width}/${audit.viewport}`);
  return audit;
};

const recordFlow = async (cdp, timeline, downloadDir) => {
  await setOverlayStatus(
    cdp,
    "1. 이 화면은 외부 AI가 아닌 브라우저 키워드 규칙으로 작동합니다.",
  );
  timeline.note("Rule-based public trial and build identifiers shown.");
  await sleep(3200);
  await focusElement(
    cdp,
    '[data-test="ai-boundary"]',
    "실제 제작은 승인된 AI API·사내 API·온프레미스 모델에 별도로 연동할 수 있습니다.",
    3000,
  );

  await clickElement(
    cdp,
    '[data-test="generate"]',
    "2. 개인정보 없는 새 합성 문의 5건을 브라우저에서 만듭니다.",
    2500,
  );
  const generated = await cdp.evaluate(`({
    batch: document.querySelector('[data-test="batch-id"]').textContent.trim(),
    source: document.querySelector('[data-test="batch-source"]').textContent.trim(),
    total: document.querySelector('[data-test="count-total"]').textContent.trim()
  })`);
  assert(generated.batch.includes("SYN-") && generated.source === "새로 생성한 합성 배치" && generated.total === "5", `PF01 synthetic batch mismatch: ${JSON.stringify(generated)}`);
  await focusElement(
    cdp,
    ".workspace-heading",
    "새 배치는 실제 고객 데이터가 아닌 가상 문장으로만 구성됩니다.",
    2100,
  );

  await focusElement(
    cdp,
    "#customInquiryForm",
    "3. 비식별 문의 문장을 직접 작성해 즉시 분류합니다.",
    1350,
  );
  await setControlValue(cdp, "#customChannel", "웹 폼", "문의 채널을 선택합니다.", 650);
  await typeControlValue(cdp, "#customMessage", DIRECT_MESSAGE, "연락처나 비밀값 없는 문의 문장을 입력합니다.");
  await focusElement(cdp, "#customInquiryForm", "입력 내용은 외부 전송 없이 현재 브라우저 메모리에서만 처리됩니다.", 1200);
  timeline.mark("input", "Direct non-identifying inquiry is ready for classification.");
  await sleep(1300);

  await clickElement(cdp, "#customInquirySubmit", "4. 입력한 문의를 키워드 점수 규칙으로 즉시 분류합니다.", 2600);
  const result = await cdp.evaluate(`({
    id: document.querySelector('#selectedMeta').textContent.trim(),
    category: document.querySelector('#selectedCategory').textContent.trim(),
    priority: document.querySelector('#selectedPriority').textContent.trim(),
    team: document.querySelector('#selectedTeam').textContent.trim(),
    reason: document.querySelector('#selectedReason').textContent.trim(),
    summary: document.querySelector('#selectedSummary').textContent.trim(),
    draft: document.querySelector('#draftEditor').value.trim(),
    total: document.querySelector('[data-test="count-total"]').textContent.trim(),
    source: document.querySelector('[data-test="batch-source"]').textContent.trim(),
    rows: document.querySelectorAll('#resultRows tr').length,
    tableState: document.querySelector('[data-test="result-state"]').textContent.trim()
  })`);
  assert(result.id.includes("CUSTOM-001"), `PF01 custom result ID mismatch: ${JSON.stringify(result)}`);
  assert(result.category === "배송 조회" && result.priority === "긴급" && result.team === "물류 운영팀", `PF01 custom classification mismatch: ${JSON.stringify(result)}`);
  assert(result.reason.includes("키워드 점수") && result.summary.includes("물류 운영팀") && result.draft.length > 20, `PF01 classification detail missing: ${JSON.stringify(result)}`);
  assert(result.total === "6" && result.source.includes("새로 생성한 합성 배치 + 직접 1건") && result.rows === 6 && result.tableState === "6건 준비", `PF01 result table mismatch: ${JSON.stringify(result)}`);

  await focusElement(cdp, ".metric-grid", "분류 결과: 체험 문의 6건 · 긴급 문의와 답변 초안을 즉시 확인합니다.", 2200);
  await focusElement(cdp, ".classification-grid", "유형 · 우선순위 · 담당 팀이 한 번에 정리됩니다.", 2600);
  timeline.mark("result", "Custom inquiry category, priority, and team are visible.");
  await sleep(1400);
  await focusElement(cdp, "#selectedReason", "분류 근거에는 일치한 키워드 점수가 표시됩니다.", 2300);
  await focusElement(cdp, "#selectedSummary", "한 줄 요약으로 담당자가 빠르게 내용을 파악합니다.", 2100);
  await focusElement(cdp, ".draft-field", "답변 초안은 담당자 검수 후 수정해 사용할 수 있습니다.", 2700);

  await focusElement(cdp, ".export-panel", "5. 비식별 분류 결과 6건을 표로 검토합니다.", 2500);
  await clickElement(cdp, "#exportButton", "검토한 결과를 CSV로 브라우저에서 생성합니다.", 2000);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const files = await fs.readdir(downloadDir);
    if (files.includes("pf01-trial-classification.csv") && !files.some((file) => file.endsWith(".crdownload"))) break;
    if (attempt === 49) throw new Error("PF01 CSV download did not finish");
    await sleep(100);
  }
  const csvPath = path.join(downloadDir, "pf01-trial-classification.csv");
  const csvText = await fs.readFile(csvPath, "utf8");
  assert(csvText.includes("CUSTOM-001") && csvText.includes(DIRECT_MESSAGE), "PF01 downloaded CSV lacks the direct inquiry");
  assert(csvText.trim().split(/\r?\n/).length === 7, "PF01 downloaded CSV row count mismatch");

  await cdp.evaluate("window.scrollTo({ top: 0, behavior: 'instant' })");
  await sleep(500);
  await focusElement(
    cdp,
    '[data-test="ai-boundary"]',
    "6. 실제 AI · Google Sheets · Slack 결과는 SOURCE_RUN의 별도 실행 근거이며 이 공개 체험에서 실행했다고 주장하지 않습니다.",
    3600,
  );
  timeline.mark("proof", "Separate AI, Google Sheets, and Slack source evidence boundary shown.");
  await sleep(1500);
  await setOverlayStatus(
    cdp,
    "체험 완료 · 공개 화면은 규칙 기반, 실제 연동 증거는 별도 SOURCE_RUN입니다.",
  );
  await sleep(3200);

  return { csvPath, csvText, result };
};

const probeVideo = (file) => {
  const result = run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-count_frames",
    "-show_entries", "stream=codec_name,pix_fmt,width,height,avg_frame_rate,nb_read_frames:format=duration,size",
    "-of", "json",
    file,
  ]);
  const parsed = JSON.parse(result.stdout);
  const stream = parsed.streams?.[0];
  const format = parsed.format;
  assert(stream && format, "Video stream metadata is missing");
  const audio = JSON.parse(run("ffprobe", [
    "-v", "error",
    "-select_streams", "a",
    "-show_entries", "stream=index",
    "-of", "json",
    file,
  ]).stdout);
  return {
    codec: stream.codec_name,
    pixelFormat: stream.pix_fmt,
    width: Number(stream.width),
    height: Number(stream.height),
    averageFrameRate: stream.avg_frame_rate,
    durationSeconds: Number(format.duration),
    frameCount: Number(stream.nb_read_frames),
    sizeBytes: Number(format.size),
    audioStreamCount: audio.streams?.length || 0,
  };
};

const fullDecode = (file) => {
  const result = run("ffmpeg", [
    "-v", "error",
    "-i", file,
    "-map", "0:v:0",
    "-f", "null",
    "-",
    "-progress", "pipe:1",
    "-nostats",
  ]);
  const matches = [...result.stdout.matchAll(/^frame=(\d+)$/gm)];
  return Number(matches.at(-1)?.[1] || 0);
};

const analyzeFrames = (file) => {
  const black = run("ffmpeg", [
    "-hide_banner",
    "-i", file,
    "-vf", "blackdetect=d=0.4:pix_th=0.02",
    "-an",
    "-f", "null",
    "-",
  ]);
  const blackText = `${black.stdout}\n${black.stderr}`;
  const blackSegments = [...blackText.matchAll(/black_start:([0-9.]+).*?black_end:([0-9.]+)/g)].map((match) => ({
    start: Number(match[1]),
    end: Number(match[2]),
  }));
  const signal = run("ffmpeg", [
    "-hide_banner",
    "-i", file,
    "-vf", "fps=1,signalstats,metadata=print",
    "-an",
    "-f", "null",
    "-",
  ]);
  const signalText = `${signal.stdout}\n${signal.stderr}`;
  const luma = [...signalText.matchAll(/lavfi\.signalstats\.YAVG=([0-9.]+)/g)].map((match) => Number(match[1]));
  assert(luma.length > 0, "No luma samples were produced");
  return {
    blackSegments,
    blankSamples: luma.filter((value) => value <= 2 || value >= 253).length,
    lumaMaximum: Math.max(...luma),
    lumaMinimum: Math.min(...luma),
    sampledFrames: luma.length,
  };
};

const extractFrames = async (file, markers) => {
  const output = [];
  for (const [relative, marker] of CONFIG.frames) {
    const seconds = Math.max(1, Number(markers[marker] || 1) + 1);
    const target = path.join(productDir, relative);
    run("ffmpeg", [
      "-v", "error",
      "-y",
      "-ss", seconds.toFixed(3),
      "-i", file,
      "-frames:v", "1",
      target,
    ]);
    const dimensions = run("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x",
      target,
    ]).stdout.trim();
    assert(dimensions === `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`, `Invalid frame dimensions for ${relative}: ${dimensions}`);
    output.push({
      file: relative,
      sha256: await sha256(target),
      timestampSeconds: Number(seconds.toFixed(3)),
    });
  }
  return output;
};

const scanSensitiveText = (entries) => {
  const patterns = [
    ["local absolute path", /(?:^|[\s"'(])\/(?:home|Users|mnt|media|private|var\/folders)\/[^\s"')]+/i],
    ["secret assignment", /(?:api[_ -]?key|auth[_ -]?token|access[_ -]?token|password|secret|webhook(?:[_ -]?url)?)\s*[:=]\s*[^\s<]{6,}/i],
    ["provider token", /\b(?:sk|xox[baprs]|ghp)_[A-Za-z0-9_-]{12,}\b/i],
    ["webhook URL", /https?:\/\/[^\s]*(?:hooks|webhook)[^\s]*/i],
    ["email address", /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/i],
    ["Korean mobile number", /01[016789][ -]?\d{3,4}[ -]?\d{4}/],
  ];
  const matches = [];
  for (const entry of entries) {
    for (const [name, pattern] of patterns) {
      const match = entry.text.match(pattern);
      if (match) matches.push({ source: entry.source, pattern: name, match: match[0] });
    }
  }
  return {
    status: matches.length ? "FAIL" : "PASS",
    scannedSources: entries.map((entry) => entry.source),
    matches,
    aggregateTextSha256: sha256Buffer(entries.map((entry) => `${entry.source}\0${entry.text}`).join("\0")),
  };
};

const approveFrames = async () => {
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  assert(report.project === CONFIG.code, "PF01 report project mismatch");
  assert(report.demoBuildId === CONFIG.demoBuildId, "PF01 report DEMO_BUILD mismatch");
  assert(report.sourceRunId === CONFIG.sourceRunId, "PF01 report SOURCE_RUN mismatch");
  assert(report.currentVideoSha256 === await sha256(videoPath), "PF01 video hash mismatch");
  assert(report.demoSourceSha256 === await digestDemoSource(), "PF01 demo source aggregate mismatch");
  const metadata = probeVideo(videoPath);
  const decodedFrameCount = fullDecode(videoPath);
  const analysis = analyzeFrames(videoPath);
  assert(metadata.codec === "h264" && metadata.pixelFormat === "yuv420p", "PF01 video encoding mismatch");
  assert(metadata.width === VIDEO_WIDTH && metadata.height === VIDEO_HEIGHT, "PF01 video dimensions mismatch");
  assert(metadata.averageFrameRate === `${FRAME_RATE}/1`, "PF01 video frame rate mismatch");
  assert(metadata.durationSeconds >= MIN_DURATION && metadata.durationSeconds <= MAX_DURATION, "PF01 video duration mismatch");
  assert(metadata.audioStreamCount === 0, "PF01 video must be silent");
  assert(metadata.frameCount === decodedFrameCount, "PF01 decoded frame count mismatch");
  assert(analysis.blackSegments.length === 0 && analysis.blankSamples === 0, "PF01 black or blank frame detected");
  for (const frame of report.representativeFrames || []) {
    const file = path.join(productDir, frame.file);
    assert(await sha256(file) === frame.sha256, `PF01 frame hash mismatch: ${frame.file}`);
  }
  report.ffprobe = { ...metadata, decodedFrameCount };
  report.frameAnalysis = analysis;
  report.validation.representativeFrameReview = "PASS";
  report.validation.representativeFrameReviewedAt = new Date().toISOString();
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log("PF01_REPRESENTATIVE_FRAME_REVIEW_APPROVED");
};

const record = async () => {
  await fs.access(path.join(demoRoot, "index.html"));
  await fs.access(path.join(productDir, "registration-demo-video-script.md"));
  await fs.mkdir(scratchRoot, { recursive: true });
  const workDir = await fs.mkdtemp(path.join(scratchRoot, "pf01-public-video-"));
  const profileDir = path.join(workDir, "chrome-profile");
  const downloadDir = path.join(workDir, "downloads");
  const temporaryVideo = path.join(workDir, "registration-demo-video.mp4");
  const display = await findDisplay();
  const debugPort = await findFreePort();
  const children = [];
  let ffmpeg;
  let cdp;
  let server;
  try {
    server = await startStaticServer();
    const xvfb = spawn("Xvfb", [
      display,
      "-screen", "0", `${VIDEO_WIDTH}x${VIDEO_HEIGHT}x24`,
      "-nolisten", "tcp",
    ], { stdio: ["ignore", "ignore", "ignore"] });
    children.push(xvfb);
    const displayNumber = display.slice(1);
    for (let attempt = 0; attempt < 80; attempt += 1) {
      try {
        await fs.access(`/tmp/.X11-unix/X${displayNumber}`);
        break;
      } catch {
        if (attempt === 79) throw new Error("Xvfb startup timeout");
        await sleep(100);
      }
    }
    const env = { ...process.env, DISPLAY: display };
    const windowManager = spawn("metacity", ["--sm-disable"], {
      env,
      stdio: ["ignore", "ignore", "ignore"],
    });
    children.push(windowManager);
    await sleep(700);
    await fs.mkdir(profileDir, { recursive: true });
    await fs.mkdir(downloadDir, { recursive: true });
    const demoUrl = `${server.baseUrl}${demoPath}`;
    await waitForUrl(demoUrl);
    const chrome = spawn("google-chrome", [
      "--no-sandbox",
      "--test-type",
      "--disable-translate",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-features=Translate,TranslateUI",
      "--disable-session-crashed-bubble",
      "--no-first-run",
      "--disable-default-apps",
      "--disable-infobars",
      "--force-device-scale-factor=1",
      "--window-position=0,0",
      `--window-size=${VIDEO_WIDTH},${VIDEO_HEIGHT}`,
      `--user-data-dir=${profileDir}`,
      `--remote-debugging-port=${debugPort}`,
      `--app=${demoUrl}`,
    ], { env, stdio: ["ignore", "ignore", "ignore"] });
    children.push(chrome);
    await waitForUrl(`http://127.0.0.1:${debugPort}/json/version`);
    cdp = await connectCdp(debugPort, server.baseUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await cdp.send("Network.enable");
    await cdp.send("Page.setBypassCSP", { enabled: true });
    await cdp.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
    });
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitForSelector(cdp, CONFIG.readySelector);
    await cdp.evaluate("document.fonts?.ready || Promise.resolve()");
    const initialAudit = await validateInitialBoundary(cdp);
    await installRecordingOverlay(cdp);
    const overlayIdentity = await cdp.evaluate("document.getElementById('pf01VideoStatus').innerText");
    assert(overlayIdentity.includes(CONFIG.demoBuildId) && overlayIdentity.includes(CONFIG.sourceRunId), "PF01 recording identity overlay missing");
    await sleep(800);

    ffmpeg = spawn("ffmpeg", [
      "-y",
      "-f", "x11grab",
      "-draw_mouse", "1",
      "-framerate", String(FRAME_RATE),
      "-video_size", `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`,
      "-i", `${display}.0`,
      "-an",
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "20",
      "-pix_fmt", "yuv420p",
      "-movflags", "+faststart",
      temporaryVideo,
    ], { env, stdio: ["ignore", "ignore", "pipe"] });
    let ffmpegError = "";
    ffmpeg.stderr.on("data", (chunk) => {
      ffmpegError += chunk.toString();
    });
    await sleep(900);
    const timeline = createTimeline();
    const flow = await recordFlow(cdp, timeline, downloadDir);
    await sleep(500);
    await stopProcess(ffmpeg, "SIGINT");
    ffmpeg = undefined;
    try {
      await fs.access(temporaryVideo);
    } catch {
      throw new Error(`ffmpeg did not produce a recording: ${ffmpegError}`);
    }

    assert(cdp.runtimeErrors.length === 0, `PF01 browser runtime errors: ${cdp.runtimeErrors.join(" | ")}`);
    assert(cdp.externalRequests.length === 0, `PF01 external requests detected: ${cdp.externalRequests.join(" | ")}`);
    const metadata = probeVideo(temporaryVideo);
    const decodedFrameCount = fullDecode(temporaryVideo);
    const frameAnalysis = analyzeFrames(temporaryVideo);
    assert(metadata.codec === "h264", "PF01 expected H.264");
    assert(metadata.pixelFormat === "yuv420p", "PF01 expected yuv420p");
    assert(metadata.width === VIDEO_WIDTH && metadata.height === VIDEO_HEIGHT, "PF01 expected 1440x1000");
    assert(metadata.averageFrameRate === `${FRAME_RATE}/1`, `PF01 expected ${FRAME_RATE}fps`);
    assert(metadata.durationSeconds >= MIN_DURATION && metadata.durationSeconds <= MAX_DURATION, `PF01 duration ${metadata.durationSeconds}s is outside ${MIN_DURATION}-${MAX_DURATION}s`);
    assert(metadata.audioStreamCount === 0, "PF01 video has an unexpected audio stream");
    assert(metadata.frameCount === decodedFrameCount, `PF01 frame count mismatch ${metadata.frameCount}/${decodedFrameCount}`);
    assert(frameAnalysis.blackSegments.length === 0, "PF01 black segment detected");
    assert(frameAnalysis.blankSamples === 0, "PF01 blank frame detected");

    const finalText = await cdp.evaluate("document.body.innerText");
    const overlayText = await cdp.evaluate("document.getElementById('pf01VideoStatus').innerText");
    const sourceFiles = await listFiles(demoRoot);
    const sourceText = (await Promise.all(sourceFiles
      .filter((file) => /\.(?:html|css|js)$/.test(file))
      .map((file) => fs.readFile(file, "utf8"))))
      .join("\n");
    const formatTags = run("ffprobe", [
      "-v", "error",
      "-show_entries", "format_tags",
      "-of", "json",
      temporaryVideo,
    ]).stdout;
    const privacyScan = scanSensitiveText([
      { source: "initial rendered DOM", text: initialAudit.text },
      { source: "final rendered DOM", text: finalText },
      { source: "recording overlay", text: overlayText },
      { source: "timeline copy", text: timeline.lines.join("\n") },
      { source: "downloaded CSV", text: flow.csvText },
      { source: "PF01 demo source", text: sourceText },
      { source: "video format tags", text: formatTags },
    ]);
    assert(privacyScan.status === "PASS", `PF01 privacy scan failed: ${JSON.stringify(privacyScan.matches)}`);

    await fs.copyFile(temporaryVideo, videoPath);
    const representativeFrames = await extractFrames(videoPath, timeline.markers);
    const report = {
      project: CONFIG.code,
      runId: CONFIG.sourceRunId,
      demoBuildId: CONFIG.demoBuildId,
      sourceRunId: CONFIG.sourceRunId,
      recordedAt: new Date().toISOString(),
      recordingSource: "current PF01 public static trial UI browser walkthrough",
      sourceProofNote: "The public trial uses browser-local keyword rules. It does not execute or claim to execute AI, Google Sheets, or Slack; SOURCE_RUN identifies separate sanitized package evidence for those integrations.",
      demoSourceSha256: await digestDemoSource(),
      currentVideoSha256: await sha256(videoPath),
      ffprobe: { ...metadata, decodedFrameCount },
      frameAnalysis,
      representativeFrames,
      interactionAudit: {
        syntheticBatch: "PASS",
        directInquiry: "PASS",
        immediateClassification: "PASS",
        category: flow.result.category,
        priority: flow.result.priority,
        team: flow.result.team,
        classificationReason: "PASS",
        summary: "PASS",
        draftReply: "PASS",
        resultTableRows: flow.result.rows,
        csvDownload: "PASS",
        csvSha256: await sha256(flow.csvPath),
      },
      networkAudit: {
        externalRequestCount: cdp.externalRequests.length,
        externalRequests: cdp.externalRequests,
        localRequestCount: server.requests.length,
      },
      privacyScan,
      timeline: timeline.lines,
      validation: {
        fullDecode: "PASS",
        frameCountConsistency: "PASS",
        encoding: "PASS",
        silentAudio: "PASS",
        durationRange: "PASS",
        runIdLinkage: "PASS",
        demoBuildLinkage: "PASS",
        ruleBasedDisclosure: "PASS",
        sourceProofSeparation: "PASS",
        noExternalRequests: "PASS",
        noBlackSegments: "PASS",
        secretLocalPathScan: "PASS",
        representativeFrameReview: "PENDING_VISUAL_REVIEW",
      },
    };
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log("PF01_PUBLIC_TRIAL_VIDEO_RECORDED");
    console.log(`VIDEO=${videoPath}`);
    console.log(`REPORT=${reportPath}`);
    for (const frame of representativeFrames) {
      console.log(`FRAME=${path.join(productDir, frame.file)}`);
    }
  } finally {
    cdp?.close();
    if (ffmpeg) await stopProcess(ffmpeg, "SIGINT");
    for (const child of children.reverse()) await stopProcess(child);
    await server?.close();
    await fs.rm(workDir, { recursive: true, force: true });
  }
};

const args = process.argv.slice(2);
if (args.length === 0) await record();
else if (args.length === 1 && args[0] === "--approve") await approveFrames();
else {
  console.error("Usage: node scripts/record-pf01-public-demo-video.mjs [--approve]");
  process.exit(2);
}
