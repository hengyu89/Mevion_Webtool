const ticMonitorState = {
  points: [],
  visible: {
    "US TIC": true,
    "DS TIC X": true,
    "DS TIC Y": true
  }
};

const ticMonitorChartRuntime = {
  charts: new Map(),
  hoverPoints: new Map()
};

const TIC_SERIES = ["US TIC", "DS TIC X", "DS TIC Y"];
const TIC_COLORS = {
  "US TIC": "#0070c0",
  "DS TIC X": "#008f54",
  "DS TIC Y": "#c46a00"
};

function initTicMonitorToolPage() {
  const root = document.getElementById("ticMonitorToolRoot");
  if (!root) return;

  ticMonitorState.points = [];
  ticMonitorState.visible = {
    "US TIC": true,
    "DS TIC X": true,
    "DS TIC Y": true
  };

  root.innerHTML = `
    <div class="tool-block tic-monitor-tool">
      <div id="ticDropZone" class="file-drop-zone tic-drop-zone">
        <input id="ticFileInput" class="file-input-hidden" type="file" accept=".csv" multiple />
        <div class="file-drop-title">点击或拖拽文件到此处</div>
        <div class="file-drop-subtitle">支持格式: .csv，可一次选择多个 TCLogger 文件</div>
      </div>

      <div id="ticFileStatus" class="tool-file-list empty-text">尚未选择文件。</div>
      <div id="ticSummary" class="tool-summary"></div>
      <div id="ticChartsRoot" class="tic-charts-root"></div>
    </div>
  `;

  bindTicMonitorEvents();
}

function bindTicMonitorEvents() {
  const dropZone = document.getElementById("ticDropZone");
  const fileInput = document.getElementById("ticFileInput");
  if (!dropZone || !fileInput) return;

  let selectedFiles = [];

  function setStatus(message, type = "idle") {
    const status = document.getElementById("ticFileStatus");
    if (!status) return;
    status.className = `tool-file-list tic-file-status ${type}`;
    status.textContent = message;
  }

  async function analyzeSelectedFiles() {
    if (!selectedFiles.length) {
      setStatus("尚未选择文件。", "idle");
      return;
    }

    const startTime = performance.now();
    setStatus(`已选择 ${selectedFiles.length} 份文件，正在分析... (0/${selectedFiles.length})`, "running");

    try {
      const points = await parseTicMonitorFiles(selectedFiles, (done, total, currentFileName) => {
        setStatus(
          `已选择 ${total} 份文件，正在分析... (${done}/${total})。当前文件: ${shortenTicFileName(currentFileName)}`,
          "running"
        );
      });

      ticMonitorState.points = points;
      renderTicMonitorResults();

      const elapsedMs = performance.now() - startTime;
      setStatus(
        `共 ${selectedFiles.length} 份文件，耗时 ${formatTicElapsed(elapsedMs)}，分析完成！`,
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
    analyzeSelectedFiles();
  }

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (event) => setFiles(event.target.files));

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

async function parseTicMonitorFiles(files, onProgress) {
  const points = [];
  const total = files.length;

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (typeof onProgress === "function") {
      onProgress(i + 1, total, file.name);
    }
    await parseTicMonitorFileStream(file, points, file.name);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  return points.sort((a, b) => a.timeMs - b.timeMs);
}

async function parseTicMonitorFileStream(file, points, sourceFileName) {
  if (!file.stream || typeof TextDecoder === "undefined") {
    const text = await file.text();
    parseTicMonitorTextDirect(text, points, sourceFileName);
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
        headerIndexes = parseTicMonitorRelevantLine(line, headerIndexes, points, sourceFileName);
        lineBreakIndex = buffer.indexOf("\n");
      }

      if (done) break;
    }

    if (buffer) {
      headerIndexes = parseTicMonitorRelevantLine(buffer.replace(/\r$/, ""), headerIndexes, points, sourceFileName);
    }
  } finally {
    reader.releaseLock();
  }
}

function parseTicMonitorTextDirect(text, points, sourceFileName) {
  let headerIndexes = null;
  let start = text.charCodeAt(0) === 0xfeff ? 1 : 0;

  for (let i = start; i <= text.length; i += 1) {
    if (i === text.length || text[i] === "\n") {
      const line = text.slice(start, i).replace(/\r$/, "");
      headerIndexes = parseTicMonitorRelevantLine(line, headerIndexes, points, sourceFileName);
      start = i + 1;
    }
  }
}

