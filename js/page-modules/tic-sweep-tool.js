const ticSweepState = {
  analysis: null,
  pulseIndex: 1,
  scatterVisible: {
    ticSweepScatterInplane: {},
    ticSweepScatterCrossplane: {}
  }
};

const TIC_SWEEP_CHANNEL_COUNT = 96;
const TIC_SWEEP_UPSTREAM_END = 32;
const TIC_SWEEP_COLORS = {
  upstream: "#1d4ed8",
  downstream: "#d97706",
  grid: "rgba(0,0,0,0.10)",
  axis: "rgba(0,0,0,0.22)",
  text: "#555",
  tick: "#888",
  title: "#777"
};

const TIC_SWEEP_SUMMED_SERIES = [
  { id: "yUs", label: "Y US Strips", color: "#2f73a9", source: "crossplaneTotals", start: 0, end: 32 },
  { id: "yDs", label: "Y DS Strips", color: "#c85a17", source: "crossplaneTotals", start: 32, end: 96 },
  { id: "xUs", label: "X US Strips", color: "#f2ad2e", source: "inplaneTotals", start: 0, end: 32 },
  { id: "xDs", label: "X DS Strips", color: "#5b4a91", source: "inplaneTotals", start: 32, end: 96 }
];

const TIC_SWEEP_SCATTER_SERIES = [
  { id: "usyDsy", label: "USy-DSy (CP Sum)", color: "#0284c7" },
  { id: "usxDsx", label: "USx-DSx (IP Sum)", color: "#dc2626" },
  { id: "usyDoseplane1", label: "USy - Doseplane1", color: "#059669" },
  { id: "usxDoseplane2", label: "USx - Doseplane2", color: "#d97706" }
];

const ticSweepChartRuntime = {
  hitRegions: new Map(),
  hover: null
};

function initTicSweepToolPage() {
  const root = document.getElementById("ticSweepToolRoot");
  if (!root) return;
  if (root.dataset.initialized === "true") return;
  root.dataset.initialized = "true";

  ticSweepState.analysis = null;
  ticSweepState.pulseIndex = 1;
  resetTicSweepScatterVisibility();

  root.innerHTML = `
    <div class="tool-block tic-sweep-tool">
      <div id="ticSweepDropZone" class="file-drop-zone tic-sweep-drop-zone">
        <input id="ticSweepFileInput" class="file-input-hidden" type="file" accept=".csv" />
        <div class="file-drop-title">点击或拖拽 Treatment Record CSV 到此处</div>
        <div class="file-drop-subtitle">支持 TIC Sweep Treatment Record 导出的 .csv 文件</div>
      </div>

      <div id="ticSweepStatus" class="tool-file-list tic-sweep-status empty-text">尚未选择文件。</div>
      <div id="ticSweepSummary" class="tic-sweep-summary"></div>
      <div id="ticSweepControls" class="tic-sweep-controls" hidden></div>
      <div id="ticSweepCharts" class="tic-sweep-charts">
        <div class="empty-text tic-sweep-empty">导入 Treatment Record 后显示 TIC Sweep 图表。</div>
      </div>
    </div>
  `;

  bindTicSweepEvents();
}

function bindTicSweepEvents() {
  const dropZone = document.getElementById("ticSweepDropZone");
  const fileInput = document.getElementById("ticSweepFileInput");
  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) analyzeTicSweepFile(file);
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
    const file = event.dataTransfer.files && event.dataTransfer.files[0];
    if (file) analyzeTicSweepFile(file);
  });
}

async function analyzeTicSweepFile(file) {
  const status = document.getElementById("ticSweepStatus");
  const startTime = performance.now();
  setTicSweepStatus(`正在分析 ${file.name} ...`, "running");

  try {
    const text = await file.text();
    const analysis = parseTicSweepTreatmentRecord(text, file.name);
    ticSweepState.analysis = analysis;
    ticSweepState.pulseIndex = 1;
    ticSweepChartRuntime.hover = null;
    ticSweepChartRuntime.hitRegions.clear();
    renderTicSweepResults();
    const elapsed = performance.now() - startTime;
    setTicSweepStatus(
      `分析完成：${file.name}，共 ${analysis.totalPulses} 个脉冲，耗时 ${formatTicSweepElapsed(elapsed)}。`,
      "done"
    );
  } catch (error) {
    console.error(error);
    ticSweepState.analysis = null;
    if (status) status.textContent = "";
    setTicSweepStatus(`分析失败：${error.message}`, "error");
    alert(`分析失败：${error.message}`);
  }
}

function setTicSweepStatus(message, type = "idle") {
  const status = document.getElementById("ticSweepStatus");
  if (!status) return;
  status.className = `tool-file-list tic-sweep-status ${type}`;
  status.textContent = message;
}

