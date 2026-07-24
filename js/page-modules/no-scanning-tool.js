const noScanningState = {
  records: [],
  failures: []
};

const noScanningRuntime = {
  hitRegions: new Map(),
  hover: null
};

const NO_SCANNING_POSITION_SERIES = [
  {
    id: "cpIso",
    label: "Crossplane ISO position",
    color: "#0000ff",
    marker: "x",
    column: "Crossplane Projected Iso Correlated (mm)"
  },
  {
    id: "ipIso",
    label: "Inplane ISO position",
    color: "#ff0000",
    marker: "x",
    column: "Inplane Projected Iso Correlated (mm)"
  },
  {
    id: "cpUs",
    label: "Crossplane US position",
    color: "#0000ff",
    marker: "circle",
    column: "Crossplane Upstream Calibrated Actual Correlated (mm)"
  },
  {
    id: "ipUs",
    label: "Inplane US position",
    color: "#ff0000",
    marker: "circle",
    column: "Inplane Upstream Calibrated Actual Correlated (mm)"
  },
  {
    id: "cpDs",
    label: "Crossplane DS position",
    color: "#0000ff",
    marker: "star",
    column: "Crossplane Downstream Calibrated Actual Correlated (mm)"
  },
  {
    id: "ipDs",
    label: "Inplane DS position",
    color: "#ff0000",
    marker: "star",
    column: "Inplane Downstream Calibrated Actual Correlated (mm)"
  }
];

const NO_SCANNING_SIGMA_SERIES = [
  {
    id: "cpUs",
    label: "Crossplane US Sigma",
    color: "#ff0000",
    marker: "x",
    column: "Crossplane Upstream sigma"
  },
  {
    id: "cpDs",
    label: "Crossplane DS Sigma",
    color: "#ff0000",
    marker: "circle",
    column: "Crossplane Downstream sigma"
  },
  {
    id: "ipUs",
    label: "Inplane US Sigma",
    color: "#0000ff",
    marker: "x",
    column: "Inplane Upstream sigma"
  },
  {
    id: "ipDs",
    label: "Inplane DS Sigma",
    color: "#0000ff",
    marker: "circle",
    column: "Inplane Downstream sigma"
  }
];

function initNoScanningToolPage() {
  const root = document.getElementById("noScanningToolRoot");
  if (!root || root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  root.innerHTML = `
    <div class="tool-block no-scanning-tool">
      <div id="noScanningDropZone" class="file-drop-zone no-scanning-drop-zone">
        <input id="noScanningFileInput" class="file-input-hidden" type="file" accept=".csv" multiple />
        <div class="file-drop-title">点击或拖拽 No Scanning Treatment Record 到此处</div>
        <div class="file-drop-subtitle">支持一次选择多个日期的 .csv 文件；每份记录汇总为一个趋势点</div>
      </div>

      <div id="noScanningStatus" class="tool-file-list no-scanning-status empty-text">尚未选择文件。</div>
      <div id="noScanningSummary" class="no-scanning-summary"></div>
      <div id="noScanningCharts" class="no-scanning-charts">
        <div class="empty-text no-scanning-empty">导入 Treatment Record 后显示 Position 与 Sigma 趋势。</div>
      </div>
    </div>
  `;

  bindNoScanningFileEvents();
}

function bindNoScanningFileEvents() {
  const dropZone = document.getElementById("noScanningDropZone");
  const fileInput = document.getElementById("noScanningFileInput");
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (event) => {
    const files = event.target.files;
    if (files?.length) analyzeNoScanningFiles(files);
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    const files = event.dataTransfer.files;
    if (files?.length) analyzeNoScanningFiles(files);
  });
}

async function analyzeNoScanningFiles(fileList) {
  const files = Array.from(fileList).filter((file) => /\.csv$/i.test(file.name));
  if (!files.length) {
    setNoScanningStatus("请选择 CSV 文件。", "error");
    return;
  }

  const startTime = performance.now();
  const records = [];
  const failures = [];
  noScanningRuntime.hover = null;
  noScanningRuntime.hitRegions.clear();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    setNoScanningStatus(`正在分析 ${index + 1}/${files.length}：${file.name}`, "running");
    try {
      const text = await file.text();
      records.push(parseNoScanningTreatmentRecord(text, file.name));
    } catch (error) {
      failures.push({ fileName: file.name, message: error.message });
    }
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  records.sort((left, right) => left.dateMs - right.dateMs || left.sourceFileName.localeCompare(right.sourceFileName));
  noScanningState.records = records;
  noScanningState.failures = failures;
  renderNoScanningResults();

  const elapsed = formatNoScanningElapsed(performance.now() - startTime);
  const incompleteCount = records.filter((record) => !record.complete).length;
  const failureText = failures.length ? `，${failures.length} 份未读取` : "";
  const incompleteText = incompleteCount ? `，${incompleteCount} 份记录不完整` : "";
  setNoScanningStatus(
    `共 ${files.length} 份文件，耗时 ${elapsed}；读取 ${records.length} 份记录${incompleteText}${failureText}。`,
    records.length ? "done" : "error"
  );
}

