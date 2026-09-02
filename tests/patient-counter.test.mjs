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
const record = (time, id, fraction) => row(time, `Treatment Record 1.2.${id}.${fraction} for Patient ${id}. Plan 1.2.9. Fraction ${fraction}.`);
const dose = (time, id, beam, fraction = 1) => row(time, `Saving dosimetry record at /exams/${id}/SESSION_20260831070000/Beam_${beam}/DOSREC_Beam${beam}_Frac${fraction}.csv`);
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
  assert.equal(Number.isNaN(patients[0].treatmentDurationMs), true);
  assert.equal(patients[0].hasBeamDelivery, false);
  assert.deepEqual(Array.from(patients[0].observedBeams), ["3"]);
  assert.deepEqual(Array.from(patients[1].observedBeams), ["2"]);
});

test("treatment field count excludes Setup and counts distinct beam IDs, not their sum", async () => {
  const patient = (await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"),
    ...[1, 2, 2, 4].map((beam) => dose("07:01", "100001", beam)),
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
    plan("07:00", "100001"),
    row("07:01", "Treatment UID: 1.2.100001.1, Beam Number: 2, Fraction Number: 1"),
    dose("07:05", "100001", 2, 1),
    record("07:10", "100001", 1),
    plan("09:00", "100001"),
    row("09:01", "Treatment UID: 1.2.100001.2, Beam Number: 2, Fraction Number: 2"),
    dose("09:05", "100001", 2, 2),
    record("09:20", "100001", 2)
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
  assert.deepEqual(Array.from(patient.observedBeams), ["2"]);
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
  assert.equal(patient.treatmentFieldCount, 0);
  assert.equal(patient.fractionDisplay, "Frac 4");
  assert.equal(Number.isNaN(patient.treatmentDurationMs), true);
  assert.equal(patient.hasBeamDelivery, false);
});

test("time range preserves missing endpoints and shows dates across midnight", () => {
  assert.equal(context.formatPatientTimeRange("2026-08-31 07:03:00.000", ""), "07:03 - -");
  assert.equal(context.formatPatientTimeRange("2026-08-31 23:58:00.000", "2026-09-01 00:12:00.000"), "2026-08-31 23:58 - 2026-09-01 00:12");
});

test("daily field statistics sum patients (3 + 5), excluding Setup and duplicate files", async () => {
  const csv = file([
    plan("07:00", "100001"),
    ...[1, 2, 3, 4].map((beam) => dose("07:01", "100001", beam)),
    plan("08:00", "100002"),
    ...[1, 2, 3, 4, 5, 6].map((beam) => dose("08:01", "100002", beam))
  ]);
  const patients = await context.parsePatientCounterFiles([csv, csv]);
  const stats = context.getPatientFieldStatistics(patients);
  assert.equal(stats.total, 8);
  assert.equal(stats.days.length, 1);
  assert.equal(stats.days[0].date, "2026-08-31");
  assert.equal(stats.days[0].count, 8);
  assert.equal(stats.total, patients.reduce((sum, patient) => sum + patient.treatmentFieldCount, 0));
});

test("same patient beams count separately by TC date, sorted across months and years", async () => {
  const onDate = (date, rows) => rows.map((line) => line.replace(/^2026-08-31/, date));
  const patients = await context.parsePatientCounterFiles([file([
    ...onDate("2027-01-01", [plan("07:00", "100001"), dose("07:01", "100001", 2)]),
    ...onDate("2026-09-01", [plan("07:00", "100001"), dose("07:01", "100001", 2), dose("07:02", "100001", 3)]),
    plan("07:00", "100001"), dose("07:01", "100001", 2),
    row("07:02", "Saving dosimetry record at /exams/100001/Beam2Frac1.csv"),
    ...onDate("2026-09-02", [plan("07:00", "100002"), dose("07:01", "100002", 1)])
  ])]);
  const stats = context.getPatientFieldStatistics(patients);
  assert.equal(patients[0].treatmentFieldCount, 4);
  assert.equal(stats.total, 4);
  assert.deepEqual(Array.from(stats.days, ({ date, count }) => [date, count]), [
    ["2026-08-31", 1], ["2026-09-01", 2], ["2026-09-02", 0], ["2027-01-01", 1]
  ]);
  assert.match(context.renderPatientFieldStatistics(patients), /2026年8月31日/);
});

test("field statistics cover every patient beyond the first page and handle empty imports", async () => {
  const patients = await context.parsePatientCounterFiles([file(Array.from({ length: 31 }, (_, i) =>
    row("07:01", `Saving dosimetry record at /exams/${100001 + i}/Beam2Frac1.csv`)
  ))]);
  assert.equal(context.getPatientFieldStatistics(patients).total, 31);
  assert.equal(context.getPatientFieldStatistics([]).total, 0);
});

test("later Treatment Record resolves UID ownership when the next patient's plan open is missing", async () => {
  const patients = await context.parsePatientCounterFiles([
    file([plan("10:42", "100001"), row("10:43", "Beam Number: 2, Fraction Number: 9")]),
    file([
      row("11:29", "Treatment Record 1.2.3.14 for Patient 100002. Plan 1.2.9. Fraction 14."),
      row("11:13", "Treatment UID: 1.2.3.14, Beam Number: 4, Fraction Number: 14, Starting Spot Index: 0."),
      row("11:14", "Beam number: 5")
    ])
  ]);
  assert.equal(patients.find(p => p.patientId === "100001").fractionDisplay, "Frac 9");
  const next = patients.find(p => p.patientId === "100002");
  assert.equal(next.fractionDisplay, "Frac 14");
  assert.deepEqual(Array.from(next.observedBeams), ["4", "5"]);
});

test("explicit PatientID context binds a UID even when no final Treatment Record exists", async () => {
  const patients = await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"),
    row("08:00", "No setup images to send for PatientID (100002) RT Ion Plan (1.2.3)."),
    row("08:01", "Treatment UID: 1.2.3.4, Beam Number: 2, Fraction Number: 7"),
    row("08:02", "Beam number: 3")
  ])]);
  assert.equal(patients.find(p => p.patientId === "100001").fractions.length, 0);
  assert.equal(patients.find(p => p.patientId === "100002").fractionDisplay, "Frac 7");
  assert.deepEqual(Array.from(patients.find(p => p.patientId === "100002").observedBeams), ["2", "3"]);
});

