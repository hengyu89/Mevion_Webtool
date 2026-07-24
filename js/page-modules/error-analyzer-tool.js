const errorAnalyzerState = {
  analysis: null,
  sortMode: "time",
  typeFilter: "",
  levelVisibility: {
    critical: true,
    warning: true,
    service: true
  }
};

const ERROR_ANALYZER_INCLUDED_CODE_RE = /ERROR-(?!4065\b|4060\b|46034\b|26016\b|26015\b)\d+\b/i;
const ERROR_ANALYZER_CLINICAL_STOP_RE = /Logging Abnormal Termination Condition:\s*.+\s+in CLINICAL\b/i;
const ERROR_ANALYZER_SERVICE_STOP_RE = /Logging Abnormal Termination Condition:\s*.+\s+in SERVICE\b/i;
const ERROR_ANALYZER_OPERATIONAL_STOP_RE =
  /Logging Abnormal Termination Condition:\s*.+\s+in (?:PHYSICS|QA)\b/i;
const ERROR_ANALYZER_HEAP_FREE_RE =
  /^Heap Free (WARNING|CRITICAL) in RTP \(([^)]+)_heap_stats\):\s*(-?\d+(?:\.\d+)?) MB\.\s*Recommend adjustment to\s*(-?\d+(?:\.\d+)?) MB\./i;
const ERROR_ANALYZER_GALIL_RE = /Error detected\s*=\s*MOTION_ERROR_GALIL_INVALID_BG_WHILE_DISABLED\b/i;
const ERROR_ANALYZER_VACUUM_RE = /^(G[45])\s*\((RF|Cryostat)\)\s+(?:vacuum\s+)?pressure\s+of\s+/i;
const ERROR_ANALYZER_RS_CV_RE = /ERROR-4603[67]\b/i;
const ERROR_ANALYZER_RS_CV_RESULT_RE =
  /^Range Shifter calibration check finished\.\s*Final result:\s*FAIL\b/i;
const ERROR_ANALYZER_RS_PLATE_MOTION_CODE_RE = /ERROR-46018\b/i;
const ERROR_ANALYZER_PULSE_RETRY_RE = /ERROR-46029\b/i;
const ERROR_ANALYZER_DOSE_COMPARE_RE =
  /ERROR-\d+\b:\s*[A-Za-z0-9-]+\s+charge comparison (?:failure|error)\b/i;
const ERROR_ANALYZER_DOSE_COMPARE_SUMMARY_RE =
  /ERROR-\d+\b:\s*Charge comparison (?:failure|error)\b/i;
const ERROR_ANALYZER_DOSE_POSITION_RE =
  /(?:ERROR-4057\b.*?\bAverage error for layer\b|ERROR-4051\b.*?\bBeam gross position check error\b)/i;
const ERROR_ANALYZER_SPOT_CHARGE_RE = /ERROR-4056\b.*?\bSpot charge limit error\b/i;
const ERROR_ANALYZER_DOSE_LAYER_SHIFT_RE = /ERROR-4063\b.*?\bInitial frame shift\b/i;
const ERROR_ANALYZER_SPOT_SIZE_RE = /\b(?:average|gross) spot size is out of tolerance\b/i;
const ERROR_ANALYZER_DTIME_DETAIL_RE =
  /^Beam-On time of\s+\d+(?:\.\d+)?s\s+exceeds maximum of\s+\d+(?:\.\d+)?s\b/i;
const ERROR_ANALYZER_CIG_COLLISION_RE = /^Nozzle Collision Detected\b/i;
const ERROR_ANALYZER_AA_TIMEOUT_RE = /ERROR-46040\b.*?\bAdaptive Aperture timeout\b/i;
const ERROR_ANALYZER_AA_POSITION_MISMATCH_RE = /\bPosition mismatch error:\s*([01](?:\|[01]{4}){4})\b/i;
const ERROR_ANALYZER_AA_INTERRUPT_RE =
  /\bACM interrupt received in error state\..*?\bbits:\s*([01](?:\|[01]{4}){4})\b/i;
const ERROR_ANALYZER_AA_AXIS_STATUS_RE = /^((?:A|B[12]|C[12][A-G]))\s*\(Node\s+\d+\).*?\berr\.\s*:/i;
const ERROR_ANALYZER_RS_PLATE_FAULT_RE = /ERROR-(47003|47006|47014)\b/i;
const ERROR_ANALYZER_TIC_TEMPERATURE_RE = /ERROR-5029\b.*?\bTIC temperature spread out of tolerance\b/i;
const ERROR_ANALYZER_TIC_PRESSURE_RE = /ERROR-5030\b.*?\bTIC pressure spread out of tolerance\b/i;
const ERROR_ANALYZER_TIC_ENVIRONMENT_RE =
  /ERROR-50(?:29|30)\b.*?\bTIC (?:temperature|pressure) spread out of tolerance\b/i;
const ERROR_ANALYZER_SM_COOLING_PRESSURE_RE =
  /ERROR-46019\b.*?\bPressure Transducer error\b/i;
const ERROR_ANALYZER_KUKA_COMMS_UNSATISFIED_RE = /^IL_PLC_TO_KUKA_COMMS became unsatisfied\b/i;
const ERROR_ANALYZER_KUKA_COMMS_LATCHED_RE = /^IL_PLC_TO_KUKA_COMMS became LATCHED\b/i;
const ERROR_ANALYZER_KUKA_COMMS_SATISFIED_RE = /^IL_PLC_TO_KUKA_COMMS became satisfied\b/i;
const ERROR_ANALYZER_KUKA_COMMS_UNLATCHED_RE = /^IL_PLC_TO_KUKA_COMMS became UN-LATCHED\b/i;
const ERROR_ANALYZER_KUKA_ONLINE_RE = /^PTS250_DEVICE_KUKA_KRL_SW is ONLINE\b/i;
const ERROR_ANALYZER_RAW_CANDIDATE_RE =
  /ERROR-|Logging Abnormal Termination Condition:|Heap Free (?:WARNING|CRITICAL)|Range Shifter calibration check finished\.|spot size is out of tolerance|Beam-On time of|Nozzle Collision Detected|Position mismatch error:|ACM interrupt received in error state\.|IL_PLC_TO_KUKA_COMMS became|PTS250_DEVICE_KUKA_KRL_SW is ONLINE|MOTION_ERROR_GALIL_INVALID_BG_WHILE_DISABLED|\(Node\s+\d+\).*?err\.\s*:|G[45]\s*\((?:RF|Cryostat)\).*?pressure\s+of/i;
const ERROR_ANALYZER_RAW_DATA_RECORD_RE =
  /^\ufeff?\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?,/;
const ERROR_ANALYZER_AA_AXIS_BY_RIGHT_BIT = Object.freeze([
  "A",
  "B1",
  "B2",
  "C1A",
  "C1B",
  "C1C",
  "C1D",
  "C1E",
  "C1F",
  "C1G",
  "C2A",
  "C2B",
  "C2C",
  "C2D",
  "C2E",
  "C2F",
  "C2G"
]);

const ERROR_ANALYZER_TERMINATION_TYPES = Object.freeze({
  BEAM_KEY: "hBKey",
  TREATMENT_TIME_LIMIT: "dTime",
  RANGE_SHIFTER_PLATE_MOTION: "sRSPos",
  XYZ_SUBSYSTEM_LOADED: "sXYZLd",
  DOSE_COMPARISONS: "dCompare",
  DOSE_POSITION: "dPos",
  SPOT_DOSE_LIMIT: "dCharge",
  DOSE_LAYER_SHIFT_LIMIT: "dShift",
  SPOT_SIZE: "dSize",
  AA_POSITION_MISMATCH: "sAAPos"
});

const ERROR_ANALYZER_DOSE_ERROR_TYPES = [
  {
    id: "doseCompare",
    label: "dCompare",
    termination: "DOSE_COMPARISONS",
    matches: isErrorAnalyzerDoseComparisonMessage,
    getNote: (message) => getErrorAnalyzerDoseComparisonName(message) || "Dose comparison",
    highlight: highlightErrorAnalyzerDoseCompareMessage
  },
  {
    id: "dosePosition",
    label: "dPos",
    termination: "DOSE_POSITION",
    matches: (message) => ERROR_ANALYZER_DOSE_POSITION_RE.test(message),
    getNote: () => "Dose position",
    highlight: highlightErrorAnalyzerDosePositionMessage
  },
  {
    id: "spotChargeLimit",
    label: "dCharge",
    termination: "SPOT_DOSE_LIMIT",
    matches: (message) => ERROR_ANALYZER_SPOT_CHARGE_RE.test(message),
    getNote: () => "Spot charge limit",
    highlight: highlightErrorAnalyzerSpotChargeMessage
  },
  {
    id: "doseLayerShift",
    label: "dShift",
    termination: "DOSE_LAYER_SHIFT_LIMIT",
    matches: (message) => ERROR_ANALYZER_DOSE_LAYER_SHIFT_RE.test(message),
    getNote: () => "Layer shift"
  }
];

const ERROR_ANALYZER_KNOWN_ERROR_TYPES = [
  { label: "sRSPos", matches: (message) => ERROR_ANALYZER_RS_CV_RE.test(message) },
  { label: "sRSPos", matches: (message) => ERROR_ANALYZER_RS_PLATE_MOTION_CODE_RE.test(message) },
  ...ERROR_ANALYZER_DOSE_ERROR_TYPES,
  { label: "sAAErr", matches: (message) => ERROR_ANALYZER_AA_TIMEOUT_RE.test(message) },
  { label: "dEnv", matches: (message) => ERROR_ANALYZER_TIC_ENVIRONMENT_RE.test(message) },
  { label: "wSMSt", matches: (message) => ERROR_ANALYZER_SM_COOLING_PRESSURE_RE.test(message) }
];

