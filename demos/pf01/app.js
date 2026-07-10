"use strict";

const SAMPLE_TICKETS = [
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

const RULES = [
  {
    category: "결제 오류",
    priority: "긴급",
    team: "결제 운영팀",
    keywords: ["결제", "승인", "두 번"],
    draft: "안녕하세요. 결제 내역을 우선 확인하겠습니다. 주문 식별 정보와 승인 시각을 확인한 뒤 중복 승인 여부 및 처리 일정을 안내드리겠습니다.",
  },
  {
    category: "취소·환불",
    priority: "일반",
    team: "고객 지원팀",
    keywords: ["취소", "환불"],
    draft: "안녕하세요. 현재 주문 처리 단계를 확인한 뒤 취소 가능 여부와 환불 예상 일정을 안내드리겠습니다. 확인되는 대로 답변드리겠습니다.",
  },
  {
    category: "기업 견적",
    priority: "일반",
    team: "기업 영업팀",
    keywords: ["기업", "견적", "납기"],
    draft: "안녕하세요. 요청하신 수량과 일정을 기준으로 견적 범위를 확인하겠습니다. 필요한 옵션과 희망 납기일을 검토한 뒤 담당자가 안내드리겠습니다.",
  },
  {
    category: "배송 조회",
    priority: "긴급",
    team: "물류 운영팀",
    keywords: ["배송", "출고", "운송장"],
    draft: "안녕하세요. 출고 및 운송장 등록 상태를 우선 확인하겠습니다. 물류 기록을 점검한 뒤 예상 일정을 안내드리겠습니다.",
  },
  {
    category: "교환 요청",
    priority: "일반",
    team: "고객 지원팀",
    keywords: ["교환", "옵션", "상품"],
    draft: "안녕하세요. 주문 옵션과 수령 상품 상태를 확인한 뒤 교환 절차를 안내드리겠습니다. 상품 상태가 보이는 자료를 준비해 주시면 확인에 도움이 됩니다.",
  },
];

const state = {
  processed: [],
  selectedId: SAMPLE_TICKETS[0].id,
  filter: "all",
  logIndex: 0,
};

const element = (id) => document.getElementById(id);

function classify(ticket) {
  const rule = RULES.find((candidate) => candidate.keywords.some((keyword) => ticket.message.includes(keyword)));
  const matched = rule || {
    category: "일반 문의",
    priority: "일반",
    team: "고객 지원팀",
    draft: "안녕하세요. 남겨주신 내용을 확인했습니다. 담당자가 필요한 정보를 검토한 뒤 답변드리겠습니다.",
  };

  return {
    ...ticket,
    category: matched.category,
    priority: matched.priority,
    team: matched.team,
    summary: `${matched.category} 관련 요청으로 ${matched.team} 확인이 필요합니다.`,
    draft: matched.draft,
    status: matched.priority === "긴급" ? "우선 확인" : "답변 준비",
  };
}

function currentTickets() {
  return state.processed.length ? state.processed : SAMPLE_TICKETS;
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
  element("selectedMeta").textContent = `${ticket.id} · ${ticket.channel} · ${ticket.customer}`;
  element("selectedMessage").textContent = ticket.message;
  element("selectedCategory").textContent = ticket.category || "대기";
  element("selectedPriority").textContent = ticket.priority || "대기";
  element("selectedTeam").textContent = ticket.team || "대기";
  element("selectedSummary").textContent = ticket.summary || "분류 실행 후 표시됩니다.";
  element("selectedStatus").textContent = ticket.status || "분류 전";
  element("selectedStatus").className = badgeClass(ticket);
  element("draftEditor").value = ticket.draft || "";
  element("draftEditor").disabled = !state.processed.length;
}

function renderMetrics() {
  const processed = state.processed;
  element("metricTotal").textContent = String(SAMPLE_TICKETS.length);
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
  element("tableState").textContent = "5건 준비";
}

function render() {
  renderTickets();
  renderDetail();
  renderMetrics();
  renderQueue();
  renderTable();
  element("exportButton").disabled = !state.processed.length;
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
  if (ticket) ticket.draft = element("draftEditor").value;
}

function runClassification() {
  state.processed = SAMPLE_TICKETS.map(classify);
  state.selectedId = state.processed[0].id;
  state.filter = "all";
  element("filterSelect").value = "all";
  render();
  element("statusLine").textContent = "5건 분류를 완료했습니다. 결과와 답변 초안을 확인할 수 있습니다.";
  addLog("규칙 기반 문의 분류 5건을 완료했습니다.");
}

function resetDemo() {
  state.processed = [];
  state.selectedId = SAMPLE_TICKETS[0].id;
  state.filter = "all";
  state.logIndex = 0;
  element("filterSelect").value = "all";
  render();
  element("statusLine").textContent = "샘플 문의 5건을 불러왔습니다. 분류를 실행해 주세요.";
  addLog("체험 데이터를 초기 상태로 되돌렸습니다.", true);
}

function csvCell(value) {
  const text = String(value ?? "");
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function exportCsv() {
  saveDraft();
  if (!state.processed.length) return;
  const headers = ["문의 ID", "채널", "유형", "우선순위", "담당 팀", "상태", "요약", "답변 초안"];
  const rows = state.processed.map((ticket) => [
    ticket.id,
    ticket.channel,
    ticket.category,
    ticket.priority,
    ticket.team,
    ticket.status,
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
