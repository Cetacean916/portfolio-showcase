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
const demoRoot = path.join(siteRoot, "demos/pf02");
const productDir = path.join(
  portfolioRoot,
  "유형별 포트폴리오/02-구글폼-웹훅-시트-알림-자동화",
);
const scratchRoot = path.join(process.env.HOME || os.homedir(), "tmp");
const finalVideo = path.join(productDir, "registration-demo-video.mp4");
const videoScript = path.join(productDir, "registration-demo-video-script.md");
const reportFile = path.join(productDir, "evidence/registration-video-validation-report.json");
const sourceEvidenceFile = path.join(productDir, "evidence/live-apps-script-sheet-slack-evidence.json");

const DEMO_BUILD_ID = "PF02_PUBLIC_TRIAL_20260711_01";
const SOURCE_RUN_ID = "PF02_CONFIGURABLE_LIVE_20260628_1816";
const FRAME_RATE = 15;
const VIDEO_WIDTH = 1440;
const VIDEO_HEIGHT = 1000;
const MIN_DURATION_SECONDS = 45;
const MAX_DURATION_SECONDS = 65;
const frames = [
  ["screenshots/15-registration-trial-input.png", "input"],
  ["screenshots/16-registration-trial-result.png", "result"],
  ["screenshots/17-registration-trial-proof.png", "proof"],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value, message) => {
  if (!value) throw new Error(message);
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status}): ${result.stderr || result.stdout || "no output"}`,
    );
  }
  return result;
};

const sha256Buffer = (value) => crypto.createHash("sha256").update(value).digest("hex");
const sha256 = async (file) => sha256Buffer(await fs.readFile(file));

const listFiles = async (root) => {
  const output = [];
  const visit = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      if (entry.isFile()) output.push(absolute);
    }
  };
  await visit(root);
  return output.sort();
};

const digestDemoSource = async () => {
  const hash = crypto.createHash("sha256");
  const files = [];
  for (const sourceRoot of [demoRoot, path.join(siteRoot, "demos/shared")]) {
    for (const file of await listFiles(sourceRoot)) {
      files.push(file);
    }
  }
  for (const name of [
    "Pretendard-Regular.woff2",
    "Pretendard-SemiBold.woff2",
    "Pretendard-ExtraBold.woff2",
  ]) {
    files.push(path.join(siteRoot, "assets/fonts", name));
  }
  const relativeFiles = [];
  for (const file of files) {
    const relative = path.relative(siteRoot, file).split(path.sep).join("/");
    relativeFiles.push(relative);
    hash.update(relative);
    hash.update("\0");
    hash.update(await fs.readFile(file));
    hash.update("\0");
  }
  return { sha256: hash.digest("hex"), files: relativeFiles };
};

const validateSourceEvidence = async () => {
  const evidence = JSON.parse(await fs.readFile(sourceEvidenceFile, "utf8"));
  assert(evidence.run_id === SOURCE_RUN_ID, `SOURCE_RUN mismatch: ${evidence.run_id}`);
  assert(
    evidence.evidence_class === "historical_pre_auth_hardening",
    `Unexpected PF02 evidence class: ${evidence.evidence_class}`,
  );
  assert(evidence.current_hardened_deployment_validated === false, "Historical evidence boundary changed");
  assert(evidence.apps_script_response?.status_code === 200, "Historical Apps Script response is not 200");
  assert(evidence.apps_script_response?.body?.run_id === SOURCE_RUN_ID, "Apps Script RUN_ID mismatch");
  assert(evidence.sheet_row?.run_id === SOURCE_RUN_ID, "Sheet row RUN_ID mismatch");
  return {
    file: "evidence/live-apps-script-sheet-slack-evidence.json",
    sha256: await sha256(sourceEvidenceFile),
    evidenceClass: evidence.evidence_class,
    currentHardenedDeploymentValidated: evidence.current_hardened_deployment_validated,
    appsScriptStatusCode: evidence.apps_script_response.status_code,
  };
};

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const startStaticServer = async () => {
  const requests = [];
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
      requests.push({ method: request.method || "GET", path: url.pathname });
      let relative = decodeURIComponent(url.pathname);
      if (relative.endsWith("/")) relative += "index.html";
      const target = path.resolve(siteRoot, `.${relative}`);
      if (!target.startsWith(`${siteRoot}${path.sep}`)) throw new Error("forbidden");
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
    requests,
    close: () => new Promise((resolve) => server.close(resolve)),
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
  if (!child || child.exitCode !== null) return;
  child.kill(signal);
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    sleep(5000),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
};

const waitForUrl = async (url, attempts = 120) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The local process is still starting.
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const connectCdp = async (port) => {
  let page;
  for (let attempt = 0; attempt < 120; attempt += 1) {
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
  const networkRequests = [];
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
      networkRequests.push(message.params.request?.url || "");
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
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result.value;
  };
  return {
    close: () => socket.close(),
    evaluate,
    networkRequests,
    runtimeErrors,
    send,
  };
};

const waitForSelector = async (cdp, selector) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const ready = await cdp.evaluate(
      `document.readyState === "complete" && Boolean(document.querySelector(${JSON.stringify(selector)}))`,
    );
    if (ready) return;
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${selector}`);
};

