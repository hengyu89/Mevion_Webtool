const state = {
  currentPageId: "home",
  openParentId: null,
  sidebarCollapsed: true
};

function setPage(pageId) {
  state.currentPageId = pageId;

  const parentId = findParentIdByChildId(pageId);
  if (parentId) {
    state.openParentId = parentId;
  } else {
    state.openParentId = null;
  }

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

      setPage(pageId);
      return;
    }

    if (type === "child" || type === "page") {
      setPage(pageId);
    }
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

function initPageModule(pageId) {
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
}

document.addEventListener("DOMContentLoaded", () => {
  initBackgroundFallback();
  bindMenuEvents();
  bindSidebarToggle();
  applySidebarState();
  setPage(state.currentPageId);
  console.log("App initialized");
});

document.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.querySelector(".menu-toggle-btn");
  if (!toggleBtn) return;

  const homeBtn = document.createElement("button");
  homeBtn.className = "menu-toggle-btn home-nav-btn";
  homeBtn.innerHTML = "⌂";
  homeBtn.title = "Home";
  homeBtn.style.marginTop = "4px";

  const downloadBtn = document.createElement("a");
  downloadBtn.className = "menu-toggle-btn download-nav-btn";
  downloadBtn.href = "./downloads/TJH_Tool_v1.0.zip";
  downloadBtn.download = "TJH_Tool_v1.0.zip";
  downloadBtn.title = "下载当前 Webtool zip";
  downloadBtn.setAttribute("aria-label", "下载当前 Webtool zip");
  downloadBtn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v11"></path>
      <path d="M7.5 9.5 12 14l4.5-4.5"></path>
      <path d="M5 18h14"></path>
    </svg>
  `;

  toggleBtn.insertAdjacentElement("afterend", homeBtn);
  homeBtn.insertAdjacentElement("afterend", downloadBtn);

  homeBtn.addEventListener("click", () => {
    if (typeof setPage === "function") {
      setPage("home");
    } else {
      location.hash = "#home";
    }
  });
});

window.addEventListener("mouseup", () => {
  document.querySelectorAll(
    ".selection-box,.drag-selection-box,.selection-rect"
  ).forEach(el => {
    try {
      el.remove();
    } catch(e){}
  });
});
