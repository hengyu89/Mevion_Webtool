const tcShiftToolState = {
  allRows: [],
  currentPage: 1,
  pageSize: 15,
  visibleColumns: {
    date: true,
    time: true,
    angle: true,
    yShift: true,
    xShift: true
  },
  chartMode: "all-angle",
  chartAngle: "22.5",
  chartShowY: true,
  chartShowX: true
};

function initTcShiftToolPage() {
  const root = document.getElementById("tcShiftToolRoot");
  if (!root) return;

    tcShiftToolState.allRows = [];
    tcShiftToolState.currentPage = 1;
    tcShiftToolState.visibleColumns = {
      date: true,
      time: true,
      angle: true,
      yShift: true,
      xShift: true
    };
    tcShiftToolState.chartMode = "all-angle";
    tcShiftToolState.chartAngle = "22.5";
    tcShiftToolState.chartShowY = true;
    tcShiftToolState.chartShowX = true;

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

  renderTcShiftStatsToSide({
    yMax: null,
    yMin: null,
    yRange: null,
    xMax: null,
    xMin: null,
    xRange: null
  });

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
  let left = 0;
  let right = angleEvents.length - 1;
  let answer = null;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const current = angleEvents[mid];

    if (current.tcTimeMs <= shiftTimeMs) {
      answer = current;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return answer;
}

function renderTcShiftResults(rows) {
  tcShiftToolState.allRows = rows;
  tcShiftToolState.currentPage = 1;

  const stats = calculateShiftStats(rows);
  renderTcShiftStatsToSide(stats);
  renderTcShiftTableAndSummary();
}

function renderTcShiftTableAndSummary() {
  const summary = document.getElementById("tcSummary");
  const wrap = document.getElementById("tcResultTableWrap");
  if (!summary || !wrap) return;

  const rows = tcShiftToolState.allRows;
  const pageSize = tcShiftToolState.pageSize;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(tcShiftToolState.currentPage, totalPages);
  tcShiftToolState.currentPage = currentPage;

  summary.innerHTML = `
    <div class="summary-row">
      <div class="summary-card">
        <div><strong>结果行数：</strong>${rows.length}</div>
      </div>

      <div class="column-toggle-panel">
        <label class="column-toggle-item">
          <input type="checkbox" data-col="date" ${tcShiftToolState.visibleColumns.date ? "checked" : ""}>
          <span>Date</span>
        </label>
        <label class="column-toggle-item">
          <input type="checkbox" data-col="time" ${tcShiftToolState.visibleColumns.time ? "checked" : ""}>
          <span>Time</span>
        </label>
        <label class="column-toggle-item">
          <input type="checkbox" data-col="angle" ${tcShiftToolState.visibleColumns.angle ? "checked" : ""}>
          <span>Angle</span>
        </label>
        <label class="column-toggle-item">
          <input type="checkbox" data-col="yShift" ${tcShiftToolState.visibleColumns.yShift ? "checked" : ""}>
          <span>Y shift</span>
        </label>
        <label class="column-toggle-item">
          <input type="checkbox" data-col="xShift" ${tcShiftToolState.visibleColumns.xShift ? "checked" : ""}>
          <span>X shift</span>
        </label>
      </div>
    </div>
  `;

  bindColumnToggleEvents();

  if (!rows.length) {
    wrap.innerHTML = `<div class="empty-text">没有解析到符合条件的数据。</div>`;
    return;
  }

  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = rows.slice(startIndex, startIndex + pageSize);

  wrap.innerHTML = `
    ${buildTcShiftTableHtml(pageRows)}

    <div class="table-pagination">
      <button id="tcPrevPageBtn" class="tool-btn pagination-btn" ${currentPage <= 1 ? "disabled" : ""}>上一页</button>

      <div class="pagination-info">
        第
        <input
          id="tcPageInput"
          class="page-jump-input"
          type="number"
          min="1"
          max="${totalPages}"
          value="${currentPage}"
        />
        / ${totalPages} 页
      </div>

      <button id="tcNextPageBtn" class="tool-btn pagination-btn" ${currentPage >= totalPages ? "disabled" : ""}>下一页</button>
    </div>

    ${buildTcShiftChartSectionHtml()}
  `;

  bindPaginationEvents(totalPages);
  bindChartEvents();
  drawTcShiftChart();
}

function buildTcShiftTableHtml(rows) {
  const visible = tcShiftToolState.visibleColumns;

  const headers = [];
  if (visible.date) headers.push(`<th>Date</th>`);
  if (visible.time) headers.push(`<th>Time</th>`);
  if (visible.angle) headers.push(`<th>Angle</th>`);
  if (visible.yShift) headers.push(`<th>Y shift</th>`);
  if (visible.xShift) headers.push(`<th>X shift</th>`);

  const bodyRows = rows
    .map((row) => {
      const yDanger =
        row.yShift !== "" && (Number(row.yShift) < -2 || Number(row.yShift) > 2);
      const xDanger =
        row.xShift !== "" && (Number(row.xShift) < -2 || Number(row.xShift) > 2);

      const cells = [];
      if (visible.date) cells.push(`<td class="muted-cell">${escapeHtml(row.date)}</td>`);
      if (visible.time) cells.push(`<td class="muted-cell">${escapeHtml(row.time)}</td>`);
      if (visible.angle) cells.push(`<td class="muted-cell">${formatNumber(row.angle)}</td>`);
      if (visible.yShift) {
        cells.push(`
          <td class="shift-cell ${yDanger ? "shift-danger" : ""}">
            ${row.yShift === "" ? "" : formatNumber(row.yShift, 6)}
          </td>
        `);
      }
      if (visible.xShift) {
        cells.push(`
          <td class="shift-cell ${xDanger ? "shift-danger" : ""}">
            ${row.xShift === "" ? "" : formatNumber(row.xShift, 6)}
          </td>
        `);
      }

      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");

  return `
    <table class="tool-table dynamic-table">
      <thead>
        <tr>${headers.join("")}</tr>
      </thead>
      <tbody>
        ${bodyRows}
      </tbody>
    </table>
  `;
}

function bindPaginationEvents(totalPages) {
  const prevBtn = document.getElementById("tcPrevPageBtn");
  const nextBtn = document.getElementById("tcNextPageBtn");
  const pageInput = document.getElementById("tcPageInput");

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (tcShiftToolState.currentPage > 1) {
        tcShiftToolState.currentPage -= 1;
        renderTcShiftTableAndSummary();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (tcShiftToolState.currentPage < totalPages) {
        tcShiftToolState.currentPage += 1;
        renderTcShiftTableAndSummary();
      }
    });
  }

  if (pageInput) {
    function jumpToPage() {
      let page = Number(pageInput.value);
      if (Number.isNaN(page)) {
        pageInput.value = tcShiftToolState.currentPage;
        return;
      }

      if (page < 1) page = 1;
      if (page > totalPages) page = totalPages;

      tcShiftToolState.currentPage = page;
      renderTcShiftTableAndSummary();
    }

    pageInput.addEventListener("change", jumpToPage);

    pageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        jumpToPage();
      }
    });
  }
}

