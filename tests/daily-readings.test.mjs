import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({ console, window: {}, setTimeout, TextDecoder });
for (const fileName of ["csv-utils", "page-modules/daily-readings-tool"]) {
  vm.runInContext(await readFile(new URL(`../js/${fileName}.js`, import.meta.url), "utf8"), context);
}

const headers = ["TC Timestamp", "Severity", "Source", "Subsystem", "Category", "UTC Timestamp", "Message Text", "Extra Text"];
const messages = [
  "Daily Service Log begins",
  "He Level: 2.89693e-57%, ",
  "He Pressure: 16.5 PSIA, ",
  "Heater Power: 1.02087 W, ",
  "External Lead (+): 21.6 C, ",
  "External Lead (-): 19.9 C, ",
  "Coil Temperature for T1: HTS Lead 1 - Top: 47.1356 degrees K",
  "Coil Temperature for T2: HTS Lead 2 - Top: 46.9339 degrees K",
  "Coil Temperature for T3: HTS Lead 1 - Bottom: 4.90583 degrees K",
  "Coil Temperature for T4: HTS Lead 2 - Bottom: 4.91124 degrees K",
  "Coil Temperature for CM1: Coil 1 ID 12 o'clock: 4.39483 degrees K",
  "Coil Temperature for CM2: Coil 2 ID 12 o'clock: 4.31451 degrees K",
  "Cyclotron Vacuum Pressure: 3.80971e-07 Torr, ",
  "Cryostat Vacuum Pressure: 1.00237e-05 Torr",
  "RF Vacuum Pressure: 1.18774e-06 Torr",
  "QDSP1 Secondary Current: 1867"
];

function row(message, time = "05:00:01.300", source = "LOGGER", category = "SERVICE_PM") {
  return [`2026-09-01 ${time}`, "INFO", source, "TC", category, `2026-08-31 21:00:01.300`, message, "<null>"];
}

function csv(rows) {
  return rows.map((cells) => cells.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
}

function file(text, name = "TCLogger.csv") {
  return { name, text: async () => text };
}

test("Daily Readings extracts all 15 Salesforce fields from the 05:00 SERVICE_PM snapshot", async () => {
  const [snapshot] = await context.parseDailyReadingsFiles([file(csv([headers, ...messages.map((message) => row(message))]))]);
  assert.equal(snapshot.date, "2026-09-01");
  assert.equal(Object.keys(snapshot.values).length, 15);
  assert.equal(snapshot.values.heliumPressure.rawValue, 16.5);
  assert.equal(snapshot.values.lemCurrent.rawValue, 1867);
  assert.equal(snapshot.values.heaterPower.rawText, "1.02087");
  assert.equal(snapshot.values.htsLead1Top.rawText, "47.1356");
  assert.equal(snapshot.values.cryostatVacuum.rawText, "1.00237e-05");
  assert.equal(snapshot.values.rfVacuum.rawText, "1.18774e-06");
  assert.equal(context.formatDailyReadingDisplayValue({ format: "fixed2" }, snapshot.values.heliumLevel), "0.00");
  assert.equal(context.scaleDailyReadingScientificText(snapshot.values.cryostatVacuum.rawText, 8), "1002.37");
  assert.equal(context.scaleDailyReadingScientificText(snapshot.values.cyclotronVacuum.rawText, 7), "3.80971");
  assert.equal(context.scaleDailyReadingScientificText(snapshot.values.rfVacuum.rawText, 7), "11.8774");
});

test("Daily Readings returns no result when the log has no 05:00 snapshot marker", async () => {
  const result = await context.parseDailyReadingsFiles([file(csv([headers, row(messages[1], "06:00:01.300")]))]);
  assert.equal(result.length, 0);
});

test("Daily Readings ignores lookalike messages outside LOGGER SERVICE_PM", async () => {
  const rows = [
    headers,
    row(messages[0], "05:00:01.300", "MCC"),
    row(messages[1], "05:00:01.300", "LOGGER", "NO_ERROR")
  ];
  assert.equal((await context.parseDailyReadingsFiles([file(csv(rows))])).length, 0);
});

test("Daily Readings finds the earliest rollover file when later selected logs have no 05:00 data", async () => {
  const early = file(csv([headers, ...messages.map((message) => row(message))]), "TCLogger.12-29-51.csv");
  const later = file(csv([headers, row("Unrelated treatment message", "17:24:29.000", "MCC", "NO_ERROR")]), "TCLogger.17-24-29.csv");
  const snapshots = await context.parseDailyReadingsFiles([later, early]);
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].sourceFiles[0], "TCLogger.12-29-51.csv");
  assert.equal(Object.keys(snapshots[0].values).length, 15);
});

test("Daily Readings returns every available Service Log date in chronological order", async () => {
  const dayOne = messages.map((message) => row(message));
  const dayTwo = messages.map((message) => {
    const cells = row(message);
    cells[0] = cells[0].replace("2026-09-01", "2026-09-02");
    return cells;
  });
  const snapshots = await context.parseDailyReadingsFiles([
    file(csv([...dayTwo, ...dayOne]), "TONGJI-S250i-0013-ServiceLog.csv")
  ]);
  assert.deepEqual(Array.from(snapshots, (snapshot) => snapshot.date), ["2026-09-01", "2026-09-02"]);
  assert.equal(Object.keys(snapshots[0].values).length, 15);
  assert.equal(Object.keys(snapshots[1].values).length, 15);
});
