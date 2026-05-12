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
  chartCustomAngle: "",
  chartCustomAngleInput: "",
  chartShowY: true,
  chartShowX: true,
  chartShowNearby: true,
  selectedRowIds: [],
  showExcludedRows: false,
  exclusionStartInput: "",
  exclusionEndInput: ""
};

const tcShiftChartRuntime = {
  hoverPoint: null,
  interactivePoints: [],
  mouseBound: false
};

const TC_SHIFT_TARGET_ANGLES = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180];
const TC_SHIFT_ANGLE_BIN_HALF = 11.25;
const TC_SHIFT_MIN_ANGLE = -5;
const TC_SHIFT_MAX_ANGLE = 185;

const TC_SHIFT_OFFSET_STORAGE_KEY = "tcShiftOffsetParameters";
const TC_SHIFT_DEFAULT_OFFSET_PARAMS = {
  ySlope: "239.85",
  yOffset: "31331",
  xSlope: "292.07",
  xOffset: "33077"
};

function loadTcShiftOffsetParams() {
  try {
    const saved = JSON.parse(localStorage.getItem(TC_SHIFT_OFFSET_STORAGE_KEY) || "{}");
    return { ...TC_SHIFT_DEFAULT_OFFSET_PARAMS, ...saved };
  } catch (error) {
    return { ...TC_SHIFT_DEFAULT_OFFSET_PARAMS };
  }
}

function saveTcShiftOffsetParam(key, value) {
  const params = loadTcShiftOffsetParams();
  params[key] = value;
  localStorage.setItem(TC_SHIFT_OFFSET_STORAGE_KEY, JSON.stringify(params));
}

function normalizeAngleForDisplay(angle) {
  const num = Number(angle);
  if (Number.isNaN(num)) return null;
  return num;
}

function getAngleBinRange(targetAngle) {
  if (targetAngle === 0) {
    return { min: TC_SHIFT_MIN_ANGLE, max: TC_SHIFT_ANGLE_BIN_HALF };
  }

  if (targetAngle === 180) {
    return { min: 180 - TC_SHIFT_ANGLE_BIN_HALF, max: TC_SHIFT_MAX_ANGLE };
  }

  return {
    min: targetAngle - TC_SHIFT_ANGLE_BIN_HALF,
    max: targetAngle + TC_SHIFT_ANGLE_BIN_HALF
  };
}

function isAngleWithinTargetBin(angle, targetAngle) {
  const num = Number(angle);
  if (Number.isNaN(num)) return false;

  const range = getAngleBinRange(targetAngle);

  if (targetAngle === 0) {
    return num >= range.min && num <= range.max;
  }

  if (targetAngle === 180) {
    return num > range.min && num <= range.max;
  }

  return num > range.min && num <= range.max;
}

function isExactTargetAngle(angle, targetAngle) {
  return Math.abs(Number(angle) - Number(targetAngle)) < 0.000001;
}

function getFixedAngleTicks() {
  return TC_SHIFT_TARGET_ANGLES.slice();
}