function bindColumnToggleEvents() {
  const checkboxes = document.querySelectorAll(".column-toggle-item input[type='checkbox']");
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const col = event.target.dataset.col;
      tcShiftToolState.visibleColumns[col] = event.target.checked;
      renderTcShiftTableAndSummary();
    });
  });
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

function calculateShiftStats(rows) {
  const yValues = rows
    .map((row) => row.yShift)
    .filter((value) => value !== "")
    .map(Number);

  const xValues = rows
    .map((row) => row.xShift)
    .filter((value) => value !== "")
    .map(Number);

  const yMax = yValues.length ? Math.max(...yValues) : null;
  const yMin = yValues.length ? Math.min(...yValues) : null;
  const xMax = xValues.length ? Math.max(...xValues) : null;
  const xMin = xValues.length ? Math.min(...xValues) : null;

  return {
    yMax,
    yMin,
    yRange: yMax !== null && yMin !== null ? yMax - yMin : null,
    xMax,
    xMin,
    xRange: xMax !== null && xMin !== null ? xMax - xMin : null
  };
}

function renderTcShiftStatsToSide(stats) {
  const sideContent = document.getElementById("sideContent");
  if (!sideContent) return;

  sideContent.innerHTML = `
    <section class="card side-card">
      <h3 class="side-card-title">第一版规则</h3>
      <div class="side-list">
        <div class="side-list-item"><span class="notice-badge">INFO</span>使用 TC Timestamp 作为主时间轴。</div>
        <div class="side-list-item"><span class="notice-badge">INFO</span>X/Y 时间差不超过 1 秒则尝试合并为同一行。</div>
        <div class="side-list-item"><span class="notice-badge">INFO</span>连续两个 X 或两个 Y 时自动另起一行。</div>
        <div class="side-list-item"><span class="notice-badge">INFO</span>支持一次拖入多个 CSV 文件并统一排序。</div>
      </div>
    </section>

    <section class="card side-card stats-section-card">
      <h3 class="side-card-title">Shift 统计</h3>
      <div class="side-stats-grid">
        <div class="mini-stat-card">
          <div class="mini-stat-label">Y (CP) min</div>
          <div class="mini-stat-value">${formatStat(stats.yMin)}</div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-label">Y (CP) max</div>
          <div class="mini-stat-value">${formatStat(stats.yMax)}</div>
        </div>

        <div class="mini-stat-card">
          <div class="mini-stat-label">X (IP) min</div>
          <div class="mini-stat-value">${formatStat(stats.xMin)}</div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-label">X (IP) max</div>
          <div class="mini-stat-value">${formatStat(stats.xMax)}</div>
        </div>

        <div class="mini-stat-card">
          <div class="mini-stat-label">Y max - min</div>
          <div class="mini-stat-value">${formatStat(stats.yRange)}</div>
        </div>
        <div class="mini-stat-card">
          <div class="mini-stat-label">X max - min</div>
          <div class="mini-stat-value">${formatStat(stats.xRange)}</div>
        </div>
      </div>
    </section>

    <section class="card side-card offset-section-card">
      <h3 class="side-card-title">Offset 计算</h3>

      <div class="calc-form-grid single-col">
        <label class="calc-field">
          <span>Y (CP) slope</span>
          <input
            id="ySlopeInput"
            type="number"
            step="any"
            class="calc-input compact-input narrow-input"
            value="239.85"
          />
        </label>

        <label class="calc-field">
          <span>Y (CP) offset</span>
          <input
            id="yOffsetInput"
            type="number"
            step="any"
            class="calc-input compact-input narrow-input"
            value="31331"
          />
        </label>

        <label class="calc-field">
          <span>X (IP) slope</span>
          <input
            id="xSlopeInput"
            type="number"
            step="any"
            class="calc-input compact-input narrow-input"
            value="292.07"
          />
        </label>

        <label class="calc-field">
          <span>X (IP) offset</span>
          <input
            id="xOffsetInput"
            type="number"
            step="any"
            class="calc-input compact-input narrow-input"
            value="33077"
          />
        </label>
      </div>

      <div class="calc-result-wrap">
        <div class="calc-result-card">
          <div class="mini-stat-label">Y new offset</div>
          <div id="yNewOffsetOutput" class="mini-stat-value">--</div>
        </div>
        <div class="calc-result-card">
          <div class="mini-stat-label">X new offset</div>
          <div id="xNewOffsetOutput" class="mini-stat-value">--</div>
        </div>
      </div>
    </section>
  `;

  bindOffsetCalculator(stats);
}

