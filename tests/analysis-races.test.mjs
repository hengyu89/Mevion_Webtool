import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const storeSource = await readFile(new URL("../js/tc-log-file-store.js", import.meta.url), "utf8");
const tick = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

async function environment(name) {
  const nodes = new Map();
  const errors = [], renders = [], statuses = [];
  const context = vm.createContext({
    window: { setTimeout }, setTimeout, performance,
    console: { error: (error) => errors.push(error) },
    alert: (message) => errors.push(message),
    document: { getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, {
        handlers: {}, className: "", textContent: "",
        addEventListener(type, handler) { this.handlers[type] = handler; },
        classList: { add() {}, remove() {} }
      });
      return nodes.get(id);
    } }
  });
  vm.runInContext(storeSource, context);
  context.window.ToolStatusRegistry = {
    setStatus: (...args) => statuses.push(args),
    markStaleExcept: () => statuses.push(["stale"])
  };
  vm.runInContext(await readFile(new URL(`../js/page-modules/${name}-tool.js`, import.meta.url), "utf8"), context);
  return { context, nodes, errors, renders, statuses };
}

const tcTools = [
  { name: "tic-monitor", bind: "bindTicMonitorEvents", input: "ticFileInput", status: "ticFileStatus", parse: "parseTicMonitorFiles", render: "renderTicMonitorResults", state: "ticMonitorState.points", result: (tag) => [{ tag }] },
  { name: "tc-shift", bind: "bindTcShiftToolEvents", input: "tcFileInput", status: "tcFileList", parse: "parseTcShiftFiles", render: "renderTcShiftResults", result: (tag) => [{ tag }] },
  { name: "patient-counter", bind: "bindPatientCounterEvents", input: "patientFileInput", status: "patientFileStatus", parse: "parsePatientCounterFiles", render: "renderPatientCounterResults", result: (tag) => [{ tag, isNew: false }] },
  { name: "error-analyzer", bind: "bindErrorAnalyzerEvents", input: "errorAnalyzerFileInput", status: "errorAnalyzerFileStatus", parse: "parseErrorAnalyzerFiles", render: "renderErrorAnalyzer", state: "errorAnalyzerState.analysis", result: (tag) => ({ tag, alerts: [], timeRange: {} }) }
];

for (const tool of tcTools) {
  async function setup() {
    const env = await environment(tool.name);
    const pending = [];
    env.context[tool.parse] = (files, progress) => {
      const task = deferred();
      pending.push({ ...task, files, progress });
      return task.promise;
    };
    env.context[tool.render] = (rows) => env.renders.push(tool.state ? vm.runInContext(tool.state, env.context) : rows);
    env.context[tool.bind]();
    return {
      ...env, pending,
      select(name) { env.nodes.get(tool.input).handlers.change({ target: { files: [{ name, size: 10, lastModified: 1 }] } }); }
    };
  }
  for (const outcome of ["success", "failure"]) {
    test(`${tool.name}: late ${outcome} and progress cannot overwrite a newer selection`, async () => {
      const env = await setup();
      env.select("old.csv");
      env.select("new.csv");
      env.pending[1].resolve(tool.result("new"));
      await tick();
      const status = env.nodes.get(tool.status).textContent;
      const statusCount = env.statuses.length;
      env.pending[0].progress(1, 1, "old.csv");
      if (outcome === "success") env.pending[0].resolve(tool.result("old"));
      else env.pending[0].reject(new Error("old read failed"));
      await tick();
      assert.equal(env.renders.length, 1);
      assert.deepEqual(env.renders[0], tool.result("new"));
      assert.equal(env.nodes.get(tool.status).textContent, status);
      assert.equal(env.statuses.length, statusCount);
      assert.equal(env.errors.length, 0);
    });
  }
  test(`${tool.name}: another tool replacing shared files invalidates pending output`, async () => {
    const env = await setup();
    env.select("old.csv");
    env.context.window.TcLogFileStore.setFiles([{ name: "other.csv", size: 20, lastModified: 2 }], "other-tool");
    const count = env.statuses.length;
    env.pending[0].progress(1, 1, "old.csv");
    env.pending[0].resolve(tool.result("old"));
    await tick();
    assert.equal(env.renders.length, 0);
    assert.equal(env.statuses.length, count);
  });
  test(`${tool.name}: reselecting the same file still invalidates the previous run`, async () => {
    const env = await setup();
    env.select("same.csv");
    env.select("same.csv");
    env.pending[1].resolve(tool.result("new"));
    await tick();
    env.pending[0].resolve(tool.result("old"));
    await tick();
    assert.deepEqual(env.renders, [tool.result("new")]);
  });
}

for (const name of ["tic-sweep", "no-scanning"]) {
  for (const outcome of ["success", "failure"]) {
    test(`${name}: late ${outcome} cannot change the latest results or status`, async () => {
      const env = await environment(name);
      const sweep = name === "tic-sweep";
      const parser = sweep ? "parseTicSweepTreatmentRecord" : "parseNoScanningTreatmentRecord";
      const renderer = sweep ? "renderTicSweepResults" : "renderNoScanningResults";
      const state = sweep ? "ticSweepState.analysis" : "noScanningState.records";
      const statusId = sweep ? "ticSweepStatus" : "noScanningStatus";
      env.context[parser] = (text) => ({ tag: text, totalPulses: 1, dateMs: 0, complete: true });
      env.context[renderer] = () => env.renders.push(vm.runInContext(state, env.context));
      const analyze = (file) => sweep ? env.context.analyzeTicSweepFile(file) : env.context.analyzeNoScanningFiles([file]);
      const old = deferred();
      const oldRun = analyze({ name: "old.csv", text: () => old.promise });
      await analyze({ name: "new.csv", text: async () => "new" });
      const status = env.nodes.get(statusId).textContent;
      if (outcome === "success") old.resolve("old");
      else old.reject(new Error("old read failed"));
      await oldRun;
      assert.equal(env.renders.length, 1);
      assert.equal((sweep ? env.renders[0] : env.renders[0][0]).tag, "new");
      assert.equal(env.nodes.get(statusId).textContent, status);
      assert.equal(env.errors.length, 0);
    });
  }
}