test("an unresolved new UID cannot inherit the previous patient's context", async () => {
  const patients = await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"),
    row("07:01", "Treatment UID: 1.2.3.4, Beam Number: 2, Fraction Number: 7"),
    row("08:01", "Treatment UID: 1.2.3.5, Beam Number: 5, Fraction Number: 14"),
    row("08:02", "Beam number: 6")
  ])]);
  assert.equal(patients.length, 1);
  assert.equal(patients[0].fractionDisplay, "Frac 7");
  assert.deepEqual(Array.from(patients[0].observedBeams), ["2"]);
});

test("a missing plan start is inferred from the explicit dosimetry SESSION, without inventing beams", async () => {
  const patients = await context.parsePatientCounterFiles([file([
    row("08:06", "Saving dosimetry record at /exams/100001/SESSION_20260831074717/Beam_4/DOSREC_Beam4_Frac2.csv"),
    record("08:07", "100001", 2)
  ])]);
  assert.equal(patients[0].startTimestamp, "2026-08-31 07:47:17.000");
  assert.equal(patients[0].startInferred, true);
  assert.equal(patients[0].treatmentFieldCount, 1);
  assert.equal(context.formatPatientBeamList(patients[0].beams), "3");
  assert.equal(context.getPatientSessionPathStart("/SESSION_20260230074717/", Date.now()), null);
  assert.equal(context.getPatientSessionPathStart("/SESSION_20260831090000/", context.parsePatientTimestamp("2026-08-31 08:00:00")), null);
});

test("an observed plan start takes priority over the rounded SESSION path time", async () => {
  const patients = await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"),
    row("07:10", "Saving dosimetry record at /exams/100001/SESSION_20260831070001/Beam2Frac1.csv")
  ])]);
  assert.equal(patients[0].startTimestamp, "2026-08-31 07:00:00.000");
  assert.equal(patients[0].startInferred, false);
  assert.equal(patients[0].hasPlanOpen, true);
});

