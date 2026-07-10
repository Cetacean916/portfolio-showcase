"use strict";

const INITIAL_REQUESTS = [
  {
    id: "LR-260701",
    employee: "구성원 D01",
    team: "디자인",
    type: "연차",
    start: "2026-07-14",
    end: "2026-07-14",
    reason: "개인 일정",
    status: "대기",
    history: ["2026-07-10 · 신청 등록"],
  },
  {
    id: "LR-260702",
    employee: "구성원 T02",
    team: "개발",
    type: "반차",
    start: "2026-07-15",
    end: "2026-07-15",
    reason: "병원 방문",
    status: "승인",
    history: ["2026-07-10 · 신청 등록", "2026-07-10 · 운영 매니저 승인"],
  },
  {
    id: "LR-260703",
    employee: "구성원 O03",
    team: "운영",
    type: "출장",
    start: "2026-07-18",
    end: "2026-07-19",
    reason: "협력사 현장 미팅",
    status: "반려",
    history: ["2026-07-10 · 신청 등록", "2026-07-10 · 일정 조정 요청으로 반려"],
  },
];

const $ = (selector) => document.querySelector(selector);

const cloneRequests = () => INITIAL_REQUESTS.map((request) => ({ ...request, history: [...request.history] }));

const state = {
  requests: cloneRequests(),
  selectedId: "LR-260701",
  nextNumber: 260704,
  filters: { team: "", status: "", from: "", to: "" },
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const statusClass = (status) => (status === "승인" ? "approved" : status === "반려" ? "rejected" : "pending");

const requestDays = (request) => {
  if (request.type === "반차") return 0.5;
  const start = new Date(`${request.start}T00:00:00`);
  const end = new Date(`${request.end}T00:00:00`);
  return Math.round((end - start) / 86400000) + 1;
};

const filteredRequests = () =>
  state.requests.filter((request) => {
    if (state.filters.team && request.team !== state.filters.team) return false;
    if (state.filters.status && request.status !== state.filters.status) return false;
    if (state.filters.from && request.end < state.filters.from) return false;
    if (state.filters.to && request.start > state.filters.to) return false;
    return true;
  });

const selectedRequest = () => state.requests.find((request) => request.id === state.selectedId) || state.requests[0];

const setStatusMessage = (message) => {
  $("#statusMessage").textContent = message;
};

const setSyncState = (message) => {
  $("#syncState").textContent = message;
};

const renderMetrics = () => {
  const pending = state.requests.filter((request) => request.status === "대기").length;
  const approved = state.requests.filter((request) => request.status === "승인").length;
  const rejected = state.requests.filter((request) => request.status === "반려").length;
  $("#metricTotal").textContent = state.requests.length;
  $("#metricPending").textContent = pending;
  $("#metricComplete").textContent = approved + rejected;
  $("#metricApproved").textContent = approved;
};

const renderRows = () => {
  const requests = filteredRequests();
  $("#visibleCount").textContent = `${requests.length}건 표시`;

  if (!requests.length) {
    $("#requestRows").innerHTML = '<tr><td class="empty-row" colspan="7">조건에 맞는 신청이 없습니다.</td></tr>';
    return;
  }

  $("#requestRows").innerHTML = requests
    .map(
      (request) => `<tr class="${request.id === state.selectedId ? "selected" : ""}">
        <td><button class="select-request" data-action="select" data-id="${escapeHtml(request.id)}" data-test="pf04-select-request" type="button">${escapeHtml(request.id)}</button></td>
        <td>${escapeHtml(request.employee)}</td>
        <td>${escapeHtml(request.team)}</td>
        <td>${escapeHtml(request.type)}</td>
        <td>${escapeHtml(request.start)} ~ ${escapeHtml(request.end)}</td>
        <td>${requestDays(request)}일</td>
        <td><span class="status-badge ${statusClass(request.status)}">${escapeHtml(request.status)}</span></td>
      </tr>`,
    )
    .join("");
};

const renderBoard = () => {
  const requests = filteredRequests();
  const statuses = ["대기", "승인", "반려"];
  $("#statusBoard").innerHTML = statuses
    .map((status) => {
      const items = requests.filter((request) => request.status === status);
      return `<section class="board-column" aria-label="${status} 신청">
        <h3>${status}<span>${items.length}</span></h3>
        <div class="board-items">
          ${
            items.length
              ? items
                  .map(
                    (request) => `<button class="board-item ${request.id === state.selectedId ? "selected" : ""}" data-action="select" data-id="${escapeHtml(request.id)}" data-test="pf04-board-request" type="button">
                      <strong>${escapeHtml(request.employee)} · ${escapeHtml(request.type)}</strong>
                      <small>${escapeHtml(request.id)} · ${escapeHtml(request.team)}</small>
                    </button>`,
                  )
                  .join("")
              : '<p class="board-empty">해당 신청 없음</p>'
          }
        </div>
      </section>`;
    })
    .join("");
};

const renderSelected = () => {
  const visible = filteredRequests();
  const request = visible.find((item) => item.id === state.selectedId) || visible[0];
  if (!request) {
    state.selectedId = "";
    $("#selectedTitle").textContent = "선택할 신청 없음";
    $("#selectedMeta").textContent = "현재 필터 결과가 비어 있습니다.";
    $("#selectedStatus").textContent = "없음";
    $("#selectedStatus").className = "status-badge";
    $("#selectedPeriod").textContent = "-";
    $("#selectedDays").textContent = "-";
    $("#selectedReason").textContent = "-";
    $("#selectedHistory").textContent = "-";
    $("#approveButton").disabled = true;
    $("#rejectButton").disabled = true;
    return;
  }
  state.selectedId = request.id;
  $("#selectedTitle").textContent = `${request.employee} · ${request.type}`;
  $("#selectedMeta").textContent = `${request.id} · ${request.team}`;
  $("#selectedStatus").textContent = request.status;
  $("#selectedStatus").className = `status-badge ${statusClass(request.status)}`;
  $("#selectedPeriod").textContent = `${request.start} ~ ${request.end}`;
  $("#selectedDays").textContent = `${requestDays(request)}일`;
  $("#selectedReason").textContent = request.reason;
  $("#selectedHistory").textContent = request.history[request.history.length - 1];
  const canDecide = request.status === "대기";
  $("#approveButton").disabled = !canDecide;
  $("#rejectButton").disabled = !canDecide;
};

const render = () => {
  renderMetrics();
  renderRows();
  renderBoard();
  renderSelected();
};

const selectRequest = (id, announce = true) => {
  if (!state.requests.some((request) => request.id === id)) return;
  state.selectedId = id;
  renderRows();
  renderBoard();
  renderSelected();
  if (announce) setStatusMessage(`${id} 신청을 선택했습니다.`);
};

const handleDelegatedSelection = (event) => {
  const button = event.target.closest('[data-action="select"]');
  if (!button) return;
  selectRequest(button.dataset.id);
};

const readFilters = () => {
  state.filters.team = $("#teamFilter").value;
  state.filters.status = $("#statusFilter").value;
  state.filters.from = $("#fromFilter").value;
  state.filters.to = $("#toFilter").value;
  if (state.filters.from && state.filters.to && state.filters.to < state.filters.from) {
    $("#toFilter").value = state.filters.from;
    state.filters.to = state.filters.from;
  }
  const visible = filteredRequests();
  if (!visible.some((request) => request.id === state.selectedId)) state.selectedId = visible[0]?.id || "";
  renderRows();
  renderBoard();
  renderSelected();
  setStatusMessage(`필터 결과 ${filteredRequests().length}건을 표시합니다.`);
};

const clearFilters = (announce = true) => {
  state.filters = { team: "", status: "", from: "", to: "" };
  $("#teamFilter").value = "";
  $("#statusFilter").value = "";
  $("#fromFilter").value = "";
  $("#toFilter").value = "";
  const visible = filteredRequests();
  if (!visible.some((request) => request.id === state.selectedId)) state.selectedId = visible[0]?.id || "";
  renderRows();
  renderBoard();
  renderSelected();
  if (announce) setStatusMessage("필터를 해제하고 전체 신청을 표시합니다.");
};

const addRequest = (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const employee = String(form.get("employee") || "").trim();
  const team = String(form.get("team") || "").trim();
  const type = String(form.get("type") || "").trim();
  const start = String(form.get("start") || "");
  const end = String(form.get("end") || "");
  const reason = String(form.get("reason") || "").trim();

  if (!employee || !team || !type || !start || !end || !reason) {
    setStatusMessage("모든 신청 항목을 입력해 주세요.");
    return;
  }
  if (end < start) {
    setStatusMessage("종료일은 시작일보다 빠를 수 없습니다.");
    return;
  }

  const request = {
    id: `LR-${state.nextNumber}`,
    employee,
    team,
    type,
    start,
    end,
    reason,
    status: "대기",
    history: ["공개 체험판 · 신청 등록"],
  };
  state.nextNumber += 1;
  state.requests.unshift(request);
  state.selectedId = request.id;
  clearFilters(false);
  render();
  setSyncState("신청 등록됨");
  setStatusMessage(`${request.id} 신청을 브라우저 메모리에 등록했습니다.`);
};

const decideSelected = (status) => {
  const request = selectedRequest();
  if (!request || request.status !== "대기") {
    setStatusMessage("결재 대기 상태인 신청만 처리할 수 있습니다.");
    return;
  }
  const memo = $("#decisionMemo").value.trim() || "결재 메모 없음";
  request.status = status;
  request.history.push(`공개 체험판 · ${memo} · ${status}`);
  render();
  setSyncState(`${status} 처리됨`);
  setStatusMessage(`${request.id} 신청을 ${status} 처리했습니다. 이 변경은 브라우저 메모리에만 남습니다.`);
};

const resetData = () => {
  state.requests = cloneRequests();
  state.selectedId = "LR-260701";
  state.nextNumber = 260704;
  clearFilters(false);
  $("#requestForm").reset();
  $("#requestForm").elements.employee.value = "구성원 A04";
  $("#requestForm").elements.team.value = "개발";
  $("#requestForm").elements.type.value = "연차";
  $("#requestForm").elements.start.value = "2026-07-21";
  $("#requestForm").elements.end.value = "2026-07-22";
  $("#requestForm").elements.reason.value = "개인 일정";
  $("#decisionMemo").value = "일정 확인 완료";
  render();
  setSyncState("샘플 복원됨");
  setStatusMessage("초기 3건을 복원했습니다. 결재 대기 1건, 처리 완료 2건입니다.");
};

const spreadsheetSafe = (value) => {
  const text = String(value ?? "");
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
};

const csvEscape = (value) => `"${spreadsheetSafe(value).replaceAll('"', '""')}"`;

const exportCsv = () => {
  const requests = filteredRequests();
  const columns = ["id", "employee", "team", "type", "start", "end", "days", "status", "reason"];
  const labels = ["신청 번호", "신청자", "팀", "구분", "시작일", "종료일", "일수", "상태", "사유"];
  const csvRows = requests.map((request) => ({ ...request, days: requestDays(request) }));
  const csv = [labels.map(csvEscape).join(","), ...csvRows.map((request) => columns.map((column) => csvEscape(request[column])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "leave_requests_filtered.csv";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatusMessage(`현재 필터 결과 ${requests.length}건의 CSV를 브라우저에서 생성했습니다.`);
};

$("#requestRows").addEventListener("click", handleDelegatedSelection);
$("#statusBoard").addEventListener("click", handleDelegatedSelection);
$("#requestForm").addEventListener("submit", addRequest);
$("#approveButton").addEventListener("click", () => decideSelected("승인"));
$("#rejectButton").addEventListener("click", () => decideSelected("반려"));
$("#resetButton").addEventListener("click", resetData);
$("#filterResetButton").addEventListener("click", () => clearFilters());
$("#exportButton").addEventListener("click", exportCsv);

["#teamFilter", "#statusFilter", "#fromFilter", "#toFilter"].forEach((selector) => {
  $(selector).addEventListener("change", readFilters);
});

render();
setStatusMessage("초기 샘플 3건을 불러왔습니다. 결재 대기 1건, 처리 완료 2건입니다.");