function parseTicSweepTreatmentRecord(text, sourceFileName) {
  const rows = parseTicSweepCsv(text);
  const headerRowIndex = rows.findIndex((row) => row.includes("Crossplane TIC 1") && row.includes("Inplane TIC 1"));
  if (headerRowIndex < 0) {
    throw new Error("未找到 TIC 数据表头（Crossplane TIC 1 / Inplane TIC 1）。");
  }

  const meta = parseTicSweepMeta(rows.slice(0, headerRowIndex));
  const headers = rows[headerRowIndex].map((item) => String(item || "").trim());
  const columnMap = buildTicSweepColumnMap(headers);
  const dataRows = rows.slice(headerRowIndex + 1).filter((row) => row.some((cell) => String(cell || "").trim() !== ""));

  const crossStart = findTicSweepColumn(headers, "Crossplane TIC 1");
  const inplaneStart = findTicSweepColumn(headers, "Inplane TIC 1");
  if (crossStart < 0 || inplaneStart < 0) {
    throw new Error("TIC 通道列不完整。");
  }

  const pulses = dataRows.map((row, index) => {
    const crossplaneTic = readTicSweepChannels(row, crossStart);
    const inplaneTic = readTicSweepChannels(row, inplaneStart);
    return {
      rowIndex: index + 1,
      timestamp: getTicSweepNumber(row[columnMap.timestamp]),
      spotIndex: getTicSweepNumber(row[columnMap.spotIndex]),
      inplanePosition: getTicSweepNumber(row[columnMap.inplanePosition]),
      crossplanePosition: getTicSweepNumber(row[columnMap.crossplanePosition]),
      metrics: {
        usxDsx: getTicSweepNumber(row[columnMap.usxDsx]),
        usyDsy: getTicSweepNumber(row[columnMap.usyDsy]),
        usyDoseplane1: getTicSweepNumber(row[columnMap.usyDoseplane1]),
        usxDoseplane2: getTicSweepNumber(row[columnMap.usxDoseplane2])
      },
      crossplaneTic,
      inplaneTic
    };
  });

  if (!pulses.length) {
    throw new Error("没有读取到脉冲数据。");
  }

  return {
    sourceFileName,
    meta,
    headers,
    pulses,
    totalPulses: pulses.length,
    crossplaneTotals: sumTicSweepChannels(pulses, "crossplaneTic"),
    inplaneTotals: sumTicSweepChannels(pulses, "inplaneTic")
  };
}

function parseTicSweepMeta(rows) {
  const meta = {};
  rows.forEach((row) => {
    if (!row.length) return;
    const key = String(row[0] || "").trim();
    if (!key) return;
    meta[key] = String(row.slice(1).join(",") || "").trim();
  });
  return meta;
}

function buildTicSweepColumnMap(headers) {
  return {
    timestamp: findTicSweepColumn(headers, "Timestamp (ms)"),
    spotIndex: findTicSweepColumn(headers, "Spot Index"),
    inplanePosition: findTicSweepColumn(headers, "Inplane Position (mm)"),
    crossplanePosition: findTicSweepColumn(headers, "Crossplane Position (mm)"),
    usxDsx: findTicSweepColumn(headers, "USx-DSx (Inplane Sum)"),
    usyDsy: findTicSweepColumn(headers, "USy - DSy (Crossplane Sum)"),
    usyDoseplane1: findTicSweepColumn(headers, "USy - Doseplane1"),
    usxDoseplane2: findTicSweepColumn(headers, "USx - Doseplane2")
  };
}

function findTicSweepColumn(headers, name) {
  const target = normalizeTicSweepHeader(name);
  return headers.findIndex((header) => normalizeTicSweepHeader(header) === target);
}

