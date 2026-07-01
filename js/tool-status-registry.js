(function () {
  const tools = [
    { id: "tool-tc-shift", shortName: "SM Cal", title: "Scanning Magnet Shift" },
    { id: "tool-patient-counter", shortName: "Patient Ct.", title: "Patient Counter" },
    { id: "tool-tic-monitor", shortName: "TIC Temp", title: "TIC Temperature" }
  ];

  const state = new Map(
    tools.map((tool) => [tool.id, { status: "idle", message: "未加载" }])
  );

  function getTools() {
    return tools.slice();
  }

  function getStatus(toolId) {
    return state.get(toolId) || { status: "idle", message: "未加载" };
  }

  function setStatus(toolId, status, message) {
    if (!state.has(toolId)) return;
    state.set(toolId, {
      status: status || "idle",
      message: message || getDefaultMessage(status)
    });
    renderAll();
  }

  function markStaleExcept(activeToolId) {
    tools.forEach((tool) => {
      if (tool.id === activeToolId) return;
      setStatus(tool.id, "error", "Log updated; reload needed");
    });
  }

  function getDefaultMessage(status) {
    if (status === "running") return "分析中";
    if (status === "done") return "已加载";
    if (status === "error") return "错误";
    return "未加载";
  }

  function renderSwitcherHtml(activePageId) {
    return `
      <div class="tool-status-switcher" role="navigation" aria-label="Tool status switcher">
        ${tools.map((tool) => {
          const item = getStatus(tool.id);
          const activeClass = tool.id === activePageId ? " active" : "";
          return `
            <button class="tool-status-btn${activeClass}" type="button" data-tool-page-id="${tool.id}" title="${tool.title}: ${item.message}">
              <span class="tool-status-lamp lamp-${item.status}" aria-hidden="true"></span>
              <span class="tool-status-name">${tool.shortName}</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderAll() {
    document.querySelectorAll(".tool-status-switcher").forEach((switcher) => {
      const activePageId = switcher.dataset.activePageId || "";
      switcher.innerHTML = renderSwitcherHtml(activePageId).replace(/^\s*<div[^>]*>|<\/div>\s*$/g, "");
    });
  }

  function updateActive(activePageId) {
    document.querySelectorAll(".tool-status-switcher").forEach((switcher) => {
      switcher.dataset.activePageId = activePageId;
      switcher.querySelectorAll(".tool-status-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.toolPageId === activePageId);
      });
    });
  }

  window.ToolStatusRegistry = {
    getTools,
    getStatus,
    setStatus,
    markStaleExcept,
    renderSwitcherHtml,
    updateActive,
    renderAll
  };
})();
