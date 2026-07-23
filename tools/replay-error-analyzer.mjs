import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const analyzerSource = await readFile(
  new URL("../js/page-modules/error-analyzer-tool.js", import.meta.url),
  "utf8"
);
const catalogSource = await readFile(new URL("../data/interlocks.js", import.meta.url), "utf8");

const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  window: {}
});

vm.runInContext(
  `${catalogSource}\n${analyzerSource}\nglobalThis.errorAnalyzerReplayApi = { parseErrorAnalyzerFiles };`,
  context
);

const filePaths = process.argv.slice(2);
const files = filePaths.map((filePath) => ({
  name: path.basename(filePath),
  text: () => readFile(filePath, "utf8")
}));
const result = await context.errorAnalyzerReplayApi.parseErrorAnalyzerFiles(files);

console.log(
  JSON.stringify(
    {
      files: filePaths.length,
      alerts: result.alerts.length,
      events: result.alerts.map((alert, index) => ({
        index: index + 1,
        timestamp: alert.timestamp,
        endTimestamp: alert.endTimestamp || "",
        level: alert.level,
        type: alert.type,
        typeLabels: alert.typeLabels || [],
        note: alert.note,
        incidentKind: alert.incidentKind || "",
        messages: alert.messages?.length || 0
      }))
    },
    null,
    2
  )
);
