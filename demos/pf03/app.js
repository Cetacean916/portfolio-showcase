"use strict";

const SAMPLE_NAME = "sample-orders-21.csv";
const SAMPLE_CSV = `order_id,order_date,customer,phone,amount,status
SO-1001,2026.07.01,고객 A01,MASK-2201,52000,paid
SO-1002,07/01/2026,고객 A02,MASK-2202,31000,paid
SO-1003,2026-07-02,고객 A03,MASK-2203,18000,paid
SO-1004,2026/07/02,고객 A04,MASK-2204,64000,paid
SO-1005,2026-07-03,고객 A05,MASK-2205,27000,paid
SO-1006,2026-07-03,거래처 A06,MASK-2206,185000,invoice
SO-1007,2026-07-04,고객 A07,MASK-2207,43000,paid
SO-1008,2026-07-04,거래처 A08,MASK-2208,92000,invoice
SO-1009,2026-13-40,고객 B09,MASK-2209,35000,paid
SO-1010,2026-07-05,,MASK-2210,22000,paid
SO-1011,2026-07-05,고객 B11,,41000,paid
SO-1012,2026-07-06,고객 B12,MASK-2212,,paid
,2026-07-06,고객 B13,MASK-2213,33000,paid
SO-1014,wrong-date,고객 B14,MASK-2214,28000,paid
SO-1015,2026-07-07,,MASK-2215,55000,paid
SO-1016,2026-07-07,고객 B16,MASK-2216,not-a-number,paid
SO-1017,2026-02-30,고객 B17,MASK-2217,47000,paid
SO-1018,2026-07-08,고객 B18,,62000,paid
SO-1019,2026-07-08,고객 B19,MASK-2219,,paid
SO-1002,2026-07-01,고객 A02,MASK-2202,31000,paid
SO-1005,2026-07-03,고객 A05,MASK-2205,27000,paid`;

const FIELD_LABELS = {
  id: "ID",
  date: "날짜",
  name: "이름",
  phone: "연락처",
  amount: "금액",
  status: "상태",
};

const SYNONYMS = {
  id: ["order_id", "id", "apply_no", "request_id", "주문번호", "신청번호"],
  date: ["order_date", "date", "apply_date", "created_at", "날짜", "일자"],
  name: ["customer", "name", "applicant", "employee", "고객명", "이름", "거래처"],
  phone: ["phone", "mobile", "tel", "연락처", "전화번호"],
  amount: ["amount", "total", "price", "qty", "금액", "합계", "수량"],
  status: ["status", "state", "type", "상태", "구분"],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  sourceName: SAMPLE_NAME,
  mapping: {},
  result: null,
  activeTab: "clean",
};

const parseCsvLine = (line) => {
  const cells = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];
    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  cells.push(current.trim());
  return cells;
};

const parseCsv = (text) => {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) {
    throw new Error("헤더와 데이터 행이 있는 CSV를 입력해 주세요.");
  }

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const record = { sourceLine: index + 2 };
    headers.forEach((header, cellIndex) => {
      record[header] = values[cellIndex] || "";
    });
    return record;
  });

  return { headers, rows };
};

const normalizeKey = (value) => String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");

const detectMapping = (headers) => {
  const normalizedHeaders = headers.map((header) => [header, normalizeKey(header)]);
  const mapping = {};

  Object.entries(SYNONYMS).forEach(([field, candidates]) => {
    const normalizedCandidates = candidates.map(normalizeKey);
    const match = normalizedHeaders.find(([, header]) => normalizedCandidates.includes(header));
    mapping[field] = match ? match[0] : "";
  });

  return mapping;
};

const normalizeDate = (value) => {
  const raw = String(value || "").trim().replaceAll(".", "-").replaceAll("/", "-");
  const parts = raw.split("-");
  if (parts.length !== 3) return "";

  let [year, month, day] = parts;
  if (day.length === 4) {
    [year, month, day] = [day, year, month];
  }

  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  if (date.getFullYear() !== Number(year)) return "";
  if (date.getMonth() + 1 !== Number(month)) return "";
  if (date.getDate() !== Number(day)) return "";
  return iso;
};

const normalizeAmount = (value) => {
  const numeric = String(value || "").replaceAll(",", "").trim();
  if (!numeric) return "";
  const amount = Number(numeric);
  return Number.isFinite(amount) && amount >= 0 ? String(amount) : "";
};

