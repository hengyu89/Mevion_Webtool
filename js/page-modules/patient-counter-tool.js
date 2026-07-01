const patientCounterState = {
  rows: [],
  currentPage: 1,
  pageSize: 30
};

function updatePatientCounterToolStatus(type, message) {
  if (!window.ToolStatusRegistry || typeof window.ToolStatusRegistry.setStatus !== "function") return;
  const statusMap = {
    idle: "idle",
    running: "running",
    done: "done",
    error: "error"
  };
  window.ToolStatusRegistry.setStatus("tool-patient-counter", statusMap[type] || "idle", message || "");
}

function initPatientCounterToolPage() {
  const root = document.getElementById("patientCounterToolRoot");
  if (!root) return;
  if (root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  patientCounterState.rows = [];
  patientCounterState.currentPage = 1;

  root.innerHTML = `
    <div class="tool-block patient-counter-tool">
      <div id="patientDropZone" class="file-drop-zone patient-drop-zone">
        <input id="patientFileInput" class="file-input-hidden" type="file" accept=".csv" multiple />
        <div class="file-drop-title">点击或拖拽文件到此处</div>
        <div class="file-drop-subtitle">支持格式: .csv，可一次选择多个 TCLogger 文件</div>
      </div>

      <div id="patientFileStatus" class="tool-file-list empty-text">尚未选择文件。</div>
      <div id="patientSummary" class="tool-summary"></div>
      <div id="patientResultTableWrap" class="tool-table-wrap patient-table-wrap"></div>
    </div>
  `;

  bindPatientCounterEvents();
}

function bindPatientCounterEvents() {
  const dropZone = document.getElementById("patientDropZone");
  const fileInput = document.getElementById("patientFileInput");
  if (!dropZone || !fileInput) return;

  let selectedFiles = [];
  let loadedFileKey = "";

  function setStatus(message, type = "idle") {
    const status = document.getElementById("patientFileStatus");
    if (!status) return;
    status.className = `tool-file-list patient-file-status ${type}`;
    status.textContent = message;
    updatePatientCounterToolStatus(type, message);
  }

  async function analyzeSelectedFiles() {
    if (!selectedFiles.length) {
      setStatus("尚未选择文件。", "idle");
      return;
    }

    const startTime = performance.now();

    setStatus(
      `已选择 ${selectedFiles.length} 份文件，正在分析... (0/${selectedFiles.length})`,
      "running"
    );

    try {
      const rows = await parsePatientCounterFiles(selectedFiles, (done, total, currentFileName) => {
        const shortName = shortenPatientFileName(currentFileName);
        setStatus(
          `已选择 ${total} 份文件，正在分析... (${done}/${total})。当前文件: ${shortName}`,
          "running"
        );
      });

      renderPatientCounterResults(rows);

      const newCount = rows.filter((row) => row.isNew).length;
      const elapsedMs = performance.now() - startTime;
      setStatus(
        `共 ${selectedFiles.length} 份文件，耗时 ${formatPatientElapsed(elapsedMs)}，分析完成！共 ${rows.length} 个病人，其中 ${newCount} 个 Frac 1。`,
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
      file.name.toLowerCase().endsWith(".csv")
    );
    if (window.TcLogFileStore) {
      window.TcLogFileStore.setFiles(selectedFiles, "tool-patient-counter");
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

  window.activatePatientCounterToolPage = loadSharedFilesIfNeeded;

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (event) => {
    setFiles(event.target.files);
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    setFiles(event.dataTransfer.files);
  });

  loadSharedFilesIfNeeded();
}

async function parsePatientCounterFiles(files, onProgress) {
  const orderedFiles = sortPatientCounterFiles(files);
  const patientMap = new Map();
  const context = {
    currentPatientId: "",
    patientStartById: new Map(),
    currentPlanStartById: new Map()
  };

  const total = orderedFiles.length;

  for (let fileIndex = 0; fileIndex < orderedFiles.length; fileIndex += 1) {
    const file = orderedFiles[fileIndex];

    if (typeof onProgress === "function") {
      onProgress(fileIndex + 1, total, file.name);
    }

    await parsePatientCounterFileStream(file, patientMap, context, file.name);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return Array.from(patientMap.values())
    .map((item) => {
      const fractions = Array.from(item.fractions || [])
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      const beams = Array.from(item.beams || [])
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
        .map(String);
      return {
        ...item,
        beams,
        fractions,
        fraction: fractions.length ? Math.max(...fractions) : "",
        fractionDisplay: formatPatientFractionRange(fractions),
        treatmentDurationMs: getPatientTotalTreatmentDurationMs(item),
        ...getPatientTreatmentWindow(item),
        isNew: fractions.includes(1)
      };
    })
    .sort((a, b) => {
      const timeA = Number.isFinite(a.startTimeMs) ? a.startTimeMs : 0;
      const timeB = Number.isFinite(b.startTimeMs) ? b.startTimeMs : 0;
      return timeA - timeB;
    });
}

function sortPatientCounterFiles(files) {
  return Array.from(files || [])
    .map((file, index) => ({
      file,
      index,
      sortTime: getPatientFileSortTime(file)
    }))
    .sort((a, b) => {
      if (Number.isFinite(a.sortTime) && Number.isFinite(b.sortTime) && a.sortTime !== b.sortTime) {
        return a.sortTime - b.sortTime;
      }
      if (Number.isFinite(a.sortTime) !== Number.isFinite(b.sortTime)) {
        return Number.isFinite(a.sortTime) ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map((item) => item.file);
}

function getPatientFileSortTime(file) {
  const name = String((file && file.name) || "");
  const match = name.match(/TCLogger\.(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})/i);
  if (match) {
    const [, y, m, d, hh, mm, ss] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)).getTime();
  }

  const lastModified = file && Number(file.lastModified);
  return Number.isFinite(lastModified) ? lastModified : NaN;
}

async function parsePatientCounterFileStream(file, patientMap, context, sourceFileName) {
  if (!file.stream || typeof TextDecoder === "undefined") {
    const text = await file.text();
    parsePatientCounterTextDirect(text, patientMap, context, sourceFileName);
    return;
  }

  const reader = file.stream().getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let headerIndexes = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      let lineBreakIndex = buffer.indexOf("\n");
      while (lineBreakIndex !== -1) {
        const line = buffer.slice(0, lineBreakIndex).replace(/\r$/, "");
        buffer = buffer.slice(lineBreakIndex + 1);
        headerIndexes = parsePatientCounterRelevantLine(line, headerIndexes, patientMap, context, sourceFileName);
        lineBreakIndex = buffer.indexOf("\n");
      }

      if (done) break;
    }

    if (buffer) {
      headerIndexes = parsePatientCounterRelevantLine(buffer.replace(/\r$/, ""), headerIndexes, patientMap, context, sourceFileName);
    }
  } finally {
    reader.releaseLock();
  }
}

function parsePatientCounterTextDirect(text, patientMap, context, sourceFileName) {
  let headerIndexes = null;
  let start = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  for (let i = start; i <= text.length; i += 1) {
    if (i === text.length || text[i] === "\n") {
      const line = text.slice(start, i).replace(/\r$/, "");
      headerIndexes = parsePatientCounterRelevantLine(line, headerIndexes, patientMap, context, sourceFileName);
      start = i + 1;
    }
  }
}

function parsePatientCounterRelevantLine(line, headerIndexes, patientMap, context, sourceFileName) {
  if (!line) return headerIndexes;

  if (!headerIndexes) {
    const cleanLine = line.replace(/^\uFEFF/, "");
    const header = parsePatientCsvLine(cleanLine);
    return {
      timestamp: header.indexOf("TC Timestamp"),
      message: header.indexOf("Message Text")
    };
  }

  if (
    line.indexOf("/Debug/") === -1 &&
    line.indexOf("Saving dosimetry record at") === -1 &&
    line.indexOf("Treatment Record ") === -1 &&
    line.toLowerCase().indexOf("beam number") === -1 &&
    line.toLowerCase().indexOf("fraction number:") === -1
  ) {
    return headerIndexes;
  }

  const cols = parsePatientCsvLine(line);
  const tcTimestamp = cols[headerIndexes.timestamp] || "";
  const message = cols[headerIndexes.message] || "";
  const tcTimeMs = parsePatientTimestamp(tcTimestamp);

  const planOpenMatch = message.match(/Saving DICOM file\s*\([^)]*\/exams\/([A-Za-z0-9_-]+)\/Debug\/BDI[^)]*/i);
  if (planOpenMatch) {
    const patientId = planOpenMatch[1];
    if (!isValidRealPatientId(patientId)) return headerIndexes;
    context.currentPatientId = patientId;

    const existingStart = context.patientStartById.get(patientId);
    if (!existingStart || (Number.isFinite(tcTimeMs) && tcTimeMs < existingStart.timeMs)) {
      context.patientStartById.set(patientId, {
        timeMs: tcTimeMs,
        timestamp: tcTimestamp,
        sourceFileName
      });
    }

    if (Number.isFinite(tcTimeMs)) {
      context.currentPlanStartById.set(patientId, {
        timeMs: tcTimeMs,
        timestamp: tcTimestamp,
        sourceFileName
      });
    }

    updatePatientRecord(patientMap, patientId, {
      startTimeMs: tcTimeMs,
      startTimestamp: tcTimestamp,
      sourceFileName,
      source: "Plan Open"
    });
  }

  const dosrecMatch = message.match(/Saving dosimetry record at\s+([^"]*?Frac(\d+)\.csv)/i);
  if (dosrecMatch) {
    const dosrecPath = dosrecMatch[1] || "";
    const pathPatientMatch = dosrecPath.match(/\/exams\/(\d{6,})\//i);
    const patientId = context.currentPatientId || (pathPatientMatch ? pathPatientMatch[1] : "");
    if (!isValidRealPatientId(patientId)) return headerIndexes;
    const beamMatch = dosrecPath.match(/Beam[_-]?(\d+)/i);
    const rawBeam = beamMatch ? Number(beamMatch[1]) : NaN;
    const beam = Number.isFinite(rawBeam) ? Math.max(1, rawBeam - 1) : "";
    const fraction = Number(dosrecMatch[2]);
    const startInfo = context.patientStartById.get(patientId);
    const sessionStartInfo = context.currentPlanStartById.get(patientId) || startInfo;

    context.currentPatientId = patientId;
    updatePatientRecord(patientMap, patientId, {
      fraction,
      beam,
      startTimeMs: startInfo && Number.isFinite(startInfo.timeMs) ? startInfo.timeMs : tcTimeMs,
      sessionStartTimeMs: sessionStartInfo && Number.isFinite(sessionStartInfo.timeMs) ? sessionStartInfo.timeMs : tcTimeMs,
      sessionStartTimestamp: sessionStartInfo ? sessionStartInfo.timestamp : tcTimestamp,
      endTimeMs: tcTimeMs,
      startTimestamp: startInfo ? startInfo.timestamp : tcTimestamp,
      endTimestamp: tcTimestamp,
      sourceFileName,
      source: "Dosimetry Record"
    });
    return headerIndexes;
  }

  const treatmentRecordMatch = message.match(/Treatment Record\s+.+?\s+for Patient\s+([A-Za-z0-9_-]+)\..*?\bFraction\s+(\d+)\./i);
  if (treatmentRecordMatch) {
    const patientId = treatmentRecordMatch[1];
    if (!isValidRealPatientId(patientId)) return headerIndexes;
    const fraction = Number(treatmentRecordMatch[2]);
    const startInfo = context.patientStartById.get(patientId);
    const sessionStartInfo = context.currentPlanStartById.get(patientId) || startInfo;

    context.currentPatientId = patientId;
    updatePatientRecord(patientMap, patientId, {
      fraction,
      startTimeMs: startInfo && Number.isFinite(startInfo.timeMs) ? startInfo.timeMs : tcTimeMs,
      sessionStartTimeMs: sessionStartInfo && Number.isFinite(sessionStartInfo.timeMs) ? sessionStartInfo.timeMs : tcTimeMs,
      sessionStartTimestamp: sessionStartInfo ? sessionStartInfo.timestamp : tcTimestamp,
      endTimeMs: tcTimeMs,
      startTimestamp: startInfo ? startInfo.timestamp : tcTimestamp,
      endTimestamp: tcTimestamp,
      sourceFileName,
      source: "Treatment Record"
    });
    return headerIndexes;
  }

  const beamFractionMatch = message.match(/\bBeam Number:\s*(\d+),\s*Fraction Number:\s*(\d+)/i);
  if (beamFractionMatch && context.currentPatientId) {
    const existingRecord = patientMap.get(context.currentPatientId);
    if (existingRecord) {
      updatePatientRecord(patientMap, context.currentPatientId, {
        beam: Number(beamFractionMatch[1]),
        fraction: Number(beamFractionMatch[2]),
        sourceFileName
      });
    }
    return headerIndexes;
  }

  const beamMatch = message.match(/^Beam number:\s*(\d+)/i);
  if (beamMatch && context.currentPatientId) {
    const existingRecord = patientMap.get(context.currentPatientId);
    if (existingRecord) {
      updatePatientRecord(patientMap, context.currentPatientId, {
        beam: Number(beamMatch[1]),
        sourceFileName
      });
    }
    return headerIndexes;
  }

  const fractionMatch = message.match(/Fraction Number:\s*(\d+)/i);
  if (fractionMatch && context.currentPatientId) {
    const fraction = Number(fractionMatch[1]);

    const existingRecord = patientMap.get(context.currentPatientId);
    if (existingRecord) {
      updatePatientRecord(patientMap, context.currentPatientId, {
        fraction,
        sourceFileName,
        source: "Fraction Number"
      });
    }
  }

  return headerIndexes;
}

function ensurePatientRecord(patientMap, patientId, data) {
  if (!patientId) return null;

  if (!patientMap.has(patientId)) {
    patientMap.set(patientId, {
      patientId,
      fraction: null,
      fractions: new Set(),
      beams: new Set(),
      sessionsByFraction: new Map(),
      startTimeMs: Number.isFinite(data.startTimeMs) ? data.startTimeMs : null,
      endTimeMs: Number.isFinite(data.endTimeMs) ? data.endTimeMs : null,
      startTimestamp: data.startTimestamp || "",
      endTimestamp: data.endTimestamp || "",
      sourceFileName: data.sourceFileName || "",
      source: data.source || ""
    });
  }

  return patientMap.get(patientId);
}

function updatePatientRecord(patientMap, patientId, data) {
  const record = ensurePatientRecord(patientMap, patientId, data);
  if (!record) return;

  if (Number.isFinite(data.fraction)) {
    record.fractions.add(Number(data.fraction));
    record.fraction = Math.max(...Array.from(record.fractions).map(Number));
  }

  if (
    Number.isFinite(data.fraction) &&
    Number.isFinite(data.sessionStartTimeMs) &&
    Number.isFinite(data.endTimeMs)
  ) {
    const sessionKey = String(Number(data.fraction));
    const currentSession = record.sessionsByFraction.get(sessionKey);
    if (!currentSession) {
      record.sessionsByFraction.set(sessionKey, {
        startTimeMs: data.sessionStartTimeMs,
        endTimeMs: data.endTimeMs,
        startTimestamp: data.sessionStartTimestamp || data.startTimestamp || "",
        endTimestamp: data.endTimestamp || ""
      });
    } else {
      if (data.sessionStartTimeMs < currentSession.startTimeMs) {
        currentSession.startTimeMs = data.sessionStartTimeMs;
        currentSession.startTimestamp = data.sessionStartTimestamp || data.startTimestamp || currentSession.startTimestamp;
      }
      if (data.endTimeMs >= currentSession.endTimeMs) {
        currentSession.endTimeMs = data.endTimeMs;
        currentSession.endTimestamp = data.endTimestamp || currentSession.endTimestamp;
      }
    }
  }

  if (data.beam) {
    record.beams.add(String(data.beam));
  }

  if (Number.isFinite(data.startTimeMs)) {
    if (!Number.isFinite(record.startTimeMs) || data.startTimeMs < record.startTimeMs) {
      record.startTimeMs = data.startTimeMs;
      record.startTimestamp = data.startTimestamp || record.startTimestamp;
    }
  }

  if (Number.isFinite(data.endTimeMs)) {
    if (!Number.isFinite(record.endTimeMs) || data.endTimeMs >= record.endTimeMs) {
      record.endTimeMs = data.endTimeMs;
      record.endTimestamp = data.endTimestamp || record.endTimestamp;
      record.sourceFileName = data.sourceFileName || record.sourceFileName;
      record.source = data.source || record.source;
    }
  }
}

function renderPatientCounterResults(rows) {
  patientCounterState.rows = rows;
  patientCounterState.currentPage = 1;
  renderPatientCounterTableAndSummary();
}

function renderPatientCounterTableAndSummary() {
  const summary = document.getElementById("patientSummary");
  const wrap = document.getElementById("patientResultTableWrap");
  if (!summary || !wrap) return;

  const rows = patientCounterState.rows;
  const newCount = rows.filter((row) => row.isNew).length;
  const pageSize = patientCounterState.pageSize;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(patientCounterState.currentPage, totalPages);
  patientCounterState.currentPage = currentPage;
  const start = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  summary.innerHTML = `
    <div class="summary-row patient-summary-row">
      <div class="summary-card patient-count-card"><strong>治疗人数：</strong>${rows.length}</div>
      <div class="summary-card patient-new-card"><strong>Frac 1 数：</strong>${newCount}</div>
      <div class="table-pagination compact-pagination patient-pagination">
        <div class="pagination-info compact-pagination-info">
          第
          <input
            id="patientPageInput"
            class="page-jump-input compact-page-jump-input"
            type="number"
            min="1"
            max="${totalPages}"
            value="${currentPage}"
          />
          / ${totalPages} 页
        </div>
        <button id="patientPrevPageBtn" class="tool-btn pagination-btn" ${currentPage <= 1 ? "disabled" : ""}>上一页</button>
        <button id="patientNextPageBtn" class="tool-btn pagination-btn" ${currentPage >= totalPages ? "disabled" : ""}>下一页</button>
      </div>
    </div>
    <div class="patient-summary-note">Frac1 可能代表新病人，也可能代表改了计划</div>
  `;

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-text patient-empty">未提取到病人治疗记录。</div>`;
    bindPatientPaginationEvents(totalPages);
    return;
  }

  wrap.innerHTML = `
    <table class="tool-table patient-counter-table">
      <thead>
        <tr>
          <th class="patient-index-col">#</th>
          <th>Patient ID</th>
          <th>第几次治疗</th>
          <th>status</th>
          <th>开始时间</th>
          <th>结束时间</th>
          <th>治疗耗时</th>
          <th>射野</th>
          <th>来源</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows
          .map((row, index) => {
            const beams = Array.from(row.beams || []).sort((a, b) => Number(a) - Number(b)).join(", ");
            return `
              <tr class="${row.isNew ? "patient-new-row" : ""}">
                <td class="muted-cell">${start + index + 1}</td>
                <td class="patient-id-cell">${escapePatientHtml(row.patientId)}</td>
                <td class="patient-fraction-cell">${row.fractionDisplay ? escapePatientHtml(row.fractionDisplay) : "-"}</td>
                <td>${row.isNew ? `<span class="patient-new-badge">NEW</span>` : `<span class="patient-normal-badge">-</span>`}</td>
                <td>${escapePatientHtml(formatPatientTimeOnly(row.startTimestamp))}</td>
                <td>${escapePatientHtml(formatPatientTimeOnly(row.endTimestamp))}</td>
                <td>${escapePatientHtml(formatPatientDuration(row.treatmentDurationMs))}</td>
                <td>${escapePatientHtml(beams || "-")}</td>
                <td>${escapePatientHtml(row.source || "-")}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;

  bindPatientPaginationEvents(totalPages);
}

function bindPatientPaginationEvents(totalPages) {
  const prevBtn = document.getElementById("patientPrevPageBtn");
  const nextBtn = document.getElementById("patientNextPageBtn");
  const pageInput = document.getElementById("patientPageInput");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      patientCounterState.currentPage = Math.max(1, patientCounterState.currentPage - 1);
      renderPatientCounterTableAndSummary();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      patientCounterState.currentPage = Math.min(totalPages, patientCounterState.currentPage + 1);
      renderPatientCounterTableAndSummary();
    });
  }

  if (pageInput) {
    pageInput.addEventListener("change", () => {
      const value = Number(pageInput.value);
      if (!Number.isFinite(value)) return;
      patientCounterState.currentPage = Math.min(totalPages, Math.max(1, Math.floor(value)));
      renderPatientCounterTableAndSummary();
    });
  }
}

function parsePatientCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function isValidRealPatientId(patientId) {
  return /^\d+$/.test(String(patientId || ""));
}

function parsePatientTimestamp(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
  if (!match) return NaN;

  const [, y, m, d, hh, mm, ss, ms = "0"] = match;
  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss),
    Number(ms.slice(0, 3).padEnd(3, "0"))
  ).getTime();
}