function bindOffsetCalculator(stats) {
  const ySlopeInput = document.getElementById("ySlopeInput");
  const yOffsetInput = document.getElementById("yOffsetInput");
  const xSlopeInput = document.getElementById("xSlopeInput");
  const xOffsetInput = document.getElementById("xOffsetInput");
  const yNewOffsetOutput = document.getElementById("yNewOffsetOutput");
  const xNewOffsetOutput = document.getElementById("xNewOffsetOutput");

  if (
    !ySlopeInput ||
    !yOffsetInput ||
    !xSlopeInput ||
    !xOffsetInput ||
    !yNewOffsetOutput ||
    !xNewOffsetOutput
  ) {
    return;
  }

  function updateOutputs() {
    const ySlope = Number(ySlopeInput.value);
    const yOffset = Number(yOffsetInput.value);
    const xSlope = Number(xSlopeInput.value);
    const xOffset = Number(xOffsetInput.value);

    if (
      ySlopeInput.value !== "" &&
      yOffsetInput.value !== "" &&
      stats.yMax !== null &&
      stats.yMin !== null
    ) {
      const yNewOffset = ((stats.yMax + stats.yMin) / 2) * ySlope + yOffset;
      yNewOffsetOutput.textContent = formatNumber(yNewOffset, 2);
    } else {
      yNewOffsetOutput.textContent = "--";
    }

    if (
      xSlopeInput.value !== "" &&
      xOffsetInput.value !== "" &&
      stats.xMax !== null &&
      stats.xMin !== null
    ) {
      const xNewOffset = ((stats.xMax + stats.xMin) / 2) * xSlope + xOffset;
      xNewOffsetOutput.textContent = formatNumber(xNewOffset, 2);
    } else {
      xNewOffsetOutput.textContent = "--";
    }
  }

  [ySlopeInput, yOffsetInput, xSlopeInput, xOffsetInput].forEach((input) => {
    input.addEventListener("input", updateOutputs);
  });

  updateOutputs();
}