function setNoScanningStatus(message, type) {
  const status = document.getElementById("noScanningStatus");
  if (!status) return;
  status.className = `tool-file-list no-scanning-status ${type || ""}`;
  status.textContent = message;
}

function parseNoScanningTreatmentRecord(text, sourceFileName) {
  if (!window.CsvUtils || typeof window.CsvUtils.parseRows !== "function") {
    throw new Error("CSV parser is unavailable.");
  }

  const rows = window.CsvUtils.parseRows(text);
  const headerRowIndex = rows.findIndex(
    (row) => row.some((cell) => normalizeNoScanningHeader(cell) === "crossplane projected iso correlated (mm)")
  );
  if (headerRowIndex < 0) {
    throw new Error("未找到 No Scanning 数据表头。");
  }

  const meta = parseNoScanningMeta(rows.slice(0, headerRowIndex));
  const headers = rows[headerRowIndex].map((value) => String(value || "").trim());
  const columnIndex = new Map(headers.map((header, index) => [normalizeNoScanningHeader(header), index]));
  const requiredColumns = [
    ...NO_SCANNING_POSITION_SERIES.map((series) => series.column),
    ...NO_SCANNING_SIGMA_SERIES.map((series) => series.column)
  ];
  const missingColumns = requiredColumns.filter(
    (column) => !columnIndex.has(normalizeNoScanningHeader(column))
  );
  if (missingColumns.length) {
    throw new Error(`缺少字段：${missingColumns.join("、")}`);
  }

  const dataRows = rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => String(cell || "").trim() !== ""));
  if (!dataRows.length) {
    throw new Error("没有读取到脉冲数据。");
  }

  const position = {};
  NO_SCANNING_POSITION_SERIES.forEach((series) => {
    position[series.id] = summarizeNoScanningColumn(dataRows, columnIndex, series.column);
  });

  const sigma = {};
  NO_SCANNING_SIGMA_SERIES.forEach((series) => {
    sigma[series.id] = summarizeNoScanningColumn(dataRows, columnIndex, series.column);
  });

  const startText = meta["Treatment Start Local Time"] || "";
  const date = parseNoScanningDate(startText);
  if (!date) {
    throw new Error("无法读取 Treatment Start Local Time。");
  }

  const allStats = [
    ...Object.values(position),
    ...Object.values(sigma)
  ];
  const pulseCount = dataRows.length;
  const hasCompleteColumns = allStats.every((stats) => stats.count === pulseCount);
  const normalTermination = String(meta["Termination Condition"] || "").trim().toUpperCase() === "NORMAL_TERMINATION";
  const headerMatch = String(meta["TreatmentRecord and Header Data Match"] || "").trim().toLowerCase() === "true";

  return {
    sourceFileName,
    meta,
    dateMs: date.getTime(),
    dateText: formatNoScanningDateTime(date),
    pulseCount,
    position,
    sigma,
    complete: pulseCount === 400 && hasCompleteColumns && normalTermination && headerMatch,
    normalTermination,
    headerMatch
  };
}

function parseNoScanningMeta(rows) {
  const meta = {};
  rows.forEach((row) => {
    const key = String(row[0] || "").trim();
    if (key) meta[key] = String(row.slice(1).join(",") || "").trim();
  });
  return meta;
}

function summarizeNoScanningColumn(rows, columnIndex, columnName) {
  const index = columnIndex.get(normalizeNoScanningHeader(columnName));
  const values = rows
    .map((row) => Number(String(row[index] ?? "").trim()))
    .filter(Number.isFinite);
  if (!values.length) {
    return { count: 0, mean: NaN, min: NaN, max: NaN, sigma: NaN };
  }

  const sum = values.reduce((total, value) => total + value, 0);
  const mean = sum / values.length;
  const variance = values.reduce((total, value) => total + Math.pow(value - mean, 2), 0) / values.length;
  return {
    count: values.length,
    mean,
    min: Math.min(...values),
    max: Math.max(...values),
    sigma: Math.sqrt(variance)
  };
}

