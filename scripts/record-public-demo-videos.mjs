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
const productRoot = path.join(portfolioRoot, "유형별 포트폴리오");
const scratchRoot = path.join(process.env.HOME || os.homedir(), "tmp");
const FRAME_RATE = 15;
const VIDEO_WIDTH = 1440;
const VIDEO_HEIGHT = 1000;

const projects = {
  pf03: {
    code: "PF03",
    demoBuildId: "PF03_PUBLIC_TRIAL_20260711_01",
    sourceRunId: "PF03_FINAL_20260710_891998",
    demoPath: "/demos/pf03/",
    readySelector: "#processButton",
    productDir: path.join(productRoot, "03-엑셀-CSV-정리-리포트-자동화"),
    reportFile: "evidence/registration-video-validation-report.json",
    transcriptFile: "evidence/registration-video-transcript.txt",
    frames: [
      ["screenshots/15-registration-trial-input.png", "input"],
      ["screenshots/16-registration-trial-results.png", "results"],
      ["screenshots/17-registration-trial-proof.png", "proof"],
    ],
  },
  pf04: {
    code: "PF04",
    demoBuildId: "PF04_PUBLIC_TRIAL_20260711_01",
    sourceRunId: "PF04_FINAL_20260710_891998",
    demoPath: "/demos/pf04/",
    readySelector: "#requestForm",
    productDir: path.join(productRoot, "04-근태-휴가-출장-미니-업무관리"),
    reportFile: "evidence/registration-video-validation-report.json",
    transcriptFile: "evidence/registration-video-transcript.txt",
    frames: [
      ["screenshots/13-registration-trial-create.png", "create"],
      ["screenshots/14-registration-trial-decisions.png", "decisions"],
      ["screenshots/15-registration-trial-export.png", "export"],
    ],
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (value, message) => {
  if (!value) throw new Error(message);
};

const sha256 = async (file) =>
  crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");

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

const digestDemoSource = async (demoRoot) => {
  const hash = crypto.createHash("sha256");
  const sourceRoots = [demoRoot, path.join(siteRoot, "demos/shared")];
  for (const sourceRoot of sourceRoots) {
    for (const file of await listFiles(sourceRoot)) {
      const relative = path.relative(siteRoot, file).split(path.sep).join("/");
      hash.update(relative);
      hash.update("\0");
      hash.update(await fs.readFile(file));
      hash.update("\0");
    }
  }
  for (const name of ["Pretendard-Regular.woff2", "Pretendard-SemiBold.woff2", "Pretendard-ExtraBold.woff2"]) {
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
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", "http://127.0.0.1");
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
  for (let number = 131; number < 151; number += 1) {
    try {
      await fs.access(`/tmp/.X11-unix/X${number}`);
    } catch {
      return `:${number}`;
    }
  }
  throw new Error("No free X11 display found");
};

const stopProcess = async (process, signal = "SIGTERM") => {
  if (!process || process.exitCode !== null) return;
  process.kill(signal);
  await Promise.race([
    new Promise((resolve) => process.once("exit", resolve)),
    sleep(5000),
  ]);
  if (process.exitCode === null) process.kill("SIGKILL");
};

const waitForUrl = async (url, attempts = 100) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Process is still starting.
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const connectCdp = async (port) => {
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
  let serial = 0;
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") {
      runtimeErrors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text || "runtime exception");
    }
    if (message.method === "Log.entryAdded" && message.params.entry?.level === "error") {
      runtimeErrors.push(message.params.entry.text);
    }
    if (!message.id || !pending.has(message.id)) return;
    const waiter = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
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

const installRecordingOverlay = async (cdp, config) => {
  await cdp.send("Page.setBypassCSP", { enabled: true });
  await cdp.evaluate(`
(() => {
  document.getElementById("publicVideoStatus")?.remove();
  document.getElementById("publicVideoCursor")?.remove();
  document.getElementById("publicVideoStyle")?.remove();
  const style = document.createElement("style");
  style.id = "publicVideoStyle";
  style.textContent = \`
    #publicVideoStatus {
      position: fixed;
      z-index: 100000;
      top: 58px;
      right: 18px;
      width: min(430px, calc(100vw - 36px));
      padding: 12px 14px;
      border: 1px solid rgba(255,255,255,.28);
      border-radius: 7px;
      background: rgba(13,27,42,.94);
      box-shadow: 0 16px 38px rgba(15,23,42,.24);
      color: #fff;
      font: 800 15px/1.45 Pretendard, system-ui, sans-serif;
      letter-spacing: 0;
      pointer-events: none;
    }
    #publicVideoStatus small {
      display: block;
      margin-top: 4px;
      color: #b9e4df;
      font: 700 11px/1.35 ui-monospace, monospace;
    }
    #publicVideoCursor {
      position: fixed;
      z-index: 100001;
      width: 22px;
      height: 22px;
      margin: -11px 0 0 -11px;
      border: 3px solid #fff;
      border-radius: 50%;
      background: #0fa89b;
      box-shadow: 0 0 0 4px rgba(15,168,155,.3);
      transition: left .45s ease, top .45s ease, transform .14s ease;
      pointer-events: none;
    }
    .publicVideoFocus {
      outline: 4px solid #0fa89b !important;
      outline-offset: 4px !important;
    }
  \`;
  document.head.append(style);
  const status = document.createElement("div");
  status.id = "publicVideoStatus";
  status.innerHTML = "공개 체험 데모를 직접 조작합니다.<small>DEMO_BUILD: ${config.demoBuildId}<br>SOURCE_RUN: ${config.sourceRunId} (별도 패키지 근거)</small>";
  document.body.append(status);
  const cursor = document.createElement("div");
  cursor.id = "publicVideoCursor";
  cursor.style.left = "340px";
  cursor.style.top = "220px";
  document.body.append(cursor);
  return true;
})()
`);
};

const setOverlayStatus = (cdp, config, text) => {
  const markup = `${text}<small>DEMO_BUILD: ${config.demoBuildId}<br>SOURCE_RUN: ${config.sourceRunId} (별도 패키지 근거)</small>`;
  return cdp.evaluate(`
(() => {
  const node = document.getElementById("publicVideoStatus");
  node.innerHTML = ${JSON.stringify(markup)};
  return true;
})()
`);
};

const focusElement = async (cdp, selector, label, delay = 1600) => {
  const found = await cdp.evaluate(`
(async () => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element) return false;
  element.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
  await new Promise((resolve) => setTimeout(resolve, 420));
  document.querySelectorAll(".publicVideoFocus").forEach((node) => node.classList.remove("publicVideoFocus"));
  element.classList.add("publicVideoFocus");
  const rect = element.getBoundingClientRect();
  const cursor = document.getElementById("publicVideoCursor");
  cursor.style.left = Math.round(rect.left + rect.width / 2) + "px";
  cursor.style.top = Math.round(rect.top + Math.min(rect.height / 2, 80)) + "px";
  return true;
})()
`);
  assert(found, `Missing recording selector: ${selector}`);
  if (label) {
    await cdp.evaluate(
      `document.getElementById("publicVideoStatus").firstChild.textContent = ${JSON.stringify(label)}`,
    );
  }
  await sleep(delay);
};

const clickElement = async (cdp, selector, label, delay = 2000) => {
  await focusElement(cdp, selector, label, 900);
  const clicked = await cdp.evaluate(`
(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element || element.disabled) return false;
  const cursor = document.getElementById("publicVideoCursor");
  cursor.style.transform = "scale(.7)";
  element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
  element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
  element.click();
  setTimeout(() => { cursor.style.transform = "scale(1)"; }, 140);
  return true;
})()
`);
  assert(clicked, `Could not click recording selector: ${selector}`);
  await sleep(delay);
};

const setControlValue = async (cdp, selector, value, label, delay = 850) => {
  await focusElement(cdp, selector, label, 420);
  const changed = await cdp.evaluate(`
(() => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element) return false;
  element.focus();
  element.value = ${JSON.stringify(value)};
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
})()
`);
  assert(changed, `Could not set recording selector: ${selector}`);
  await sleep(delay);
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

const recordPf03Flow = async (cdp, config, timeline) => {
  await setOverlayStatus(cdp, config, "공개 체험판과 별도 패키지 실행 근거를 구분해 보여드립니다.");
  timeline.note("Boundary and build identifiers shown.");
  await sleep(3800);

  await focusElement(cdp, "#csvInput", "1. 21행 샘플 CSV와 자동 감지 컬럼을 확인합니다.", 2600);
  timeline.mark("input", "Sample CSV input is visible.");
  await cdp.evaluate(`
(() => {
  const input = document.querySelector("#csvInput");
  input.value += " ";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()
`);
  await sleep(1400);
  await clickElement(cdp, "#processButton", "2. 브라우저 안에서 분리 규칙을 실행합니다.", 2600);
  const result = await cdp.evaluate(`({
    total: document.querySelector("#metricTotal")?.textContent.trim(),
    clean: document.querySelector("#metricClean")?.textContent.trim(),
    invalid: document.querySelector("#metricInvalid")?.textContent.trim(),
    duplicate: document.querySelector("#metricDuplicate")?.textContent.trim()
  })`);
  assert(
    result.total === "21" && result.clean === "8" && result.invalid === "11" && result.duplicate === "2",
    `PF03 result mismatch: ${JSON.stringify(result)}`,
  );
  await focusElement(cdp, ".metric-grid", "분리 결과: 정상 8행 · 오류 11행 · 중복 2행", 3200);
  timeline.mark("results", "Verified 21 -> 8 clean / 11 invalid / 2 duplicate.");

  await clickElement(cdp, "#tab-invalid", "3. 오류 탭에서 행별 검토 사유를 확인합니다.", 2800);
  await clickElement(cdp, "#tab-duplicate", "4. 중복 탭에서 차단된 ID를 확인합니다.", 2800);
  await clickElement(cdp, "#tab-clean", "5. 정상 탭은 바로 전달 가능한 행만 보여줍니다.", 2400);

  await focusElement(cdp, ".download-actions", "6. 세 결과를 각각 CSV로 내려받을 수 있습니다.", 2200);
  await clickElement(cdp, '[data-download="clean"]', "정상 CSV를 브라우저에서 생성합니다.", 1500);
  await clickElement(cdp, '[data-download="invalid"]', "오류 CSV를 브라우저에서 생성합니다.", 1500);
  await clickElement(cdp, '[data-download="duplicate"]', "중복 CSV를 브라우저에서 생성합니다.", 2100);

  await focusElement(
    cdp,
    "#package-proof",
    "7. Python 자동화와 테스트 7/7 PASS는 별도 패키지 실행 근거입니다.",
    4400,
  );
  timeline.mark("proof", "Separate package evidence boundary is visible.");
  await setOverlayStatus(cdp, config, "체험판 조작 완료 · 외부 전송 없이 새로고침 시 초기화됩니다.");
  await sleep(3600);
};

const findTextButtonSelector = async (cdp, pattern, scope = "body") => {
  const result = await cdp.evaluate(`
(() => {
  const pattern = new RegExp(${JSON.stringify(pattern)}, "i");
  document.querySelectorAll("[data-public-video-target]").forEach((node) => node.removeAttribute("data-public-video-target"));
  const nodes = [...document.querySelectorAll(${JSON.stringify(scope + " button, " + scope + " a")})];
  const index = nodes.findIndex((node) => pattern.test(node.textContent.trim()));
  if (index < 0) return null;
  nodes[index].dataset.publicVideoTarget = "true";
  return '[data-public-video-target="true"]';
})()
`);
  return result;
};

const recordPf04Flow = async (cdp, config, timeline) => {
  await setOverlayStatus(cdp, config, "공개 체험판에서 신청부터 처리·내보내기까지 직접 조작합니다.");
  timeline.note("Boundary and build identifiers shown.");
  await sleep(3800);

  const selectors = await cdp.evaluate(`
(() => {
  const form = document.querySelector("#requestForm");
  const controls = form ? [...form.querySelectorAll("input, select, textarea")] : [];
  const by = (terms) => controls.find((node) => {
    const label = node.labels?.[0]?.textContent || "";
    const haystack = [node.id, node.name, node.getAttribute("aria-label"), label].filter(Boolean).join(" ");
    return terms.some((term) => haystack.toLowerCase().includes(term));
  });
  const assign = (name, node) => {
    if (!node) return null;
    node.dataset.publicVideoField = name;
    return '[data-public-video-field="' + name + '"]';
  };
  return {
    employee: assign("employee", by(["employee", "name", "직원", "신청자"])),
    team: assign("team", by(["team", "department", "부서", "팀"])),
    type: assign("type", by(["type", "kind", "유형", "종류"])),
    start: assign("start", by(["start", "from", "시작"])),
    end: assign("end", by(["end", "to", "종료"])),
    reason: assign("reason", by(["reason", "memo", "사유"])),
  };
})()
`);
  assert(selectors.employee && selectors.type && selectors.start && selectors.end && selectors.reason, `PF04 form controls not found: ${JSON.stringify(selectors)}`);
  const optionValue = async (selector, patterns, fallbackIndex = 1) =>
    cdp.evaluate(`
(() => {
  const control = document.querySelector(${JSON.stringify(selector)});
  if (!control) return "";
  if (control.tagName !== "SELECT") return control.value || "";
  const patterns = ${JSON.stringify(patterns)}.map((value) => new RegExp(value, "i"));
  const options = [...control.options];
  return (options.find((option) => patterns.some((pattern) => pattern.test(option.textContent + " " + option.value))) || options[${fallbackIndex}] || options[0])?.value || "";
})()
`);

  const employeeValue = await optionValue(selectors.employee, ["김", "윤", "최", "demo", "sample"]);
  const typeValue = await optionValue(selectors.type, ["휴가", "vacation", "연차"]);
  await setControlValue(cdp, selectors.employee, employeeValue || "김민지", "1. 신청자를 선택합니다.");
  if (selectors.team) {
    const teamValue = await optionValue(selectors.team, ["개발", "product", "engineering"]);
    if (teamValue) await setControlValue(cdp, selectors.team, teamValue, "소속 팀을 선택합니다.");
  }
  await setControlValue(cdp, selectors.type, typeValue || "VACATION", "신청 유형을 선택합니다.");
  await setControlValue(cdp, selectors.start, "2026-07-20", "시작일을 입력합니다.");
  await setControlValue(cdp, selectors.end, "2026-07-21", "종료일을 입력합니다.");
  await setControlValue(cdp, selectors.reason, "공개 체험 데모 신청", "비식별 사유를 입력합니다.", 1200);

  let submitSelector = await findTextButtonSelector(cdp, "신청|등록|저장|추가", "#requestForm");
  assert(submitSelector, "PF04 submit button not found");
  await clickElement(cdp, submitSelector, "2. 새 신청을 등록합니다.", 3000);
  timeline.mark("create", "Created a new in-memory request.");

  await clickElement(cdp, "#approveButton", "3. 방금 등록한 대기 신청을 승인 처리합니다.", 3200);

  const pendingRowSelector = await cdp.evaluate(`
(() => {
  const rows = [...document.querySelectorAll("tbody tr, [data-request-row]")];
  const row = rows.find((node) => /대기|pending/i.test(node.textContent));
  if (!row) return null;
  const button = row.querySelector('[data-action="select"]');
  if (!button) return null;
  button.dataset.publicVideoTarget = "pending-select";
  return '[data-public-video-target="pending-select"]';
})()
`);
  assert(pendingRowSelector, "PF04 second pending request row not found");
  await clickElement(cdp, pendingRowSelector, "4. 남아 있는 대기 신청을 선택합니다.", 1800);
  await clickElement(cdp, "#rejectButton", "선택한 신청은 반려 처리합니다.", 3200);
  timeline.mark("decisions", "Approved one request and rejected another.");

  const filterControls = await cdp.evaluate(`
(() => {
  const nodes = [...document.querySelectorAll("select, input")].filter((node) => !node.closest("#requestForm"));
  const find = (terms) => nodes.find((node) => {
    const label = node.labels?.[0]?.textContent || "";
    const text = [node.id, node.name, node.getAttribute("aria-label"), label].filter(Boolean).join(" ").toLowerCase();
    return terms.some((term) => text.includes(term));
  });
  const assign = (name, node) => {
    if (!node) return null;
    node.dataset.publicVideoFilter = name;
    return '[data-public-video-filter="' + name + '"]';
  };
  return {
    status: assign("status", find(["status", "상태"])),
    team: assign("team", find(["team", "department", "부서", "팀"])),
  };
})()
`);
  if (filterControls.status) {
    const approvedValue = await optionValue(filterControls.status, ["승인", "approved"]);
    if (approvedValue) await setControlValue(cdp, filterControls.status, approvedValue, "5. 승인 상태만 필터링합니다.", 1100);
  }
  if (filterControls.team) {
    const teamValue = await optionValue(filterControls.team, ["전체", "all"], 0);
    await setControlValue(cdp, filterControls.team, teamValue, "팀 필터도 함께 사용할 수 있습니다.", 900);
  }
  await focusElement(cdp, '[data-test="pf04-filtered-count"]', "선택한 조건에 맞는 신청만 즉시 표시됩니다.", 2200);

  const exportSelector = await findTextButtonSelector(cdp, "CSV|내보내기|다운로드");
  assert(exportSelector, "PF04 CSV export control not found");
  await clickElement(cdp, exportSelector, "6. 현재 신청 목록을 CSV로 내보냅니다.", 3200);
  timeline.mark("export", "Exported the current in-memory request list as CSV.");

  const proof = await cdp.evaluate(`
(() => {
  const nodes = [...document.querySelectorAll("section, article, aside")];
  const node = nodes.find((item) => /별도 패키지|패키지 검증|source_run|자동 테스트/i.test(item.textContent));
  if (!node) return null;
  node.dataset.publicVideoProof = "true";
  return '[data-public-video-proof="true"]';
})()
`);
  if (proof) {
    await focusElement(cdp, proof, "7. 로컬 API와 자동 테스트는 별도 패키지 실행 근거입니다.", 4000);
  }
  await setOverlayStatus(cdp, config, "체험판 조작 완료 · 모든 상태는 이 브라우저 안에서만 유지됩니다.");
  await sleep(3600);
};

const probeVideo = (videoPath) => {
  const result = run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-count_frames",
    "-show_entries", "stream=codec_name,pix_fmt,width,height,avg_frame_rate,nb_read_frames:format=duration,size",
    "-of", "json",
    videoPath,
  ]);
  const parsed = JSON.parse(result.stdout);
  const stream = parsed.streams?.[0];
  const format = parsed.format;
  assert(stream && format, "Video stream metadata is missing");
  return {
    codec: stream.codec_name,
    pixelFormat: stream.pix_fmt,
    width: Number(stream.width),
    height: Number(stream.height),
    averageFrameRate: stream.avg_frame_rate,
    durationSeconds: Number(format.duration),
    frameCount: Number(stream.nb_read_frames),
    sizeBytes: Number(format.size),
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

const analyzeBlankFrames = (videoPath) => {
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
  const blankSamples = luma.filter((value) => value <= 2 || value >= 253);
  return {
    blackSegments,
    blankSamples: blankSamples.length,
    lumaMaximum: Math.max(...luma),
    lumaMinimum: Math.min(...luma),
    sampledFrames: luma.length,
  };
};

const extractFrames = async (config, videoPath, markers) => {
  const output = [];
  for (const [relative, marker] of config.frames) {
    const seconds = Math.max(1, Number(markers[marker] || 1) + 1);
    const target = path.join(config.productDir, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    run("ffmpeg", [
      "-v", "error",
      "-y",
      "-ss", seconds.toFixed(3),
      "-i", videoPath,
      "-frames:v", "1",
      target,
    ]);
    output.push({
      file: relative,
      sha256: await sha256(target),
      timestampSeconds: Number(seconds.toFixed(3)),
    });
  }
  return output;
};

const validateDemoBoundary = async (cdp, config) => {
  const page = await cdp.evaluate(`({
    text: document.body.innerText,
    title: document.title,
    width: document.documentElement.scrollWidth,
    viewport: innerWidth
  })`);
  assert(page.title, `${config.code}: title missing`);
  assert(page.text.includes(config.demoBuildId), `${config.code}: DEMO_BUILD missing from demo UI`);
  assert(page.text.includes(config.sourceRunId), `${config.code}: SOURCE_RUN missing from demo UI`);
  assert(/외부 서버|외부 시스템|실제 업무 시스템|실제 사내 시스템|서버에 저장되지/.test(page.text), `${config.code}: local-only boundary missing`);
  assert(/별도 패키지|별도 실행|정적 체험/.test(page.text), `${config.code}: source proof separation missing`);
  assert(page.width <= page.viewport + 1, `${config.code}: horizontal overflow at recording viewport`);
};

const recordProject = async (server, id) => {
  const config = projects[id];
  const demoRoot = path.join(siteRoot, config.demoPath);
  await fs.access(path.join(demoRoot, "index.html"));
  await fs.mkdir(path.join(config.productDir, "evidence"), { recursive: true });
  await fs.mkdir(path.join(config.productDir, "screenshots"), { recursive: true });
  await fs.mkdir(scratchRoot, { recursive: true });
  const workDir = await fs.mkdtemp(path.join(scratchRoot, `${id}-public-video-`));
  const profileDir = path.join(workDir, "chrome-profile");
  const temporaryVideo = path.join(workDir, "registration-demo-video.mp4");
  const finalVideo = path.join(config.productDir, "registration-demo-video.mp4");
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
    const demoUrl = `${server.baseUrl}${config.demoPath}`;
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
    cdp = await connectCdp(debugPort);
    await cdp.send("Page.enable");
    await cdp.send("Page.setBypassCSP", { enabled: true });
    await cdp.send("Page.reload", { ignoreCache: true });
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await cdp.send("Browser.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: path.join(workDir, "downloads"),
    });
    await waitForSelector(cdp, config.readySelector);
    await validateDemoBoundary(cdp, config);
    await installRecordingOverlay(cdp, config);
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
    if (id === "pf03") await recordPf03Flow(cdp, config, timeline);
    else await recordPf04Flow(cdp, config, timeline);
    await sleep(500);
    await stopProcess(ffmpeg, "SIGINT");
    try {
      await fs.access(temporaryVideo);
    } catch {
      throw new Error(`ffmpeg did not produce a recording: ${ffmpegError}`);
    }
    ffmpeg = undefined;

    assert(cdp.runtimeErrors.length === 0, `${config.code}: browser runtime errors: ${cdp.runtimeErrors.join(" | ")}`);
    const metadata = probeVideo(temporaryVideo);
    const decodedFrameCount = fullDecode(temporaryVideo);
    const blank = analyzeBlankFrames(temporaryVideo);
    assert(metadata.codec === "h264", `${config.code}: expected H.264`);
    assert(metadata.pixelFormat === "yuv420p", `${config.code}: expected yuv420p`);
    assert(metadata.width === VIDEO_WIDTH && metadata.height === VIDEO_HEIGHT, `${config.code}: expected 1440x1000`);
    assert(metadata.durationSeconds >= 45 && metadata.durationSeconds <= 80, `${config.code}: duration ${metadata.durationSeconds}s is outside 45-80s`);
    assert(metadata.frameCount === decodedFrameCount, `${config.code}: frame count mismatch ${metadata.frameCount}/${decodedFrameCount}`);
    assert(blank.blackSegments.length === 0, `${config.code}: black segment detected`);
    assert(blank.blankSamples === 0, `${config.code}: blank sample detected`);

    await fs.copyFile(temporaryVideo, finalVideo);
    const frames = await extractFrames(config, finalVideo, timeline.markers);
    const report = {
      project: config.code,
      runId: config.sourceRunId,
      demoBuildId: config.demoBuildId,
      sourceRunId: config.sourceRunId,
      recordedAt: new Date().toISOString(),
      recordingSource: "current public static trial UI browser walkthrough",
      sourceProofNote: "The static trial video does not execute or claim to execute the source backend or automated tests; SOURCE_RUN identifies separate package evidence.",
      demoSourceSha256: await digestDemoSource(demoRoot),
      currentVideoSha256: await sha256(finalVideo),
      ffprobe: {
        ...metadata,
        decodedFrameCount,
      },
      frameAnalysis: blank,
      representativeFrames: frames,
      validation: {
        fullDecode: "PASS",
        frameCountConsistency: "PASS",
        runIdLinkage: "PASS",
        demoBuildLinkage: "PASS",
        sourceProofSeparation: "PASS",
        noBlackSegments: "PASS",
        representativeFrameReview: "PENDING_VISUAL_REVIEW",
      },
    };
    await fs.writeFile(
      path.join(config.productDir, config.reportFile),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    await fs.writeFile(
      path.join(config.productDir, config.transcriptFile),
      [
        `PROJECT=${config.code}`,
        `DEMO_BUILD=${config.demoBuildId}`,
        `SOURCE_RUN=${config.sourceRunId} (separate package evidence)`,
        "RECORDING_SOURCE=current public static trial UI",
        "BOUNDARY=no external server or source backend/test execution",
        ...timeline.lines,
        "FINAL_RESULT=PASS_PENDING_VISUAL_FRAME_REVIEW",
        "",
      ].join("\n"),
    );
    console.log(`${config.code}_PUBLIC_TRIAL_VIDEO_RECORDED`);
    console.log(`VIDEO=${finalVideo}`);
    console.log(`REPORT=${path.join(config.productDir, config.reportFile)}`);
    for (const frame of frames) console.log(`FRAME=${path.join(config.productDir, frame.file)}`);
  } finally {
    cdp?.close();
    if (ffmpeg) await stopProcess(ffmpeg, "SIGINT");
    for (const child of children.reverse()) await stopProcess(child);
    await fs.rm(workDir, { recursive: true, force: true });
  }
};

const approveFrames = async (id) => {
  const config = projects[id];
  const reportPath = path.join(config.productDir, config.reportFile);
  const report = JSON.parse(await fs.readFile(reportPath, "utf8"));
  assert(report.project === config.code, `${config.code}: report project mismatch`);
  assert(report.demoBuildId === config.demoBuildId, `${config.code}: report demo build mismatch`);
  assert(report.sourceRunId === config.sourceRunId, `${config.code}: report source run mismatch`);
  report.demoSourceSha256 = await digestDemoSource(path.join(siteRoot, config.demoPath));
  for (const frame of report.representativeFrames || []) {
    const file = path.join(config.productDir, frame.file);
    assert((await sha256(file)) === frame.sha256, `${config.code}: representative frame hash mismatch for ${frame.file}`);
    const dimensions = run("ffprobe", [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=width,height",
      "-of", "csv=p=0:s=x",
      file,
    ]).stdout.trim();
    assert(dimensions === `${VIDEO_WIDTH}x${VIDEO_HEIGHT}`, `${config.code}: invalid representative frame dimensions for ${frame.file}`);
  }
  report.validation.representativeFrameReview = "PASS";
  report.validation.representativeFrameReviewedAt = new Date().toISOString();
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const transcriptPath = path.join(config.productDir, config.transcriptFile);
  const transcript = await fs.readFile(transcriptPath, "utf8");
  await fs.writeFile(
    transcriptPath,
    transcript.replace("FINAL_RESULT=PASS_PENDING_VISUAL_FRAME_REVIEW", "FINAL_RESULT=PASS"),
  );
  console.log(`${config.code}_REPRESENTATIVE_FRAME_REVIEW_APPROVED`);
};

const usage = () => {
  console.error("Usage: node scripts/record-public-demo-videos.mjs [pf03|pf04|all] | --approve [pf03|pf04|all]");
  process.exit(2);
};

const args = process.argv.slice(2);
const approvalMode = args[0] === "--approve";
const requested = approvalMode ? args[1] : args[0];
if (!["pf03", "pf04", "all"].includes(requested)) usage();
const ids = requested === "all" ? ["pf03", "pf04"] : [requested];
if (approvalMode) {
  for (const id of ids) await approveFrames(id);
} else {
  const server = await startStaticServer();
  try {
    for (const id of ids) await recordProject(server, id);
  } finally {
    await server.close();
  }
}
