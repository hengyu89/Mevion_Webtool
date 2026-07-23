const errorAnalyzerState = {
  analysis: null,
  sortMode: "time"
};

const ERROR_ANALYZER_INCLUDED_CODE_RE = /ERROR-(?!4065\b|4060\b|46034\b|26016\b|26015\b)\d+\b/i;
const ERROR_ANALYZER_CLINICAL_STOP_RE = /Logging Abnormal Termination Condition:\s*.+\s+in CLINICAL\b/i;
const ERROR_ANALYZER_GALIL_RE = /Error detected\s*=\s*MOTION_ERROR_GALIL_INVALID_BG_WHILE_DISABLED\b/i;
const ERROR_ANALYZER_VACUUM_RE = /^(G[45])\s*\((RF|Cryostat)\)\s+(?:vacuum\s+)?pressure\s+of\s+/i;
const ERROR_ANALYZER_RS_CV_RE = /ERROR-46036\b/i;
const ERROR_ANALYZER_RS_CV_RESULT_RE = /^Range Shifter calibration check finished\.\s*Final result:\s*FAIL\b/i;

const ERROR_ANALYZER_RULES = [
  {
    id: "errorCode",
    label: "ERROR Code",
    level: "warning",
    matches: (row) => ERROR_ANALYZER_INCLUDED_CODE_RE.test(`${row.message} ${row.extra}`)
  },
  {
    id: "clinicalStop",
    label: "abnormal term.",
    level: "critical",
    matches: (row) => ERROR_ANALYZER_CLINICAL_STOP_RE.test(row.message)
  },
  {
    id: "galilDisabled",
    label: "Galil Disabled",
    level: "warning",
    matches: (row) => ERROR_ANALYZER_GALIL_RE.test(row.message)
  },
  {
    id: "vacuum",
    label: "Vacuum Error",
    level: "warning",
    matches: (row) => ERROR_ANALYZER_VACUUM_RE.test(row.message)
  }
];

function updateErrorAnalyzerToolStatus(type, message) {
  if (!window.ToolStatusRegistry || typeof window.ToolStatusRegistry.setStatus !== "function") return;
  window.ToolStatusRegistry.setStatus("tool-error-analyzer", type || "idle", message || "");
}

function initErrorAnalyzerToolPage() {
  const root = document.getElementById("errorAnalyzerToolRoot");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  root.innerHTML = `
    <div class="tool-block error-analyzer-tool">
      <div id="errorAnalyzerDropZone" class="file-drop-zone error-analyzer-drop-zone">
        <input id="errorAnalyzerFileInput" class="file-input-hidden" type="file" accept=".csv" multiple />
        <div class="file-drop-title">点击或拖拽文件到此处</div>
        <div class="file-drop-subtitle">支持格式: .csv，可一次选择多个 TCLogger 文件</div>
      </div>
      <div id="errorAnalyzerFileStatus" class="tool-file-list empty-text">尚未选择文件。</div>
      <div id="errorAnalyzerSummary" class="error-analyzer-summary"></div>
      <div id="errorAnalyzerResults" class="error-analyzer-results"></div>
    </div>
  `;

  bindErrorAnalyzerEvents();
}

