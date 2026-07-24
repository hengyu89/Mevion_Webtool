import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const csvUtilsSource = await readFile(new URL("../js/csv-utils.js", import.meta.url), "utf8");
const noScanningSource = await readFile(
  new URL("../js/page-modules/no-scanning-tool.js", import.meta.url),
  "utf8"
);
const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  window: {}
});
vm.runInContext(`${csvUtilsSource}\n${noScanningSource}`, context);

const api = context.window.NoScanningToolDebug;

const headers = [
  "Pulse Index",
  "Crossplane Projected Iso Correlated (mm)",
  "Inplane Projected Iso Correlated (mm)",
  "Crossplane Upstream Calibrated Actual Correlated (mm)",
  "Inplane Upstream Calibrated Actual Correlated (mm)",
  "Crossplane Downstream Calibrated Actual Correlated (mm)",
  "Inplane Downstream Calibrated Actual Correlated (mm)",
  "Crossplane Upstream sigma",
  "Crossplane Downstream sigma",
  "Inplane Upstream sigma",
  "Inplane Downstream sigma"
];

function makeTreatmentRecord({ pulseCount = 400, termination = "NORMAL_TERMINATION", headerMatch = "True" } = {}) {
  const metadata = [
    "Treatment Start Local Time,Mon Dec 1 06:53:05 2025",
    `Termination Condition,${termination}`,
    `TreatmentRecord and Header Data Match,${headerMatch}`,
    ""
  ];
  const values = [
    2,
    -4,
    6,
    -8,
    10,
    -12,
    2.1,
    2.2,
    2.3,
    2.4
  ];
  const rows = Array.from({ length: pulseCount }, (_, index) => [index, ...values].join(","));
  return [...metadata, headers.join(","), ...rows].join("\n");
}

test("parses a complete 400-pulse treatment record and averages requested columns", () => {
  const record = api.parseNoScanningTreatmentRecord(makeTreatmentRecord(), "sample.csv");

  assert.equal(record.pulseCount, 400);
  assert.equal(record.complete, true);
  assert.equal(record.normalTermination, true);
  assert.equal(record.headerMatch, true);
  assert.equal(record.dateText, "2025-12-01 06:53:05");
  assert.equal(record.position.cpIso.mean, 2);
  assert.equal(record.position.ipIso.mean, -4);
  assert.equal(record.position.cpUs.mean, 6);
  assert.equal(record.position.ipDs.mean, -12);
  assert.ok(Math.abs(record.sigma.cpUs.mean - 2.1) < 1e-12);
  assert.ok(Math.abs(record.sigma.cpDs.mean - 2.2) < 1e-12);
  assert.ok(Math.abs(record.sigma.ipUs.mean - 2.3) < 1e-12);
  assert.ok(Math.abs(record.sigma.ipDs.mean - 2.4) < 1e-12);
});

test("marks short or abnormally terminated treatment records as incomplete", () => {
  const complete = api.parseNoScanningTreatmentRecord(makeTreatmentRecord(), "complete.csv");
  const short = api.parseNoScanningTreatmentRecord(
    makeTreatmentRecord({ pulseCount: 399 }),
    "short.csv"
  );
  const abnormal = api.parseNoScanningTreatmentRecord(
    makeTreatmentRecord({ termination: "BEAM_KEY" }),
    "abnormal.csv"
  );

  assert.equal(complete.complete, true);
  assert.equal(short.complete, false);
  assert.equal(abnormal.complete, false);
});

test("matches columns by header names instead of fixed Excel letters", () => {
  const csv = makeTreatmentRecord();
  const lines = csv.split("\n");
  const headerIndex = lines.findIndex((line) => line.startsWith("Pulse Index,"));
  const originalHeaders = lines[headerIndex].split(",");
  const reorderedHeaders = [
    originalHeaders[0],
    ...originalHeaders.slice(1).reverse()
  ];
  const reorderedRows = lines.slice(headerIndex + 1).map((line) => {
    const cells = line.split(",");
    return [cells[0], ...cells.slice(1).reverse()].join(",");
  });
  const reorderedCsv = [
    ...lines.slice(0, headerIndex),
    reorderedHeaders.join(","),
    ...reorderedRows
  ].join("\n");

  const record = api.parseNoScanningTreatmentRecord(reorderedCsv, "reordered.csv");
  assert.equal(record.position.cpIso.mean, 2);
  assert.equal(record.position.ipDs.mean, -12);
  assert.ok(Math.abs(record.sigma.ipDs.mean - 2.4) < 1e-12);
});

test("creates one horizontal-axis tick for every calendar day", () => {
  const ticks = api.getNoScanningDateTicks([
    { dateMs: new Date(2026, 6, 13, 10, 30).getTime() },
    { dateMs: new Date(2026, 6, 15, 7, 45).getTime() }
  ]);

  assert.equal(ticks.length, 3);
  assert.equal(new Date(ticks[0]).getDate(), 13);
  assert.equal(new Date(ticks[1]).getDate(), 14);
  assert.equal(new Date(ticks[2]).getDate(), 15);
});