function parseCustomAngleInput(value) {
  const text = String(value).trim();
  if (!text) return null;

  if (!/^-?\d+(\.\d)?$/.test(text)) return null;

  const num = Number(text);
  if (Number.isNaN(num)) return null;
  if (num < -5 || num > 180) return null;

  return num;
}

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
    tcShiftToolState.selectedRowIds = [];
    tcShiftToolState.showExcludedRows = false;
    tcShiftToolState.exclusionStartInput = "";
    tcShiftToolState.exclusionEndInput = "";
    tcShiftToolState.chartMode = "all-angle";
    tcShiftToolState.chartAngle = "22.5";
    tcShiftToolState.chartCustomAngle = "";
    tcShiftToolState.chartCustomAngleInput = "";
    tcShiftToolState.chartShowY = true;
    tcShiftToolState.chartShowX = true;
    tcShiftToolState.chartShowNearby = true;

  root.innerHTML = `
    <div class="tool-block">
      <div id="tcDropZone" class="file-drop-zone">
        <input id="tcFileInput" class="file-input-hidden" type="file" accept=".csv" multiple />
        <div class="file-drop-title">点击或拖拽文件到此处</div>
        <div class="file-drop-subtitle">支持格式: .csv，可一次选择多个文件</div>
      </div>

      <div id="tcFileList" class="tool-file-list empty-text">尚未选择文件。</div>


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

  if (!dropZone || !fileInput) return;

  let selectedFiles = [];

  function setFileStatus(message, type = "idle") {
    const fileList = document.getElementById("tcFileList");
    if (!fileList) return;
    fileList.className = `tool-file-list tc-file-status ${type}`;
    fileList.textContent = message;
  }

  async function analyzeSelectedFiles() {
    if (!selectedFiles.length) {
      setFileStatus("尚未选择文件。", "idle");
      return;
    }

    setFileStatus(`已选择 ${selectedFiles.length} 份文件，正在分析... (0/${selectedFiles.length})`, "running");

    try {
      const rows = await parseTcShiftFiles(selectedFiles, (done, total) => {
        setFileStatus(`已选择 ${total} 份文件，正在分析... (${done}/${total})`, "running");
      });
      renderTcShiftResults(rows);
      setFileStatus(`共 ${selectedFiles.length} 份文件，分析完成！`, "done");
    } catch (error) {
      console.error(error);
      setFileStatus(`分析失败：${error.message}`, "error");
      alert(`分析失败：${error.message}`);
    }
  }

  function setFiles(fileListLike) {
    selectedFiles = Array.from(fileListLike || []).filter((file) =>
      file.name.toLowerCase().endsWith(".csv")
    );
    analyzeSelectedFiles();
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
}

async function parseTcShiftFiles(files, onProgress) {
  const allRecords = [];
  const totalFiles = files.length;

  for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
    const file = files[fileIndex];
    const text = await file.text();
    const records = parseCsvText(text, file.name);

    for (const record of records) {
      allRecords.push(record);
    }

    if (typeof onProgress === "function") {
      onProgress(fileIndex + 1, totalFiles);
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
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
        rowId: `row-${shift.tcTimeMs}-${matchedAngle.angle}-${results.length}-${Math.random().toString(36).slice(2, 8)}`,
        excluded: false,
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

function getActiveRows() {
  return tcShiftToolState.allRows.filter((row) => !row.excluded);
}

function getDisplayRows() {
  return tcShiftToolState.allRows;
}

function getExcludedRows() {
  return tcShiftToolState.allRows.filter((row) => row.excluded);
}

function getVisibleTableRows() {
  return getDisplayRows();
}

function countExcludedRows() {
  return tcShiftToolState.allRows.filter((row) => row.excluded).length;
}

function isRowSelected(rowId) {
  return tcShiftToolState.selectedRowIds.includes(rowId);
}

function toggleRowSelection(rowId, checked) {
  if (checked) {
    if (!tcShiftToolState.selectedRowIds.includes(rowId)) {
      tcShiftToolState.selectedRowIds.push(rowId);
    }
  } else {
    tcShiftToolState.selectedRowIds = tcShiftToolState.selectedRowIds.filter((id) => id !== rowId);
  }
}

function clearSelection() {
  tcShiftToolState.selectedRowIds = [];
}

function getDefaultDataYear() {
  const firstRowWithDate = tcShiftToolState.allRows.find((row) => row.date);
  const year = firstRowWithDate ? Number(String(firstRowWithDate.date).slice(0, 4)) : new Date().getFullYear();
  return Number.isNaN(year) ? new Date().getFullYear() : year;
}

function parseDateTimeLocalInput(value) {
  const text = String(value || "").trim();
  if (!text) return null;

  const normalized = text.replace(/[\/\.]/g, "-").replace(/T/g, " ").replace(/\s+/g, " ");

  let match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (match) {
    const [, y, m, d, hh, mm] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0).getTime();
  }

  match = normalized.match(/^(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2})$/);
  if (match) {
    const [, m, d, hh, mm] = match;
    return new Date(getDefaultDataYear(), Number(m) - 1, Number(d), Number(hh), Number(mm), 0, 0).getTime();
  }

  return null;
}

function renderTcShiftResults(rows) {
  tcShiftToolState.allRows = rows;
  tcShiftToolState.currentPage = 1;
  clearSelection();

  const stats = calculateShiftStats(getActiveRows());
  renderTcShiftStatsToSide(stats);
  renderTcShiftTableAndSummary();
}

function renderTcShiftTableAndSummary() {
  const summary = document.getElementById("tcSummary");
  const wrap = document.getElementById("tcResultTableWrap");
  if (!summary || !wrap) return;

  const activeRows = getActiveRows();
  const excludedRows = getExcludedRows();
  const tableRows = getVisibleTableRows();

  const pageSize = tcShiftToolState.pageSize;
  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const currentPage = Math.min(tcShiftToolState.currentPage, totalPages);
  tcShiftToolState.currentPage = currentPage;

  summary.innerHTML = `
    <div class="summary-row tc-control-row">
      <div class="summary-card tc-data-count">
        <strong>提取数据：</strong>${activeRows.length}/${tcShiftToolState.allRows.length}
      </div>

      <div class="column-toggle-panel compact-column-toggle-panel">
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

      <div class="bulk-action-group tc-edit-action-group">
        <button id="toggleSelectPageBtn" class="tool-btn secondary-btn">全/反选</button>
        <button id="excludeSelectedBtn" class="tool-btn warn-btn">删除</button>
        <button id="restoreSelectedBtn" class="tool-btn secondary-btn">恢复</button>
        <button id="restoreAllBtn" class="tool-btn secondary-btn">全部复原</button>
      </div>

      <div class="table-pagination compact-pagination top-pagination">
        <div class="pagination-info compact-pagination-info">
          第
          <input
            id="tcPageInput"
            class="page-jump-input compact-page-jump-input"
            type="number"
            min="1"
            max="${totalPages}"
            value="${currentPage}"
          />
          / ${totalPages} 页
        </div>
        <button id="tcPrevPageBtn" class="tool-btn pagination-btn" ${currentPage <= 1 ? "disabled" : ""}>上一页</button>
        <button id="tcNextPageBtn" class="tool-btn pagination-btn" ${currentPage >= totalPages ? "disabled" : ""}>下一页</button>
      </div>
    </div>

  `;

  bindColumnToggleEvents();

  if (!tableRows.length) {
    wrap.innerHTML = `
      <div class="tc-empty-table-with-stats">
        <div class="empty-text">没有可显示的数据。</div>
        <div id="tcInlineStatsPanel" class="tc-inline-stats-panel"></div>
      </div>
    `;
    renderTcShiftStatsToSide(calculateShiftStats(activeRows));
    return;
  }

  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = tableRows.slice(startIndex, startIndex + pageSize);

  wrap.innerHTML = `
    <div class="tc-table-stats-layout">
      <div class="tc-table-area">
        ${buildTcShiftTableHtml(pageRows)}
      </div>
      <aside id="tcInlineStatsPanel" class="tc-inline-stats-panel"></aside>
    </div>

    ${buildTcShiftChartSectionHtml()}
  `;

  bindPaginationEvents(totalPages);
  bindSelectionToolbarEvents(pageRows);
  renderTcShiftStatsToSide(calculateShiftStats(activeRows));
  bindChartEvents();
  drawTcShiftChart();
}

function buildTcShiftTableHtml(rows) {
  const visible = tcShiftToolState.visibleColumns;

  const headers = [`<th class="select-col"><input id="selectAllCurrentPageCheckbox" type="checkbox" /></th>`];
  if (visible.date) headers.push(`<th>Date</th>`);
  if (visible.time) headers.push(`<th>Time</th>`);
  if (visible.angle) headers.push(`<th>Angle</th>`);
  if (visible.yShift) headers.push(`<th>Y shift</th>`);
  if (visible.xShift) headers.push(`<th>X shift</th>`);
  headers.push(`<th>Status</th>`);

  const colWidths = ["30px"];
  if (visible.date) colWidths.push("96px");
  if (visible.time) colWidths.push("96px");
  if (visible.angle) colWidths.push("72px");
  if (visible.yShift) colWidths.push("96px");
  if (visible.xShift) colWidths.push("96px");
  colWidths.push("82px");

  const colGroup = `<colgroup>${colWidths.map((width) => `<col style="width:${width}">`).join("")}</colgroup>`;

  const bodyRows = rows
    .map((row) => {
      const yDanger =
        row.yShift !== "" && (Number(row.yShift) < -2 || Number(row.yShift) > 2);
      const xDanger =
        row.xShift !== "" && (Number(row.xShift) < -2 || Number(row.xShift) > 2);

      const rowClass = [row.excluded ? "excluded-row" : "", isRowSelected(row.rowId) ? "row-selected" : ""]
        .filter(Boolean)
        .join(" ");

      const cells = [
        `<td class="select-col">
          <input
            class="row-select-checkbox"
            type="checkbox"
            data-row-id="${escapeHtml(row.rowId)}"
            ${isRowSelected(row.rowId) ? "checked" : ""}
          />
        </td>`
      ];

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

      cells.push(`
        <td>
          ${row.excluded ? '<span class="row-status-badge excluded">Deleted</span>' : '<span class="row-status-badge active">Active</span>'}
        </td>
      `);

      return `<tr class="${rowClass} selectable-data-row" data-row-id="${escapeHtml(row.rowId)}">${cells.join("")}</tr>`;
    })
    .join("");

  return `
    <table class="tool-table dynamic-table tc-shift-data-table">
      ${colGroup}
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