function formatStat(value) {
  if (value === null || value === undefined) return "--";
  return formatNumber(value, 6);
}

function buildTcShiftChartSectionHtml() {
  return `
    <section class="chart-section-card">
      <div class="chart-toolbar">
        <div class="chart-toolbar-left">
          <label class="chart-control">
            <span>图表模式</span>
            <select id="chartModeSelect" class="chart-select">
              <option value="all-angle" ${tcShiftToolState.chartMode === "all-angle" ? "selected" : ""}>全角度散点图</option>
              <option value="single-angle" ${tcShiftToolState.chartMode === "single-angle" ? "selected" : ""}>单角度时间图</option>
            </select>
          </label>

          <label class="chart-control" id="chartAngleControl" ${tcShiftToolState.chartMode === "single-angle" ? "" : 'style="display:none;"'}>
            <span>角度</span>
            <select id="chartAngleSelect" class="chart-select">
              ${[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180]
                .map(
                  (angle) =>
                    `<option value="${angle}" ${String(angle) === String(tcShiftToolState.chartAngle) ? "selected" : ""}>${angle}°</option>`
                )
                .join("")}
            </select>
          </label>
        </div>

        <div class="chart-toolbar-right">
          <label class="chart-check-item">
            <input id="chartShowY" type="checkbox" ${tcShiftToolState.chartShowY ? "checked" : ""} />
            <span>Y shift</span>
          </label>
          <label class="chart-check-item">
            <input id="chartShowX" type="checkbox" ${tcShiftToolState.chartShowX ? "checked" : ""} />
            <span>X shift</span>
          </label>
        </div>
      </div>

      <div class="chart-legend">
        <span class="legend-item">
          <span class="legend-dot legend-dot-y"></span>Y shift
        </span>
        <span class="legend-item">
          <span class="legend-dot legend-dot-x"></span>X shift
        </span>
      </div>

      <div class="chart-canvas-wrap">
        <canvas id="tcShiftChartCanvas" width="900" height="420"></canvas>
      </div>
    </section>
  `;
}

function bindChartEvents() {
  const modeSelect = document.getElementById("chartModeSelect");
  const angleSelect = document.getElementById("chartAngleSelect");
  const showY = document.getElementById("chartShowY");
  const showX = document.getElementById("chartShowX");

  if (modeSelect) {
    modeSelect.addEventListener("change", () => {
      tcShiftToolState.chartMode = modeSelect.value;

      const angleControl = document.getElementById("chartAngleControl");
      if (angleControl) {
        angleControl.style.display =
          tcShiftToolState.chartMode === "single-angle" ? "" : "none";
      }

      drawTcShiftChart();
    });
  }

  if (angleSelect) {
    angleSelect.addEventListener("change", () => {
      tcShiftToolState.chartAngle = angleSelect.value;
      drawTcShiftChart();
    });
  }

  if (showY) {
    showY.addEventListener("change", () => {
      tcShiftToolState.chartShowY = showY.checked;
      drawTcShiftChart();
    });
  }

  if (showX) {
    showX.addEventListener("change", () => {
      tcShiftToolState.chartShowX = showX.checked;
      drawTcShiftChart();
    });
  }
}