const waitForExpression = async (cdp, expression, description) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await cdp.evaluate(expression)) return;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${description}`);
};

const installRecordingOverlay = async (cdp) => {
  await cdp.send("Page.setBypassCSP", { enabled: true });
  await cdp.evaluate(`
(() => {
  document.getElementById("pf02VideoGuide")?.remove();
  document.getElementById("pf02VideoCursor")?.remove();
  document.getElementById("pf02VideoStyle")?.remove();
  const style = document.createElement("style");
  style.id = "pf02VideoStyle";
  style.textContent = \`
    #pf02VideoGuide {
      position: fixed;
      z-index: 100000;
      top: 112px;
      right: 18px;
      width: min(455px, calc(100vw - 36px));
      padding: 14px 16px;
      border: 1px solid rgba(255,255,255,.28);
      border-radius: 7px;
      background: rgba(18,35,54,.96);
      box-shadow: 0 16px 38px rgba(15,23,42,.24);
      color: #fff;
      font: 800 17px/1.42 Pretendard, system-ui, sans-serif;
      letter-spacing: 0;
      pointer-events: none;
    }
    #pf02VideoGuide span {
      display: block;
      margin-top: 5px;
      color: #d7e8f8;
      font: 600 12px/1.4 Pretendard, system-ui, sans-serif;
    }
    #pf02VideoGuide small {
      display: block;
      margin-top: 7px;
      padding-top: 7px;
      border-top: 1px solid rgba(255,255,255,.18);
      color: #f7d991;
      font: 700 10px/1.4 ui-monospace, monospace;
      overflow-wrap: anywhere;
    }
    #pf02VideoCursor {
      position: fixed;
      z-index: 100001;
      width: 26px;
      height: 26px;
      margin: -13px 0 0 -13px;
      border: 4px solid #fff;
      border-radius: 50%;
      background: #315f91;
      box-shadow: 0 0 0 5px rgba(49,95,145,.32);
      transition: left .42s ease, top .42s ease, transform .14s ease;
      pointer-events: none;
    }
    .pf02VideoFocus {
      outline: 4px solid #e2a720 !important;
      outline-offset: 4px !important;
    }
  \`;
  document.head.append(style);
  const guide = document.createElement("div");
  guide.id = "pf02VideoGuide";
  document.body.append(guide);
  const cursor = document.createElement("div");
  cursor.id = "pf02VideoCursor";
  cursor.style.left = "340px";
  cursor.style.top = "220px";
  document.body.append(cursor);
  return true;
})()
`);
  await setOverlayStatus(
    cdp,
    "1/9 공개 체험의 범위를 먼저 확인합니다.",
    "모든 처리와 저장은 현재 브라우저 메모리 안에서만 이뤄집니다.",
  );
};

const setOverlayStatus = (cdp, title, detail) => {
  const markup = `${title}<span>${detail}</span><small>DEMO_BUILD: ${DEMO_BUILD_ID}<br>SOURCE_RUN: ${SOURCE_RUN_ID} (별도 역사 근거)</small>`;
  return cdp.evaluate(`
(() => {
  const node = document.getElementById("pf02VideoGuide");
  if (!node) return false;
  node.innerHTML = ${JSON.stringify(markup)};
  return true;
})()
`);
};

const focusElement = async (cdp, selector, title, detail, delay = 1600) => {
  const found = await cdp.evaluate(`
(async () => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element) return false;
  element.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  await new Promise((resolve) => setTimeout(resolve, 380));
  document.querySelectorAll(".pf02VideoFocus").forEach((node) => node.classList.remove("pf02VideoFocus"));
  element.classList.add("pf02VideoFocus");
  const rect = element.getBoundingClientRect();
  const cursor = document.getElementById("pf02VideoCursor");
  cursor.style.left = Math.round(rect.left + Math.min(rect.width * .7, rect.width - 24)) + "px";
  cursor.style.top = Math.round(rect.top + Math.min(rect.height / 2, 88)) + "px";
  return true;
})()
`);
  assert(found, `Missing recording selector: ${selector}`);
  await setOverlayStatus(cdp, title, detail);
  await sleep(delay);
};