const ERROR_ANALYZER_CORRELATIONS = [
  {
    id: "cigCollision",
    maxMs: 1000,
    matchesEvidence: (alert) => alert.ruleId === "cigCollisionEvidence",
    matchesResult: (alert) => isErrorAnalyzerTermination(alert, "UNKNOWN_TERMINATION"),
    getLabel: () => "CIG Collision",
    getLevel: () => "critical",
    getNote: () => "Nozzle collision"
  },
  {
    id: "treatmentTimeLimit",
    maxMs: 1000,
    matchesEvidence: (alert) => alert.ruleId === "dTimeDetailEvidence",
    matchesResult: (alert) => isErrorAnalyzerTermination(alert, "TREATMENT_TIME_LIMIT"),
    getNote: () => "Treatment time limit"
  },
  {
    id: "rsCalibrationVerification",
    maxMs: 10000,
    keepEvidenceType: true,
    matchesEvidence: (alert) => alert.ruleId === "errorCode" && ERROR_ANALYZER_RS_CV_RE.test(alert.message),
    matchesResult: (alert) => alert.ruleId === "rsCvResultEvidence",
    getNote: (evidence) => {
      const failedPlates = getErrorAnalyzerRsCvFailedPlates(evidence);
      return failedPlates.length > 1 ? `CV failed × ${failedPlates.length}` : "CV failed";
    }
  },
  {
    id: "rsPlateMotion",
    maxMs: 1500,
    matchesEvidence: (alert) =>
      alert.ruleId === "errorCode" && ERROR_ANALYZER_RS_PLATE_MOTION_CODE_RE.test(alert.message),
    matchesResult: (alert) => isErrorAnalyzerTermination(alert, "RANGE_SHIFTER_PLATE_MOTION"),
    getNote: () => "Range shifter plate motion"
  },
  {
    id: "pulseRetry",
    maxMs: 1500,
    matchesEvidence: (alert) =>
      alert.ruleId === "errorCode" && ERROR_ANALYZER_PULSE_RETRY_RE.test(alert.message),
    matchesResult: (alert) => isErrorAnalyzerTermination(alert, "XYZ_SUBSYSTEM_LOADED"),
    getNote: () => "Pulse retry limit"
  },
  ...ERROR_ANALYZER_DOSE_ERROR_TYPES.map((definition) => ({
    id: definition.id,
    maxMs: 1500,
    matchesEvidence: (alert) => alert.ruleId === "errorCode" && definition.matches(alert.message),
    matchesResult: (alert) => isErrorAnalyzerTermination(alert, definition.termination),
    getLabel: () => definition.label,
    getNote: (evidence) => definition.getNote(evidence.message)
  })),
  {
    id: "spotSize",
    maxMs: 1500,
    matchesEvidence: (alert) => alert.ruleId === "spotSizeEvidence",
    matchesResult: (alert) => isErrorAnalyzerTermination(alert, "SPOT_SIZE"),
    getLabel: () => "dSize",
    getNote: () => "Spot size"
  }
];

