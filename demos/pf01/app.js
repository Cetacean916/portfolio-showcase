"use strict";

const BASE_TICKETS = [
  {
    id: "TRIAL-001",
    customer: "고객 A",
    channel: "채팅",
    message: "오늘 결제가 두 번 승인된 것 같습니다. 주문 내역을 확인하고 빠르게 안내해 주세요.",
  },
  {
    id: "TRIAL-002",
    customer: "고객 B",
    channel: "웹 폼",
    message: "배송 전이면 주문을 취소하고 싶습니다. 환불까지 걸리는 시간도 궁금합니다.",
  },
  {
    id: "TRIAL-003",
    customer: "고객 C",
    channel: "이메일",
    message: "기업용으로 60개를 주문하려고 합니다. 납기와 견적 범위를 알려주세요.",
  },
  {
    id: "TRIAL-004",
    customer: "고객 D",
    channel: "채팅",
    message: "어제 출고 예정이었는데 운송장 번호가 아직 없습니다. 일정 확인 부탁드립니다.",
  },
  {
    id: "TRIAL-005",
    customer: "고객 E",
    channel: "웹 폼",
    message: "받은 상품의 옵션이 주문 내용과 달라서 교환 절차를 알고 싶습니다.",
  },
];

const SYNTHETIC_MESSAGES = [
  [
    "결제가 중복 승인된 것으로 보입니다. 결제 내역을 확인하고 처리 일정을 안내해 주세요.",
    "주문 중 결제 승인 알림이 두 번 왔습니다. 중복 청구인지 빠르게 확인 부탁드립니다.",
    "결제 완료 후 같은 금액이 두 번 승인된 것 같습니다. 하나를 취소할 수 있는지 확인해 주세요.",
  ],
  [
    "상품 발송 전이라면 주문을 취소하고 싶습니다. 환불 예상 일정도 알려주세요.",
    "주문 옵션을 잘못 선택해 취소를 요청합니다. 환불까지 걸리는 기간이 궁금합니다.",
    "아직 출고 전으로 확인됩니다. 주문 취소와 환불 절차를 안내해 주세요.",
  ],
  [
    "기업 행사용으로 40개를 주문하려고 합니다. 견적과 가능한 납기를 알려주세요.",
    "기업 구매로 80개가 필요합니다. 단체 견적과 희망 납기에 맞출 수 있는지 확인 부탁드립니다.",
    "기업 복지용 대량 주문을 검토 중입니다. 120개 기준 견적과 납기 범위를 제안해 주세요.",
  ],
  [
    "배송 예정일이 지났는데 운송장 조회가 되지 않습니다. 현재 출고 상태를 확인해 주세요.",
    "어제 출고 예정이었지만 배송 정보가 없습니다. 운송장 등록 일정을 알려주세요.",
    "배송 조회 상태가 며칠째 변하지 않습니다. 출고 여부와 예상 일정을 확인해 주세요.",
  ],
  [
    "수령한 상품의 색상 옵션이 주문과 다릅니다. 교환 접수 절차를 안내해 주세요.",
    "주문한 상품 옵션과 다른 구성을 수령했습니다. 교환에 필요한 내용을 알려주세요.",
    "받은 상품의 크기가 선택한 옵션과 달라 교환하려고 합니다. 진행 방법을 안내해 주세요.",
  ],
];

const CHANNEL_SETS = [
  ["채팅", "웹 폼", "이메일", "채팅", "웹 폼"],
  ["이메일", "채팅", "웹 폼", "이메일", "채팅"],
  ["웹 폼", "이메일", "채팅", "웹 폼", "이메일"],
];

const MAX_CUSTOM_TICKETS = 10;
const MAX_CUSTOM_LENGTH = 500;

