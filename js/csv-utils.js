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

  window.CsvUtils = { parseRows };
})();