function parseTicMonitorRelevantLine(line, headerIndexes, points, sourceFileName) {
  if (!line) return headerIndexes;

  if (!headerIndexes) {
    const header = parseTicCsvLine(line.replace(/^\uFEFF/, ""));
    return {
      timestamp: header.indexOf("TC Timestamp"),
      message: header.indexOf("Message Text")
    };
  }

  if (line.indexOf("TIC") === -1 || (line.indexOf("temperature") === -1 && line.indexOf("pressure") === -1)) {
    return headerIndexes;
  }

  const cols = parseTicCsvLine(line);
  const tcTimestamp = cols[headerIndexes.timestamp] || "";
  const message = cols[headerIndexes.message] || "";
  const match = message.match(/(US TIC|DS TIC X|DS TIC Y)\s+(temperature|pressure)\s*\([^)]*\)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return headerIndexes;

  const series = normalizeTicSeries(match[1]);
  const kind = match[2].toLowerCase();
  const value = Number(match[3]);
  const timeMs = parseTicTimestamp(tcTimestamp);
  if (!series || !Number.isFinite(value) || !Number.isFinite(timeMs)) return headerIndexes;

  points.push({
    series,
    kind,
    value,
    timeMs,
    timestamp: tcTimestamp,
    sourceFileName
  });

  return headerIndexes;
}

function renderTicMonitorResults() {
  const summary = document.getElementById("ticSummary");
  const root = document.getElementById("ticChartsRoot");
  if (!summary || !root) return;

  const points = ticMonitorState.points;
  const sampleCount = getTicSampleCount(points);
  const timeRange = getTicTimeRangeHtml(points);

  summary.innerHTML = `
    <div class="summary-row tic-summary-row">
      <div class="summary-card tic-sample-card"><strong>样本数：</strong>${sampleCount}</div>
      <div class="summary-card tic-time-range"><strong>时间范围：</strong>${timeRange}</div>
    </div>
  `;

  if (!points.length) {
    root.innerHTML = `<div class="empty-text tic-empty">未提取到 TIC 温度/气压记录。</div>`;
    return;
  }

  root.innerHTML = `
    ${renderTicChartPanel("temperature", "TIC Temperature", "TIC Temp vs. Time", "°C", "TIC Temp (°C)")}
    ${renderTicChartPanel("pressure", "TIC Pressure", "TIC Pressure vs. Time", "hPa", "TIC Pressure (hPa)")}
  `;

  bindTicLegendEvents(root);
  requestAnimationFrame(() => drawAllTicCharts());
}

function renderTicChartPanel(kind, panelTitle, plotTitle, unit, yAxisTitle) {
  return `
    <section class="chart-section-card tic-chart-card">
      <div class="chart-panel-top tic-chart-top">
        <div class="tic-chart-title">${panelTitle}</div>
        <div class="chart-toggle-group tic-toggle-group">
          ${TIC_SERIES.map((series) => `
            <label class="chart-check-item tic-check-item">
              <input type="checkbox" data-tic-series="${series}" ${ticMonitorState.visible[series] ? "checked" : ""} />
              <span class="tic-legend-dot" style="background:${TIC_COLORS[series]}"></span>
              ${series}
            </label>
          `).join("")}
        </div>
      </div>
      <div class="chart-canvas-wrap tic-chart-wrap">
        <canvas id="tic-${kind}-canvas" data-kind="${kind}" data-unit="${unit}" data-y-axis-title="${yAxisTitle}" data-plot-title="${plotTitle}" width="600" height="280"></canvas>
      </div>
    </section>
  `;
}

function bindTicLegendEvents(root) {
  root.querySelectorAll("input[data-tic-series]").forEach((input) => {
    input.addEventListener("change", () => {
      ticMonitorState.visible[input.dataset.ticSeries] = input.checked;
      root.querySelectorAll(`input[data-tic-series=\"${input.dataset.ticSeries}\"]`).forEach((sameSeriesInput) => {
        sameSeriesInput.checked = input.checked;
      });
      drawAllTicCharts();
    });
  });
}

function drawAllTicCharts() {
  drawTicScatterChart(document.getElementById("tic-temperature-canvas"), "temperature", "°C");
  drawTicScatterChart(document.getElementById("tic-pressure-canvas"), "pressure", "hPa");
  bindTicChartHover(document.getElementById("tic-temperature-canvas"));
  bindTicChartHover(document.getElementById("tic-pressure-canvas"));
}

