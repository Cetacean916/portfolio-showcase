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
    label: "외부 알림 실패",
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
  notificationStatus: "simulated_slack",
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
  lastNotifiableRun: null,
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
  renderBrowserNotification();
}

function browserNotificationCapability() {
  const notificationApi = globalThis.Notification;
  if (typeof notificationApi !== "function" || typeof notificationApi.requestPermission !== "function") return "unsupported";
  if (!globalThis.isSecureContext) return "insecure";
  return ["default", "denied", "granted"].includes(notificationApi.permission) ? notificationApi.permission : "unsupported";
}

function browserNotificationCopy(capability) {
  const copies = {
    unsupported: {
      badge: "미지원",
      badgeClass: "badge badge-warning",
      button: "앱 안에서 결과 확인",
    },
    insecure: {
      badge: "보안 연결 필요",
      badgeClass: "badge badge-warning",
      button: "앱 안에서 결과 확인",
    },
    denied: {
      badge: "권한 차단",
      badgeClass: "badge badge-danger",
      button: "앱 안에서 결과 확인",
    },
    default: {
      badge: "권한 미선택",
      badgeClass: "badge badge-info",
      button: "권한 요청 후 알림 보내기",
    },
    granted: {
      badge: "사용 가능",
      badgeClass: "badge badge-success",
      button: "기기 알림 보내기",
    },
  };
  return copies[capability] || copies.unsupported;
}

function renderBrowserNotification(message) {
  const capability = browserNotificationCapability();
  const copy = browserNotificationCopy(capability);
  const permission = element("browserNotificationPermission");
  const button = element("browserNotificationButton");

  permission.className = copy.badgeClass;
  permission.textContent = copy.badge;
  button.disabled = state.processing || !state.lastNotifiableRun;
  button.textContent = state.lastNotifiableRun ? copy.button : "요청 실행 후 사용";

  if (message) {
    element("browserNotificationStatus").textContent = message;
  } else if (!state.lastNotifiableRun) {
    element("browserNotificationStatus").textContent = "성공한 요청을 먼저 실행해 주세요.";
  }
}

function notifiableResultCopy(run) {
  const statusLabels = {
    new: "정상 접수",
    missing_email: "이메일 검토 필요",
    duplicate_candidate: "중복 후보 검토 필요",
  };
  const channel = run.channel === "email" ? "Email" : "Slack";
  return {
    title: "PF02 로컬 처리 알림",
    body: `${run.runId} · ${statusLabels[run.status] || "처리 완료"} · ${channel} 외부 알림 재현 완료`,
  };
}