function normalizeTicSweepHeader(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function readTicSweepChannels(row, startIndex) {
  const values = [];
  for (let i = 0; i < TIC_SWEEP_CHANNEL_COUNT; i += 1) {
    values.push(getTicSweepNumber(row[startIndex + i], 0));
  }
  return values;
}

function sumTicSweepChannels(pulses, key) {
  const sums = Array(TIC_SWEEP_CHANNEL_COUNT).fill(0);
  pulses.forEach((pulse) => {
    const values = pulse[key] || [];
    for (let i = 0; i < TIC_SWEEP_CHANNEL_COUNT; i += 1) {
      const value = Number(values[i]);
      if (Number.isFinite(value)) sums[i] += value;
    }
  });
  return sums;
}

function parseTicSweepCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  for (; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function renderTicSweepResults() {
  const analysis = ticSweepState.analysis;
  const summary = document.getElementById("ticSweepSummary");
  const controls = document.getElementById("ticSweepControls");
  const charts = document.getElementById("ticSweepCharts");
  if (!analysis || !summary || !controls || !charts) return;

  const meta = analysis.meta || {};
  summary.innerHTML = `
    <div class="summary-card"><strong>总脉冲数：</strong>${analysis.totalPulses}</div>
    <div class="summary-card"><strong>Beam：</strong>${escapeTicSweepHtml(meta["Beam Number"] || "-")}</div>
    <div class="summary-card"><strong>Fraction：</strong>${escapeTicSweepHtml(meta["Beam Fraction"] || "-")}</div>
    <div class="summary-card"><strong>Start：</strong>${escapeTicSweepHtml(meta["Treatment Start Local Time"] || "-")}</div>
  `;

  controls.hidden = false;
  controls.innerHTML = `
    <span class="summary-card"><strong>Pulse #</strong></span>
    <input id="ticSweepPulseInput" class="tic-sweep-pulse-input" type="number" min="1" max="${analysis.totalPulses}" value="${ticSweepState.pulseIndex}" />
    <span>/ ${analysis.totalPulses}</span>
    <input id="ticSweepPulseRange" class="tic-sweep-range" type="range" min="1" max="${analysis.totalPulses}" value="${ticSweepState.pulseIndex}" />
    <button id="ticSweepRawBtn" class="tool-btn" type="button">查看 Raw 参数</button>
  `;

  charts.innerHTML = `
    <div class="tic-sweep-chart-row">
      ${buildTicSweepCanvasCard("ticSweepSingleCross", "CP(Y) TIC - Pulse #" + ticSweepState.pulseIndex)}
      ${buildTicSweepCanvasCard("ticSweepSingleInplane", "IP(X) TIC - Pulse #" + ticSweepState.pulseIndex)}
    </div>
    ${buildTicSweepSummedCanvasCard(`TIC Sweep - 累计计数 (${analysis.totalPulses} pulses)`)}
    <div class="tic-sweep-chart-row">
      ${buildTicSweepScatterCanvasCard("ticSweepScatterInplane", "dCompare vs. IP(X) Position")}
      ${buildTicSweepScatterCanvasCard("ticSweepScatterCrossplane", "dCompare vs. CP(Y) Position")}
    </div>
  `;

  bindTicSweepControls();
  bindTicSweepChartHover();
  drawTicSweepCharts();
}

function buildTicSweepCanvasCard(id, title, wide = false) {
  const width = wide ? 1140 : 560;
  const height = wide ? 350 : 330;
  return `
    <div class="card tic-sweep-chart-card ${wide ? "wide" : ""}">
      <div class="tic-sweep-chart-title">${escapeTicSweepHtml(title)}</div>
      <canvas id="${id}" width="${width}" height="${height}"></canvas>
    </div>
  `;
}

function buildTicSweepSummedCanvasCard(title) {
  return `
    <div class="card tic-sweep-chart-card tic-sweep-summed-card">
      <div class="tic-sweep-chart-title">${escapeTicSweepHtml(title)}</div>
      <canvas id="ticSweepSummedTotal" width="1100" height="540"></canvas>
    </div>
  `;
}

function buildTicSweepScatterCanvasCard(id, title) {
  return `
    <div class="card tic-sweep-chart-card tic-sweep-scatter-card">
      <div class="tic-sweep-chart-title">${escapeTicSweepHtml(title)}</div>
      ${buildTicSweepScatterLegend(id)}
      <canvas id="${id}" width="700" height="360"></canvas>
    </div>
  `;
}

function buildTicSweepScatterLegend(canvasId) {
  const visible = getTicSweepScatterVisibility(canvasId);
  const items = TIC_SWEEP_SCATTER_SERIES.map((series) => `
    <label class="tic-sweep-legend-item">
      <input type="checkbox" data-tic-sweep-canvas="${canvasId}" data-tic-sweep-series="${series.id}" ${visible[series.id] ? "checked" : ""} />
      <span class="tic-sweep-legend-dot" style="background:${series.color}"></span>
      <span>${escapeTicSweepHtml(series.label)}</span>
    </label>
  `).join("");

  return `<div class="tic-sweep-legend" data-tic-sweep-legend="${canvasId}">${items}</div>`;
}

function bindTicSweepControls() {
  const input = document.getElementById("ticSweepPulseInput");
  const range = document.getElementById("ticSweepPulseRange");
  const rawBtn = document.getElementById("ticSweepRawBtn");
  const charts = document.getElementById("ticSweepCharts");

  function setPulse(value) {
    const analysis = ticSweepState.analysis;
    if (!analysis) return;
    const next = Math.max(1, Math.min(analysis.totalPulses, Math.round(Number(value) || 1)));
    ticSweepState.pulseIndex = next;
    if (input) input.value = String(next);
    if (range) range.value = String(next);
    drawTicSweepCharts();
    updateTicSweepSingleTitles();
  }

  if (input) input.addEventListener("change", () => setPulse(input.value));
  if (range) range.addEventListener("input", () => setPulse(range.value));
  if (rawBtn) rawBtn.addEventListener("click", openTicSweepRawModal);
  if (charts && charts.dataset.ticSweepLegendBound !== "1") {
    charts.dataset.ticSweepLegendBound = "1";
    charts.addEventListener("change", (event) => {
      const checkbox = event.target.closest("input[data-tic-sweep-canvas][data-tic-sweep-series]");
      if (!checkbox) return;
      const visible = getTicSweepScatterVisibility(checkbox.dataset.ticSweepCanvas);
      visible[checkbox.dataset.ticSweepSeries] = checkbox.checked;
      ticSweepChartRuntime.hover = null;
      drawTicSweepCharts();
    });
  }
}

function updateTicSweepSingleTitles() {
  const crossTitle = document.querySelector("#ticSweepSingleCross")?.previousElementSibling;
  const inplaneTitle = document.querySelector("#ticSweepSingleInplane")?.previousElementSibling;
  if (crossTitle) crossTitle.textContent = `CP(Y) TIC - Pulse #${ticSweepState.pulseIndex}`;
  if (inplaneTitle) inplaneTitle.textContent = `IP(X) TIC - Pulse #${ticSweepState.pulseIndex}`;
}

function drawTicSweepCharts() {
  const analysis = ticSweepState.analysis;
  if (!analysis) return;
  const pulse = analysis.pulses[ticSweepState.pulseIndex - 1] || analysis.pulses[0];
  drawTicSweepBarChart("ticSweepSingleCross", `CP(Y) TIC - Pulse #${ticSweepState.pulseIndex}`, pulse.crossplaneTic, "Channel (1-96)", "TIC Count");
  drawTicSweepBarChart("ticSweepSingleInplane", `IP(X) TIC - Pulse #${ticSweepState.pulseIndex}`, pulse.inplaneTic, "Channel (1-96)", "TIC Count");
  drawTicSweepSummedChart(analysis);
  drawTicSweepScatterChart("ticSweepScatterInplane", "dCompare vs. IP(X) Position", analysis.pulses, "inplanePosition", "IP(X) Position (mm)");
  drawTicSweepScatterChart("ticSweepScatterCrossplane", "dCompare vs. CP(Y) Position", analysis.pulses, "crossplanePosition", "CP(Y) Position (mm)");
}

function drawTicSweepBarChart(canvasId, title, values, xLabel, yLabel) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const isWide = canvas.parentElement?.classList.contains("wide");
  const pad = { left: 96, right: 30, top: 54, bottom: 62 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxY = niceTicSweepMax(Math.max(...values, 1));
  const regions = [];

  clearTicSweepCanvas(ctx, width, height);
  drawTicSweepCanvasTitle(ctx, title, width);
  drawTicSweepGrid(ctx, pad, chartW, chartH, maxY, yLabel, xLabel);

  const barW = chartW / TIC_SWEEP_CHANNEL_COUNT;
  values.forEach((value, index) => {
    const x = pad.left + index * barW;
    const barH = (Number(value) / maxY) * chartH;
    const y = pad.top + chartH - barH;
    const barWidth = Math.max(1, barW - 2);
    ctx.fillStyle = index < TIC_SWEEP_UPSTREAM_END ? TIC_SWEEP_COLORS.upstream : TIC_SWEEP_COLORS.downstream;
    ctx.fillRect(x + 1, y, barWidth, barH);
    ctx.strokeStyle = "rgba(0,0,0,0.26)";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + 1, y, barWidth, barH);
    regions.push({
      type: "bar",
      canvasId,
      x: x + 1,
      y,
      width: barWidth,
      height: Math.max(barH, 4),
      channel: index + 1,
      value: Number(value) || 0,
      yLabel
    });
  });

  ticSweepChartRuntime.hitRegions.set(canvasId, regions);

  ctx.fillStyle = TIC_SWEEP_COLORS.tick;
  ctx.font = isWide ? "11px Segoe UI" : "10px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (let i = 1; i <= TIC_SWEEP_CHANNEL_COUNT; i += 4) {
    const x = pad.left + (i - 0.5) * barW;
    ctx.fillText(String(i), x, height - 33);
  }

  const hover = ticSweepChartRuntime.hover;
  if (hover && hover.canvasId === canvasId) {
    ctx.save();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.strokeRect(hover.x - 1, hover.y - 1, hover.width + 2, hover.height + 2);
    drawTicSweepTooltip(ctx, [
      `Channel: ${hover.channel}`,
      `${hover.yLabel}: ${formatTicSweepAxis(hover.value)}`
    ], hover.x + hover.width / 2, hover.y, width, height);
    ctx.restore();
  }
}