const ERROR_ANALYZER_RULES = [
  {
    id: "errorCode",
    label: "ERROR Code",
    level: "warning",
    matches: (row) => ERROR_ANALYZER_INCLUDED_CODE_RE.test(`${row.message} ${row.extra}`)
  },
  {
    id: "clinicalStop",
    label: "Clinical",
    level: "critical",
    matches: (row) => ERROR_ANALYZER_CLINICAL_STOP_RE.test(row.message)
  },
  {
    id: "serviceStop",
    label: "Service",
    level: "service",
    matches: (row) => ERROR_ANALYZER_SERVICE_STOP_RE.test(row.message)
  },
  {
    id: "operationalStop",
    label: "Operational",
    level: "warning",
    matches: (row) => ERROR_ANALYZER_OPERATIONAL_STOP_RE.test(row.message)
  },
  {
    id: "heapFree",
    label: "Heap WARN",
    level: "warning",
    matches: (row) => ERROR_ANALYZER_HEAP_FREE_RE.test(row.message)
  },
  {
    id: "rsCvResultEvidence",
    label: "RS CV result",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_RS_CV_RESULT_RE.test(row.message)
  },
  {
    id: "dTimeDetailEvidence",
    label: "dTime detail",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_DTIME_DETAIL_RE.test(row.message)
  },
  {
    id: "spotSizeEvidence",
    label: "dSize",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_SPOT_SIZE_RE.test(row.message)
  },
  {
    id: "cigCollisionEvidence",
    label: "CIG Collision",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_CIG_COLLISION_RE.test(row.message)
  },
  {
    id: "aaPositionMismatchEvidence",
    label: "AA position mismatch",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_AA_POSITION_MISMATCH_RE.test(row.message)
  },
  {
    id: "aaInterruptEvidence",
    label: "AA interrupt",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_AA_INTERRUPT_RE.test(row.message)
  },
  {
    id: "aaAxisStatusEvidence",
    label: "AA axis status",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_AA_AXIS_STATUS_RE.test(row.message)
  },
  {
    id: "kukaCommsUnsatisfied",
    label: "cCchHB",
    level: "warning",
    matches: (row) => ERROR_ANALYZER_KUKA_COMMS_UNSATISFIED_RE.test(row.message)
  },
  {
    id: "kukaCommsLatchedEvidence",
    label: "cCchHB latch",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_KUKA_COMMS_LATCHED_RE.test(row.message)
  },
  {
    id: "kukaOnlineEvidence",
    label: "Kuka online",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_KUKA_ONLINE_RE.test(row.message)
  },
  {
    id: "kukaCommsSatisfiedEvidence",
    label: "cCchHB satisfied",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_KUKA_COMMS_SATISFIED_RE.test(row.message)
  },
  {
    id: "kukaCommsUnlatchedEvidence",
    label: "cCchHB clear",
    level: "warning",
    supportOnly: true,
    matches: (row) => ERROR_ANALYZER_KUKA_COMMS_UNLATCHED_RE.test(row.message)
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

const ERROR_ANALYZER_RULE_BY_ID = new Map(ERROR_ANALYZER_RULES.map((rule) => [rule.id, rule]));

function findErrorAnalyzerRule(message, extra = "") {
  const text = String(message || "");
  const extraText = String(extra || "");

  if (
    (text.includes("ERROR-") || extraText.includes("ERROR-")) &&
    (ERROR_ANALYZER_INCLUDED_CODE_RE.test(text) || ERROR_ANALYZER_INCLUDED_CODE_RE.test(extraText))
  ) {
    return ERROR_ANALYZER_RULE_BY_ID.get("errorCode");
  }

  switch (text[0]?.toUpperCase()) {
    case "L":
      if (ERROR_ANALYZER_CLINICAL_STOP_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("clinicalStop");
      }
      if (ERROR_ANALYZER_SERVICE_STOP_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("serviceStop");
      }
      if (ERROR_ANALYZER_OPERATIONAL_STOP_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("operationalStop");
      }
      break;
    case "H":
      if (ERROR_ANALYZER_HEAP_FREE_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("heapFree");
      }
      break;
    case "R":
      if (ERROR_ANALYZER_RS_CV_RESULT_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("rsCvResultEvidence");
      }
      break;
    case "T":
      if (ERROR_ANALYZER_SPOT_SIZE_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("spotSizeEvidence");
      }
      break;
    case "B":
      if (ERROR_ANALYZER_DTIME_DETAIL_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("dTimeDetailEvidence");
      }
      if (ERROR_ANALYZER_AA_AXIS_STATUS_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("aaAxisStatusEvidence");
      }
      break;
    case "N":
      if (ERROR_ANALYZER_CIG_COLLISION_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("cigCollisionEvidence");
      }
      break;
    case "P":
      if (ERROR_ANALYZER_AA_POSITION_MISMATCH_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("aaPositionMismatchEvidence");
      }
      if (ERROR_ANALYZER_KUKA_ONLINE_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("kukaOnlineEvidence");
      }
      break;
    case "A":
      if (ERROR_ANALYZER_AA_INTERRUPT_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("aaInterruptEvidence");
      }
      if (ERROR_ANALYZER_AA_AXIS_STATUS_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("aaAxisStatusEvidence");
      }
      break;
    case "C":
      if (ERROR_ANALYZER_AA_AXIS_STATUS_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("aaAxisStatusEvidence");
      }
      break;
    case "I":
      if (ERROR_ANALYZER_KUKA_COMMS_UNSATISFIED_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("kukaCommsUnsatisfied");
      }
      if (ERROR_ANALYZER_KUKA_COMMS_LATCHED_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("kukaCommsLatchedEvidence");
      }
      if (ERROR_ANALYZER_KUKA_COMMS_SATISFIED_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("kukaCommsSatisfiedEvidence");
      }
      if (ERROR_ANALYZER_KUKA_COMMS_UNLATCHED_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("kukaCommsUnlatchedEvidence");
      }
      break;
    case "G":
      if (ERROR_ANALYZER_GALIL_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("galilDisabled");
      }
      if (ERROR_ANALYZER_VACUUM_RE.test(text)) {
        return ERROR_ANALYZER_RULE_BY_ID.get("vacuum");
      }
      break;
  }

  return null;
}

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
      errorAnalyzerState.typeFilter = "";
      renderErrorAnalyzer();
      const timeRange = formatErrorAnalyzerTimeRange(analysis.timeRange);
      setStatus(
        `共 ${selectedFiles.length} 份文件${timeRange ? `，日志范围：${timeRange}` : ""}，耗时 ${formatErrorAnalyzerElapsed(performance.now() - startTime)}；分析完成！发现 ${analysis.alerts.length} 个需要关注的事件。`,
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
      String(file.name || "")
        .toLowerCase()
        .endsWith(".csv")
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
    timeRange: {
      start: "",
      end: ""
    },
    alerts: [],
    counts: {
      errorCode: 0,
      clinicalStop: 0,
      galilDisabled: 0,
      vacuum: 0
    }
  };

  let nextTextPromise = orderedFiles[0]?.text();
  for (let index = 0; index < orderedFiles.length; index += 1) {
    const file = orderedFiles[index];
    try {
      const text = await nextTextPromise;
      nextTextPromise = orderedFiles[index + 1]?.text();
      parseErrorAnalyzerCsvText(text, file.name, result, alertMap);
    } catch (error) {
      const fileError = new Error(`${file.name}：${error.message}`);
      fileError.cause = error;
      throw fileError;
    }
    if (typeof onProgress === "function") {
      onProgress(index + 1, orderedFiles.length, file.name);
    }
  }

  const chronologicalAlerts = Array.from(alertMap.values()).sort((a, b) =>
    String(a.timestamp || "").localeCompare(String(b.timestamp || ""))
  );
  const correlatedAlerts = mergeErrorAnalyzerAdaptiveApertureAlerts(
    mergeErrorAnalyzerAdaptiveApertureEvidence(
      mergeErrorAnalyzerCorrelatedAlerts(
        mergeErrorAnalyzerRsCvEvidenceAlerts(
          mergeErrorAnalyzerDoseComparisonEvidence(
            mergeErrorAnalyzerDosPairAlerts(mergeErrorAnalyzerVacuumAlerts(chronologicalAlerts))
          )
        )
      )
    )
  );
  const displayAlerts = mergeErrorAnalyzerContinuousEnvironmentAlerts(
    mergeErrorAnalyzerPlateFaultBursts(mergeErrorAnalyzerKukaCommsAlerts(correlatedAlerts))
  ).filter((alert) => !alert.supportOnly);
  result.alerts = mergeErrorAnalyzerRepeatedDisplayAlerts(
    mergeErrorAnalyzerHeapFreeAlerts(displayAlerts)
  );
  Object.keys(result.counts).forEach((key) => {
    result.counts[key] = result.alerts.filter((alert) => alert.ruleId === key).length;
  });
  return result;
}

function parseErrorAnalyzerCsvText(text, sourceFile, result, alertMap) {
  let headerIndexes = null;
  let logicalRowIndex = 0;
  updateErrorAnalyzerTimeRangeFromText(result.timeRange, text);

  parseErrorAnalyzerCsvRecords(
    text,
    (columns) => {
      if (!headerIndexes) {
        if (isErrorAnalyzerDataRecord(columns)) {
          headerIndexes = getErrorAnalyzerDefaultHeaderIndexes();
        } else {
          headerIndexes = getErrorAnalyzerHeaderIndexes(columns);
          return;
        }
      }

      logicalRowIndex += 1;
      const timestamp = String(columns[headerIndexes.timestamp] || "").trim();
      const message = String(columns[headerIndexes.message] || "").trim();
      if (!timestamp && !message) return;
      result.parsedRows += 1;

      const extra = headerIndexes.extra >= 0 ? String(columns[headerIndexes.extra] || "").trim() : "";
      const rule = findErrorAnalyzerRule(message, extra);
      if (!rule) return;

      const row = makeErrorAnalyzerRow(columns, headerIndexes, sourceFile, logicalRowIndex);
      const alert = makeErrorAnalyzerAlert(row, rule);
      const key = getErrorAnalyzerAlertKey(alert);
      const existing = alertMap.get(key);
      if (!existing) {
        alertMap.set(key, alert);
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
    },
    {
      shouldParse: (rawRecord, recordIndex) =>
        recordIndex === 0 ||
        !ERROR_ANALYZER_RAW_DATA_RECORD_RE.test(rawRecord) ||
        ERROR_ANALYZER_RAW_CANDIDATE_RE.test(rawRecord),
      onSkipped: () => {
        logicalRowIndex += 1;
        result.parsedRows += 1;
      }
    }
  );
}

function makeErrorAnalyzerAlert(row, rule) {
  const vacuumMatch = row.message.match(ERROR_ANALYZER_VACUUM_RE);
  const type = getErrorAnalyzerType(row, rule);
  const dosAxes = getErrorAnalyzerDosAxes(row);
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
    note: appendErrorAnalyzerDosAxes(getErrorAnalyzerNote(row, rule), { dosAxes }),
    supportOnly: Boolean(rule.supportOnly),
    dosAxes,
    relatedRows: 1
  };
}

function getErrorAnalyzerType(row, rule) {
  if (isErrorAnalyzerTerminationRuleId(rule.id)) {
    const condition = getErrorAnalyzerTerminationCondition(row.message);
    const interlock = getErrorAnalyzerInterlockByCondition(condition);
    return {
      label: interlock?.code || ERROR_ANALYZER_TERMINATION_TYPES[condition] || condition || rule.label,
      level: rule.level
    };
  }

  if (rule.id === "heapFree") {
    const details = getErrorAnalyzerHeapFreeDetails(row.message);
    return {
      label: details.severity === "CRITICAL" ? "Heap CRIT" : "Heap WARN",
      level: details.severity === "CRITICAL" ? "critical" : "warning"
    };
  }

  if (rule.id === "errorCode") {
    const knownType = getErrorAnalyzerKnownErrorType(row.message);
    const code = getErrorAnalyzerCode(row.message);
    return {
      label: knownType?.label || (code ? `ERROR-${code}` : rule.label),
      level: rule.level
    };
  }

  return { label: rule.label, level: rule.level };
}

function getErrorAnalyzerNote(row, rule) {
  if (rule.id === "galilDisabled") return "OG disabled";
  if (rule.id === "kukaCommsUnsatisfied") return "Kuka Offline";
  if (rule.id === "heapFree") {
    const details = getErrorAnalyzerHeapFreeDetails(row.message);
    return `${details.processLabel || "RTP"} Heap Free`;
  }
  if (isErrorAnalyzerTerminationRuleId(rule.id)) {
    const condition = getErrorAnalyzerTerminationCondition(row.message);
    const interlock = getErrorAnalyzerInterlockByCondition(condition);
    return interlock?.guideName || interlock?.name || formatErrorAnalyzerCondition(condition);
  }
  if (rule.id === "errorCode" && ERROR_ANALYZER_RS_CV_RE.test(row.message)) return "CV failed";
  if (rule.id === "errorCode" && ERROR_ANALYZER_RS_PLATE_MOTION_CODE_RE.test(row.message)) {
    return "Range shifter plate motion";
  }
  const doseErrorType = rule.id === "errorCode" ? getErrorAnalyzerDoseErrorType(row.message) : null;
  if (doseErrorType) return doseErrorType.getNote(row.message);
  if (rule.id === "errorCode" && ERROR_ANALYZER_TIC_TEMPERATURE_RE.test(row.message)) {
    return "TIC temperature spread";
  }
  if (rule.id === "errorCode" && ERROR_ANALYZER_TIC_PRESSURE_RE.test(row.message)) {
    return "TIC pressure spread";
  }
  if (rule.id === "errorCode" && ERROR_ANALYZER_SM_COOLING_PRESSURE_RE.test(row.message)) {
    return "SM Cooling";
  }
  if (rule.id === "errorCode" && getErrorAnalyzerDosAxis(row)) return getErrorAnalyzerDosAxis(row);
  if (rule.id === "vacuum" && /^G4\s*\(Cryostat\)/i.test(row.message)) return "Cryostat Vacuum";
  return "";
}

function mergeErrorAnalyzerVacuumAlerts(alerts) {
  const merged = [];
  alerts.forEach((alert) => {
    const previous = merged[merged.length - 1];
    const shouldMerge =
      previous &&
      previous.ruleId === "vacuum" &&
      alert.ruleId === "vacuum" &&
      Math.abs(
        parseErrorAnalyzerTimestampMs(alert.timestamp) - parseErrorAnalyzerTimestampMs(previous.timestamp)
      ) <= 1500;

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

function mergeErrorAnalyzerRsCvEvidenceAlerts(alerts) {
  const merged = [];

  for (let index = 0; index < alerts.length;) {
    const first = cloneErrorAnalyzerAlert(alerts[index]);
    if (first.ruleId !== "errorCode" || !ERROR_ANALYZER_RS_CV_RE.test(first.message)) {
      merged.push(first);
      index += 1;
      continue;
    }

    const group = [first];
    let cursor = index + 1;
    while (cursor < alerts.length) {
      const candidate = alerts[cursor];
      const previous = group[group.length - 1];
      const elapsed =
        parseErrorAnalyzerTimestampMs(candidate.timestamp) -
        parseErrorAnalyzerTimestampMs(previous.timestamp);
      if (
        candidate.sourceFile !== first.sourceFile ||
        candidate.ruleId !== "errorCode" ||
        !ERROR_ANALYZER_RS_CV_RE.test(candidate.message) ||
        !Number.isFinite(elapsed) ||
        elapsed < 0 ||
        elapsed > 1000
      ) {
        break;
      }
      group.push(cloneErrorAnalyzerAlert(candidate));
      cursor += 1;
    }

    if (group.length === 1) {
      merged.push(first);
    } else {
      merged.push(combineErrorAnalyzerRsCvEvidenceGroup(group));
    }
    index = cursor;
  }

  return merged;
}

function combineErrorAnalyzerRsCvEvidenceGroup(group) {
  const first = group[0];
  const messages = group.flatMap((alert) => alert.messages || [alert.message]).filter(Boolean);
  const failedPlates = getErrorAnalyzerRsCvFailedPlates(messages);

  return {
    ...first,
    ruleLabel: "sRSPos",
    typeLabels: ["sRSPos"],
    message: messages.join("\n"),
    messages,
    note: `CV failed × ${failedPlates.length || group.length}`,
    incidentKind: "rsCalibrationEvidenceBurst",
    relatedRows: group.reduce((total, alert) => total + Number(alert.relatedRows || 1), 0)
  };
}

function mergeErrorAnalyzerDoseComparisonEvidence(alerts) {
  const merged = [];

  alerts.forEach((originalAlert) => {
    const alert = cloneErrorAnalyzerAlert(originalAlert);
    if (
      alert.ruleId !== "errorCode" ||
      !ERROR_ANALYZER_DOSE_COMPARE_SUMMARY_RE.test(alert.message)
    ) {
      merged.push(alert);
      return;
    }

    const alertTime = parseErrorAnalyzerTimestampMs(alert.timestamp);
    const pulse = getErrorAnalyzerPulseNumber(alert.message);
    let detailIndex = -1;
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      const detail = merged[index];
      const elapsed = alertTime - parseErrorAnalyzerTimestampMs(detail.timestamp);
      if (Number.isFinite(elapsed) && elapsed > 1500) break;
      if (
        detail.sourceFile === alert.sourceFile &&
        detail.ruleId === "errorCode" &&
        Number.isFinite(elapsed) &&
        elapsed >= 0 &&
        ERROR_ANALYZER_DOSE_COMPARE_RE.test(detail.message) &&
        (!pulse || getErrorAnalyzerPulseNumber(detail.message) === pulse)
      ) {
        detailIndex = index;
        break;
      }
    }

    if (detailIndex < 0) {
      merged.push(alert);
      return;
    }

    const detail = merged[detailIndex];
    (alert.messages || [alert.message]).forEach((message) =>
      appendErrorAnalyzerMessage(detail, message)
    );
    const sourceLabels = Array.from(
      new Set([getErrorAnalyzerSourceLabel(detail), getErrorAnalyzerSourceLabel(alert)].filter(Boolean))
    );
    detail.source = sourceLabels.join("; ");
    detail.subsystem = "";
    detail.dosAxes = Array.from(new Set([...(detail.dosAxes || []), ...(alert.dosAxes || [])]));
    detail.note = appendErrorAnalyzerDosAxes(
      getErrorAnalyzerDoseComparisonName(detail.message) || detail.note || "Dose comparison",
      detail
    );
    detail.relatedRows += Number(alert.relatedRows || 1);
  });

  return merged;
}

function mergeErrorAnalyzerCorrelatedAlerts(alerts) {
  const merged = [];

  alerts.forEach((originalAlert) => {
    const alert = cloneErrorAnalyzerAlert(originalAlert);
    const correlation = ERROR_ANALYZER_CORRELATIONS.find((candidate) => candidate.matchesResult(alert));
    if (!correlation) {
      merged.push(alert);
      return;
    }

    const resultTime = parseErrorAnalyzerTimestampMs(alert.timestamp);
    let evidenceIndex = -1;
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      const evidence = merged[index];
      const elapsed = resultTime - parseErrorAnalyzerTimestampMs(evidence.timestamp);
      if (Number.isFinite(elapsed) && elapsed > correlation.maxMs) break;
      if (
        evidence.sourceFile === alert.sourceFile &&
        Number.isFinite(elapsed) &&
        elapsed >= 0 &&
        correlation.matchesEvidence(evidence)
      ) {
        evidenceIndex = index;
        break;
      }
    }

    if (evidenceIndex < 0) {
      merged.push(alert);
      return;
    }

    const evidence = merged[evidenceIndex];
    merged[evidenceIndex] = combineErrorAnalyzerAlerts(evidence, alert, correlation);
  });

  return merged.sort(
    (left, right) =>
      parseErrorAnalyzerTimestampMs(left.timestamp) - parseErrorAnalyzerTimestampMs(right.timestamp)
  );
}

function combineErrorAnalyzerAlerts(evidence, result, correlation) {
  const base = correlation.keepEvidenceType ? evidence : result;
  const evidenceMessages = evidence.messages || [evidence.message];
  const resultMessages = result.messages || [result.message];
  const orderedMessages =
    correlation.id === "rsCalibrationVerification"
      ? [
          ...evidenceMessages.slice(0, 2),
          ...resultMessages,
          ...evidenceMessages.slice(2)
        ]
      : [...evidenceMessages, ...resultMessages];
  const messages = Array.from(
    new Set(orderedMessages.filter(Boolean))
  );
  const sourceLabels = Array.from(
    new Set([getErrorAnalyzerSourceLabel(evidence), getErrorAnalyzerSourceLabel(result)].filter(Boolean))
  );
  const dosAxes = Array.from(new Set([...(evidence.dosAxes || []), ...(result.dosAxes || [])]));
  const note = appendErrorAnalyzerDosAxes(correlation.getNote(evidence, result), { dosAxes });

  return {
    ...base,
    ruleLabel:
      typeof correlation.getLabel === "function" ? correlation.getLabel(evidence, result) : base.ruleLabel,
    level: typeof correlation.getLevel === "function" ? correlation.getLevel(evidence, result) : base.level,
    timestamp: evidence.timestamp,
    rowIndex: evidence.rowIndex,
    source: sourceLabels.join("; "),
    subsystem: "",
    message: messages.join("\n"),
    messages,
    note,
    incidentKind: correlation.id,
    supportOnly: false,
    dosAxes,
    relatedRows: Number(evidence.relatedRows || 1) + Number(result.relatedRows || 1)
  };
}

function mergeErrorAnalyzerAdaptiveApertureEvidence(alerts) {
  const merged = alerts.map(cloneErrorAnalyzerAlert);
  const consumedIndexes = new Set();

  merged.forEach((termination, terminationIndex) => {
    if (!isErrorAnalyzerTermination(termination, "AA_POSITION_MISMATCH")) return;

    const terminationTime = parseErrorAnalyzerTimestampMs(termination.timestamp);
    const candidates = [];
    for (let index = terminationIndex - 1; index >= 0; index -= 1) {
      const candidate = merged[index];
      const elapsed = terminationTime - parseErrorAnalyzerTimestampMs(candidate.timestamp);
      if (Number.isFinite(elapsed) && elapsed > 2000) break;
      if (candidate.sourceFile === termination.sourceFile && Number.isFinite(elapsed) && elapsed >= 0) {
        candidates.push({ alert: candidate, index });
      }
    }

    const maskEvidence =
      candidates.find(({ alert }) => alert.ruleId === "aaPositionMismatchEvidence") ||
      candidates.find(({ alert }) => alert.ruleId === "aaInterruptEvidence");
    const failedAxes = getErrorAnalyzerAaAxes(maskEvidence?.alert.message);
    const axisEvidence = failedAxes
      .map((axis) =>
        candidates.find(
          ({ alert }) =>
            alert.ruleId === "aaAxisStatusEvidence" && getErrorAnalyzerAaAxis(alert.message) === axis
        )
      )
      .filter(Boolean);
    const evidence = [maskEvidence, ...axisEvidence].filter(Boolean);
    const messages = Array.from(
      new Set([
        ...evidence.flatMap(({ alert }) => alert.messages || [alert.message]),
        ...(termination.messages || [termination.message])
      ])
    ).filter(Boolean);
    const sourceLabels = Array.from(
      new Set(
        [
          ...evidence.map(({ alert }) => getErrorAnalyzerSourceLabel(alert)),
          getErrorAnalyzerSourceLabel(termination)
        ].filter(Boolean)
      )
    );

    evidence.forEach(({ index }) => consumedIndexes.add(index));
    merged[terminationIndex] = {
      ...termination,
      ruleLabel: "sAAPos",
      typeLabels: ["sAAPos"],
      source: sourceLabels.join("; "),
      subsystem: "",
      message: messages.join("\n"),
      messages,
      note: failedAxes.length
        ? `${failedAxes.map(formatErrorAnalyzerAaAxis).join(" / ")} Pos Mismatch`
        : "AA Pos Mismatch",
      incidentKind: "adaptiveAperturePosition",
      supportOnly: false,
      relatedRows:
        Number(termination.relatedRows || 1) +
        evidence.reduce((total, { alert }) => total + Number(alert.relatedRows || 1), 0)
    };
  });

  return merged.filter((alert, index) => !consumedIndexes.has(index));
}

function getErrorAnalyzerAaAxes(message) {
  const text = String(message || "");
  const match =
    text.match(ERROR_ANALYZER_AA_POSITION_MISMATCH_RE) || text.match(ERROR_ANALYZER_AA_INTERRUPT_RE);
  const reversedBits = String(match?.[1] || "")
    .replace(/\|/g, "")
    .split("")
    .reverse();

  return reversedBits.flatMap((bit, index) =>
    bit === "1" && ERROR_ANALYZER_AA_AXIS_BY_RIGHT_BIT[index]
      ? [ERROR_ANALYZER_AA_AXIS_BY_RIGHT_BIT[index]]
      : []
  );
}

function getErrorAnalyzerAaAxis(message) {
  return (
    String(message || "")
      .match(ERROR_ANALYZER_AA_AXIS_STATUS_RE)?.[1]
      ?.toUpperCase() || ""
  );
}

function formatErrorAnalyzerAaAxis(axis) {
  return String(axis || "").replace(/^C([12])([A-G])$/i, (match, group, leaf) => {
    return `C${group}${leaf.toLowerCase()}`;
  });
}

function mergeErrorAnalyzerAdaptiveApertureAlerts(alerts) {
  const merged = [];

  alerts.forEach((originalAlert) => {
    const alert = cloneErrorAnalyzerAlert(originalAlert);
    if (alert.ruleId !== "errorCode" || !ERROR_ANALYZER_AA_TIMEOUT_RE.test(alert.message)) {
      merged.push(alert);
      return;
    }

    const evidenceTime = parseErrorAnalyzerTimestampMs(alert.timestamp);
    let terminationIndex = -1;
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      const candidate = merged[index];
      const elapsed = evidenceTime - parseErrorAnalyzerTimestampMs(candidate.timestamp);
      if (Number.isFinite(elapsed) && elapsed > 12000) break;
      if (
        candidate.sourceFile === alert.sourceFile &&
        Number.isFinite(elapsed) &&
        elapsed >= 0 &&
        isErrorAnalyzerTermination(candidate, "AA_POSITION_MISMATCH")
      ) {
        terminationIndex = index;
        break;
      }
    }

    if (terminationIndex < 0) {
      merged.push(alert);
      return;
    }

    const termination = merged[terminationIndex];
    const messages = Array.from(
      new Set([...(termination.messages || [termination.message]), ...(alert.messages || [alert.message])])
    ).filter(Boolean);
    const sourceLabels = Array.from(
      new Set([getErrorAnalyzerSourceLabel(alert), getErrorAnalyzerSourceLabel(termination)].filter(Boolean))
    );

    merged[terminationIndex] = {
      ...termination,
      ruleLabel: "sAAPos",
      typeLabels: ["sAAPos"],
      source: sourceLabels.join("; "),
      subsystem: "",
      message: messages.join("\n"),
      messages,
      note: termination.note || "AA position mismatch",
      incidentKind: "adaptiveAperture",
      relatedRows: Number(alert.relatedRows || 1) + Number(termination.relatedRows || 1)
    };
  });

  return merged.sort(
    (left, right) =>
      parseErrorAnalyzerTimestampMs(left.timestamp) - parseErrorAnalyzerTimestampMs(right.timestamp)
  );
}

function mergeErrorAnalyzerKukaCommsAlerts(alerts) {
  const merged = alerts.map(cloneErrorAnalyzerAlert);
  const consumedIndexes = new Set();
  const supportRuleIds = new Set([
    "kukaCommsLatchedEvidence",
    "kukaOnlineEvidence",
    "kukaCommsSatisfiedEvidence",
    "kukaCommsUnlatchedEvidence"
  ]);

  merged.forEach((incident, incidentIndex) => {
    if (incident.ruleId !== "kukaCommsUnsatisfied") return;

    const incidentTime = parseErrorAnalyzerTimestampMs(incident.timestamp);
    const related = [];
    let satisfied = null;
    let finalUnlatched = null;

    for (let index = incidentIndex + 1; index < merged.length; index += 1) {
      const candidate = merged[index];
      const elapsed = parseErrorAnalyzerTimestampMs(candidate.timestamp) - incidentTime;
      if (!Number.isFinite(elapsed) || elapsed < 0) continue;
      if (elapsed > 10 * 60 * 1000 || candidate.ruleId === "kukaCommsUnsatisfied") break;
      if (candidate.sourceFile !== incident.sourceFile || !supportRuleIds.has(candidate.ruleId)) continue;

      related.push({ alert: candidate, index });
      if (candidate.ruleId === "kukaCommsSatisfiedEvidence" && !satisfied) {
        satisfied = candidate;
      } else if (satisfied && candidate.ruleId === "kukaCommsUnlatchedEvidence") {
        finalUnlatched = candidate;
        break;
      }
    }

    const latched = related.find(({ alert }) => alert.ruleId === "kukaCommsLatchedEvidence")?.alert;
    const startEvidence = latched || incident;
    const endEvidence = finalUnlatched || satisfied;
    const evidence = [startEvidence, endEvidence]
      .filter(Boolean)
      .sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));
    const messages = Array.from(
      new Set(evidence.flatMap((alert) => alert.messages || [alert.message]))
    ).filter(Boolean);
    const sourceLabels = Array.from(
      new Set(
        [getErrorAnalyzerSourceLabel(incident), ...evidence.map(getErrorAnalyzerSourceLabel)].filter(Boolean)
      )
    );

    related.forEach(({ index }) => consumedIndexes.add(index));
    merged[incidentIndex] = {
      ...incident,
      ruleLabel: "cCchHB",
      typeLabels: ["cCchHB"],
      source: sourceLabels.join("; "),
      subsystem: "",
      timestamp: latched?.timestamp || incident.timestamp,
      endTimestamp: finalUnlatched?.timestamp || satisfied?.timestamp || "",
      message: messages.join("\n"),
      messages,
      note: "Kuka Offline",
      incidentKind: "kukaCommsOutage",
      supportOnly: false,
      relatedRows:
        Number(incident.relatedRows || 1) +
        related.reduce((total, item) => total + Number(item.alert.relatedRows || 1), 0)
    };
  });

  return merged.filter((alert, index) => !consumedIndexes.has(index));
}