const RULES = [
  {
    category: "결제 오류",
    priority: "긴급",
    team: "결제 운영팀",
    keywords: ["결제", "승인", "중복 결제", "중복 청구", "청구", "카드", "입금"],
    draft: "안녕하세요. 결제 내역을 우선 확인하겠습니다. 주문 식별 정보와 승인 시각을 확인한 뒤 중복 승인 여부 및 처리 일정을 안내드리겠습니다.",
  },
  {
    category: "취소·환불",
    priority: "일반",
    team: "고객 지원팀",
    keywords: ["취소", "환불", "반품", "철회"],
    draft: "안녕하세요. 현재 주문 처리 단계를 확인한 뒤 취소 가능 여부와 환불 예상 일정을 안내드리겠습니다. 확인되는 대로 답변드리겠습니다.",
  },
  {
    category: "기업 견적",
    priority: "일반",
    team: "기업 영업팀",
    keywords: ["기업", "견적", "납기", "대량", "단체", "법인", "도매"],
    draft: "안녕하세요. 요청하신 수량과 일정을 기준으로 견적 범위를 확인하겠습니다. 필요한 옵션과 희망 납기일을 검토한 뒤 담당자가 안내드리겠습니다.",
  },
  {
    category: "배송 조회",
    priority: "긴급",
    team: "물류 운영팀",
    keywords: ["배송", "출고", "운송장", "택배", "도착", "배송 지연"],
    draft: "안녕하세요. 출고 및 운송장 등록 상태를 우선 확인하겠습니다. 물류 기록을 점검한 뒤 예상 일정을 안내드리겠습니다.",
  },
  {
    category: "교환 요청",
    priority: "일반",
    team: "고객 지원팀",
    keywords: ["교환", "오배송", "불량", "파손", "다른 옵션", "옵션이 다", "사이즈가 다", "색상이 다"],
    draft: "안녕하세요. 주문 옵션과 수령 상품 상태를 확인한 뒤 교환 절차를 안내드리겠습니다. 상품 상태가 보이는 자료를 준비해 주시면 확인에 도움이 됩니다.",
  },
];

function createBaseTickets() {
  return BASE_TICKETS.map((ticket) => ({ ...ticket, origin: "base" }));
}

const state = {
  tickets: createBaseTickets(),
  processed: [],
  selectedId: BASE_TICKETS[0].id,
  filter: "all",
  logIndex: 0,
  batchId: "BASE-001",
  batchType: "base",
  generationCount: 0,
  customSerial: 0,
};

const element = (id) => document.getElementById(id);

function classify(ticket) {
  const normalized = ticket.message.toLocaleLowerCase("ko-KR").replace(/\s+/g, " ");
  const ranked = RULES
    .map((candidate, index) => ({
      candidate,
      index,
      matches: candidate.keywords.filter((keyword) => normalized.includes(keyword.toLocaleLowerCase("ko-KR"))),
    }))
    .filter((entry) => entry.matches.length)
    .sort((left, right) => right.matches.length - left.matches.length || left.index - right.index);
  const best = ranked[0];
  const matched = best?.candidate || {
    category: "일반 문의",
    priority: "일반",
    team: "고객 지원팀",
    draft: "안녕하세요. 남겨주신 내용을 확인했습니다. 담당자가 필요한 정보를 검토한 뒤 답변드리겠습니다.",
  };
  const reason = best
    ? `키워드 점수 ${best.matches.length} · ${best.matches.slice(0, 3).join(" · ")}`
    : "명확한 분류 단서 없음 · 일반 문의로 배정";

  return {
    ...ticket,
    category: matched.category,
    priority: matched.priority,
    team: matched.team,
    summary: `${matched.category} 관련 요청으로 ${matched.team} 확인이 필요합니다.`,
    reason,
    draft: ticket.draft || matched.draft,
    status: matched.priority === "긴급" ? "우선 확인" : "답변 준비",
  };
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function nextSeed() {
  state.generationCount += 1;
  const values = new Uint32Array(1);
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(values);
  } else {
    values[0] = (Date.now() ^ Math.imul(state.generationCount, 0x9e3779b9)) >>> 0;
  }
  return (values[0] ^ Math.imul(state.generationCount, 0x85ebca6b)) >>> 0;
}

function createSyntheticBatch() {
  const seed = nextSeed();
  const random = seededRandom(seed);
  const categoryIndexes = shuffled([0, 1, 2, 3, 4], random);
  const channels = CHANNEL_SETS[Math.floor(random() * CHANNEL_SETS.length)];
  const token = seed.toString(16).toUpperCase().padStart(8, "0").slice(-6);
  const batchId = `SYN-${token}-${String(state.generationCount).padStart(2, "0")}`;
  const tickets = categoryIndexes.map((categoryIndex, index) => {
    const messages = SYNTHETIC_MESSAGES[categoryIndex];
    return {
      id: `${batchId}-${String(index + 1).padStart(2, "0")}`,
      customer: `가상 고객 ${index + 1}`,
      channel: channels[index],
      message: messages[Math.floor(random() * messages.length)],
      origin: "synthetic",
    };
  });

  return { batchId, tickets };
}