const processCsv = (text) => {
  const parsed = parseCsv(text);
  const mapping = detectMapping(parsed.headers);
  const missingMappings = ["id", "date", "name", "phone", "amount"].filter((field) => !mapping[field]);
  if (missingMappings.length) {
    throw new Error(`필수 컬럼을 찾지 못했습니다: ${missingMappings.map((field) => FIELD_LABELS[field]).join(", ")}`);
  }

  const seen = new Set();
  const cleanRows = [];
  const invalidRows = [];
  const duplicateRows = [];

  parsed.rows.forEach((record) => {
    const pick = (field) => String(record[mapping[field]] || "").trim();
    const id = pick("id");
    const normalizedDate = normalizeDate(pick("date"));
    const name = pick("name");
    const phone = pick("phone");
    const amount = normalizeAmount(pick("amount"));
    const status = mapping.status ? pick("status") || "확인 필요" : "확인 필요";
    const reasons = [];

    if (!id) reasons.push("ID 누락");
    if (!normalizedDate) reasons.push("날짜 형식 오류");
    if (!name) reasons.push("이름 누락");
    if (!phone) reasons.push("연락처 누락");
    if (!amount) reasons.push("금액 누락 또는 형식 오류");

    const row = {
      id,
      date: normalizedDate,
      name,
      phone,
      amount,
      status,
      sourceLine: record.sourceLine,
    };

    if (id && seen.has(id)) {
      duplicateRows.push({ ...row, reason: "중복 ID" });
      return;
    }
    if (id) seen.add(id);

    if (reasons.length) {
      invalidRows.push({ ...row, reason: reasons.join(", ") });
      return;
    }

    cleanRows.push({ ...row, reason: "정상 분리" });
  });

  return {
    total: parsed.rows.length,
    headers: parsed.headers,
    mapping,
    cleanRows,
    invalidRows,
    duplicateRows,
  };
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatAmount = (value) => {
  if (value === "") return "-";
  return Number(value).toLocaleString("ko-KR");
};

const currentRows = () => {
  if (!state.result) return [];
  if (state.activeTab === "invalid") return state.result.invalidRows;
  if (state.activeTab === "duplicate") return state.result.duplicateRows;
  return state.result.cleanRows;
};

const renderMapping = () => {
  const container = $("#mappingList");
  const mapping = state.result?.mapping || {};
  container.innerHTML = Object.entries(FIELD_LABELS)
    .map(
      ([field, label]) => `
        <div>
          <dt>${escapeHtml(label)}</dt>
          <dd title="${escapeHtml(mapping[field] || "미감지")}">${escapeHtml(mapping[field] || "미감지")}</dd>
        </div>`,
    )
    .join("");
};

const renderMetrics = () => {
  const result = state.result;
  $("#metricTotal").textContent = result ? result.total : "-";
  $("#metricClean").textContent = result ? result.cleanRows.length : "-";
  $("#metricInvalid").textContent = result ? result.invalidRows.length : "-";
  $("#metricDuplicate").textContent = result ? result.duplicateRows.length : "-";
  $("#tabCleanCount").textContent = result ? result.cleanRows.length : "0";
  $("#tabInvalidCount").textContent = result ? result.invalidRows.length : "0";
  $("#tabDuplicateCount").textContent = result ? result.duplicateRows.length : "0";
};

const renderTable = () => {
  const rows = currentRows();
  const tabLabel = state.activeTab === "clean" ? "정상" : state.activeTab === "invalid" ? "오류" : "중복";
  $("#resultCaption").textContent = `${tabLabel} 행 미리보기`;
  $("#resultPanel").setAttribute("aria-labelledby", `tab-${state.activeTab}`);

  if (!state.result) {
    $("#resultRows").innerHTML = '<tr><td class="empty-row" colspan="7">CSV를 분리 실행하면 결과가 표시됩니다.</td></tr>';
    return;
  }

  if (!rows.length) {
    $("#resultRows").innerHTML = `<tr><td class="empty-row" colspan="7">${tabLabel} 행이 없습니다.</td></tr>`;
    return;
  }

  $("#resultRows").innerHTML = rows
    .map((row) => {
      const reasonClass = state.activeTab === "clean" ? "clean" : state.activeTab === "duplicate" ? "duplicate" : "";
      return `<tr>
        <td>${escapeHtml(row.id || "-")}</td>
        <td>${escapeHtml(row.date || "-")}</td>
        <td>${escapeHtml(row.name || "-")}</td>
        <td>${escapeHtml(row.phone || "-")}</td>
        <td>${escapeHtml(formatAmount(row.amount))}</td>
        <td>${escapeHtml(row.status || "-")}</td>
        <td><span class="reason-chip ${reasonClass}">${escapeHtml(row.reason)}</span></td>
      </tr>`;
    })
    .join("");
};

const setTab = (tab, focus = false) => {
  state.activeTab = tab;
  $$('[role="tab"]').forEach((button) => {
    const active = button.dataset.tab === tab;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });
  renderTable();
};

const setStatus = (message) => {
  $("#statusMessage").textContent = message;
};

const renderProcessed = (result, message) => {
  state.result = result;
  state.mapping = result.mapping;
  renderMetrics();
  renderMapping();
  setTab(state.activeTab);
  $$('[data-download]').forEach((button) => {
    button.disabled = false;
  });
  $("#runStateLabel").textContent = "분리 완료";
  $("#runStateMeta").textContent = `${result.total}행 · 브라우저 로컬 처리`;
  setStatus(message);
};

const runProcess = () => {
  try {
    const result = processCsv($("#csvInput").value);
    renderProcessed(
      result,
      `분리 완료: 전체 ${result.total}행, 정상 ${result.cleanRows.length}행, 오류 ${result.invalidRows.length}행, 중복 ${result.duplicateRows.length}행`,
    );
  } catch (error) {
    state.result = null;
    renderMetrics();
    renderMapping();
    renderTable();
    $$('[data-download]').forEach((button) => {
      button.disabled = true;
    });
    $("#runStateLabel").textContent = "입력 확인 필요";
    $("#runStateMeta").textContent = "외부 전송 없음";
    setStatus(error.message);
  }
};

const loadSample = (message = "21행 샘플을 복원하고 다시 분리했습니다.") => {
  state.sourceName = SAMPLE_NAME;
  $("#csvInput").value = SAMPLE_CSV;
  $("#sourceName").textContent = SAMPLE_NAME;
  state.activeTab = "clean";
  const result = processCsv(SAMPLE_CSV);
  renderProcessed(result, message);
};

const markDirty = () => {
  state.result = null;
  renderMetrics();
  renderMapping();
  renderTable();
  $$('[data-download]').forEach((button) => {
    button.disabled = true;
  });
  $("#runStateLabel").textContent = "수정 내용 대기";
  $("#runStateMeta").textContent = "분리 실행을 눌러주세요";
  setStatus("입력 내용이 바뀌었습니다. 분리 실행 후 결과를 확인하세요.");
};

const spreadsheetSafe = (value) => {
  const text = String(value ?? "");
  return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
};

const csvEscape = (value) => `"${spreadsheetSafe(value).replaceAll('"', '""')}"`;

const downloadResult = (kind) => {
  if (!state.result) return;
  const rows = kind === "clean" ? state.result.cleanRows : kind === "invalid" ? state.result.invalidRows : state.result.duplicateRows;
  const columns = ["id", "date", "name", "phone", "amount", "status", "reason", "sourceLine"];
  const labels = ["ID", "날짜", "이름", "연락처", "금액", "상태", "분리 사유", "원본 행"];
  const csv = [labels.map(csvEscape).join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${kind}_rows.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus(`${link.download} 파일을 브라우저에서 생성했습니다. 외부 서버에는 저장하지 않았습니다.`);
};

const handleFile = (event) => {
  const [file] = event.target.files;
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) {
    setStatus("공개 체험판에서는 2MB 이하 CSV만 열 수 있습니다.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    state.sourceName = file.name;
    $("#sourceName").textContent = file.name;
    $("#csvInput").value = String(reader.result || "");
    runProcess();
  });
  reader.addEventListener("error", () => setStatus("파일을 읽지 못했습니다. CSV 내용을 직접 붙여넣어 주세요."));
  reader.readAsText(file, "UTF-8");
  event.target.value = "";
};

$("#processButton").addEventListener("click", runProcess);
$("#sampleButton").addEventListener("click", () => loadSample());
$("#resetButton").addEventListener("click", () => loadSample("초기 21행 샘플과 분리 결과를 복원했습니다."));
$("#csvInput").addEventListener("input", markDirty);
$("#fileInput").addEventListener("change", handleFile);

$$('[role="tab"]').forEach((button, index, buttons) => {
  button.addEventListener("click", () => setTab(button.dataset.tab));
  button.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + buttons.length) % buttons.length;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % buttons.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = buttons.length - 1;
    setTab(buttons[nextIndex].dataset.tab, true);
  });
});

$$('[data-download]').forEach((button) => {
  button.addEventListener("click", () => downloadResult(button.dataset.download));
});

loadSample("샘플 21행을 브라우저에서 분리했습니다. 정상 8행, 오류 11행, 중복 2행입니다.");
