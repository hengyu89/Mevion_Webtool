import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const analyzerSource = await readFile(
  new URL("../js/page-modules/error-analyzer-tool.js", import.meta.url),
  "utf8"
);
const interlockCatalogSource = await readFile(new URL("../data/interlocks.js", import.meta.url), "utf8");
const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  window: {}
});
vm.runInContext(
  `${interlockCatalogSource}\n${analyzerSource}\nglobalThis.errorAnalyzerTestApi = { parseErrorAnalyzerFiles, highlightErrorAnalyzerMessage, filterErrorAnalyzerAlertsByLevel, getErrorAnalyzerLevelStatistics, getErrorAnalyzerNoteSummary, renderErrorAnalyzerMessages };`,
  context
);

const header = "TC Timestamp,Severity,Source,Subsystem,Category,UTC Timestamp,Message Text,Extra Text";

function makeCsv(rows) {
  return [header, ...rows].join("\n");
}

function mockFile(name, text) {
  return { name, text: async () => text };
}

test("parses headerless TCLogger rollover files without dropping their first row", async () => {
  const regularCsv = makeCsv([
    '2026-07-17 23:12:20.000,WARNING,MCC,GO,DEVICE_ERROR,2026-07-17 15:12:20.000,"GO: Ctrl: Error detected = MOTION_ERROR_GALIL_INVALID_BG_WHILE_DISABLED (88).",Galil.cpp'
  ]);
  const headerlessRollover =
    '2026-07-17 23:17:26.251,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-17 15:17:26.251,"Logging Abnormal Termination Condition: TREATMENT_TIME_LIMIT in CLINICAL",WorkflowManager.cpp';

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([
    mockFile("TCLogger-with-header.csv", regularCsv),
    mockFile("TCLogger-rollover.csv", headerlessRollover)
  ]);

  assert.equal(result.parsedRows, 2);
  assert.equal(result.alerts.length, 2);
  assert.ok(result.alerts.some((alert) => alert.ruleLabel === "Galil Disabled"));
  assert.ok(result.alerts.some((alert) => alert.ruleLabel === "dTime"));
});

test("identifies the malformed file when a batch cannot be parsed", async () => {
  await assert.rejects(
    context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([
      mockFile("valid.csv", makeCsv([])),
      mockFile("broken-rollover.csv", "not,a,TCLogger,record")
    ]),
    /broken-rollover\.csv：CSV 中未找到/
  );
});