function mergeErrorAnalyzerPlateFaultBursts(alerts) {
  const merged = [];

  for (let index = 0; index < alerts.length;) {
    const first = alerts[index];
    if (!isErrorAnalyzerPlateFault(first)) {
      merged.push(first);
      index += 1;
      continue;
    }

    const group = [first];
    let cursor = index + 1;
    while (cursor < alerts.length) {
      const candidate = alerts[cursor];
      const previous = group[group.length - 1];
      const elapsed =
        parseErrorAnalyzerTimestampMs(candidate.timestamp) -
        parseErrorAnalyzerTimestampMs(previous.timestamp);
      if (
        candidate.sourceFile !== first.sourceFile ||
        !isErrorAnalyzerPlateFault(candidate) ||
        !Number.isFinite(elapsed) ||
        elapsed < 0 ||
        elapsed > 2000
      ) {
        break;
      }
      group.push(candidate);
      cursor += 1;
    }

    if (group.length < 4) {
      merged.push(...group);
      index = cursor;
      continue;
    }

    merged.push(combineErrorAnalyzerPlateFaultBurst(group));
    index = cursor;
  }

  return merged;
}

function isErrorAnalyzerPlateFault(alert) {
  return (
    alert?.ruleId === "errorCode" &&
    (alert.messages || [alert.message]).some((message) => ERROR_ANALYZER_RS_PLATE_FAULT_RE.test(message))
  );
}