function drawTicSweepSummedChart(analysis) {
  const canvasId = "ticSweepSummedTotal";
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const title = `TIC Sweep - 累计计数 (${analysis.totalPulses} pulses)`;
  const pad = { left: 112, right: 34, top: 62, bottom: 76 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const groupGapUnits = 1.5;
  const totalStripCount = TIC_SWEEP_SUMMED_SERIES.reduce((sum, series) => sum + series.end - series.start, 0);
  const totalUnits = totalStripCount + groupGapUnits * (TIC_SWEEP_SUMMED_SERIES.length - 1);
  const unitWidth = chartW / totalUnits;
  const barWidth = Math.max(1, unitWidth - 0.7);
  const regions = [];

  const groups = TIC_SWEEP_SUMMED_SERIES.map((series) => ({
    ...series,
    values: analysis[series.source].slice(series.start, series.end)
  }));
  const allValues = groups.reduce((values, group) => values.concat(group.values), []);
  const scale = getTicSweepSummedScale(Math.max(...allValues, 1));

  clearTicSweepCanvas(ctx, width, height);
  drawTicSweepCanvasTitle(ctx, title, width);
  ctx.fillStyle = "#fff";
  ctx.fillRect(pad.left, pad.top, chartW, chartH);

  ctx.save();
  ctx.font = "12px Segoe UI";
  ctx.fillStyle = "#333";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let value = 0; value <= scale.max + scale.step / 10; value += scale.step) {
    const y = pad.top + chartH - (value / scale.max) * chartH;
    ctx.fillText(formatTicSweepAxis(value), pad.left - 12, y);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left - 6, y);
    ctx.lineTo(pad.left, y);
    ctx.stroke();
  }

  let unitOffset = 0;
  groups.forEach((group, groupIndex) => {
    group.values.forEach((rawValue, stripIndex) => {
      const value = Number(rawValue) || 0;
      const x = pad.left + (unitOffset + stripIndex) * unitWidth;
      const barH = (value / scale.max) * chartH;
      const y = pad.top + chartH - barH;

      ctx.fillStyle = group.color;
      ctx.fillRect(x + 0.35, y, barWidth, barH);
      ctx.strokeStyle = "#202020";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(x + 0.35, y, barWidth, barH);

      regions.push({
        type: "summed-bar",
        canvasId,
        x: x + 0.35,
        y,
        width: barWidth,
        height: Math.max(barH, 4),
        series: group.label,
        strip: stripIndex + 1,
        value
      });

      if (stripIndex % 4 === 0) {
        ctx.fillStyle = "#555";
        ctx.font = "11px Segoe UI";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(String(stripIndex + 1), x + unitWidth / 2, pad.top + chartH + 10);
      }
    });

    unitOffset += group.values.length;
    if (groupIndex < groups.length - 1) unitOffset += groupGapUnits;
  });

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  ctx.fillStyle = "#333";
  ctx.font = "14px Segoe UI";
  ctx.save();
  ctx.translate(25, pad.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Summed Counts", 0, 0);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("Strip Number", pad.left + chartW / 2, height - 16);
  ctx.restore();

  drawTicSweepSummedLegend(ctx, groups, pad.left + chartW - 154, pad.top + 12);
  ticSweepChartRuntime.hitRegions.set(canvasId, regions);

  const hover = ticSweepChartRuntime.hover;
  if (hover && hover.canvasId === canvasId) {
    ctx.save();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.strokeRect(hover.x - 1, hover.y - 1, hover.width + 2, hover.height + 2);
    drawTicSweepTooltip(ctx, [
      hover.series,
      `Strip: ${hover.strip}`,
      `Summed Counts: ${formatTicSweepAxis(hover.value)}`
    ], hover.x + hover.width / 2, hover.y, width, height);
    ctx.restore();
  }
}

