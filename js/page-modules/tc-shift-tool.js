function initTcShiftToolPage() {
  const root = document.getElementById("tcShiftToolRoot");
  if (!root) return;

  root.innerHTML = `
    <div class="tool-block">
      <div id="tcDropZone" class="file-drop-zone">
        <input id="tcFileInput" class="file-input-hidden" type="file" accept=".csv" multiple />
        <div class="file-drop-title">点击或拖拽文件到此处</div>
        <div class="file-drop-subtitle">支持格式: .csv，可一次选择多个文件</div>
      </div>

      <div id="tcFileList" class="tool-file-list empty-text">尚未选择文件。</div>

      <div class="tool-actions">
        <button id="tcParseBtn" class="tool-btn">开始解析</button>
      </div>

      <div id="tcSummary" class="tool-summary"></div>
      <div id="tcResultTableWrap" class="tool-table-wrap"></div>
    </div>
  `;

  bindTcShiftToolEvents();
}

function bindTcShiftToolEvents() {
  const dropZone = document.getElementById("tcDropZone");
  const fileInput = document.getElementById("tcFileInput");
  const parseBtn = document.getElementById("tcParseBtn");

  if (!dropZone || !fileInput || !parseBtn) return;

  let selectedFiles = [];

  function refreshFileList() {
    const fileList = document.getElementById("tcFileList");
    if (!fileList) return;

    if (!selectedFiles.length) {
      fileList.innerHTML = `尚未选择文件。`;
      return;
    }

    fileList.innerHTML = `
      <div class="selected-files-title">已选择 ${selectedFiles.length} 个文件：</div>
      <ul class="selected-files-list">
        ${selectedFiles
          .map(
            (file) =>
              `<li>${file.name} <span class="file-size">(${formatFileSize(file.size)})</span></li>`
          )
          .join("")}
      </ul>
    `;
  }

  function setFiles(fileListLike) {
    selectedFiles = Array.from(fileListLike || []).filter((file) =>
      file.name.toLowerCase().endsWith(".csv")
    );
    refreshFileList();
  }

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

  parseBtn.addEventListener("click", async () => {
    if (!selectedFiles.length) {
      alert("请先选择至少一个 CSV 文件。");
      return;
    }

    parseBtn.disabled = true;
    parseBtn.textContent = "解析中...";

    try {
      const rows = await parseTcShiftFiles(selectedFiles);
      renderTcShiftResults(rows);
    } catch (error) {
      console.error(error);
      alert(`解析失败：${error.message}`);
    } finally {
      parseBtn.disabled = false;
      parseBtn.textContent = "开始解析";
    }
  });
}

async function parseTcShiftFiles(files) {
  const allRecords = [];

  for (const file of files) {
    const text = await file.text();
    const records = parseCsvText(text, file.name);

    for (const record of records) {
      allRecords.push(record);
    }
  }

  allRecords.sort((a, b) => a.tcTimeMs - b.tcTimeMs);

  const angleEvents = [];
  const shiftEvents = [];

  for (const row of allRecords) {
    const message = row["Message Text"] || "";
    const source = row["Source"] || "";

    const angleMatch = message.match(/readback:\s*gantry angle\s*(-?\d+(?:\.\d+)?)/i);
    if (angleMatch) {
      angleEvents.push({
        tcTimeMs: row.tcTimeMs,
        tcTimestamp: row["TC Timestamp"],
        angle: Number(angleMatch[1])
      });
      continue;
    }

    const shiftMatch = message.match(/Storing initial layer shift of\s*(-?\d+(?:\.\d+)?)mm/i);
    if (shiftMatch) {
      let axis = null;
      if (source === "DOSX_SW") axis = "X";
      if (source === "DOSY_SW") axis = "Y";

      if (!axis) continue;

      shiftEvents.push({
        tcTimeMs: row.tcTimeMs,
        tcTimestamp: row["TC Timestamp"],
        axis,
        shift: Number(shiftMatch[1])
      });
    }
  }

  return buildShiftRows(angleEvents, shiftEvents);
}

