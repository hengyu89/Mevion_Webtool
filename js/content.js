/* global pageContent, setPage */

const pageDomCache = new Map();

function buildToolDirectoryButtonHtml(item) {
  const tone = String(item.tone || "default").replace(/[^a-z0-9-]/gi, "");
  return `
    <button class="tool-directory-link tool-directory-tone-${tone}" type="button" data-page-id="${item.pageId}">
      <span class="tool-directory-link-icon" aria-hidden="true">${item.icon || "•"}</span>
      <span class="tool-directory-link-text">
        <span class="tool-directory-link-title">${item.label}</span>
        <span class="tool-directory-link-desc">${item.desc || ""}</span>
      </span>
    </button>
  `;
}

function buildCopyListHtml(items) {
  return `
    <div class="copy-list-scroll">
      <div class="copy-list">
        ${(items || []).map((item) => `
          <div class="copy-list-row">
            <span class="copy-list-label">${item.label}</span>
            <code class="copy-list-value" title="${item.value}">${item.value}</code>
            <button
              class="copy-value-btn"
              type="button"
              title="复制"
              aria-label="复制 ${item.label}"
            ><span aria-hidden="true">⧉</span></button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function buildUpdateHistoryHtml(history) {
  if (!Array.isArray(history) || !history.length) return "";
  return `
    <div class="update-history-control">
      <button class="update-history-trigger" type="button"
        aria-describedby="homeUpdateHistory" title="查看历史更新" aria-label="查看历史更新">
        <span aria-hidden="true">↺</span>
      </button>
      <div id="homeUpdateHistory" class="update-history-popover" role="tooltip">
        <strong>历史更新</strong>
        <div class="update-history-list">
          ${history
            .map(
              (entry) => `
                <div class="update-history-entry">
                  <div class="update-history-meta">
                    <b>${entry.version || ""}</b>
                    <time>${entry.date || ""}</time>
                  </div>
                  <div>${entry.content || ""}</div>
                </div>
              `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function buildMainContentHtml(pageId) {
  const page = pageContent[pageId];

  if (!page) {
    return `
      <div class="card section-card">
        <h2 class="section-title">未找到页面</h2>
        <div class="content-text">当前 pageId = ${pageId}，但没有对应内容。</div>
      </div>
    `;
  }

  let html = "";
  const heroStyle = page.hero.image ? `style="--hero-image: url('${page.hero.image}')"` : "";
  const toolSwitcherHtml = buildToolStatusSwitcherHtml(pageId);

  html += `
    <section class="card hero-card" ${heroStyle}>
      <div class="hero-main-block">
        <div class="hero-tag">${page.hero.tag || ""}</div>
        <div class="hero-title-row">
          <div class="hero-title">${page.hero.title || ""}</div>
          ${toolSwitcherHtml}
        </div>
        <div class="hero-desc">${page.hero.desc || ""}</div>
      </div>
    </section>
  `;

  (page.sections || []).forEach((section) => {
    if (section.type === "text") {
      html += `
        <section class="card section-card ${section.history?.length ? "update-section-card" : ""}">
          <h2 class="section-title">${section.title}</h2>
          ${buildUpdateHistoryHtml(section.history)}
          <div class="content-text">${section.content}</div>
        </section>
      `;
    }

    if (section.type === "grid") {
      html += `
        <section class="card section-card">
          <h2 class="section-title">${section.title}</h2>
          <div class="info-grid">
            ${(section.items || []).map((item) => `
              <div class="info-tile">
                <div class="info-tile-label">${item.label}</div>
                <div class="info-tile-value">${item.value}</div>
              </div>
            `).join("")}
          </div>
        </section>
      `;
    }

    if (section.type === "toolLinks") {
      html += `
        <section class="card section-card feature-section-card ${section.title === "新功能" ? "feature-section-new" : ""}">
          <h2 class="section-title">${section.title}</h2>
          <div class="feature-link-grid">
            ${(section.items || []).map((item) => `
              <button class="feature-link-card" type="button" data-page-id="${item.pageId}">
                <span class="feature-link-text">
                  <span class="feature-link-title">${item.label}</span>
                  <span class="feature-link-desc">${item.desc || ""}</span>
                </span>
                <span class="feature-link-icon" aria-hidden="true">${item.icon || "›"}</span>
              </button>
            `).join("")}
          </div>
        </section>
      `;
    }

    if (section.type === "toolDirectory") {
      html += `
        <section class="card section-card tool-directory-section">
          <h2 class="section-title">${section.title}</h2>
          <div class="tool-directory-grid">
            ${(section.columns || []).map((column) => {
              const directItems = (column.items || []).map(buildToolDirectoryButtonHtml).join("");
              const groups = (column.groups || []).map((group) => `
                <div class="tool-directory-group">
                  <h4 class="tool-directory-group-title">${group.title}</h4>
                  <div class="tool-directory-list">
                    ${(group.items || []).map(buildToolDirectoryButtonHtml).join("")}
                  </div>
                </div>
              `).join("");

              return `
                <div class="tool-directory-column">
                  <h3 class="tool-directory-column-title">${column.title}</h3>
                  <div class="tool-directory-column-body">
                    ${directItems ? `<div class="tool-directory-list">${directItems}</div>` : ""}
                    ${groups}
                    ${!directItems && !groups ? '<div class="tool-directory-empty" aria-hidden="true"></div>' : ""}
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </section>
      `;
    }

    if (section.type === "copyList") {
      html += `
        <section class="card section-card copy-list-section">
          <h2 class="section-title">${section.title}</h2>
          ${buildCopyListHtml(section.items)}
        </section>
      `;
    }

    if (section.type === "copyGroups") {
      html += `
        <section class="card section-card copy-groups-section">
          <h2 class="section-title">${section.title}</h2>
          <div class="copy-groups-stack">
            ${(section.groups || []).map((group) => `
              <section class="copy-group-panel">
                <h3 class="copy-group-title">${group.title}</h3>
                ${buildCopyListHtml(group.items)}
              </section>
            `).join("")}
          </div>
        </section>
      `;
    }

    if (section.type === "custom") {
      html += `
        <section class="card section-card">
          <h2 class="section-title">${section.title}</h2>
          <div id="${section.customId}"></div>
        </section>
      `;
    }
  });

  return html;
}

function buildToolStatusSwitcherHtml(pageId) {
  if (pageId !== "tools" && !String(pageId || "").startsWith("tool-")) return "";
  if (!window.ToolStatusRegistry || typeof window.ToolStatusRegistry.renderSwitcherHtml !== "function") return "";
  return window.ToolStatusRegistry.renderSwitcherHtml(pageId);
}

function renderMainContent(pageId) {
  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  let pageNode = pageDomCache.get(pageId);

  if (!pageNode) {
    pageNode = document.createElement("div");
    pageNode.className = "cached-page";
    pageNode.dataset.pageId = pageId;
    pageNode.innerHTML = buildMainContentHtml(pageId);
    bindMainContentNavigation(pageNode);
    bindToolStatusSwitcherNavigation(pageNode);
    pageDomCache.set(pageId, pageNode);
    mainContent.appendChild(pageNode);
  }

  pageDomCache.forEach((node, cachedPageId) => {
    node.hidden = cachedPageId !== pageId;
  });

  if (window.ToolStatusRegistry && typeof window.ToolStatusRegistry.updateActive === "function") {
    window.ToolStatusRegistry.updateActive(pageId);
  }
}

function bindMainContentNavigation(mainContent) {
  mainContent.querySelectorAll("[data-page-id]").forEach((item) => {
    item.addEventListener("click", () => {
      if (typeof setPage === "function") {
        setPage(item.dataset.pageId);
      }
    });
  });

  mainContent.querySelectorAll(".copy-value-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      const row = button.closest(".copy-list-row");
      const value = row?.querySelector(".copy-list-value")?.textContent || "";
      const copied = await copyPlainText(value);
      const icon = button.querySelector("span");

      button.classList.toggle("copy-failed", !copied);
      button.classList.toggle("copied", copied);
      button.title = copied ? "已复制" : "复制失败";
      if (icon) icon.textContent = copied ? "✓" : "!";

      window.setTimeout(() => {
        button.classList.remove("copied", "copy-failed");
        button.title = "复制";
        if (icon) icon.textContent = "⧉";
      }, 1200);
    });
  });
}