async function sendBrowserNotification() {
  const run = state.lastNotifiableRun;
  if (!run) {
    renderBrowserNotification("알림으로 확인할 성공 요청이 없습니다.");
    return;
  }

  let capability = browserNotificationCapability();
  if (capability === "unsupported") {
    renderBrowserNotification(`${run.runId} 처리 완료를 앱 안에서 확인했습니다. 이 브라우저는 기기 알림을 지원하지 않습니다.`);
    addLog(`${run.runId}: 기기 알림 미지원으로 앱 안에서 결과를 표시했습니다.`);
    return;
  }
  if (capability === "insecure") {
    renderBrowserNotification(`${run.runId} 처리 완료를 앱 안에서 확인했습니다. 기기 알림은 HTTPS 또는 localhost에서 사용할 수 있습니다.`);
    addLog(`${run.runId}: 보안 연결 요건으로 기기 알림 대신 앱 안에 결과를 표시했습니다.`);
    return;
  }

  if (capability === "default") {
    try {
      capability = await Notification.requestPermission();
    } catch {
      renderBrowserNotification(`${run.runId} 처리 완료를 앱 안에서 확인했습니다. 브라우저가 알림 권한 요청을 완료하지 못했습니다.`);
      addLog(`${run.runId}: 권한 요청 오류로 기기 알림 대신 앱 안에 결과를 표시했습니다.`);
      renderBrowserNotification();
      return;
    }
  }

  if (capability !== "granted") {
    renderBrowserNotification(`${run.runId} 처리 완료를 앱 안에서 확인했습니다. 브라우저 설정에서 알림 권한이 차단되어 있습니다.`);
    addLog(`${run.runId}: 알림 권한 차단으로 앱 안에서 결과를 표시했습니다.`);
    renderBrowserNotification();
    return;
  }

  const copy = notifiableResultCopy(run);
  try {
    new Notification(copy.title, {
      body: copy.body,
      lang: "ko",
      tag: `pf02-${run.runId}`,
    });
    renderBrowserNotification(`${run.runId}의 비식별 처리 결과를 이 기기의 브라우저 알림으로 표시했습니다.`);
    addLog(`${run.runId}: 로컬 기기 알림을 표시했습니다. 외부 전송은 없습니다.`);
  } catch {
    renderBrowserNotification(`${run.runId} 처리 완료를 앱 안에서 확인했습니다. 이 환경에서는 기기 알림 창을 표시할 수 없습니다.`);
    addLog(`${run.runId}: 표시 제한으로 기기 알림 대신 앱 안에 결과를 표시했습니다.`);
  }
  renderBrowserNotification();
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
  state.lastNotifiableRun = null;
  renderBrowserNotification("현재 요청을 처리한 뒤 기기 알림 사용 여부를 안내합니다.");
  resetPipeline();

  if (!secureEquals(payload.authToken, DEMO_SHARED_SECRET)) {
    setStage("auth", "failure", "거부");
    setStage("validation", "skipped", "건너뜀");
    setStage("storage", "skipped", "저장 안 함");
    setStage("notification", "skipped", "건너뜀");
    finishResponse({ ok: false, status: "unauthorized" });
    element("statusLine").textContent = "요청 인증에 실패했습니다. 행 저장과 외부 알림 재현은 실행되지 않았습니다.";
    renderBrowserNotification("요청 인증 실패로 로컬 기기 알림 대상이 생성되지 않았습니다.");
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
    row.notificationStatus = state.mode === "email" ? "simulated_email" : "simulated_slack";
    state.lastNotifiableRun = {
      runId,
      status: row.status,
      channel: state.mode,
    };
    setStage("notification", "success", "전송 재현");
  }

  finishResponse({ ok: true, status: row.status, runId });
  render();

  const outcome = notificationFailed
    ? "알림은 실패했지만 체험 행을 저장했습니다."
    : validations.length
      ? "검토 필요 상태로 체험 행을 저장하고 알림을 재현했습니다."
      : "정상 접수, 외부 알림 재현, 체험 행 저장을 완료했습니다.";
  element("statusLine").textContent = outcome;
  addLog(`${runId}: ${row.status}, ${row.notificationStatus}, 행 저장 완료.`);
  renderBrowserNotification(notificationFailed
    ? "외부 알림 실패 시나리오는 로컬 기기 알림 대상에서 제외됩니다. 다른 성공 시나리오를 실행해 주세요."
    : `${runId} 처리 완료. 버튼을 누르면 권한 상태에 따라 로컬 기기 알림을 표시합니다.`);
}

async function runRequest() {
  if (state.processing) return;
  state.processing = true;
  const controls = ["runButton", "resetButton", "presetSelect", "slackModeButton", "emailModeButton", "browserNotificationButton"].map(element);
  controls.forEach((control) => { control.disabled = true; });
  element("runButton").textContent = "처리 중";
  try {
    await processRequest();
  } finally {
    state.processing = false;
    controls.forEach((control) => { control.disabled = false; });
    element("runButton").textContent = "요청 실행";
    renderBrowserNotification(element("browserNotificationStatus").textContent);
  }
}

function resetDemo() {
  state.rows = [{ ...SEED_ROW }];
  state.mode = "slack";
  state.serial = 0;
  state.authorizedCount = 0;
  state.logIndex = 0;
  state.lastAddedRunId = null;
  state.lastNotifiableRun = null;
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
  element("statusLine").textContent = `${mode === "slack" ? "Slack" : "Email"} 외부 알림 재현 모드로 변경했습니다.`;
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
element("browserNotificationButton").addEventListener("click", sendBrowserNotification);
element("requestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runRequest();
});

resetDemo();
