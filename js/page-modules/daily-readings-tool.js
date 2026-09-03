/* global copyPlainText */

const dailyReadingsState = {
  snapshots: [],
  selectedDate: "",
  sourceKind: ""
};

const DAILY_READING_LOG_PATHS = Object.freeze([
  { label: "新 TC Logs", value: "/opt/mevion/apps/2.9.1R5_PRODUCTION/logs/" },
  { label: "旧 TC Logs", value: "/backup_logs/MAIN/" },
  { label: "Service Log", value: "/backup_logs/SERVICE_PM/" }
]);

const DAILY_READING_FIELDS = Object.freeze([
  { key: "heliumLevel", label: "Helium Level (%)", pattern: /^He Level:\s*([-+\d.eE]+)%/i, format: "fixed2" },
  { key: "heliumPressure", label: "Helium Pressure (psia)", pattern: /^He Pressure:\s*([-+\d.eE]+)\s+PSIA/i },
  { key: "heaterPower", label: "Heater Power (W)", pattern: /^Heater Power:\s*([-+\d.eE]+)\s+W/i },
  { key: "externalLeadPositive", label: "External Lead (+) (°C)", pattern: /^External Lead \(\+\):\s*([-+\d.eE]+)\s+C/i },
  { key: "externalLeadNegative", label: "External Lead (-) (°C)", pattern: /^External Lead \(-\):\s*([-+\d.eE]+)\s+C/i },
  { key: "htsLead1Top", label: "HTS Lead 1 - Top (K)", pattern: /^Coil Temperature for T1:.*?:\s*([-+\d.eE]+)\s+degrees K/i },
  { key: "htsLead2Top", label: "HTS Lead 2 - Top (K)", pattern: /^Coil Temperature for T2:.*?:\s*([-+\d.eE]+)\s+degrees K/i },
  { key: "htsLead1Bottom", label: "HTS Lead 1 - Bottom (K)", pattern: /^Coil Temperature for T3:.*?:\s*([-+\d.eE]+)\s+degrees K/i },
  { key: "htsLead2Bottom", label: "HTS Lead 2 - Bottom (K)", pattern: /^Coil Temperature for T4:.*?:\s*([-+\d.eE]+)\s+degrees K/i },
  { key: "coil1Temperature", label: "Coil 1 Temp (K)", pattern: /^Coil Temperature for CM1:.*?:\s*([-+\d.eE]+)\s+degrees K/i },
  { key: "coil2Temperature", label: "Coil 2 Temp (K)", pattern: /^Coil Temperature for CM2:.*?:\s*([-+\d.eE]+)\s+degrees K/i },
  { key: "cryostatVacuum", label: "Cryostat Vacuum (E-08) (Torr)", pattern: /^Cryostat Vacuum Pressure:\s*([-+\d.eE]+)\s+Torr/i, scalePower: 8 },
  { key: "cyclotronVacuum", label: "Cyclotron Vacuum (E-07) (Torr)", pattern: /^Cyclotron Vacuum Pressure:\s*([-+\d.eE]+)\s+Torr/i, scalePower: 7 },
  { key: "rfVacuum", label: "RF Vacuum (E-07) (Torr)", pattern: /^RF Vacuum Pressure:\s*([-+\d.eE]+)\s+Torr/i, scalePower: 7 },
  { key: "lemCurrent", label: "LEM (A)", pattern: /^QDSP1 Secondary Current:\s*([-+\d.eE]+)/i }
]);

const DAILY_READING_CANDIDATE_RE = /Daily Service Log begins|He Level:|He Pressure:|Heater Power:|External Lead \([+-]\):|Coil Temperature for (?:T[1-4]|CM[12]):|(?:Cyclotron|Cryostat|RF) Vacuum Pressure:|QDSP1 Secondary Current:/i;

function updateDailyReadingsToolStatus(type, message) {
  if (!window.ToolStatusRegistry || typeof window.ToolStatusRegistry.setStatus !== "function") return;
  window.ToolStatusRegistry.setStatus("tool-daily-readings", type || "idle", message || "");
}