function drawTicSweepSummedLegend(ctx, groups, x, y) {
  const boxWidth = 146;
  const rowHeight = 19;
  const boxHeight = groups.length * rowHeight + 12;

  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.strokeStyle = "#333";
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, boxWidth, boxHeight);
  ctx.strokeRect(x, y, boxWidth, boxHeight);
  ctx.font = "11px Segoe UI";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  groups.forEach((group, index) => {
    const rowY = y + 7 + index * rowHeight;
    ctx.fillStyle = group.color;
    ctx.fillRect(x + 8, rowY, 48, 12);
    ctx.strokeStyle = "#222";
    ctx.strokeRect(x + 8, rowY, 48, 12);
    ctx.fillStyle = "#222";
    ctx.fillText(group.label, x + 63, rowY + 6);
  });
  ctx.restore();
}

function getTicSweepSummedScale(maxValue) {
  const roughStep = maxValue / 9;
  const power = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const fraction = roughStep / power;
  let niceFraction = 10;
  if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 2.5) niceFraction = 2.5;
  else if (fraction <= 5) niceFraction = 5;
  const step = niceFraction * power;
  return { step, max: Math.ceil(maxValue / step) * step };
}

function drawTicSweepScatterChart(canvasId, title, pulses, xKey, xLabel) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = { left: 92, right: 28, top: 54, bottom: 62 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const visible = getTicSweepScatterVisibility(canvasId);
  const series = TIC_SWEEP_SCATTER_SERIES.filter((item) => visible[item.id]);
  const xValues = pulses.map((pulse) => pulse[xKey]).filter(Number.isFinite);
  const yValues = [];
  pulses.forEach((pulse) => series.forEach((item) => {
    if (Number.isFinite(pulse.metrics[item.id])) yValues.push(pulse.metrics[item.id]);
  }));
  const xRange = getTicSweepSteppedRange(xValues, [-120, 120], 50, 0);
  const yRange = getTicSweepSteppedRange(yValues, [-3, 3], 0.5, 0);
  const regions = [];

  clearTicSweepCanvas(ctx, width, height);
  drawTicSweepCanvasTitle(ctx, title, width);
  drawTicSweepScatterGrid(ctx, pad, chartW, chartH, xRange, yRange, xLabel, "dCompare (pC)");

  series.forEach((item) => {
    ctx.fillStyle = item.color;
    pulses.forEach((pulse) => {
      const xValue = pulse[xKey];
      const yValue = pulse.metrics[item.id];
      if (!Number.isFinite(xValue) || !Number.isFinite(yValue)) return;
      const x = pad.left + ((xValue - xRange.min) / (xRange.max - xRange.min)) * chartW;
      const y = pad.top + chartH - ((yValue - yRange.min) / (yRange.max - yRange.min)) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      regions.push({
        type: "point",
        canvasId,
        x,
        y,
        pulse: pulse.rowIndex,
        series: item.label,
        color: item.color,
        xLabel,
        xValue,
        yValue
      });
    });
  });

  ticSweepChartRuntime.hitRegions.set(canvasId, regions);

  const hover = ticSweepChartRuntime.hover;
  if (hover && hover.canvasId === canvasId) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;
    ctx.arc(hover.x, hover.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    ctx.arc(hover.x, hover.y, 3, 0, Math.PI * 2);
    ctx.fill();
    drawTicSweepTooltip(ctx, [
      `Pulse: ${hover.pulse}`,
      hover.series,
      `${hover.xLabel}: ${formatTicSweepAxis(hover.xValue)}`,
      `dCompare: ${formatTicSweepAxis(hover.yValue)}`
    ], hover.x, hover.y, width, height);
    ctx.restore();
  }
}