function normalizeNoScanningHeader(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function parseNoScanningDate(value) {
  const match = String(value || "").trim().match(
    /^(?:[A-Za-z]{3}\s+)?([A-Za-z]{3})\s+(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(\d{4})$/
  );
  if (!match) return null;
  const months = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
  };
  const month = months[match[1]];
  if (month == null) return null;
  const date = new Date(
    Number(match[6]),
    month,
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function renderNoScanningResults() {
  const summary = document.getElementById("noScanningSummary");
  const charts = document.getElementById("noScanningCharts");
  if (!summary || !charts) return;

  const records = noScanningState.records;
  if (!records.length) {
    summary.innerHTML = "";
    charts.innerHTML = '<div class="empty-text no-scanning-empty">没有可显示的记录。</div>';
    return;
  }

  summary.innerHTML = `
    <div class="summary-card"><strong>记录数：</strong>${records.length}</div>
    <div class="summary-card"><strong>日期范围：</strong>${formatNoScanningDateRange(records)}</div>
  `;

  charts.innerHTML = `
    <section class="card no-scanning-chart-card">
      <canvas id="noScanningPositionChart" width="760" height="600" aria-label="No Scanning Position trend"></canvas>
    </section>
    <section class="card no-scanning-chart-card">
      <canvas id="noScanningSigmaChart" width="760" height="600" aria-label="No Scanning Sigma trend"></canvas>
    </section>
  `;

  bindNoScanningChartHover();
  drawNoScanningCharts();
}

function drawNoScanningCharts() {
  const records = noScanningState.records;
  drawNoScanningTrendChart({
    canvasId: "noScanningPositionChart",
    title: "(0,0) vs Date",
    yLabel: "Zero Position (mm)",
    records,
    series: NO_SCANNING_POSITION_SERIES,
    includeZero: true,
    getStats: (record, series) => record.position[series.id],
    sourceLabel: ""
  });
  drawNoScanningTrendChart({
    canvasId: "noScanningSigmaChart",
    title: "US and DS Sigma vs Date",
    yLabel: "Sigma (mm)",
    records,
    series: NO_SCANNING_SIGMA_SERIES,
    includeZero: false,
    getStats: (record, series) => record.sigma[series.id],
    sourceLabel: ""
  });
}

function drawNoScanningTrendChart(config) {
  const canvas = document.getElementById(config.canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = { left: 82, right: 38, top: 48, bottom: 76 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const regions = [];

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f4f4f4";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(pad.left, pad.top, chartW, chartH);

  drawNoScanningTitle(ctx, config.title, pad.left + chartW / 2);
  if (!config.records.length) {
    drawNoScanningEmpty(ctx, width, height);
    noScanningRuntime.hitRegions.set(config.canvasId, []);
    return;
  }

  const xRange = getNoScanningDateRange(config.records);
  const yValues = [];
  config.records.forEach((record) => {
    config.series.forEach((series) => {
      const stats = config.getStats(record, series);
      if (Number.isFinite(stats?.mean)) yValues.push(stats.mean);
    });
  });
  const yScale = getNoScanningScale(yValues, config.includeZero);

  drawNoScanningAxes(ctx, pad, chartW, chartH, xRange, yScale, config.records, config.yLabel);

  config.series.forEach((series) => {
    config.records.forEach((record) => {
      const stats = config.getStats(record, series);
      if (!Number.isFinite(stats?.mean)) return;
      const dayMs = getNoScanningDayMs(record.dateMs);
      const x = pad.left + ((dayMs - xRange.min) / (xRange.max - xRange.min)) * chartW;
      const y = pad.top + chartH - ((stats.mean - yScale.min) / (yScale.max - yScale.min)) * chartH;
      drawNoScanningMarker(ctx, series.marker, x, y, series.color, 3.4);
      regions.push({
        canvasId: config.canvasId,
        x,
        y,
        color: series.color,
        label: series.label,
        dateText: record.dateText,
        mean: stats.mean,
        pulseCount: stats.count,
        sourceFileName: record.sourceFileName,
        sourceLabel: config.sourceLabel
      });
    });
  });

  drawNoScanningLegend(ctx, config.series, pad.left + chartW, pad.top + 10);
  noScanningRuntime.hitRegions.set(config.canvasId, regions);

  const hover = noScanningRuntime.hover;
  if (hover?.canvasId === config.canvasId) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.5;
    ctx.arc(hover.x, hover.y, 7, 0, Math.PI * 2);
    ctx.stroke();
    const lines = [
      hover.label,
      `Date: ${hover.dateText}`,
      `Mean: ${formatNoScanningValue(hover.mean)} mm`,
      `Pulses: ${hover.pulseCount}`
    ];
    if (hover.sourceLabel) lines.push(`Source: ${hover.sourceLabel}`);
    drawNoScanningTooltip(ctx, lines, hover.x, hover.y, width, height);
    ctx.restore();
  }
}

function drawNoScanningTitle(ctx, title, centerX) {
  ctx.save();
  ctx.fillStyle = "#222";
  ctx.font = "600 15px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(title, centerX, 13);
  ctx.restore();
}

function drawNoScanningEmpty(ctx, width, height) {
  ctx.save();
  ctx.fillStyle = "#777";
  ctx.font = "14px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("当前没有可显示的记录。", width / 2, height / 2);
  ctx.restore();
}

function drawNoScanningAxes(ctx, pad, chartW, chartH, xRange, yScale, records, yLabel) {
  ctx.save();
  ctx.strokeStyle = "#222";
  ctx.fillStyle = "#333";
  ctx.lineWidth = 1;
  ctx.font = "12px Segoe UI";

  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  getNoScanningTicks(yScale.min, yScale.max, yScale.step).forEach((value) => {
    const y = pad.top + chartH - ((value - yScale.min) / (yScale.max - yScale.min)) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left - 6, y);
    ctx.lineTo(pad.left, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatNoScanningTick(value, yScale.step), pad.left - 10, y);
  });

  const dateTicks = getNoScanningDateTicks(records);
  dateTicks.forEach((time, index) => {
    const x = pad.left + ((time - xRange.min) / (xRange.max - xRange.min)) * chartW;
    ctx.beginPath();
    ctx.moveTo(x, pad.top + chartH);
    ctx.lineTo(x, pad.top + chartH + 6);
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      formatNoScanningTickDate(time, dateTicks.length > 18, index === 0),
      x,
      pad.top + chartH + 12
    );
  });

  ctx.font = "13px Segoe UI";
  ctx.save();
  ctx.translate(27, pad.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("Date", pad.left + chartW / 2, pad.top + chartH + 58);
  ctx.textAlign = "right";
  ctx.fillText(String(new Date(xRange.max).getFullYear()), pad.left + chartW, pad.top + chartH + 58);
  ctx.restore();
}

function drawNoScanningLegend(ctx, series, right, y) {
  const rowHeight = 13;
  const height = series.length * rowHeight + 10;
  ctx.save();
  ctx.font = "9px Segoe UI";
  const textWidth = Math.max(...series.map((item) => ctx.measureText(item.label).width));
  const width = Math.ceil(textWidth) + 38;
  const x = right - width - 12;
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  series.forEach((item, index) => {
    const centerY = y + 8 + index * rowHeight;
    drawNoScanningMarker(ctx, item.marker, x + 13, centerY, item.color, 2.4);
    ctx.fillStyle = "#222";
    ctx.fillText(item.label, x + 25, centerY);
  });
  ctx.restore();
}

function drawNoScanningMarker(ctx, marker, x, y, color, radius) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.15;
  if (marker === "circle") {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - radius, y - radius);
    ctx.lineTo(x + radius, y + radius);
    ctx.moveTo(x + radius, y - radius);
    ctx.lineTo(x - radius, y + radius);
    if (marker === "star") {
      ctx.moveTo(x - radius, y);
      ctx.lineTo(x + radius, y);
      ctx.moveTo(x, y - radius);
      ctx.lineTo(x, y + radius);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function bindNoScanningChartHover() {
  document.querySelectorAll("#noScanningCharts canvas").forEach((canvas) => {
    if (canvas.dataset.noScanningHoverBound === "1") return;
    canvas.dataset.noScanningHoverBound = "1";
    canvas.addEventListener("mousemove", handleNoScanningMouseMove);
    canvas.addEventListener("mouseleave", () => {
      if (!noScanningRuntime.hover) return;
      noScanningRuntime.hover = null;
      drawNoScanningCharts();
    });
  });
}

function handleNoScanningMouseMove(event) {
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  const regions = noScanningRuntime.hitRegions.get(canvas.id) || [];
  let nearest = null;
  let distance = Infinity;
  regions.forEach((region) => {
    const current = Math.hypot(mouseX - region.x, mouseY - region.y);
    if (current <= 10 && current < distance) {
      nearest = region;
      distance = current;
    }
  });

  const oldKey = getNoScanningHoverKey(noScanningRuntime.hover);
  const nextKey = getNoScanningHoverKey(nearest);
  if (oldKey === nextKey) return;
  noScanningRuntime.hover = nearest;
  drawNoScanningCharts();
}

function getNoScanningHoverKey(region) {
  return region ? `${region.canvasId}:${region.label}:${region.dateText}:${region.mean}` : "";
}

function drawNoScanningTooltip(ctx, lines, anchorX, anchorY, canvasWidth, canvasHeight) {
  ctx.save();
  ctx.font = "12px Segoe UI";
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width)) + 20;
  const height = lines.length * 18 + 14;
  let x = anchorX + 12;
  let y = anchorY - height - 12;
  if (x + width > canvasWidth - 8) x = anchorX - width - 12;
  if (y < 8) y = anchorY + 12;
  if (y + height > canvasHeight - 8) y = canvasHeight - height - 8;

  ctx.fillStyle = "rgba(20,20,20,0.92)";
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, index) => ctx.fillText(line, x + 10, y + 18 + index * 18));
  ctx.restore();
}