function initDailyReadingsToolPage() {
  const root = document.getElementById("dailyReadingsToolRoot");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";
  dailyReadingsState.snapshots = [];
  dailyReadingsState.selectedDate = "";
  dailyReadingsState.sourceKind = "";

  root.innerHTML = `
    <div class="tool-block daily-readings-tool">
      <div id="dailyReadingsDropZone" class="file-drop-zone daily-readings-drop-zone">
        <input id="dailyReadingsFileInput" class="file-input-hidden" type="file" accept=".csv" multiple />
        <div class="file-drop-title">点击或拖拽文件到此处</div>
        <div class="file-drop-subtitle">支持格式: .csv，可选择 TCLogger / HALO 或 Service Log；仅提取 05:00 SERVICE_PM 点检快照</div>
      </div>
      <div class="daily-readings-path-bar" aria-label="日志路径">
        <strong>日志路径</strong>
        ${DAILY_READING_LOG_PATHS.map((item) => `
          <span class="daily-readings-path-item">
            <b>${item.label}</b>
            <code>${item.value}</code>
            <button class="daily-reading-copy daily-readings-path-copy" type="button" data-log-path="${item.value}" title="复制 ${item.label} 路径" aria-label="复制 ${item.label} 路径">⧉</button>
          </span>
        `).join("")}
      </div>
      <div id="dailyReadingsFileStatus" class="tool-file-list empty-text">尚未选择文件。</div>
      <div id="dailyReadingsResults" class="daily-readings-results"></div>
    </div>
  `;

  bindDailyReadingsEvents();
}