function combineErrorAnalyzerPlateFaultBurst(group) {
  const first = group[0];
  const messages = group.flatMap((alert) => alert.messages || [alert.message]).filter(Boolean);
  const typeLabels = Array.from(
    new Set(
      messages
        .map((message) => getErrorAnalyzerCode(message))
        .filter(Boolean)
        .map((code) => `ERROR-${code}`)
    )
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const plates = Array.from(
    new Set(messages.map((message) => String(message).match(/\bPlate\s+(\d+)\b/i)?.[1]).filter(Boolean))
  ).sort((left, right) => Number(left) - Number(right));

  return {
    ...first,
    ruleLabel: typeLabels.join(" / "),
    typeLabels,
    message: messages.join("\n"),
    messages,
    note: plates.length ? `RS plate faults - ${plates.length} plates` : "RS plate faults",
    incidentKind: "plateFaultBurst",
    relatedRows: group.reduce((total, alert) => total + Number(alert.relatedRows || 1), 0)
  };
}

function mergeErrorAnalyzerContinuousEnvironmentAlerts(alerts) {
  const groups = [];
  const currentGroups = new Map();

  alerts.forEach((alert, index) => {
    const kind = getErrorAnalyzerTicEnvironmentKind(alert);
    if (!kind) return;

    let currentGroup = currentGroups.get(kind) || [];
    const previous = currentGroup[currentGroup.length - 1];
    const sameDate =
      !previous ||
      splitErrorAnalyzerTimestamp(previous.alert.timestamp).date ===
        splitErrorAnalyzerTimestamp(alert.timestamp).date;
    const elapsed = previous
      ? parseErrorAnalyzerTimestampMs(alert.timestamp) -
        parseErrorAnalyzerTimestampMs(previous.alert.timestamp)
      : 0;

    if (previous && (!sameDate || !Number.isFinite(elapsed) || elapsed < 0 || elapsed > 30 * 60 * 1000)) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push({ alert, index, kind });
    currentGroups.set(kind, currentGroup);
  });
  currentGroups.forEach((group) => {
    if (group.length) groups.push(group);
  });

  const replacements = new Map();
  const skippedIndexes = new Set();
  groups
    .filter((group) => group.length >= 2)
    .forEach((group) => {
      replacements.set(group[0].index, combineErrorAnalyzerEnvironmentRun(group));
      group.slice(1).forEach((item) => skippedIndexes.add(item.index));
    });

  return alerts
    .map((alert, index) => replacements.get(index) || (skippedIndexes.has(index) ? null : alert))
    .filter(Boolean)
    .sort(
      (left, right) =>
        parseErrorAnalyzerTimestampMs(left.timestamp) - parseErrorAnalyzerTimestampMs(right.timestamp)
    );
}

function mergeErrorAnalyzerHeapFreeAlerts(alerts) {
  const groups = [];
  const currentGroups = new Map();

  alerts.forEach((alert, index) => {
    if (alert.ruleId !== "heapFree") return;
    const details = getErrorAnalyzerHeapFreeDetails(alert.message);
    const key = details.processKey || "rtp";
    let currentGroup = currentGroups.get(key) || [];
    const previous = currentGroup[currentGroup.length - 1];
    const sameDate =
      !previous ||
      splitErrorAnalyzerTimestamp(previous.alert.timestamp).date ===
        splitErrorAnalyzerTimestamp(alert.timestamp).date;
    const elapsed = previous
      ? parseErrorAnalyzerTimestampMs(alert.timestamp) -
        parseErrorAnalyzerTimestampMs(previous.alert.timestamp)
      : 0;

    if (
      previous &&
      (previous.details.severity !== details.severity ||
        !sameDate ||
        !Number.isFinite(elapsed) ||
        elapsed < 0 ||
        elapsed > 30 * 60 * 1000)
    ) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentGroup.push({ alert, details, index });
    currentGroups.set(key, currentGroup);
  });
  currentGroups.forEach((group) => {
    if (group.length) groups.push(group);
  });

  const replacements = new Map();
  const skippedIndexes = new Set();
  groups
    .filter((group) => group.length >= 2)
    .forEach((group) => {
      replacements.set(group[0].index, combineErrorAnalyzerHeapFreeRun(group));
      group.slice(1).forEach((item) => skippedIndexes.add(item.index));
    });

  return alerts
    .map((alert, index) => replacements.get(index) || (skippedIndexes.has(index) ? null : alert))
    .filter(Boolean)
    .sort(
      (left, right) =>
        parseErrorAnalyzerTimestampMs(left.timestamp) - parseErrorAnalyzerTimestampMs(right.timestamp)
    );
}

function combineErrorAnalyzerHeapFreeRun(group) {
  const first = group[0].alert;
  const last = group[group.length - 1].alert;
  const details = group[0].details;
  const messages = group.flatMap(({ alert }) => alert.messages || [alert.message]).filter(Boolean);
  const isCritical = details.severity === "CRITICAL";

  return {
    ...first,
    ruleLabel: isCritical ? "Heap CRIT" : "Heap WARN",
    typeLabels: [isCritical ? "Heap CRIT" : "Heap WARN"],
    level: isCritical ? "critical" : "warning",
    endTimestamp: last.timestamp,
    message: messages.join("\n"),
    messages,
    note: `${details.processLabel || "RTP"} Heap Free × ${messages.length}`,
    incidentKind: isCritical ? "heapFreeCriticalRun" : "heapFreeWarningRun",
    relatedRows: group.reduce(
      (total, { alert }) => total + Number(alert.relatedRows || 1),
      0
    )
  };
}

function mergeErrorAnalyzerRepeatedDisplayAlerts(alerts) {
  const merged = [];

  for (let index = 0; index < alerts.length;) {
    const first = alerts[index];
    const kind = getErrorAnalyzerRepeatedDisplayKind(first);
    if (!kind) {
      merged.push(first);
      index += 1;
      continue;
    }

    const group = [first];
    let cursor = index + 1;
    while (
      cursor < alerts.length &&
      getErrorAnalyzerRepeatedDisplayKind(alerts[cursor]) === kind
    ) {
      group.push(alerts[cursor]);
      cursor += 1;
    }

    if (group.length < 4) {
      merged.push(...group);
    } else {
      merged.push(combineErrorAnalyzerRepeatedDisplayRun(group, kind));
    }
    index = cursor;
  }

  return merged;
}

function getErrorAnalyzerRepeatedDisplayKind(alert) {
  if (
    alert?.ruleId === "serviceStop" &&
    getErrorAnalyzerTerminationCondition(alert.message) === "BEAM_KEY"
  ) {
    return "serviceBeamKey";
  }
  if (
    alert?.ruleId === "errorCode" &&
    (alert.messages || [alert.message]).some((message) =>
      ERROR_ANALYZER_SM_COOLING_PRESSURE_RE.test(message)
    )
  ) {
    return "smCooling";
  }
  return "";
}

function combineErrorAnalyzerRepeatedDisplayRun(group, kind) {
  const first = group[0];
  const last = group[group.length - 1];
  const messages = group.flatMap((alert) => alert.messages || [alert.message]).filter(Boolean);
  const isBeamKey = kind === "serviceBeamKey";

  return {
    ...first,
    ruleLabel: isBeamKey ? "hBKey" : "wSMSt",
    typeLabels: [isBeamKey ? "hBKey" : "wSMSt"],
    endTimestamp: last.timestamp,
    message: messages.join("\n"),
    messages,
    note: isBeamKey ? `Beam key × ${messages.length}` : `SM Cooling × ${messages.length}`,
    incidentKind: isBeamKey ? "serviceBeamKeyRun" : "smCoolingRun",
    relatedRows: group.reduce((total, alert) => total + Number(alert.relatedRows || 1), 0)
  };
}

function getErrorAnalyzerTicEnvironmentKind(alert) {
  if (alert?.ruleId !== "errorCode") return "";
  const messages = alert.messages || [alert.message];
  if (messages.some((message) => ERROR_ANALYZER_TIC_TEMPERATURE_RE.test(message))) return "temperature";
  if (messages.some((message) => ERROR_ANALYZER_TIC_PRESSURE_RE.test(message))) return "pressure";
  return "";
}

function combineErrorAnalyzerEnvironmentRun(group) {
  const first = group[0].alert;
  const last = group[group.length - 1].alert;
  const kind = group[0].kind;
  const messages = group.flatMap(({ alert }) => alert.messages || [alert.message]).filter(Boolean);
  const displayName = kind === "temperature" ? "temperature" : "pressure";

  return {
    ...first,
    ruleLabel: "dEnv",
    typeLabels: ["dEnv"],
    endTimestamp: last.timestamp,
    message: messages.join("\n"),
    messages,
    note: `TIC ${displayName} spread`,
    incidentKind: kind === "temperature" ? "ticTemperatureRun" : "ticPressureRun",
    relatedRows: group.reduce((total, { alert }) => total + Number(alert.relatedRows || 1), 0)
  };
}

function mergeErrorAnalyzerDosPairAlerts(alerts) {
  const merged = [];

  alerts.forEach((originalAlert) => {
    const alert = cloneErrorAnalyzerAlert(originalAlert);
    const axes = alert.dosAxes || [];
    const errorCode = getErrorAnalyzerCode(alert.message);
    if (alert.ruleId !== "errorCode" || !errorCode || !axes.length) {
      merged.push(alert);
      return;
    }

    const alertTime = parseErrorAnalyzerTimestampMs(alert.timestamp);
    let matchIndex = -1;
    for (let index = merged.length - 1; index >= 0; index -= 1) {
      const candidate = merged[index];
      const elapsed = alertTime - parseErrorAnalyzerTimestampMs(candidate.timestamp);
      if (Number.isFinite(elapsed) && elapsed > 500) break;
      if (
        candidate.sourceFile === alert.sourceFile &&
        candidate.ruleId === "errorCode" &&
        getErrorAnalyzerCode(candidate.message) === errorCode &&
        (candidate.dosAxes || []).length > 0 &&
        !(candidate.dosAxes || []).some((axis) => axes.includes(axis))
      ) {
        matchIndex = index;
        break;
      }
    }

    if (matchIndex < 0) {
      merged.push(alert);
      return;
    }

    const candidate = merged[matchIndex];
    appendErrorAnalyzerMessage(candidate, alert.message);
    const combinedAxes = Array.from(new Set([...(candidate.dosAxes || []), ...axes]));
    const sourceLabels = Array.from(
      new Set([getErrorAnalyzerSourceLabel(candidate), getErrorAnalyzerSourceLabel(alert)].filter(Boolean))
    );
    candidate.source = sourceLabels.join("; ");
    candidate.subsystem = "";
    candidate.dosAxes = combinedAxes;
    candidate.note = appendErrorAnalyzerDosAxes(candidate.note, { dosAxes: combinedAxes });
    candidate.relatedRows += alert.relatedRows;
  });

  return merged;
}

function cloneErrorAnalyzerAlert(alert) {
  return {
    ...alert,
    messages: Array.from(alert.messages || [alert.message]),
    dosAxes: Array.from(alert.dosAxes || [])
  };
}

function getErrorAnalyzerDosAxes(value) {
  const sourceText =
    typeof value === "string" ? value : [value?.source, value?.subsystem].filter(Boolean).join(" ");
  const axes = Array.from(value?.dosAxes || []);
  if (/\bDOSY(?:_|\b)/i.test(sourceText)) axes.push("DOS Y");
  if (/\bDOSX(?:_|\b)/i.test(sourceText)) axes.push("DOS X");
  return Array.from(new Set(axes));
}

function getErrorAnalyzerDosAxis(value) {
  return getErrorAnalyzerDosAxes(value)[0] || "";
}

function appendErrorAnalyzerDosAxes(note, value) {
  const base = String(note || "").trim();
  const baseUpper = base.toUpperCase();
  const missingAxes = getErrorAnalyzerDosAxes(value).filter((axis) => !baseUpper.includes(axis));
  return [base, ...missingAxes].filter(Boolean).join(" / ");
}

function getErrorAnalyzerCode(message) {
  return String(message || "").match(/ERROR-(\d+)\b/i)?.[1] || "";
}

function isErrorAnalyzerTerminationRuleId(ruleId) {
  return ["clinicalStop", "serviceStop", "operationalStop"].includes(ruleId);
}

function getErrorAnalyzerTerminationCondition(message) {
  return (
    String(message || "")
      .match(
        /Logging Abnormal Termination Condition:\s*(.+?)\s+in\s+(?:CLINICAL|SERVICE|PHYSICS|QA)\b/i
      )?.[1]
      ?.trim()
      ?.toUpperCase() || ""
  );
}

function getErrorAnalyzerHeapFreeDetails(value) {
  const message = typeof value === "string" ? value : value?.message;
  const match = String(message || "").match(ERROR_ANALYZER_HEAP_FREE_RE);
  if (!match) {
    return {
      severity: "",
      processKey: "",
      processLabel: "",
      freeMb: "",
      recommendedMb: ""
    };
  }

  const processKey = match[2].toLowerCase();
  const processName = processKey.replace(/_manager$/i, "");
  const processLabel = processName
    .split("_")
    .filter(Boolean)
    .map((part) =>
      part.length <= 4
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    )
    .join(" ");
  return {
    severity: match[1].toUpperCase(),
    processKey,
    processLabel,
    freeMb: match[3],
    recommendedMb: match[4]
  };
}

function normalizeErrorAnalyzerInterlockKey(value) {
  return String(value || "")
    .replace(/^IL_/i, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

function getErrorAnalyzerInterlockEntries() {
  return Array.isArray(window.MevionInterlockCatalog?.entries) ? window.MevionInterlockCatalog.entries : [];
}

function getErrorAnalyzerInterlockByCode(code) {
  const normalizedCode = String(code || "")
    .trim()
    .toLowerCase();
  if (!normalizedCode) return null;
  return (
    getErrorAnalyzerInterlockEntries().find(
      (entry) => String(entry.code || "").toLowerCase() === normalizedCode
    ) || null
  );
}

function getErrorAnalyzerInterlockByCondition(condition) {
  const normalizedCondition = normalizeErrorAnalyzerInterlockKey(condition);
  if (!normalizedCondition) return null;

  const aliasCode =
    window.MevionInterlockCatalog?.conditionAliases?.[
      String(condition || "")
        .trim()
        .toUpperCase()
    ] ||
    ERROR_ANALYZER_TERMINATION_TYPES[
      String(condition || "")
        .trim()
        .toUpperCase()
    ];
  const aliasMatch = getErrorAnalyzerInterlockByCode(aliasCode);
  if (aliasMatch) return aliasMatch;

  const matches = getErrorAnalyzerInterlockEntries().filter((entry) => {
    const enumKey = normalizeErrorAnalyzerInterlockKey(entry.enumId);
    return enumKey === normalizedCondition || enumKey.endsWith(normalizedCondition);
  });
  return matches.length === 1 ? matches[0] : null;
}

function getErrorAnalyzerInterlockForAlert(alert) {
  const byLabel = getErrorAnalyzerInterlockByCode(alert?.ruleLabel);
  if (byLabel) return byLabel;
  if (isErrorAnalyzerTerminationRuleId(alert?.ruleId)) {
    return getErrorAnalyzerInterlockByCondition(getErrorAnalyzerTerminationCondition(alert.message));
  }
  return null;
}

function getErrorAnalyzerInterlockExplanation(entry) {
  return entry?.guideSatisfiedCondition || entry?.satisfiedCondition || "";
}

function isErrorAnalyzerTermination(alert, condition) {
  return (
    isErrorAnalyzerTerminationRuleId(alert.ruleId) &&
    getErrorAnalyzerTerminationCondition(alert.message) === condition
  );
}

function getErrorAnalyzerRsCvFailedPlates(value) {
  const messages = Array.isArray(value)
    ? value
    : value?.messages || [typeof value === "string" ? value : value?.message];
  return Array.from(
    new Set(
      messages
        .filter((message) => ERROR_ANALYZER_RS_CV_RE.test(message))
        .map((message) => String(message || "").match(/\bPlate\s+(\d+)\b/i)?.[1])
        .filter(Boolean)
    )
  ).sort((left, right) => Number(left) - Number(right));
}

function isErrorAnalyzerDoseComparisonMessage(message) {
  return (
    ERROR_ANALYZER_DOSE_COMPARE_RE.test(message) ||
    ERROR_ANALYZER_DOSE_COMPARE_SUMMARY_RE.test(message)
  );
}

function getErrorAnalyzerDoseErrorType(message) {
  return ERROR_ANALYZER_DOSE_ERROR_TYPES.find((candidate) => candidate.matches(message)) || null;
}

function getErrorAnalyzerKnownErrorType(message) {
  return ERROR_ANALYZER_KNOWN_ERROR_TYPES.find((candidate) => candidate.matches(message)) || null;
}

function getErrorAnalyzerDoseComparisonName(message) {
  return (
    String(message || "").match(
      /ERROR-\d+\b:\s*([A-Za-z0-9-]+)\s+charge comparison (?:failure|error)\b/i
    )?.[1] || ""
  );
}

function getErrorAnalyzerPulseNumber(message) {
  return String(message || "").match(/\bon pulse\s+(\d+)\b/i)?.[1] || "";
}

function getErrorAnalyzerSourceLabel(alert) {
  return [alert.source, alert.subsystem].filter((value) => value && value !== "null").join(" / ");
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

function parseErrorAnalyzerCsvRecords(text, onRecord, options = {}) {
  const source = String(text || "");
  const sourceLength = source.length;
  let recordStart = source.charCodeAt(0) === 0xfeff ? 1 : 0;
  let inQuotes = false;
  let recordIndex = 0;

  function emitRecord(endIndex) {
    let rawRecord = source.slice(recordStart, endIndex);
    if (rawRecord.endsWith("\r")) rawRecord = rawRecord.slice(0, -1);
    if (!rawRecord) return;

    if (typeof options.shouldParse === "function" && !options.shouldParse(rawRecord, recordIndex)) {
      if (typeof options.onSkipped === "function") options.onSkipped(rawRecord, recordIndex);
    } else {
      onRecord(parseErrorAnalyzerCsvRecord(rawRecord));
    }
    recordIndex += 1;
  }

  let scanIndex = recordStart;
  while (scanIndex < sourceLength) {
    const quoteIndex = source.indexOf('"', scanIndex);
    if (inQuotes) {
      if (quoteIndex < 0) break;
      if (source[quoteIndex + 1] === '"') {
        scanIndex = quoteIndex + 2;
      } else {
        inQuotes = false;
        scanIndex = quoteIndex + 1;
      }
      continue;
    }

    const newlineIndex = source.indexOf("\n", scanIndex);
    if (newlineIndex < 0) break;
    if (quoteIndex >= 0 && quoteIndex < newlineIndex) {
      if (quoteIndex === recordStart || source[quoteIndex - 1] === ",") inQuotes = true;
      scanIndex = quoteIndex + 1;
      continue;
    }

    emitRecord(newlineIndex);
    recordStart = newlineIndex + 1;
    scanIndex = recordStart;
  }

  if (recordStart < sourceLength) emitRecord(sourceLength);
}

function parseErrorAnalyzerCsvRecord(rawRecord) {
  const columns = [];
  const sourceLength = rawRecord.length;
  let fieldStart = 0;
  let inQuotes = false;

  function pushField(endIndex) {
    let field = rawRecord.slice(fieldStart, endIndex);
    if (field.startsWith('"') && field.endsWith('"')) {
      field = field.slice(1, -1).replace(/""/g, '"');
    }
    columns.push(field);
  }

  for (let index = 0; index < sourceLength; index += 1) {
    const char = rawRecord[index];
    if (inQuotes) {
      if (char === '"' && rawRecord[index + 1] === '"') {
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      }
    } else if (char === '"' && index === fieldStart) {
      inQuotes = true;
    } else if (char === "," && !inQuotes) {
      pushField(index);
      fieldStart = index + 1;
    }
  }

  pushField(sourceLength);
  return columns;
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

function isErrorAnalyzerDataRecord(columns) {
  if (columns.length < 7) return false;
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(String(columns[0] || "").trim());
}

function getErrorAnalyzerDefaultHeaderIndexes() {
  return {
    timestamp: 0,
    severity: 1,
    source: 2,
    subsystem: 3,
    category: 4,
    message: 6,
    extra: 7
  };
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

  const countLevel = (level) => analysis.alerts.filter((alert) => alert.level === level).length;
  const criticalCount = countLevel("critical");
  const serviceCount = countLevel("service");
  const warningCount = countLevel("warning");

  summary.innerHTML = `
    <strong>已识别事件: ${analysis.alerts.length}</strong>
    ${renderErrorAnalyzerLevelFilter("critical", "Clinical", criticalCount, analysis.alerts)}
    ${renderErrorAnalyzerLevelFilter("warning", "Warning", warningCount, analysis.alerts)}
    ${renderErrorAnalyzerLevelFilter("service", "Service", serviceCount, analysis.alerts)}
    ${
      errorAnalyzerState.typeFilter
        ? `<button class="error-analyzer-type-filter-reset" type="button" data-error-type-reset
            title="清除 Type 筛选">
            当前筛选: <b>${escapeErrorAnalyzerHtml(errorAnalyzerState.typeFilter)}</b>
            <span aria-hidden="true">&times;</span>
          </button>`
        : ""
    }
    <small>联锁名称参考 37022R13 / SAF19-JA4</small>
  `;

  summary.querySelectorAll("[data-error-level-filter]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      errorAnalyzerState.levelVisibility[checkbox.dataset.errorLevelFilter] = checkbox.checked;
      renderErrorAnalyzer();
    });
  });

  summary.querySelectorAll("[data-error-type-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      errorAnalyzerState.typeFilter = button.dataset.errorTypeFilter || "";
      renderErrorAnalyzer();
    });
  });

  summary.querySelector("[data-error-type-reset]")?.addEventListener("click", () => {
    errorAnalyzerState.typeFilter = "";
    renderErrorAnalyzer();
  });

  if (!analysis.alerts.length) {
    results.innerHTML = '<div class="error-analyzer-empty">未发现当前规则内需要关注的报错。</div>';
    return;
  }

  const visibleAlerts = filterErrorAnalyzerAlertsByLevel(analysis.alerts);
  const sortedAlerts = getSortedErrorAnalyzerAlerts(visibleAlerts);
  const sortMeta = getErrorAnalyzerSortMeta();
  const rowsHtml = sortedAlerts.length
    ? sortedAlerts.map((alert, index) => renderErrorAnalyzerRow(alert, index)).join("")
    : '<tr><td class="error-analyzer-filter-empty" colspan="6">当前筛选下没有事件。</td></tr>';

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
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
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

  results.querySelectorAll("[data-error-message-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const messageGroup = button.closest(".error-analyzer-message");
      const extraMessages = messageGroup?.querySelector(".error-analyzer-message-extra");
      if (!extraMessages) return;

      const expanded = button.getAttribute("aria-expanded") === "true";
      extraMessages.hidden = expanded;
      button.setAttribute("aria-expanded", String(!expanded));
      button.textContent = expanded
        ? `展开 ${button.dataset.messageCount} 条 ▾`
        : `已展开 ${button.dataset.messageCount} 条 ▴`;
    });
  });
}