function drawTicScatterChart(canvas, kind, unit) {
  if (!canvas) return;

  // Keep the Scanning Magnet Shift chart ratio, but render it as a true HiDPI canvas.
  // Logical drawing size: 900 x 420. Internal bitmap: 2x by default for sharp display/export.
  const width = 900;
  const height = 420;
  const dpr = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const data = ticMonitorState.points.filter((p) => p.kind === kind && ticMonitorState.visible[p.series]);
  const allKindData = ticMonitorState.points.filter((p) => p.kind === kind);
  const padding = { left: 98, right: 36, top: 58, bottom: 88 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  ctx.fillStyle = "#efefef";
  ctx.fillRect(0, 0, width, height);

  if (!allKindData.length) {
    ctx.fillStyle = "#777";
    ctx.font = "16px Segoe UI";
    ctx.fillText("No TIC data", 30, 40);
    return;
  }

  const minTime = Math.min(...allKindData.map((p) => p.timeMs));
  const maxTime = Math.max(...allKindData.map((p) => p.timeMs));
  const xMin = minTime;
  const xMax = maxTime > minTime ? maxTime : minTime + 1000;

  const values = allKindData.map((p) => p.value).filter(Number.isFinite);
  let yScale = kind === "pressure"
    ? getNiceTicScale(values, { preferredStep: 2, minSpan: 6 })
    : getNiceTicScale(values, { preferredStep: 1, minSpan: 3 });
  let yMin = yScale.min;
  let yMax = yScale.max;
  const yTicks = yScale.ticks;

  const xToPx = (timeMs) => padding.left + ((timeMs - xMin) / (xMax - xMin)) * plotW;
  const yToPx = (value) => padding.top + (1 - (value - yMin) / (yMax - yMin)) * plotH;

  const yAxisTitle = canvas.dataset.yAxisTitle || (kind === "pressure" ? "TIC Pressure (hPa)" : "TIC Temp (°C)");
  const plotTitle = canvas.dataset.plotTitle || (kind === "pressure" ? "TIC Pressure vs. Time" : "TIC Temp vs. Time");
  drawTicGrid(ctx, padding, plotW, plotH, xMin, xMax, yMin, yMax, unit, xToPx, yToPx, yAxisTitle, yTicks, plotTitle);

  const drawnPoints = [];

  TIC_SERIES.forEach((series) => {
    if (!ticMonitorState.visible[series]) return;
    ctx.fillStyle = TIC_COLORS[series];
    data.filter((p) => p.series === series).forEach((p) => {
      const x = xToPx(p.timeMs);
      const y = yToPx(p.value);
      if (x < padding.left - 4 || x > padding.left + plotW + 4 || y < padding.top - 4 || y > padding.top + plotH + 4) return;
      ctx.beginPath();
      ctx.arc(x, y, 4.2, 0, Math.PI * 2);
      ctx.fill();
      drawnPoints.push({ x, y, point: p });
    });
  });

  ticMonitorChartRuntime.charts.set(canvas.id, {
    kind,
    unit,
    width,
    height,
    padding,
    plotW,
    plotH,
    points: drawnPoints
  });

  const hoverPoint = ticMonitorChartRuntime.hoverPoints.get(canvas.id);
  if (hoverPoint) {
    drawTicHoveredPoint(ctx, hoverPoint);
    drawTicCanvasTooltip(ctx, hoverPoint.point, unit, hoverPoint.x, hoverPoint.y, width, height);
  }
}

function drawTicGrid(ctx, padding, plotW, plotH, xMin, xMax, yMin, yMax, unit, xToPx, yToPx, yAxisTitle, yTicks = [], plotTitle = "") {
  ctx.save();

  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  const tickValues = getTicTimeAxisTicks(xMin, xMax);
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  tickValues.forEach((timeMs) => {
    const x = xToPx(timeMs);
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + plotH);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "#888";
    ctx.font = "13px Segoe UI";
    ctx.fillText(formatTicAxisTime(timeMs, xMin, xMax), x, padding.top + plotH + 22);
    ctx.setLineDash([4, 4]);
  });

  const visibleYTicks = Array.isArray(yTicks) && yTicks.length ? yTicks : [yMin, (yMin + yMax) / 2, yMax];
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  visibleYTicks.forEach((value) => {
    const y = yToPx(value);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + plotW, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = "#888";
    ctx.font = "13px Segoe UI";
    ctx.fillText(`${formatTicAxisValue(value)} ${unit}`, padding.left - 10, y + 2);
    ctx.setLineDash([4, 4]);
  });

  ctx.setLineDash([]);

  if (plotTitle) {
    ctx.fillStyle = "#111";
    ctx.font = "700 14px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(plotTitle, padding.left + plotW / 2, 20);
  }

  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + plotH);
  ctx.lineTo(padding.left + plotW, padding.top + plotH);
  ctx.stroke();

  ctx.fillStyle = "#555";
  ctx.font = "14px Segoe UI";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.save();
  ctx.translate(28, padding.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(yAxisTitle || "", 0, 0);
  ctx.restore();

  ctx.fillText("Time", padding.left + plotW / 2, padding.top + plotH + 60);

  ctx.restore();
}

