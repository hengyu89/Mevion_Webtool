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
        <div class="file-drop-subtitle">支持格式: .csv，可一次选择多个 TCLogger / HALO 文件</div>
      </div>

      <div id="patientFileStatus" class="tool-file-list empty-text">尚未选择文件。</div>
      <div id="patientSummary" class="tool-summary"></div>
      <div id="patientResultTableWrap" class="patient-results-layout"></div>
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
  let analysisVersion = 0;

  function setStatus(message, type = "idle") {
    const status = document.getElementById("patientFileStatus");
    if (!status) return;
    status.className = `tool-file-list patient-file-status ${type}`;
    status.textContent = message;
    updatePatientCounterToolStatus(type, message);
  }

  async function analyzeSelectedFiles() {
    const version = ++analysisVersion;
    const files = selectedFiles.slice();
    const fileKey = loadedFileKey;
    // A different tool can replace the shared files while this page is reading.
    const isCurrent = () => version === analysisVersion &&
      (!window.TcLogFileStore || window.TcLogFileStore.getFileKey() === fileKey);
    if (!files.length) {
      setStatus("尚未选择文件。", "idle");
      return;
    }

    const startTime = performance.now();

    setStatus(
      `已选择 ${files.length} 份文件，正在分析... (0/${files.length})`,
      "running"
    );

    try {
      const extractedRows = await parsePatientCounterFiles(files, (done, total, currentFileName) => {
        if (!isCurrent()) return;
        const shortName = shortenPatientFileName(currentFileName);
        setStatus(
          `已选择 ${total} 份文件，正在分析... (${done}/${total})。当前文件: ${shortName}`,
          "running"
        );
      });

      if (!isCurrent()) return;
      const rows = filterTreatedPatientRows(extractedRows);
      renderPatientCounterResults(rows);

      const newCount = rows.filter((row) => row.isNew).length;
      const elapsedMs = performance.now() - startTime;
      setStatus(
        `共 ${files.length} 份文件，耗时 ${formatPatientElapsed(elapsedMs)}，分析完成！治疗人数 ${rows.length}，其中 ${newCount} 个 Frac 1。`,
        "done"
      );
    } catch (error) {
      if (!isCurrent()) return;
      loadedFileKey = "";
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
    pendingRecords: [],
    patientStartById: new Map(),
    currentPlanStartById: new Map(),
    sessionStartByTreatmentUid: new Map(),
    currentTreatmentUid: ""
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

  // HALO exports and overlapping files may not be in chronological order.
  // Only retain candidate messages, then resolve patient context in TC time order.
  context.pendingRecords.sort((a, b) => a.tcTimeMs - b.tcTimeMs);
  context.patientByTreatmentUid = indexPatientTreatmentUids(context.pendingRecords);
  for (const record of context.pendingRecords) {
    applyPatientCounterMessage(record, patientMap, context);
  }

  return Array.from(patientMap.values())
    .map((item) => {
      const observedFractions = Array.from(item.fractions || [])
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      const recordedFractions = Array.from(item.recordedFractions || [])
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b);
      const observedBeams = Array.from(item.beams || [])
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
        .map(String);
      const recordedBeams = Array.from(item.recordedTreatmentBeams || [])
        .map(Number)
        .filter(Number.isFinite)
        .sort((a, b) => a - b)
        .map(String);
      const hasBeamDelivery = recordedBeams.length > 0;
      const fractions = hasBeamDelivery ? recordedFractions : observedFractions;
      return {
        ...item,
        observedBeams,
        observedFractions,
        beams: recordedBeams,
        hasBeamDelivery,
        treatmentFieldCount: Array.from(item.recordedTreatmentBeamsByDate.values()).reduce((sum, dailyBeams) => sum + countPatientTreatmentFields(dailyBeams), 0),
        fractions,
        fraction: fractions.length ? Math.max(...fractions) : "",
        fractionDisplay: formatPatientFractionRange(fractions),
        treatmentDurationMs: getPatientTotalTreatmentDurationMs(item),
        ...getPatientTreatmentWindow(item),
        isNew: hasBeamDelivery && fractions.includes(1)
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
  let headerIndexes = null;
  await window.CsvUtils.readFileRecords(file, (line) => {
    headerIndexes = parsePatientCounterRelevantLine(line, headerIndexes, patientMap, context, sourceFileName);
  });
}

function parsePatientCounterTextDirect(text, patientMap, context, sourceFileName) {
  let headerIndexes = null;
  window.CsvUtils.forEachRecord(text, (line) => {
    headerIndexes = parsePatientCounterRelevantLine(line, headerIndexes, patientMap, context, sourceFileName);
  });
}

function parsePatientCounterRelevantLine(line, headerIndexes, patientMap, context, sourceFileName) {
  if (!line) return headerIndexes;

  if (!headerIndexes) {
    const columns = parsePatientCsvLine(line.replace(/^\uFEFF/, ""));
    if (columns.every((value) => !String(value).trim())) return null;
    const header = window.CsvUtils.resolveTcLogHeader(columns);
    headerIndexes = header.indexes;
    if (!header.isData) return headerIndexes;
  }

  if (
    line.indexOf("/Debug/") === -1 &&
    line.indexOf("Saving dosimetry record at") === -1 &&
    line.indexOf("Treatment Record ") === -1 &&
    line.indexOf("No setup images to send for PatientID (") === -1 &&
    line.toLowerCase().indexOf("beam number") === -1 &&
    line.toLowerCase().indexOf("fraction number:") === -1
  ) {
    return headerIndexes;
  }

  const cols = parsePatientCsvLine(line);
  const tcTimestamp = cols[headerIndexes.timestamp] || "";
  const message = cols[headerIndexes.message] || "";
  const tcTimeMs = parsePatientTimestamp(tcTimestamp);
  if (!Number.isFinite(tcTimeMs)) return headerIndexes;
  const record = { tcTimestamp, tcTimeMs, message, sourceFileName };
  if (context.pendingRecords) context.pendingRecords.push(record);
  else applyPatientCounterMessage(record, patientMap, context);
  return headerIndexes;
}

function applyPatientCounterMessage({ tcTimestamp, tcTimeMs, message, sourceFileName }, patientMap, context) {

  // HALO can omit the plan-open message. An explicit patient/UID must override
  // the preceding patient's context before applying anonymous beam messages.
  const explicitContext = message.match(/^No setup images to send for PatientID \(([A-Za-z0-9_-]+)\)/);
  if (explicitContext) {
    context.currentPatientId = isValidRealPatientId(explicitContext[1]) ? explicitContext[1] : "";
    return;
  }
  const uidMatch = message.match(/^Treatment UID:\s*([\d.]+),/);
  if (uidMatch) {
    context.currentTreatmentUid = uidMatch[1];
    context.currentPatientId = context.patientByTreatmentUid?.get(uidMatch[1]) || "";
    if (context.currentPatientId) ensurePatientRecord(patientMap, context.currentPatientId, {});
  }

  const planOpenMatch = message.match(/Saving DICOM file\s*\([^)]*\/exams\/([A-Za-z0-9_-]+)\/Debug\/BDI[^)]*/i);
  if (planOpenMatch) {
    const patientId = planOpenMatch[1];
    context.currentPatientId = "";
    context.currentTreatmentUid = "";
    if (!isValidRealPatientId(patientId)) return;
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
      observationTimestamp: tcTimestamp,
      startTimeMs: tcTimeMs,
      startTimestamp: tcTimestamp,
      sourceFileName,
      source: "Plan Open"
    });
  }

  const dosrecMatch = message.match(/Saving dosimetry record at\s+([^"]*?Frac(\d+)\.csv)/i);
  if (dosrecMatch) {
    const dosrecPath = dosrecMatch[1] || "";
    const pathPatientMatch = dosrecPath.match(/\/exams\/([A-Za-z0-9_-]+)\//i);
    const patientId = pathPatientMatch ? pathPatientMatch[1] : context.currentPatientId;
    if (!isValidRealPatientId(patientId)) {
      context.currentPatientId = "";
      return;
    }
    const beamMatch = dosrecPath.match(/Beam[_-]?(\d+)/i);
    const rawBeam = beamMatch ? Number(beamMatch[1]) : NaN;
    const beam = Number.isFinite(rawBeam) ? rawBeam : "";
    const fraction = Number(dosrecMatch[2]);
    const pathStart = getPatientSessionPathStart(dosrecPath, tcTimeMs);
    const startInfo = context.patientStartById.get(patientId) || pathStart;
    const sessionStartInfo = context.currentPlanStartById.get(patientId) || pathStart || startInfo;
    const currentUidPatientId = context.patientByTreatmentUid?.get(context.currentTreatmentUid);
    const treatmentUid = currentUidPatientId === patientId ? context.currentTreatmentUid : "";
    if (treatmentUid && sessionStartInfo) context.sessionStartByTreatmentUid.set(treatmentUid, sessionStartInfo);

    context.currentPatientId = patientId;
    updatePatientRecord(patientMap, patientId, {
      observationTimestamp: tcTimestamp,
      fraction,
      beam,
      startTimeMs: startInfo && Number.isFinite(startInfo.timeMs) ? startInfo.timeMs : tcTimeMs,
      sessionStartTimeMs: sessionStartInfo && Number.isFinite(sessionStartInfo.timeMs) ? sessionStartInfo.timeMs : tcTimeMs,
      sessionStartTimestamp: sessionStartInfo ? sessionStartInfo.timestamp : tcTimestamp,
      sessionStartInferred: !!sessionStartInfo?.inferred,
      sessionKey: treatmentUid || `path:${dosrecPath.match(/\/SESSION_([^/]+)/)?.[1] || tcTimestamp}`,
      endTimeMs: tcTimeMs,
      startTimestamp: startInfo ? startInfo.timestamp : tcTimestamp,
      endTimestamp: tcTimestamp,
      sourceFileName,
      source: "Dosimetry Record",
      doseRecorded: true
    });
    return;
  }

  const treatmentRecordMatch = message.match(/Treatment Record\s+([\d.]+)\s+for Patient\s+([A-Za-z0-9_-]+)\..*?\bFraction\s+(\d+)\./i);
  if (treatmentRecordMatch) {
    const treatmentUid = treatmentRecordMatch[1];
    const patientId = treatmentRecordMatch[2];
    if (!isValidRealPatientId(patientId)) {
      context.currentPatientId = "";
      return;
    }
    const fraction = Number(treatmentRecordMatch[3]);
    const startInfo = context.patientStartById.get(patientId);
    const sessionStartInfo = context.sessionStartByTreatmentUid.get(treatmentUid) || context.currentPlanStartById.get(patientId) || startInfo;

    context.currentPatientId = patientId;
    updatePatientRecord(patientMap, patientId, {
      observationTimestamp: tcTimestamp,
      fraction,
      startTimeMs: startInfo && Number.isFinite(startInfo.timeMs) ? startInfo.timeMs : tcTimeMs,
      sessionStartTimeMs: sessionStartInfo && Number.isFinite(sessionStartInfo.timeMs) ? sessionStartInfo.timeMs : tcTimeMs,
      sessionStartTimestamp: sessionStartInfo ? sessionStartInfo.timestamp : tcTimestamp,
      sessionStartInferred: !!sessionStartInfo?.inferred,
      sessionKey: treatmentUid,
      endTimeMs: tcTimeMs,
      startTimestamp: startInfo ? startInfo.timestamp : tcTimestamp,
      endTimestamp: tcTimestamp,
      sourceFileName,
      source: "Treatment Record"
    });
    return;
  }

  const beamFractionMatch = message.match(/\bBeam Number:\s*(\d+),\s*Fraction Number:\s*(\d+)/i);
  if (beamFractionMatch && context.currentPatientId) {
    const existingRecord = ensurePatientRecord(patientMap, context.currentPatientId, {});
    if (existingRecord) {
      updatePatientRecord(patientMap, context.currentPatientId, {
        observationTimestamp: tcTimestamp,
        beam: Number(beamFractionMatch[1]),
        fraction: Number(beamFractionMatch[2]),
        sourceFileName
      });
    }
    return;
  }

  const beamMatch = message.match(/^Beam number:\s*(\d+)/i);
  if (beamMatch && context.currentPatientId) {
    const existingRecord = ensurePatientRecord(patientMap, context.currentPatientId, {});
    if (existingRecord) {
      updatePatientRecord(patientMap, context.currentPatientId, {
        observationTimestamp: tcTimestamp,
        beam: Number(beamMatch[1]),
        sourceFileName
      });
    }
    return;
  }

  const fractionMatch = message.match(/Fraction Number:\s*(\d+)/i);
  if (fractionMatch && context.currentPatientId) {
    const fraction = Number(fractionMatch[1]);

    const existingRecord = patientMap.get(context.currentPatientId);
    if (existingRecord) {
      updatePatientRecord(patientMap, context.currentPatientId, {
        observationTimestamp: tcTimestamp,
        fraction,
        sourceFileName,
        source: "Fraction Number"
      });
    }
  }

  return;
}

function indexPatientTreatmentUids(records) {
  const patientByUid = new Map();
  function bind(uid, patientId) {
    const id = isValidRealPatientId(patientId) ? patientId : "";
    if (!patientByUid.has(uid)) patientByUid.set(uid, id);
    else if (patientByUid.get(uid) !== id) patientByUid.set(uid, "");
  }
  // Explicit completed records are authoritative, including ones later in the file.
  for (const { message } of records) {
    const record = message.match(/^Treatment Record\s+([\d.]+)\s+for Patient\s+([A-Za-z0-9_-]+)\./);
    if (record) bind(record[1], record[2]);
  }
  let patientId = "";
  let freshContext = false;
  for (const { message } of records) {
    const plan = message.match(/Saving DICOM file\s*\([^)]*\/exams\/([A-Za-z0-9_-]+)\/Debug\/BDI/i);
    const explicit = message.match(/^No setup images to send for PatientID \(([A-Za-z0-9_-]+)\)/);
    if (plan || explicit) {
      patientId = (plan || explicit)[1];
      freshContext = true;
    }
    const uid = message.match(/^Treatment UID:\s*([\d.]+),/);
    if (uid) {
      if (!patientByUid.has(uid[1]) && freshContext && isValidRealPatientId(patientId)) bind(uid[1], patientId);
      patientId = patientByUid.get(uid[1]) || "";
      freshContext = false;
    }
  }
  return patientByUid;
}

function getPatientSessionPathStart(path, endTimeMs) {
  const match = path.match(/\/SESSION_(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\//);
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  const timestamp = `${year}-${month}-${day} ${hour}:${minute}:${second}.000`;
  const timeMs = parsePatientTimestamp(timestamp);
  const date = new Date(timeMs);
  if (!Number.isFinite(timeMs) || timeMs > endTimeMs || date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) || date.getDate() !== Number(day) ||
    date.getHours() !== Number(hour) || date.getMinutes() !== Number(minute) || date.getSeconds() !== Number(second)) return null;
  return { timeMs, timestamp, inferred: true };
}

function ensurePatientRecord(patientMap, patientId, data) {
  if (!patientId) return null;

  if (!patientMap.has(patientId)) {
    patientMap.set(patientId, {
      patientId,
      fraction: null,
      fractions: new Set(),
      recordedFractions: new Set(),
      beams: new Set(),
      beamsByDate: new Map(),
      recordedTreatmentBeams: new Set(),
      recordedTreatmentBeamsByDate: new Map(),
      deliveredSessionKeys: new Set(),
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
  if (data.source === "Plan Open") record.hasPlanOpen = true;
  if (data.source === "Treatment Record" && Number.isFinite(data.endTimeMs)) {
    record.lastTreatmentRecordTimeMs = Math.max(record.lastTreatmentRecordTimeMs ?? -Infinity, data.endTimeMs);
  }

  if (Number.isFinite(data.fraction)) {
    record.fractions.add(Number(data.fraction));
    record.fraction = Math.max(...Array.from(record.fractions).map(Number));
    if (data.doseRecorded && Number(data.beam) >= 2) record.recordedFractions.add(Number(data.fraction));
  }

  if (
    Number.isFinite(data.fraction) &&
    Number.isFinite(data.sessionStartTimeMs) &&
    Number.isFinite(data.endTimeMs)
  ) {
    const sessionKey = data.sessionKey || `${Number(data.fraction)}|${data.sessionStartTimestamp || data.startTimestamp || "unknown"}`;
    const currentSession = record.sessionsByFraction.get(sessionKey);
    if (!currentSession) {
      record.sessionsByFraction.set(sessionKey, {
        startTimeMs: data.sessionStartTimeMs,
        endTimeMs: data.endTimeMs,
        startTimestamp: data.sessionStartTimestamp || data.startTimestamp || "",
        startInferred: !!data.sessionStartInferred,
        endTimestamp: data.endTimestamp || ""
      });
    } else {
      if (data.sessionStartTimeMs < currentSession.startTimeMs) {
        currentSession.startTimeMs = data.sessionStartTimeMs;
        currentSession.startTimestamp = data.sessionStartTimestamp || data.startTimestamp || currentSession.startTimestamp;
        currentSession.startInferred = !!data.sessionStartInferred;
      }
      if (data.endTimeMs >= currentSession.endTimeMs) {
        currentSession.endTimeMs = data.endTimeMs;
        currentSession.endTimestamp = data.endTimestamp || currentSession.endTimestamp;
      }
    }
  }

  if (data.doseRecorded && Number(data.beam) >= 2 && data.sessionKey) record.deliveredSessionKeys.add(data.sessionKey);

  if (data.beam) {
    record.beams.add(String(data.beam));
    if (data.doseRecorded && Number(data.beam) >= 2) record.recordedTreatmentBeams.add(String(data.beam));
  }

  // Use each message's TC date, not the patient's first plan-open date.
  const date = String(data.observationTimestamp || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    if (!record.beamsByDate.has(date)) record.beamsByDate.set(date, new Set());
    if (data.beam) record.beamsByDate.get(date).add(String(data.beam));
    if (!record.recordedTreatmentBeamsByDate.has(date)) record.recordedTreatmentBeamsByDate.set(date, new Set());
    if (data.doseRecorded && Number(data.beam) >= 2) record.recordedTreatmentBeamsByDate.get(date).add(String(data.beam));
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

function countTreatedPatients(rows) {
  return Array.from(rows || []).filter((row) => row.hasBeamDelivery).length;
}

function filterTreatedPatientRows(rows) {
  const sourceRows = Array.from(rows || []);
  if (sourceRows.every((row) => !Object.prototype.hasOwnProperty.call(row, "hasBeamDelivery"))) return rows || [];
  return sourceRows.filter((row) =>
    !Object.prototype.hasOwnProperty.call(row, "hasBeamDelivery") || row.hasBeamDelivery
  );
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
  const recordNotices = rows.map((row, index) => ({ row, index, reasons: getPatientRecordNotices(row) }))
    .filter((item) => item.reasons.length);

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
        <button id="patientLogicBtn" class="tool-btn pagination-btn" type="button" aria-haspopup="dialog">提取逻辑</button>
      </div>
    </div>
    ${recordNotices.length ? `<details class="patient-data-notice" open>
      <summary>${recordNotices.length} 位病人的记录边界需核对（Patient ID 与具体原因）</summary>
      <ul>${recordNotices.map(({ row, index, reasons }) => `<li>第 ${index + 1} 行 · Patient ID <strong>${escapePatientHtml(row.patientId)}</strong> · ${escapePatientHtml(row.fractionDisplay || "Frac 未知")}：${escapePatientHtml(reasons.join("；"))}。</li>`).join("")}</ul>
      <div>这是本次导入范围内的记录情况，不代表日志丢失或治疗异常；后续消息可能在下一份日志中。未确认最终记录时，表格结束时间仅代表最后可见的剂量/治疗记录。</div>
    </details>` : ""}
  `;

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-text patient-empty">未提取到病人治疗记录。</div>`;
    bindPatientPaginationEvents(totalPages);
    return;
  }

  wrap.innerHTML = `
    <div class="tool-table-wrap patient-table-wrap">
    <table class="tool-table patient-counter-table">
      <thead>
        <tr>
          <th class="patient-index-col">#</th>
          <th>Patient ID</th>
          <th>第几次治疗</th>
          <th>status</th>
          <th>起止时间</th>
          <th>治疗耗时</th>
          <th>治疗射野</th>
          <th>治疗野数</th>
          <th>来源</th>
        </tr>
      </thead>
      <tbody>
        ${pageRows
          .map((row, index) => {
            const beamsText = formatPatientBeamList(row.beams);
            const beamsHtml = formatPatientBeamListHtml(row);
            return `
              <tr class="${row.isNew ? "patient-new-row" : ""}">
                <td class="muted-cell">${start + index + 1}</td>
                <td class="patient-id-cell">${escapePatientHtml(row.patientId)}</td>
                <td class="patient-fraction-cell">${row.fractionDisplay ? escapePatientHtml(row.fractionDisplay) : "-"}</td>
                <td>${row.isNew ? `<span class="patient-new-badge">NEW</span>` : `<span class="patient-normal-badge">-</span>`}</td>
                <td class="patient-time-cell" title="${escapePatientHtml(`${row.startTimestamp || "未知"} - ${row.endTimestamp || "未知"}${row.startInferred ? '；开始时间由 SESSION 路径推定（秒级）' : ''}`)}">${row.startInferred ? "≈ " : ""}${escapePatientHtml(formatPatientTimeRange(row.startTimestamp, row.endTimestamp))}</td>
                <td>${escapePatientHtml(formatPatientDuration(row.treatmentDurationMs))}</td>
                <td class="patient-beams-cell" title="${escapePatientHtml(beamsText ? '均有 Saving dosimetry record 证据' : '未识别到治疗射野')}">${beamsHtml || "-"}</td>
                <td class="patient-field-count-cell">${row.treatmentFieldCount}</td>
                <td>${escapePatientHtml(row.source || "-")}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
    </div>
    <aside class="patient-results-side" aria-label="治疗射野统计与备注">
      ${renderPatientFieldStatistics(rows)}
      <div class="patient-beam-legend"><strong>粗体治疗射野</strong>：有 Saving dosimetry record 证据</div>
      <div class="patient-summary-note">Frac1 可能代表新病人，也可能代表改了计划</div>
    </aside>
  `;

  bindPatientPaginationEvents(totalPages);
}

function bindPatientPaginationEvents(totalPages) {
  const prevBtn = document.getElementById("patientPrevPageBtn");
  const nextBtn = document.getElementById("patientNextPageBtn");
  const pageInput = document.getElementById("patientPageInput");
  document.getElementById("patientLogicBtn")?.addEventListener("click", showPatientExtractionLogic);

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

function getPatientRecordNotices(row) {
  const reasons = [];
  if (!row.hasPlanOpen || row.startInferred) {
    reasons.push(row.startInferred
      ? `未识别到对应计划打开消息，开始时间由 SESSION 路径推定（≈ ${formatPatientTimeOnly(row.startTimestamp)}）`
      : "未识别到计划打开消息，无法确认实际开始时间");
  }
  if (!Number.isFinite(row.lastTreatmentRecordTimeMs)) {
    reasons.push("未识别到该病人的最终 Treatment Record 消息");
  } else if (Number.isFinite(row.endTimeMs) && row.lastTreatmentRecordTimeMs < row.endTimeMs) {
    reasons.push("最后一条剂量记录之后未识别到新的 Treatment Record 消息");
  }
  return reasons;
}

function showPatientExtractionLogic() {
  let dialog = document.getElementById("patientExtractionDialog");
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = "patientExtractionDialog";
    dialog.className = "patient-logic-dialog";
    dialog.setAttribute("aria-labelledby", "patientLogicTitle");
    dialog.innerHTML = `
      <div class="patient-logic-header">
        <h2 id="patientLogicTitle">Patient Counter · 提取逻辑</h2>
        <button class="tool-btn patient-logic-close" type="button" aria-label="关闭提取逻辑" autofocus>关闭</button>
      </div>
      <div class="patient-logic-body">
        <p class="patient-logic-notice">这是所选日志中具有明确治疗野剂量记录的治疗汇总，不是治疗完成证明，也不是计划数据库。定位、复位、只打开计划或只打开射野但未见出束记录的病人不会显示；日志缺失会影响人数、射野和时间。</p>
        <dl class="patient-logic-list">
          <dt>Patient ID / 人数</dt>
          <dd>从 <code>Saving DICOM file (.../exams/&lt;ID&gt;/Debug/BDI...)</code> 或
            <code>Treatment Record ... for Patient &lt;ID&gt;. ... Fraction N.</code> 提取 ID。
            <code>Saving dosimetry record at .../exams/&lt;ID&gt;/...FracN.csv</code> 中的明确 ID 优先；路径没有 ID 时使用当前病人上下文。
            仅保留纯数字 ID，不能据此验证真实身份。全部导入文件按 ID 去重；不按日期或计划另分行。
            「治疗人数」要求该病人至少有一个原始 Beam ≥ 2 的明确剂量落盘记录；只有 Setup、定位、复位或只打开射野的病人不显示。</dd>
          <dt>缺少计划打开消息时的病人归属</dt>
          <dd>先通过 <code>Treatment Record &lt;UID&gt; for Patient &lt;ID&gt;</code> 建立 UID 与病人的对应关系，再解析 <code>Treatment UID: ..., Beam Number: ..., Fraction Number: ...</code>。
            <code>No setup images to send for PatientID (&lt;ID&gt;)</code> 也可明确切换当前病人。遇到无法确认归属的新 UID 时清空旧上下文，避免把新病人的 Frac 和射野算到上一人。</dd>
          <dt>第几次治疗 / status</dt>
          <dd>采用已计入治疗的剂量记录文件名 <code>FracN.csv</code>；<code>Fraction Number: N</code> 与 <code>Treatment Record ... Fraction N.</code> 不会单独计入治疗人数。
            同一 ID 的次数去重后显示为 <code>Frac 14</code> 或 <code>Frac 1-2, 4</code>；不是按打开计划次数累计。
            只有带出束证据的 Frac 1 才标记 NEW，可能是首次治疗，也可能是改计划后重新编号。</dd>
          <dt>起止时间</dt>
          <dd>时间使用 <code>TC Timestamp</code>，HALO 对应 <code>TC Datetime</code>，不使用 MCC 时间替代，也不额外加减时区。
            开始参考最近一次 <code>Saving DICOM file (.../Debug/BDI...)</code>；收到剂量或治疗记录时，将该计划打开时间归入对应 Fraction。
            每个 Fraction 保留最早开始和最晚记录时间，表格显示所有 Fraction 的最早开始至最晚结束。
            缺少计划打开信息时，优先从剂量记录路径 <code>/SESSION_YYYYMMDDhhmmss/</code> 推定开始，标记 ≈，精度到秒；无有效 SESSION 才回退到第一条剂量/治疗记录时间。
            只有计划打开信息时，结束显示「-」。同日显示 <code>07:03 - 07:22</code>，跨日保留日期；悬停可看完整时间。缺失的结束消息或射野不会凭空补齐。</dd>
          <dt>结束时间 / 来源</dt>
          <dd>结束来自最后一条 <code>Saving dosimetry record at ...FracN.csv</code> 或
            <code>Treatment Record ... for Patient ... Fraction N.</code> 的 TC 时间。
            「来源」显示确定最新结束时间的消息类型：Dosimetry Record 或 Treatment Record；只有计划打开标记时显示 Plan Open。
            它不是 CSV 的 Source 字段，也不是日志文件名；记录写入不保证正常完成照射。</dd>
          <dt>治疗耗时</dt>
          <dd>按 Treatment UID（缺少 UID 时按剂量路径中的 SESSION）区分治疗时段，只汇总含有效治疗野剂量记录的时段；每段计算「结束 − 计划打开/SESSION 开始」，再求和并保留一位小数（分钟）。
            包含 Setup、等待及中断时间，不是 Beam-On 时间；同一 Frac 的多次独立打开不会再合并为一整段，纯 Setup 或仅选择射野的时段不计入。
            没有完整起止记录则显示「-」。</dd>
          <dt>治疗射野</dt>
          <dd>只显示从明确落盘的 <code>Saving dosimetry record at .../exams/&lt;ID&gt;/.../Beam_N/...FracM.csv</code> 获取的治疗野，并使用<strong>粗体深色</strong>。
            <code>Treatment UID: ..., Beam Number: N</code>、<code>Beam number: N</code>、定位、复位及Setup不会单独显示为治疗射野。原始 Beam 1（Setup）不计入治疗人数或治疗野数。
            当前编号约定：原始 Beam 1 显示 Setup；Beam 2 显示 1，Beam 3 显示 2，以此类推。此约定不是通过 DICOM 射野类型判断。</dd>
          <dt>治疗野数</dt>
          <dd>按明确剂量记录中的「Patient ID + TC 日期 + 原始 Beam 编号」去重，统计编号 ≥ 2 的射野，排除原始 Beam 1（Setup）。同一天同一治疗野的中断续照或重复日志只算一次；例如 <code>Setup, 1, 2, 3</code> → <strong>3</strong>。
            同一病人跨日出现的射野分别计数，行内治疗野数为各日之和；「射野」列仍显示编号去重后的列表。
            只有 Setup 为 0；未提取到射野为「-」。这不是编号相加，不是实际照射次数，也不能推断日志中未出现的计划射野。</dd>
          <dt>右侧治疗射野统计</dt>
          <dd>第一行「全部合计」为本次导入全部病人的治疗野数之和，不受分页影响。下面按 TC 日期从早到晚汇总，日期取射野消息本身的时间，不取文件名或 MCC 日期。
            同一天不同病人的射野相加，同一病人的重复射野去重；不同日期分别计数（跨午夜的同编号消息也按各自日期归属）。只有 Setup 或未提取到射野的病人活动日期显示 0，0 不代表已确认没有治疗。
            仅统计日志中识别到的射野，日志缺失可能使结果偏少。</dd>
          <dt>文件格式与处理顺序</dt>
          <dd>支持常规 TCLogger、无表头 rollover 和 HALO CSV。保留引号中的多行 message；候选消息按 TC 时间排序后解析上下文，不依赖 HALO 导出行顺序。相同时间保留原有顺序。</dd>
        </dl>
      </div>
    `;
    document.body.appendChild(dialog);
    dialog.querySelector(".patient-logic-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        dialog.close();
      }
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener("close", () => document.getElementById("patientLogicBtn")?.focus());
  }
  if (!dialog.open) dialog.showModal();
}

function parsePatientCsvLine(line) {
  return window.CsvUtils.parseRecord(line);
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

function formatPatientTimeRange(start, end) {
  const startDate = String(start || "").slice(0, 10);
  const endDate = String(end || "").slice(0, 10);
  if (startDate && endDate && startDate !== endDate) {
    return `${startDate} ${formatPatientTimeOnly(start)} - ${endDate} ${formatPatientTimeOnly(end)}`;
  }
  return `${formatPatientTimeOnly(start)} - ${formatPatientTimeOnly(end)}`;
}

function countPatientTreatmentFields(beams) {
  return new Set(Array.from(beams || []).map(Number).filter((beam) => Number.isInteger(beam) && beam >= 2)).size;
}

function getPatientFieldStatistics(rows) {
  const countsByDate = new Map();
  for (const row of rows) {
    const beamsByDate = row.recordedTreatmentBeamsByDate || row.beamsByDate || new Map();
    for (const [date, beams] of beamsByDate) {
      countsByDate.set(date, (countsByDate.get(date) || 0) + countPatientTreatmentFields(beams));
    }
  }
  const days = Array.from(countsByDate, ([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  return { total: days.reduce((sum, day) => sum + day.count, 0), days };
}

function renderPatientFieldStatistics(rows) {
  const { total, days } = getPatientFieldStatistics(rows);
  const showYear = new Set(days.map((day) => day.date.slice(0, 4))).size > 1;
  return `<div class="tool-table-wrap patient-field-stats-wrap">
    <table class="tool-table patient-field-stats-table" aria-label="治疗射野统计">
      <thead><tr><th scope="col">日期</th><th scope="col">总治疗野数</th></tr></thead>
      <tbody>
        <tr class="patient-field-total"><th scope="row">全部合计</th><td>${total}</td></tr>
        ${days.map(({ date, count }) => {
          const [year, month, day] = date.split("-").map(Number);
          return `<tr><th scope="row" title="${date}">${showYear ? `${year}年` : ""}${month}月${day}日</th><td>${count}</td></tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>`;
}

function getPatientTotalTreatmentDurationMs(record) {
  if (!record || !record.sessionsByFraction || typeof record.sessionsByFraction.values !== "function") {
    return NaN;
  }
  if (record.deliveredSessionKeys && record.deliveredSessionKeys.size === 0) {
    return NaN;
  }

  let total = 0;
  let hasSession = false;

  for (const [sessionKey, session] of record.sessionsByFraction) {
    if (record.deliveredSessionKeys?.size && !record.deliveredSessionKeys.has(sessionKey)) continue;
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
  let startInferred = false;

  for (const [sessionKey, session] of record.sessionsByFraction) {
    if (record.deliveredSessionKeys?.size && !record.deliveredSessionKeys.has(sessionKey)) continue;
    if (!Number.isFinite(session.startTimeMs) || !Number.isFinite(session.endTimeMs)) {
      continue;
    }

    if (!Number.isFinite(startTimeMs) || session.startTimeMs < startTimeMs) {
      startTimeMs = session.startTimeMs;
      startTimestamp = session.startTimestamp || "";
      startInferred = !!session.startInferred;
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
    startInferred,
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

function formatPatientBeamList(beams) {
  return Array.from(beams || [])
    .map(Number)
    .filter((beam) => Number.isFinite(beam) && beam >= 1)
    .sort((a, b) => a - b)
    .map((beam) => (beam === 1 ? "Setup" : String(beam - 1)))
    .join(", ");
}

function formatPatientBeamListHtml(row) {
  const delivered = new Set(Array.from(row?.recordedTreatmentBeams || []).map(Number));
  return Array.from(row?.beams || [])
    .map(Number)
    .filter((beam) => Number.isFinite(beam) && beam >= 1)
    .sort((a, b) => a - b)
    .map((beam) => {
      const label = beam === 1 ? "Setup" : String(beam - 1);
      const className = delivered.has(beam) ? "patient-beam-delivered" : "patient-beam-not-delivered";
      const title = delivered.has(beam) ? "有 Saving dosimetry record 证据" : "未见出束记录";
      return `<span class="${className}" title="${title}">${label}</span>`;
    })
    .join('<span class="patient-beam-separator">, </span>');
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
