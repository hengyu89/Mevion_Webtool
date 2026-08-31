(function () {
  function parseRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let index = text.charCodeAt(0) === 0xfeff ? 1 : 0;

    for (; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          field += '"';
          index += 1;
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
        if (char === "\r" && next === "\n") index += 1;
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

  // Rollover files keep the standard TCLogger column order but omit the header.
  // Return whether the first record is data so callers do not discard it.
  function resolveTcLogHeader(columns, requireSource = false) {
    const names = columns.map((value) => String(value || "").trim());
    const indexes = {
      timestamp: names.findIndex((name) => name === "TC Timestamp" || name === "TC Datetime"),
      source: names.indexOf("Source"),
      message: names.indexOf("Message Text")
    };
    if (indexes.timestamp >= 0 && indexes.message >= 0 && (!requireSource || indexes.source >= 0)) {
      return { indexes, isData: false };
    }
    if (names.length >= 7 && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(names[0])) {
      return { indexes: { timestamp: 0, source: 2, message: 6 }, isData: true };
    }
    throw new Error("未找到有效的 TCLogger 表头或无表头日志记录。");
  }

  // Keep quoted multiline messages intact, including across stream chunks.
  function createRecordReader(onRecord) {
    let parts = [];
    let inQuotes = false;
    let pendingQuote = false;
    let atFieldStart = true;
    function emit() {
      const record = parts.join("").replace(/\r$/, "");
      parts = [];
      if (record) onRecord(record);
    }
    return {
      write(chunk) {
        let start = 0;
        for (let index = 0; index < chunk.length; index += 1) {
          const char = chunk[index];
          if (inQuotes) {
            if (!pendingQuote) {
              if (char === '"') pendingQuote = true;
              continue;
            }
            pendingQuote = false;
            if (char === '"') continue;
            inQuotes = false;
          }
          if (char === '"' && atFieldStart) inQuotes = true;
          if (char === "\n") {
            parts.push(chunk.slice(start, index));
            emit();
            start = index + 1;
          }
          if (char !== "\ufeff") atFieldStart = char === "," || char === "\n";
        }
        if (start < chunk.length) parts.push(chunk.slice(start));
      },
      finish() {
        if (inQuotes && !pendingQuote) throw new Error("CSV 引号未闭合，文件可能不完整。");
        emit();
      }
    };
  }

  function forEachRecord(text, onRecord) {
    const records = createRecordReader(onRecord);
    records.write(text);
    records.finish();
  }

  async function readFileRecords(file, onRecord) {
    if (typeof file.stream !== "function" || typeof TextDecoder === "undefined") {
      forEachRecord(await file.text(), onRecord);
      return;
    }
    const reader = file.stream().getReader();
    const decoder = new TextDecoder("utf-8");
    const records = createRecordReader(onRecord);
    try {
      while (true) {
        const { value, done } = await reader.read();
        records.write(decoder.decode(value || new Uint8Array(), { stream: !done }));
        if (done) break;
      }
      records.finish();
    } finally {
      reader.releaseLock();
    }
  }

  function parseRecord(record) {
    const fields = [];
    let start = 0;
    let inQuotes = false;
    function field(end) {
      let value = record.slice(start, end);
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/""/g, '"');
      fields.push(value);
    }
    for (let index = 0; index < record.length; index += 1) {
      const char = record[index];
      if (inQuotes) {
        if (char === '"' && record[index + 1] === '"') index += 1;
        else if (char === '"') inQuotes = false;
      } else if (char === '"' && index === start) inQuotes = true;
      else if (char === ",") {
        field(index);
        start = index + 1;
      }
    }
    field(record.length);
    return fields;
  }

  window.CsvUtils = { parseRows, resolveTcLogHeader, forEachRecord, readFileRecords, parseRecord };
})();