function bindDailyReadingsEvents() {
  const dropZone = document.getElementById("dailyReadingsDropZone");
  const fileInput = document.getElementById("dailyReadingsFileInput");
  if (!dropZone || !fileInput) return;

  let selectedFiles = [];
  let loadedFileKey = "";
  let analysisVersion = 0;

  function setStatus(message, type = "idle") {
    const status = document.getElementById("dailyReadingsFileStatus");
    if (!status) return;
    status.className = `tool-file-list daily-readings-file-status ${type}`;
    status.textContent = message;
    updateDailyReadingsToolStatus(type, message);
  }

  async function analyzeSelectedFiles() {
    const version = ++analysisVersion;
    const files = selectedFiles.slice();
    const fileKey = loadedFileKey;
    const isCurrent = () => version === analysisVersion &&
      (!window.TcLogFileStore || window.TcLogFileStore.getFileKey() === fileKey);
    if (!files.length) {
      setStatus("尚未选择文件。", "idle");
      return;
    }

    setStatus(`已选择 ${files.length} 份文件，正在查找 05:00 点检快照...`, "running");
    try {
      const snapshots = await parseDailyReadingsFiles(files, (done, total, fileName) => {
        if (!isCurrent()) return;
        setStatus(`正在分析 (${done}/${total})：${shortenDailyReadingsFileName(fileName)}`, "running");
      });
      if (!isCurrent()) return;
      dailyReadingsState.snapshots = snapshots;
      dailyReadingsState.selectedDate = snapshots.at(-1)?.date || "";
      dailyReadingsState.sourceKind = files.some((file) => /service\s*log/i.test(String(file.name || ""))) || snapshots.length > 1
        ? "Service Log"
        : "TC Log";
      renderDailyReadingsResults();

      if (!snapshots.length) {
        setStatus(`共 ${files.length} 份文件，未找到 05:00 SERVICE_PM 点检快照。`, "error");
        return;
      }
      const found = snapshots.reduce((sum, snapshot) => sum + Object.keys(snapshot.values).length, 0);
      const expected = snapshots.length * DAILY_READING_FIELDS.length;
      const incompleteDays = snapshots.filter(
        (snapshot) => Object.keys(snapshot.values).length < DAILY_READING_FIELDS.length
      ).length;
      const type = snapshots.length > 1 || found === expected ? "done" : "error";
      const incompleteMessage = incompleteDays ? `；${incompleteDays} 天存在缺项` : "";
      setStatus(`${dailyReadingsState.sourceKind} · 共 ${files.length} 份文件，找到 ${snapshots.length} 天点检；已提取 ${found}/${expected} 项${incompleteMessage}。`, type);
    } catch (error) {
      if (!isCurrent()) return;
      loadedFileKey = "";
      dailyReadingsState.snapshots = [];
      dailyReadingsState.selectedDate = "";
      dailyReadingsState.sourceKind = "";
      renderDailyReadingsResults();
      console.error(error);
      setStatus(`分析失败：${error.message}`, "error");
    }
  }

  function setFiles(fileListLike) {
    selectedFiles = Array.from(fileListLike || []).filter((file) =>
      String(file.name || "").toLowerCase().endsWith(".csv")
    );
    if (window.TcLogFileStore) {
      window.TcLogFileStore.setFiles(selectedFiles, "tool-daily-readings");
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

  window.activateDailyReadingsToolPage = loadSharedFilesIfNeeded;
  document.querySelectorAll(".daily-readings-path-copy").forEach((button) => {
    button.addEventListener("click", () => indicateDailyReadingsCopy(button, button.dataset.logPath || ""));
  });
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

async function parseDailyReadingsFiles(files, onProgress) {
  const snapshotsByDate = new Map();
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (typeof onProgress === "function") onProgress(index + 1, files.length, file.name);
    await parseDailyReadingsFile(file, snapshotsByDate);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return Array.from(snapshotsByDate.values())
    .filter((snapshot) => snapshot.hasMarker)
    .map((snapshot) => ({
      date: snapshot.date,
      timestamp: snapshot.timestamp,
      values: snapshot.values,
      sourceFiles: Array.from(snapshot.sourceFiles).sort()
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

async function parseDailyReadingsFile(file, snapshotsByDate) {
  let indexes = null;
  await window.CsvUtils.readFileRecords(file, (line) => {
    indexes = parseDailyReadingsRecord(line, indexes, snapshotsByDate, file.name);
  });
}

function parseDailyReadingsRecord(line, indexes, snapshotsByDate, sourceFileName) {
  if (!line) return indexes;
  if (!indexes) {
    const columns = window.CsvUtils.parseRecord(line.replace(/^\uFEFF/, ""));
    if (columns.every((value) => !String(value).trim())) return null;
    const header = window.CsvUtils.resolveTcLogHeader(columns, true);
    const names = columns.map((value) => String(value || "").trim());
    indexes = {
      ...header.indexes,
      category: header.isData ? 4 : names.indexOf("Category")
    };
    if (!header.isData) return indexes;
  }

  if (!DAILY_READING_CANDIDATE_RE.test(line)) return indexes;
  const columns = window.CsvUtils.parseRecord(line);
  const timestamp = String(columns[indexes.timestamp] || "").trim();
  const source = String(columns[indexes.source] || "").trim();
  const category = String(columns[indexes.category] || "").trim();
  const message = String(columns[indexes.message] || "").trim();
  const timeMatch = timestamp.match(/^(\d{4}-\d{2}-\d{2})\s+05:00:(\d{2})(?:\.\d+)?$/);
  if (!timeMatch || source.toUpperCase() !== "LOGGER" || category.toUpperCase() !== "SERVICE_PM") return indexes;

  const date = timeMatch[1];
  let snapshot = snapshotsByDate.get(date);
  if (!snapshot) {
    snapshot = { date, timestamp, hasMarker: false, values: {}, sourceFiles: new Set() };
    snapshotsByDate.set(date, snapshot);
  }
  snapshot.sourceFiles.add(sourceFileName);
  if (message === "Daily Service Log begins") {
    snapshot.hasMarker = true;
    snapshot.timestamp = timestamp;
    return indexes;
  }

  for (const field of DAILY_READING_FIELDS) {
    const match = message.match(field.pattern);
    if (!match) continue;
    const rawValue = Number(match[1]);
    if (!Number.isFinite(rawValue)) break;
    if (!snapshot.values[field.key]) {
      snapshot.values[field.key] = {
        rawValue,
        rawText: match[1],
        rawMessage: message,
        timestamp,
        sourceFileName
      };
    }
    break;
  }
  return indexes;
}

function renderDailyReadingsResults() {
  const root = document.getElementById("dailyReadingsResults");
  if (!root) return;
  const snapshots = dailyReadingsState.snapshots;
  if (!snapshots.length) {
    root.innerHTML = '<div class="empty-text daily-readings-empty">没有可显示的 05:00 点检数据。</div>';
    return;
  }

  let snapshotIndex = snapshots.findIndex((snapshot) => snapshot.date === dailyReadingsState.selectedDate);
  if (snapshotIndex < 0) snapshotIndex = snapshots.length - 1;
  const snapshot = snapshots[snapshotIndex];
  dailyReadingsState.selectedDate = snapshot.date;
  const completed = DAILY_READING_FIELDS.filter((field) => snapshot.values[field.key]).length;

  root.innerHTML = `
    ${snapshots.length > 1 ? renderDailyReadingsDatePicker(snapshots, snapshotIndex) : ""}
      <section class="daily-readings-card">
        <div class="daily-readings-card-header">
          <strong>${escapeDailyReadingsHtml(snapshot.date)} · 05:00 点检</strong>
          <span>${completed}/${DAILY_READING_FIELDS.length} 项 · ${escapeDailyReadingsHtml(snapshot.sourceFiles.join("、"))}</span>
        </div>
        <div class="daily-readings-table-wrap">
          <table class="daily-readings-table" aria-label="${escapeDailyReadingsHtml(snapshot.date)} Daily Readings">
            <tbody>
              ${DAILY_READING_FIELDS.map((field) => renderDailyReadingRow(field, snapshot.values[field.key], snapshotIndex)).join("")}
            </tbody>
          </table>
        </div>
      </section>
  `;

  const dateSelect = root.querySelector("#dailyReadingsDateSelect");
  if (dateSelect) {
    dateSelect.addEventListener("change", () => {
      dailyReadingsState.selectedDate = dateSelect.value;
      renderDailyReadingsResults();
    });
  }
  root.querySelectorAll("button[data-date-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const currentIndex = snapshots.findIndex((item) => item.date === dailyReadingsState.selectedDate);
      const nextIndex = currentIndex + Number(button.dataset.dateStep);
      if (nextIndex < 0 || nextIndex >= snapshots.length) return;
      dailyReadingsState.selectedDate = snapshots[nextIndex].date;
      renderDailyReadingsResults();
    });
  });

  root.querySelectorAll("button[data-reading-key]").forEach((button) => {
    button.addEventListener("click", async () => {
      const snapshot = snapshots[Number(button.dataset.snapshotIndex)];
      const field = DAILY_READING_FIELDS.find((item) => item.key === button.dataset.readingKey);
      const reading = snapshot?.values[field?.key];
      if (!field || !reading) return;
      await indicateDailyReadingsCopy(button, formatDailyReadingDisplayValue(field, reading));
    });
  });
}

function renderDailyReadingsDatePicker(snapshots, selectedIndex) {
  const descending = snapshots.map((snapshot) => snapshot.date).reverse();
  return `
    <div class="daily-readings-date-picker">
      <span class="daily-readings-source-chip">Service Log · ${snapshots.length} 天</span>
      <button type="button" data-date-step="-1" ${selectedIndex <= 0 ? "disabled" : ""}>‹ 前一天</button>
      <label for="dailyReadingsDateSelect">点检日期</label>
      <select id="dailyReadingsDateSelect">
        ${descending.map((date) => `<option value="${date}" ${date === dailyReadingsState.selectedDate ? "selected" : ""}>${date}</option>`).join("")}
      </select>
      <button type="button" data-date-step="1" ${selectedIndex >= snapshots.length - 1 ? "disabled" : ""}>后一天 ›</button>
    </div>
  `;
}

function renderDailyReadingRow(field, reading, snapshotIndex) {
  if (!reading) {
    return `<tr class="daily-reading-missing"><th scope="row">${escapeDailyReadingsHtml(field.label)}</th><td>未找到</td></tr>`;
  }
  const value = formatDailyReadingDisplayValue(field, reading);
  return `
    <tr title="${escapeDailyReadingsHtml(reading.rawMessage)}">
      <th scope="row">${escapeDailyReadingsHtml(field.label)}</th>
      <td>
        <span class="daily-reading-value-line">
          <span class="daily-reading-number">${escapeDailyReadingsHtml(value)}</span>
          <button class="daily-reading-copy" type="button" data-snapshot-index="${snapshotIndex}" data-reading-key="${field.key}" title="复制 ${escapeDailyReadingsHtml(field.label)}" aria-label="复制 ${escapeDailyReadingsHtml(field.label)}">⧉</button>
        </span>
      </td>
    </tr>
  `;
}

function formatDailyReadingDisplayValue(field, reading) {
  if (field.format === "fixed2") return reading.rawValue.toFixed(2);
  if (Number.isInteger(field.scalePower)) return scaleDailyReadingScientificText(reading.rawText, field.scalePower);
  return reading.rawText;
}

function scaleDailyReadingScientificText(rawText, power) {
  const match = String(rawText || "").match(/^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
  if (!match) return rawText;
  const sign = match[1] === "-" ? "-" : "";
  const integer = match[2];
  const fraction = match[3] || "";
  const exponent = Number(match[4] || 0) + power;
  const digits = `${integer}${fraction}`;
  const decimalIndex = integer.length + exponent;
  let value;
  if (decimalIndex <= 0) value = `0.${"0".repeat(-decimalIndex)}${digits}`;
  else if (decimalIndex >= digits.length) value = `${digits}${"0".repeat(decimalIndex - digits.length)}`;
  else value = `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
  value = value.replace(/^0+(?=\d)/, "");
  if (value.includes(".")) value = value.replace(/0+$/, "").replace(/\.$/, "");
  if (!value || value.startsWith(".")) value = `0${value}`;
  return `${sign}${value}`;
}

async function indicateDailyReadingsCopy(button, text) {
  const originalText = button.textContent;
  const copied = await copyDailyReadingsText(text);
  button.textContent = copied ? "✓" : "!";
  button.title = copied ? "已复制" : "复制失败";
  button.classList.toggle("copied", copied);
  button.classList.toggle("copy-failed", !copied);
  window.setTimeout(() => {
    button.textContent = originalText;
    button.title = "复制";
    button.classList.remove("copied", "copy-failed");
  }, 1200);
}

async function copyDailyReadingsText(text) {
  if (!text) return false;
  if (typeof copyPlainText === "function") return copyPlainText(text);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    return false;
  }
}

function shortenDailyReadingsFileName(fileName) {
  const text = String(fileName || "");
  return text.length > 42 ? `${text.slice(0, 39)}...` : text;
}

function escapeDailyReadingsHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