function getNoScanningDateRange(records) {
  const times = records.map((record) => getNoScanningDayMs(record.dateMs));
  let min = Math.min(...times);
  let max = Math.max(...times);
  if (min === max) {
    min -= 18 * 60 * 60 * 1000;
    max += 18 * 60 * 60 * 1000;
  } else {
    const padding = 13 * 60 * 60 * 1000;
    min -= padding;
    max += padding;
  }
  return { min, max };
}

function getNoScanningDateTicks(records) {
  const recordDays = records.map((record) => getNoScanningDayMs(record.dateMs));
  const min = Math.min(...recordDays);
  const max = Math.max(...recordDays);
  const ticks = [];
  const cursor = new Date(min);
  while (cursor.getTime() <= max) {
    ticks.push(cursor.getTime());
    cursor.setDate(cursor.getDate() + 1);
  }
  return ticks;
}

function getNoScanningDayMs(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function getNoScanningScale(values, includeZero) {
  const finite = values.filter(Number.isFinite);
  if (includeZero) finite.push(0);
  if (!finite.length) return { min: -1, max: 1, step: 0.5 };
  let min = Math.min(...finite);
  let max = Math.max(...finite);
  if (min === max) {
    min -= 0.5;
    max += 0.5;
  }
  const padding = (max - min) * 0.07;
  min -= padding;
  max += padding;
  const step = getNoScanningNiceStep((max - min) / 6);
  return {
    min: Math.floor(min / step) * step,
    max: Math.ceil(max / step) * step,
    step
  };
}

function getNoScanningNiceStep(value) {
  const power = Math.pow(10, Math.floor(Math.log10(Math.max(value, Number.EPSILON))));
  const fraction = value / power;
  if (fraction <= 1) return power;
  if (fraction <= 2) return 2 * power;
  if (fraction <= 2.5) return 2.5 * power;
  if (fraction <= 5) return 5 * power;
  return 10 * power;
}

function getNoScanningTicks(min, max, step) {
  const ticks = [];
  for (let value = min; value <= max + step / 10; value += step) {
    ticks.push(Number(value.toFixed(8)));
  }
  return ticks;
}

function formatNoScanningTick(value, step) {
  const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
  return value.toFixed(decimals).replace(/\.0+$/, "");
}

function formatNoScanningTickDate(time, compact, firstTick) {
  const date = new Date(time);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (compact && !firstTick && date.getDate() !== 1) return String(date.getDate());
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function formatNoScanningDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatNoScanningDateRange(records) {
  if (!records.length) return "-";
  const first = new Date(records[0].dateMs);
  const last = new Date(records[records.length - 1].dateMs);
  const format = (date) => {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };
  return `${format(first)} 至 ${format(last)}`;
}

function formatNoScanningValue(value) {
  return Number(value).toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function formatNoScanningElapsed(ms) {
  return `${Math.max(0.1, Math.round(ms / 100) / 10).toFixed(1)} s`;
}

window.NoScanningToolDebug = {
  parseNoScanningTreatmentRecord,
  getNoScanningDateTicks,
  positionSeries: NO_SCANNING_POSITION_SERIES,
  sigmaSeries: NO_SCANNING_SIGMA_SERIES
};