function buildShiftRows(angleEvents, shiftEvents) {
  const results = [];
  const ONE_SECOND_MS = 1000;

  const groups = new Map();

  for (const shift of shiftEvents) {
    const matchedAngle = findLatestAngleBeforeShift(angleEvents, shift.tcTimeMs);
    if (!matchedAngle) continue;

    const angleKey = `${matchedAngle.tcTimeMs}|${matchedAngle.angle}`;
    if (!groups.has(angleKey)) {
      groups.set(angleKey, []);
    }

    const groupRows = groups.get(angleKey);
    let targetRow = null;

    for (const row of groupRows) {
      const timeDiff = Math.abs(row.shiftTimeMs - shift.tcTimeMs);
      const sameWindow = timeDiff <= ONE_SECOND_MS;

      if (!sameWindow) continue;

      if (shift.axis === "X" && row.xShift === "") {
        targetRow = row;
        break;
      }

      if (shift.axis === "Y" && row.yShift === "") {
        targetRow = row;
        break;
      }
    }

    if (!targetRow) {
      targetRow = {
        shiftTimeMs: shift.tcTimeMs,
        shiftTimestamp: shift.tcTimestamp,
        date: formatDatePart(shift.tcTimestamp),
        time: formatTimePart(shift.tcTimestamp),
        angle: matchedAngle.angle,
        angleTimeMs: matchedAngle.tcTimeMs,
        angleTimestamp: matchedAngle.tcTimestamp,
        yShift: "",
        xShift: ""
      };
      groupRows.push(targetRow);
      results.push(targetRow);
    }

    if (shift.axis === "X") {
      targetRow.xShift = shift.shift;
    } else {
      targetRow.yShift = shift.shift;
    }
  }

  results.sort((a, b) => a.shiftTimeMs - b.shiftTimeMs);
  return results;
}

function findLatestAngleBeforeShift(angleEvents, shiftTimeMs) {
  let latest = null;

  for (const angle of angleEvents) {
    if (angle.tcTimeMs <= shiftTimeMs) {
      latest = angle;
    } else {
      break;
    }
  }

  return latest;
}

function renderTcShiftResults(rows) {
  const summary = document.getElementById("tcSummary");
  const wrap = document.getElementById("tcResultTableWrap");
  if (!summary || !wrap) return;

  summary.innerHTML = `
    <div class="summary-card">
      <div><strong>结果行数：</strong>${rows.length}</div>
    </div>
  `;

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-text">没有解析到符合条件的数据。</div>`;
    return;
  }

  wrap.innerHTML = `
    <table class="tool-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Time</th>
          <th>Angle</th>
          <th>Y shift</th>
          <th>X shift</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${escapeHtml(row.date)}</td>
                <td>${escapeHtml(row.time)}</td>
                <td>${formatNumber(row.angle)}</td>
                <td>${row.yShift === "" ? "" : formatNumber(row.yShift, 6)}</td>
                <td>${row.xShift === "" ? "" : formatNumber(row.xShift, 6)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function parseCsvText(text, fileName) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];

  const header = parseCsvLine(lines[0]);
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (!cols.length) continue;

    const row = {};
    header.forEach((key, index) => {
      row[key] = cols[index] ?? "";
    });

    const tcTimestamp = row["TC Timestamp"];
    const tcTimeMs = parseTcTimestamp(tcTimestamp);

    if (Number.isNaN(tcTimeMs)) continue;

    row.tcTimeMs = tcTimeMs;
    row.fileName = fileName;
    records.push(row);
  }

  return records;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
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

function parseTcTimestamp(value) {
  if (!value) return NaN;

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/
  );

  if (!match) return NaN;

  const [, y, m, d, hh, mm, ss, ms = "0"] = match;
  const milli = ms.padEnd(3, "0");

  return new Date(
    Number(y),
    Number(m) - 1,
    Number(d),
    Number(hh),
    Number(mm),
    Number(ss),
    Number(milli)
  ).getTime();
}

function formatDatePart(timestamp) {
  const [datePart] = String(timestamp).split(" ");
  return datePart || "";
}

function formatTimePart(timestamp) {
  const parts = String(timestamp).split(" ");
  return parts[1] || "";
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function formatNumber(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}