test("merges ERROR-46018 with its range-shifter abnormal termination", async () => {
  const csv = makeCsv([
    '2026-07-22 16:20:07.043,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-07-22 08:20:07.043,"ERROR-46018: Plate motion error on pulse 2755. Plate motion error on plate(s) 17. [Interrupt]",XYZ_Controller.cpp',
    '2026-07-22 16:20:07.238,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-22 08:20:07.238,"Logging Abnormal Termination Condition: RANGE_SHIFTER_PLATE_MOTION in CLINICAL",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "sRSPos");
  assert.equal(result.alerts[0].level, "critical");
  assert.equal(result.alerts[0].note, "Range shifter plate motion");
  assert.equal(result.alerts[0].messages.length, 2);
  assert.match(result.alerts[0].messages[0], /ERROR-46018/);
  assert.match(result.alerts[0].messages[1], /RANGE_SHIFTER_PLATE_MOTION/);
  assert.match(result.alerts[0].source, /XYZ_SW \/ XYZ_PCM/);
  assert.match(result.alerts[0].source, /MCC \/ STATE_MANAGER/);
});

test("merges ERROR-4057 with its dose-position termination and emphasizes its values", async () => {
  const csv = makeCsv([
    '2026-07-01 22:04:23.894,WARNING,DOSY_SW,DOSY_PCM,DEVICE_ERROR,2026-07-01 14:04:23.894,"ERROR-4057: Average error for layer 2 (-2.26866mm) is outside tolerance window of [-2, 2]",DOS_Controller.cpp',
    '2026-07-01 22:04:24.134,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-01 14:04:24.134,"Logging Abnormal Termination Condition: DOSE_POSITION in CLINICAL",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "dPos");
  assert.equal(result.alerts[0].level, "critical");
  assert.equal(result.alerts[0].incidentKind, "dosePosition");
  assert.equal(result.alerts[0].note, "Dose position / DOS Y");
  assert.equal(result.alerts[0].messages.length, 2);

  const html = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    result.alerts[0].messages[0],
    result.alerts[0]
  );
  assert.match(html, /Average error for layer <span class="error-analyzer-evidence-label">2<\/span>/);
  assert.match(html, /\(<span class="error-analyzer-measured-value">-2\.26866mm<\/span>\)/);
  assert.match(
    html,
    /tolerance window of <span class="error-analyzer-threshold-value">\[-2, 2\]<\/span>/
  );
});

test("labels a merged dPos incident with its DOS X source", async () => {
  const csv = makeCsv([
    '2026-07-01 22:04:23.894,WARNING,DOSX_SW,DOSX_PCM,DEVICE_ERROR,2026-07-01 14:04:23.894,"ERROR-4057: Average error for layer 4 (2.1mm) is outside tolerance window of [-2, 2]",DOS_Controller.cpp',
    '2026-07-01 22:04:24.134,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-01 14:04:24.134,"Logging Abnormal Termination Condition: DOSE_POSITION in CLINICAL",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([
    mockFile("TCLogger.csv", csv)
  ]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "dPos");
  assert.equal(result.alerts[0].note, "Dose position / DOS X");
});

test("keeps dTime only for treatment time limit terminations", async () => {
  const csv = makeCsv([
    '2026-07-22 07:48:12.294,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-21 23:48:12.294,"Logging Abnormal Termination Condition: TREATMENT_TIME_LIMIT in CLINICAL",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "dTime");
  assert.equal(result.alerts[0].note, "Prescription Time");
});

test("merges the Beam-On limit detail into dTime", async () => {
  const csv = makeCsv([
    '2026-07-22 07:48:12.229,WARNING,MCC,DOS_MCC,DEVICE_ERROR,2026-07-21 23:48:12.229,"Beam-On time of 109.095s exceeds maximum of 109s",DOS_ControlManager.cpp',
    '2026-07-22 07:48:12.294,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-21 23:48:12.294,"Logging Abnormal Termination Condition: TREATMENT_TIME_LIMIT in CLINICAL",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "dTime");
  assert.equal(result.alerts[0].incidentKind, "treatmentTimeLimit");
  assert.equal(result.alerts[0].messages.length, 2);
  assert.match(result.alerts[0].messages[0], /109\.095s/);

  const html = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    result.alerts[0].messages[0],
    result.alerts[0]
  );
  assert.equal((html.match(/error-analyzer-measured-value/g) || []).length, 1);
  assert.equal((html.match(/error-analyzer-threshold-value/g) || []).length, 1);
});

test("emphasizes the affected range-shifter plates but not the error code", () => {
  const html = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    "ERROR-46018: Plate motion error on pulse 2755. Plate motion error on plate(s) 17. [Interrupt]",
    { ruleId: "clinicalStop", ruleLabel: "sRSPos", level: "critical" }
  );

  assert.match(html, /^ERROR-46018:/);
  assert.doesNotMatch(html, /error-analyzer-\w+-token">ERROR-46018<\/span>/);
  assert.match(html, /error-analyzer-evidence-label">plate\(s\) 17<\/span>/);
  assert.doesNotMatch(html, /error-analyzer-evidence-label">Plate motion error/);
});

test("emphasizes every affected range-shifter plate in a multi-plate list", () => {
  const html = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    "ERROR-46018: Plate motion error on pulse 0. Plate motion error on plate(s) 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17. [Interrupt]",
    { ruleId: "clinicalStop", ruleLabel: "sRSPos", level: "critical" }
  );

  assert.match(
    html,
    /error-analyzer-evidence-label">plate\(s\) 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 17<\/span>/
  );
});

test("emphasizes only FAIL in the RS CV final result", () => {
  const html = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    "Range Shifter calibration check finished. Final result: FAIL",
    { ruleId: "errorCode", ruleLabel: "sRSPos", incidentKind: "rsCalibrationVerification" }
  );

  assert.match(html, /Final result: <span class="error-analyzer-warning-token">FAIL<\/span>/);
  assert.doesNotMatch(html, /error-analyzer-warning-token">Final result/);
});

test("classifies ERROR-46037 as RS CV and links a delayed final FAIL", async () => {
  const fillerRows = Array.from(
    { length: 12 },
    (_, index) =>
      `2026-07-06 11:22:${String(9 + Math.floor(index / 4)).padStart(2, "0")}.${String(index * 37).padStart(3, "0")},INFO,MCC,null,NO_ERROR,2026-07-06 03:22:00.000,"Unrelated row ${index}",test.cpp`
  );
  const csv = makeCsv([
    '2026-07-06 11:22:08.002,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-07-06 03:22:08.002,"ERROR-46037: Plate 8 did NOT reach target for OUT {Pot Expected: 0.468V} {Pot Actuals: 9.373V, 9.395V} :FAIL",XYZ_Controller.cpp',
    ...fillerRows,
    '2026-07-06 11:22:12.644,INFO,XYZ_SW,XYZ_PCM,NO_ERROR,2026-07-06 03:22:12.644,"Range Shifter calibration check finished. Final result: FAIL",XYZ_Controller.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "sRSPos");
  assert.equal(result.alerts[0].note, "CV failed");
  assert.equal(result.alerts[0].messages.length, 2);
  assert.match(result.alerts[0].message, /ERROR-46037/);
  assert.match(result.alerts[0].message, /Final result: FAIL/);
});

test("merges pulse retry with a clinical XYZ termination", async () => {
  const csv = makeCsv([
    '2026-07-06 17:34:58.712,WARNING,XYZ_SW,XYZ_PCM,RANGE_ERROR,2026-07-06 09:34:58.712,"ERROR-46029: Pulse Retry limit error (40 retries) on pulse 1003 [Interrupt]",XYZ_Controller.cpp',
    '2026-07-06 17:34:59.056,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-06 09:34:59.056,"Logging Abnormal Termination Condition: XYZ_SUBSYSTEM_LOADED in CLINICAL",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "sXYZLd");
  assert.equal(result.alerts[0].level, "critical");
  assert.equal(result.alerts[0].incidentKind, "pulseRetry");
  assert.equal(result.alerts[0].note, "Pulse retry limit");
  assert.equal(result.alerts[0].messages.length, 2);
});

test("keeps service-mode pulse retry visible and gray", async () => {
  const csv = makeCsv([
    '2026-07-06 23:33:41.749,WARNING,XYZ_SW,XYZ_PCM,RANGE_ERROR,2026-07-06 15:33:41.749,"ERROR-46029: Pulse Retry limit error (40 retries) on pulse 1 [Interrupt]",XYZ_Controller.cpp',
    '2026-07-06 23:33:42.016,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-06 15:33:42.016,"Logging Abnormal Termination Condition: XYZ_SUBSYSTEM_LOADED in SERVICE",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "sXYZLd");
  assert.equal(result.alerts[0].level, "service");
  assert.equal(result.alerts[0].incidentKind, "pulseRetry");
  assert.equal(result.alerts[0].note, "Pulse retry limit");
  assert.equal(result.alerts[0].messages.length, 2);
});

test("keeps standalone service-mode terminations visible", async () => {
  const csv = makeCsv([
    '2026-07-06 23:40:00.000,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-06 15:40:00.000,"Logging Abnormal Termination Condition: BEAM_KEY in SERVICE",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "hBKey");
  assert.equal(result.alerts[0].level, "service");
  assert.equal(result.alerts[0].note, "Beam Enable Key");
});

test("groups a Kuka communications outage through recovery and final clear", async () => {
  const csv = makeCsv([
    '2026-07-21 10:24:20.747,INFO,MCC,TREATMENT_SPACE,NO_ERROR,2026-07-21 02:24:20.747,"IL_PLC_TO_KUKA_COMMS became unsatisfied (KRC4 mode). CIM PCM Online=FALSE, Kuka Online=FALSE",treatment_space_control.cpp',
    '2026-07-21 10:24:20.772,INFO,MCC,null,NO_ERROR,2026-07-21 02:24:20.772,"IL_PLC_TO_KUKA_COMMS became LATCHED. (Type 2)",interlock_manager.cpp',
    '2026-07-21 10:25:43.687,INFO,TC_SERVICE,null,NO_ERROR,2026-07-21 02:25:43.687,"PTS250_DEVICE_KUKA_KRL_SW is ONLINE",DeviceHeartbeatDataPlugin.cpp',
    '2026-07-21 10:25:43.753,INFO,MCC,TREATMENT_SPACE,NO_ERROR,2026-07-21 02:25:43.753,"IL_PLC_TO_KUKA_COMMS became satisfied (KRC4 mode).",treatment_space_control.cpp',
    '2026-07-21 10:25:49.798,INFO,MCC,null,NO_ERROR,2026-07-21 02:25:49.798,"IL_PLC_TO_KUKA_COMMS became UN-LATCHED",interlock_manager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "cCchHB");
  assert.equal(result.alerts[0].level, "warning");
  assert.equal(result.alerts[0].note, "Kuka Offline");
  assert.equal(result.alerts[0].timestamp, "2026-07-21 10:24:20.772");
  assert.equal(result.alerts[0].messages.length, 2);
  assert.equal(result.alerts[0].endTimestamp, "2026-07-21 10:25:49.798");
  assert.match(result.alerts[0].messages[0], /became LATCHED/);
  assert.match(result.alerts[0].messages.at(-1), /became UN-LATCHED/);
});

test("waits for recovery before accepting the final Kuka communications clear", async () => {
  const csv = makeCsv([
    '2026-07-21 21:25:32.410,INFO,MCC,TREATMENT_SPACE,NO_ERROR,2026-07-21 13:25:32.410,"IL_PLC_TO_KUKA_COMMS became unsatisfied (KRC4 mode). CIM PCM Online=FALSE, Kuka Online=FALSE",treatment_space_control.cpp',
    '2026-07-21 21:25:32.415,INFO,MCC,null,NO_ERROR,2026-07-21 13:25:32.415,"IL_PLC_TO_KUKA_COMMS became LATCHED. (Type 2)",interlock_manager.cpp',
    '2026-07-21 21:26:23.239,INFO,MCC,null,NO_ERROR,2026-07-21 13:26:23.239,"IL_PLC_TO_KUKA_COMMS became UN-LATCHED",interlock_manager.cpp',
    '2026-07-21 21:26:23.239,INFO,MCC,null,NO_ERROR,2026-07-21 13:26:23.239,"IL_PLC_TO_KUKA_COMMS became LATCHED. (Type 2)",interlock_manager.cpp',
    '2026-07-21 21:26:51.384,INFO,MCC,TREATMENT_SPACE,NO_ERROR,2026-07-21 13:26:51.384,"IL_PLC_TO_KUKA_COMMS became satisfied (KRC4 mode).",treatment_space_control.cpp',
    '2026-07-21 21:26:51.401,INFO,TC_SERVICE,null,NO_ERROR,2026-07-21 13:26:51.401,"PTS250_DEVICE_KUKA_KRL_SW is ONLINE",DeviceHeartbeatDataPlugin.cpp',
    '2026-07-21 21:26:57.004,INFO,MCC,null,NO_ERROR,2026-07-21 13:26:57.004,"IL_PLC_TO_KUKA_COMMS became UN-LATCHED",interlock_manager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].endTimestamp, "2026-07-21 21:26:57.004");
  assert.equal(result.alerts[0].messages.filter((message) => /UN-LATCHED/.test(message)).length, 1);
  assert.equal(result.alerts[0].messages.filter((message) => /became LATCHED/.test(message)).length, 1);
});

test("loads the complete 37022R13 catalog and SAF19-JA4 descriptions", () => {
  const catalog = context.window.MevionInterlockCatalog;
  assert.equal(catalog.entries.length, 131);
  assert.equal(catalog.entries[0].ref, 1);
  assert.equal(catalog.entries.at(-1).ref, 131);

  const beamKey = catalog.entries.find((entry) => entry.code === "hBKey");
  assert.equal(beamKey.enumId, "IL_FACILITY_BEAM_KEY");
  assert.equal(beamKey.guideName, "Beam Enable Key");
  assert.match(beamKey.guideSatisfiedCondition, /Beam Enable key is enabled/i);
});

test("filters Clinical, Warning, and Service independently", () => {
  const alerts = [{ level: "critical" }, { level: "warning" }, { level: "service" }];
  const visible = context.errorAnalyzerTestApi.filterErrorAnalyzerAlertsByLevel(alerts, {
    critical: true,
    warning: false,
    service: true
  });
  assert.deepEqual(
    Array.from(visible, (alert) => alert.level),
    ["critical", "service"]
  );
});

test("uses the exact code for an unmapped error", async () => {
  const csv = makeCsv([
    '2026-07-06 23:42:46.905,WARNING,DOSX_SW,DOSX_PCM,DEVICE_ERROR,2026-07-06 15:42:46.905,"ERROR-4074: Hardware fault is present as determined by externally monitored signals",DOS_Controller.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "ERROR-4074");
  assert.equal(result.alerts[0].note, "DOS X");
});

test("merges matching DOS Y and DOS X reports into one event", async () => {
  const message =
    "ERROR-4055: No charge measured in layer: cannot calculate average spot size: layerStartIndex 0 layerEndIndex 0";
  const csv = makeCsv([
    `2026-07-08 07:19:19.812,WARNING,DOSY_SW,DOSY_PCM,RANGE_ERROR,2026-07-07 23:19:19.812,"${message}",DOS_Controller.cpp`,
    `2026-07-08 07:19:19.951,WARNING,DOSX_SW,DOSX_PCM,RANGE_ERROR,2026-07-07 23:19:19.951,"${message}",DOS_Controller.cpp`
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "ERROR-4055");
  assert.equal(result.alerts[0].note, "DOS Y / DOS X");
  assert.deepEqual(Array.from(result.alerts[0].dosAxes), ["DOS Y", "DOS X"]);
  assert.match(result.alerts[0].source, /DOSY_SW \/ DOSY_PCM/);
  assert.match(result.alerts[0].source, /DOSX_SW \/ DOSX_PCM/);
});

test("merges dCompare evidence with its clinical termination and highlights charge values", async () => {
  const evidence =
    "ERROR-4047: Doseplane-to-US-TIC charge comparison failure on pulse 165: Doseplane: 92.2578 pC, US-TIC: 9.38602 pC, Tolerance: 5 pC [Interrupt]";
  const csv = makeCsv([
    `2026-07-08 08:02:14.628,WARNING,DOSX_SW,DOSX_PCM,RANGE_ERROR,2026-07-08 00:02:14.628,"${evidence}",DOS_Controller.cpp`,
    '2026-07-08 08:02:14.839,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-08 00:02:14.839,"Logging Abnormal Termination Condition: DOSE_COMPARISONS in CLINICAL",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "dCompare");
  assert.equal(result.alerts[0].incidentKind, "doseCompare");
  assert.equal(result.alerts[0].note, "Doseplane-to-US-TIC");
  assert.equal(result.alerts[0].messages.length, 2);

  const html = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(evidence, result.alerts[0]);
  assert.match(html, /error-analyzer-evidence-label">Doseplane-to-US-TIC<\/span>/);
  assert.equal((html.match(/error-analyzer-measured-value/g) || []).length, 3);
});

test("merges dCompare evidence with its service termination and keeps it gray", async () => {
  const evidence =
    "ERROR-4045: Doseplane-to-Integrator charge comparison failure on pulse 230: Doseplane: 6781.25 pC, Recycling: 6891 pC, Tolerance: 30 pC [Interrupt]";
  const csv = makeCsv([
    `2026-07-08 08:43:32.394,WARNING,DOSY_SW,DOSY_PCM,RANGE_ERROR,2026-07-08 00:43:32.394,"${evidence}",DOS_Controller.cpp`,
    '2026-07-08 08:43:32.704,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-08 00:43:32.704,"Logging Abnormal Termination Condition: DOSE_COMPARISONS in SERVICE",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "dCompare");
  assert.equal(result.alerts[0].level, "service");
  assert.equal(result.alerts[0].messages.length, 2);
});

test("merges spot charge evidence into dCharge and emphasizes diagnostic values", async () => {
  const csv = makeCsv([
    '2026-07-03 15:58:00.964,WARNING,DOSY_SW,DOSY_PCM,DEVICE_ERROR,2026-07-03 07:58:00.964,"ERROR-4056: Spot charge limit error on pulse 1267: Target = 116.019 pC, Limit = 120 pC, Accumulated = 120.5 pC, Tolerance = (2% or 4 pC) [Interrupt]",DOS_Controller.cpp',
    '2026-07-03 15:58:01.112,INFO,MCC,null,NO_ERROR,2026-07-03 07:58:01.112,"IL_DOSE_CHARGE became LATCHED. (Type 1 which became latched b/c in state BEAM ON)",interlock_manager.cpp',
    '2026-07-03 15:58:01.162,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-07-03 07:58:01.162,"Logging Abnormal Termination Condition: SPOT_DOSE_LIMIT in CLINICAL",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "dCharge");
  assert.equal(result.alerts[0].level, "critical");
  assert.equal(result.alerts[0].incidentKind, "spotChargeLimit");
  assert.equal(result.alerts[0].note, "Spot charge limit");
  assert.equal(result.alerts[0].messages.length, 2);

  const html = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    result.alerts[0].messages[0],
    result.alerts[0]
  );
  assert.match(html, /error-analyzer-evidence-label">Spot charge limit<\/span>/);
  assert.equal((html.match(/error-analyzer-measured-value/g) || []).length, 4);
  assert.match(html, /error-analyzer-measured-value">\(2% or 4 pC\)<\/span>/);
});

test("uses immediate nozzle collision evidence to classify unknown clinical stops", async () => {
  const csv = makeCsv([
    '2026-05-26 07:44:51.359,WARNING,CIM_SW,CIM_PCM,IO_ERROR,2026-05-25 23:44:51.359,"Nozzle Collision Detected",CIM_ExtensionCollisionHandler.c',
    '2026-05-26 07:44:51.584,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-05-25 23:44:51.584,"Logging Abnormal Termination Condition: UNKNOWN_TERMINATION in CLINICAL",WorkflowManager.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "CIG Collision");
  assert.equal(result.alerts[0].level, "critical");
  assert.equal(result.alerts[0].incidentKind, "cigCollision");
  assert.equal(
    context.errorAnalyzerTestApi.getErrorAnalyzerNoteSummary(result.alerts[0]),
    "Nozzle collision"
  );
  assert.equal(result.alerts[0].messages.length, 2);
  assert.match(result.alerts[0].messages[0], /Nozzle Collision Detected/);
});

test("summarizes each severity by the displayed Type labels", () => {
  const statistics = context.errorAnalyzerTestApi.getErrorAnalyzerLevelStatistics(
    [
      { level: "critical", ruleLabel: "CIG Collision" },
      { level: "critical", ruleLabel: "CIG Collision" },
      { level: "critical", typeLabels: ["sAAPos"] },
      { level: "critical", typeLabels: ["sAAPos"] },
      { level: "critical", typeLabels: ["sRSPos"] },
      { level: "warning", ruleLabel: "dEnv" }
    ],
    "critical"
  );

  assert.deepEqual(
    Array.from(statistics, ({ label, count }) => [label, count]),
    [
      ["CIG Collision", 2],
      ["sAAPos", 2],
      ["sRSPos", 1]
    ]
  );
});

test("decodes AA position evidence and prefers its direct mismatch mask", async () => {
  const csv = makeCsv([
    '2026-05-26 08:59:12.873,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:59:12.873,"Position mismatch error: 0|0000|0000|0100|0000",AA.cpp',
    '2026-05-26 08:59:12.950,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:59:12.950,"ACM interrupt received in error state. status bits: 0|0000|0000|0100|0000",AA.cpp',
    '2026-05-26 08:59:13.064,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:59:13.064,"C1D (Node 7) target: -300 err.:-1101 curr.:15 prim tol:600",AA.cpp',
    '2026-05-26 08:59:13.593,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-05-26 00:59:13.593,"Logging Abnormal Termination Condition: AA_POSITION_MISMATCH in CLINICAL",WorkflowManager.cpp',
    '2026-05-26 08:59:22.872,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:59:22.872,"ERROR-46040: Adaptive Aperture timeout error on pulse 380 [Interrupt]",XYZ_Controller.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "sAAPos");
  assert.equal(result.alerts[0].level, "critical");
  assert.equal(result.alerts[0].incidentKind, "adaptiveAperture");
  assert.deepEqual(Array.from(result.alerts[0].typeLabels), ["sAAPos"]);
  assert.equal(result.alerts[0].note, "C1d Pos Mismatch");
  assert.equal(result.alerts[0].messages.length, 4);
  assert.match(result.alerts[0].messages[0], /Position mismatch error/);
  assert.match(result.alerts[0].messages[1], /^C1D \(Node 7\)/);
  assert.equal(
    result.alerts[0].messages.some((message) => /ACM interrupt/.test(message)),
    false
  );

  const highlightedMask = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    result.alerts[0].messages[0],
    result.alerts[0]
  );
  assert.match(highlightedMask, /error-analyzer-evidence-label">0\|0000\|0000\|0100\|0000<\/span>/);

  const highlightedAxis = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    result.alerts[0].messages[1],
    result.alerts[0]
  );
  assert.match(highlightedAxis, /error-analyzer-evidence-label">C1D<\/span>/);
  assert.match(highlightedAxis, /error-analyzer-evidence-label">target<\/span>/);
  assert.match(highlightedAxis, /error-analyzer-evidence-label">err\.<\/span>/);
  assert.match(highlightedAxis, /error-analyzer-evidence-label">curr\.<\/span>/);
});

test("keeps separate AA position mismatch incidents separate", async () => {
  const csv = makeCsv([
    '2026-05-26 08:56:55.141,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:56:55.141,"Position mismatch error: 0|0000|0000|0100|0000",AA.cpp',
    '2026-05-26 08:56:55.333,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:56:55.333,"C1D (Node 7) target: -300 err.:-905 curr.:15 prim tol:600",AA.cpp',
    '2026-05-26 08:56:55.893,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-05-26 00:56:55.893,"Logging Abnormal Termination Condition: AA_POSITION_MISMATCH in CLINICAL",WorkflowManager.cpp',
    '2026-05-26 08:57:05.136,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:57:05.136,"ERROR-46040: Adaptive Aperture timeout error on pulse 6 [Interrupt]",XYZ_Controller.cpp',
    '2026-05-26 08:59:12.873,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:59:12.873,"Position mismatch error: 0|0000|0000|0100|0000",AA.cpp',
    '2026-05-26 08:59:13.064,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:59:13.064,"C1D (Node 7) target: -300 err.:-1101 curr.:15 prim tol:600",AA.cpp',
    '2026-05-26 08:59:13.593,INFO,MCC,STATE_MANAGER,NO_ERROR,2026-05-26 00:59:13.593,"Logging Abnormal Termination Condition: AA_POSITION_MISMATCH in CLINICAL",WorkflowManager.cpp',
    '2026-05-26 08:59:22.872,WARNING,XYZ_SW,XYZ_PCM,DEVICE_ERROR,2026-05-26 00:59:22.872,"ERROR-46040: Adaptive Aperture timeout error on pulse 380 [Interrupt]",XYZ_Controller.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 2);
  assert.deepEqual(
    Array.from(result.alerts, (alert) => alert.timestamp),
    ["2026-05-26 08:56:55.893", "2026-05-26 08:59:13.593"]
  );
  result.alerts.forEach((alert) => {
    assert.equal(alert.ruleLabel, "sAAPos");
    assert.equal(alert.note, "C1d Pos Mismatch");
    assert.equal(alert.messages.length, 4);
  });
});

test("groups dense range-shifter plate fault bursts and deduplicates their codes", async () => {
  const csv = makeCsv([
    '2026-05-26 09:06:41.172,WARNING,MCC,XYZ_PCM,DEVICE_ERROR,2026-05-26 01:06:41.172,"ERROR-47014: Plate 1 Motor fault: undervoltage: check 100 Volt DC power supply",test.cpp',
    '2026-05-26 09:06:41.177,WARNING,MCC,XYZ_PCM,DEVICE_ERROR,2026-05-26 01:06:41.177,"ERROR-47003: Range shifter plate 1 motor fault",test.cpp',
    '2026-05-26 09:06:41.182,WARNING,MCC,XYZ_PCM,DEVICE_ERROR,2026-05-26 01:06:41.182,"ERROR-47006: Range shifter plate 1 drive undervoltage",test.cpp',
    '2026-05-26 09:06:41.187,WARNING,MCC,XYZ_PCM,DEVICE_ERROR,2026-05-26 01:06:41.187,"ERROR-47014: Plate 2 Motor fault: undervoltage: check 100 Volt DC power supply",test.cpp'
  ]);

  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([mockFile("TCLogger.csv", csv)]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].incidentKind, "plateFaultBurst");
  assert.deepEqual(Array.from(result.alerts[0].typeLabels), ["ERROR-47003", "ERROR-47006", "ERROR-47014"]);
  assert.equal(result.alerts[0].messages.length, 4);
  assert.equal(result.alerts[0].relatedRows, 4);
});

test("groups a continuous TIC pressure run and preserves its time range", async () => {
  const rows = [
    ["13:46:05.054", "997.235", "1001.73", "996.022"],
    ["13:46:55.579", "997.235", "1001.41", "996.343"],
    ["13:57:53.499", "997.555", "1001.09", "996.063"],
    ["14:12:58.690", "997.235", "1001.41", "996.343"]
  ].map(
    ([time, us, dsx, dsy]) =>
      `2026-05-26 ${time},WARNING,MCC,TIC_PCM,RANGE_ERROR,2026-05-26 00:00:00.000,"ERROR-5030: TIC pressure spread out of tolerance: US = ${us} hectoPascals, DSx = ${dsx} hectoPascals, DSy = ${dsy} hectoPascals, Tolerance = 5 hectoPascals",test.cpp`
  );
  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([
    mockFile("TCLogger.csv", makeCsv(rows))
  ]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "dEnv");
  assert.deepEqual(Array.from(result.alerts[0].typeLabels), ["dEnv"]);
  assert.equal(result.alerts[0].incidentKind, "ticPressureRun");
  assert.equal(result.alerts[0].timestamp, "2026-05-26 13:46:05.054");
  assert.equal(result.alerts[0].endTimestamp, "2026-05-26 14:12:58.690");
  assert.equal(result.alerts[0].messages.length, 4);

  const highlighted = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    result.alerts[0].messages[0],
    result.alerts[0]
  );
  assert.equal((highlighted.match(/error-analyzer-measured-value/g) || []).length, 4);

  const rendered = context.errorAnalyzerTestApi.renderErrorAnalyzerMessages(result.alerts[0]);
  assert.match(rendered, /data-error-message-toggle/);
  assert.match(rendered, /展开 4 条/);
  assert.match(rendered, /error-analyzer-message-extra" hidden/);
});

test("groups a continuous TIC temperature run as dEnv", async () => {
  const rows = [
    ["13:46:01.154", "22.816", "24.8", "25.172"],
    ["13:48:55.275", "22.816", "24.8", "25.172"]
  ].map(
    ([time, us, dsx, dsy]) =>
      `2026-05-26 ${time},WARNING,MCC,TIC_PCM,RANGE_ERROR,2026-05-26 00:00:00.000,"ERROR-5029: TIC temperature spread out of tolerance: US = ${us} 'C, DSx = ${dsx} 'C, DSy = ${dsy} 'C, Tolerance = 2 'C",test.cpp`
  );
  const result = await context.errorAnalyzerTestApi.parseErrorAnalyzerFiles([
    mockFile("TCLogger.csv", makeCsv(rows))
  ]);

  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].ruleLabel, "dEnv");
  assert.deepEqual(Array.from(result.alerts[0].typeLabels), ["dEnv"]);
  assert.equal(result.alerts[0].incidentKind, "ticTemperatureRun");
  assert.equal(result.alerts[0].timestamp, "2026-05-26 13:46:01.154");
  assert.equal(result.alerts[0].endTimestamp, "2026-05-26 13:48:55.275");
  assert.equal(result.alerts[0].messages.length, 2);

  const highlighted = context.errorAnalyzerTestApi.highlightErrorAnalyzerMessage(
    result.alerts[0].messages[0],
    result.alerts[0]
  );
  assert.equal((highlighted.match(/error-analyzer-measured-value/g) || []).length, 4);
});