function bindErrorAnalyzerEvents() {
  const dropZone = document.getElementById("errorAnalyzerDropZone");
  const fileInput = document.getElementById("errorAnalyzerFileInput");
  if (!dropZone || !fileInput) return;

  let selectedFiles = [];
  let loadedFileKey = "";

  function setStatus(message, type = "idle") {
    const status = document.getElementById("errorAnalyzerFileStatus");
    if (!status) return;
    status.className = `tool-file-list error-analyzer-file-status ${type}`;
    status.textContent = message;
    updateErrorAnalyzerToolStatus(type, message);
  }

  async function analyzeSelectedFiles() {
    if (!selectedFiles.length) {
      setStatus("尚未选择文件。", "idle");
      return;
    }

    const startTime = performance.now();
    setStatus(`已选择 ${selectedFiles.length} 份文件，正在分析... (0/${selectedFiles.length})`, "running");

    try {
      const analysis = await parseErrorAnalyzerFiles(selectedFiles, (done, total, currentFileName) => {
        setStatus(
          `已选择 ${total} 份文件，正在分析... (${done}/${total})。当前文件: ${shortenErrorAnalyzerFileName(currentFileName)}`,
          "running"
        );
      });

      errorAnalyzerState.analysis = analysis;
      renderErrorAnalyzer();
      setStatus(
        `共 ${selectedFiles.length} 份文件，耗时 ${formatErrorAnalyzerElapsed(performance.now() - startTime)}，分析完成！发现 ${analysis.alerts.length} 个需要关注的事件。`,
        "done"
      );
    } catch (error) {
      console.error(error);
      setStatus(`分析失败：${error.message}`, "error");
      alert(`分析失败：${error.message}`);
    }
  }

  function setFiles(fileListLike) {
    selectedFiles = Array.from(fileListLike || []).filter((file) =>
      String(file.name || "").toLowerCase().endsWith(".csv")
    );
    if (window.TcLogFileStore) {
      window.TcLogFileStore.setFiles(selectedFiles, "tool-error-analyzer");
      loadedFileKey = window.TcLogFileStore.getFileKey();
    }
    analyzeSelectedFiles();
  }

  function loadSharedFilesIfNeeded() {
    if (!window.TcLogFileStore || !window.TcLogFileStore.hasFiles()) return;
    const sharedFileKey = window.TcLogFileStore.getFileKey();
    if (!sharedFileKey || sharedFileKey === loadedFileKey) return;
    selectedFiles = window.TcLogFileStore.getFiles();
    loadedFileKey = sharedFileKey;
    analyzeSelectedFiles();
  }

  window.activateErrorAnalyzerToolPage = loadSharedFilesIfNeeded;

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (event) => setFiles(event.target.files));
  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    setFiles(event.dataTransfer.files);
  });

  loadSharedFilesIfNeeded();
}