const clickElement = async (cdp, selector, title, detail, delay = 1500) => {
  await focusElement(cdp, selector, title, detail, 650);
  const clicked = await cdp.evaluate(`
(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element || element.disabled) return false;
  const cursor = document.getElementById("pf02VideoCursor");
  cursor.style.transform = "scale(.68)";
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  element.click();
  setTimeout(() => { cursor.style.transform = "scale(1)"; }, 150);
  return true;
})()
`);
  assert(clicked, `Could not click recording selector: ${selector}`);
  await sleep(delay);
};

const setScenario = async (cdp, value, title, detail) => {
  await focusElement(cdp, "#presetSelect", title, detail, 400);
  const changed = await cdp.evaluate(`
(() => {
  const select = document.querySelector("#presetSelect");
  select.value = ${JSON.stringify(value)};
  select.dispatchEvent(new Event("change", { bubbles: true }));
  return select.value === ${JSON.stringify(value)};
})()
`);
  assert(changed, `Could not select scenario: ${value}`);
  await sleep(650);
};

const createTimeline = () => {
  const startedAt = Date.now();
  const events = [];
  const markers = {};
  const elapsed = () => (Date.now() - startedAt) / 1000;
  const note = (message) => {
    const seconds = elapsed();
    events.push({ seconds: Number(seconds.toFixed(3)), message });
    return seconds;
  };
  const mark = (name, message) => {
    markers[name] = note(message);
  };
  return { events, mark, markers, note };
};

const assertResult = async (cdp, expected) => {
  await waitForExpression(
    cdp,
    `document.querySelector("#runButton")?.textContent.trim() === "요청 실행" && !document.querySelector("#runButton")?.disabled`,
    "PF02 request completion",
  );
  const result = await cdp.evaluate(`({
    ok: document.querySelector("#responseOk")?.textContent.trim(),
    status: document.querySelector("#responseStatus")?.textContent.trim(),
    runId: document.querySelector("#responseRunId")?.textContent.trim(),
    stored: document.querySelector("#metricStored")?.textContent.trim(),
    authorized: document.querySelector("#metricAuthorized")?.textContent.trim(),
    review: document.querySelector("#metricReview")?.textContent.trim(),
    failed: document.querySelector("#metricFailed")?.textContent.trim()
  })`);
  for (const [key, value] of Object.entries(expected)) {
    assert(result[key] === String(value), `PF02 result mismatch ${key}=${result[key]} expected=${value}`);
  }
  return result;
};

