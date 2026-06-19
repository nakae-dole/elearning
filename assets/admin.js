(() => {
  const ADMIN_PASSWORD = "admin0";
  // ฝัง API Key ลงในโค้ดเลยตามที่ผู้ใช้ต้องการ
  const HARDCODED_PIC_API_KEY = "chv_1t5c_7329b0dbbf291216cce38dbe57bfe8a6f99152ea968e559b857bb25cb556c6a5_a85b485c8109b0986994d2461f94f2058117981bc5eda36eabc4e27e7c967947";
  const FEEDBACK_PAGE_SIZE = 8;

  let lessons = [];
  let feedback = [];
  let feedbackPage = 1;

  const store = window.NakaeStore;
  const loginPanel = document.querySelector("#loginPanel");
  const dashboard = document.querySelector("#adminDashboard");
  const logoutButton = document.querySelector("#logoutButton");

  const isLoggedIn = () => sessionStorage.getItem("nakae_admin") === "true";

  const showDashboard = async () => {
    loginPanel.classList.add("hidden");
    dashboard.classList.remove("hidden");
    logoutButton.classList.remove("hidden");
    await refreshDashboard();
  };

  const showLogin = () => {
    loginPanel.classList.remove("hidden");
    dashboard.classList.add("hidden");
    logoutButton.classList.add("hidden");
  };

  const refreshDashboard = async () => {
    lessons = await store.getLessons();
    feedback = await store.getFeedback();
    renderAdminLessons();
    renderFeedback();
  };

  const renderAdminLessons = () => {
    const list = document.querySelector("#adminLessons");
    if (!list) return;
    if (lessons.length === 0) {
      list.innerHTML = `<p class="form-status">ยังไม่มีบทเรียน</p>`;
      return;
    }
    list.innerHTML = lessons
      .map(
        (lesson) => `
          <article class="admin-item">
            <a href="${store.escapeHtml(lesson.url)}" target="_blank" rel="noopener">${store.escapeHtml(lesson.title)}</a>
            <span>ความพึงพอใจ ${lesson.likes} ครั้ง</span>
            <span>${store.escapeHtml(lesson.image)}</span>
          </article>
        `
      )
      .join("");
  };

  const renderFeedback = () => {
    const list = document.querySelector("#feedbackList");
    const label = document.querySelector("#feedbackPageLabel");
    const prev = document.querySelector("#prevFeedback");
    const next = document.querySelector("#nextFeedback");
    const totalPages = Math.max(1, Math.ceil(feedback.length / FEEDBACK_PAGE_SIZE));
    feedbackPage = Math.min(feedbackPage, totalPages);
    const start = (feedbackPage - 1) * FEEDBACK_PAGE_SIZE;
    const items = feedback.slice(start, start + FEEDBACK_PAGE_SIZE);

    label.textContent = `${feedbackPage} / ${totalPages}`;
    prev.disabled = feedbackPage <= 1;
    next.disabled = feedbackPage >= totalPages;

    if (!items.length) {
      list.innerHTML = `<p class="form-status">ยังไม่มีข้อเสนอแนะ</p>`;
      return;
    }

    list.innerHTML = items
      .map(
        (item) => `
          <article class="feedback-item">
            <strong>${store.escapeHtml(item.name)}</strong>
            <p>${store.escapeHtml(item.message)}</p>
            <span>${store.formatDate(item.createdAt)}</span>
          </article>
        `
      )
      .join("");
  };

  const uploadToPic = async (apiKey, file) => {
    const body = new FormData();
    body.append("source", file);
    
    // วิ่งผ่าน CORS Proxy เพือให้ส่ง Header ข้ามโดเมนได้
    const response = await fetch("https://corsproxy.io/?https://pic.in.th/api/1/upload", {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body
    });
    
    const data = await response.json();
    if (!response.ok || data.status_code >= 400) {
      throw new Error(data.error?.message || data.message || "Upload failed");
    }
    return (
      data.image?.url ||
      data.image?.display_url ||
      data.image?.url_viewer ||
      data.data?.url ||
      data.url
    );
  };

  document.querySelector("#loginForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#loginStatus");
    const password = new FormData(event.currentTarget).get("password");
    if (password !== ADMIN_PASSWORD) {
      store.setStatus(status, "รหัสผ่านไม่ถูกต้อง", "error");
      return;
    }
    sessionStorage.setItem("nakae_admin", "true");
    await showDashboard();
  });

  logoutButton?.addEventListener("click", () => {
    sessionStorage.removeItem("nakae_admin");
    showLogin();
  });

  document.querySelector("#refreshButton")?.addEventListener("click", refreshDashboard);

  document.querySelector("#lessonForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.querySelector("#lessonStatus");
    const formData = new FormData(form);
    store.setStatus(status, "กำลังเพิ่มบทเรียน...");
    const result = await store.saveLesson({
      title: formData.get("title"),
      url: formData.get("url"),
      image: formData.get("image") || store.LOGO_URL
    });
    form.reset();
    store.setStatus(
      status,
      result.synced ? "เพิ่มบทเรียนเรียบร้อยแล้ว" : "เพิ่มในเครื่องนี้แล้ว และจะซิงก์เมื่อระบบปลายทางพร้อม",
      "success"
    );
    await refreshDashboard();
  });

  document.querySelector("#uploadForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.querySelector("#uploadStatus");
    const file = new FormData(form).get("image");

    if (!file || file.size === 0) {
      store.setStatus(status, "กรุณาเลือกไฟล์ภาพ", "error");
      return;
    }

    try {
      store.setStatus(status, "กำลังอัปโหลดภาพ...");
      // ใช้ API Key ที่ฝังไว้ในโค้ด
      const imageUrl = await uploadToPic(HARDCODED_PIC_API_KEY, file);
      document.querySelector("#imageUrlInput").value = imageUrl;
      store.setStatus(status, "อัปโหลดสำเร็จและเติมลิงก์ภาพให้แล้ว", "success");
      form.querySelector('input[type="file"]').value = "";
    } catch (error) {
      store.setStatus(status, `อัปโหลดไม่สำเร็จ: ${error.message}`, "error");
    }
  });

  document.querySelector("#prevFeedback")?.addEventListener("click", () => {
    feedbackPage = Math.max(1, feedbackPage - 1);
    renderFeedback();
  });

  document.querySelector("#nextFeedback")?.addEventListener("click", () => {
    feedbackPage += 1;
    renderFeedback();
  });

  // ซ่อนช่องกรอก API Key เพื่อไม่ให้ครูที่ใช้งานสับสน
  const apiKeyInput = document.querySelector("#picApiKey");
  if (apiKeyInput) {
    const parentLabel = apiKeyInput.closest("label");
    if (parentLabel) parentLabel.style.display = "none";
  }
  const rememberKey = document.querySelector("#rememberKey");
  if (rememberKey) {
    const parentCheckbox = rememberKey.closest(".checkbox-line");
    if (parentCheckbox) parentCheckbox.style.display = "none";
  }

  if (isLoggedIn()) {
    showDashboard();
  } else {
    showLogin();
  }
})();