async function parseErrorAnalyzerFiles(files, onProgress) {
  const orderedFiles = Array.from(files || []).sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true })
  );
  const alertMap = new Map();
  const result = {
    files: orderedFiles.map((file) => file.name),
    parsedRows: 0,
    alerts: [],
    counts: {
      errorCode: 0,
      clinicalStop: 0,
      galilDisabled: 0,
      vacuum: 0
    }
  };

  for (let index = 0; index < orderedFiles.length; index += 1) {
    const file = orderedFiles[index];
    const text = await file.text();
    parseErrorAnalyzerCsvText(text, file.name, result, alertMap);
    if (typeof onProgress === "function") {
      onProgress(index + 1, orderedFiles.length, file.name);
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  result.alerts = mergeErrorAnalyzerVacuumAlerts(
    Array.from(alertMap.values()).sort((a, b) =>
      String(a.timestamp || "").localeCompare(String(b.timestamp || ""))
    )
  );
  Object.keys(result.counts).forEach((key) => {
    result.counts[key] = result.alerts.filter((alert) => alert.ruleId === key).length;
  });
  return result;
}

function parseErrorAnalyzerCsvText(text, sourceFile, result, alertMap) {
  let headerIndexes = null;
  let logicalRowIndex = 0;
  let pendingRsAlert = null;

  parseErrorAnalyzerCsvRecords(text, (columns) => {
    if (!headerIndexes) {
      headerIndexes = getErrorAnalyzerHeaderIndexes(columns);
      return;
    }

    logicalRowIndex += 1;
    const row = makeErrorAnalyzerRow(columns, headerIndexes, sourceFile, logicalRowIndex);
    if (!row) return;
    result.parsedRows += 1;

    if (pendingRsAlert) {
      const rowDistance = row.rowIndex - pendingRsAlert.rowIndex;
      const timeDistance = parseErrorAnalyzerTimestampMs(row.timestamp) -
        parseErrorAnalyzerTimestampMs(pendingRsAlert.alert.timestamp);
      if (rowDistance > 8 || timeDistance > 1000) {
        pendingRsAlert = null;
      } else if (
        rowDistance > 0 &&
        timeDistance >= 0 &&
        ERROR_ANALYZER_RS_CV_RESULT_RE.test(row.message)
      ) {
        if (prependErrorAnalyzerMessage(pendingRsAlert.alert, row.message)) {
          pendingRsAlert.alert.relatedRows += 1;
        }
        pendingRsAlert = null;
      }
    }

    const rule = ERROR_ANALYZER_RULES.find((candidate) => candidate.matches(row));
    if (!rule) return;

    const alert = makeErrorAnalyzerAlert(row, rule);
    const key = getErrorAnalyzerAlertKey(alert);
    const existing = alertMap.get(key);
    if (!existing) {
      alertMap.set(key, alert);
      if (alert.ruleLabel === "RS CV") {
        pendingRsAlert = { alert, rowIndex: row.rowIndex };
      }
      return;
    }

    if (appendErrorAnalyzerMessage(existing, alert.message)) {
      existing.relatedRows += 1;
    }
    existing.note = mergeErrorAnalyzerNotes(existing.note, alert.note);
    if (getErrorAnalyzerMessagePriority(alert.message) > getErrorAnalyzerMessagePriority(existing.message)) {
      existing.extra = alert.extra;
      existing.category = alert.category;
      existing.severity = alert.severity;
    }
  });
}

function makeErrorAnalyzerAlert(row, rule) {
  const vacuumMatch = row.message.match(ERROR_ANALYZER_VACUUM_RE);
  const type = getErrorAnalyzerType(row, rule);
  return {
    ruleId: rule.id,
    ruleLabel: type.label,
    level: type.level,
    timestamp: row.timestamp,
    severity: row.severity,
    source: row.source,
    subsystem: row.subsystem,
    category: row.category,
    message: row.message,
    messages: [row.message],
    extra: row.extra,
    sourceFile: row.sourceFile,
    rowIndex: row.rowIndex,
    vacuumSensor: vacuumMatch ? `${vacuumMatch[1].toUpperCase()} (${vacuumMatch[2]})` : "",
    note: getErrorAnalyzerNote(row, rule),
    relatedRows: 1
  };
}

function getErrorAnalyzerType(row, rule) {
  if (rule.id === "errorCode" && ERROR_ANALYZER_RS_CV_RE.test(row.message)) {
    return { label: "RS CV", level: "warning" };
  }
  return { label: rule.label, level: rule.level };
}

function getErrorAnalyzerNote(row, rule) {
  if (rule.id === "galilDisabled") return "OG disabled";
  if (rule.id === "clinicalStop") return "dTime";
  if (rule.id === "errorCode" && /ERROR-46036\b/i.test(row.message)) return "sRSPos";
  if (rule.id === "vacuum" && /^G4\s*\(Cryostat\)/i.test(row.message)) return "Cryostat Vacuum";
  return "";
}

function mergeErrorAnalyzerVacuumAlerts(alerts) {
  const merged = [];
  alerts.forEach((alert) => {
    const previous = merged[merged.length - 1];
    const shouldMerge = previous &&
      previous.ruleId === "vacuum" &&
      alert.ruleId === "vacuum" &&
      Math.abs(parseErrorAnalyzerTimestampMs(alert.timestamp) - parseErrorAnalyzerTimestampMs(previous.timestamp)) <= 1500;

    if (!shouldMerge) {
      merged.push({ ...alert, messages: Array.from(alert.messages || [alert.message]) });
      return;
    }

    (alert.messages || [alert.message]).forEach((message) => appendErrorAnalyzerMessage(previous, message));
    previous.message = previous.messages.join("\n");
    previous.note = mergeErrorAnalyzerNotes(previous.note, alert.note);
    previous.relatedRows += alert.relatedRows;
  });
  return merged;
}

function mergeErrorAnalyzerNotes(left, right) {
  return Array.from(new Set([left, right].filter(Boolean))).join(" / ");
}

function appendErrorAnalyzerMessage(alert, message) {
  if (!message) return false;
  if (!Array.isArray(alert.messages)) alert.messages = [alert.message].filter(Boolean);
  if (alert.messages.includes(message)) return false;
  alert.messages.push(message);
  alert.message = alert.messages.join("\n");
  return true;
}

function prependErrorAnalyzerMessage(alert, message) {
  if (!message) return false;
  if (!Array.isArray(alert.messages)) alert.messages = [alert.message].filter(Boolean);
  if (alert.messages.includes(message)) return false;
  alert.messages.unshift(message);
  alert.message = alert.messages.join("\n");
  return true;
}

function getErrorAnalyzerAlertKey(alert) {
  if (alert.ruleId === "vacuum") {
    return `${alert.ruleId}|${alert.timestamp}|${alert.vacuumSensor}`;
  }
  return `${alert.ruleId}|${alert.timestamp}|${alert.message}`;
}

function getErrorAnalyzerMessagePriority(message) {
  const text = String(message || "");
  if (/INTERLOCK threshold/i.test(text)) return 3;
  if (/ERROR threshold/i.test(text)) return 2;
  if (/WARNING threshold/i.test(text)) return 1;
  return 0;
}

function parseErrorAnalyzerCsvRecords(text, onRecord) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  let field = "";
  let record = [];
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      inQuotes = true;
    } else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field.replace(/\r$/, ""));
      if (record.some((value) => value !== "")) onRecord(record);
      field = "";
      record = [];
    } else {
      field += char;
    }
  }

  if (field || record.length) {
    record.push(field.replace(/\r$/, ""));
    if (record.some((value) => value !== "")) onRecord(record);
  }
}

