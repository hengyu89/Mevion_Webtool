/* global findParentIdByChildId, initErrorAnalyzerToolPage, initPatientCounterToolPage */
/* global initTcShiftToolPage, initTicMonitorToolPage, initTicSweepToolPage */
/* global menuData, renderMainContent, renderMenu, renderSideContent */

const state = {
  currentPageId: "home",
  openParentId: null,
  sidebarCollapsed: true
};

function setPage(pageId) {
  state.currentPageId = pageId;

  const parentId = findParentIdByChildId(pageId);
  state.openParentId = parentId || null;

  renderMenu(state.currentPageId, state.openParentId);
  renderMainContent(state.currentPageId);
  renderSideContent(state.currentPageId);
  initPageModule(state.currentPageId);
}

function toggleParentMenu(parentId) {
  state.openParentId = state.openParentId === parentId ? null : parentId;
  renderMenu(state.currentPageId, state.openParentId);
}

function applySidebarState() {
  const appShell = document.getElementById("appShell");
  const toggleBtn = document.getElementById("menuToggleBtn");
  if (!appShell) return;

  appShell.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  appShell.classList.toggle("sidebar-expanded", !state.sidebarCollapsed);

  if (toggleBtn) {
    toggleBtn.setAttribute("aria-expanded", String(!state.sidebarCollapsed));
    toggleBtn.title = state.sidebarCollapsed ? "展开菜单" : "收起菜单";
  }
}

function bindSidebarToggle() {
  const toggleBtn = document.getElementById("menuToggleBtn");
  if (!toggleBtn) return;

  toggleBtn.addEventListener("click", () => {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    applySidebarState();
  });
}

function bindMenuEvents() {
  const menuContainer = document.getElementById("menuContainer");
  if (!menuContainer) return;

  menuContainer.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-id]");
    if (!button) return;

    const pageId = button.dataset.id;
    const type = button.dataset.type;

    if (type === "parent") {
      const menuItem = menuData.find((item) => item.id === pageId);

      if (menuItem && menuItem.children) {
        const willOpen = state.openParentId !== pageId;
        state.currentPageId = pageId;
        state.openParentId = willOpen ? pageId : null;
        renderMenu(state.currentPageId, state.openParentId);
        renderMainContent(state.currentPageId);
        renderSideContent(state.currentPageId);
        initPageModule(state.currentPageId);
        return;
      }
    }

    setPage(pageId);
  });
}

function bindServiceHome() {
  const btn = document.getElementById("serviceHomeBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    setPage("home");
  });
}

function initBackgroundFallback() {
  const bg = document.querySelector(".page-bg");
  if (!bg) return;

  const testImage = new Image();
  testImage.src = "./assets/images/bg.jpg";
  testImage.onerror = function () {
    bg.classList.add("no-image");
  };
}

function initServiceClock() {
  const clock = document.getElementById("serviceClock");
  if (!clock) return;

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function render() {
    const now = new Date();
    clock.textContent = `${weekdays[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${now.getFullYear()}`;
  }

  render();
  window.setInterval(render, 1000);
}

function initPageModule(pageId) {
  if (pageId === "tool-error-analyzer") {
    initErrorAnalyzerToolPage();
    if (typeof window.activateErrorAnalyzerToolPage === "function") {
      window.activateErrorAnalyzerToolPage();
    }
  }

  if (pageId === "tool-tc-shift") {
    initTcShiftToolPage();
    if (typeof window.activateTcShiftToolPage === "function") {
      window.activateTcShiftToolPage();
    }
  }

  if (pageId === "tool-patient-counter") {
    initPatientCounterToolPage();
    if (typeof window.activatePatientCounterToolPage === "function") {
      window.activatePatientCounterToolPage();
    }
  }

  if (pageId === "tool-tic-monitor") {
    initTicMonitorToolPage();
    if (typeof window.activateTicMonitorToolPage === "function") {
      window.activateTicMonitorToolPage();
    }
  }

  if (pageId === "daily-tic-sweep") {
    initTicSweepToolPage();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initBackgroundFallback();
  bindMenuEvents();
  bindSidebarToggle();
  bindServiceHome();
  initServiceClock();
  applySidebarState();
  setPage(state.currentPageId);
});

window.addEventListener("mouseup", () => {
  document.querySelectorAll(".selection-box,.drag-selection-box,.selection-rect").forEach((el) => {
    try {
      el.remove();
    } catch (e) {
      // Ignore cleanup race conditions from selection helpers.
    }
  });
});