function bindTicSweepChartHover() {
  document.querySelectorAll("#ticSweepCharts canvas").forEach((canvas) => {
    if (canvas.dataset.ticSweepHoverBound === "1") return;
    canvas.dataset.ticSweepHoverBound = "1";
    canvas.addEventListener("mousemove", handleTicSweepChartMouseMove);
    canvas.addEventListener("mouseleave", handleTicSweepChartMouseLeave);
  });
}

function handleTicSweepChartMouseMove(event) {
  const canvas = event.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const mouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
  const mouseY = (event.clientY - rect.top) * (canvas.height / rect.height);
  const regions = ticSweepChartRuntime.hitRegions.get(canvas.id) || [];
  let nearest = null;
  let bestDistance = Infinity;

  regions.forEach((region) => {
    if (region.type === "bar" || region.type === "summed-bar") {
      if (mouseX >= region.x && mouseX <= region.x + region.width && mouseY >= region.y && mouseY <= region.y + region.height) {
        nearest = region;
        bestDistance = 0;
      }
      return;
    }

    const dx = mouseX - region.x;
    const dy = mouseY - region.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= 8 && distance < bestDistance) {
      nearest = region;
      bestDistance = distance;
    }
  });

  const oldKey = ticSweepChartRuntime.hover ? getTicSweepHoverKey(ticSweepChartRuntime.hover) : "";
  const nextKey = nearest ? getTicSweepHoverKey(nearest) : "";
  if (oldKey === nextKey) return;
  ticSweepChartRuntime.hover = nearest;
  drawTicSweepCharts();
}

function handleTicSweepChartMouseLeave() {
  if (!ticSweepChartRuntime.hover) return;
  ticSweepChartRuntime.hover = null;
  drawTicSweepCharts();
}

function getTicSweepHoverKey(region) {
  if (!region) return "";
  if (region.type === "bar") return `${region.canvasId}:bar:${region.channel}`;
  if (region.type === "summed-bar") return `${region.canvasId}:summed-bar:${region.series}:${region.strip}`;
  return `${region.canvasId}:point:${region.series}:${region.pulse}:${region.xValue}:${region.yValue}`;
}

function resetTicSweepScatterVisibility() {
  ticSweepState.scatterVisible.ticSweepScatterInplane = {
    usyDsy: false,
    usxDsx: true,
    usyDoseplane1: false,
    usxDoseplane2: true
  };
  ticSweepState.scatterVisible.ticSweepScatterCrossplane = {
    usyDsy: true,
    usxDsx: false,
    usyDoseplane1: true,
    usxDoseplane2: false
  };
}

function getTicSweepScatterVisibility(canvasId) {
  if (!ticSweepState.scatterVisible[canvasId]) {
    ticSweepState.scatterVisible[canvasId] = {};
  }
  TIC_SWEEP_SCATTER_SERIES.forEach((series) => {
    if (typeof ticSweepState.scatterVisible[canvasId][series.id] !== "boolean") {
      ticSweepState.scatterVisible[canvasId][series.id] = true;
    }
  });
  return ticSweepState.scatterVisible[canvasId];
}

function clearTicSweepCanvas(ctx, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f4f4f4";
  ctx.fillRect(0, 0, width, height);
}

function drawTicSweepCanvasTitle(ctx, title, width) {
  ctx.save();
  ctx.fillStyle = TIC_SWEEP_COLORS.title;
  ctx.font = "700 15px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(title, width / 2, 16);
  ctx.restore();
}