function bindSelectionToolbarEvents(pageRows) {
  const toggleSelectPageBtn = document.getElementById("toggleSelectPageBtn");
  const excludeSelectedBtn = document.getElementById("excludeSelectedBtn");
  const restoreSelectedBtn = document.getElementById("restoreSelectedBtn");
  const restoreAllBtn = document.getElementById("restoreAllBtn");
  const rowCheckboxes = document.querySelectorAll(".row-select-checkbox");
  const selectAllCurrentPageCheckbox = document.getElementById("selectAllCurrentPageCheckbox");

  rowCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    checkbox.addEventListener("change", (event) => {
      const rowId = event.target.dataset.rowId;
      toggleRowSelection(rowId, event.target.checked);
    });
  });

  document.querySelectorAll(".selectable-data-row").forEach((rowEl) => {
    rowEl.addEventListener("click", (event) => {
      if (event.target.closest("input, button, a, label")) return;
      const rowId = rowEl.dataset.rowId;
      const checkbox = rowEl.querySelector(".row-select-checkbox");
      if (!rowId || !checkbox) return;

      const checked = !checkbox.checked;
      checkbox.checked = checked;
      toggleRowSelection(rowId, checked);
      rowEl.classList.toggle("row-selected", checked);
    });
  });

  bindDragSelectRows();

  if (selectAllCurrentPageCheckbox) {
    const pageRowIds = pageRows.map((row) => row.rowId);
    const allChecked =
      pageRowIds.length > 0 && pageRowIds.every((rowId) => tcShiftToolState.selectedRowIds.includes(rowId));
    selectAllCurrentPageCheckbox.checked = allChecked;

    selectAllCurrentPageCheckbox.addEventListener("change", () => {
      pageRowIds.forEach((rowId) => {
        toggleRowSelection(rowId, selectAllCurrentPageCheckbox.checked);
      });
      renderTcShiftTableAndSummary();
    });
  }


  if (toggleSelectPageBtn) {
    toggleSelectPageBtn.addEventListener("click", () => {
      const pageRowIds = pageRows.map((row) => row.rowId);
      const selectedSet = new Set(tcShiftToolState.selectedRowIds);
      const allSelected = pageRowIds.length > 0 && pageRowIds.every((rowId) => selectedSet.has(rowId));

      pageRowIds.forEach((rowId) => {
        toggleRowSelection(rowId, !allSelected);
      });

      renderTcShiftTableAndSummary();
    });
  }


  if (excludeSelectedBtn) {
    excludeSelectedBtn.addEventListener("click", () => {
      const selectedSet = new Set(tcShiftToolState.selectedRowIds);
      tcShiftToolState.allRows.forEach((row) => {
        if (selectedSet.has(row.rowId)) {
          row.excluded = true;
        }
      });
      clearSelection();
      renderTcShiftStatsToSide(calculateShiftStats(getActiveRows()));
      renderTcShiftTableAndSummary();
    });
  }

  if (restoreSelectedBtn) {
    restoreSelectedBtn.addEventListener("click", () => {
      const selectedSet = new Set(tcShiftToolState.selectedRowIds);
      tcShiftToolState.allRows.forEach((row) => {
        if (selectedSet.has(row.rowId)) {
          row.excluded = false;
        }
      });
      clearSelection();
      renderTcShiftStatsToSide(calculateShiftStats(getActiveRows()));
      renderTcShiftTableAndSummary();
    });
  }


  if (restoreAllBtn) {
    restoreAllBtn.addEventListener("click", () => {
      tcShiftToolState.allRows.forEach((row) => {
        row.excluded = false;
      });
      clearSelection();
      renderTcShiftStatsToSide(calculateShiftStats(getActiveRows()));
      renderTcShiftTableAndSummary();
    });
  }

}


