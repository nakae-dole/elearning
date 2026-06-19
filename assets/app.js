(() => {
  const GAS_URL = "https://script.google.com/macros/s/AKfycbx0cjxI9LdOLk_sgiK1FzQONZZXuun9WAJ8yUE4cMoaWI1XOlg8KWiCfF_P6xiIYSs/exec";
  const STORAGE_KEYS = {
    lessons: "nakae_lessons_v1",
    feedback: "nakae_feedback_v1",
    liked: "nakae_liked_lessons_v1"
  };
  const LOGO_URL = "https://img2.pic.in.th/.5767ec9fdaa5699b.png";

  const defaultLessons = [
    {
      id: "starter-1",
      title: "ชุดการเรียนรู้สำหรับผู้เรียน กศน. อำเภอนาแก",
      url: "https://github.com/nakae-dole",
      image: LOGO_URL,
      likes: 0,
      createdAt: "2026-06-19T00:00:00.000Z"
    },
    {
      id: "starter-2",
      title: "คลังสื่อการเรียนรู้ออนไลน์ Nakae To Share",
      url: "https://github.com/nakae-dole",
      image: LOGO_URL,
      likes: 0,
      createdAt: "2026-06-19T00:00:00.000Z"
    }
  ];

  const readJson = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  };

  const writeJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  const normalizeLesson = (lesson) => ({
    id: String(lesson.id || crypto.randomUUID()),
    title: String(lesson.title || "บทเรียนออนไลน์"),
    url: String(lesson.url || "#"),
    image: String(lesson.image || lesson.imageUrl || LOGO_URL),
    likes: Number(lesson.likes || lesson.satisfaction || 0),
    createdAt: lesson.createdAt || new Date().toISOString()
  });

  const normalizeFeedback = (item) => ({
    id: String(item.id || crypto.randomUUID()),
    name: String(item.name || "ไม่ระบุชื่อ"),
    message: String(item.message || ""),
    createdAt: item.createdAt || new Date().toISOString()
  });

  const escapeHtml = (value) =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const postToGas = async (action, payload = {}) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2500);
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });
    window.clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`GAS ${response.status}`);
    }
    const data = await response.json();
    if (data && data.ok === false) {
      throw new Error(data.message || "GAS request failed");
    }
    return data;
  };

  const getLessons = async () => {
    const localLessons = readJson(STORAGE_KEYS.lessons, null);
    try {
      const data = await postToGas("listLessons");
      const remoteLessons = Array.isArray(data.lessons) ? data.lessons.map(normalizeLesson) : [];
      if (remoteLessons.length > 0) {
        writeJson(STORAGE_KEYS.lessons, remoteLessons);
        return remoteLessons;
      }
    } catch {
      // Static fallback
    }
    return (localLessons || defaultLessons).map(normalizeLesson);
  };

  const saveLesson = async (lesson) => {
    const newLesson = normalizeLesson({ ...lesson, id: crypto.randomUUID(), likes: 0 });
    const lessons = await getLessons();
    const nextLessons = [newLesson, ...lessons];
    writeJson(STORAGE_KEYS.lessons, nextLessons);
    try {
      await postToGas("addLesson", { lesson: newLesson });
    } catch {
      return { lesson: newLesson, synced: false };
    }
    return { lesson: newLesson, synced: true };
  };

  const likeLesson = async (lessonId) => {
    const liked = readJson(STORAGE_KEYS.liked, {});
    if (liked[lessonId]) {
      return { skipped: true };
    }
    const lessons = await getLessons();
    const nextLessons = lessons.map((lesson) =>
      lesson.id === lessonId ? { ...lesson, likes: lesson.likes + 1 } : lesson
    );
    writeJson(STORAGE_KEYS.lessons, nextLessons);
    liked[lessonId] = true;
    writeJson(STORAGE_KEYS.liked, liked);
    try {
      await postToGas("satisfaction", { lessonId });
    } catch {
      return { skipped: false, synced: false, lessons: nextLessons };
    }
    return { skipped: false, synced: true, lessons: nextLessons };
  };

  const getFeedback = async () => {
    const localFeedback = readJson(STORAGE_KEYS.feedback, []);
    try {
      const data = await postToGas("listFeedback");
      const remoteFeedback = Array.isArray(data.feedback) ? data.feedback.map(normalizeFeedback) : [];
      if (remoteFeedback.length > 0) {
        writeJson(STORAGE_KEYS.feedback, remoteFeedback);
        return remoteFeedback;
      }
    } catch {
      // Static fallback
    }
    return localFeedback.map(normalizeFeedback);
  };

  const saveFeedback = async (feedback) => {
    const newFeedback = normalizeFeedback({ ...feedback, id: crypto.randomUUID() });
    const feedbackItems = readJson(STORAGE_KEYS.feedback, []);
    writeJson(STORAGE_KEYS.feedback, [newFeedback, ...feedbackItems]);
    try {
      await postToGas("addFeedback", { feedback: newFeedback });
    } catch {
      return { feedback: newFeedback, synced: false };
    }
    return { feedback: newFeedback, synced: true };
  };

  const setStatus = (element, message, type = "") => {
    if (!element) return;
    element.textContent = message;
    element.className = `form-status${type ? ` is-${type}` : ""}`;
  };

  const formatDate = (value) => {
    try {
      return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value));
    } catch {
      return "";
    }
  };

  const renderLessons = (lessons) => {
    const grid = document.querySelector("#lessonGrid");
    if (!grid) return;
    const liked = readJson(STORAGE_KEYS.liked, {});
    grid.innerHTML = lessons
      .map((lesson) => {
        const disabled = liked[lesson.id] ? "disabled" : "";
        const buttonLabel = liked[lesson.id] ? "พึงพอใจแล้ว" : "พึงพอใจ";
        return `
          <article class="lesson-card">
            <a class="lesson-card__media" href="${escapeHtml(lesson.url)}" target="_blank" rel="noopener">
              <img src="${escapeHtml(lesson.image)}" alt="${escapeHtml(lesson.title)}" loading="lazy" onerror="this.src='${LOGO_URL}'">
            </a>
            <div class="lesson-card__body">
              <a class="lesson-card__title" href="${escapeHtml(lesson.url)}" target="_blank" rel="noopener">
                <h3>${escapeHtml(lesson.title)}</h3>
              </a>
              <button class="satisfaction-button" type="button" data-like="${lesson.id}" ${disabled}>
                <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21.4 10.6 20C5.4 15.3 2 12.2 2 8.4A5.4 5.4 0 0 1 7.5 3c1.8 0 3.5.8 4.5 2.1A5.7 5.7 0 0 1 16.5 3 5.4 5.4 0 0 1 22 8.4c0 3.8-3.4 6.9-8.6 11.6L12 21.4Z"/></svg>
                <span>${buttonLabel} ${lesson.likes}</span>
              </button>
            </div>
          </article>
        `;
      })
      .join("");
    document.querySelector("#lessonCount").textContent = String(lessons.length);
    document.querySelector("#likeTotal").textContent = String(lessons.reduce((sum, item) => sum + item.likes, 0));
  };

  const initMainPage = async () => {
    const lessons = await getLessons();
    renderLessons(lessons);

    document.querySelector("#lessonGrid")?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-like]");
      if (!button) return;
      button.disabled = true;
      const result = await likeLesson(button.dataset.like);
      if (result.skipped) return;
      renderLessons(result.lessons || (await getLessons()));
    });

    document.querySelector("#feedbackForm")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const status = document.querySelector("#feedbackStatus");
      const formData = new FormData(form);
      setStatus(status, "กำลังส่งข้อความ...");
      const result = await saveFeedback({
        name: formData.get("name") || "ไม่ระบุชื่อ",
        message: formData.get("message")
      });
      form.reset();
      setStatus(
        status,
        result.synced ? "ส่งข้อเสนอแนะเรียบร้อยแล้ว" : "บันทึกในเครื่องนี้แล้ว และจะซิงก์เมื่อระบบปลายทางพร้อม",
        "success"
      );
    });
  };

  window.NakaeStore = {
    getLessons,
    saveLesson,
    getFeedback,
    saveFeedback,
    postToGas,
    setStatus,
    formatDate,
    escapeHtml,
    LOGO_URL
  };

  if (!document.body.dataset.page) {
    initMainPage();
  }
})();