async function copyPlainText(value) {
  if (!value) return false;

  try {
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (error) {
    // Fall through to the offline-compatible copy path.
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    // Keep the default false result when the legacy copy API is unavailable.
  }

  textarea.remove();
  return copied;
}

function bindToolStatusSwitcherNavigation(mainContent) {
  mainContent.querySelectorAll(".tool-status-switcher").forEach((switcher) => {
    switcher.addEventListener("click", (event) => {
      const btn = event.target.closest("button[data-tool-page-id]");
      if (!btn) return;
      if (typeof setPage === "function") {
        setPage(btn.dataset.toolPageId);
      }
    });
  });
}

function renderSideContent(pageId) {
  const sideContent = document.getElementById("sideContent");
  if (!sideContent) return;

  const page = pageContent[pageId];
  if (!page || !page.side) {
    sideContent.innerHTML = `
      <section class="card side-card">
        <h3 class="side-card-title">附带内容</h3>
        <div class="empty-text">暂无附带内容。</div>
      </section>
    `;
    return;
  }

  sideContent.innerHTML = (page.side || []).map((block) => `
    <section class="card side-card">
      <h3 class="side-card-title">${block.title}</h3>
      <div class="side-list">
        ${(block.items || []).map((item) => `
          <div class="side-list-item">
            <span class="notice-badge">INFO</span>${item}
          </div>
        `).join("")}
      </div>
    </section>
  `).join("");
}