function renderErrorAnalyzerLevelFilter(level, label, count, alerts) {
  const checked = errorAnalyzerState.levelVisibility[level] !== false ? " checked" : "";
  const tooltipId = `errorAnalyzer${label}Stats`;
  const statistics = getErrorAnalyzerLevelStatistics(alerts, level);
  const statisticsHtml = statistics.length
    ? statistics
        .map(
          ({ label: typeLabel, count: typeCount }) =>
            `<button type="button" data-error-type-filter="${escapeErrorAnalyzerHtml(typeLabel)}"
                title="只显示 ${escapeErrorAnalyzerHtml(typeLabel)}">
              <b>${escapeErrorAnalyzerHtml(typeLabel)}</b><i>&times; ${typeCount}</i>
            </button>`
        )
        .join("")
    : "<em>No events</em>";
  return `
    <span class="error-analyzer-summary-item error-analyzer-level-filter level-${level}">
      <label class="error-analyzer-level-filter-control">
        <input type="checkbox" data-error-level-filter="${level}" aria-describedby="${tooltipId}"${checked} />
        <span>${label}</span>
        <b>${count}</b>
      </label>
      <span id="${tooltipId}" class="error-analyzer-level-tooltip" role="tooltip">
        <strong>${label}<small>点击 Type 筛选</small></strong>
        ${statisticsHtml}
      </span>
    </span>
  `;
}