function drawTcShiftChart() {
  const canvas = document.getElementById("tcShiftChartCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rows = tcShiftToolState.allRows || [];
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  if (!rows.length) {
    ctx.fillStyle = "#777";
    ctx.font = "16px Segoe UI";
    ctx.fillText("暂无数据可绘图", 30, 40);
    return;
  }

  const padding = { left: 70, right: 30, top: 30, bottom: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  let dataY = [];
  let dataX = [];
  let xValues = [];
  let xLabelFormatter = (v) => String(v);

  if (tcShiftToolState.chartMode === "all-angle") {
    const filtered = rows.filter((row) => row.angle !== "" && row.angle !== null);

    dataY = filtered
      .filter((row) => row.yShift !== "")
      .map((row) => ({ x: Number(row.angle), y: Number(row.yShift) }));

    dataX = filtered
      .filter((row) => row.xShift !== "")
      .map((row) => ({ x: Number(row.angle), y: Number(row.xShift) }));

    xValues = filtered.map((row) => Number(row.angle));
    xLabelFormatter = (v) => `${v}°`;
  } else {
    const targetAngle = Number(tcShiftToolState.chartAngle);
    const filtered = rows.filter((row) => Number(row.angle) === targetAngle);

    dataY = filtered
      .filter((row) => row.yShift !== "")
      .map((row, index) => ({ x: index + 1, y: Number(row.yShift), time: row.time }));

    dataX = filtered
      .filter((row) => row.xShift !== "")
      .map((row, index) => ({ x: index + 1, y: Number(row.xShift), time: row.time }));

    xValues = filtered.map((_, index) => index + 1);
    xLabelFormatter = (v) => `#${v}`;
  }

  const combined = [];
  if (tcShiftToolState.chartShowY) combined.push(...dataY);
  if (tcShiftToolState.chartShowX) combined.push(...dataX);

  if (!combined.length) {
    ctx.fillStyle = "#777";
    ctx.font = "16px Segoe UI";
    ctx.fillText("当前图表没有可显示的数据", 30, 40);
    return;
  }

  const minX = Math.min(...combined.map((p) => p.x));
  const maxX = Math.max(...combined.map((p) => p.x));
  let minY = Math.min(...combined.map((p) => p.y));
  let maxY = Math.max(...combined.map((p) => p.y));

  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const yPadding = (maxY - minY) * 0.15;
  minY -= yPadding;
  maxY += yPadding;

  function mapX(value) {
    if (maxX === minX) return padding.left + plotWidth / 2;
    return padding.left + ((value - minX) / (maxX - minX)) * plotWidth;
  }

  function mapY(value) {
    return padding.top + (1 - (value - minY) / (maxY - minY)) * plotHeight;
  }

  drawChartGrid(ctx, padding, plotWidth, plotHeight, minX, maxX, minY, maxY, xLabelFormatter);

  if (tcShiftToolState.chartShowY) {
    drawSeries(ctx, dataY, mapX, mapY, "#f59e0b", tcShiftToolState.chartMode === "single-angle");
  }

  if (tcShiftToolState.chartShowX) {
    drawSeries(ctx, dataX, mapX, mapY, "#3b82f6", tcShiftToolState.chartMode === "single-angle");
  }

  drawChartAxes(ctx, padding, plotWidth, plotHeight);

  ctx.fillStyle = "#555";
  ctx.font = "13px Segoe UI";
  ctx.fillText(
    tcShiftToolState.chartMode === "all-angle" ? "Angle" : "Time Sequence",
    padding.left + plotWidth / 2 - 30,
    height - 16
  );

  ctx.save();
  ctx.translate(18, padding.top + plotHeight / 2 + 20);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Shift", 0, 0);
  ctx.restore();
}

function drawChartGrid(ctx, padding, plotWidth, plotHeight, minX, maxX, minY, maxY, xLabelFormatter) {
  ctx.save();

  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  const verticalLines = 6;
  const horizontalLines = 6;

  for (let i = 0; i <= verticalLines; i++) {
    const x = padding.left + (i / verticalLines) * plotWidth;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();

    const value = minX + (i / verticalLines) * (maxX - minX);
    ctx.setLineDash([]);
    ctx.fillStyle = "#888";
    ctx.font = "12px Segoe UI";
    ctx.textAlign = "center";
    ctx.fillText(xLabelFormatter(roundForAxis(value)), x, padding.top + plotHeight + 22);
    ctx.setLineDash([4, 4]);
  }

  for (let i = 0; i <= horizontalLines; i++) {
    const y = padding.top + (i / horizontalLines) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotWidth, y);
    ctx.stroke();

    const value = maxY - (i / horizontalLines) * (maxY - minY);
    ctx.setLineDash([]);
    ctx.fillStyle = "#888";
    ctx.font = "12px Segoe UI";
    ctx.textAlign = "right";
    ctx.fillText(roundForAxis(value), padding.left - 10, y + 4);
    ctx.setLineDash([4, 4]);
  }

  ctx.restore();
}

function drawChartAxes(ctx, padding, plotWidth, plotHeight) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 1.2;
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotHeight);
  ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  ctx.stroke();

  ctx.restore();
}

function drawSeries(ctx, data, mapX, mapY, color, connectLine) {
  if (!data.length) return;

  ctx.save();

  if (connectLine && data.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    data.forEach((point, index) => {
      const x = mapX(point.x);
      const y = mapY(point.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  data.forEach((point) => {
    const x = mapX(point.x);
    const y = mapY(point.y);

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

function roundForAxis(value) {
  return Number(value).toFixed(2);
}