function currentTickets() {
  return state.processed.length ? state.processed : state.tickets;
}

function customTicketCount() {
  return state.tickets.filter((ticket) => ticket.origin === "custom").length;
}

function originLabel(origin) {
  if (origin === "custom") return "직접 입력";
  if (origin === "synthetic") return "합성";
  return "기준";
}

function visibleTickets() {
  const tickets = currentTickets();
  if (state.filter === "urgent") return tickets.filter((ticket) => ticket.priority === "긴급");
  if (state.filter === "ready") return tickets.filter((ticket) => ticket.status === "답변 준비");
  return tickets;
}

function selectedTicket() {
  return currentTickets().find((ticket) => ticket.id === state.selectedId) || currentTickets()[0];
}

function badgeClass(ticket) {
  if (!ticket.priority) return "badge";
  return ticket.priority === "긴급" ? "badge badge-danger" : "badge badge-success";
}

function renderTickets() {
  const list = element("ticketList");
  const tickets = visibleTickets();
  list.replaceChildren();
  element("inboxCount").textContent = `${tickets.length}건`;

  if (!tickets.length) {
    const empty = document.createElement("p");
    empty.className = "empty-ticket";
    empty.textContent = "조건에 맞는 문의가 없습니다.";
    list.append(empty);
    return;
  }

  tickets.forEach((ticket) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ticket-item";
    button.setAttribute("aria-current", ticket.id === state.selectedId ? "true" : "false");
    button.setAttribute("aria-label", `${ticket.id} ${ticket.customer} 문의 보기`);

    const head = document.createElement("span");
    head.className = "ticket-item-head";
    const title = document.createElement("strong");
    title.textContent = `${ticket.id} · ${ticket.customer}`;
    const status = document.createElement("span");
    status.className = badgeClass(ticket);
    status.textContent = ticket.status || "분류 전";
    head.append(title, status);

    const message = document.createElement("p");
    message.textContent = ticket.message;
    button.append(head, message);
    button.addEventListener("click", () => {
      saveDraft();
      state.selectedId = ticket.id;
      render();
      addLog(`${ticket.id} 상세를 열었습니다.`);
    });
    list.append(button);
  });
}

function renderDetail() {
  const ticket = selectedTicket();
  element("selectedMeta").textContent = `${ticket.id} · ${originLabel(ticket.origin)} · ${ticket.channel} · ${ticket.customer}`;
  element("selectedMessage").textContent = ticket.message;
  element("selectedCategory").textContent = ticket.category || "대기";
  element("selectedPriority").textContent = ticket.priority || "대기";
  element("selectedTeam").textContent = ticket.team || "대기";
  element("selectedReason").textContent = ticket.reason || "분류 실행 후 표시됩니다.";
  element("selectedSummary").textContent = ticket.summary || "분류 실행 후 표시됩니다.";
  element("selectedStatus").textContent = ticket.status || "분류 전";
  element("selectedStatus").className = badgeClass(ticket);
  element("draftEditor").value = ticket.draft || "";
  element("draftEditor").disabled = !state.processed.length;
}

function renderMetrics() {
  const processed = state.processed;
  const customCount = customTicketCount();
  const sourceLabel = state.batchType === "base" ? "비식별 기준 배치" : "새로 생성한 합성 배치";
  element("metricTotal").textContent = String(state.tickets.length);
  element("metricSource").textContent = customCount ? `${sourceLabel} + 직접 ${customCount}건` : sourceLabel;
  element("metricUrgent").textContent = processed.length ? String(processed.filter((item) => item.priority === "긴급").length) : "-";
  element("metricCategories").textContent = processed.length ? String(new Set(processed.map((item) => item.category)).size) : "-";
  element("metricDrafts").textContent = processed.length ? String(processed.filter((item) => item.draft).length) : "-";
}