function getErrorAnalyzerLevelStatistics(alerts, level) {
  const counts = new Map();
  Array.from(alerts || [])
    .filter((alert) => alert.level === level)
    .forEach((alert) => {
      const labels = getErrorAnalyzerAlertTypeLabels(alert);
      Array.from(new Set(labels.filter(Boolean))).forEach((label) => {
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    });
  return Array.from(counts, ([label, count]) => ({ label, count })).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base", numeric: true })
  );
}

function getErrorAnalyzerAlertTypeLabels(alert) {
  return Array.isArray(alert?.typeLabels) && alert.typeLabels.length
    ? Array.from(alert.typeLabels)
    : [alert?.ruleLabel].filter(Boolean);
}

function filterErrorAnalyzerAlertsByLevel(
  alerts,
  visibility = errorAnalyzerState.levelVisibility,
  typeFilter = errorAnalyzerState.typeFilter
) {
  return Array.from(alerts || []).filter(
    (alert) =>
      visibility?.[alert.level] !== false &&
      (!typeFilter || getErrorAnalyzerAlertTypeLabels(alert).includes(typeFilter))
  );
}

function getSortedErrorAnalyzerAlerts(alerts) {
  const sorted = Array.from(alerts || []);
  const direction = errorAnalyzerState.sortMode === "type-desc" ? -1 : 1;
  sorted.sort((left, right) => {
    if (errorAnalyzerState.sortMode !== "time") {
      const typeOrder = String(left.ruleLabel || "").localeCompare(String(right.ruleLabel || ""), undefined, {
        sensitivity: "base",
        numeric: true
      });
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
    return {
      className: "sort-descending",
      ariaSort: "descending",
      label: "Type 倒序分组；组内按时间从早到晚"
    };
  }
  return { className: "sort-neutral", ariaSort: "none", label: "当前按时间排序；点击后按 Type 分组" };
}

function renderErrorAnalyzerRow(alert, index) {
  const timestamp = splitErrorAnalyzerTimestamp(alert.timestamp);
  return `
    <tr class="error-analyzer-row level-${alert.level}">
      <td class="error-analyzer-index">${index + 1}</td>
      <td>${escapeErrorAnalyzerHtml(timestamp.date)}</td>
      <td>${renderErrorAnalyzerTime(alert, timestamp)}</td>
      <td class="error-analyzer-type-cell">${renderErrorAnalyzerTypes(alert)}</td>
      <td class="error-analyzer-note">${renderErrorAnalyzerNote(alert)}</td>
      <td>
        <div class="error-analyzer-message">${renderErrorAnalyzerMessages(alert)}</div>
      </td>
    </tr>
  `;
}

function renderErrorAnalyzerTime(alert, startTimestamp) {
  if (!alert.endTimestamp) return escapeErrorAnalyzerHtml(startTimestamp.time);

  const endTimestamp = splitErrorAnalyzerTimestamp(alert.endTimestamp);
  const endLabel =
    endTimestamp.date === startTimestamp.date
      ? endTimestamp.time
      : `${endTimestamp.date} ${endTimestamp.time}`;
  return `
    <div class="error-analyzer-time-range">
      <span>${escapeErrorAnalyzerHtml(startTimestamp.time)}</span>
      <span class="error-analyzer-time-separator">to</span>
      <span>${escapeErrorAnalyzerHtml(endLabel)}</span>
    </div>
  `;
}

function renderErrorAnalyzerTypes(alert) {
  const labels = getErrorAnalyzerAlertTypeLabels(alert);
  return labels
    .map(
      (label) =>
        `<span class="error-analyzer-type type-${alert.level}">${escapeErrorAnalyzerHtml(label)}</span>`
    )
    .join("");
}

function renderErrorAnalyzerNote(alert) {
  const { main, axis } = getErrorAnalyzerNoteDisplayParts(alert);
  const explanation = getErrorAnalyzerInterlockExplanation(getErrorAnalyzerInterlockForAlert(alert));
  const title = explanation ? ` title="${escapeErrorAnalyzerHtml(explanation)}"` : "";
  const content = [
    main
      ? `<span class="error-analyzer-note-main">${escapeErrorAnalyzerHtml(main)}</span>`
      : "",
    axis
      ? `<span class="error-analyzer-note-axis">${escapeErrorAnalyzerHtml(axis)}</span>`
      : ""
  ]
    .filter(Boolean)
    .join("");
  return `<div class="error-analyzer-note-summary"${title}>${content || "-"}</div>`;
}

function getErrorAnalyzerNoteDisplayParts(alert) {
  const summary = getErrorAnalyzerNoteSummary(alert);
  const axes = getErrorAnalyzerDosAxes(alert);
  if (!axes.length) return { main: summary, axis: "" };

  const axisLabels = new Set(axes.map((axis) => axis.toUpperCase()));
  const main = String(summary || "")
    .split(/\s*\/\s*/)
    .filter((part) => !axisLabels.has(part.toUpperCase()))
    .join(" / ");
  return { main, axis: axes.join(" / ") };
}

function getErrorAnalyzerNoteSummary(alert) {
  return appendErrorAnalyzerDosAxes(getErrorAnalyzerBaseNoteSummary(alert), alert);
}

function getErrorAnalyzerBaseNoteSummary(alert) {
  if (alert.incidentKind === "serviceBeamKeyRun" || alert.incidentKind === "smCoolingRun") {
    return String(alert.note || "");
  }

  if (alert.incidentKind === "cigCollision") {
    return "Nozzle collision";
  }

  if (alert.incidentKind === "pulseRetry") {
    return "Pulse retry limit";
  }

  if (alert.incidentKind === "spotChargeLimit") {
    return "Spot charge limit";
  }

  if (alert.incidentKind === "doseLayerShift" || alert.incidentKind === "spotSize") {
    return String(alert.note || "");
  }

  if (alert.incidentKind === "doseCompare" || isErrorAnalyzerDoseComparisonMessage(alert.message)) {
    const comparisonName = getErrorAnalyzerDoseComparisonName(alert.message);
    if (comparisonName) return comparisonName;
  }

  if (String(alert.incidentKind || "").startsWith("adaptiveAperture")) {
    return String(alert.note || "AA Pos Mismatch");
  }

  if (isErrorAnalyzerTerminationRuleId(alert.ruleId)) {
    const condition = getErrorAnalyzerTerminationCondition(alert.message);
    if (condition) return formatErrorAnalyzerCondition(condition);
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

  if (alert.incidentKind === "rsCalibrationVerification" || ERROR_ANALYZER_RS_CV_RE.test(alert.message)) {
    const failedPlates = getErrorAnalyzerRsCvFailedPlates(alert);
    if (failedPlates.length > 1) return `CV failed × ${failedPlates.length}`;
    return `CV failed${failedPlates.length ? ` - Plate ${failedPlates[0]}` : ""}`;
  }

  return String(alert.note || "");
}

function formatErrorAnalyzerCondition(condition) {
  const acronyms = new Map([
    ["xyz", "XYZ"],
    ["rs", "RS"],
    ["tic", "TIC"],
    ["dos", "DOS"]
  ]);
  const words = String(condition || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .split(/\s+/);
  return words
    .map((word, index) => {
      if (acronyms.has(word)) return acronyms.get(word);
      return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
    .join(" ");
}

function renderErrorAnalyzerMessages(alert) {
  const messages =
    Array.isArray(alert.messages) && alert.messages.length
      ? alert.messages
      : String(alert.message || "").split("\n");
  const renderLine = (message, className = "") =>
    `<div class="error-analyzer-message-line${className}" title="${escapeErrorAnalyzerHtml(message)}">${highlightErrorAnalyzerMessage(message, alert)}</div>`;

  if (messages.length <= 3) return messages.map((message) => renderLine(message)).join("");

  const visibleMessages = messages.slice(0, 3);
  const hiddenMessages = messages.slice(3);
  const firstMessage = `
    <div class="error-analyzer-message-line error-analyzer-message-line-with-toggle">
      <span title="${escapeErrorAnalyzerHtml(visibleMessages[0])}">${highlightErrorAnalyzerMessage(visibleMessages[0], alert)}</span>
      <button class="error-analyzer-message-toggle" type="button"
        data-error-message-toggle data-message-count="${messages.length}" aria-expanded="false">
        展开 ${messages.length} 条 ▾
      </button>
    </div>
  `;
  return (
    firstMessage +
    visibleMessages
      .slice(1)
      .map((message) => renderLine(message))
      .join("") +
    `<div class="error-analyzer-message-extra" hidden>` +
    hiddenMessages.map((message) => renderLine(message)).join("") +
    "</div>"
  );
}

function highlightErrorAnalyzerMessage(message, alert) {
  const html = escapeErrorAnalyzerHtml(message);
  if (alert.ruleId === "vacuum") return highlightErrorAnalyzerVacuumMessage(html);
  if (ERROR_ANALYZER_DTIME_DETAIL_RE.test(message)) return highlightErrorAnalyzerDTimeMessage(html);
  if (ERROR_ANALYZER_AA_POSITION_MISMATCH_RE.test(message)) {
    return highlightErrorAnalyzerAaPositionMismatchMessage(html);
  }
  if (ERROR_ANALYZER_AA_AXIS_STATUS_RE.test(message)) {
    return highlightErrorAnalyzerAaAxisStatusMessage(html);
  }
  if (
    alert.incidentKind === "rsCalibrationVerification" ||
    ERROR_ANALYZER_RS_CV_RE.test(message) ||
    ERROR_ANALYZER_RS_CV_RESULT_RE.test(message)
  ) {
    return highlightErrorAnalyzerRsCvMessage(html);
  }
  const doseErrorType = getErrorAnalyzerDoseErrorType(message);
  if (doseErrorType?.highlight) return doseErrorType.highlight(html);
  if (ERROR_ANALYZER_SM_COOLING_PRESSURE_RE.test(message)) {
    return highlightErrorAnalyzerSmCoolingPressureMessage(html);
  }
  if (ERROR_ANALYZER_TIC_ENVIRONMENT_RE.test(message)) {
    return highlightErrorAnalyzerTicEnvironmentMessage(html);
  }
  if (ERROR_ANALYZER_RS_PLATE_MOTION_CODE_RE.test(message)) {
    return highlightErrorAnalyzerRangeShifterMotionMessage(html);
  }
  if (ERROR_ANALYZER_HEAP_FREE_RE.test(message)) {
    return highlightErrorAnalyzerHeapFreeMessage(html);
  }
  if (isErrorAnalyzerTerminationRuleId(alert.ruleId)) {
    return highlightErrorAnalyzerTerminationMessage(html, alert.level);
  }
  return html;
}

function highlightErrorAnalyzerVacuumMessage(html) {
  const withSensor = html.replace(
    /^((?:G[45])\s*\([^)]+\))/i,
    '<span class="error-analyzer-evidence-label">$1</span>'
  );
  return withSensor.replace(
    /(pressure of\s*)(\d+(?:\.\d+)?e[+-]\d+)(\s+torr exceeds\s*)(WARNING|INTERLOCK)(\s+threshold of\s*)(\d+(?:\.\d+)?e[+-]\d+)/i,
    (match, beforeValue, value, beforeLevel, level, beforeThreshold, threshold) => {
      const normalizedLevel = level.toLowerCase();
      return (
        `${beforeValue}<span class="error-analyzer-measured-value">${value}</span>${beforeLevel}` +
        `<span class="error-analyzer-severity-token level-${normalizedLevel}">${level}</span>${beforeThreshold}` +
        `<span class="error-analyzer-threshold-value">${threshold}</span>`
      );
    }
  );
}

function highlightErrorAnalyzerDTimeMessage(html) {
  return html.replace(
    /(Beam-On time of\s+)(\d+(?:\.\d+)?s)(\s+exceeds maximum of\s+)(\d+(?:\.\d+)?s)/i,
    '$1<span class="error-analyzer-measured-value">$2</span>$3' +
      '<span class="error-analyzer-threshold-value">$4</span>'
  );
}

function highlightErrorAnalyzerAaPositionMismatchMessage(html) {
  return html.replace(
    /(\bPosition mismatch error:\s*)([01](?:\|[01]{4}){4})\b/i,
    '$1<span class="error-analyzer-evidence-label">$2</span>'
  );
}

function highlightErrorAnalyzerAaAxisStatusMessage(html) {
  return html
    .replace(
      /^((?:A|B[12]|C[12][A-G]))(?=\s*\(Node)/i,
      '<span class="error-analyzer-evidence-label">$1</span>'
    )
    .replace(/\b(target|err\.?|curr\.?)(?=\s*:)/gi, '<span class="error-analyzer-evidence-label">$1</span>');
}

function highlightErrorAnalyzerRangeShifterMotionMessage(html) {
  return html.replace(
    /(plate\(s\)\s+\d+(?:\s*,\s*\d+)*)/gi,
    '<span class="error-analyzer-evidence-label">$1</span>'
  );
}

function highlightErrorAnalyzerTerminationMessage(html, level) {
  const tokenClass =
    level === "service"
      ? "error-analyzer-service-token"
      : level === "warning"
        ? "error-analyzer-warning-token"
        : "error-analyzer-critical-token";
  return html.replace(
    /(Logging Abnormal Termination Condition:\s*)(.+?)(\s+in\s+(?:CLINICAL|SERVICE|PHYSICS|QA)\b)/i,
    `$1<span class="${tokenClass}">$2</span>$3`
  );
}

function highlightErrorAnalyzerHeapFreeMessage(html) {
  return html
    .replace(
      /\b(WARNING|CRITICAL)\b/i,
      (severity) =>
        `<span class="error-analyzer-${severity.toLowerCase()}-token">${severity}</span>`
    )
    .replace(
      /(\([^)]+_heap_stats\))/i,
      '<span class="error-analyzer-evidence-label">$1</span>'
    )
    .replace(
      /(:\s*)(-?\d+(?:\.\d+)?\s+MB)/i,
      '$1<span class="error-analyzer-measured-value">$2</span>'
    )
    .replace(
      /(Recommend adjustment to\s+)(-?\d+(?:\.\d+)?\s+MB)/i,
      '$1<span class="error-analyzer-threshold-value">$2</span>'
    );
}

function highlightErrorAnalyzerRsCvMessage(html) {
  return html
    .replace(/(Final result:\s*)(FAIL)/gi, '$1<span class="error-analyzer-warning-token">$2</span>')
    .replace(/(Plate\s+\d+)/gi, '<span class="error-analyzer-evidence-label">$1</span>');
}

function highlightErrorAnalyzerDoseCompareMessage(html) {
  return html
    .replace(
      /(ERROR-\d+:\s*)([A-Za-z0-9-]+)(?=\s+charge comparison (?:failure|error))/i,
      '$1<span class="error-analyzer-evidence-label">$2</span>'
    )
    .replace(/\b\d+(?:\.\d+)?\s*pC\b/gi, '<span class="error-analyzer-measured-value">$&</span>');
}

function highlightErrorAnalyzerSmCoolingPressureMessage(html) {
  return html
    .replace(
      /(\bvalue\s*=\s*)(-?\d+(?:\.\d+)?\s*PSI)/i,
      '$1<span class="error-analyzer-measured-value">$2</span>'
    )
    .replace(
      /(\blimits\s*)(\[\s*-?\d+(?:\.\d+)?\s*PSI\s*,\s*-?\d+(?:\.\d+)?\s*PSI\s*\])/i,
      '$1<span class="error-analyzer-threshold-value">$2</span>'
    );
}

function highlightErrorAnalyzerDosePositionMessage(html) {
  return html
    .replace(
      /(\bAverage error for layer\s+)(\d+)/i,
      '$1<span class="error-analyzer-evidence-label">$2</span>'
    )
    .replace(
      /(\()(-?\d+(?:\.\d+)?mm)(\))/i,
      '$1<span class="error-analyzer-measured-value">$2</span>$3'
    )
    .replace(
      /(\btolerance window of\s+)(\[\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\])/i,
      '$1<span class="error-analyzer-threshold-value">$2</span>'
    );
}

function highlightErrorAnalyzerSpotChargeMessage(html) {
  return html.replace(
    /(Spot charge limit)|(\(\d+(?:\.\d+)?%\s+or\s+\d+(?:\.\d+)?\s+pC\))|(\d+(?:\.\d+)?\s+pC)/gi,
    (match, label, tolerance) => {
      const className = label ? "error-analyzer-evidence-label" : "error-analyzer-measured-value";
      return `<span class="${className}">${label || tolerance || match}</span>`;
    }
  );
}

function highlightErrorAnalyzerTicEnvironmentMessage(html) {
  return html.replace(
    /(\b(?:US|DSx|DSy|Tolerance)\s*=\s*)(\d+(?:\.\d+)?\s+(?:hectoPascals|°C|&#0?39;C|&apos;C|degC))/gi,
    '$1<span class="error-analyzer-measured-value">$2</span>'
  );
}

function splitErrorAnalyzerTimestamp(timestamp) {
  const match = String(timestamp || "").match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/);
  return match ? { date: match[1], time: match[2] } : { date: "-", time: String(timestamp || "-") };
}

function updateErrorAnalyzerTimeRangeFromText(timeRange, text) {
  const source = String(text || "");
  const timestampPattern = "([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]+)?)";
  const first = source.match(new RegExp(`(?:^|\\n)\\ufeff?${timestampPattern}(?=,)`));
  if (first) updateErrorAnalyzerTimeRange(timeRange, first[1], true);

  let lineEnd = source.length;
  for (let attempts = 0; lineEnd > 0 && attempts < 100; attempts += 1) {
    const lineStart = source.lastIndexOf("\n", lineEnd - 1) + 1;
    const line = source.slice(lineStart, lineEnd).replace(/\r$/, "");
    const last = line.match(new RegExp(`^\\ufeff?${timestampPattern}(?=,)`));
    if (last) {
      updateErrorAnalyzerTimeRange(timeRange, last[1], true);
      break;
    }
    lineEnd = Math.max(0, lineStart - 1);
  }
}

function updateErrorAnalyzerTimeRange(timeRange, timestamp, isValidated = false) {
  const value = String(timestamp || "").trim();
  if (
    !timeRange ||
    (!isValidated && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value))
  ) {
    return;
  }
  if (!timeRange.start || value < timeRange.start) timeRange.start = value;
  if (!timeRange.end || value > timeRange.end) timeRange.end = value;
}

function formatErrorAnalyzerTimeRange(timeRange) {
  const parseParts = (timestamp) =>
    String(timestamp || "").match(
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):\d{2}(?:\.\d+)?$/
    );
  const start = parseParts(timeRange?.start);
  const end = parseParts(timeRange?.end);
  if (!start || !end) return "";

  const startText = `${Number(start[1])}年${Number(start[2])}月${Number(start[3])}日 ${start[4]}:${start[5]}`;
  if (timeRange.start === timeRange.end) return startText;

  const endText =
    start[1] === end[1]
      ? `${Number(end[2])}月${Number(end[3])}日 ${end[4]}:${end[5]}`
      : `${Number(end[1])}年${Number(end[2])}月${Number(end[3])}日 ${end[4]}:${end[5]}`;
  return `${startText} – ${endText}`;
}

function parseErrorAnalyzerTimestampMs(timestamp) {
  const match = String(timestamp || "").match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/
  );
  if (!match) return NaN;
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6]),
    Number(
      String(match[7] || "0")
        .slice(0, 3)
        .padEnd(3, "0")
    )
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