function formatPatientTimeOnly(timestamp) {
  const text = String(timestamp || "").trim();
  const match = text.match(/\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2})/);
  return match ? match[1] : "-";
}

function getPatientTotalTreatmentDurationMs(record) {
  if (!record || !record.sessionsByFraction || typeof record.sessionsByFraction.values !== "function") {
    return NaN;
  }

  let total = 0;
  let hasSession = false;

  for (const session of record.sessionsByFraction.values()) {
    if (
      Number.isFinite(session.startTimeMs) &&
      Number.isFinite(session.endTimeMs) &&
      session.endTimeMs >= session.startTimeMs
    ) {
      total += session.endTimeMs - session.startTimeMs;
      hasSession = true;
    }
  }

  return hasSession ? total : NaN;
}

function getPatientTreatmentWindow(record) {
  if (!record || !record.sessionsByFraction || typeof record.sessionsByFraction.values !== "function") {
    return {};
  }

  let startTimeMs = NaN;
  let endTimeMs = NaN;
  let startTimestamp = "";
  let endTimestamp = "";

  for (const session of record.sessionsByFraction.values()) {
    if (!Number.isFinite(session.startTimeMs) || !Number.isFinite(session.endTimeMs)) {
      continue;
    }

    if (!Number.isFinite(startTimeMs) || session.startTimeMs < startTimeMs) {
      startTimeMs = session.startTimeMs;
      startTimestamp = session.startTimestamp || "";
    }

    if (!Number.isFinite(endTimeMs) || session.endTimeMs >= endTimeMs) {
      endTimeMs = session.endTimeMs;
      endTimestamp = session.endTimestamp || "";
    }
  }

  if (!Number.isFinite(startTimeMs) || !Number.isFinite(endTimeMs)) {
    return {};
  }

  return {
    startTimeMs,
    endTimeMs,
    startTimestamp,
    endTimestamp
  };
}

