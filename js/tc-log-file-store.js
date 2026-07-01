/*
  Minimal in-memory TC Logger file store.
  Purpose: share the selected File objects between tool pages without changing
  each tool's original parser. Data is intentionally lost on browser refresh.
*/
(function () {
  let files = [];
  let fileKey = "";

  function normalize(fileListLike) {
    return Array.from(fileListLike || []).filter((file) =>
      file && String(file.name || "").toLowerCase().endsWith(".csv")
    );
  }

  function makeKey(list) {
    return list
      .map((file) => [file.name, file.size, file.lastModified].join(":"))
      .join("|");
  }

  window.TcLogFileStore = {
    setFiles(fileListLike, sourceToolId) {
      const next = normalize(fileListLike);
      const nextKey = makeKey(next);
      const changed = nextKey !== fileKey;
      files = next;
      fileKey = nextKey;

      if (
        changed &&
        sourceToolId &&
        window.ToolStatusRegistry &&
        typeof window.ToolStatusRegistry.markStaleExcept === "function"
      ) {
        window.ToolStatusRegistry.markStaleExcept(sourceToolId);
      }

      return files.slice();
    },

    getFiles() {
      return files.slice();
    },

    hasFiles() {
      return files.length > 0;
    },

    getFileKey() {
      return fileKey;
    }
  };
})();
