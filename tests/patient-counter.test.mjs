import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({ window: {}, setTimeout, console });
for (const file of ["csv-utils", "page-modules/patient-counter-tool"]) {
  vm.runInContext(await readFile(new URL(`../js/${file}.js`, import.meta.url), "utf8"), context);
}
const header = "TC Datetime,Severity,Source,Subsystem,Category,MCC Datetime,Message Text,Extra Text,Code Line";
function row(time, message) {
  return `2026-08-31 ${time}:00.000,INFO,MCC,TEST,NO_ERROR,2026-08-30 ${time}:00.000,"${message.replaceAll('"', '""')}",test.cpp,42`;
}
const plan = (time, id) => row(time, `Saving DICOM file (/exams/${id}/Debug/BDI.dcm)`);
const record = (time, id, fraction) => row(time, `Treatment Record saved for Patient ${id}. Fraction ${fraction}.`);
const file = (rows, name = "sample.csv") => ({ name, text: async () => [header, ...rows].join("\n") });

test("HALO messages are applied in TC order across files, not export order or MCC time", async () => {
  const patients = await context.parsePatientCounterFiles([
    file([record("07:22", "100001", 14), plan("07:24", "100002"), row("07:25", "Beam Number: 2, Fraction Number: 3")], "a.csv"),
    file([record("07:45", "100002", 3), row("07:04", "Beam Number: 3, Fraction Number: 14"), plan("07:03", "100001")], "b.csv")
  ]);
  assert.equal(patients.length, 2);
  assert.equal(patients[0].patientId, "100001");
  assert.equal(patients[0].fractionDisplay, "Frac 14");
  assert.equal(patients[0].startTimestamp, "2026-08-31 07:03:00.000");
  assert.equal(patients[0].endTimestamp, "2026-08-31 07:22:00.000");
  assert.equal(patients[0].treatmentDurationMs, 19 * 60000);
  assert.deepEqual(Array.from(patients[0].beams), ["3"]);
  assert.deepEqual(Array.from(patients[1].beams), ["2"]);
});

test("treatment field count excludes Setup and counts distinct beam IDs, not their sum", async () => {
  const patient = (await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"),
    ...[1, 2, 2, 4].map((beam) => row("07:01", `Beam Number: ${beam}, Fraction Number: 1`)),
    record("07:22", "100001", 1)
  ])]))[0];
  assert.equal(context.formatPatientBeamList(patient.beams), "Setup, 1, 3");
  assert.equal(patient.treatmentFieldCount, 2);
  assert.equal(patient.isNew, true);
  assert.equal(context.countPatientTreatmentFields([1, "1", 2, "2", 4, 0, -1]), 2);
  assert.equal(context.countPatientTreatmentFields([1]), 0);
});

test("duration sums individual Fractions while the time range spans all of them", async () => {
  const patient = (await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"), record("07:10", "100001", 1),
    plan("09:00", "100001"), record("09:20", "100001", 2)
  ])]))[0];
  assert.equal(patient.fractionDisplay, "Frac 1-2");
  assert.equal(patient.treatmentDurationMs, 30 * 60000);
  assert.equal(context.formatPatientTimeRange(patient.startTimestamp, patient.endTimestamp), "07:00 - 09:20");
  assert.equal(patient.source, "Treatment Record");
});

test("explicit ID in a dosimetry path takes precedence over a previous patient's context", async () => {
  const patients = await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"),
    row("07:05", "Saving dosimetry record at /exams/100002/Beam2Frac3.csv")
  ])]);
  const patient = patients.find((item) => item.patientId === "100002");
  assert.equal(patient.fraction, 3);
  assert.equal(patient.treatmentFieldCount, 1);
  assert.equal(patient.source, "Dosimetry Record");
  assert.equal(patient.startTimestamp, patient.endTimestamp);
  assert.equal(patients[0].endTimestamp, "");
});

test("non-numeric plan IDs cannot leak following beam messages to the previous patient", async () => {
  const patients = await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"), plan("07:05", "QA_TEST"),
    row("07:06", "Beam Number: 9, Fraction Number: 1")
  ])]);
  assert.equal(patients.length, 1);
  assert.equal(patients[0].beams.length, 0);
  assert.equal(patients[0].isNew, false);
});

test("multiline beam messages remain intact and repeated records do not duplicate counts", async () => {
  const csv = file([
    plan("07:00", "100001"), row("07:01", "Beam Number:\n2, Fraction Number:\n4"),
    record("07:10", "100001", 4)
  ]);
  const patient = (await context.parsePatientCounterFiles([csv, csv]))[0];
  assert.equal(patient.treatmentFieldCount, 1);
  assert.equal(patient.fractionDisplay, "Frac 4");
  assert.equal(patient.treatmentDurationMs, 10 * 60000);
});

test("time range preserves missing endpoints and shows dates across midnight", () => {
  assert.equal(context.formatPatientTimeRange("2026-08-31 07:03:00.000", ""), "07:03 - -");
  assert.equal(context.formatPatientTimeRange("2026-08-31 23:58:00.000", "2026-09-01 00:12:00.000"), "2026-08-31 23:58 - 2026-09-01 00:12");
});