function drawTicSweepGrid(ctx, pad, chartW, chartH, maxY, yLabel, xLabel) {
  ctx.save();
  ctx.font = "12px Segoe UI";
  ctx.fillStyle = TIC_SWEEP_COLORS.tick;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= 5; i += 1) {
    const y = pad.top + chartH - (i / 5) * chartH;
    const value = (maxY * i) / 5;
    ctx.strokeStyle = TIC_SWEEP_COLORS.grid;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText(formatTicSweepAxis(value), pad.left - 10, y);
  }

  ctx.strokeStyle = TIC_SWEEP_COLORS.axis;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  ctx.fillStyle = TIC_SWEEP_COLORS.text;
  ctx.font = "13px Segoe UI";
  ctx.save();
  ctx.translate(18, pad.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(xLabel, pad.left + chartW / 2, pad.top + chartH + 44);
  ctx.restore();
}

function drawTicSweepScatterGrid(ctx, pad, chartW, chartH, xRange, yRange, xLabel, yLabel) {
  ctx.save();
  ctx.font = "12px Segoe UI";
  ctx.fillStyle = TIC_SWEEP_COLORS.tick;

  const xTicks = getTicSweepTicks(xRange.min, xRange.max, 50);
  const yTicks = getTicSweepTicks(yRange.min, yRange.max, 0.5);

  xTicks.forEach((xValue) => {
    const x = pad.left + ((xValue - xRange.min) / (xRange.max - xRange.min)) * chartW;
    ctx.strokeStyle = TIC_SWEEP_COLORS.grid;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(formatTicSweepAxis(xValue), x, pad.top + chartH + 22);
  });

  yTicks.forEach((yValue) => {
    const y = pad.top + chartH - ((yValue - yRange.min) / (yRange.max - yRange.min)) * chartH;
    ctx.strokeStyle = TIC_SWEEP_COLORS.grid;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(formatTicSweepAxis(yValue), pad.left - 10, y);
  });

  drawTicSweepReferenceLine(ctx, {
    orientation: "horizontal",
    value: 0,
    min: yRange.min,
    max: yRange.max,
    pad,
    chartW,
    chartH,
    label: "0 pC"
  });

  drawTicSweepReferenceLine(ctx, {
    orientation: "vertical",
    value: 0,
    min: xRange.min,
    max: xRange.max,
    pad,
    chartW,
    chartH,
    label: "0 mm"
  });

  ctx.strokeStyle = TIC_SWEEP_COLORS.axis;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + chartH);
  ctx.lineTo(pad.left + chartW, pad.top + chartH);
  ctx.stroke();

  ctx.fillStyle = TIC_SWEEP_COLORS.text;
  ctx.font = "13px Segoe UI";
  ctx.save();
  ctx.translate(18, pad.top + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText(yLabel, 0, 0);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(xLabel, pad.left + chartW / 2, pad.top + chartH + 44);
  ctx.restore();
}

function drawTicSweepReferenceLine(ctx, config) {
  const { orientation, value, min, max, pad, chartW, chartH, label } = config;
  if (value < min || value > max || max === min) return;

  ctx.save();
  ctx.strokeStyle = "rgba(220, 38, 38, 0.72)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 6]);

  if (orientation === "horizontal") {
    const y = pad.top + chartH - ((value - min) / (max - min)) * chartH;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + chartW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(180, 30, 30, 0.9)";
    ctx.font = "12px Segoe UI";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(label, pad.left + 8, y - 5);
  } else {
    const x = pad.left + ((value - min) / (max - min)) * chartW;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + chartH);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(180, 30, 30, 0.9)";
    ctx.font = "12px Segoe UI";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(label, x + 6, pad.top + 6);
  }

  ctx.restore();
}

function drawTicSweepTooltip(ctx, lines, anchorX, anchorY, canvasWidth, canvasHeight) {
  ctx.save();
  ctx.font = "12px Segoe UI";
  const maxWidth = Math.max(...lines.map((line) => ctx.measureText(line).width));
  const boxWidth = maxWidth + 20;
  const boxHeight = lines.length * 18 + 16;
  let boxX = anchorX + 12;
  let boxY = anchorY - boxHeight - 12;

  if (boxX + boxWidth > canvasWidth - 8) boxX = anchorX - boxWidth - 12;
  if (boxY < 8) boxY = anchorY + 12;
  if (boxY + boxHeight > canvasHeight - 8) boxY = canvasHeight - boxHeight - 8;

  ctx.fillStyle = "rgba(20, 20, 20, 0.92)";
  drawTicSweepRoundRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, index) => {
    ctx.fillText(line, boxX + 10, boxY + 18 + index * 18);
  });
  ctx.restore();
}

function drawTicSweepRoundRect(ctx, x, y, width, height, radius) {
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

function openTicSweepRawModal() {
  const analysis = ticSweepState.analysis;
  if (!analysis) return;

  let modal = document.getElementById("ticSweepRawModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ticSweepRawModal";
    modal.className = "tic-sweep-modal";
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.closest("[data-tic-sweep-modal-close]")) {
        closeTicSweepRawModal();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeTicSweepRawModal();
    });
  }

  modal.innerHTML = buildTicSweepRawModalHtml(analysis);
  modal.hidden = false;
}