const recordFlow = async (cdp, timeline) => {
  await focusElement(
    cdp,
    ".boundary-note",
    "1/9 공개 체험은 외부 시스템으로 전송하지 않습니다.",
    "Google Sheets·Slack·Email·서버 대신 현재 브라우저 메모리에서만 재현합니다.",
    3000,
  );
  timeline.note("Displayed the public in-memory and no-external-request boundary.");

  await focusElement(
    cdp,
    "#requestForm",
    "2/9 정상 접수 샘플과 요청 인증 값을 확인합니다.",
    "이름·이메일·연락처는 비식별 예시이며 공유 비밀 입력은 화면에서 가려집니다.",
    2300,
  );
  timeline.mark("input", "Normal request input and masked authentication field are visible.");
  await sleep(900);

  await clickElement(
    cdp,
    "#runButton",
    "3/9 정상 접수 요청을 실행합니다.",
    "요청 인증 → 필드 검증 → 행 저장 → 외부 알림 재현 순서로 처리합니다.",
    1600,
  );
  await assertResult(cdp, { ok: true, status: "new", runId: "TRIAL-001", stored: 2, authorized: 1 });
  await focusElement(
    cdp,
    ".pipeline",
    "정상 접수 처리 단계가 모두 완료됐습니다.",
    "실제 전송이 아니라 Slack 또는 Email 결과 계약을 브라우저 안에서 재현한 것입니다.",
    2600,
  );
  timeline.mark("result", "Verified normal request, four processing stages, and TRIAL-001 response.");
  await focusElement(
    cdp,
    ".response-card",
    "4/9 응답과 RUN_ID를 확인합니다.",
    "TRIAL-001과 local simulation 표기가 같은 실행 결과를 연결합니다.",
    1800,
  );
  await focusElement(
    cdp,
    ".sheet-table",
    "저장 행은 연락처를 가린 Sheet 형태로 표시됩니다.",
    "브라우저를 새로고침하면 초기화되는 체험 데이터입니다.",
    1700,
  );
  await clickElement(
    cdp,
    "#exportButton",
    "5/9 현재 마스킹 행을 CSV로 만듭니다.",
    "다운로드 파일도 외부 서버를 거치지 않고 브라우저에서 생성됩니다.",
    1400,
  );
  timeline.note("Generated a masked browser-local CSV download.");

  await focusElement(
    cdp,
    '[data-test="browser-notification-panel"]',
    "6/9 사용자 동의형 로컬 기기 알림을 확인합니다.",
    "녹화 전용 브라우저 프로필에서 알림 권한을 허용했으며 외부 전송과는 별개입니다.",
    1400,
  );
  await clickElement(
    cdp,
    '[data-test="browser-notification"]',
    "허용된 브라우저에서 기기 알림 보내기를 누릅니다.",
    "비식별 처리 결과만 이 기기의 브라우저 알림으로 표시합니다.",
    2200,
  );
  const notification = await cdp.evaluate(`({
    permission: Notification.permission,
    status: document.querySelector('[data-test="browser-notification-status"]')?.textContent.trim(),
    boundary: document.querySelector("#browserNotificationBoundary")?.textContent.trim()
  })`);
  assert(notification.permission === "granted", `Notification permission is ${notification.permission}`);
  assert(/브라우저 알림으로 표시했습니다/.test(notification.status), `Notification result mismatch: ${notification.status}`);
  assert(/외부로 보내지 않습니다/.test(notification.boundary), "Notification external boundary missing");
  await focusElement(
    cdp,
    '[data-test="browser-notification-panel"]',
    "로컬 기기 알림 표시 결과를 확인했습니다.",
    "입력값을 수집하거나 Slack·Email로 전송하지 않았습니다.",
    2800,
  );
  timeline.mark("proof", "Displayed the granted local browser notification and no-external-send boundary.");

  await setScenario(
    cdp,
    "auth-failure",
    "7/9 요청 인증 실패 시나리오",
    "공유 비밀이 다르면 검증·저장·알림 전에 즉시 거부합니다.",
  );
  await clickElement(cdp, "#runButton", "인증 실패 요청을 실행합니다.", "후속 단계가 건너뛰어지는지 확인합니다.", 1300);
  await assertResult(cdp, { ok: false, status: "unauthorized", runId: "-", stored: 2, authorized: 1 });
  await focusElement(cdp, ".pipeline", "인증 거부: 저장 안 함 · 알림 건너뜀", "실패 요청은 행 수를 늘리지 않습니다.", 1800);
  timeline.note("Verified auth failure before validation, storage, and notification.");

  await setScenario(cdp, "missing-email", "8/9 이메일 누락 시나리오", "행은 보존하되 검토 필요 상태로 분리합니다.");
  await clickElement(cdp, "#runButton", "이메일 누락 요청을 실행합니다.", "validation 상태와 저장 행을 함께 남깁니다.", 1300);
  await assertResult(cdp, { ok: true, status: "missing_email", runId: "TRIAL-002", stored: 3, authorized: 2, review: 1 });
  await focusElement(cdp, ".pipeline", "이메일 누락: 검토 필요 · 1행 저장", "누락 결과를 숨기지 않고 후속 검토 대상으로 표시합니다.", 1800);

  await setScenario(cdp, "duplicate", "중복 후보 시나리오", "초기 샘플 행과 같은 이메일을 감지합니다.");
  await clickElement(cdp, "#runButton", "중복 후보 요청을 실행합니다.", "중복 후보 상태로 저장해 사람이 판단할 수 있게 합니다.", 1300);
  await assertResult(cdp, { ok: true, status: "duplicate_candidate", runId: "TRIAL-003", stored: 4, authorized: 3, review: 2 });
  await focusElement(cdp, ".sheet-table", "중복 후보가 새 저장 행으로 구분됐습니다.", "이메일은 공개 화면과 CSV에서 마스킹됩니다.", 1800);

  await setScenario(
    cdp,
    "notification-failure",
    "외부 알림 실패 시나리오",
    "알림 실패가 발생해도 접수 행은 보존합니다.",
  );
  await clickElement(cdp, "#runButton", "알림 실패 요청을 실행합니다.", "저장 성공과 알림 실패를 서로 다른 상태로 기록합니다.", 1300);
  await assertResult(cdp, {
    ok: true,
    status: "received_but_notification_failed",
    runId: "TRIAL-004",
    stored: 5,
    authorized: 4,
    review: 2,
    failed: 1,
  });
  await focusElement(
    cdp,
    ".pipeline",
    "알림 실패: 행 저장 성공 · 알림 실패 기록",
    "인증 실패·누락·중복·알림 실패 네 예외를 모두 확인했습니다.",
    2300,
  );
  timeline.note("Verified missing-email, duplicate-candidate, and notification-failure scenarios.");

  await focusElement(
    cdp,
    ".boundary-note",
    "9/9 공개 체험 완료",
    "실제 Google Sheets·Slack·Email 연동은 의뢰인의 승인된 계정과 보안 정책으로 별도 검증합니다.",
    4000,
  );
  timeline.note("Closed on the separation between the static trial and approved production integration.");
};