function getTicSampleCount(points) {
  const timestamps = new Set();
  points.forEach((point) => {
    if (Number.isFinite(point.timeMs)) timestamps.add(point.timeMs);
  });
  return timestamps.size;
}

function getTicTimeAxisTicks(xMin, xMax) {
  if (!Number.isFinite(xMin) || !Number.isFinite(xMax) || xMax <= xMin) return [xMin];

  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const span = xMax - xMin;
  let step;

  if (span > 3 * day) {
    step = day;
  } else if (span > 1.25 * day) {
    step = 12 * hour;
  } else {
    const preferredIntervals = [1, 2, 3, 4, 6].map((h) => h * hour);
    step = preferredIntervals.find((interval) => span / interval <= 6) || 8 * hour;
  }

  const first = Math.ceil(xMin / step) * step;
  const ticks = [];
  for (let t = first; t <= xMax; t += step) {
    if (t >= xMin && t <= xMax) ticks.push(t);
  }

  if (!ticks.length) {
    const count = 5;
    for (let i = 0; i <= count; i += 1) {
      ticks.push(xMin + (i / count) * span);
    }
  }

  return ticks.slice(0, 9);
}

function getNiceTicScale(values, options = {}) {
  const finiteValues = (values || []).filter(Number.isFinite);
  if (!finiteValues.length) {
    const fallbackMin = options.preferredStep === 5 ? 980 : 20;
    const fallbackMax = options.preferredStep === 5 ? 1030 : 30;
    return { min: fallbackMin, max: fallbackMax, ticks: [fallbackMin, (fallbackMin + fallbackMax) / 2, fallbackMax] };
  }

  const rawMin = Math.min(...finiteValues);
  const rawMax = Math.max(...finiteValues);
  const minSpan = options.minSpan || 3;
  const preferredStep = options.preferredStep || 1;
  const rawSpan = Math.max(rawMax - rawMin, minSpan);
  const center = (rawMin + rawMax) / 2;
  let min = Math.floor((center - rawSpan / 2 - preferredStep * 0.5) / preferredStep) * preferredStep;
  let max = Math.ceil((center + rawSpan / 2 + preferredStep * 0.5) / preferredStep) * preferredStep;

  if (max <= min) max = min + preferredStep * 4;

  let span = max - min;
  let tickCount = Math.round(span / preferredStep);
  if (tickCount < 3) {
    min -= preferredStep;
    max += preferredStep;
    span = max - min;
    tickCount = Math.round(span / preferredStep);
  }

  const ticks = [];
  for (let value = min; value <= max + preferredStep * 0.001; value += preferredStep) {
    ticks.push(Math.round(value * 1000) / 1000);
  }

  // Avoid overcrowding labels on unusual ranges.
  if (ticks.length > 7) {
    const compactTicks = [];
    const interval = Math.ceil((ticks.length - 1) / 5);
    ticks.forEach((value, index) => {
      if (index === 0 || index === ticks.length - 1 || index % interval === 0) compactTicks.push(value);
    });
    return { min, max, ticks: compactTicks };
  }

  return { min, max, ticks };
}

function formatTicAxisValue(value) {
  const rounded = Math.round(value * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 0.001) return String(Math.round(rounded));
  return String(rounded);
}