function renderQueue() {
  const target = element("queueSummary");
  target.replaceChildren();
  if (!state.processed.length) {
    const notice = document.createElement("div");
    notice.className = "notice-box";
    const strong = document.createElement("strong");
    strong.textContent = "분류 대기";
    notice.append(strong, "실행하면 긴급 문의와 담당 팀이 표시됩니다.");
    target.append(notice);
    return;
  }

  const counts = new Map();
  state.processed.forEach((ticket) => counts.set(ticket.team, (counts.get(ticket.team) || 0) + 1));
  const list = document.createElement("ul");
  list.className = "queue-list";
  counts.forEach((count, team) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = team;
    const value = document.createElement("b");
    value.textContent = `${count}건`;
    item.append(label, value);
    list.append(item);
  });
  target.append(list);
}

function renderTable() {
  const body = element("resultRows");
  body.replaceChildren();
  if (!state.processed.length) {
    const row = body.insertRow();
    row.className = "empty-row";
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.textContent = "분류 실행 후 결과가 표시됩니다.";
    element("tableState").textContent = "분류 전";
    return;
  }

  state.processed.forEach((ticket) => {
    const row = body.insertRow();
    [ticket.id, ticket.channel, ticket.category, ticket.priority, ticket.team, ticket.status].forEach((value) => {
      const cell = row.insertCell();
      cell.textContent = value;
    });
  });
  element("tableState").textContent = `${state.processed.length}건 준비`;
}

