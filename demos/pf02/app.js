"use strict";

const DEMO_SHARED_SECRET = "pf02-public-trial-key";

const PRESETS = {
  normal: {
    label: "정상 접수",
    name: "리드 A",
    email: "lead.a@example.invalid",
    phone: "MASK-1100",
    source: "website",
    message: "도입 상담이 가능한 시간과 기본 진행 범위를 알려주세요.",
    authToken: DEMO_SHARED_SECRET,
  },
  "auth-failure": {
    label: "요청 인증 실패",
    name: "리드 B",
    email: "lead.b@example.invalid",
    phone: "MASK-2200",
    source: "webhook",
    message: "서비스 소개 자료를 요청합니다.",
    authToken: "incorrect-public-trial-key",
  },
  "missing-email": {
    label: "이메일 누락",
    name: "리드 C",
    email: "",
    phone: "MASK-3300",
    source: "google_form",
    message: "상담 담당자의 연락을 받고 싶습니다.",
    authToken: DEMO_SHARED_SECRET,
  },
  duplicate: {
    label: "중복 후보",
    name: "리드 D",
    email: "seed.lead@example.invalid",
    phone: "MASK-4400",
    source: "homepage",
    message: "이전에 남긴 문의의 진행 상태를 다시 확인하고 싶습니다.",
    authToken: DEMO_SHARED_SECRET,
  },
  "notification-failure": {
    label: "알림 실패",
    name: "리드 E",
    email: "notify.fail@example.invalid",
    phone: "MASK-5500",
    source: "webhook",
    message: "영업 담당자에게 이 문의를 배정해 주세요.",
    authToken: DEMO_SHARED_SECRET,
  },
};

const SEED_ROW = {
  runId: "TRIAL-SEED-000",
  name: "기존 리드",
  email: "seed.lead@example.invalid",
  phone: "MASK-SEED",
  source: "website",
  message: "중복 판별을 위한 초기 공개 샘플 행입니다.",
  status: "new",
  validationStatus: "ok",
  duplicateEmail: "no",
  messageHash: "seed000000000000",
  notificationStatus: "sent_slack",
  notificationChannel: "slack",
  notes: "체험 초기 행",
};

const state = {
  rows: [],
  mode: "slack",
  serial: 0,
  authorizedCount: 0,
  logIndex: 0,
  lastAddedRunId: null,
  processing: false,
};

const element = (id) => document.getElementById(id);

function presetKey() {
  return element("presetSelect").value;
}

function applyPreset() {
  const preset = PRESETS[presetKey()];
  element("leadName").value = preset.name;
  element("leadEmail").value = preset.email;
  element("leadPhone").value = preset.phone;
  element("leadSource").value = preset.source;
  element("leadMessage").value = preset.message;
  element("authToken").value = preset.authToken;
  element("presetBadge").textContent = preset.label;
  element("statusLine").textContent = `${preset.label} 시나리오가 준비되었습니다.`;
  resetPipeline();
  addLog(`${preset.label} 샘플 요청을 불러왔습니다.`);
}

function formPayload() {
  return {
    name: element("leadName").value.trim(),
    email: element("leadEmail").value.trim().toLowerCase(),
    phone: element("leadPhone").value.trim(),
    source: element("leadSource").value,
    message: element("leadMessage").value.trim(),
    authToken: element("authToken").value.trim(),
  };
}

function setStage(stage, stateClass, label) {
  const item = document.querySelector(`[data-stage="${stage}"]`);
  item.className = stateClass ? `is-${stateClass}` : "";
  item.querySelector(":scope > b").textContent = label;
}

function resetPipeline() {
  ["auth", "validation", "notification", "storage"].forEach((stage) => setStage(stage, "", "대기"));
  element("responseBadge").className = "badge";
  element("responseBadge").textContent = "대기";
  element("responseCode").textContent = "실행 전";
  element("responseOk").textContent = "-";
  element("responseStatus").textContent = "waiting";
  element("responseRunId").textContent = "-";
  element("responseChannel").textContent = state.mode === "slack" ? "Slack" : "Email";
}

function renderMode() {
  element("slackModeButton").setAttribute("aria-pressed", state.mode === "slack" ? "true" : "false");
  element("emailModeButton").setAttribute("aria-pressed", state.mode === "email" ? "true" : "false");
  element("responseChannel").textContent = state.mode === "slack" ? "Slack" : "Email";
}

