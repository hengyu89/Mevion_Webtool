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