function bindTicChartHover(canvas) {
  if (!canvas || canvas.dataset.ticHoverBound === "1") return;
  canvas.dataset.ticHoverBound = "1";

  canvas.addEventListener("mousemove", (event) => {
    const runtime = ticMonitorChartRuntime.charts.get(canvas.id);
    if (!runtime || !runtime.points.length) {
      ticMonitorChartRuntime.hoverPoints.delete(canvas.id);
      drawTicScatterChart(canvas, canvas.dataset.kind, canvas.dataset.unit);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = runtime.width / rect.width;
    const scaleY = runtime.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    let nearest = null;
    let nearestDist = Infinity;
    runtime.points.forEach((candidate) => {
      const dx = candidate.x - x;
      const dy = candidate.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = candidate;
      }
    });

    const oldPoint = ticMonitorChartRuntime.hoverPoints.get(canvas.id);
    const oldKey = oldPoint ? `${oldPoint.point.series}-${oldPoint.point.timeMs}-${oldPoint.point.value}` : "";
    const newKey = nearest && nearestDist <= 14 ? `${nearest.point.series}-${nearest.point.timeMs}-${nearest.point.value}` : "";

    if (oldKey === newKey) return;

    if (!nearest || nearestDist > 14) {
      ticMonitorChartRuntime.hoverPoints.delete(canvas.id);
    } else {
      ticMonitorChartRuntime.hoverPoints.set(canvas.id, nearest);
    }

    drawTicScatterChart(canvas, canvas.dataset.kind, canvas.dataset.unit);
  });

  canvas.addEventListener("mouseleave", () => {
    ticMonitorChartRuntime.hoverPoints.delete(canvas.id);
    drawTicScatterChart(canvas, canvas.dataset.kind, canvas.dataset.unit);
  });
}

function drawTicHoveredPoint(ctx, point) {
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.fillStyle = "#ffffff";
  ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTicCanvasTooltip(ctx, point, unit, pointX, pointY, canvasWidth, canvasHeight) {
  const lines = [
    `Type: ${point.series}`,
    `Time: ${formatTicTooltipTime(point.timeMs)}`,
    `Value: ${formatTicValue(point.value)} ${unit}`,
    `Source: ${shortenTicFileName(point.sourceFileName || "-")}`
  ];

  ctx.save();
  ctx.font = "13px Segoe UI";

  let maxWidth = 0;
  for (const line of lines) {
    const width = ctx.measureText(line).width;
    if (width > maxWidth) maxWidth = width;
  }

  const boxWidth = Math.min(maxWidth + 20, 220);
  const boxHeight = lines.length * 18 + 16;

  let boxX = pointX + 12;
  let boxY = pointY - boxHeight - 12;

  if (boxX + boxWidth > canvasWidth - 8) boxX = pointX - boxWidth - 12;
  if (boxY < 8) boxY = pointY + 12;
  if (boxY + boxHeight > canvasHeight - 8) boxY = canvasHeight - boxHeight - 8;

  ctx.fillStyle = "rgba(20, 20, 20, 0.92)";
  roundTicRect(ctx, boxX, boxY, boxWidth, boxHeight, 8);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  lines.forEach((line, index) => {
    const displayLine = line.length > 36 ? `${line.slice(0, 34)}...` : line;
    ctx.fillText(displayLine, boxX + 10, boxY + 18 + index * 18);
  });

  ctx.restore();
}

function roundTicRect(ctx, x, y, width, height, radius) {
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

function formatTicTooltipTime(timeMs) {
  const date = new Date(timeMs);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function formatTicValue(value) {
  return Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function parseTicCsvLine(line) {
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

function normalizeTicSeries(value) {
  const text = String(value || "").toUpperCase();
  if (text === "US TIC") return "US TIC";
  if (text === "DS TIC X") return "DS TIC X";
  if (text === "DS TIC Y") return "DS TIC Y";
  return "";
}

function parseTicTimestamp(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/);
  if (!match) return NaN;
  const [, y, m, d, hh, mm, ss, ms = "0"] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss), Number(ms.slice(0, 3).padEnd(3, "0"))).getTime();
}

function formatTicAxisTime(timeMs, rangeMin = timeMs, rangeMax = timeMs) {
  const date = new Date(timeMs);
  const sameDay = new Date(rangeMin).toDateString() === new Date(rangeMax).toDateString();
  const hhmm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (sameDay) return hhmm;
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${hhmm}`;
}

function getTicTimeRangeHtml(points) {
  if (!points.length) return "-";
  const minTime = Math.min(...points.map((p) => p.timeMs));
  const maxTime = Math.max(...points.map((p) => p.timeMs));
  return `${escapeTicHtml(formatTicAxisTime(minTime, minTime, maxTime))}<span class="tic-range-to">to</span>${escapeTicHtml(formatTicAxisTime(maxTime, minTime, maxTime))}`;
}

function formatTicElapsed(elapsedMs) {
  if (elapsedMs < 1000) {
    return `${Math.max(0.1, Math.round(elapsedMs / 100) / 10).toFixed(1)} s`;
  }
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds} s`;
  return `${minutes} min ${seconds} s`;
}

function shortenTicFileName(fileName) {
  const text = String(fileName || "");
  return text.length > 36 ? `${text.slice(0, 33)}...` : text;
}

function escapeTicHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
