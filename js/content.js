function renderMainContent(pageId) {
  const mainContent = document.getElementById("mainContent");
  if (!mainContent) return;

  const page = pageContent[pageId];

  if (!page) {
    mainContent.innerHTML = `
      <div class="card section-card">
        <h2 class="section-title">未找到页面</h2>
        <div class="content-text">当前 pageId = ${pageId}，但没有对应内容。</div>
      </div>
    `;
    return;
  }

  let html = "";

  const heroStyle = page.hero.image
    ? `style="--hero-image: url('${page.hero.image}')"`
    : "";

  html += `
    <section class="card hero-card" ${heroStyle}>
      <div class="hero-tag">${page.hero.tag || ""}</div>
      <div class="hero-title">${page.hero.title || ""}</div>
      <div class="hero-desc">${page.hero.desc || ""}</div>
    </section>
  `;

  (page.sections || []).forEach((section) => {
    if (section.type === "text") {
      html += `
        <section class="card section-card">
          <h2 class="section-title">${section.title}</h2>
          <div class="content-text">${section.content}</div>
        </section>
      `;
    }

    if (section.type === "grid") {
      html += `
        <section class="card section-card">
          <h2 class="section-title">${section.title}</h2>
          <div class="info-grid">
            ${(section.items || [])
              .map(
                (item) => `
                  <div class="info-tile">
                    <div class="info-tile-label">${item.label}</div>
                    <div class="info-tile-value">${item.value}</div>
                  </div>
                `
              )
              .join("")}
          </div>
        </section>
      `;
    }

    if (section.type === "toolLinks") {
      html += `
        <section class="card section-card feature-section-card">
          <h2 class="section-title">${section.title}</h2>
          <div class="feature-link-grid">
            ${(section.items || [])
              .map(
                (item) => `
                  <button class="feature-link-card" type="button" data-page-id="${item.pageId}">
                    <span class="feature-link-text">
                      <span class="feature-link-title">${item.label}</span>
                      <span class="feature-link-desc">${item.desc || ""}</span>
                    </span>
                    <span class="feature-link-icon" aria-hidden="true">${item.icon || "›"}</span>
                  </button>
                `
              )
              .join("")}
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

  mainContent.innerHTML = html;
  bindMainContentNavigation(mainContent);
}

function bindMainContentNavigation(mainContent) {
  mainContent.querySelectorAll("[data-page-id]").forEach((item) => {
    item.addEventListener("click", () => {
      if (typeof setPage === "function") {
        setPage(item.dataset.pageId);
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

  let html = "";

  page.side.forEach((block) => {
    html += `
      <section class="card side-card">
        <h3 class="side-card-title">${block.title}</h3>
        <div class="side-list">
          ${(block.items || [])
            .map(
              (item) => `
                <div class="side-list-item">
                  <span class="notice-badge">INFO</span>${item}
                </div>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  });

  sideContent.innerHTML = html;
}