function formatPatientDuration(durationMs) {
  if (!Number.isFinite(durationMs)) {
    return "-";
  }

  const totalMinutes = Math.max(0, durationMs / 60000);
  return `${totalMinutes.toFixed(1)} min`;
}

function formatPatientFractionRange(fractions) {
  if (!Array.isArray(fractions) || !fractions.length) return "";

  const ranges = [];
  let start = fractions[0];
  let previous = fractions[0];

  for (let i = 1; i < fractions.length; i += 1) {
    const current = fractions[i];
    if (current === previous + 1) {
      previous = current;
      continue;
    }

    ranges.push(start === previous ? String(start) : `${start}-${previous}`);
    start = current;
    previous = current;
  }

  ranges.push(start === previous ? String(start) : `${start}-${previous}`);
  return `Frac ${ranges.join(", ")}`;
}

function formatPatientElapsed(elapsedMs) {
  if (elapsedMs < 1000) {
    return `${Math.max(0.1, Math.round(elapsedMs / 100) / 10).toFixed(1)} s`;
  }

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) {
    return `${seconds} s`;
  }

  return `${minutes} min ${seconds} s`;
}

function shortenPatientFileName(fileName) {
  const text = String(fileName || "");
  return text.length > 36 ? `${text.slice(0, 33)}...` : text;
}

function escapePatientHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