function maskEmail(value) {
  if (!value || !value.includes("@")) return "(누락)";
  const [local, domain] = value.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

function maskPhone(value) {
  if (!value) return "-";
  return value.startsWith("MASK-") ? value : "MASKED";
}

function renderRows() {
  const body = element("sheetRows");
  body.replaceChildren();
  [...state.rows].reverse().forEach((row) => {
    const tableRow = body.insertRow();
    if (row.runId === state.lastAddedRunId) tableRow.className = "is-new";
    [row.runId, row.name, maskEmail(row.email), row.status, row.validationStatus, row.notificationStatus].forEach((value) => {
      const cell = tableRow.insertCell();
      cell.textContent = value;
    });
    tableRow.title = `연락처 ${maskPhone(row.phone)} · ${row.notificationChannel}`;
  });
  element("rowCount").textContent = `${state.rows.length}행`;
}

function renderMetrics() {
  element("metricStored").textContent = String(state.rows.length);
  element("metricAuthorized").textContent = String(state.authorizedCount);
  element("metricReview").textContent = String(state.rows.filter((row) => row.validationStatus !== "ok").length);
  element("metricFailed").textContent = String(state.rows.filter((row) => row.notificationStatus === "failed").length);
}

function render() {
  renderMode();
  renderRows();
  renderMetrics();
}

function logTime() {
  state.logIndex += 1;
  return `00:${String(state.logIndex).padStart(2, "0")}`;
}

function addLog(message, reset = false) {
  const log = element("activityLog");
  if (reset) log.replaceChildren();
  const item = document.createElement("li");
  const time = document.createElement("time");
  time.textContent = logTime();
  const text = document.createElement("span");
  text.textContent = message;
  item.append(time, text);
  log.prepend(item);
}

function secureEquals(left, right) {
  const a = String(left);
  const b = String(right);
  let mismatch = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index % Math.max(a.length, 1)) || 0) ^ (b.charCodeAt(index % Math.max(b.length, 1)) || 0);
  }
  return mismatch === 0;
}

async function messageDigest(value) {
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value.trim().toLowerCase());
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 16);
  }
  let first = 2166136261;
  let second = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    first = Math.imul(first ^ value.charCodeAt(index), 16777619);
    second = Math.imul(second ^ value.charCodeAt(value.length - index - 1), 16777619);
  }
  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

function finishResponse({ ok, status, runId = "-" }) {
  element("responseBadge").className = ok ? "badge badge-success" : "badge badge-danger";
  element("responseBadge").textContent = ok ? "처리 완료" : "요청 거부";
  element("responseCode").textContent = ok ? "200 · local simulation" : "401 · local simulation";
  element("responseOk").textContent = String(ok);
  element("responseStatus").textContent = status;
  element("responseRunId").textContent = runId;
}

