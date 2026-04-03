const state = {
  currentPageId: "home",
  openParentId: null
};

function setPage(pageId) {
  state.currentPageId = pageId;

  const parentId = findParentIdByChildId(pageId);
  if (parentId) {
    state.openParentId = parentId;
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
        toggleParentMenu(pageId);
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
  setPage(state.currentPageId);
  console.log("App initialized");
});