function getErrorAnalyzerHeaderIndexes(header) {
  const normalized = header.map((value) => String(value || "").trim());
  const indexes = {
    timestamp: normalized.indexOf("TC Timestamp"),
    severity: normalized.indexOf("Severity"),
    source: normalized.indexOf("Source"),
    subsystem: normalized.indexOf("Subsystem"),
    category: normalized.indexOf("Category"),
    message: normalized.indexOf("Message Text"),
    extra: normalized.indexOf("Extra Text")
  };
  if (indexes.timestamp < 0 || indexes.category < 0 || indexes.message < 0) {
    throw new Error("CSV 中未找到 TC Timestamp、Category 或 Message Text 列。");
  }
  return indexes;
}

function makeErrorAnalyzerRow(columns, indexes, sourceFile, rowIndex) {
  const get = (index) => (index >= 0 ? String(columns[index] || "").trim() : "");
  const timestamp = get(indexes.timestamp);
  const message = get(indexes.message);
  if (!timestamp && !message) return null;
  return {
    rowIndex,
    sourceFile,
    timestamp,
    severity: get(indexes.severity).toUpperCase(),
    source: get(indexes.source),
    subsystem: get(indexes.subsystem),
    category: get(indexes.category).toUpperCase(),
    message,
    extra: get(indexes.extra)
  };
}

function renderErrorAnalyzer() {
  const analysis = errorAnalyzerState.analysis;
  const summary = document.getElementById("errorAnalyzerSummary");
  const results = document.getElementById("errorAnalyzerResults");
  if (!analysis || !summary || !results) return;

  const countType = (label) => analysis.alerts.filter((alert) => alert.ruleLabel === label).length;
  const otherErrorCount = analysis.alerts.filter((alert) =>
    alert.ruleId === "errorCode" && alert.ruleLabel !== "RS CV"
  ).length;

  summary.innerHTML = `
    <strong>需关注事件: ${analysis.alerts.length}</strong>
    <span class="error-analyzer-summary-item level-critical">abnormal term. <b>${countType("abnormal term.")}</b></span>
    <span class="error-analyzer-summary-item level-warning">Vacuum Error <b>${countType("Vacuum Error")}</b></span>
    <span class="error-analyzer-summary-item level-warning">Galil Disabled <b>${countType("Galil Disabled")}</b></span>
    <span class="error-analyzer-summary-item level-warning">RS CV <b>${countType("RS CV")}</b></span>
    ${otherErrorCount ? `<span class="error-analyzer-summary-item level-warning">ERROR Code <b>${otherErrorCount}</b></span>` : ""}
    <small>仅显示当前已确认的关注规则</small>
  `;

  if (!analysis.alerts.length) {
    results.innerHTML = '<div class="error-analyzer-empty">未发现当前规则内需要关注的报错。</div>';
    return;
  }

  const sortedAlerts = getSortedErrorAnalyzerAlerts(analysis.alerts);
  const sortMeta = getErrorAnalyzerSortMeta();

  results.innerHTML = `
    <div class="error-analyzer-table-wrap">
      <table class="error-analyzer-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Time</th>
            <th class="error-analyzer-type-heading" aria-sort="${sortMeta.ariaSort}">
              Type
              <button id="errorAnalyzerTypeSort" class="error-analyzer-sort-button ${sortMeta.className}" type="button"
                aria-label="${sortMeta.label}" title="${sortMeta.label}">
                <span class="error-analyzer-sort-caret caret-up" aria-hidden="true"></span>
                <span class="error-analyzer-sort-caret caret-down" aria-hidden="true"></span>
              </button>
            </th>
            <th>Notes</th>
            <th>Message Text</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${sortedAlerts.map((alert, index) => renderErrorAnalyzerRow(alert, index)).join("")}
        </tbody>
      </table>
    </div>
  `;

  document.getElementById("errorAnalyzerTypeSort")?.addEventListener("click", () => {
    const modes = ["time", "type-asc", "type-desc"];
    const currentIndex = modes.indexOf(errorAnalyzerState.sortMode);
    errorAnalyzerState.sortMode = modes[(currentIndex + 1) % modes.length];
    renderErrorAnalyzer();
  });
}