function closeTicSweepRawModal() {
  const modal = document.getElementById("ticSweepRawModal");
  if (modal) modal.hidden = true;
}

function buildTicSweepRawModalHtml(analysis) {
  const meta = analysis.meta || {};
  const summaryRows = [
    ["Source File", analysis.sourceFileName],
    ["Beam Number", meta["Beam Number"] || "-"],
    ["Beam Fraction", meta["Beam Fraction"] || "-"],
    ["Treatment Start Local Time", meta["Treatment Start Local Time"] || "-"],
    ["Total Pulses", analysis.totalPulses]
  ];
  const tableColumns = [
    "Timestamp (ms)",
    "Spot Index",
    "IP(X) Position (mm)",
    "CP(Y) Position (mm)",
    "USy-DSy (CP Sum)",
    "USx-DSx (IP Sum)",
    "USy - Doseplane1",
    "USx - Doseplane2"
  ];
  for (let i = 1; i <= TIC_SWEEP_CHANNEL_COUNT; i += 1) tableColumns.push(`CP(Y) TIC ${i}`);
  for (let i = 1; i <= TIC_SWEEP_CHANNEL_COUNT; i += 1) tableColumns.push(`IP(X) TIC ${i}`);

  return `
    <div class="tic-sweep-modal-panel" role="dialog" aria-modal="true" aria-label="TIC Sweep Raw 参数">
      <div class="tic-sweep-modal-head">
        <h3>Raw 参数</h3>
        <button class="tool-btn tic-sweep-modal-close" type="button" data-tic-sweep-modal-close>关闭</button>
      </div>
      <div class="tic-sweep-raw-summary">
        ${summaryRows.map(([key, value]) => `
          <span><strong>${escapeTicSweepHtml(key)}:</strong> ${escapeTicSweepHtml(formatTicSweepRawValue(value))}</span>
        `).join("")}
      </div>
      <div class="tic-sweep-raw-table-wrap" role="region" aria-label="TIC Sweep raw data table">
        <table class="tic-sweep-raw-table">
          <thead>
            <tr>
              <th class="tic-sweep-sticky-corner">Pulse #</th>
              ${tableColumns.map((column) => `<th>${escapeTicSweepHtml(column)}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${analysis.pulses.map((pulse) => {
              const values = [
                pulse.timestamp,
                pulse.spotIndex,
                pulse.inplanePosition,
                pulse.crossplanePosition,
                pulse.metrics.usyDsy,
                pulse.metrics.usxDsx,
                pulse.metrics.usyDoseplane1,
                pulse.metrics.usxDoseplane2,
                ...pulse.crossplaneTic,
                ...pulse.inplaneTic
              ];
              return `
                <tr>
                  <th>${pulse.rowIndex}</th>
                  ${values.map((value) => `<td>${escapeTicSweepHtml(formatTicSweepRawValue(value))}</td>`).join("")}
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function formatTicSweepRawValue(value) {
  if (Number.isFinite(value)) {
    if (Number.isInteger(value)) return String(value);
    return String(Number(value.toFixed(6)));
  }
  return value == null || value === "" ? "-" : String(value);
}

function getTicSweepNumber(value, fallback = NaN) {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : fallback;
}

function getTicSweepRange(values, fallback) {
  if (!values.length) {
    return { min: fallback[0], max: fallback[1] };
  }
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const padding = (max - min) * 0.08;
  return { min: min - padding, max: max + padding };
}

function getTicSweepSteppedRange(values, fallback, step, includeValue = null) {
  const base = getTicSweepRange(values, fallback);
  let min = Math.floor(base.min / step) * step;
  let max = Math.ceil(base.max / step) * step;
  if (includeValue !== null) {
    min = Math.min(min, includeValue);
    max = Math.max(max, includeValue);
  }
  if (min === max) {
    min -= step;
    max += step;
  }
  return { min, max };
}

function getTicSweepTicks(min, max, step) {
  const ticks = [];
  const start = Math.ceil(min / step) * step;
  const end = Math.floor(max / step) * step;
  const decimals = step < 1 ? 1 : 0;
  for (let value = start; value <= end + step / 10; value += step) {
    ticks.push(Number(value.toFixed(decimals)));
  }
  return ticks;
}

function niceTicSweepMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const power = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / power) * power;
}

function formatTicSweepAxis(value) {
  if (Math.abs(value) >= 1000) return Math.round(value).toLocaleString();
  if (Math.abs(value) >= 10) return value.toFixed(0);
  return value.toFixed(1).replace(/\.0$/, "");
}

function formatTicSweepElapsed(ms) {
  if (ms < 1000) return `${Math.max(0.1, Math.round(ms / 100) / 10).toFixed(1)} s`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function escapeTicSweepHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.TicSweepToolDebug = {
  parseTicSweepTreatmentRecord
};

