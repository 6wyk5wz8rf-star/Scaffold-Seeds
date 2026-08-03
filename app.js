(function () {
  "use strict";

  const DATA = window.SCAFFOLD_DATA;
  const STORAGE = {
    library: "scaffold-seeds.library.v1",
    settings: "scaffold-seeds.settings.v1",
    reflections: "scaffold-seeds.reflections.v1",
    draft: "scaffold-seeds.draft.v1"
  };

  const defaultSettings = {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    defaultPaper: "a4",
    defaultColour: "colour",
    defaultStage: "sprout"
  };

  const state = {
    view: "home",
    createStep: 0,
    library: readStore(STORAGE.library, []),
    settings: { ...defaultSettings, ...readStore(STORAGE.settings, {}) },
    reflections: readStore(STORAGE.reflections, {}),
    draft: normaliseDraft(readStore(STORAGE.draft, null)),
    activeScaffold: null,
    libraryFilters: { query: "", year: "all", subject: "all", favourite: false },
    knowledgeSubject: "english",
    print: {
      paper: "a4",
      orientation: "portrait",
      colour: "colour",
      teacherGuidance: true,
      answers: false,
      largePrint: false,
      photocopy: false,
      pageOrder: ["resource", "teacher"]
    }
  };

  state.print.paper = state.settings.defaultPaper;
  state.print.colour = state.settings.defaultColour;
  if (!state.activeScaffold && state.library.length) state.activeScaffold = state.library[0];

  const main = document.getElementById("main-content");
  const modalLayer = document.getElementById("modal-layer");
  const toastRegion = document.getElementById("toast-region");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("sidebar-scrim");

  const viewMeta = {
    home: ["Your thinking space", "Home"],
    create: ["Design with purpose", "Create"],
    library: ["Your saved practice", "Library"],
    knowledge: ["Professional knowledge", "Knowledge"],
    print: ["Classroom-ready output", "Print Studio"],
    settings: ["Make it yours", "Settings"]
  };

  const icons = {
    home: '<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10M9 20v-6h6v6"/></svg>',
    create: '<svg viewBox="0 0 24 24"><path d="M12 21V9M12 15c-4.5 0-7-2.6-7-6.5 4.2-.4 7 2 7 6.5ZM12 11c0-4 2.6-6.4 7-6.4 0 4-2.6 6.4-7 6.4Z"/></svg>',
    library: '<svg viewBox="0 0 24 24"><path d="M4 4h5v16H4zM10 4h5v16h-5zM16 5l4-1 2 15-4 1z"/></svg>',
    knowledge: '<svg viewBox="0 0 24 24"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23zM20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/></svg>',
    print: '<svg viewBox="0 0 24 24"><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    spark: '<svg viewBox="0 0 24 24"><path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8ZM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8ZM19 13l.7 1.8 1.8.7-1.8.7L19 18l-.7-1.8-1.8-.7 1.8-.7Z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M12 17V5m0 0 5 5m-5-5-5 5M5 21h14"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="m6 15 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    brain: '<svg viewBox="0 0 24 24"><path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.2A3.5 3.5 0 0 0 4 14a3.5 3.5 0 0 0 5.5 4.5M14.5 4.5A3.5 3.5 0 0 1 18 8v.2a3.5 3.5 0 0 1 2 5.8 3.5 3.5 0 0 1-5.5 4.5M12 3v18M8 11h4M12 15h4"/></svg>'
  };

  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStore(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      toast("Browser storage is unavailable. Your changes remain in this session.");
      return false;
    }
  }

  function normaliseDraft(saved) {
    return {
      year: saved?.year || "Year 4",
      subject: saved?.subject || "mathematics",
      topic: saved?.topic || "Fractions",
      objective: saved?.objective || "Recognise and show equivalent fractions",
      phase: saved?.phase || "Guided practice",
      situation: saved?.situation || "",
      selectedBarriers: saved?.selectedBarriers || [],
      analysis: saved?.analysis || [],
      recommendations: saved?.recommendations || [],
      engineId: saved?.engineId || "",
      preferredEngine: saved?.preferredEngine || "",
      stage: saved?.stage || defaultSettings.defaultStage,
      title: saved?.title || "",
      vocabulary: saved?.vocabulary || "",
      misconception: saved?.misconception || "",
      intention: saved?.intention || "Keep the core thinking with pupils while making the route into the task clear.",
      tags: saved?.tags || "",
      editingId: saved?.editingId || null
    };
  }

  function saveDraft() {
    writeStore(STORAGE.draft, state.draft);
  }

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function uid() {
    return "ss-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function titleCase(text) {
    return String(text || "").replace(/(^|[-\s])\w/g, match => match.toUpperCase()).replaceAll("-", " ");
  }

  function icon(name) {
    return icons[name] || icons.spark;
  }

  function hydrateIcons(root = document) {
    root.querySelectorAll("[data-icon]").forEach(el => {
      el.innerHTML = icon(el.dataset.icon);
    });
  }

  function subjectById(id) {
    return DATA.subjects.find(subject => subject.id === id) || DATA.subjects[0];
  }

  function engineById(id) {
    return DATA.engines.find(engine => engine.id === id) || DATA.engines[0];
  }

  function barrierById(id) {
    return DATA.barriers.find(barrier => barrier.id === id);
  }

  function curriculumEntries(subjectId = state.draft.subject, year = state.draft.year) {
    return subjectById(subjectId).entries.filter(entry => entry.years.includes(year));
  }

  function currentEntry(draft = state.draft) {
    return subjectById(draft.subject).entries.find(entry => entry.title === draft.topic && entry.years.includes(draft.year)) || curriculumEntries(draft.subject, draft.year)[0];
  }

  function formatDate(dateValue) {
    const date = new Date(dateValue);
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function relativeDate(dateValue) {
    const days = Math.floor((Date.now() - new Date(dateValue).getTime()) / 86400000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return formatDate(dateValue);
  }

  function toast(message) {
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    toastRegion.appendChild(item);
    setTimeout(() => item.remove(), 3200);
  }

  function applySettings() {
    document.body.classList.toggle("high-contrast", state.settings.highContrast);
    document.body.classList.toggle("large-text", state.settings.largeText);
    document.body.classList.toggle("reduce-motion", state.settings.reduceMotion);
  }

  function navigate(view, options = {}) {
    if (!viewMeta[view]) return;
    state.view = view;
    document.querySelectorAll(".nav-item").forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    document.getElementById("section-kicker").textContent = viewMeta[view][0];
    document.getElementById("section-title").textContent = viewMeta[view][1];
    render();
    closeSidebar();
    if (options.focus !== false) main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: state.settings.reduceMotion ? "auto" : "smooth" });
  }

  function render() {
    const renderers = { home: renderHome, create: renderCreate, library: renderLibrary, knowledge: renderKnowledge, print: renderPrintStudio, settings: renderSettings };
    main.innerHTML = `<div class="view-enter">${renderers[state.view]()}</div>`;
    hydrateIcons(main);
  }

  function openSidebar() {
    sidebar.classList.add("is-open");
    scrim.hidden = false;
    document.getElementById("menu-button").setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    scrim.hidden = true;
    document.getElementById("menu-button").setAttribute("aria-expanded", "false");
  }

  function newScaffold(preset = {}) {
    state.draft = normaliseDraft({ ...preset, stage: preset.stage || state.settings.defaultStage });
    state.createStep = 0;
    saveDraft();
    navigate("create");
  }

  function renderHome() {
    const todayKey = new Date().toISOString().slice(0, 10);
    const inspiration = DATA.inspiration[Math.abs(new Date().getDate() + new Date().getMonth()) % DATA.inspiration.length];
    const recent = [...state.library].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4);
    const favouriteEngineIds = [...new Set(state.library.filter(item => item.favourite).map(item => item.engineId))];
    ["reasoning-ladder", "worked-example", "vocabulary-builder"].forEach(id => { if (favouriteEngineIds.length < 3 && !favouriteEngineIds.includes(id)) favouriteEngineIds.push(id); });
    const favouriteEngines = favouriteEngineIds.slice(0, 3).map(engineById);
    const recentHTML = recent.length
      ? `<div class="recent-list">${recent.map(item => `
          <button class="recent-row" data-action="open-scaffold" data-id="${esc(item.id)}">
            <span class="recent-symbol">${icon("create")}</span>
            <span><h4>${esc(item.title)}</h4><p>${esc(item.year)} · ${esc(subjectById(item.subject).name)} · ${esc(engineById(item.engineId).name)}</p></span>
            <span class="quiet-note">${relativeDate(item.updatedAt)}</span>
          </button>`).join("")}</div>`
      : `<div class="empty-help"><span class="empty-mark">${icon("create")}</span><h4>Your first seed starts here</h4><p>Describe one place where pupils are getting stuck. The library will grow naturally as you save useful supports.</p><button class="button button-soft" data-action="new-scaffold">Create your first scaffold</button></div>`;

    return `
      <section class="hero" aria-labelledby="home-heading">
        <div class="hero-copy">
          <span class="eyebrow">Thoughtful support · lasting independence</span>
          <h2 id="home-heading">Remove the barrier.<br><em>Preserve the challenge.</em></h2>
          <p>Design temporary, curriculum-aware supports that help pupils enter ambitious learning—and then learn to manage without them.</p>
          <div class="hero-actions">
            <button class="button button-primary" data-action="new-scaffold"><span data-icon="create"></span> Begin with a barrier</button>
            <button class="button" data-view="knowledge"><span data-icon="knowledge"></span> Explore the knowledge</button>
          </div>
        </div>
        <div class="hero-question">
          <span>The question beneath every scaffold</span>
          <p>Where are pupils getting stuck?</p>
        </div>
      </section>

      <div class="dashboard-grid">
        <div class="dashboard-main">
          <section class="panel panel-pad">
            <div class="panel-header"><div><h3>Quick start</h3><p>Begin from a common classroom need</p></div></div>
            <div class="quick-grid">
              <button class="quick-card" data-action="quick-start" data-preset="explain">
                <span class="card-icon">${icon("brain")}</span><h4>They understand—but cannot explain</h4><p>Explore reasoning, vocabulary and explanation barriers.</p>
              </button>
              <button class="quick-card" data-action="quick-start" data-preset="overload">
                <span class="card-icon">${icon("library")}</span><h4>There is too much to hold at once</h4><p>Reduce working-memory demand while retaining decisions.</p>
              </button>
              <button class="quick-card" data-action="quick-start" data-preset="independence">
                <span class="card-icon">${icon("create")}</span><h4>They rely on adult prompts</h4><p>Build planning and self-monitoring towards independence.</p>
              </button>
            </div>
          </section>

          <section class="panel panel-pad">
            <div class="panel-header"><div><h3>Recent scaffolds</h3><p>Continue refining work that mattered</p></div>${recent.length ? '<button class="text-link" data-view="library">View library</button>' : ""}</div>
            ${recentHTML}
          </section>
          <section class="panel panel-pad">
            <div class="panel-header"><div><h3>Favourite scaffold engines</h3><p>${state.library.some(item => item.favourite) ? "Drawn from the scaffolds you have marked as useful" : "Three versatile places to begin"}</p></div></div>
            <div class="engine-strip">${favouriteEngines.map((engine, index) => `<button class="engine-mini" data-action="quick-engine" data-id="${engine.id}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(engine.name)}</strong><small>${esc(engine.tagline)}</small></button>`).join("")}</div>
          </section>
        </div>

        <div class="dashboard-side">
          <section class="panel panel-pad inspiration">
            <span class="eyebrow">Today’s inspiration</span>
            <blockquote>${esc(inspiration.quote)}</blockquote>
            <cite>${esc(inspiration.note)}</cite>
          </section>

          <section class="panel panel-pad">
            <div class="panel-header"><div><h3>Teaching reflection</h3><p>A private note saved only on this device</p></div></div>
            <label class="form-label" for="daily-reflection">What support could become lighter tomorrow?</label>
            <textarea class="reflection-input" id="daily-reflection" data-reflection-date="${todayKey}" placeholder="A small observation is enough…">${esc(state.reflections[todayKey] || "")}</textarea>
            <div class="reflection-footer"><span class="quiet-note">No account. No cloud.</span><button class="button button-compact" data-action="save-reflection">Save reflection</button></div>
          </section>
        </div>
      </div>`;
  }

  function renderCreate() {
    const stepNames = ["Context", "The barrier", "Analysis", "Design", "Review"];
    const content = [renderContextStep, renderSituationStep, renderAnalysisStep, renderDesignStep, renderReviewStep][state.createStep]();
    const summary = state.draft.objective
      ? `<div class="context-summary"><h4>Current context</h4><p>${esc(state.draft.year)} · ${esc(subjectById(state.draft.subject).name)}<br>${esc(state.draft.objective)}</p></div>`
      : "";
    return `
      <div class="page-heading"><div><span class="eyebrow">A calm, five-part process</span><h2>Design from the barrier</h2><p>Start with what pupils need to think about—not with a pre-selected sheet.</p></div></div>
      <div class="create-layout">
        <section class="create-card" aria-label="Scaffold creation step ${state.createStep + 1} of 5">${content}</section>
        <aside class="create-rail">
          <div class="progress-card"><h3>Your path</h3><div class="step-list">
            ${stepNames.map((name, index) => `<div class="step-item ${index === state.createStep ? "is-active" : index < state.createStep ? "is-complete" : ""}"><span class="step-dot">${index < state.createStep ? "✓" : index + 1}</span><span>${name}</span></div>`).join("")}
          </div></div>
          ${summary}
        </aside>
      </div>`;
  }

  function createHead(number, title, copy) {
    return `<div class="create-card-head"><span class="step-number">${number}</span><div><h2>${esc(title)}</h2><p>${esc(copy)}</p></div></div>`;
  }

  function stepFooter({ back = true, nextLabel = "Continue", nextAction = "create-next", extra = "" } = {}) {
    return `<div class="create-card-footer"><div>${back ? '<button class="button button-ghost" data-action="create-back"><span data-icon="back"></span> Back</button>' : ""}${extra}</div><button class="button button-primary" data-action="${nextAction}">${esc(nextLabel)} <span data-icon="arrow"></span></button></div>`;
  }

  function renderContextStep() {
    const entries = curriculumEntries();
    if (!entries.some(entry => entry.title === state.draft.topic)) {
      state.draft.topic = entries[0]?.title || "";
      state.draft.objective = entries[0]?.objectives[0] || "";
    }
    const entry = currentEntry();
    if (entry && !entry.objectives.includes(state.draft.objective)) state.draft.objective = entry.objectives[0];
    return `${createHead(1, "Set the learning context", "A little precision here makes every later recommendation more useful.")}
      <div class="create-card-body"><div class="form-grid">
        <div class="form-field"><label for="year">Year group</label><div class="select-wrap"><select id="year" data-draft-field="year">${DATA.years.map(year => `<option ${year === state.draft.year ? "selected" : ""}>${esc(year)}</option>`).join("")}</select></div></div>
        <div class="form-field"><label for="subject">Subject</label><div class="select-wrap"><select id="subject" data-draft-field="subject">${DATA.subjects.map(subject => `<option value="${subject.id}" ${subject.id === state.draft.subject ? "selected" : ""}>${esc(subject.name)}</option>`).join("")}</select></div></div>
        <div class="form-field"><label for="topic">Curriculum area</label><div class="select-wrap"><select id="topic" data-draft-field="topic">${entries.map(item => `<option ${item.title === state.draft.topic ? "selected" : ""}>${esc(item.title)}</option>`).join("")}</select></div></div>
        <div class="form-field"><label for="phase">Lesson phase</label><div class="select-wrap"><select id="phase" data-draft-field="phase">${DATA.lessonPhases.map(phase => `<option ${phase === state.draft.phase ? "selected" : ""}>${esc(phase)}</option>`).join("")}</select></div></div>
        <div class="form-field span-2"><label for="objective">Learning objective <small>— curriculum-informed and fully editable</small></label><div class="select-wrap"><select id="objective" data-draft-field="objective">${(entry?.objectives || []).map(objective => `<option ${objective === state.draft.objective ? "selected" : ""}>${esc(objective)}</option>`).join("")}</select></div><input class="input" id="custom-objective" data-draft-field="objective" value="${esc(state.draft.objective)}" aria-label="Edit learning objective"><span class="field-hint">Use the wording that pupils will encounter in this lesson.</span></div>
      </div></div>
      ${stepFooter({ back: false, nextLabel: "Describe the barrier" })}`;
  }

  function renderSituationStep() {
    return `${createHead(2, "Where are pupils getting stuck?", "Describe what pupils can already do and the precise moment the learning begins to break down.")}
      <div class="create-card-body">
        <div class="prompt-examples">
          <button class="example-chip" data-action="use-example">They understand equivalent fractions but struggle to explain why they are equivalent.</button>
          <button class="example-chip" data-action="use-example">They can identify persuasive techniques but cannot use them naturally in their own writing.</button>
          <button class="example-chip" data-action="use-example">They understand evaporation but confuse it with boiling when they explain a change.</button>
        </div>
        <div class="form-field"><label for="situation">What do you notice?</label><textarea id="situation" class="situation-field" data-draft-field="situation" maxlength="800" placeholder="They can… but when they need to…">${esc(state.draft.situation)}</textarea><span class="counter">Specific observations lead to better scaffolds</span></div>
        <div class="thinking-note">${icon("brain")}<span>Include existing strengths. A scaffold should begin exactly where independent success ends—not earlier.</span></div>
      </div>
      ${stepFooter({ nextLabel: "Analyse the barrier", nextAction: "analyse-barrier" })}`;
  }

  function renderAnalysisStep() {
    if (!state.draft.analysis.length) analyseBarrier();
    const selected = state.draft.selectedBarriers;
    const recommended = state.draft.recommendations.map(engineById);
    return `${createHead(3, "Consider the likely barrier", "These are reasoned suggestions, not labels. Keep, remove or add what matches your pupils.")}
      <div class="create-card-body">
        <div class="analysis-intro"><span class="analysis-mark">${icon("brain")}</span><div><h3>The difficulty may sit in more than one place</h3><p>Recommendations combine your description with the curriculum demand and common misconceptions for this area.</p></div></div>
        <div class="analysis-section"><h3>Likely barriers</h3><p>Select the barriers that best explain what you observe.</p><div class="barrier-grid">
          ${state.draft.analysis.map((result, index) => {
            const barrier = barrierById(result.id);
            return `<button class="barrier-card ${selected.includes(result.id) ? "is-selected" : ""}" data-action="toggle-barrier" data-id="${result.id}" aria-pressed="${selected.includes(result.id)}"><span class="barrier-icon">${icon(index % 2 ? "knowledge" : "brain")}</span><span><h4>${esc(barrier.name)}</h4><p>${esc(result.reason || barrier.hint)}</p></span><span class="confidence">${index < 2 ? "Strong fit" : "Possible"}</span></button>`;
          }).join("")}
        </div><button class="text-link" data-action="show-all-barriers">+ Review all barrier types</button></div>
        <div class="analysis-section"><h3>Recommended scaffold engines</h3><p>Each uses a different structure. Choose the one that preserves the most important thinking.</p><div class="engine-recommendations">
          ${recommended.map((engine, index) => `<button class="engine-card ${state.draft.engineId === engine.id ? "is-selected" : ""}" data-action="choose-engine" data-id="${engine.id}" aria-pressed="${state.draft.engineId === engine.id}">${index === 0 ? '<span class="best-fit">Best fit</span>' : ""}<span class="engine-number">${String(index + 1).padStart(2, "0")}</span><h4>${esc(engine.name)}</h4><p>${esc(engine.tagline)}</p></button>`).join("")}
        </div><button class="text-link" data-action="show-all-engines">Browse all 15 engines</button></div>
      </div>
      ${stepFooter({ nextLabel: "Shape the scaffold" })}`;
  }

  function renderDesignStep() {
    const engine = engineById(state.draft.engineId);
    const entry = currentEntry();
    const vocabulary = state.draft.vocabulary || entry?.vocabulary.join(", ") || "";
    const misconception = state.draft.misconception || entry?.misconceptions[0] || "";
    if (!state.draft.title) state.draft.title = `${state.draft.topic}: ${engine.name}`;
    if (!state.draft.vocabulary) state.draft.vocabulary = vocabulary;
    if (!state.draft.misconception) state.draft.misconception = misconception;
    return `${createHead(4, "Shape the support", `${engine.name} · ${engine.tagline}`)}
      <div class="create-card-body">
        <span class="form-label">Choose the point on the fading pathway</span>
        <div class="stage-path" role="radiogroup" aria-label="Support stage">
          ${DATA.stages.map(stage => `<button class="stage-option ${stage.id === state.draft.stage ? "is-selected" : ""}" role="radio" aria-checked="${stage.id === state.draft.stage}" data-action="choose-stage" data-id="${stage.id}"><span class="stage-glyph">${stage.glyph}</span><strong>${stage.name}</strong><small>${stage.support}</small></button>`).join("")}
        </div>
        <div class="design-fields">
          <div class="form-field"><label for="scaffold-title">Resource title</label><input class="input" id="scaffold-title" data-draft-field="title" value="${esc(state.draft.title)}"></div>
          <div class="form-grid">
            <div class="form-field"><label for="vocabulary">High-leverage vocabulary</label><textarea id="vocabulary" data-draft-field="vocabulary" rows="3">${esc(vocabulary)}</textarea><span class="field-hint">Keep the list small enough to be used.</span></div>
            <div class="form-field"><label for="misconception">Misconception to expose</label><textarea id="misconception" data-draft-field="misconception" rows="3">${esc(misconception)}</textarea></div>
          </div>
          <div class="form-field"><label for="intention">Teacher intention</label><textarea id="intention" data-draft-field="intention" rows="3">${esc(state.draft.intention)}</textarea></div>
          <div class="form-field"><label for="tags">Library tags <small>— separated by commas</small></label><input class="input" id="tags" data-draft-field="tags" value="${esc(state.draft.tags)}" placeholder="fractions, guided group, explanation"></div>
        </div>
      </div>
      ${stepFooter({ nextLabel: "Build and review", nextAction: "generate-scaffold" })}`;
  }

  function renderReviewStep() {
    const scaffold = state.activeScaffold || scaffoldFromDraft();
    const audit = qualityAudit(scaffold);
    return `${createHead(5, "Review the finished scaffold", "Check the support, the preserved thinking and the route towards independence before it reaches pupils.")}
      <div class="create-card-body">
        <div class="preview-workspace">
          <div class="paper-wrap">${renderResourceDocument(scaffold)}</div>
          <aside class="preview-tools">
            <button class="button button-primary" data-action="save-scaffold"><span data-icon="check"></span> Save to library</button>
            <button class="button" data-action="open-print"><span data-icon="print"></span> Open Print Studio</button>
            <button class="button" data-action="ai-prompt"><span data-icon="spark"></span> Enhance with AI</button>
            <div class="audit-panel"><h3>Quality audit</h3><div class="audit-list">${audit.map(item => `<div class="audit-item"><span class="check">✓</span><span>${esc(item)}</span></div>`).join("")}</div></div>
          </aside>
        </div>
      </div>
      ${stepFooter({ nextLabel: "Edit design", nextAction: "edit-design", extra: '<button class="button button-ghost" data-action="start-again">Start a new scaffold</button>' })}`;
  }

  function analyseBarrier() {
    const text = `${state.draft.situation} ${state.draft.objective}`.toLowerCase();
    const entry = currentEntry();
    const scores = new Map(DATA.barriers.map(barrier => [barrier.id, 0]));
    DATA.barriers.forEach(barrier => {
      barrier.keywords.forEach(keyword => {
        if (text.includes(keyword)) scores.set(barrier.id, scores.get(barrier.id) + 3);
      });
    });
    (entry?.barriers || []).forEach((id, index) => scores.set(id, scores.get(id) + 5 - index));
    if (/can|understand|identify/.test(text) && /but|however|struggle|cannot|can't/.test(text)) scores.set("explanation", scores.get("explanation") + 2);
    if (/why|because|justify|evidence|equivalent/.test(text)) scores.set("reasoning", scores.get("reasoning") + 4);
    if (/confus|misconception|same as/.test(text)) scores.set("conceptual", scores.get("conceptual") + 4);
    if (/adult|prompt|independent|start/.test(text)) {
      scores.set("planning", scores.get("planning") + 3);
      scores.set("self-monitoring", scores.get("self-monitoring") + 2);
    }
    const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    state.draft.analysis = ranked.map(([id], index) => ({
      id,
      reason: index < 3 ? analysisReason(id, entry) : barrierById(id).hint
    }));
    state.draft.selectedBarriers = ranked.slice(0, 3).map(([id]) => id);
    updateRecommendations();
    saveDraft();
  }

  function analysisReason(id, entry) {
    const subject = subjectById(state.draft.subject).name;
    const reasons = {
      knowledge: `${subject} knowledge needed for this objective may not yet be secure enough to retrieve while working.`,
      vocabulary: `The language of ${state.draft.topic.toLowerCase()} may be limiting understanding or precise expression.`,
      reading: "Text or instruction demand may be obscuring the intended subject thinking.",
      conceptual: `The description suggests a fragile connection beneath an apparently successful procedure or response.`,
      representation: "A carefully chosen model may reveal a structure that words alone are not making visible.",
      "working-memory": "Pupils may understand each part but lose the thread while coordinating several parts at once.",
      reasoning: "Pupils appear to need a bridge between what they notice, the evidence they use and the conclusion they reach.",
      organisation: "The ideas may be available but not yet grouped or sequenced into a usable structure.",
      planning: "The start point and next decision may need to become visible without pre-solving the task.",
      writing: "Recording demands may be consuming attention needed for the intended curriculum thinking.",
      explanation: "Understanding may be present, but the causal or logical connection is not yet explicit.",
      attention: "A smaller visual field or a deliberate noticing cue may help pupils return to what matters.",
      "self-monitoring": "A brief check routine may replace repeated adult reassurance and correction.",
      chronology: "Relationships between sequence, duration and change may need to be held together visually.",
      comparison: "A shared criterion may be needed so comparison becomes analytical rather than two separate descriptions."
    };
    return reasons[id] || entry?.misconceptions?.[0] || barrierById(id).hint;
  }

  function updateRecommendations() {
    const chosen = state.draft.selectedBarriers;
    const subject = state.draft.subject;
    state.draft.recommendations = DATA.engines
      .map(engine => {
        const barrierScore = engine.barriers.reduce((total, id) => total + (chosen.includes(id) ? 4 : 0), 0);
        const subjectScore = engine.subjects.includes("all") || engine.subjects.includes(subject) ? 3 : 0;
        return { id: engine.id, score: barrierScore + subjectScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.id);
    if (state.draft.preferredEngine && !state.draft.recommendations.includes(state.draft.preferredEngine)) state.draft.recommendations[2] = state.draft.preferredEngine;
    if (state.draft.preferredEngine) state.draft.engineId = state.draft.preferredEngine;
    else if (!state.draft.recommendations.includes(state.draft.engineId)) state.draft.engineId = state.draft.recommendations[0];
  }

  function scaffoldFromDraft() {
    const entry = currentEntry();
    const engine = engineById(state.draft.engineId);
    const now = new Date().toISOString();
    const existing = state.draft.editingId ? state.library.find(item => item.id === state.draft.editingId) : null;
    return {
      id: existing?.id || uid(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      favourite: existing?.favourite || false,
      year: state.draft.year,
      subject: state.draft.subject,
      topic: state.draft.topic,
      objective: state.draft.objective,
      phase: state.draft.phase,
      situation: state.draft.situation,
      barriers: [...state.draft.selectedBarriers],
      engineId: engine.id,
      stage: state.draft.stage,
      title: state.draft.title || `${state.draft.topic}: ${engine.name}`,
      vocabulary: (state.draft.vocabulary || entry?.vocabulary.join(", ") || "").split(",").map(item => item.trim()).filter(Boolean).slice(0, 8),
      misconception: state.draft.misconception || entry?.misconceptions[0] || "",
      intention: state.draft.intention,
      tags: state.draft.tags.split(",").map(item => item.trim()).filter(Boolean).slice(0, 8)
    };
  }

  function supportText(scaffold, seed, sprout, growth, independent) {
    return { seed, sprout, growth, independent }[scaffold.stage] || sprout;
  }

  function blankLines(count = 3) {
    return `<div class="write-lines">${Array.from({ length: count }, () => "<span></span>").join("")}</div>`;
  }

  function resourceFrame(scaffold, body) {
    const subject = subjectById(scaffold.subject);
    const engine = engineById(scaffold.engineId);
    const stage = DATA.stages.find(item => item.id === scaffold.stage) || DATA.stages[1];
    return `<article class="paper" data-page="resource">
      <div class="paper-brand">Scaffold Seeds · ${esc(engine.name)}</div>
      <div class="resource-meta"><span>${esc(scaffold.year)}</span><span>${esc(subject.name)}</span><span>${esc(scaffold.topic)}</span><span>${esc(stage.name)} · ${esc(stage.support)}</span></div>
      <h1>${esc(scaffold.title)}</h1>
      <p class="resource-objective"><strong>Learning focus:</strong> ${esc(scaffold.objective)}</p>
      <div class="resource-body">${body}</div>
      <footer class="resource-footer"><span>Name ____________________</span><span>Scaffold designed to fade</span></footer>
    </article>`;
  }

  function renderResourceDocument(scaffold) {
    const renderers = {
      "vocabulary-builder": renderVocabularyBuilder,
      "vocabulary-network": renderVocabularyNetwork,
      "inference-bridge": renderInferenceBridge,
      "paragraph-planner": renderParagraphPlanner,
      "sentence-ladder": renderSentenceLadder,
      "worked-example": renderWorkedExample,
      "representation-selector": renderRepresentationSelector,
      "reasoning-ladder": renderReasoningLadder,
      "observation-recorder": renderObservationRecorder,
      "evidence-builder": renderEvidenceBuilder,
      "chronology-builder": renderChronologyBuilder,
      "comparison-organiser": renderComparisonOrganiser,
      "algorithm-planner": renderAlgorithmPlanner,
      "metacognition-planner": renderMetacognitionPlanner,
      "vocabulary-preteach": renderVocabularyPreteach
    };
    const body = (renderers[scaffold.engineId] || renderReasoningLadder)(scaffold);
    return resourceFrame(scaffold, body);
  }

  function resourceWords(scaffold, minimum = 4) {
    const fallback = currentEntry({ ...state.draft, subject: scaffold.subject, year: scaffold.year, topic: scaffold.topic })?.vocabulary || ["key idea", "evidence", "explain", "check"];
    const words = [...(scaffold.vocabulary || []), ...fallback];
    return [...new Set(words)].slice(0, Math.max(minimum, 6));
  }

  function renderVocabularyBuilder(scaffold) {
    const words = resourceWords(scaffold, 4).slice(0, 4);
    return `<h2>Build words you can use</h2><div class="vocab-grid">${words.map(word => `<section class="vocab-box"><strong>${esc(word)}</strong><dl><dt>Meaning</dt><dd class="answer-content">${scaffold.stage === "seed" ? "Connect this word to the learning focus." : ""}</dd><dt>Example</dt><dd>${supportText(scaffold, "Use it in a complete idea.", "Sentence starter: This matters because…", "", "")}</dd><dt>Not this</dt><dd></dd></dl></section>`).join("")}</div><h2>Choose and connect</h2><p>${supportText(scaffold, "Use two of the words to explain the learning focus. Underline the connection between them.", "Choose two words. Explain how they connect.", "Which word carries the most important meaning here? Explain.", "Explain the idea precisely. Check that every subject word earns its place.")}</p>${blankLines(4)}`;
  }

  function renderVocabularyNetwork(scaffold) {
    const words = resourceWords(scaffold, 4).slice(0, 4);
    return `<h2>How does the language connect?</h2><div class="network"><div class="network-centre">${esc(scaffold.topic)}</div><div class="network-nodes">${words.map((word, index) => `<div class="network-node"><strong>${esc(word)}</strong><p>${supportText(scaffold, index === 0 ? "This connects because…" : "Link it to the centre." , "The connection is…", "Because…", "")}</p></div>`).join("")}</div></div><p><strong>Strongest connection:</strong> ${supportText(scaffold, "I think ___ and ___ belong together because…", "___ connects to ___ because…", "The most useful connection is…", "Review your network. Which connection deepens the concept?")}</p>${blankLines(2)}`;
  }

  function renderInferenceBridge(scaffold) {
    return `<h2>Cross from evidence to inference</h2><div class="bridge">
      <section class="bridge-step"><h3>1. Notice</h3><p>What exact word, action, detail or source feature can you point to?</p>${blankLines(5)}</section><div class="bridge-arrow">→</div>
      <section class="bridge-step"><h3>2. Connect</h3><p>${supportText(scaffold, "What do you already know that makes this detail meaningful?", "This suggests… because I know…", "What makes this evidence relevant?", "")}</p>${blankLines(5)}</section><div class="bridge-arrow">→</div>
      <section class="bridge-step"><h3>3. Infer</h3><p>${supportText(scaffold, "A careful inference is…", "Therefore, I infer…", "What conclusion is justified?", "State and justify your inference.")}</p>${blankLines(5)}</section></div>
      <h2>Test the bridge</h2><p>Could the evidence support another inference? What makes yours stronger?</p>${blankLines(2)}`;
  }

  function renderParagraphPlanner(scaffold) {
    const labels = scaffold.subject === "english" ? ["Purpose", "Main idea", "Develop", "Shape the ending"] : ["Point", "Evidence", "Explain", "Link"];
    const prompts = scaffold.stage === "seed"
      ? ["What must this paragraph help the reader understand?", "Write the central idea in one precise sentence.", "Add selected evidence, detail or an example. Explain why it matters.", "Return to the purpose without simply repeating."]
      : scaffold.stage === "sprout" ? ["My purpose is…", "The central idea is…", "This is shown by… This matters because…", "Therefore…"]
      : scaffold.stage === "growth" ? ["Purpose", "Idea", "Develop", "Connect"]
      : ["Before writing: can you state the purpose, sequence and ending aloud?"];
    return `<h2>Plan the thinking—not every sentence</h2><div class="paragraph-stack">${labels.map((label, index) => `<section class="paragraph-step"><strong>${esc(label)}</strong><div><small>${esc(prompts[Math.min(index, prompts.length - 1)] || "")}</small></div></section>`).join("")}</div><h2>Independence check</h2><p>Which box could you cover now and still write successfully? That is the next part to fade.</p>${blankLines(2)}`;
  }

  function renderSentenceLadder(scaffold) {
    const core = scaffold.vocabulary?.[0] || scaffold.topic;
    const rungs = [
      ["Core idea", `${core}…`],
      ["Add precision", supportText(scaffold, "Who or what? Choose the exact noun and verb.", "Choose a more precise noun or verb.", "Make one word more precise.", "")],
      ["Add a relationship", supportText(scaffold, "Show when, where, how or why.", "Add a clause that deepens meaning.", "Make the relationship clear.", "")],
      ["Read as a writer", supportText(scaffold, "Keep the addition only if it serves your purpose.", "Remove any detail that does not earn its place.", "Check rhythm, clarity and purpose.", "Review independently.")]
    ];
    return `<h2>Grow one deliberate choice at a time</h2><div class="ladder">${rungs.map(([label, prompt]) => `<section class="ladder-rung"><strong>${esc(label)}</strong><span>${esc(prompt)}</span>${blankLines(1)}</section>`).join("")}</div><h2>Final sentence</h2><div class="answer-space"></div>`;
  }

  function renderWorkedExample(scaffold) {
    const steps = ["Notice what the task is asking", "Choose the first useful representation or action", "Carry out the method and explain the decision", "Check the result against the original task"];
    const hideFrom = { seed: 4, sprout: 2, growth: 1, independent: 0 }[scaffold.stage];
    return `<h2>Study the decisions, then complete the thinking</h2><div class="worked-example"><section class="worked-column"><h3>Worked thinking</h3>${steps.map((step, index) => `<div class="worked-step"><span>${index + 1}</span><span class="${index >= hideFrom ? "" : "answer-content"}">${index < hideFrom ? esc(step) : "What would you do here—and why?"}</span></div>`).join("")}</section><section class="worked-column"><h3>Your parallel example</h3>${steps.map((step, index) => `<div class="worked-step"><span>${index + 1}</span><span>${supportText(scaffold, index === 0 ? "Identify the task." : "Follow the same kind of decision—not the same answer.", index < 2 ? "Use the model, then make your own choice." : "Explain your choice.", index === 0 ? "What matters first?" : "", "Plan, solve and check independently.")}</span></div>`).join("")}</section></div><h2>What should fade next?</h2><p>Circle the modelled step you no longer need to see.</p>`;
  }

  function renderRepresentationSelector(scaffold) {
    const representations = scaffold.subject === "mathematics" ? ["Concrete or diagram", "Number line or bar", "Symbols and notation"] : ["Labelled diagram", "Process model", "Words or data"];
    return `<h2>Which representation reveals the structure?</h2><div class="representation-grid">${representations.map((name, index) => `<section class="representation-card"><h3>${index + 1}. ${esc(name)}</h3><div class="representation-space"></div><p><strong>It shows…</strong></p><p><strong>It hides…</strong></p></section>`).join("")}</div><h2>Make a reasoned choice</h2><p>${supportText(scaffold, "The most useful representation is ___ because it makes ___ visible.", "I would choose ___ because…", "Which representation exposes the important relationship?", "Choose, use and evaluate a representation independently.")}</p>${blankLines(3)}`;
  }

  function renderReasoningLadder(scaffold) {
    const steps = [
      ["Notice", "What do you see, know or calculate?"],
      ["Connect", "Which detail, rule or relationship matters?"],
      ["Explain", "How does that connection support your idea?"],
      ["Justify", "Why should someone accept this conclusion?"],
      ["Test", "Does it always work? What might challenge it?"]
    ];
    const visible = { seed: 5, sprout: 4, growth: 2, independent: 1 }[scaffold.stage];
    return `<h2>Move from noticing to a defensible conclusion</h2><div class="reasoning-steps">${steps.map(([label, prompt], index) => `<section class="reasoning-step"><div><strong>${esc(label)}</strong><span>${index < visible ? esc(prompt) : "Use your own next reasoning move."}</span>${blankLines(index < 2 ? 1 : 2)}</div></section>`).join("")}</div>`;
  }

  function renderObservationRecorder(scaffold) {
    const cells = [["I see / measure", "Record only what can be observed or measured."], ["I notice a change", "Compare carefully with the start or another case."], ["I wonder", "Ask a question that could guide further observation."], ["I think this means", "Interpret the pattern. Link the claim to evidence."]];
    return `<h2>Observe before you explain</h2><div class="observation-grid">${cells.map(([title, prompt], index) => `<section class="observation-cell"><h3>${esc(title)}</h3><p>${scaffold.stage === "independent" && index < 3 ? "" : esc(prompt)}</p>${blankLines(4)}</section>`).join("")}</div><h2>Keep evidence and interpretation distinct</h2><p>Underline one observation. Draw an arrow to the idea it supports.</p>`;
  }

  function renderEvidenceBuilder(scaffold) {
    return `<h2>Build a chain that holds</h2><div class="evidence-chain"><section class="chain-card"><h3>Claim</h3><p>${supportText(scaffold, "My answer or interpretation is…", "I think…", "State a precise claim.", "")}</p>${blankLines(5)}</section><div class="chain-link">→</div><section class="chain-card"><h3>Evidence</h3><p>${supportText(scaffold, "The exact detail, result or source feature is…", "This is shown by…", "Choose the strongest evidence.", "")}</p>${blankLines(5)}</section><div class="chain-link">→</div><section class="chain-card"><h3>Reasoning</h3><p>${supportText(scaffold, "This evidence supports the claim because…", "This matters because…", "Make the connection explicit.", "")}</p>${blankLines(5)}</section></div><h2>Stress-test the chain</h2><p>Where is the weakest link? Strengthen it without adding irrelevant information.</p>${blankLines(2)}`;
  }

  function renderChronologyBuilder(scaffold) {
    return `<h2>Sequence, duration and change</h2><div class="timeline">${[1,2,3,4].map((number, index) => `<section class="timeline-event"><strong>${number}. ${supportText(scaffold, ["Beginning", "Development", "Turning point", "Outcome"][index], ["Before", "Then", "Later", "By the end"][index], "Event or period", "")}</strong><p>When?</p>${blankLines(2)}<p>What changed—or continued?</p>${blankLines(3)}</section>`).join("")}</div><h2>Read across the timeline</h2><p>${supportText(scaffold, "The most significant change was ___ because… One continuity was…", "What changed? What stayed?", "Explain one relationship across time.", "Construct an account using secure chronology.")}</p>${blankLines(2)}`;
  }

  function renderComparisonOrganiser(scaffold) {
    return `<h2>Compare through a shared lens</h2><p><strong>Comparison criterion:</strong> ${supportText(scaffold, "Choose one: structure · purpose · cause · impact · process", "We are comparing…", "", "Set a useful criterion.")}</p><div class="compare-grid"><section class="compare-side"><h3>Case A</h3><p>Relevant feature</p>${blankLines(5)}<p>Evidence or example</p>${blankLines(3)}</section><section class="compare-side"><h3>Case B</h3><p>The same relevant feature</p>${blankLines(5)}<p>Evidence or example</p>${blankLines(3)}</section><section class="compare-same"><h3>Meaningful comparison</h3><p>${supportText(scaffold, "Both ___, but ___. This matters because…", "Both… whereas…", "What pattern or contrast matters?", "Form and justify a comparison.")}</p>${blankLines(2)}</section></div>`;
  }

  function renderAlgorithmPlanner(scaffold) {
    const count = scaffold.stage === "independent" ? 4 : 6;
    return `<h2>Plan, test, improve</h2><div class="algorithm-flow">${Array.from({ length: count }, (_, index) => `<section class="algorithm-step"><span>${index + 1}</span><span>${supportText(scaffold, index === 0 ? "State the first precise instruction." : "What must happen next?", index === 0 ? "Start with…" : "Then…", "Instruction", "")}</span><span class="algorithm-check">Test: what should happen?</span></section>`).join("")}</div><h2>Debug deliberately</h2><p>Expected outcome: ____________________ &nbsp; Actual outcome: ____________________</p><p>${supportText(scaffold, "Change one step. Test again. Record what the change tells you.", "Which single step will you change?", "Locate, change, test.", "Debug and explain your revision.")}</p>${blankLines(2)}`;
  }

  function renderMetacognitionPlanner(scaffold) {
    const columns = [
      ["Plan", ["What is the goal?", "What do I already know?", "Which approach might fit?"]],
      ["Monitor", ["What is working?", "Where am I stuck?", "What could I change?"]],
      ["Evaluate", ["Did I meet the goal?", "What evidence shows this?", "What will I reuse next time?"]]
    ];
    const visible = { seed: 3, sprout: 2, growth: 1, independent: 0 }[scaffold.stage];
    return `<h2>Take charge of the process</h2><div class="metacognition">${columns.map(([title, prompts]) => `<section class="meta-column"><h3>${esc(title)}</h3>${prompts.map((prompt, index) => `<p>${index < visible ? esc(prompt) : ""}</p>${blankLines(2)}`).join("")}</section>`).join("")}</div><h2>Choose one self-prompt to keep</h2><p>Write the question that will help you most when the planner is removed.</p>${blankLines(2)}`;
  }

  function renderVocabularyPreteach(scaffold) {
    const words = resourceWords(scaffold, 4).slice(0, 4);
    return `<h2>Prepare a few words for high-leverage use</h2><div class="preteach">${words.map(word => `<section class="preteach-row"><div class="preteach-word">${esc(word)}</div><div class="preteach-box"><strong>See & say</strong><br>Pronunciation, word parts, visual cue</div><div class="preteach-box"><strong>Meaning</strong><br>Child-friendly meaning and useful contrast</div><div class="preteach-box"><strong>Use</strong><br>Oral rehearsal in today’s learning</div></section>`).join("")}</div><h2>Teacher release check</h2><p>Do pupils now recognise, understand and use each word? Remove the pre-teach card once the language works inside the lesson.</p>`;
  }

  function qualityAudit(scaffold) {
    const checks = [];
    if (scaffold.situation.length >= 20) checks.push("Begins from an observed pupil barrier, not a generic activity.");
    else checks.push("Targets a stated learning barrier within the selected curriculum context.");
    checks.push(`${engineById(scaffold.engineId).name} matches ${scaffold.barriers.map(id => barrierById(id)?.name.toLowerCase()).filter(Boolean).slice(0, 2).join(" and ") || "the identified need"}.`);
    checks.push("Leaves the central subject decision and explanation with the pupil.");
    checks.push(`${titleCase(scaffold.stage)} support has a visible next step towards independence.`);
    checks.push(`Vocabulary is limited to ${scaffold.vocabulary.length || "a small number of"} high-leverage terms.`);
    checks.push("Print structure is legible, calm and photocopy-safe.");
    return checks;
  }

  function renderLibrary() {
    const filters = state.libraryFilters;
    const filtered = state.library
      .filter(item => !filters.query || `${item.title} ${item.topic} ${item.objective} ${(item.tags || []).join(" ")}`.toLowerCase().includes(filters.query.toLowerCase()))
      .filter(item => filters.year === "all" || item.year === filters.year)
      .filter(item => filters.subject === "all" || item.subject === filters.subject)
      .filter(item => !filters.favourite || item.favourite)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const cards = filtered.map(item => `
      <article class="library-card">
        <div class="library-thumb"><div class="mini-paper"></div><button class="favourite-button ${item.favourite ? "is-active" : ""}" data-action="toggle-favourite" data-id="${esc(item.id)}" aria-label="${item.favourite ? "Remove from" : "Add to"} favourites" aria-pressed="${item.favourite}">${icon("heart")}</button></div>
        <div class="library-card-body"><h3 title="${esc(item.title)}">${esc(item.title)}</h3><p>${esc(item.year)} · ${esc(subjectById(item.subject).name)} · ${esc(engineById(item.engineId).name)}</p><div class="tag-row"><span class="tag">${esc(titleCase(item.stage))}</span>${(item.tags || []).slice(0, 3).map(tag => `<span class="tag">${esc(tag)}</span>`).join("")}</div>
          <div class="card-actions"><button class="button" data-action="open-scaffold" data-id="${esc(item.id)}"><span data-icon="eye"></span> Open</button><button class="icon-button" data-action="duplicate-scaffold" data-id="${esc(item.id)}" aria-label="Duplicate ${esc(item.title)}">${icon("copy")}</button><button class="icon-button" data-action="delete-scaffold" data-id="${esc(item.id)}" aria-label="Delete ${esc(item.title)}">${icon("trash")}</button></div>
        </div>
      </article>`).join("");
    return `
      <div class="page-heading"><div><span class="eyebrow">Saved on this device</span><h2>Your scaffold library</h2><p>Edit, duplicate and revisit support as pupils grow. A useful scaffold is a living classroom decision, not a finished worksheet.</p></div><button class="button button-primary" data-action="new-scaffold"><span data-icon="plus"></span> New scaffold</button></div>
      <div class="toolbar">
        <label class="search-field"><span data-icon="search"></span><input class="input" id="library-search" data-library-filter="query" value="${esc(filters.query)}" placeholder="Search titles, objectives or tags"><span class="visually-hidden"></span></label>
        <select data-library-filter="year" aria-label="Filter by year"><option value="all">All years</option>${DATA.years.map(year => `<option ${year === filters.year ? "selected" : ""}>${esc(year)}</option>`).join("")}</select>
        <select data-library-filter="subject" aria-label="Filter by subject"><option value="all">All subjects</option>${DATA.subjects.map(subject => `<option value="${subject.id}" ${subject.id === filters.subject ? "selected" : ""}>${esc(subject.name)}</option>`).join("")}</select>
        <button class="button ${filters.favourite ? "button-soft" : ""}" data-action="filter-favourites" aria-pressed="${filters.favourite}">${icon("heart")} Favourites</button>
      </div>
      ${state.library.length === 0 ? `<div class="empty-help"><span class="empty-mark">${icon("library")}</span><h4>A library built from real needs</h4><p>Your saved scaffolds will appear here with their year, subject, engine, fading stage and tags. Begin with one current pupil barrier.</p><button class="button button-primary" data-action="new-scaffold">Create a scaffold</button></div>` : filtered.length ? `<div class="library-grid">${cards}</div>` : `<div class="empty-help"><span class="empty-mark">${icon("search")}</span><h4>No scaffolds match these filters</h4><p>Clear one filter to widen the view. Nothing in your library has been removed.</p><button class="button" data-action="clear-library-filters">Clear filters</button></div>`}`;
  }

  function renderKnowledge() {
    const subject = subjectById(state.knowledgeSubject);
    const commonBarriers = [...new Set(subject.entries.flatMap(entry => entry.barriers))].map(barrierById).filter(Boolean);
    const yearCoverage = DATA.years.map(year => ({ year, entries: subject.entries.filter(entry => entry.years.includes(year)) })).filter(group => group.entries.length);
    return `
      <div class="page-heading"><div><span class="eyebrow">Built for England</span><h2>Professional knowledge</h2><p>A transparent foundation for curriculum-aware decisions. This is not a resource bank: it explains what each support is trying to protect.</p></div></div>
      <div class="knowledge-layout">
        <div class="subject-tabs" role="tablist" aria-label="Subjects">${DATA.subjects.map(item => `<button class="subject-tab ${item.id === subject.id ? "is-active" : ""}" style="--subject-colour:${item.colour}" role="tab" aria-selected="${item.id === subject.id}" data-action="knowledge-subject" data-id="${item.id}">${esc(item.name)}</button>`).join("")}</div>
        <section class="knowledge-content" style="--subject-colour:${subject.colour}">
          <div class="knowledge-hero"><span class="eyebrow">Subject lens</span><h3>${esc(subject.name)}</h3><p>${esc(subject.summary)}</p></div>
          <div class="knowledge-sections">
            <article class="knowledge-card"><h4>What strong scaffolding protects</h4><p>Subject-specific principles used by the recommendation and quality systems.</p><div class="knowledge-pills">${subject.principles.map(principle => `<span class="knowledge-pill">${esc(principle)}</span>`).join("")}</div></article>
            <article class="knowledge-card"><h4>Curriculum architecture</h4><p>Representative curriculum contexts establish the Build 1 structure. Later builds can deepen these without replacing the application.</p>${yearCoverage.map(group => `<div style="margin-top:10px"><span class="eyebrow">${esc(group.year)}</span><div class="knowledge-pills">${group.entries.map(entry => `<span class="knowledge-pill" title="${esc(entry.objectives.join(" · "))}">${esc(entry.title)}</span>`).join("")}</div></div>`).join("")}</article>
            <article class="knowledge-card"><h4>Barriers commonly worth investigating</h4><p>These are hypotheses about the task–pupil relationship, never fixed labels for a child.</p><div class="knowledge-pills">${commonBarriers.map(barrier => `<span class="knowledge-pill" title="${esc(barrier.hint)}">${esc(barrier.name)}</span>`).join("")}</div></article>
            <article class="knowledge-card"><h4>The fading pathway</h4><p>Every engine can carry a pupil from explicit support towards self-prompted independence.</p><div class="knowledge-pills">${DATA.stages.map(stage => `<span class="knowledge-pill"><strong>${stage.glyph} ${esc(stage.name)}</strong> · ${esc(stage.support)}</span>`).join("")}</div></article>
          </div>
        </section>
      </div>`;
  }

  function activeForPrint() {
    return state.activeScaffold || state.library[0] || null;
  }

  function paperClasses() {
    return [state.print.paper === "a5" ? "a5" : "", state.print.orientation === "landscape" ? "landscape" : "", state.print.colour === "greyscale" ? "greyscale" : "", state.print.photocopy ? "photocopy" : "", state.print.largePrint ? "large-print" : "", state.print.answers ? "" : "hide-answers"].filter(Boolean).join(" ");
  }

  function applyPaperOptions(html) {
    const classes = paperClasses();
    return html.replace('class="paper"', `class="paper ${classes}"`);
  }

  function renderTeacherGuide(scaffold) {
    const stage = DATA.stages.find(item => item.id === scaffold.stage);
    const nextStageIndex = DATA.stages.findIndex(item => item.id === scaffold.stage) + 1;
    const nextStage = DATA.stages[nextStageIndex];
    const barriers = scaffold.barriers.map(barrierById).filter(Boolean);
    return `<article class="paper teacher-page ${paperClasses()}" data-page="teacher"><div class="paper-brand">Scaffold Seeds · Teacher guidance</div><div class="resource-meta"><span>${esc(scaffold.year)}</span><span>${esc(subjectById(scaffold.subject).name)}</span><span>${esc(engineById(scaffold.engineId).name)}</span></div><h1>Using this scaffold well</h1><p class="resource-objective"><strong>${esc(scaffold.title)}</strong> · ${esc(scaffold.objective)}</p><div class="teacher-guide-grid">
      <section class="guide-block"><h3>Observed barrier</h3><p>${esc(scaffold.situation)}</p><ul>${barriers.map(barrier => `<li><strong>${esc(barrier.name)}:</strong> ${esc(barrier.hint)}</li>`).join("")}</ul></section>
      <section class="guide-block"><h3>Teaching intention</h3><p>${esc(scaffold.intention)}</p><p><strong>Preserve:</strong> the pupil’s choice, explanation and evaluation. Prompt access without supplying the conclusion.</p></section>
      <section class="guide-block"><h3>Watch for</h3><p>${esc(scaffold.misconception || "Listen for language or actions that reveal an insecure underlying connection.")}</p><p><strong>Useful language:</strong> ${esc((scaffold.vocabulary || []).join(", "))}</p></section>
      <section class="guide-block"><h3>Plan the fade</h3><p><strong>Current:</strong> ${esc(stage.name)} · ${esc(stage.description)}</p><p><strong>Next:</strong> ${nextStage ? `${esc(nextStage.name)} · ${esc(nextStage.description)}` : "Ask the pupil to name the self-prompt they will keep when the page is removed."}</p></section>
      <section class="guide-block"><h3>In-the-moment check</h3><ul><li>Is the scaffold helping the pupil begin?</li><li>Is it leaving the intellectual work intact?</li><li>Which prompt can be covered or removed now?</li></ul></section>
      <section class="guide-block"><h3>After the lesson</h3><p>Note what the pupil did once support was lighter. Reuse the structure only if the same barrier remains.</p>${blankLines(4)}</section>
    </div><footer class="resource-footer"><span>Teacher copy</span><span>Remove the barrier · preserve the challenge</span></footer></article>`;
  }

  function renderPrintPage(scaffold, type, index) {
    const html = type === "resource" ? applyPaperOptions(renderResourceDocument(scaffold)) : renderTeacherGuide(scaffold);
    return `<div class="page-shell"><div class="page-controls"><span>Page ${index + 1} · ${type === "resource" ? "Pupil resource" : "Teacher guidance"}</span><div><button data-action="move-page" data-id="${type}" data-direction="up" aria-label="Move page up">${icon("up")}</button><button data-action="move-page" data-id="${type}" data-direction="down" aria-label="Move page down">${icon("down")}</button></div></div>${html}</div>`;
  }

  function renderPrintStudio() {
    const scaffold = activeForPrint();
    if (!scaffold) {
      return `<div class="page-heading"><div><span class="eyebrow">Classroom-ready output</span><h2>Print Studio</h2><p>Control the pupil page and teacher guidance before printing.</p></div></div><div class="empty-help"><span class="empty-mark">${icon("print")}</span><h4>Bring a scaffold here when it is ready</h4><p>Create a scaffold first. Print Studio will then manage paper size, orientation, colour, answers and page order intentionally.</p><button class="button button-primary" data-action="new-scaffold">Create a scaffold</button></div>`;
    }
    const order = state.print.pageOrder.filter(type => type !== "teacher" || state.print.teacherGuidance);
    return `<div class="page-heading"><div><span class="eyebrow">Classroom-ready output</span><h2>Print Studio</h2><p>Preview exactly what will print. Reorder pages, simplify presentation and separate pupil material from teacher guidance.</p></div></div>
      <div class="studio-layout"><aside class="studio-controls"><h3>Print choices</h3>
        <div class="control-group"><h4>Paper size</h4><div class="segmented">${["a4","a5"].map(value => `<button class="${state.print.paper === value ? "is-active" : ""}" data-print-option="paper" data-value="${value}">${value.toUpperCase()}</button>`).join("")}</div></div>
        <div class="control-group"><h4>Orientation</h4><div class="segmented">${["portrait","landscape"].map(value => `<button class="${state.print.orientation === value ? "is-active" : ""}" data-print-option="orientation" data-value="${value}">${titleCase(value)}</button>`).join("")}</div></div>
        <div class="control-group"><h4>Ink</h4><div class="segmented">${["colour","greyscale"].map(value => `<button class="${state.print.colour === value ? "is-active" : ""}" data-print-option="colour" data-value="${value}">${titleCase(value)}</button>`).join("")}</div></div>
        <div class="control-group"><div class="switch-row"><span>Teacher guidance</span><button class="switch" role="switch" aria-checked="${state.print.teacherGuidance}" data-print-toggle="teacherGuidance"></button></div><div class="switch-row"><span>Model answers</span><button class="switch" role="switch" aria-checked="${state.print.answers}" data-print-toggle="answers"></button></div><div class="switch-row"><span>Large print</span><button class="switch" role="switch" aria-checked="${state.print.largePrint}" data-print-toggle="largePrint"></button></div><div class="switch-row"><span>Photocopy-friendly</span><button class="switch" role="switch" aria-checked="${state.print.photocopy}" data-print-toggle="photocopy"></button></div></div>
        <button class="button button-primary" data-action="print-now"><span data-icon="print"></span> Print ${order.length} page${order.length === 1 ? "" : "s"}</button>
      </aside><div class="page-stack">${order.map((type, index) => renderPrintPage(scaffold, type, index)).join("")}</div></div>`;
  }

  function renderSettings() {
    return `<div class="page-heading"><div><span class="eyebrow">Quietly adaptable</span><h2>Settings</h2><p>Accessibility, print defaults and local data controls. Nothing leaves this browser.</p></div></div><div class="settings-grid">
      <section class="settings-card"><h3>Reading and interaction</h3><p>Adjust the interface without changing resource content.</p><div class="settings-list">
        ${settingSwitch("High contrast", "Stronger edges and darker text throughout the application.", "highContrast")}
        ${settingSwitch("Large interface text", "Increase reading size while preserving layout hierarchy.", "largeText")}
        ${settingSwitch("Reduce motion", "Remove transitions and animated entrances.", "reduceMotion")}
      </div></section>
      <section class="settings-card"><h3>New scaffold defaults</h3><p>Start closer to the choices you make most often.</p><div class="settings-list">
        <div class="settings-row"><span><strong>Starting support stage</strong><small>You can still change this during creation.</small></span><select data-setting-select="defaultStage">${DATA.stages.map(item => `<option value="${item.id}" ${item.id === state.settings.defaultStage ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></div>
        <div class="settings-row"><span><strong>Default paper</strong><small>Used when Print Studio first opens.</small></span><select data-setting-select="defaultPaper"><option value="a4" ${state.settings.defaultPaper === "a4" ? "selected" : ""}>A4</option><option value="a5" ${state.settings.defaultPaper === "a5" ? "selected" : ""}>A5</option></select></div>
        <div class="settings-row"><span><strong>Default ink</strong><small>Colour can always be changed per print.</small></span><select data-setting-select="defaultColour"><option value="colour" ${state.settings.defaultColour === "colour" ? "selected" : ""}>Colour</option><option value="greyscale" ${state.settings.defaultColour === "greyscale" ? "selected" : ""}>Greyscale</option></select></div>
      </div></section>
      <section class="settings-card"><h3>Local data</h3><p>Back up or move your library without creating an account.</p><div class="settings-list"><div class="settings-row"><span><strong>Export a backup</strong><small>Download scaffolds, settings and reflections as JSON.</small></span><button class="button button-compact" data-action="export-data"><span data-icon="download"></span> Export</button></div><div class="settings-row"><span><strong>Import a backup</strong><small>Restore a Scaffold Seeds JSON backup.</small></span><label class="button button-compact" for="import-file"><span data-icon="upload"></span> Import</label><input class="file-input" type="file" id="import-file" accept="application/json" data-action="import-data"></div></div></section>
      <section class="settings-card"><h3>Privacy and reset</h3><p>No login, server, tracking or external AI. Data is stored in this browser only.</p><div class="settings-list"><div class="settings-row"><span><strong>Clear local data</strong><small>Deletes saved scaffolds, reflections and the current draft.</small></span><button class="button button-compact button-danger" data-action="clear-data"><span data-icon="trash"></span> Clear</button></div></div></section>
    </div>`;
  }

  function settingSwitch(title, description, key) {
    return `<div class="settings-row"><span><strong>${esc(title)}</strong><small>${esc(description)}</small></span><button class="switch" role="switch" aria-checked="${state.settings[key]}" data-setting-toggle="${key}"></button></div>`;
  }

  function openModal({ title, subtitle = "", body, footer = "" }) {
    modalLayer.hidden = false;
    modalLayer.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon("close")}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ""}</section>`;
    hydrateIcons(modalLayer);
    document.body.style.overflow = "hidden";
    setTimeout(() => modalLayer.querySelector("button, input, textarea")?.focus(), 0);
  }

  function closeModal() {
    modalLayer.hidden = true;
    modalLayer.innerHTML = "";
    document.body.style.overflow = "";
  }

  function showAllBarriers() {
    openModal({
      title: "Review barrier types",
      subtitle: "Choose only what helps explain the difficulty you actually observe.",
      body: `<div class="barrier-grid">${DATA.barriers.map((barrier, index) => `<button class="barrier-card ${state.draft.selectedBarriers.includes(barrier.id) ? "is-selected" : ""}" data-action="modal-toggle-barrier" data-id="${barrier.id}" aria-pressed="${state.draft.selectedBarriers.includes(barrier.id)}"><span class="barrier-icon">${icon(index % 2 ? "knowledge" : "brain")}</span><span><h4>${esc(barrier.name)}</h4><p>${esc(barrier.hint)}</p></span></button>`).join("")}</div>`,
      footer: '<button class="button" data-action="close-modal">Done</button>'
    });
  }

  function showAllEngines() {
    openModal({
      title: "Choose a scaffold engine",
      subtitle: "Fifteen different structures—not one template in fifteen colours.",
      body: `<div class="engine-recommendations" style="grid-template-columns:repeat(2,1fr)">${DATA.engines.map((engine, index) => `<button class="engine-card ${state.draft.engineId === engine.id ? "is-selected" : ""}" data-action="modal-choose-engine" data-id="${engine.id}"><span class="engine-number">${String(index + 1).padStart(2, "0")}</span><h4>${esc(engine.name)}</h4><p>${esc(engine.tagline)}</p><p><strong>Distinctive form:</strong> ${esc(engine.distinctive)}</p></button>`).join("")}</div>`
    });
  }

  function createAIPrompt(scaffold) {
    const subject = subjectById(scaffold.subject);
    const engine = engineById(scaffold.engineId);
    const stage = DATA.stages.find(item => item.id === scaffold.stage);
    const barriers = scaffold.barriers.map(barrierById).filter(Boolean);
    return `Create a professionally designed, classroom-ready scaffold for an English primary classroom.

PRODUCT PHILOSOPHY
This must be a temporary support that removes barriers without reducing the intellectual challenge. It must not become a simplified worksheet, complete the thinking for pupils, lower the curriculum objective, or label pupils by need. The pupil must retain the important subject decisions, reasoning and explanation.

CURRICULUM CONTEXT
- Jurisdiction: England only
- Phase and year group: ${scaffold.year}
- Subject: ${subject.name}
- Curriculum area: ${scaffold.topic}
- Learning objective: ${scaffold.objective}
- Lesson phase: ${scaffold.phase}

TEACHER OBSERVATION
${scaffold.situation}

IDENTIFIED BARRIERS
${barriers.map(barrier => `- ${barrier.name}: ${barrier.hint}`).join("\n")}

TEACHER INTENTION
${scaffold.intention}

SCAFFOLD ARCHITECTURE
- Engine: ${engine.name}
- Engine purpose: ${engine.tagline}
- Distinctive structure: ${engine.distinctive}
- Fading stage: ${stage.name} — ${stage.support}
- Stage definition: ${stage.description}

SUBJECT KNOWLEDGE TO HANDLE CAREFULLY
- High-leverage vocabulary: ${(scaffold.vocabulary || []).join(", ") || "Select a small, precise set from the learning objective."}
- Misconception to expose rather than conceal: ${scaffold.misconception || "Identify one plausible misconception from the curriculum context."}
- Subject principles: ${subject.principles.join("; ")}

LAYOUT SPECIFICATION
Create a genuinely distinctive ${engine.name} rather than a generic boxed worksheet. Use the engine structure described above. The output must be suitable for ${state.print.paper.toUpperCase()} ${state.print.orientation}, with generous margins, an uncluttered visual hierarchy, highly legible typography, purposeful writing space and photocopy-safe borders. Use calm warm neutrals, deep indigo and restrained sage if colour is included. Avoid cartoons, clip-art, decorative gradients and visual noise.

ACCESSIBILITY
- Use plain, age-appropriate instructions without diluting subject language.
- Keep reading load proportionate to the learning objective.
- Separate directions, examples and pupil response spaces clearly.
- Never rely on colour alone.
- Allow a large-print version without losing structure.
- Use UK spelling and authentic English-primary terminology.

FADING PATHWAY
Provide four linked versions of the same core scaffold:
1. Seed — maximum support, explicit choices and sequenced prompts.
2. Sprout — partial support with meaningful gaps for pupils to complete.
3. Growth — minimal strategic cues only.
4. Independent — remove the external structure and retain one self-check prompt.
The current classroom version should be ${stage.name}, but all four should preserve the same learning objective and make the removal of support obvious.

TEACHER GUIDANCE
Add a separate concise teacher page explaining when to introduce the scaffold, what thinking must remain with pupils, what to listen for, the misconception to watch, and the exact observable signs that indicate movement to the next fading stage.

QUALITY AUDIT BEFORE OUTPUT
Silently review and revise the resource until every answer is yes:
- Does it preserve the original curriculum challenge?
- Does it target the identified barrier rather than make the whole task easier?
- Is working-memory demand reduced only where it is incidental?
- Does it avoid supplying the pupil’s conclusion, interpretation or key decision?
- Is every word, box and prompt necessary?
- Is the route towards independence explicit?
- Would an experienced English primary teacher use it immediately?
- Will it print cleanly in colour and greyscale?

Return the finished pupil resource first, followed by the teacher guidance and the four-stage fading notes. Do not include generic commentary, marketing language or placeholder text.`;
  }

  function showAIPrompt() {
    const scaffold = state.activeScaffold || scaffoldFromDraft();
    const prompt = createAIPrompt(scaffold);
    openModal({
      title: "AI Companion",
      subtitle: "A complete external prompt. No pupil data or text has been sent anywhere.",
      body: `<label class="form-label" for="ai-prompt-output">Copy and use with the AI tool of your choice</label><textarea class="prompt-output" id="ai-prompt-output" readonly>${esc(prompt)}</textarea>`,
      footer: '<button class="button" data-action="close-modal">Close</button><button class="button button-primary" data-action="copy-ai-prompt"><span data-icon="copy"></span> Copy prompt</button>'
    });
  }

  function saveScaffold() {
    const scaffold = state.activeScaffold || scaffoldFromDraft();
    scaffold.updatedAt = new Date().toISOString();
    const index = state.library.findIndex(item => item.id === scaffold.id);
    if (index >= 0) state.library[index] = scaffold;
    else state.library.unshift(scaffold);
    state.activeScaffold = scaffold;
    state.draft.editingId = scaffold.id;
    writeStore(STORAGE.library, state.library);
    saveDraft();
    toast(index >= 0 ? "Scaffold changes saved locally." : "Scaffold saved to your library.");
  }

  function loadScaffold(id) {
    const scaffold = state.library.find(item => item.id === id);
    if (!scaffold) return;
    state.activeScaffold = scaffold;
    state.draft = normaliseDraft({
      ...scaffold,
      selectedBarriers: scaffold.barriers,
      vocabulary: (scaffold.vocabulary || []).join(", "),
      tags: (scaffold.tags || []).join(", "),
      editingId: scaffold.id
    });
    analyseBarrier();
    state.draft.selectedBarriers = [...scaffold.barriers];
    state.draft.engineId = scaffold.engineId;
    state.createStep = 4;
    saveDraft();
    navigate("create");
  }

  function duplicateScaffold(id) {
    const original = state.library.find(item => item.id === id);
    if (!original) return;
    const now = new Date().toISOString();
    const copy = { ...original, id: uid(), title: `${original.title} · copy`, favourite: false, createdAt: now, updatedAt: now };
    state.library.unshift(copy);
    writeStore(STORAGE.library, state.library);
    toast("A fresh copy has been added to your library.");
    render();
  }

  function deleteScaffold(id) {
    const item = state.library.find(scaffold => scaffold.id === id);
    if (!item || !window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    state.library = state.library.filter(scaffold => scaffold.id !== id);
    if (state.activeScaffold?.id === id) state.activeScaffold = state.library[0] || null;
    writeStore(STORAGE.library, state.library);
    toast("Scaffold deleted from this device.");
    render();
  }

  function exportData() {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), library: state.library, settings: state.settings, reflections: state.reflections }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `scaffold-seeds-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("Backup downloaded.");
  }

  async function importData(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.library) || typeof data.settings !== "object") throw new Error("invalid");
      state.library = data.library;
      state.settings = { ...defaultSettings, ...data.settings };
      state.reflections = data.reflections || {};
      writeStore(STORAGE.library, state.library);
      writeStore(STORAGE.settings, state.settings);
      writeStore(STORAGE.reflections, state.reflections);
      applySettings();
      toast(`Imported ${state.library.length} scaffold${state.library.length === 1 ? "" : "s"}.`);
      render();
    } catch (error) {
      toast("That file is not a valid Scaffold Seeds backup.");
    }
  }

  function clearData() {
    if (!window.confirm("Clear every saved scaffold, reflection and draft from this browser? This cannot be undone.")) return;
    Object.values(STORAGE).forEach(key => localStorage.removeItem(key));
    state.library = [];
    state.reflections = {};
    state.draft = normaliseDraft(null);
    state.activeScaffold = null;
    state.settings = { ...defaultSettings };
    applySettings();
    toast("Local Scaffold Seeds data has been cleared.");
    render();
  }

  function printNow() {
    const scaffold = activeForPrint();
    if (!scaffold) return;
    const order = state.print.pageOrder.filter(type => type !== "teacher" || state.print.teacherGuidance);
    const printRoot = document.getElementById("print-root");
    printRoot.innerHTML = order.map(type => type === "resource" ? applyPaperOptions(renderResourceDocument(scaffold)) : renderTeacherGuide(scaffold)).join("");
    let style = document.getElementById("print-dynamic-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "print-dynamic-style";
      document.head.appendChild(style);
    }
    style.textContent = `@media print { @page { size: ${state.print.paper.toUpperCase()} ${state.print.orientation}; margin: 0; } }`;
    setTimeout(() => window.print(), 30);
  }

  document.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      navigate(viewButton.dataset.view);
      return;
    }

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action === "new-scaffold") newScaffold();
    if (action === "quick-start") {
      const presets = {
        explain: { situation: "Pupils appear to understand the idea, but struggle to explain the connection clearly or justify why it works." },
        overload: { situation: "Pupils can complete each part when prompted, but lose track when they have to hold and coordinate several steps independently." },
        independence: { situation: "Pupils can succeed with repeated adult prompts, but struggle to choose a starting point, monitor progress or decide what to do next." }
      };
      newScaffold(presets[button.dataset.preset] || {});
    }
    if (action === "quick-engine") {
      newScaffold({ engineId: id, preferredEngine: id });
    }
    if (action === "create-back") {
      state.createStep = Math.max(0, state.createStep - 1);
      render();
    }
    if (action === "create-next") {
      if (state.createStep === 0 && !state.draft.objective.trim()) {
        toast("Choose or write a learning objective first.");
        return;
      }
      if (state.createStep === 2 && !state.draft.engineId) {
        toast("Choose the scaffold engine that best preserves the thinking.");
        return;
      }
      state.createStep = Math.min(4, state.createStep + 1);
      saveDraft();
      render();
    }
    if (action === "use-example") {
      state.draft.situation = button.textContent.trim();
      saveDraft();
      render();
      document.getElementById("situation")?.focus();
    }
    if (action === "analyse-barrier") {
      if (state.draft.situation.trim().length < 16) {
        toast("Add a little more detail about what pupils can do and where it breaks down.");
        document.getElementById("situation")?.focus();
        return;
      }
      analyseBarrier();
      state.createStep = 2;
      render();
    }
    if (action === "toggle-barrier" || action === "modal-toggle-barrier") {
      const chosen = state.draft.selectedBarriers;
      state.draft.selectedBarriers = chosen.includes(id) ? chosen.filter(item => item !== id) : [...chosen, id];
      updateRecommendations();
      saveDraft();
      if (action === "modal-toggle-barrier") {
        button.classList.toggle("is-selected", state.draft.selectedBarriers.includes(id));
        button.setAttribute("aria-pressed", String(state.draft.selectedBarriers.includes(id)));
      } else render();
    }
    if (action === "choose-engine") {
      state.draft.engineId = id;
      state.draft.preferredEngine = "";
      saveDraft();
      render();
    }
    if (action === "modal-choose-engine") {
      state.draft.engineId = id;
      state.draft.preferredEngine = "";
      saveDraft();
      closeModal();
      render();
    }
    if (action === "show-all-barriers") showAllBarriers();
    if (action === "show-all-engines") showAllEngines();
    if (action === "choose-stage") {
      state.draft.stage = id;
      saveDraft();
      render();
    }
    if (action === "generate-scaffold") {
      if (!state.draft.title.trim()) {
        toast("Give the resource a clear title first.");
        return;
      }
      state.activeScaffold = scaffoldFromDraft();
      state.createStep = 4;
      saveDraft();
      render();
    }
    if (action === "save-scaffold") saveScaffold();
    if (action === "open-print") {
      state.activeScaffold = state.activeScaffold || scaffoldFromDraft();
      navigate("print");
    }
    if (action === "ai-prompt") showAIPrompt();
    if (action === "edit-design") {
      state.createStep = 3;
      render();
    }
    if (action === "start-again") newScaffold();
    if (action === "save-reflection") {
      const field = document.getElementById("daily-reflection");
      if (field) {
        state.reflections[field.dataset.reflectionDate] = field.value.trim();
        writeStore(STORAGE.reflections, state.reflections);
        toast("Reflection saved locally.");
      }
    }
    if (action === "open-scaffold") loadScaffold(id);
    if (action === "duplicate-scaffold") duplicateScaffold(id);
    if (action === "delete-scaffold") deleteScaffold(id);
    if (action === "toggle-favourite") {
      const item = state.library.find(scaffold => scaffold.id === id);
      if (item) {
        item.favourite = !item.favourite;
        item.updatedAt = new Date().toISOString();
        writeStore(STORAGE.library, state.library);
        render();
      }
    }
    if (action === "filter-favourites") {
      state.libraryFilters.favourite = !state.libraryFilters.favourite;
      render();
    }
    if (action === "clear-library-filters") {
      state.libraryFilters = { query: "", year: "all", subject: "all", favourite: false };
      render();
    }
    if (action === "knowledge-subject") {
      state.knowledgeSubject = id;
      render();
    }
    if (action === "move-page") {
      const currentIndex = state.print.pageOrder.indexOf(id);
      const offset = button.dataset.direction === "up" ? -1 : 1;
      const targetIndex = currentIndex + offset;
      if (currentIndex >= 0 && targetIndex >= 0 && targetIndex < state.print.pageOrder.length) {
        [state.print.pageOrder[currentIndex], state.print.pageOrder[targetIndex]] = [state.print.pageOrder[targetIndex], state.print.pageOrder[currentIndex]];
        render();
      }
    }
    if (action === "print-now") printNow();
    if (action === "export-data") exportData();
    if (action === "clear-data") clearData();
    if (action === "close-modal") closeModal();
    if (action === "copy-ai-prompt") {
      const output = document.getElementById("ai-prompt-output");
      if (output) navigator.clipboard.writeText(output.value).then(() => toast("AI prompt copied."), () => {
        output.select();
        document.execCommand("copy");
        toast("AI prompt copied.");
      });
    }
  });

  document.addEventListener("input", event => {
    const field = event.target.closest("[data-draft-field]");
    if (field && field.tagName !== "SELECT") {
      state.draft[field.dataset.draftField] = field.value;
      saveDraft();
      return;
    }
    const filter = event.target.closest("[data-library-filter='query']");
    if (filter) {
      state.libraryFilters.query = filter.value;
      const selection = filter.selectionStart;
      render();
      const refreshed = document.getElementById("library-search");
      refreshed?.focus();
      refreshed?.setSelectionRange(selection, selection);
    }
  });

  document.addEventListener("change", event => {
    const field = event.target.closest("[data-draft-field]");
    if (field) {
      const key = field.dataset.draftField;
      state.draft[key] = field.value;
      if (key === "year" || key === "subject") {
        const entry = curriculumEntries()[0];
        state.draft.topic = entry?.title || "";
        state.draft.objective = entry?.objectives[0] || "";
      }
      if (key === "topic") state.draft.objective = currentEntry()?.objectives[0] || "";
      saveDraft();
      if (field.tagName === "SELECT") render();
    }
    const libraryFilter = event.target.closest("[data-library-filter]");
    if (libraryFilter && libraryFilter.dataset.libraryFilter !== "query") {
      state.libraryFilters[libraryFilter.dataset.libraryFilter] = libraryFilter.value;
      render();
    }
    const settingSelect = event.target.closest("[data-setting-select]");
    if (settingSelect) {
      state.settings[settingSelect.dataset.settingSelect] = settingSelect.value;
      writeStore(STORAGE.settings, state.settings);
      toast("Default updated.");
    }
    if (event.target.matches("[data-action='import-data']")) importData(event.target.files?.[0]);
  });

  document.addEventListener("click", event => {
    const printOption = event.target.closest("[data-print-option]");
    if (printOption) {
      state.print[printOption.dataset.printOption] = printOption.dataset.value;
      render();
    }
    const printToggle = event.target.closest("[data-print-toggle]");
    if (printToggle) {
      const key = printToggle.dataset.printToggle;
      state.print[key] = !state.print[key];
      render();
    }
    const settingToggle = event.target.closest("[data-setting-toggle]");
    if (settingToggle) {
      const key = settingToggle.dataset.settingToggle;
      state.settings[key] = !state.settings[key];
      writeStore(STORAGE.settings, state.settings);
      applySettings();
      render();
    }
    if (event.target === modalLayer) closeModal();
  });

  document.getElementById("menu-button").addEventListener("click", () => sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar());
  scrim.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (!modalLayer.hidden) closeModal();
      else closeSidebar();
    }
  });

  applySettings();
  hydrateIcons(document);
  render();
})();