function getSortedErrorAnalyzerAlerts(alerts) {
  const sorted = Array.from(alerts || []);
  const direction = errorAnalyzerState.sortMode === "type-desc" ? -1 : 1;
  sorted.sort((left, right) => {
    if (errorAnalyzerState.sortMode !== "time") {
      const typeOrder = String(left.ruleLabel || "").localeCompare(
        String(right.ruleLabel || ""),
        undefined,
        { sensitivity: "base", numeric: true }
      );
      if (typeOrder) return typeOrder * direction;
    }

    const leftTime = parseErrorAnalyzerTimestampMs(left.timestamp);
    const rightTime = parseErrorAnalyzerTimestampMs(right.timestamp);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return Number(left.rowIndex || 0) - Number(right.rowIndex || 0);
  });
  return sorted;
}

function getErrorAnalyzerSortMeta() {
  if (errorAnalyzerState.sortMode === "type-asc") {
    return { className: "sort-ascending", ariaSort: "ascending", label: "Type 正序分组；组内按时间从早到晚" };
  }
  if (errorAnalyzerState.sortMode === "type-desc") {
    return { className: "sort-descending", ariaSort: "descending", label: "Type 倒序分组；组内按时间从早到晚" };
  }
  return { className: "sort-neutral", ariaSort: "none", label: "当前按时间排序；点击后按 Type 分组" };
}

function renderErrorAnalyzerRow(alert, index) {
  const timestamp = splitErrorAnalyzerTimestamp(alert.timestamp);
  return `
    <tr class="error-analyzer-row level-${alert.level}">
      <td class="error-analyzer-index">${index + 1}</td>
      <td>${escapeErrorAnalyzerHtml(timestamp.date)}</td>
      <td>${escapeErrorAnalyzerHtml(timestamp.time)}</td>
      <td><span class="error-analyzer-type type-${alert.level}">${escapeErrorAnalyzerHtml(alert.ruleLabel)}</span></td>
      <td class="error-analyzer-note">${renderErrorAnalyzerNote(alert)}</td>
      <td>
        <div class="error-analyzer-message">${renderErrorAnalyzerMessages(alert)}</div>
      </td>
      <td>${escapeErrorAnalyzerHtml([alert.source, alert.subsystem].filter((value) => value && value !== "null").join(" / ") || "-")}</td>
    </tr>
  `;
}

function renderErrorAnalyzerNote(alert) {
  const summary = getErrorAnalyzerNoteSummary(alert);
  const code = String(alert.note || "").trim();
  const showCode = code && code.toLowerCase() !== summary.toLowerCase();
  return `
    <div class="error-analyzer-note-summary">${escapeErrorAnalyzerHtml(summary || code || "-")}</div>
    ${showCode ? `<div class="error-analyzer-note-code">${escapeErrorAnalyzerHtml(code)}</div>` : ""}
  `;
}