test("a log ending after dosimetry reports only the missing final record, not an inferred start", async () => {
  const patients = await context.parsePatientCounterFiles([file([
    plan("17:35", "100001"),
    row("17:48", "Saving dosimetry record at /exams/100001/SESSION_20260831173500/Beam4Frac4.csv"),
    row("17:49", "Beam number: 3")
  ])]);
  const reasons = Array.from(context.getPatientRecordNotices(patients[0]));
  assert.deepEqual(reasons, ["未识别到该病人的最终 Treatment Record 消息"]);
  assert.equal(patients[0].startInferred, false);
});

test("final-record checks use actual record timestamps rather than the displayed source label", async () => {
  const patients = await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"), record("07:10", "100001", 1),
    row("07:10", "Saving dosimetry record at /exams/100001/Beam2Frac1.csv")
  ])]);
  assert.equal(patients[0].source, "Dosimetry Record");
  assert.equal(context.getPatientRecordNotices(patients[0]).length, 0);
  patients[0].endTimeMs += 1000;
  assert.match(context.getPatientRecordNotices(patients[0])[0], /最后一条剂量记录之后/);
});

test("selected fields and setup-only records stay visible but do not count as treated", async () => {
  const rows = await context.parsePatientCounterFiles([file([
    plan("17:56", "100001"),
    row("17:57", "Treatment UID: 1.2.3.1, Beam Number: 3, Fraction Number: 1"),
    row("17:58", "Beam number: 2"),
    row("18:00", "Treatment Record 1.2.3.1 for Patient 100001. Plan 1.2.9. Fraction 1."),
    plan("20:30", "100002"),
    row("20:31", "Treatment UID: 1.2.3.2, Beam Number: 2, Fraction Number: 1"),
    dose("20:35", "100002", 2),
    row("20:40", "Treatment Record 1.2.3.2 for Patient 100002. Plan 1.2.9. Fraction 1.")
  ])]);
  assert.deepEqual(Array.from(rows, (patient) => patient.patientId), ["100001", "100002"]);
  assert.equal(context.countTreatedPatients(rows), 1);
  assert.equal(rows[0].hasBeamDelivery, false);
  assert.equal(rows[0].fractionDisplay, "Frac 1");
  assert.deepEqual(Array.from(rows[0].beams), ["2", "3"]);
  assert.equal(rows[0].treatmentFieldCount, 0);
  assert.equal(rows[0].isNew, false);
  assert.equal(context.getPatientFieldStatistics(rows).total, 1);
});

test("delivered fractions and statistics exclude selected-only fields on an otherwise treated patient", async () => {
  const rows = await context.parsePatientCounterFiles([file([
    plan("07:00", "100001"),
    row("07:01", "Treatment UID: 1.2.3.1, Beam Number: 5, Fraction Number: 9"),
    dose("07:05", "100001", 2, 8),
    record("07:10", "100001", 8)
  ])]);
  const patient = rows[0];
  assert.equal(patient.fractionDisplay, "Frac 8");
  assert.equal(patient.isNew, false);
  assert.equal(patient.treatmentFieldCount, 1);
  assert.equal(context.getPatientFieldStatistics([patient]).total, 1);
  const beamHtml = context.formatPatientBeamListHtml(patient);
  assert.match(beamHtml, /patient-beam-delivered[^>]*>1<\/span>/);
  assert.match(beamHtml, /patient-beam-not-delivered[^>]*>4<\/span>/);
});

test("setup-only sessions with the same Fraction do not inflate a later delivered session", async () => {
  const rows = await context.parsePatientCounterFiles([file([
    plan("17:56", "100001"),
    row("17:57", "Treatment Record 1.2.3.1 for Patient 100001. Plan 1.2.9. Fraction 1."),
    plan("20:34", "100001"),
    row("20:35", "Treatment UID: 1.2.3.2, Beam Number: 2, Fraction Number: 1"),
    dose("20:40", "100001", 2),
    row("20:50", "Treatment Record 1.2.3.2 for Patient 100001. Plan 1.2.9. Fraction 1.")
  ])]);
  const patient = rows[0];
  assert.equal(patient.treatmentDurationMs, 16 * 60000);
  assert.equal(context.formatPatientTimeRange(patient.startTimestamp, patient.endTimestamp), "20:34 - 20:50");
});