const probeVideo = (videoPath) => {
  const parsed = JSON.parse(run("ffprobe", [
    "-v", "error",
    "-count_frames",
    "-show_entries", "stream=index,codec_type,codec_name,pix_fmt,width,height,avg_frame_rate,nb_read_frames:format=duration,size",
    "-of", "json",
    videoPath,
  ]).stdout);
  const stream = parsed.streams?.find((item) => item.codec_type === "video");
  assert(stream && parsed.format, "Video stream metadata is missing");
  return {
    codec: stream.codec_name,
    pixelFormat: stream.pix_fmt,
    width: Number(stream.width),
    height: Number(stream.height),
    averageFrameRate: stream.avg_frame_rate,
    durationSeconds: Number(parsed.format.duration),
    frameCount: Number(stream.nb_read_frames),
    sizeBytes: Number(parsed.format.size),
    audioStreamCount: parsed.streams.filter((item) => item.codec_type === "audio").length,
  };
};

const fullDecode = (videoPath) => {
  const result = run("ffmpeg", [
    "-v", "error",
    "-i", videoPath,
    "-map", "0:v:0",
    "-f", "null",
    "-",
    "-progress", "pipe:1",
    "-nostats",
  ]);
  const matches = [...result.stdout.matchAll(/^frame=(\d+)$/gm)];
  return Number(matches.at(-1)?.[1] || 0);
};