function bindDragSelectRows() {
  const table = document.querySelector(".tc-shift-data-table");
  if (!table) return;

  let isDragging = false;
  let dragSelectMode = true;
  let startX = 0;
  let startY = 0;
  let selectionBox = null;
  let touchedRowIds = new Set();
  let didDrag = false;

  function getPagePoint(event) {
    return { x: event.pageX, y: event.pageY };
  }

  function ensureSelectionBox() {
    if (selectionBox) return selectionBox;
    selectionBox = document.createElement("div");
    selectionBox.className = "drag-select-box";
    document.body.appendChild(selectionBox);
    return selectionBox;
  }

  function updateSelectionBox(currentX, currentY) {
    const box = ensureSelectionBox();
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
  }

  function rectsIntersect(a, b) {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  }

  function getSelectionRect() {
    if (!selectionBox) return null;
    return selectionBox.getBoundingClientRect();
  }

  function applyDragSelection() {
    const selectionRect = getSelectionRect();
    if (!selectionRect) return;

    document.querySelectorAll(".selectable-data-row").forEach((rowEl) => {
      const rowRect = rowEl.getBoundingClientRect();
      if (!rectsIntersect(selectionRect, rowRect)) return;

      const rowId = rowEl.dataset.rowId;
      if (!rowId || touchedRowIds.has(rowId)) return;

      touchedRowIds.add(rowId);
      const checkbox = rowEl.querySelector(".row-select-checkbox");
      if (checkbox) checkbox.checked = dragSelectMode;
      toggleRowSelection(rowId, dragSelectMode);
      rowEl.classList.toggle("row-selected", dragSelectMode);
    });
  }

  table.addEventListener("click", (event) => {
    if (!didDrag) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    didDrag = false;
  }, true);

  table.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest("input, button, a, label")) return;

    const rowEl = event.target.closest(".selectable-data-row");
    const rowId = rowEl ? rowEl.dataset.rowId : null;
    dragSelectMode = rowId ? !isRowSelected(rowId) : true;
    touchedRowIds = new Set();

    const point = getPagePoint(event);
    startX = point.x;
    startY = point.y;
    isDragging = true;

    updateSelectionBox(startX, startY);
    didDrag = false;
    event.preventDefault();
  });

  document.addEventListener("mousemove", (event) => {
    if (!isDragging) return;
    const point = getPagePoint(event);
    const distance = Math.hypot(point.x - startX, point.y - startY);
    if (distance > 4) didDrag = true;
    updateSelectionBox(point.x, point.y);
    applyDragSelection();
  });

  document.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
  }, { once: true });
}