function render() {
  const customCount = customTicketCount();
  const generatedCount = state.tickets.length - customCount;
  renderTickets();
  renderDetail();
  renderMetrics();
  renderQueue();
  renderTable();
  element("exportButton").disabled = !state.processed.length;
  element("classifyButton").textContent = `${state.tickets.length}건 분류 실행`;
  element("batchId").textContent = `${state.batchType === "base" ? "기준 배치" : "합성 배치"} · ${state.batchId}${customCount ? ` · 직접 ${customCount}건` : ""}`;
  element("batchDescription").textContent = `${state.batchType === "base" ? "비식별 기준" : "새로 생성한 비식별 합성"} 문의 ${generatedCount}건${customCount ? `과 직접 입력 ${customCount}건` : ""}을 유형, 우선순위, 담당 팀, 요약, 답변 초안으로 정리합니다.`;
  element("customInquirySubmit").disabled = customCount >= MAX_CUSTOM_TICKETS;
  element("customInquirySubmit").textContent = customCount >= MAX_CUSTOM_TICKETS ? "직접 입력 10건 완료" : "입력하고 분류";
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

function saveDraft() {
  if (!state.processed.length) return;
  const ticket = state.processed.find((item) => item.id === state.selectedId);
  if (ticket) {
    ticket.draft = element("draftEditor").value;
    const source = state.tickets.find((item) => item.id === ticket.id);
    if (source) source.draft = ticket.draft;
  }
}

function setCustomStatus(message, tone = "") {
  const status = element("customInquiryStatus");
  status.className = `custom-inquiry-status${tone ? ` is-${tone}` : ""}`;
  status.textContent = message;
}

function updateCustomMessageCount() {
  element("customMessageCount").textContent = `${element("customMessage").value.length} / ${MAX_CUSTOM_LENGTH}`;
}

function addCustomInquiry(event) {
  event.preventDefault();
  const messageInput = element("customMessage");
  const message = messageInput.value.trim();
  const customCount = customTicketCount();

  if (!message) {
    setCustomStatus("분류할 문의 내용을 입력해 주세요.", "error");
    messageInput.focus();
    return;
  }
  if (message.length > MAX_CUSTOM_LENGTH) {
    setCustomStatus(`문의 내용은 ${MAX_CUSTOM_LENGTH}자 이하로 입력해 주세요.`, "error");
    messageInput.focus();
    return;
  }
  if (customCount >= MAX_CUSTOM_TICKETS) {
    setCustomStatus(`직접 입력은 최대 ${MAX_CUSTOM_TICKETS}건까지 체험할 수 있습니다. 기준 배치로 초기화하면 다시 시작할 수 있습니다.`, "error");
    return;
  }

  saveDraft();
  state.customSerial += 1;
  const ticket = {
    id: `CUSTOM-${String(state.customSerial).padStart(3, "0")}`,
    customer: "익명 직접 입력",
    channel: element("customChannel").value,
    message,
    origin: "custom",
  };
  state.tickets.push(ticket);
  state.processed = state.tickets.map(classify);
  state.selectedId = ticket.id;
  state.filter = "all";
  element("filterSelect").value = "all";
  messageInput.value = "";
  updateCustomMessageCount();
  render();

  const result = state.processed.find((item) => item.id === ticket.id);
  const completion = `${ticket.id}을 ${result.category} · ${result.priority} · ${result.team}으로 분류했습니다.`;
  element("statusLine").textContent = completion;
  const limitNotice = customCount + 1 >= MAX_CUSTOM_TICKETS ? " 직접 입력 최대 10건을 완료했습니다." : "";
  setCustomStatus(`${completion} 입력값은 현재 브라우저 메모리에만 남습니다.${limitNotice}`, "success");
  addLog(`${ticket.id} 직접 입력 문의를 분류했습니다.`);
}

function runClassification() {
  state.processed = state.tickets.map(classify);
  state.selectedId = state.processed[0].id;
  state.filter = "all";
  element("filterSelect").value = "all";
  render();
  element("statusLine").textContent = `${state.batchId} 문의 ${state.processed.length}건 분류를 완료했습니다. 결과와 답변 초안을 확인할 수 있습니다.`;
  addLog(`${state.batchId} 규칙 기반 문의 분류 ${state.processed.length}건을 완료했습니다.`);
}

function generateBatch() {
  saveDraft();
  const generated = createSyntheticBatch();
  const customTickets = state.tickets.filter((ticket) => ticket.origin === "custom");
  state.tickets = [...generated.tickets, ...customTickets];
  state.processed = [];
  state.selectedId = generated.tickets[0].id;
  state.filter = "all";
  state.batchId = generated.batchId;
  state.batchType = "synthetic";
  element("filterSelect").value = "all";
  render();
  const customNote = customTickets.length ? ` 직접 입력 ${customTickets.length}건은 유지했습니다.` : "";
  element("statusLine").textContent = `${state.batchId} 합성 문의 5건을 만들었습니다.${customNote} 분류를 실행해 결과를 확인하세요.`;
  addLog(`${state.batchId} 비식별 합성 문의 5건을 생성했습니다.${customNote}`);
}

function resetDemo() {
  state.tickets = createBaseTickets();
  state.processed = [];
  state.selectedId = BASE_TICKETS[0].id;
  state.filter = "all";
  state.logIndex = 0;
  state.batchId = "BASE-001";
  state.batchType = "base";
  state.customSerial = 0;
  element("filterSelect").value = "all";
  element("customChannel").value = "채팅";
  element("customMessage").value = "";
  updateCustomMessageCount();
  render();
  element("statusLine").textContent = "샘플 문의 5건을 불러왔습니다. 분류를 실행해 주세요.";
  setCustomStatus("입력값은 저장하거나 외부로 보내지 않으며 현재 브라우저 메모리에서만 처리됩니다.");
  addLog("체험 데이터를 기준 배치로 되돌렸습니다.", true);
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function exportCsv() {
  saveDraft();
  if (!state.processed.length) return;
  const headers = ["문의 ID", "입력 유형", "채널", "문의 내용", "유형", "우선순위", "담당 팀", "상태", "분류 근거", "요약", "답변 초안"];
  const rows = state.processed.map((ticket) => [
    ticket.id,
    originLabel(ticket.origin),
    ticket.channel,
    ticket.message,
    ticket.category,
    ticket.priority,
    ticket.team,
    ticket.status,
    ticket.reason,
    ticket.summary,
    ticket.draft,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "pf01-trial-classification.csv";
  link.click();
  URL.revokeObjectURL(url);
  element("statusLine").textContent = "체험 분류 결과 CSV를 만들었습니다.";
  addLog("비식별 결과 CSV를 생성했습니다.");
}

element("classifyButton").addEventListener("click", runClassification);
element("generateButton").addEventListener("click", generateBatch);
element("customInquiryForm").addEventListener("submit", addCustomInquiry);
element("customMessage").addEventListener("input", updateCustomMessageCount);
element("resetButton").addEventListener("click", resetDemo);
element("exportButton").addEventListener("click", exportCsv);
element("filterSelect").addEventListener("change", (event) => {
  saveDraft();
  state.filter = event.currentTarget.value;
  const visible = visibleTickets();
  if (visible.length && !visible.some((ticket) => ticket.id === state.selectedId)) state.selectedId = visible[0].id;
  render();
  addLog(`${event.currentTarget.selectedOptions[0].textContent} 필터를 적용했습니다.`);
});
element("draftEditor").addEventListener("input", saveDraft);

render();
addLog("비식별 샘플 문의 5건을 불러왔습니다.", true);
