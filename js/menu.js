function findParentIdByChildId(childId) {
  for (const item of menuData) {
    if (item.children) {
      const found = item.children.find((child) => child.id === childId);
      if (found) {
        return item.id;
      }
    }
  }
  return null;
}

function renderMenu(currentPageId, openParentId) {
  const menuContainer = document.getElementById("menuContainer");
  if (!menuContainer) return;

  const parentOfCurrent = findParentIdByChildId(currentPageId);
  let html = "";

  menuData.forEach((item) => {
    const isDirectActive = item.id === currentPageId;
    const isParentOpen =
      item.id === openParentId || item.id === parentOfCurrent;

    html += `<div class="menu-group">`;

    html += `
      <button
        class="menu-item ${isDirectActive ? "active" : ""} ${isParentOpen ? "parent-open" : ""}"
        data-id="${item.id}"
        data-type="${item.children ? "parent" : "page"}"
      >
        ${item.title}
      </button>
    `;

    if (item.children && isParentOpen) {
      html += `<div class="submenu-list">`;

      item.children.forEach((child) => {
        const isChildActive = child.id === currentPageId;

        html += `
          <button
            class="submenu-item ${isChildActive ? "active" : ""}"
            data-id="${child.id}"
            data-parent-id="${item.id}"
            data-type="child"
          >
            ${child.title}
          </button>
        `;
      });

      html += `</div>`;
    }

    html += `</div>`;
  });

  menuContainer.innerHTML = html;
}