function bindTableRowSelectionEvents() {
  const rowCheckboxes = document.querySelectorAll(".row-select-checkbox");
  rowCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", (event) => {
      const rowId = event.target.dataset.rowId;
      toggleRowSelection(rowId, event.target.checked);
    });
  });

  const selectAllCurrentPageCheckbox = document.getElementById("selectAllCurrentPageCheckbox");
  if (selectAllCurrentPageCheckbox) {
    selectAllCurrentPageCheckbox.addEventListener("change", (event) => {
      const checked = event.target.checked;
      const currentPageCheckboxes = document.querySelectorAll(".row-select-checkbox");

      currentPageCheckboxes.forEach((checkbox) => {
        checkbox.checked = checked;
        const rowId = checkbox.dataset.rowId;
        toggleRowSelection(rowId, checked);
      });
    });
  }
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
  const statsTarget = document.getElementById("tcInlineStatsPanel") || document.getElementById("sideContent");
  if (!statsTarget) return;

  const offsetParams = loadTcShiftOffsetParams();

  statsTarget.innerHTML = `
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
            data-param-key="ySlope"
            type="number"
            step="any"
            class="calc-input compact-input narrow-input offset-param-input"
            value="${escapeHtml(offsetParams.ySlope)}"
          />
        </label>

        <label class="calc-field">
          <span>Y (CP) offset</span>
          <input
            id="yOffsetInput"
            data-param-key="yOffset"
            type="number"
            step="any"
            class="calc-input compact-input narrow-input offset-param-input"
            value="${escapeHtml(offsetParams.yOffset)}"
          />
        </label>

        <label class="calc-field">
          <span>X (IP) slope</span>
          <input
            id="xSlopeInput"
            data-param-key="xSlope"
            type="number"
            step="any"
            class="calc-input compact-input narrow-input offset-param-input"
            value="${escapeHtml(offsetParams.xSlope)}"
          />
        </label>

        <label class="calc-field">
          <span>X (IP) offset</span>
          <input
            id="xOffsetInput"
            data-param-key="xOffset"
            type="number"
            step="any"
            class="calc-input compact-input narrow-input offset-param-input"
            value="${escapeHtml(offsetParams.xOffset)}"
          />
        </label>
      </div>

      <div class="calc-result-wrap">
        <div class="calc-result-card offset-result-card">
          <div class="mini-stat-label offset-result-label">Y new offset</div>
          <div id="yNewOffsetOutput" class="mini-stat-value offset-result-value">--</div>
        </div>
        <div class="calc-result-card offset-result-card">
          <div class="mini-stat-label offset-result-label">X new offset</div>
          <div id="xNewOffsetOutput" class="mini-stat-value offset-result-value">--</div>
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
    input.addEventListener("input", () => {
      saveTcShiftOffsetParam(input.dataset.paramKey, input.value);
      updateOutputs();
    });
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
      <div class="chart-panel-top">
        <div class="chart-toolbar chart-toolbar-main">
          <div class="chart-toolbar-left chart-toolbar-grid">
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
                <option value="custom" ${tcShiftToolState.chartAngle === "custom" ? "selected" : ""}>自定义</option>
              </select>
            </label>

            <label
              class="chart-control chart-control-custom"
              id="chartCustomAngleControl"
              ${
                tcShiftToolState.chartMode === "single-angle" &&
                tcShiftToolState.chartAngle === "custom"
                  ? ""
                  : 'style="display:none;"'
              }
            >
              <span>自定义角度</span>
              <input
                id="chartCustomAngleInput"
                class="chart-select chart-input"
                type="number"
                min="-5"
                max="180"
                step="0.1"
                placeholder="例如 40"
                value="${escapeHtml(tcShiftToolState.chartCustomAngleInput)}"
              />
            </label>
          </div>
        </div>

        <div class="chart-toolbar chart-toolbar-sub">
          <div class="chart-toolbar-right chart-toggle-group">
            <label class="chart-check-item">
              <input id="chartShowY" type="checkbox" ${tcShiftToolState.chartShowY ? "checked" : ""} />
              <span>Y shift</span>
            </label>
            <label class="chart-check-item">
              <input id="chartShowX" type="checkbox" ${tcShiftToolState.chartShowX ? "checked" : ""} />
              <span>X shift</span>
            </label>
            <label class="chart-check-item" id="chartNearbyToggleWrap" ${tcShiftToolState.chartMode === "single-angle" ? "" : 'style="display:none;"'}>
              <input id="chartShowNearby" type="checkbox" ${tcShiftToolState.chartShowNearby ? "checked" : ""} />
              <span>Nearby angle</span>
            </label>
          </div>
        </div>

        <div class="chart-legend chart-legend-compact">
          <span class="legend-item">
            <span class="legend-dot legend-dot-y"></span>Y shift
          </span>
          <span class="legend-item">
            <span class="legend-dot legend-dot-x"></span>X shift
          </span>
          <span class="legend-item">
            <span class="legend-swatch legend-swatch-main"></span>Target
          </span>
          <span class="legend-item">
            <span class="legend-swatch legend-swatch-soft"></span>Nearby
          </span>
          <span class="chart-threshold-note">Alarm threshold: ±2</span>
        </div>
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
  const showNearby = document.getElementById("chartShowNearby");
  const customAngleControl = document.getElementById("chartCustomAngleControl");
  const customAngleInput = document.getElementById("chartCustomAngleInput");
  const canvas = document.getElementById("tcShiftChartCanvas");

  if (modeSelect) {
    modeSelect.addEventListener("change", () => {
      tcShiftToolState.chartMode = modeSelect.value;

      const angleControl = document.getElementById("chartAngleControl");
      if (angleControl) {
        angleControl.style.display =
          tcShiftToolState.chartMode === "single-angle" ? "" : "none";
      }

      const nearbyToggleWrap = document.getElementById("chartNearbyToggleWrap");
      if (nearbyToggleWrap) {
        nearbyToggleWrap.style.display =
          tcShiftToolState.chartMode === "single-angle" ? "" : "none";
      }

      if (customAngleControl) {
        customAngleControl.style.display =
          tcShiftToolState.chartMode === "single-angle" &&
          tcShiftToolState.chartAngle === "custom"
            ? ""
            : "none";
      }

      tcShiftChartRuntime.hoverPoint = null;
      drawTcShiftChart();
    });
  }

  if (angleSelect) {
    angleSelect.addEventListener("change", () => {
      tcShiftToolState.chartAngle = angleSelect.value;

      if (customAngleControl) {
        customAngleControl.style.display =
          tcShiftToolState.chartMode === "single-angle" &&
          tcShiftToolState.chartAngle === "custom"
            ? ""
            : "none";
      }

      if (tcShiftToolState.chartAngle !== "custom") {
        tcShiftToolState.chartCustomAngle = "";
        tcShiftToolState.chartCustomAngleInput = "";
        if (customAngleInput) customAngleInput.value = "";
      }

      tcShiftChartRuntime.hoverPoint = null;
      drawTcShiftChart();
    });
  }

  if (showY) {
    showY.addEventListener("change", () => {
      tcShiftToolState.chartShowY = showY.checked;
      tcShiftChartRuntime.hoverPoint = null;
      drawTcShiftChart();
    });
  }

  if (showX) {
    showX.addEventListener("change", () => {
      tcShiftToolState.chartShowX = showX.checked;
      tcShiftChartRuntime.hoverPoint = null;
      drawTcShiftChart();
    });
  }

  if (showNearby) {
    showNearby.addEventListener("change", () => {
      tcShiftToolState.chartShowNearby = showNearby.checked;
      tcShiftChartRuntime.hoverPoint = null;
      drawTcShiftChart();
    });
  }

  if (customAngleInput) {
    customAngleInput.addEventListener("input", () => {
      tcShiftToolState.chartCustomAngleInput = customAngleInput.value;

      const parsed = parseCustomAngleInput(customAngleInput.value);
      tcShiftToolState.chartCustomAngle = parsed === null ? "" : String(parsed);

      tcShiftChartRuntime.hoverPoint = null;
      drawTcShiftChart();
    });
  }

  if (canvas && !tcShiftChartRuntime.mouseBound) {
    canvas.addEventListener("mousemove", handleTcShiftChartMouseMove);
    canvas.addEventListener("mouseleave", handleTcShiftChartMouseLeave);
    tcShiftChartRuntime.mouseBound = true;
  }
}

function handleTcShiftChartMouseMove(event) {
  const canvas = event.currentTarget;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const mouseX = (event.clientX - rect.left) * scaleX;
  const mouseY = (event.clientY - rect.top) * scaleY;

  const points = tcShiftChartRuntime.interactivePoints || [];
  let nearest = null;
  let nearestDist = Infinity;

  for (const point of points) {
    const dx = mouseX - point.canvasX;
    const dy = mouseY - point.canvasY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 10 && dist < nearestDist) {
      nearest = point;
      nearestDist = dist;
    }
  }

  const oldKey = tcShiftChartRuntime.hoverPoint
    ? `${tcShiftChartRuntime.hoverPoint.series}-${tcShiftChartRuntime.hoverPoint.rowIndex}-${tcShiftChartRuntime.hoverPoint.shiftTimeMs}`
    : null;

  const newKey = nearest
    ? `${nearest.series}-${nearest.rowIndex}-${nearest.shiftTimeMs}`
    : null;

  if (oldKey !== newKey) {
    tcShiftChartRuntime.hoverPoint = nearest;
    drawTcShiftChart();
  }
}

function handleTcShiftChartMouseLeave() {
  if (tcShiftChartRuntime.hoverPoint) {
    tcShiftChartRuntime.hoverPoint = null;
    drawTcShiftChart();
  }
}

function drawTcShiftChart() {
  const canvas = document.getElementById("tcShiftChartCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rows = getActiveRows() || [];
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  tcShiftChartRuntime.interactivePoints = [];

  if (!rows.length) {
    ctx.fillStyle = "#777";
    ctx.font = "16px Segoe UI";
    ctx.fillText("暂无数据可绘图", 30, 40);
    return;
  }

  const padding = { left: 78, right: 30, top: 30, bottom: 68 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  let dataY = [];
  let dataX = [];
  let xAxisType = "numeric";
  let xAxisTitle = "Angle";
  let xLabelFormatter = (v) => String(v);
  let fixedXTicks = null;

  if (tcShiftToolState.chartMode === "all-angle") {
    const filtered = rows.filter((row) => row.angle !== "" && row.angle !== null);

    dataY = filtered
      .filter((row) => row.yShift !== "")
      .map((row, index) => ({
        x: Number(row.angle),
        y: Number(row.yShift),
        rowIndex: index,
        shiftTimeMs: row.shiftTimeMs,
        shiftTimestamp: row.shiftTimestamp,
        angle: row.angle,
        yShift: row.yShift,
        xShift: row.xShift,
        series: "Y",
        isNearbyAngle: false
      }));

    dataX = filtered
      .filter((row) => row.xShift !== "")
      .map((row, index) => ({
        x: Number(row.angle),
        y: Number(row.xShift),
        rowIndex: index,
        shiftTimeMs: row.shiftTimeMs,
        shiftTimestamp: row.shiftTimestamp,
        angle: row.angle,
        yShift: row.yShift,
        xShift: row.xShift,
        series: "X",
        isNearbyAngle: false
      }));

    xAxisType = "numeric";
    xAxisTitle = "Angle";
    xLabelFormatter = (v) => `${trimTrailingZeros(v)}°`;
    fixedXTicks = getFixedAngleTicks();
  } else {
    const targetAngle =
      tcShiftToolState.chartAngle === "custom"
        ? parseCustomAngleInput(tcShiftToolState.chartCustomAngleInput)
        : Number(tcShiftToolState.chartAngle);

    if (targetAngle === null || Number.isNaN(targetAngle)) {
      ctx.fillStyle = "#777";
      ctx.font = "16px Segoe UI";
      ctx.fillText("请输入有效的自定义角度（-5 ~ 180，最多 1 位小数）", 30, 40);
      return;
    }
    
    const filtered = rows.filter((row) =>
      isAngleWithinTargetBin(Number(row.angle), targetAngle)
    );
    const sameDayMode = isSameDayRange(filtered.map((row) => row.shiftTimeMs));

    dataY = filtered
      .filter((row) => row.yShift !== "")
      .filter((row) => {
        if (tcShiftToolState.chartShowNearby) return true;
        return isExactTargetAngle(Number(row.angle), targetAngle);
      })
      .map((row, index) => ({
        x: row.shiftTimeMs,
        y: Number(row.yShift),
        rowIndex: index,
        shiftTimeMs: row.shiftTimeMs,
        shiftTimestamp: row.shiftTimestamp,
        angle: row.angle,
        yShift: row.yShift,
        xShift: row.xShift,
        series: "Y",
        isNearbyAngle: !isExactTargetAngle(Number(row.angle), targetAngle)
      }));

    dataX = filtered
      .filter((row) => row.xShift !== "")
      .filter((row) => {
        if (tcShiftToolState.chartShowNearby) return true;
        return isExactTargetAngle(Number(row.angle), targetAngle);
      })
      .map((row, index) => ({
        x: row.shiftTimeMs,
        y: Number(row.xShift),
        rowIndex: index,
        shiftTimeMs: row.shiftTimeMs,
        shiftTimestamp: row.shiftTimestamp,
        angle: row.angle,
        yShift: row.yShift,
        xShift: row.xShift,
        series: "X",
        isNearbyAngle: !isExactTargetAngle(Number(row.angle), targetAngle)
      }));

    xAxisType = "time";
    xAxisTitle = "Time";
    xLabelFormatter = (v) => formatSmartTimeLabel(v, sameDayMode);
    fixedXTicks = null;
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

  let minX = Math.min(...combined.map((p) => p.x));
  let maxX = Math.max(...combined.map((p) => p.x));
  let minY = Math.min(...combined.map((p) => p.y));
  let maxY = Math.max(...combined.map((p) => p.y));

  if (tcShiftToolState.chartMode === "all-angle") {
    minX = TC_SHIFT_MIN_ANGLE;
    maxX = TC_SHIFT_MAX_ANGLE;
  } else if (minX === maxX) {
    minX -= 1000;
    maxX += 1000;
  }

  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }

  const yPadding = (maxY - minY) * 0.15;
  minY -= yPadding;
  maxY += yPadding;

  function mapX(value) {
    return padding.left + ((value - minX) / (maxX - minX)) * plotWidth;
  }

  function mapY(value) {
    return padding.top + (1 - (value - minY) / (maxY - minY)) * plotHeight;
  }

  drawChartGrid(ctx, {
    padding,
    plotWidth,
    plotHeight,
    minX,
    maxX,
    minY,
    maxY,
    xLabelFormatter,
    xAxisType,
    fixedXTicks
  });

  drawThresholdLine(ctx, {
    value: 2,
    minY,
    maxY,
    padding,
    plotHeight,
    plotWidth,
    label: "+2"
  });

  drawThresholdLine(ctx, {
    value: -2,
    minY,
    maxY,
    padding,
    plotHeight,
    plotWidth,
    label: "-2"
  });

  if (tcShiftToolState.chartShowY) {
    const yPoints = drawSeries(
      ctx,
      dataY,
      mapX,
      mapY,
      {
        main: "#f59e0b",
        soft: "rgba(245, 158, 11, 0.35)"
      },
      tcShiftToolState.chartMode === "single-angle"
    );
    tcShiftChartRuntime.interactivePoints.push(...yPoints);
  }

  if (tcShiftToolState.chartShowX) {
    const xPoints = drawSeries(
      ctx,
      dataX,
      mapX,
      mapY,
      {
        main: "#3b82f6",
        soft: "rgba(59, 130, 246, 0.35)"
      },
      tcShiftToolState.chartMode === "single-angle"
    );
    tcShiftChartRuntime.interactivePoints.push(...xPoints);
  }

  drawChartAxes(ctx, padding, plotWidth, plotHeight);

  ctx.fillStyle = "#555";
  ctx.font = "13px Segoe UI";
  ctx.textAlign = "center";
  ctx.fillText(xAxisTitle, padding.left + plotWidth / 2, height - 18);

  ctx.save();
  ctx.translate(20, padding.top + plotHeight / 2 + 20);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("Shift", 0, 0);
  ctx.restore();

  if (tcShiftChartRuntime.hoverPoint) {
    drawHoveredPoint(ctx, tcShiftChartRuntime.hoverPoint);
    drawChartTooltip(ctx, tcShiftChartRuntime.hoverPoint, width, height);
  }
}

function drawChartGrid(ctx, config) {
  const {
    padding,
    plotWidth,
    plotHeight,
    minX,
    maxX,
    minY,
    maxY,
    xLabelFormatter,
    xAxisType,
    fixedXTicks
  } = config;

  ctx.save();

  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  const horizontalLines = 6;

  let tickValues = [];

  if (Array.isArray(fixedXTicks) && fixedXTicks.length) {
    tickValues = fixedXTicks;
  } else {
    const verticalLines = xAxisType === "time" ? 7 : 6;
    for (let i = 0; i <= verticalLines; i++) {
      tickValues.push(minX + (i / verticalLines) * (maxX - minX));
    }
  }

  tickValues.forEach((value) => {
    const x = padding.left + ((value - minX) / (maxX - minX)) * plotWidth;

    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotHeight);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "#888";
    ctx.font = "12px Segoe UI";
    ctx.textAlign = "center";

    if (xAxisType === "time") {
      drawWrappedXAxisLabel(ctx, xLabelFormatter(value), x, padding.top + plotHeight + 20);
    } else {
      ctx.fillText(xLabelFormatter(value), x, padding.top + plotHeight + 22);
    }

    ctx.setLineDash([4, 4]);
  });

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

function drawWrappedXAxisLabel(ctx, label, x, y) {
  const parts = String(label).split("\n");
  if (parts.length === 1) {
    ctx.fillText(parts[0], x, y);
    return;
  }

  ctx.fillText(parts[0], x, y - 7);
  ctx.fillText(parts[1], x, y + 8);
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

function drawThresholdLine(ctx, config) {
  const { value, minY, maxY, padding, plotHeight, plotWidth, label } = config;

  if (value < minY || value > maxY) return;

  const y = padding.top + (1 - (value - minY) / (maxY - minY)) * plotHeight;

  ctx.save();

  ctx.strokeStyle = "rgba(220, 38, 38, 0.65)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);

  ctx.beginPath();
  ctx.moveTo(padding.left, y);
  ctx.lineTo(padding.left + plotWidth, y);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(180, 30, 30, 0.9)";
  ctx.font = "12px Segoe UI";
  ctx.textAlign = "left";
  ctx.fillText(label, padding.left + 8, y - 6);

  ctx.restore();
}

function drawSeries(ctx, data, mapX, mapY, colorSet, connectLine) {
  if (!data.length) return [];

  const points = [];
  const mainPoints = data.filter((point) => !point.isNearbyAngle);
  const softPoints = data.filter((point) => point.isNearbyAngle);

  ctx.save();

  if (connectLine && data.length > 1) {
    ctx.beginPath();
    ctx.strokeStyle = colorSet.main;
    ctx.lineWidth = 2;

    data.forEach((point, index) => {
      const x = mapX(point.x);
      const y = mapY(point.y);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }

  softPoints.forEach((point) => {
    const canvasX = mapX(point.x);
    const canvasY = mapY(point.y);

    ctx.beginPath();
    ctx.fillStyle = colorSet.soft;
    ctx.arc(canvasX, canvasY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    points.push({
      ...point,
      canvasX,
      canvasY,
      color: colorSet.soft
    });
  });

  mainPoints.forEach((point) => {
    const canvasX = mapX(point.x);
    const canvasY = mapY(point.y);

    ctx.beginPath();
    ctx.fillStyle = colorSet.main;
    ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
    ctx.fill();

    points.push({
      ...point,
      canvasX,
      canvasY,
      color: colorSet.main
    });
  });

  ctx.restore();
  return points;
}

function drawHoveredPoint(ctx, point) {
  ctx.save();

  ctx.beginPath();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.arc(point.canvasX, point.canvasY, 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(point.canvasX, point.canvasY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawChartTooltip(ctx, point, canvasWidth, canvasHeight) {
  const lines = [
    `Time: ${formatFullTimestamp(point.shiftTimeMs)}`,
    `Angle: ${trimTrailingZeros(point.angle)}°`,
    `Type: ${point.isNearbyAngle ? "Nearby" : "Target"}`,
    `Y shift: ${point.yShift === "" ? "--" : formatNumber(point.yShift, 6)}`,
    `X shift: ${point.xShift === "" ? "--" : formatNumber(point.xShift, 6)}`
  ];

  ctx.save();
  ctx.font = "12px Segoe UI";

  let maxWidth = 0;
  for (const line of lines) {
    const width = ctx.measureText(line).width;
    if (width > maxWidth) maxWidth = width;
  }

  const boxWidth = maxWidth + 20;
  const boxHeight = lines.length * 18 + 16;

  let boxX = point.canvasX + 12;
  let boxY = point.canvasY - boxHeight - 12;

  if (boxX + boxWidth > canvasWidth - 8) {
    boxX = point.canvasX - boxWidth - 12;
  }

  if (boxY < 8) {
    boxY = point.canvasY + 12;
  }

  if (boxY + boxHeight > canvasHeight - 8) {
    boxY = canvasHeight - boxHeight - 8;
  }

  ctx.fillStyle = "rgba(20, 20, 20, 0.92)";
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";

  lines.forEach((line, index) => {
    ctx.fillText(line, boxX + 10, boxY + 18 + index * 18);
  });

  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function isSameDayRange(timestamps) {
  if (!timestamps.length) return true;

  const valid = timestamps.filter((v) => Number.isFinite(v));
  if (!valid.length) return true;

  const first = new Date(Math.min(...valid));
  const last = new Date(Math.max(...valid));

  return (
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth() &&
    first.getDate() === last.getDate()
  );
}

function formatSmartTimeLabel(timestamp, sameDayMode) {
  const d = new Date(timestamp);

  if (sameDayMode) {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}\n${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function formatFullTimestamp(timestamp) {
  const d = new Date(timestamp);
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}.` +
    `${String(d.getMilliseconds()).padStart(3, "0")}`
  );
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function trimTrailingZeros(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toFixed(6).replace(/\.?0+$/, "");
}

function roundForAxis(value) {
  return Number(value).toFixed(2);
}
