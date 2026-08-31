import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const context = vm.createContext({ console, window: {}, setTimeout, TextDecoder });
for (const file of ["csv-utils", "page-modules/tic-monitor-tool", "page-modules/tc-shift-tool", "page-modules/patient-counter-tool"]) {
  vm.runInContext(await readFile(new URL(`../js/${file}.js`, import.meta.url), "utf8"), context);
}
const headers = ["TC Timestamp", "Severity", "Source", "Subsystem", "Category", "UTC Timestamp", "Message Text", "Extra Text"];
const row = (message, source = "MCC", second = "10") => [
  `2026-07-24 11:36:${second}.809`, "INFO", source, "TEST", "NO_ERROR",
  `2026-07-24 03:36:${second}.809`, message, "Test.cpp"
];
const csv = (rows) => rows.map((cells) => cells.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");

// Deliberately split bytes inside records to exercise the browser streaming path.
function file(text, stream, name = "TCLogger.csv") {
  return {
    name,
    text: async () => text,
    ...(stream ? { stream: () => {
      const bytes = new TextEncoder().encode(text);
      let offset = 0;
      return new ReadableStream({ pull(controller) {
        if (offset >= bytes.length) return controller.close();
        controller.enqueue(bytes.slice(offset, offset + 19));
        offset += 19;
      } });
    } } : {})
  };
}

const tools = [
  {
    name: "TIC monitor",
    parse: context.parseTicMonitorFiles,
    rows: [row("US TIC temperature (C), 25"), row("DS TIC X pressure (mbar), 1000", "MCC", "11")],
    verify(result) {
      assert.equal(result.length, 2);
      assert.equal(result[0].value, 25);
      assert.equal(result[1].value, 1000);
    }
  },
  {
    name: "SM Layer Shift",
    async parse(files) {
      const angles = [], shifts = [];
      for (const item of files) await context.parseTcShiftFileStream(item, angles, shifts);
      return { angles, shifts };
    },
    rows: [row("readback: gantry angle 90"), row("Storing initial layer shift of 1.2mm", "DOSX_SW", "11")],
    verify({ angles, shifts }) {
      assert.equal(angles.length, 1);
      assert.equal(angles[0].angle, 90);
      assert.equal(shifts.length, 1);
      assert.equal(shifts[0].shift, 1.2);
      assert.equal(shifts[0].axis, "X");
    }
  },
  {
    name: "Patient Counter",
    parse: context.parsePatientCounterFiles,
    rows: [row("Saving DICOM file (/exams/12345678/Debug/BDI.dcm)"), row("Saving dosimetry record at /exams/12345678/Beam1Frac1.csv", "MCC", "11")],
    verify(result) {
      assert.equal(result.length, 1);
      assert.equal(result[0].fraction, 1);
      assert.equal(result[0].isNew, true);
      assert.equal(result[0].startTimestamp, "2026-07-24 11:36:10.809");
    }
  }
];

for (const tool of tools) {
  for (const stream of [false, true]) {
    for (const hasHeader of [false, true]) {
      test(`${tool.name}: ${stream ? "stream" : "text"} reads ${hasHeader ? "header" : "headerless"} CSV including its first record`, async () => {
        const rows = hasHeader ? [headers, ...tool.rows] : tool.rows;
        tool.verify(await tool.parse([file("\uFEFF\r\n" + csv(rows), stream)]));
      });
    }
    test(`${tool.name}: ${stream ? "stream" : "text"} rejects unrelated CSV`, async () => {
      await assert.rejects(tool.parse([file("wrong,columns\n1,2", stream)]), /TCLogger/);
    });
  }
  test(`${tool.name}: headered and headerless rollover files can be combined`, async () => {
    tool.verify(await tool.parse([
      file(csv([headers, tool.rows[0]]), false, "TCLogger.2026-07-24_11-36-10.csv"),
      file(csv([tool.rows[1]]), true, "TCLogger.2026-07-24_11-36-11.csv")
    ]));
  });
  test(`${tool.name}: reordered named columns remain supported`, async () => {
    const order = [6, 2, 0, 1, 3, 4, 5, 7];
    tool.verify(await tool.parse([file(csv([headers, ...tool.rows].map((cells) => order.map((index) => cells[index]))), false)]));
  });
  for (const stream of [false, true]) {
    test(`${tool.name}: HALO datetime headers, code line and multiline CSV work in ${stream ? "stream" : "text"} mode`, async () => {
      const haloHeaders = [...headers, "Code Line"];
      haloHeaders[0] = "TC Datetime";
      haloHeaders[5] = "MCC Datetime";
      const noise = row('Unrelated "quoted" detail\nwith a second line');
      tool.verify(await tool.parse([file(csv([haloHeaders, noise.concat("10"), ...tool.rows.map((cells) => cells.concat("42"))]), stream)]));
    });
  }
}

test("streaming CSV preserves embedded quotes, commas and UTF-8 across chunk boundaries", async () => {
  const text = '\uFEFFTC Datetime,Message Text\r\n2026-08-31 07:00:00.000,"中文, ""quoted""\ncontinued"\r\n';
  const records = [];
  await context.window.CsvUtils.readFileRecords(file(text, true), (line) => records.push(context.window.CsvUtils.parseRecord(line)));
  assert.equal(records.length, 2);
  assert.equal(records[1][1], '中文, "quoted"\ncontinued');
});