function getErrorAnalyzerNoteSummary(alert) {
  if (alert.ruleId === "clinicalStop") {
    const match = String(alert.message || "").match(/Condition:\s*(.+?)\s+in\s+CLINICAL\b/i);
    if (match) {
      const words = match[1].toLowerCase().replace(/_/g, " ");
      return words.charAt(0).toUpperCase() + words.slice(1);
    }
  }

  if (alert.ruleId === "vacuum") {
    const priority = { INTERLOCK: 2, WARNING: 1 };
    const sensorLevels = new Map();
    (alert.messages || [alert.message]).forEach((message) => {
      const match = String(message || "").match(/^(G[45])\s*\([^)]+\).*?exceeds\s+(WARNING|INTERLOCK)\b/i);
      if (!match) return;
      const sensor = match[1].toUpperCase();
      const level = match[2].toUpperCase();
      if (!sensorLevels.has(sensor) || priority[level] > priority[sensorLevels.get(sensor)]) {
        sensorLevels.set(sensor, level);
      }
    });
    const findings = Array.from(sensorLevels.entries())
      .sort((left, right) => priority[right[1]] - priority[left[1]] || left[0].localeCompare(right[0]))
      .map(([sensor, level]) => `${sensor} ${level.charAt(0)}${level.slice(1).toLowerCase()}`);
    if (findings.length) return findings.join(" / ");
  }

  if (alert.ruleLabel === "RS CV") {
    const match = String(alert.message || "").match(/Plate\s+(\d+)/i);
    return `CV failed${match ? ` - Plate ${match[1]}` : ""}`;
  }

  return String(alert.note || alert.ruleLabel || "");
}

function renderErrorAnalyzerMessages(alert) {
  const messages = Array.isArray(alert.messages) && alert.messages.length
    ? alert.messages
    : String(alert.message || "").split("\n");
  return messages.map((message) =>
    `<div class="error-analyzer-message-line">${highlightErrorAnalyzerMessage(message, alert)}</div>`
  ).join("");
}

function highlightErrorAnalyzerMessage(message, alert) {
  let html = escapeErrorAnalyzerHtml(message);

  if (alert.ruleId === "vacuum") {
    html = html.replace(/^((?:G[45])\s*\([^)]+\))/i, '<span class="error-analyzer-evidence-label">$1</span>');
    html = html.replace(
      /(pressure of\s*)(\d+(?:\.\d+)?e[+-]\d+)(\s+torr exceeds\s*)(WARNING|INTERLOCK)(\s+threshold of\s*)(\d+(?:\.\d+)?e[+-]\d+)/i,
      (match, beforeValue, value, beforeLevel, level, beforeThreshold, threshold) => {
        const normalizedLevel = level.toLowerCase();
        return `${beforeValue}<span class="error-analyzer-measured-value">${value}</span>${beforeLevel}` +
          `<span class="error-analyzer-severity-token level-${normalizedLevel}">${level}</span>${beforeThreshold}` +
          `<span class="error-analyzer-threshold-value">${threshold}</span>`;
      }
    );
    return html;
  }

  if (alert.ruleId === "clinicalStop") {
    html = html.replace(
      /(Logging Abnormal Termination Condition:\s*)(.+?)(\s+in\s+CLINICAL\b)/i,
      '$1<span class="error-analyzer-critical-token">$2</span>$3'
    );
    return html;
  }

  if (alert.ruleLabel === "RS CV") {
    html = html.replace(/(Range\s+Shifter calibration check)/gi, '<span class="error-analyzer-evidence-label">$1</span>');
    html = html.replace(/(Final result:\s*FAIL)/gi, '<span class="error-analyzer-warning-token">$1</span>');
    html = html.replace(/(ERROR-46036)/gi, '<span class="error-analyzer-warning-token">$1</span>');
    html = html.replace(/(Plate\s+\d+)/gi, '<span class="error-analyzer-evidence-label">$1</span>');
  }
  return html;
}

function splitErrorAnalyzerTimestamp(timestamp) {
  const match = String(timestamp || "").match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
  return match ? { date: match[1], time: match[2] } : { date: "-", time: String(timestamp || "-") };
}

function parseErrorAnalyzerTimestampMs(timestamp) {
  const match = String(timestamp || "").match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
  if (!match) return NaN;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    Number(String(match[7] || "0").slice(0, 3).padEnd(3, "0"))
  ).getTime();
}

function formatErrorAnalyzerElapsed(elapsedMs) {
  if (elapsedMs < 1000) return `${Math.max(0.1, Math.round(elapsedMs / 100) / 10).toFixed(1)} s`;
  return `${(elapsedMs / 1000).toFixed(1)} s`;
}

function shortenErrorAnalyzerFileName(fileName) {
  const text = String(fileName || "");
  return text.length > 42 ? `${text.slice(0, 39)}...` : text;
}

function escapeErrorAnalyzerHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