async function processRequest() {
  const payload = formPayload();
  const scenario = presetKey();
  resetPipeline();

  if (!secureEquals(payload.authToken, DEMO_SHARED_SECRET)) {
    setStage("auth", "failure", "거부");
    setStage("validation", "skipped", "건너뜀");
    setStage("storage", "skipped", "저장 안 함");
    setStage("notification", "skipped", "건너뜀");
    finishResponse({ ok: false, status: "unauthorized" });
    element("statusLine").textContent = "요청 인증에 실패했습니다. 행 저장과 알림은 실행되지 않았습니다.";
    addLog("공유 비밀 요청 인증 실패로 요청을 거부했습니다.");
    return;
  }

  state.authorizedCount += 1;
  setStage("auth", "success", "통과");
  const duplicate = Boolean(payload.email) && state.rows.some((row) => row.email.toLowerCase() === payload.email);
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email);
  const validations = [];
  const notes = [];
  if (!validEmail) {
    validations.push("missing_email");
    notes.push("이메일 누락 또는 형식 오류: 수동 검토 필요");
  }
  if (duplicate) {
    validations.push("duplicate_candidate");
    notes.push("동일 이메일의 기존 행 발견");
  }
  setStage("validation", validations.length ? "warning" : "success", validations.length ? "검토 필요" : "정상");

  state.serial += 1;
  const runId = `TRIAL-${String(state.serial).padStart(3, "0")}`;
  const baseStatus = validations.includes("missing_email")
    ? "missing_email"
    : duplicate
      ? "duplicate_candidate"
      : "new";

  const row = {
    runId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    source: payload.source,
    message: payload.message,
    status: baseStatus,
    validationStatus: validations.length ? validations.join(";") : "ok",
    duplicateEmail: duplicate ? "yes" : "no",
    messageHash: await messageDigest(payload.message),
    notificationStatus: "pending",
    notificationChannel: state.mode,
    notes: notes.join(" · "),
  };
  state.rows.push(row);
  state.lastAddedRunId = runId;
  setStage("storage", "success", "1행 저장");

  const notificationFailed = scenario === "notification-failure";
  if (notificationFailed) {
    row.status = "received_but_notification_failed";
    row.notificationStatus = "failed";
    row.notes = [row.notes, "알림 전달 실패: 행은 정상 저장"].filter(Boolean).join(" · ");
    setStage("notification", "failure", "실패");
  } else {
    row.notificationStatus = state.mode === "email" ? "sent_email" : "sent_slack";
    setStage("notification", "success", "전송 재현");
  }

  finishResponse({ ok: true, status: row.status, runId });
  render();

  const outcome = notificationFailed
    ? "알림은 실패했지만 체험 행을 저장했습니다."
    : validations.length
      ? "검토 필요 상태로 체험 행을 저장하고 알림을 재현했습니다."
      : "정상 접수, 알림, 체험 행 저장을 완료했습니다.";
  element("statusLine").textContent = outcome;
  addLog(`${runId}: ${row.status}, ${row.notificationStatus}, 행 저장 완료.`);
}

async function runRequest() {
  if (state.processing) return;
  state.processing = true;
  const controls = ["runButton", "resetButton", "presetSelect", "slackModeButton", "emailModeButton"].map(element);
  controls.forEach((control) => { control.disabled = true; });
  element("runButton").textContent = "처리 중";
  try {
    await processRequest();
  } finally {
    state.processing = false;
    controls.forEach((control) => { control.disabled = false; });
    element("runButton").textContent = "요청 실행";
  }
}

function resetDemo() {
  state.rows = [{ ...SEED_ROW }];
  state.mode = "slack";
  state.serial = 0;
  state.authorizedCount = 0;
  state.logIndex = 0;
  state.lastAddedRunId = null;
  element("presetSelect").value = "normal";
  applyPreset();
  resetPipeline();
  render();
  element("statusLine").textContent = "정상 접수 시나리오가 준비되었습니다.";
  addLog("중복 판별용 초기 행 1개를 준비했습니다.", true);
}

function setMode(mode) {
  state.mode = mode;
  renderMode();
  resetPipeline();
  element("statusLine").textContent = `${mode === "slack" ? "Slack" : "Email"} 알림 재현 모드로 변경했습니다.`;
  addLog(`${mode === "slack" ? "Slack" : "Email"} 알림 모드를 선택했습니다.`);
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function exportCsv() {
  const headers = ["run_id", "name", "email", "phone", "source", "status", "validation_status", "duplicate_email", "message_hash", "notification_status", "notification_channel", "notes"];
  const rows = state.rows.map((row) => [
    row.runId,
    row.name,
    maskEmail(row.email),
    maskPhone(row.phone),
    row.source,
    row.status,
    row.validationStatus,
    row.duplicateEmail,
    row.messageHash,
    row.notificationStatus,
    row.notificationChannel,
    row.notes,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "pf02-public-trial-rows.csv";
  link.click();
  URL.revokeObjectURL(url);
  element("statusLine").textContent = `마스킹된 체험 행 ${state.rows.length}건의 CSV를 만들었습니다.`;
  addLog("마스킹된 체험 결과 CSV를 생성했습니다.");
}

element("presetSelect").addEventListener("change", applyPreset);
element("resetButton").addEventListener("click", resetDemo);
element("exportButton").addEventListener("click", exportCsv);
element("slackModeButton").addEventListener("click", () => setMode("slack"));
element("emailModeButton").addEventListener("click", () => setMode("email"));
element("requestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runRequest();
});

resetDemo();