const analyzeFrames = (videoPath) => {
  const black = run("ffmpeg", [
    "-hide_banner",
    "-i", videoPath,
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
    "-i", videoPath,
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

const extractFrames = async (videoPath, markers) => {
  const output = [];
  for (const [relative, marker] of frames) {
    const seconds = Math.max(1, Number(markers[marker] || 1) + 0.45);
    const target = path.join(productDir, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    run("ffmpeg", [
      "-v", "error",
      "-y",
      "-ss", seconds.toFixed(3),
      "-i", videoPath,
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
    assert(dimensions === `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`, `Invalid frame dimensions: ${relative}`);
    output.push({
      file: relative,
      sha256: await sha256(target),
      timestampSeconds: Number(seconds.toFixed(3)),
      dimensions,
    });
  }
  return output;
};

const sensitivePatterns = [
  { name: "home_path", regex: /\/(?:home|Users)\/[A-Za-z0-9._-]+\//g },
  { name: "windows_path", regex: /[A-Za-z]:\\(?:Users|Documents|Desktop)\\/g },
  { name: "file_url", regex: /file:\/\//gi },
  { name: "slack_webhook", regex: /https:\/\/hooks\.slack\.com\/services\//gi },
  { name: "apps_script_url", regex: /https:\/\/script\.google\.com\//gi },
  { name: "google_api_key", regex: /AIza[0-9A-Za-z_-]{20,}/g },
  { name: "slack_token", regex: /xox[baprs]-[0-9A-Za-z-]{10,}/g },
  { name: "private_key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const scanText = (text) => sensitivePatterns.flatMap(({ name, regex }) => {
  regex.lastIndex = 0;
  return [...text.matchAll(regex)].map(() => name);
});

const securityScan = async ({ cdp, server, videoPath }) => {
  const surface = await cdp.evaluate(`({
    visibleText: document.body.innerText,
    visibleLinks: [...document.querySelectorAll("a[href]")].map((node) => node.getAttribute("href")),
    passwordType: document.querySelector("#authToken")?.type,
    passwordRenderedValue: document.querySelector("#authToken")?.value ? "present-but-masked" : "empty",
    csp: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content || ""
  })`);
  const allowedPrefixes = [server.baseUrl, "data:", "blob:", "chrome:", "devtools:"];
  const externalRequests = cdp.networkRequests.filter(
    (url) => url && !allowedPrefixes.some((prefix) => url.startsWith(prefix)),
  );
  const visiblePayload = JSON.stringify(surface);
  const binaryStrings = run("strings", ["-a", videoPath]).stdout;
  const sourceText = (await Promise.all(
    (await listFiles(demoRoot))
      .filter((file) => [".html", ".js", ".css"].includes(path.extname(file)))
      .map((file) => fs.readFile(file, "utf8")),
  )).join("\n");
  const publicTrialCredentialOccurrences = (sourceText.match(/pf02-public-trial-key/g) || []).length;
  const visibleMatches = scanText(visiblePayload);
  const binaryMatches = scanText(binaryStrings);
  assert(surface.passwordType === "password", "Authentication value is not rendered as a password field");
  assert(surface.passwordRenderedValue === "present-but-masked", "Masked trial authentication value is missing");
  assert(surface.csp.includes("connect-src 'none'"), "PF02 CSP no-network boundary is missing");
  assert(externalRequests.length === 0, `External browser requests detected: ${externalRequests.join(", ")}`);
  assert(visibleMatches.length === 0, `Sensitive visible content detected: ${visibleMatches.join(", ")}`);
  assert(binaryMatches.length === 0, `Sensitive binary strings detected: ${binaryMatches.join(", ")}`);
  assert(publicTrialCredentialOccurrences >= 1, "Documented public-trial credential was not found in source");
  return {
    status: "PASS",
    scope: "visible DOM, browser request log, binary strings, and current PF02 demo source",
    localPathMatches: visibleMatches.filter((value) => value.includes("path") || value === "file_url"),
    secretPatternMatches: visibleMatches.filter((value) => !value.includes("path") && value !== "file_url"),
    binarySensitiveMatches: binaryMatches,
    browserRequestCount: cdp.networkRequests.length,
    staticServerRequestCount: server.requests.length,
    externalRequestCount: externalRequests.length,
    passwordFieldRenderedMasked: true,
    publicTrialCredentialPolicy: "The documented public-trial-only constant is allowlisted in source and is never rendered as visible text.",
    publicTrialCredentialOccurrences,
    visibleSurfaceSha256: sha256Buffer(visiblePayload),
    outputBinaryStringsSha256: sha256Buffer(binaryStrings),
  };
};

const writeVideoScript = async (report) => {
  const reviewed = report.validation.representativeFrameReview === "PASS" ? "PASS" : "PENDING";
  const markdown = `# PF02 Registration Trial Video

## Identity

- DEMO_BUILD: \`${DEMO_BUILD_ID}\`
- SOURCE_RUN: \`${SOURCE_RUN_ID}\`
- Output: \`registration-demo-video.mp4\`
- Evidence boundary: SOURCE_RUN is historical pre-auth-hardening evidence and does not claim that the current hardened external endpoint was redeployed.

## Scope

This video records the current PF02 public static trial in a real local browser. It demonstrates the in-memory and no-external-request boundary, a normal request, request authentication, validation, Sheet-shaped row storage, Slack or Email result simulation, masked CSV export, a user-approved local browser notification, and four edge scenarios.

The video does not send data to Google Sheets, Slack, Email, or any external server. Actual production integration requires an owner-approved account, credentials stored outside the page, and a separate credentialed validation. \`SOURCE_RUN\` identifies historical package evidence only.

## Scenes

1. Show the public in-memory boundary and the separate historical SOURCE_RUN identity.
2. Inspect a masked normal request and its password-rendered public trial authentication value.
3. Run request authentication, field validation, row storage, and external-notification simulation.
4. Confirm the local response, RUN_ID, masked stored row, and browser-generated CSV.
5. Use the local browser notification in a recording profile where notification permission was granted before capture.
6. Show authentication failure before validation, storage, or notification.
7. Show missing-email and duplicate-candidate review states.
8. Show notification failure while preserving the stored row.
9. Close on the separation between this static trial and approved production integration.

## Acceptance

- 1440x1000 H.264, yuv420p, 15fps, no audio
- 45 to 65 seconds
- Full decode and frame-count consistency PASS
- No black or blank sampled segments
- No external browser request
- Visible DOM, binary-string, secret-pattern, and local-path scan PASS
- Three representative frames visually reviewed: ${reviewed}

## Generated Validation

- Video SHA-256: \`${report.currentVideoSha256}\`
- Demo source aggregate SHA-256: \`${report.demoSourceSha256}\`
- Duration: ${report.ffprobe.durationSeconds.toFixed(3)} seconds
- Frames: ${report.ffprobe.frameCount} encoded / ${report.ffprobe.decodedFrameCount} decoded
- Representative frame review: ${reviewed}
`;
  await fs.writeFile(videoScript, markdown);
};

const validateReportArtifacts = async (report) => {
  assert(report.project === "PF02", "Report project mismatch");
  assert(report.demoBuildId === DEMO_BUILD_ID, "Report DEMO_BUILD mismatch");
  assert(report.sourceRunId === SOURCE_RUN_ID, "Report SOURCE_RUN mismatch");
  assert(await sha256(finalVideo) === report.currentVideoSha256, "Video hash mismatch");
  const source = await digestDemoSource();
  assert(source.sha256 === report.demoSourceSha256, "Demo source aggregate changed after recording");
  assert(
    JSON.stringify(source.files) === JSON.stringify(report.demoSourceFiles),
    "Demo source canonical file order changed after recording",
  );
  for (const frame of report.representativeFrames || []) {
    const target = path.join(productDir, frame.file);
    assert(await sha256(target) === frame.sha256, `Representative frame hash mismatch: ${frame.file}`);
    const dimensions = run("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x",
      target,
    ]).stdout.trim();
    assert(dimensions === `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`, `Representative frame dimensions changed: ${frame.file}`);
  }
};

const record = async () => {
  await fs.mkdir(path.dirname(reportFile), { recursive: true });
  await fs.mkdir(path.join(productDir, "screenshots"), { recursive: true });
  await fs.mkdir(scratchRoot, { recursive: true });
  const sourceEvidence = await validateSourceEvidence();
  const demoSource = await digestDemoSource();
  const server = await startStaticServer();
  const workDir = await fs.mkdtemp(path.join(scratchRoot, "pf02-public-video-"));
  const profileDir = path.join(workDir, "chrome-profile");
  const downloadDir = path.join(workDir, "downloads");
  const temporaryVideo = path.join(workDir, "registration-demo-video.mp4");
  const display = await findDisplay();
  const debugPort = await findFreePort();
  const children = [];
  let ffmpeg;
  let cdp;
  try {
    const xvfb = spawn("Xvfb", [
      display,
      "-screen", "0", `${VIDEO_WIDTH}x${VIDEO_HEIGHT}x24`,
      "-nolisten", "tcp",
    ], { stdio: ["ignore", "ignore", "ignore"] });
    children.push(xvfb);
    const displayNumber = display.slice(1);
    for (let attempt = 0; attempt < 100; attempt += 1) {
      try {
        await fs.access(`/tmp/.X11-unix/X${displayNumber}`);
        break;
      } catch {
        if (attempt === 99) throw new Error("Xvfb startup timeout");
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
    const demoUrl = `${server.baseUrl}/demos/pf02/`;
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
      `--host-resolver-rules=MAP * 0.0.0.0, EXCLUDE 127.0.0.1`,
      `--app=${demoUrl}`,
    ], { env, stdio: ["ignore", "ignore", "ignore"] });
    children.push(chrome);
    await waitForUrl(`http://127.0.0.1:${debugPort}/json/version`);
    cdp = await connectCdp(debugPort);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await cdp.send("Network.enable");
    await cdp.send("Page.setBypassCSP", { enabled: true });
    await cdp.send("Browser.grantPermissions", {
      origin: server.baseUrl,
      permissions: ["notifications"],
    });
    await cdp.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: downloadDir,
    });
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitForSelector(cdp, "#runButton");
    cdp.runtimeErrors.length = 0;
    await installRecordingOverlay(cdp);
    const boundary = await cdp.evaluate(`({
      text: document.body.innerText,
      title: document.title,
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      secure: isSecureContext,
      notificationPermission: Notification.permission
    })`);
    assert(boundary.title === "PF02 웹훅·시트·알림 자동화 체험", "Unexpected PF02 demo title");
    assert(boundary.text.includes(DEMO_BUILD_ID), "DEMO_BUILD is not visible in overlay");
    assert(boundary.text.includes(SOURCE_RUN_ID), "SOURCE_RUN is not visible in overlay");
    assert(/Google Sheets, Slack, Email, 서버에는 요청하지 않습니다/.test(boundary.text), "No-external-request boundary missing");
    assert(/실제 외부 연동 검증 자료와 별도/.test(boundary.text), "Separate source-proof boundary missing");
    assert(boundary.width <= boundary.viewport + 1, "Horizontal overflow at recording viewport");
    assert(boundary.secure === true, "Local demo is not a secure context");
    assert(boundary.notificationPermission === "granted", "Notification permission grant did not apply");

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
    await recordFlow(cdp, timeline);
    await sleep(500);
    await stopProcess(ffmpeg, "SIGINT");
    ffmpeg = undefined;
    try {
      await fs.access(temporaryVideo);
    } catch {
      throw new Error(`ffmpeg did not produce a recording: ${ffmpegError}`);
    }
    assert(cdp.runtimeErrors.length === 0, `Browser runtime errors: ${cdp.runtimeErrors.join(" | ")}`);

    const metadata = probeVideo(temporaryVideo);
    const decodedFrameCount = fullDecode(temporaryVideo);
    const frameAnalysis = analyzeFrames(temporaryVideo);
    assert(metadata.codec === "h264", "Expected H.264 video");
    assert(metadata.pixelFormat === "yuv420p", "Expected yuv420p video");
    assert(metadata.width === VIDEO_WIDTH && metadata.height === VIDEO_HEIGHT, "Expected 1440x1000 video");
    assert(metadata.averageFrameRate === "15/1", `Expected 15fps, got ${metadata.averageFrameRate}`);
    assert(metadata.audioStreamCount === 0, "Registration video must not contain audio");
    assert(
      metadata.durationSeconds >= MIN_DURATION_SECONDS && metadata.durationSeconds <= MAX_DURATION_SECONDS,
      `Duration ${metadata.durationSeconds}s is outside ${MIN_DURATION_SECONDS}-${MAX_DURATION_SECONDS}s`,
    );
    assert(metadata.frameCount === decodedFrameCount, `Frame count mismatch ${metadata.frameCount}/${decodedFrameCount}`);
    assert(frameAnalysis.blackSegments.length === 0, "Black segment detected");
    assert(frameAnalysis.blankSamples === 0, "Blank sampled frame detected");

    await fs.copyFile(temporaryVideo, finalVideo);
    const representativeFrames = await extractFrames(finalVideo, timeline.markers);
    const scan = await securityScan({ cdp, server, videoPath: finalVideo });
    const report = {
      project: "PF02",
      runId: SOURCE_RUN_ID,
      demoBuildId: DEMO_BUILD_ID,
      sourceRunId: SOURCE_RUN_ID,
      recordedAt: new Date().toISOString(),
      recordingSource: "current local PF02 public static trial UI browser walkthrough",
      sourceProofNote: "The public trial performs only in-memory browser simulation. SOURCE_RUN identifies historical pre-auth-hardening package evidence and does not prove a current hardened external deployment.",
      sourceEvidence,
      demoSourceSha256: demoSource.sha256,
      demoSourceFiles: demoSource.files,
      currentVideoSha256: await sha256(finalVideo),
      ffprobe: { ...metadata, decodedFrameCount },
      frameAnalysis,
      representativeFrames,
      scenarioAssertions: {
        normal: "PASS",
        authenticationFailure: "PASS",
        missingEmail: "PASS",
        duplicateCandidate: "PASS",
        notificationFailureWithRowPreserved: "PASS",
        browserNotificationGrantedAndDisplayed: "PASS",
        maskedCsvGenerated: "PASS",
      },
      securityScan: scan,
      timeline: timeline.events,
      validation: {
        fullDecode: "PASS",
        frameCountConsistency: "PASS",
        runIdLinkage: "PASS",
        demoBuildLinkage: "PASS",
        sourceProofSeparation: "PASS",
        localStaticSourceOnly: "PASS",
        noExternalRequests: "PASS",
        noAudio: "PASS",
        noBlackSegments: "PASS",
        noBlankSamples: "PASS",
        secretAndLocalPathScan: "PASS",
        representativeFrameReview: "PENDING_VISUAL_REVIEW",
      },
    };
    await fs.writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
    await writeVideoScript(report);
    console.log("PF02_PUBLIC_TRIAL_VIDEO_RECORDED");
    console.log(`VIDEO=${finalVideo}`);
    console.log(`REPORT=${reportFile}`);
    console.log(`DURATION_SECONDS=${metadata.durationSeconds}`);
    console.log(`FRAME_COUNT=${metadata.frameCount}`);
    for (const frame of representativeFrames) console.log(`FRAME=${path.join(productDir, frame.file)}`);
  } finally {
    cdp?.close();
    if (ffmpeg) await stopProcess(ffmpeg, "SIGINT");
    for (const child of children.reverse()) await stopProcess(child);
    await server.close();
    await fs.rm(workDir, { recursive: true, force: true });
  }
};

const approve = async () => {
  const report = JSON.parse(await fs.readFile(reportFile, "utf8"));
  await validateReportArtifacts(report);
  const metadata = probeVideo(finalVideo);
  const decodedFrameCount = fullDecode(finalVideo);
  const frameAnalysis = analyzeFrames(finalVideo);
  assert(metadata.frameCount === decodedFrameCount, "Frame count changed before visual approval");
  assert(metadata.audioStreamCount === 0, "Audio stream appeared before visual approval");
  assert(frameAnalysis.blackSegments.length === 0 && frameAnalysis.blankSamples === 0, "Blank or black video appeared before visual approval");
  assert(report.securityScan?.status === "PASS", "Security scan is not PASS");
  report.ffprobe = { ...metadata, decodedFrameCount };
  report.frameAnalysis = frameAnalysis;
  report.validation.representativeFrameReview = "PASS";
  report.validation.representativeFrameReviewedAt = new Date().toISOString();
  await fs.writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  await writeVideoScript(report);
  console.log("PF02_REPRESENTATIVE_FRAME_REVIEW_APPROVED");
};

const args = process.argv.slice(2);
if (args.length === 0) await record();
else if (args.length === 1 && args[0] === "--approve") await approve();
else {
  console.error("Usage: node scripts/record-pf02-public-demo-video.mjs [--approve]");
  process.exit(2);
}
