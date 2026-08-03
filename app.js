(function () {
  "use strict";

  const DATA = window.SCAFFOLD_DATA;
  const RESOURCE = window.ScaffoldResourceEngine;
  const VERIFY = window.ScaffoldVerificationEngine;
  const AI = window.ScaffoldAICompanion;
  const STORAGE = {
    library: "scaffold-seeds.library.v1",
    settings: "scaffold-seeds.settings.v1",
    reflections: "scaffold-seeds.reflections.v1",
    draft: "scaffold-seeds.draft.v1",
    archives: "scaffold-seeds.archives.v3",
    preferences: "scaffold-seeds.preferences.v3",
    aiWorkspace: "scaffold-seeds.ai-workspace.v4",
    schema: "scaffold-seeds.schema.v4"
  };

  const defaultSettings = {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    defaultPaper: "a4",
    defaultColour: "colour",
    defaultStage: "sprout",
    interfaceScale: "standard",
    preferredDensity: "calm",
    typicalYear: "Year 4",
    favouriteSubjects: ["english", "mathematics"],
    includeTeacherGuidance: true,
    includeAnswers: false,
    defaultGrowthStages: ["sprout"],
    lineThickness: "standard",
    pageNumbers: true,
    schoolLabel: "",
    classLabel: "",
    terminology: "pupils",
    aiPromptDepth: "professional",
    aiIncludeResponseHistory: true
  };

  const state = {
    view: "home",
    createStep: 0,
    library: migrateLibrary(readStore(STORAGE.library, [])),
    settings: { ...defaultSettings, ...readStore(STORAGE.settings, {}) },
    reflections: readStore(STORAGE.reflections, {}),
    archives: readStore(STORAGE.archives, []),
    preferences: readStore(STORAGE.preferences, { largerWritingArea: false, questionPrompts: false, printMode: "" }),
    draft: normaliseDraft(readStore(STORAGE.draft, null)),
    activeScaffold: null,
    libraryFilters: { query: "", year: "all", subject: "all", family: "all", format: "all", stage: "all", aiStatus: "all", source: "all", favourite: false, archived: false, sort: "edited" },
    librarySelection: [],
    knowledgeSubject: "english",
    knowledgeProfile: "reading",
    knowledgeLens: "ideas",
    print: {
      paper: "a4",
      orientation: "portrait",
      colour: "colour",
      format: "workpage",
      teacherGuidance: true,
      answers: false,
      largePrint: false,
      photocopy: false,
      cropMarks: false,
      cutLines: true,
      duplex: false,
      arrangement: "single",
      stages: ["sprout"]
    },
    saveStatus: "saved",
    compareStages: false,
    aiWorkspace: readStore(STORAGE.aiWorkspace, null),
    aiTaskFamily: "generate"
  };

  state.print.paper = state.settings.defaultPaper;
  state.print.colour = state.settings.defaultColour;
  state.print.teacherGuidance = state.settings.includeTeacherGuidance;
  state.print.answers = state.settings.includeAnswers;
  state.print.stages = [...state.settings.defaultGrowthStages];
  if (!state.activeScaffold && state.library.length) state.activeScaffold = state.library[0];
  const activeWorkspaceKey = state.activeScaffold?.id ? `${STORAGE.aiWorkspace}.${state.activeScaffold.id}` : STORAGE.aiWorkspace;
  const activeWorkspaceSaved = readStore(activeWorkspaceKey, null) || (state.aiWorkspace?.schemaVersion === 4 ? state.aiWorkspace : null);
  state.aiWorkspace = AI.createWorkspace(state.activeScaffold || {}, activeWorkspaceSaved);

  const main = document.getElementById("main-content");
  const modalLayer = document.getElementById("modal-layer");
  const toastRegion = document.getElementById("toast-region");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("sidebar-scrim");
  try { localStorage.setItem(STORAGE.schema, JSON.stringify({ version: 4, migratedAt: new Date().toISOString(), previousLibraryKey: STORAGE.library })); } catch (error) { /* Storage status is surfaced on the first attempted save. */ }

  const viewMeta = {
    home: ["Your thinking space", "Home"],
    create: ["Design with purpose", "Create"],
    library: ["Your saved practice", "Library"],
    knowledge: ["Professional knowledge", "Knowledge"],
    ai: ["Controlled external intelligence", "AI Companion"],
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
    brain: '<svg viewBox="0 0 24 24"><path d="M9.5 4.5A3.5 3.5 0 0 0 6 8v.2A3.5 3.5 0 0 0 4 14a3.5 3.5 0 0 0 5.5 4.5M14.5 4.5A3.5 3.5 0 0 1 18 8v.2a3.5 3.5 0 0 1 2 5.8 3.5 3.5 0 0 1-5.5 4.5M12 3v18M8 11h4M12 15h4"/></svg>',
    editorial: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/><path d="m16 17 4-4 2 2-4 4-3 1z"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3 4 6v5c0 5.2 3.3 8.3 8 10 4.7-1.7 8-4.8 8-10V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>',
    compare: '<svg viewBox="0 0 24 24"><path d="M8 4H4v16h4M16 4h4v16h-4M9 8h6M9 12h6M9 16h6"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M6 2h8l4 4v16H6zM14 2v5h5M9 12h6M9 16h6"/></svg>'
  };

  function migrateLibrary(items) {
    if (!Array.isArray(items)) return [];
    return items.filter(item => item && typeof item === "object").map(item => ({
      ...item,
      versions: Array.isArray(item.versions) ? item.versions.slice(0, 20) : [],
      sources: Array.isArray(item.sources) ? item.sources : [],
      assets: Array.isArray(item.assets) ? item.assets : [],
      ai: item.ai && typeof item.ai === "object" ? {
        schemaVersion: 4,
        rounds: Array.isArray(item.ai.rounds) ? item.ai.rounds.slice(0, 20) : [],
        provenance: Array.isArray(item.ai.provenance) ? item.ai.provenance.slice(0, 100) : [],
        ...item.ai
      } : null
    }));
  }

  let aiSaveTimer = null;

  function saveAIWorkspace() {
    if (aiSaveTimer) clearTimeout(aiSaveTimer);
    aiSaveTimer = null;
    state.aiWorkspace.lastSavedAt = new Date().toISOString();
    if (state.aiWorkspace.resourceId) {
      writeStore(`${STORAGE.aiWorkspace}.${state.aiWorkspace.resourceId}`, state.aiWorkspace);
      writeStore(STORAGE.aiWorkspace, { schemaVersion: 4, resourceId: state.aiWorkspace.resourceId, lastSavedAt: state.aiWorkspace.lastSavedAt });
    } else writeStore(STORAGE.aiWorkspace, state.aiWorkspace);
  }

  function storedAIWorkspaces(includeRaw = true) {
    const result = {};
    const prefix = `${STORAGE.aiWorkspace}.`;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const workspace = readStore(key, null);
      if (!workspace?.resourceId) continue;
      const copy = JSON.parse(JSON.stringify(workspace));
      if (!includeRaw) {
        copy.rawImport = "";
        if (copy.parsed) copy.parsed.raw = "";
      }
      result[workspace.resourceId] = copy;
    }
    return result;
  }

  function scheduleAIWorkspaceSave() {
    setSaveStatus("unsaved");
    if (aiSaveTimer) clearTimeout(aiSaveTimer);
    aiSaveTimer = setTimeout(saveAIWorkspace, 320);
  }

  function resetAIWorkspace(scaffold = activeForAI()) {
    state.aiWorkspace = AI.createWorkspace(scaffold || {});
    state.aiTaskFamily = AI.taskById(state.aiWorkspace.options.taskId).family;
    saveAIWorkspace();
  }

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
      setSaveStatus("saving");
      localStorage.setItem(key, JSON.stringify(value));
      setSaveStatus("saved");
      return true;
    } catch (error) {
      setSaveStatus("issue");
      toast("Browser storage is unavailable. Your changes remain in this session.");
      return false;
    }
  }

  function setSaveStatus(status) {
    state.saveStatus = status;
    const target = document.getElementById("save-status");
    if (!target) return;
    const labels = { saving: "Saving", saved: "Saved", unsaved: "Unsaved changes", issue: "Storage issue" };
    target.className = `local-status status-${status}`;
    const label = target.querySelector("b");
    if (label) label.textContent = labels[status] || "Saved";
  }

  function normaliseDraft(saved) {
    return {
      year: saved?.year || "Year 4",
      subject: saved?.subject || "mathematics",
      topic: saved?.topic || "Fractions",
      objective: saved?.objective || "Recognise and show equivalent fractions",
      phase: saved?.phase || "Guided practice",
      expectedOutcome: saved?.expectedOutcome || "Pupils complete the core subject decision and explain how it supports the learning objective.",
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
      essentialThinking: saved?.essentialThinking || "",
      pupilAction: saved?.pupilAction || "Use the scaffold to enter the task, then make and explain the central subject decision.",
      removalPathway: saved?.removalPathway || "Remove the model first, then reduce prompts, then retain only one pupil-owned self-check.",
      customBarrier: saved?.customBarrier || "",
      tags: saved?.tags || "",
      familyId: saved?.familyId || "",
      representation: saved?.representation || "",
      content: {
        instruction: saved?.content?.instruction || "",
        subInstruction: saved?.content?.subInstruction || "",
        example: saved?.content?.example || "",
        prompts: saved?.content?.prompts || [],
        vocabulary: saved?.content?.vocabulary || [],
        misconception: saved?.content?.misconception || "",
        teacherNotes: saved?.content?.teacherNotes || "",
        oralPrompt: saved?.content?.oralPrompt || "",
        checkPrompt: saved?.content?.checkPrompt || "",
        independencePrompt: saved?.content?.independencePrompt || "",
        diagramType: saved?.content?.diagramType || "",
        diagramLabels: saved?.content?.diagramLabels || [],
        responseSpace: saved?.content?.responseSpace || "standard",
        instructionMode: saved?.content?.instructionMode || "standard",
        density: saved?.content?.density || defaultSettings.preferredDensity,
        oralRehearsal: saved?.content?.oralRehearsal ?? false,
        hiddenSections: saved?.content?.hiddenSections || []
      },
      diagram: saved?.diagram || { type: "", labels: [], values: [] },
      format: saved?.format || "workpage",
      growthStages: saved?.growthStages || ["seed", "sprout", "growth", "independent"],
      teacherNotes: saved?.teacherNotes || "",
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

  function stageById(id) {
    return DATA.stages.find(stage => stage.id === id) || DATA.stages[1];
  }

  function barrierById(id) {
    return DATA.barriers.find(barrier => barrier.id === id);
  }

  function familyById(id) {
    return DATA.scaffoldFamilies.find(family => family.id === id) || DATA.scaffoldFamilies[0];
  }

  function brainBySubject(id = state.draft.subject) {
    return DATA.subjectBrains[id] || DATA.subjectBrains.english;
  }

  function profileForDraft(draft = state.draft) {
    const brain = brainBySubject(draft.subject);
    const text = `${draft.topic || ""} ${draft.objective || ""} ${draft.situation || ""}`.toLowerCase();
    return brain.profiles
      .map((profile, index) => ({ profile, index, score: profile.keywords.reduce((score, keyword) => score + (text.includes(keyword) ? (keyword.includes(" ") ? 4 : 2) : 0), 0) }))
      .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.profile || brain.profiles[0];
  }

  function printFormatById(id = state.print.format) {
    return DATA.printFormats.find(format => format.id === id) || DATA.printFormats[0];
  }

  function curriculumIntelligence(draft = state.draft) {
    const subject = subjectById(draft.subject);
    const brain = brainBySubject(draft.subject);
    const profile = profileForDraft(draft);
    const entry = currentEntry(draft);
    const vocabulary = [...new Set([...(entry?.vocabulary || []), ...(profile.vocabulary || [])])].slice(0, 8);
    const misconceptions = [...new Set([...(entry?.misconceptions || []), ...(profile.misconceptions || [])])];
    const preferredFamilies = profile.families.filter(id => DATA.scaffoldFamilies.some(family => family.id === id));
    return { subject, brain, profile, entry, vocabulary, misconceptions, preferredFamilies, representations: profile.representations || [] };
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
    document.body.classList.toggle("strong-lines", state.settings.lineThickness === "strong");
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
    const renderers = { home: renderHome, create: renderCreate, library: renderLibrary, knowledge: renderKnowledge, ai: renderAIStudio, print: renderPrintStudio, settings: renderSettings };
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
    state.draft = normaliseDraft({ year: state.settings.typicalYear, ...preset, stage: preset.stage || state.settings.defaultStage, content: { density: state.settings.preferredDensity, responseSpace: state.preferences.largerWritingArea ? "large" : "standard", ...(preset.content || {}) } });
    state.activeScaffold = null;
    resetAIWorkspace({ ...state.draft, id: "", engineId: state.draft.engineId || DATA.engines[0].id });
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
    const reviewResources = state.library.filter(item => ["review-required", "warnings-unresolved", "response-imported"].includes(AI.statusForResource(item)));
    const approvedResources = state.library.filter(item => ["teacher-approved", "print-ready"].includes(AI.statusForResource(item)));
    const promptRounds = state.library.flatMap(item => (item.ai?.rounds || []).map(round => ({ ...round, resourceId: item.id, resourceTitle: item.title }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const favouriteTasks = [...new Set(promptRounds.map(round => round.taskId))].slice(0, 3).map(AI.taskById);
    const recentHTML = recent.length
      ? `<div class="recent-list">${recent.map(item => `
          <button class="recent-row" data-action="open-scaffold" data-id="${esc(item.id)}">
            <span class="recent-symbol">${icon("create")}</span>
            <span><h4>${esc(item.title)}</h4><p>${esc(item.year)} · ${esc(subjectById(item.subject).name)} · ${esc(engineById(item.engineId).name)}</p></span>
            <span class="recent-meta"><small class="resource-status status-${esc(AI.statusForResource(item))}">${esc(DATA.ai.statuses.find(status => status.id === AI.statusForResource(item))?.name || "Local draft")}</small><span class="quiet-note">${relativeDate(item.updatedAt)}</span></span>
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

          <section class="panel panel-pad ai-home-quiet">
            <div class="panel-header"><div><h3>Editorial review</h3><p>Optional AI activity, kept secondary to scaffold design</p></div></div>
            <div class="ai-home-stats"><button data-view="library" data-ai-home-filter="review"><strong>${reviewResources.length}</strong><span>need review</span></button><button data-view="library" data-ai-home-filter="approved"><strong>${approvedResources.length}</strong><span>approved</span></button><button data-view="ai"><strong>${promptRounds.length}</strong><span>prompt rounds</span></button></div>
            ${reviewResources.length ? `<button class="ai-review-row" data-action="open-ai" data-id="${esc(reviewResources[0].id)}"><span>${icon("shield")}</span><span><strong>Continue ${esc(reviewResources[0].title)}</strong><small>${esc(DATA.ai.statuses.find(status => status.id === AI.statusForResource(reviewResources[0]))?.name || "Review required")}</small></span>${icon("arrow")}</button>` : `<p class="quiet-note ai-home-note">No imported content is waiting. Local-only creation remains fully available.</p>`}
            ${favouriteTasks.length ? `<div class="favourite-ai-tasks"><span>Recent tasks</span>${favouriteTasks.map(task => `<button data-action="ai-template-task" data-id="${task.id}">${esc(task.name)}</button>`).join("")}</div>` : ""}
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
    const stepNames = ["Learning", "Sticking point", "Protect thinking", "Choose support", "Build", "Review", "Output"];
    const content = [renderContextStep, renderSituationStep, renderAnalysisStep, renderSupportStep, renderDesignStep, renderReviewStep, renderOutputStep][state.createStep]();
    const intelligence = curriculumIntelligence();
    const summary = state.draft.objective
      ? `<div class="context-summary"><h4>Current context</h4><p>${esc(state.draft.year)} · ${esc(subjectById(state.draft.subject).name)}<br>${esc(state.draft.objective)}</p></div>`
      : "";
    return `
      <div class="page-heading"><div><span class="eyebrow">The scaffold engineering pathway</span><h2>Design from the barrier</h2><p>Protect the subject thinking first. Add only the smallest temporary support that makes entry possible.</p></div></div>
      <div class="create-layout ${state.createStep >= 4 ? "is-review" : ""}">
        <section class="create-card" aria-label="Scaffold creation step ${state.createStep + 1} of 7">${content}</section>
        <aside class="create-rail">
          <div class="progress-card"><h3>Your path</h3><div class="step-list">
            ${stepNames.map((name, index) => `<div class="step-item ${index === state.createStep ? "is-active" : index < state.createStep ? "is-complete" : ""}"><span class="step-dot">${index < state.createStep ? "✓" : index + 1}</span><span>${name}</span></div>`).join("")}
          </div></div>
          ${summary}
          <div class="design-compass" style="--subject-colour:${intelligence.subject.colour}"><span class="eyebrow">Subject lens</span><strong>${esc(intelligence.profile.name)}</strong><p>${esc(intelligence.profile.disciplinary)}</p></div>
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
    const intelligence = curriculumIntelligence();
    const frameworkNote = state.draft.subject === "religious-education" ? "Use the objective wording from your school's locally applicable RE syllabus." : state.draft.subject === "pshe" ? "Check the final objective against your school policy and the statutory guidance in force." : state.draft.subject === "languages" && !["Year 3", "Year 4", "Year 5", "Year 6"].includes(state.draft.year) ? "Languages is statutory at Key Stage 2; earlier work may be school enrichment." : "";
    return `${createHead(1, "Set the learning context", "A little precision here makes every later recommendation more useful.")}
      <div class="create-card-body"><div class="form-grid">
        <div class="form-field"><label for="year">Year group</label><div class="select-wrap"><select id="year" data-draft-field="year">${DATA.years.map(year => `<option ${year === state.draft.year ? "selected" : ""}>${esc(year)}</option>`).join("")}</select></div></div>
        <div class="form-field"><label for="subject">Subject</label><div class="select-wrap"><select id="subject" data-draft-field="subject">${DATA.subjects.map(subject => `<option value="${subject.id}" ${subject.id === state.draft.subject ? "selected" : ""}>${esc(subject.name)}</option>`).join("")}</select></div></div>
        <div class="form-field"><label for="topic">Curriculum area</label><div class="select-wrap"><select id="topic" data-draft-field="topic">${entries.map(item => `<option ${item.title === state.draft.topic ? "selected" : ""}>${esc(item.title)}</option>`).join("")}</select></div></div>
        <div class="form-field"><label for="phase">Lesson phase</label><div class="select-wrap"><select id="phase" data-draft-field="phase">${DATA.lessonPhases.map(phase => `<option ${phase === state.draft.phase ? "selected" : ""}>${esc(phase)}</option>`).join("")}</select></div></div>
        <div class="form-field span-2"><label for="objective">Learning objective <small>— curriculum-informed and fully editable</small></label><div class="select-wrap"><select id="objective" data-draft-field="objective">${(entry?.objectives || []).map(objective => `<option ${objective === state.draft.objective ? "selected" : ""}>${esc(objective)}</option>`).join("")}</select></div><input class="input" id="custom-objective" data-draft-field="objective" value="${esc(state.draft.objective)}" aria-label="Edit learning objective"><span class="field-hint">${esc(frameworkNote || "Use the wording that pupils will encounter in this lesson.")}</span></div>
        <div class="form-field span-2"><label for="expected-outcome">Expected pupil outcome <small>— what successful thinking or action will be visible?</small></label><textarea id="expected-outcome" data-draft-field="expectedOutcome" rows="2">${esc(state.draft.expectedOutcome)}</textarea></div>
      </div>
      <div class="curriculum-glance" style="--subject-colour:${intelligence.subject.colour}">
        <div><span class="eyebrow">Big idea beneath this area</span><strong>${esc(intelligence.brain.bigIdeas[0])}</strong></div>
        <div><span class="eyebrow">Threshold to protect</span><p>${esc(intelligence.profile.threshold)}</p></div>
        <div><span class="eyebrow">Disciplinary thinking</span><p>${esc(intelligence.profile.disciplinary)}</p></div>
      </div></div>
      ${stepFooter({ back: false, nextLabel: "Describe the barrier" })}`;
  }

  function renderSituationStep() {
    const intelligence = curriculumIntelligence();
    return `${createHead(2, "Where are pupils getting stuck?", "Describe what pupils can already do and the precise moment the learning begins to break down.")}
      <div class="create-card-body">
        <div class="designer-workspace">
          <div class="designer-writing">
            <div class="prompt-examples">
              <button class="example-chip" data-action="use-example">They can identify the key information, but cannot decide how it connects to the conclusion.</button>
              <button class="example-chip" data-action="use-example">They succeed with adult questions, but cannot choose the first step independently.</button>
            </div>
            <div class="form-field"><label for="situation">What do you notice?</label><textarea id="situation" class="situation-field" data-draft-field="situation" maxlength="800" placeholder="They can… but when they need to…">${esc(state.draft.situation)}</textarea><span class="counter">Describe the successful point first, then the precise breakdown.</span></div>
            <div class="thinking-note">${icon("brain")}<span>Include existing strengths. A scaffold should begin exactly where independent success ends—not earlier.</span></div>
          </div>
          <aside class="live-guidance" id="live-guidance" aria-live="polite" style="--subject-colour:${intelligence.subject.colour}">${renderLiveGuidance()}</aside>
        </div>
      </div>
      ${stepFooter({ nextLabel: "Analyse the barrier", nextAction: "analyse-barrier" })}`;
  }

  function renderLiveGuidance() {
    const intelligence = curriculumIntelligence();
    const ranked = scoreBarrierCandidates(state.draft).slice(0, 2).map(([id]) => barrierById(id)).filter(Boolean);
    const representation = intelligence.representations[0];
    return `<div class="live-guidance-head"><span class="live-pulse" aria-hidden="true"></span><div><span class="eyebrow">Quiet recommendations</span><h3>As you describe the difficulty</h3></div></div>
      <section><span>Likely barrier${ranked.length === 1 ? "" : "s"}</span><div class="signal-pills">${ranked.map(item => `<em>${esc(item.name)}</em>`).join("")}</div></section>
      <section><span>Misconception worth listening for</span><p>${esc(intelligence.misconceptions[0] || "Listen for the point where the subject relationship becomes insecure.")}</p></section>
      <section><span>High-leverage language</span><p>${esc(intelligence.vocabulary.slice(0, 5).join(" · "))}</p></section>
      ${representation ? `<section><span>Representation to consider</span><p><strong>${esc(representation.name)}</strong> — ${esc(representation.use)}.</p></section>` : ""}
      <section><span>A useful teacher question</span><p>“${esc(intelligence.profile.questions[0])}”</p></section>`;
  }

  function renderAnalysisStep() {
    if (!state.draft.analysis.length) analyseBarrier();
    const selected = state.draft.selectedBarriers;
    const intelligence = curriculumIntelligence();
    if (!state.draft.essentialThinking) state.draft.essentialThinking = protectedThinkingStatement();
    return `${createHead(3, "Protect the thinking", "Agree what pupils must still decide, interpret, create or explain before choosing any support.")}
      <div class="create-card-body">
        <div class="protected-thinking-card"><span class="eyebrow">The non-negotiable pupil thinking</span><blockquote>${esc(state.draft.essentialThinking)}</blockquote><p>A useful scaffold makes this possible. It does not perform it.</p></div>
        <div class="form-field thinking-editor"><label for="essential-thinking">Edit the protected thinking</label><textarea id="essential-thinking" data-draft-field="essentialThinking" rows="3">${esc(state.draft.essentialThinking)}</textarea></div>
        <div class="pedagogy-map" style="--subject-colour:${intelligence.subject.colour}">
          <section><span>Threshold concept</span><p>${esc(intelligence.profile.threshold)}</p></section>
          <section><span>Prerequisite to check</span><p>${esc(intelligence.profile.prerequisites[0])}</p></section>
          <section><span>Disciplinary move</span><p>${esc(intelligence.profile.disciplinary)}</p></section>
          <section><span>Assessment opportunity</span><p>${esc(intelligence.profile.assessment[0])}</p></section>
        </div>
        <div class="analysis-section"><h3>Likely barriers</h3><p>Select the barriers that best explain what you observe.</p><div class="barrier-grid">
          ${state.draft.analysis.map((result, index) => {
            const barrier = barrierById(result.id);
            return `<button class="barrier-card ${selected.includes(result.id) ? "is-selected" : ""}" data-action="toggle-barrier" data-id="${result.id}" aria-pressed="${selected.includes(result.id)}"><span class="barrier-icon">${icon(index % 2 ? "knowledge" : "brain")}</span><span><h4>${esc(barrier.name)}</h4><p>${esc(result.reason || barrier.hint)}</p></span><span class="confidence">${index < 2 ? "Strong fit" : "Possible"}</span></button>`;
          }).join("")}
        </div><button class="text-link" data-action="show-all-barriers">+ Review all barrier types</button>${selected.length ? `<div class="selected-barrier-order"><span class="form-label">Priority order</span>${selected.map((id, index) => `<section><span>${index + 1}</span><strong>${esc(barrierById(id)?.name || id)}</strong><div><button data-action="move-barrier" data-id="${id}" data-direction="up" aria-label="Move ${esc(barrierById(id)?.name || id)} up">↑</button><button data-action="move-barrier" data-id="${id}" data-direction="down" aria-label="Move ${esc(barrierById(id)?.name || id)} down">↓</button></div></section>`).join("")}</div>` : ""}</div>
        <div class="form-field custom-barrier-field"><label for="custom-barrier">Add or refine a barrier <small>— describe the task–pupil relationship, not a fixed label</small></label><input id="custom-barrier" class="input" data-draft-field="customBarrier" value="${esc(state.draft.customBarrier)}" placeholder="For example: the dense source layout obscures chronology"></div>
        <div class="six-decisions"><section><span>Intended learning</span><strong>${esc(state.draft.objective)}</strong></section><section><span>Barrier</span><strong>${esc(selected.map(id => barrierById(id)?.name).filter(Boolean).join(" · ") || "Choose the best explanation")}</strong></section><section><span>Pupil action</span><strong>${esc(state.draft.pupilAction)}</strong></section></div>
      </div>
      ${stepFooter({ nextLabel: "Choose the smallest support" })}`;
  }

  function protectedThinkingStatement(draft = state.draft) {
    const profile = profileForDraft(draft);
    const subjectStatements = {
      english: "Pupils must still select, shape and justify the language or reading decision that creates meaning.",
      mathematics: "Pupils must still identify the mathematical structure, choose a fitting strategy and justify why it works.",
      science: "Pupils must still interpret the evidence and connect it to an accurate scientific idea or mechanism.",
      history: "Pupils must still use period knowledge and evidence to form and test a historical interpretation.",
      geography: "Pupils must still connect located evidence, scale and process to form a geographical explanation.",
      computing: "Pupils must still design or trace the logic, diagnose behaviour and choose a test.",
      art: "Pupils must still look, experiment and make a personal visual or material choice for an intended effect.",
      "design-technology": "Pupils must still translate user and purpose into a functional design, test it and choose an improvement.",
      music: "Pupils must still listen, perform or compose through sound and make a musical choice.",
      "physical-education": "Pupils must still perceive the movement or game situation and adjust their own physical or tactical action.",
      languages: "Pupils must still select meaning, listen and respond, while keeping the target-language pattern accurate.",
      "religious-education": "Pupils must still use contextual knowledge to interpret diversity and form a reasoned account.",
      pshe: "Pupils must still interpret the neutral scenario, choose a safe response and explain the route to help."
    };
    return subjectStatements[draft.subject] || `Pupils must still perform the central ${profile.name.toLowerCase()} decision and explain it.`;
  }

  function renderSupportStep() {
    if (!state.draft.recommendations.length) updateRecommendations();
    const intelligence = curriculumIntelligence();
    const recommended = state.draft.recommendations.map(engineById);
    const representation = intelligence.representations[0];
    return `${createHead(4, "Choose the smallest useful support", "Three reasoned options are shown. Compare what each gives, what it leaves and how it fades.")}
      <div class="create-card-body">
        <div class="support-protection-line"><span>${icon("brain")}</span><div><strong>Still with the pupil</strong><p>${esc(state.draft.essentialThinking || protectedThinkingStatement())}</p></div></div>
        ${representation ? `<div class="representation-advice"><div><span class="eyebrow">Representation to consider—not force</span><h3>${esc(representation.name)}</h3><p>Useful ${esc(representation.use)}. Avoid ${esc(representation.avoid)}.</p></div><span class="advice-mark">${icon("eye")}</span></div>` : ""}
        <div class="engine-recommendations build3-recommendations">${recommended.map((engine, index) => `<button class="engine-card engine-card-rich ${state.draft.engineId === engine.id ? "is-selected" : ""}" data-action="choose-engine" data-id="${engine.id}" aria-pressed="${state.draft.engineId === engine.id}">${index === 0 ? '<span class="best-fit">Best fit</span>' : ""}<span class="engine-number">${String(index + 1).padStart(2, "0")}</span><span class="family-label">${esc(familyById(engine.family).name)}</span><h4>${esc(engine.name)}</h4><p>${esc(engine.tagline)}</p><small><strong>Supports:</strong> ${esc(engine.bestFor || engine.tagline)}</small><small class="preserve-line"><strong>Leaves:</strong> ${esc(engine.preserves || state.draft.essentialThinking)}</small><small><strong>Best now:</strong> ${esc(state.draft.phase)}</small><small class="risk-line"><strong>Watch:</strong> ${esc(engine.risk || "Remove prompts as soon as the central decision is secure.")}</small><small><strong>Fade:</strong> ${esc(RESOURCE.nextFade({ ...scaffoldFromDraft(), engineId: engine.id, stage: state.settings.defaultStage }))}</small></button>`).join("")}</div>
        <button class="text-link" data-action="show-all-engines">Browse all ${DATA.engines.length} professional engines</button>
      </div>${stepFooter({ nextLabel: "Open the live designer" })}`;
  }

  function renderDesignStep() {
    const engine = engineById(state.draft.engineId);
    const entry = currentEntry();
    const intelligence = curriculumIntelligence();
    const vocabulary = state.draft.vocabulary || intelligence.vocabulary.slice(0, 6).join(", ") || entry?.vocabulary.join(", ") || "";
    const misconception = state.draft.misconception || intelligence.misconceptions[0] || "";
    if (!state.draft.title) state.draft.title = `${state.draft.topic}: ${engine.name}`;
    if (!state.draft.vocabulary) state.draft.vocabulary = vocabulary;
    if (!state.draft.misconception) state.draft.misconception = misconception;
    if (!state.draft.familyId) state.draft.familyId = engine.family;
    if (!state.draft.representation) state.draft.representation = intelligence.representations[0]?.name || "";
    if (!state.draft.essentialThinking) state.draft.essentialThinking = protectedThinkingStatement();
    const generated = RESOURCE.normalise(scaffoldFromDraft());
    const currentContent = state.draft.content || {};
    if (!currentContent.instruction) state.draft.content = { ...generated.content, ...currentContent, instruction: generated.content.instruction, prompts: currentContent.prompts?.length ? currentContent.prompts : generated.content.prompts, vocabulary: currentContent.vocabulary?.length ? currentContent.vocabulary : generated.content.vocabulary, example: currentContent.example || generated.content.example, subInstruction: currentContent.subInstruction || generated.content.subInstruction, misconception: currentContent.misconception || generated.content.misconception, oralPrompt: currentContent.oralPrompt || generated.content.oralPrompt, checkPrompt: currentContent.checkPrompt || generated.content.checkPrompt, independencePrompt: currentContent.independencePrompt || generated.content.independencePrompt, diagramType: currentContent.diagramType || engine.diagram || "" };
    const activeStage = DATA.stages.find(stage => stage.id === state.draft.stage) || DATA.stages[1];
    const nextStage = DATA.stages[DATA.stages.findIndex(stage => stage.id === state.draft.stage) + 1];
    const scaffold = { ...scaffoldFromDraft(), content: state.draft.content, diagram: { ...state.draft.diagram, type: state.draft.content.diagramType, labels: state.draft.content.diagramLabels } };
    const diagramTypes = ["", "number-line", "part-whole", "place-value", "array", "bar-model", "fraction-strip", "timeline", "causal-chain", "flowchart", "classification-tree", "concept-map", "cycle"];
    const hidden = state.draft.content.hiddenSections || [];
    return `${createHead(5, "Build in the live Scaffold Designer", `${engine.name} · edit the structure without turning the page into free-form desktop publishing.`)}
      <div class="create-card-body designer-shell">
        <div class="designer-toolbar"><div class="compact-stage-path">${DATA.stages.map(stage => `<button class="${stage.id === state.draft.stage ? "is-active" : ""}" data-action="choose-stage" data-id="${stage.id}"><span>${stage.glyph}</span>${esc(stage.name)}</button>`).join("")}</div><button class="button button-compact" data-action="toggle-stage-compare">Compare all stages</button><div class="autosave-indicator"><span></span>${state.saveStatus === "issue" ? "Storage issue" : "Autosaved locally"}</div></div>
        <div class="live-designer-grid">
          <aside class="designer-controls" aria-label="Resource controls">
            <div class="design-identity" style="--subject-colour:${intelligence.subject.colour}"><div><span class="eyebrow">${esc(familyById(engine.family).name)} family</span><h3>${esc(engine.name)}</h3></div><div><span>Protect</span><p>${esc(engine.preserves)}</p></div></div>
            <details open><summary>Core content</summary><div class="designer-control-body">
              <div class="form-field"><label for="scaffold-title">Title</label><input class="input" id="scaffold-title" data-draft-field="title" value="${esc(state.draft.title)}"></div>
              <div class="form-field"><label for="content-instruction">Pupil instruction</label><textarea id="content-instruction" data-content-field="instruction" rows="2">${esc(state.draft.content.instruction)}</textarea><button class="inline-action" data-action="regenerate-section" data-section="instruction">Shorten access language</button></div>
              <div class="form-field"><label for="content-example">Example or partial example</label><textarea id="content-example" data-content-field="example" rows="3">${esc(state.draft.content.example)}</textarea><button class="inline-action" data-action="regenerate-section" data-section="example">Generate another local example frame</button></div>
              <div class="form-field"><label for="content-prompts">Prompts <small>— one per line</small></label><textarea id="content-prompts" data-content-field="prompts" data-list-mode="lines" rows="5">${esc((state.draft.content.prompts || []).join("\n"))}</textarea><button class="inline-action" data-action="regenerate-section" data-section="prompts">Replace stems with questions</button></div>
              <div class="form-field"><label for="content-vocabulary">Vocabulary <small>— comma separated</small></label><textarea id="content-vocabulary" data-content-field="vocabulary" data-list-mode="commas" rows="2">${esc((state.draft.content.vocabulary || []).join(", "))}</textarea></div>
            </div></details>
            <details><summary>Representation and access</summary><div class="designer-control-body">
              <div class="form-field"><label for="diagram-type">Local diagram</label><select id="diagram-type" data-content-field="diagramType">${diagramTypes.map(type => `<option value="${type}" ${type === state.draft.content.diagramType ? "selected" : ""}>${type ? titleCase(type) : "No diagram"}</option>`).join("")}</select></div>
              <div class="form-field"><label for="diagram-labels">Diagram labels <small>— comma separated</small></label><input id="diagram-labels" class="input" data-content-field="diagramLabels" data-list-mode="commas" value="${esc((state.draft.content.diagramLabels || []).join(", "))}"></div>
              <div class="form-grid compact-fields"><div class="form-field"><label>Instruction language</label><select data-content-field="instructionMode">${DATA.build3.instructionModes.map(mode => `<option value="${mode}" ${mode === state.draft.content.instructionMode ? "selected" : ""}>${titleCase(mode)}</option>`).join("")}</select></div><div class="form-field"><label>Visual density</label><select data-content-field="density">${DATA.build3.densityModes.map(mode => `<option value="${mode}" ${mode === state.draft.content.density ? "selected" : ""}>${titleCase(mode)}</option>`).join("")}</select></div><div class="form-field"><label>Response space</label><select data-content-field="responseSpace"><option value="standard" ${state.draft.content.responseSpace === "standard" ? "selected" : ""}>Standard</option><option value="large" ${state.draft.content.responseSpace === "large" ? "selected" : ""}>Larger</option><option value="oral" ${state.draft.content.responseSpace === "oral" ? "selected" : ""}>Oral response</option></select></div><div class="form-field"><label>Classroom format</label><select data-draft-field="format">${DATA.printFormats.map(format => `<option value="${format.id}" ${format.id === state.draft.format ? "selected" : ""}>${esc(format.name)}</option>`).join("")}</select></div></div>
              <label class="check-row"><input type="checkbox" data-content-toggle="oralRehearsal" ${state.draft.content.oralRehearsal ? "checked" : ""}><span>Add oral rehearsal</span></label>
            </div></details>
            <details><summary>Sections and teacher notes</summary><div class="designer-control-body">
              <div class="section-switches">${[["example","Example"],["vocabulary","Vocabulary"],["oral","Oral rehearsal"]].map(([id,label]) => `<label><input type="checkbox" data-hidden-section="${id}" ${hidden.includes(id) ? "" : "checked"}><span>${label}</span></label>`).join("")}</div>
              <div class="form-field"><label for="teacher-notes">Teacher notes</label><textarea id="teacher-notes" data-content-field="teacherNotes" rows="3">${esc(state.draft.content.teacherNotes || "")}</textarea></div>
              <div class="form-field"><label for="tags">Library tags</label><input class="input" id="tags" data-draft-field="tags" value="${esc(state.draft.tags)}" placeholder="fractions, guided group, explanation"></div>
            </div></details>
            <div class="fade-explanation"><span>${esc(activeStage.name)} now</span><p>${esc(activeStage.description)}</p><strong>${esc(nextStage ? RESOURCE.nextFade(scaffold) : "The page is removed; one pupil-owned self-prompt remains.")}</strong></div>
          </aside>
          <section class="designer-preview-panel"><div class="preview-bar"><span>Live pupil preview</span><small>${esc(activeStage.name)} · ${esc(printFormatById(state.draft.format).name)}</small></div><div class="paper-wrap live-resource-preview" id="live-resource-preview">${renderResourceDocument(scaffold)}</div></section>
        </div>
      </div>${stepFooter({ nextLabel: "Review quality", nextAction: "generate-scaffold" })}`;
  }

  function renderReviewStep() {
    const scaffold = state.activeScaffold || scaffoldFromDraft();
    const audit = qualityAudit(scaffold);
    const flagged = audit.filter(item => item.status !== "Strong");
    const stageSet = RESOURCE.stageSet(scaffold);
    return `${createHead(6, "Review the engineered scaffold", "Use professional judgements rather than a false effectiveness score. Correct anything that could weaken the learning.")}
      <div class="create-card-body">
        <div class="review-stage-switch"><div><span class="eyebrow">Move through the growth pathway</span><p>Preview the same learning with a different amount of external support.</p></div><div class="compact-stage-path">${DATA.stages.map(stage => `<button class="${stage.id === scaffold.stage ? "is-active" : ""}" data-action="choose-stage" data-id="${stage.id}"><span>${stage.glyph}</span>${esc(stage.name)}</button>`).join("")}</div></div>
        ${state.compareStages ? `<div class="stage-compare-grid">${DATA.stages.map(stage => `<section><div class="stage-compare-head"><strong>${stage.name}</strong><span>${stage.support}</span></div><div class="stage-mini-paper">${renderResourceDocument(stageSet[stage.id])}</div></section>`).join("")}</div>` : `<div class="preview-workspace">
          <div class="paper-wrap">${renderResourceDocument({ ...scaffold, stage: state.draft.stage, content: state.draft.content })}</div>
          <aside class="preview-tools">
            <button class="button button-primary" data-action="save-scaffold"><span data-icon="check"></span> Save to library</button>
            <button class="button" data-action="save-version"><span data-icon="copy"></span> Create checkpoint</button>
            <button class="button" data-action="open-print"><span data-icon="print"></span> Open Print Studio</button>
            <button class="button" data-action="toggle-stage-compare"><span data-icon="eye"></span> Compare four stages</button>
            ${scaffold.id && state.library.some(item => item.id === scaffold.id) ? `<button class="button" data-action="record-fade" data-id="${esc(scaffold.id)}"><span data-icon="down"></span> Record move to ${esc(titleCase(state.draft.stage))}</button>` : ""}
            ${scaffold.id && state.library.some(item => item.id === scaffold.id) ? `<button class="button" data-action="record-use-reflection" data-id="${esc(scaffold.id)}"><span data-icon="brain"></span> Reflect after use</button>` : ""}
            <div class="audit-panel audit-dashboard audit-judgement"><span class="audit-symbol">${flagged.length ? "!" : "✓"}</span><div><h3>${flagged.length ? `${flagged.length} review point${flagged.length === 1 ? "" : "s"}` : "Strong professional audit"}</h3><p>${flagged.length ? esc(flagged[0].reason) : "No obvious barrier, ownership, representation or fading issue was found."}</p></div><button class="text-link" data-action="show-quality-report">Inspect 11 judgements</button></div>
          </aside>
        </div>`}
      </div>
      ${stepFooter({ nextLabel: "Print, save or export", nextAction: "create-next", extra: '<button class="button" data-action="edit-design">Edit design</button>' })}`;
  }

  function renderOutputStep() {
    const scaffold = state.activeScaffold || scaffoldFromDraft();
    const aiStatus = AI.statusForResource(scaffold);
    return `${createHead(7, "Use, save or enhance", "The local resource is complete. Print it now, or invite external AI to contribute to one carefully bounded content slot.")}
      <div class="create-card-body output-workspace">
        <section class="output-actions"><div class="output-action-card"><span>${icon("check")}</span><div><h3>Save the classroom resource</h3><p>Create a deliberate local checkpoint with all four growth stages.</p></div><button class="button button-primary" data-action="save-scaffold">Save to library</button></div><div class="output-action-card"><span>${icon("print")}</span><div><h3>Print or make a mixed pack</h3><p>Convert the structure into ${DATA.printFormats.length} classroom formats.</p></div><button class="button" data-action="open-print">Open Print Studio 3</button></div></section>
        <section class="ai-editorial-invite"><div class="editorial-mark">${icon("editorial")}</div><div><span class="eyebrow">AI Companion 4 · optional and provider-neutral</span><h3>Invite one specialist contribution</h3><p>Scaffold Seeds keeps the objective, protected thinking, scaffold engine, fading pathway and print layout. External AI may contribute examples, passages, questions, critique or verification—never the whole resource.</p><div class="editorial-principle"><span>Scaffold Seeds designs</span><i></i><span>External AI contributes</span><i></i><span>You judge</span><i></i><span>Scaffold Seeds rebuilds</span></div></div><aside><span class="resource-status status-${esc(aiStatus)}">${esc(DATA.ai.statuses.find(status => status.id === aiStatus)?.name || "Local draft")}</span><button class="button button-primary" data-action="open-ai"><span data-icon="editorial"></span> Open AI Companion</button><small>Nothing is sent automatically.</small></aside></section>
      </div>${stepFooter({ nextLabel: "Start a new scaffold", nextAction: "start-again", extra: '<button class="button" data-action="edit-design">Return to designer</button>' })}`;
  }

  function scoreBarrierCandidates(draft = state.draft) {
    const text = `${draft.situation || ""} ${draft.objective || ""} ${draft.topic || ""}`.toLowerCase();
    const entry = currentEntry(draft);
    const intelligence = curriculumIntelligence(draft);
    const scores = new Map(DATA.barriers.map(barrier => [barrier.id, 0]));
    DATA.barriers.forEach(barrier => {
      barrier.keywords.forEach(keyword => {
        if (text.includes(keyword)) scores.set(barrier.id, scores.get(barrier.id) + 3);
      });
    });
    (entry?.barriers || []).forEach((id, index) => scores.set(id, scores.get(id) + 5 - index));
    intelligence.preferredFamilies.forEach(familyId => {
      const family = familyById(familyId);
      family.barriers.forEach((id, index) => scores.set(id, (scores.get(id) || 0) + 2 - Math.min(index, 1)));
    });
    if (/can|understand|identify/.test(text) && /but|however|struggle|cannot|can't/.test(text)) scores.set("explanation", scores.get("explanation") + 2);
    if (/why|because|justify|evidence|equivalent/.test(text)) scores.set("reasoning", scores.get("reasoning") + 4);
    if (/confus|misconception|same as/.test(text)) scores.set("conceptual", scores.get("conceptual") + 4);
    if (/adult|prompt|independent|start/.test(text)) {
      scores.set("planning", scores.get("planning") + 3);
      scores.set("self-monitoring", scores.get("self-monitoring") + 2);
    }
    if (draft.subject === "science" && /investigat|fair test|variable|enquiry|measure/.test(text)) {
      scores.set("planning", scores.get("planning") + 3);
      scores.set("self-monitoring", scores.get("self-monitoring") + 2);
    }
    if (draft.subject === "history" && /source|interpret|cause|signific|evidence/.test(text)) scores.set("reasoning", scores.get("reasoning") + 4);
    if (draft.subject === "geography" && /map|scale|place|pattern|fieldwork/.test(text)) scores.set("representation", scores.get("representation") + 3);
    if (draft.subject === "computing" && /debug|error|test|state/.test(text)) scores.set("self-monitoring", scores.get("self-monitoring") + 4);
    if (draft.subject === "english" && /fluency|decode|phrase|read aloud/.test(text)) scores.set("reading", scores.get("reading") + 5);
    if (draft.subject === "mathematics" && /model|diagram|abstract|see|represent/.test(text)) scores.set("representation", scores.get("representation") + 4);
    return [...scores.entries()].sort((a, b) => b[1] - a[1]);
  }

  function analyseBarrier() {
    const entry = currentEntry();
    const ranked = scoreBarrierCandidates().slice(0, 6);
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
    const intelligence = curriculumIntelligence();
    const reasons = {
      knowledge: `${subject} knowledge needed for ${intelligence.profile.name.toLowerCase()} may not yet be secure enough to retrieve while working.`,
      vocabulary: `The language of ${state.draft.topic.toLowerCase()} may be limiting understanding or precise ${state.draft.subject === "english" ? "authorial" : "subject"} expression.`,
      reading: "Text or instruction demand may be obscuring the intended subject thinking.",
      conceptual: `The description suggests a fragile connection beneath an apparently successful procedure or response.`,
      representation: intelligence.representations[0] ? `${intelligence.representations[0].name} may reveal the relationship because it is useful ${intelligence.representations[0].use}.` : "A carefully chosen model may reveal a structure that words alone are not making visible.",
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
    const intelligence = curriculumIntelligence();
    const successfulPractice = state.library.filter(item => item.subject === subject && item.reflection?.worked === "yes");
    state.draft.recommendations = DATA.engines
      .map(engine => {
        const barrierScore = engine.barriers.reduce((total, id) => total + (chosen.includes(id) ? 4 : 0), 0);
        const subjectScore = engine.subjects.includes(subject) ? 7 : engine.subjects.includes("all") ? 3 : -40;
        const familyScore = intelligence.preferredFamilies.includes(engine.family) ? 3 : 0;
        const phaseScore = state.draft.phase === "Teacher modelling" && ["worked-example", "incomplete-example", "modelling-page"].includes(engine.id) ? 3
          : state.draft.phase === "Before the lesson" && engine.id === "vocabulary-preteach" ? 3
          : state.draft.phase === "Review and reflection" && engine.id === "metacognition-planner" ? 3
          : state.draft.phase === "Independent practice" && ["metacognition-planner", "reasoning-ladder"].includes(engine.id) ? 2 : 0;
        const practiceScore = successfulPractice.some(item => item.engineId === engine.id) ? 1 : 0;
        const profileScore = (engine.prompts || []).some(prompt => `${state.draft.objective} ${state.draft.situation}`.toLowerCase().includes(prompt.toLowerCase().split(" ")[0])) ? 1 : 0;
        return { id: engine.id, score: barrierScore + subjectScore + familyScore + phaseScore + practiceScore + profileScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.id);
    if (state.draft.preferredEngine && !state.draft.recommendations.includes(state.draft.preferredEngine)) state.draft.recommendations[2] = state.draft.preferredEngine;
    if (state.draft.preferredEngine) state.draft.engineId = state.draft.preferredEngine;
    else if (!state.draft.recommendations.includes(state.draft.engineId)) state.draft.engineId = state.draft.recommendations[0];
    state.draft.familyId = engineById(state.draft.engineId).family;
    if (!state.draft.representation) state.draft.representation = intelligence.representations[0]?.name || "";
  }

  function recommendationReason(engine) {
    const intelligence = curriculumIntelligence();
    const matchedBarrier = engine.barriers.map(barrierById).find(barrier => state.draft.selectedBarriers.includes(barrier?.id));
    const subjectFit = engine.subjects.includes(state.draft.subject) || engine.subjects.includes("all");
    if (engine.family === "representation" && intelligence.representations[0]) return `${intelligence.representations[0].name} is worth considering because it is useful ${intelligence.representations[0].use}.`;
    if (matchedBarrier) return `Strong fit for ${matchedBarrier.name.toLowerCase()}: ${engine.bestFor}`;
    if (subjectFit) return `${intelligence.profile.name} benefits from this ${familyById(engine.family).name.toLowerCase()} structure.`;
    return engine.bestFor;
  }

  function scaffoldFromDraft() {
    const entry = currentEntry();
    const engine = engineById(state.draft.engineId);
    const intelligence = curriculumIntelligence();
    const now = new Date().toISOString();
    const existing = state.draft.editingId ? state.library.find(item => item.id === state.draft.editingId) : null;
    return {
      id: existing?.id || uid(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      favourite: existing?.favourite || false,
      archived: existing?.archived || false,
      year: state.draft.year,
      subject: state.draft.subject,
      topic: state.draft.topic,
      objective: state.draft.objective,
      phase: state.draft.phase,
      situation: state.draft.situation,
      expectedOutcome: state.draft.expectedOutcome,
      barriers: [...state.draft.selectedBarriers],
      customBarrier: state.draft.customBarrier,
      engineId: engine.id,
      familyId: engine.family,
      profileId: intelligence.profile.id,
      stage: state.draft.stage,
      title: state.draft.title || `${state.draft.topic}: ${engine.name}`,
      vocabulary: (state.draft.vocabulary || entry?.vocabulary.join(", ") || "").split(",").map(item => item.trim()).filter(Boolean).slice(0, 8),
      misconception: state.draft.misconception || entry?.misconceptions[0] || "",
      intention: state.draft.intention,
      essentialThinking: state.draft.essentialThinking || protectedThinkingStatement(),
      pupilAction: state.draft.pupilAction,
      removalPathway: state.draft.removalPathway,
      representation: state.draft.representation || intelligence.representations[0]?.name || "",
      threshold: intelligence.profile.threshold,
      disciplinaryThinking: intelligence.profile.disciplinary,
      prerequisites: intelligence.profile.prerequisites.slice(0, 4),
      smallSteps: intelligence.profile.smallSteps.slice(0, 6),
      teacherQuestions: intelligence.profile.questions.slice(0, 3),
      assessmentOpportunities: intelligence.profile.assessment.slice(0, 3),
      tags: state.draft.tags.split(",").map(item => item.trim()).filter(Boolean).slice(0, 8),
      content: { ...state.draft.content, vocabulary: state.draft.content?.vocabulary?.length ? state.draft.content.vocabulary : (state.draft.vocabulary || "").split(",").map(item => item.trim()).filter(Boolean), misconception: state.draft.content?.misconception || state.draft.misconception },
      diagram: { ...state.draft.diagram, type: state.draft.content?.diagramType || state.draft.diagram?.type || "", labels: state.draft.content?.diagramLabels || state.draft.diagram?.labels || [] },
      format: state.draft.format,
      growthStages: [...state.draft.growthStages],
      versions: existing?.versions || [],
      reflection: existing?.reflection || null,
      lastPrintedAt: existing?.lastPrintedAt || null
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
    const teacherCode = `SS-${String.fromCharCode(65 + Math.max(0, DATA.stages.findIndex(item => item.id === stage.id)))}`;
    const density = scaffold.content?.density || "calm";
    const responseSpace = scaffold.content?.responseSpace || "standard";
    return `<article class="paper density-${esc(density)} response-${esc(responseSpace)}" data-page="resource" data-stage="${esc(stage.id)}">
      <div class="paper-brand">Scaffold Seeds · ${esc(engine.name)} <small>${teacherCode}</small></div>
      <div class="resource-meta"><span>${esc(scaffold.year)}</span><span>${esc(subject.name)}</span><span>${esc(scaffold.topic)}</span></div>
      <h1>${esc(scaffold.title)}</h1>
      <p class="resource-objective"><strong>Learning focus:</strong> ${esc(scaffold.objective)}</p>
      <div class="resource-body">${body}</div>
      <footer class="resource-footer"><span>Name ____________________</span><span>Scaffold designed to fade</span></footer>
    </article>`;
  }

  function renderResourceDocument(scaffold) {
    const body = RESOURCE.renderBody(scaffold);
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
    const subjectStructures = {
      english: ["Purpose", "Main idea", "Develop as a writer", "Shape the ending"],
      history: ["Historical claim", "Period knowledge", "Evidence", "Reasoned connection"],
      geography: ["Located claim", "Evidence at this scale", "Process or pattern", "Wider connection"],
      science: ["Phenomenon", "Evidence", "Scientific idea", "Mechanism"],
      computing: ["Goal", "Logical idea", "Trace or example", "Evaluation"]
    };
    const labels = subjectStructures[scaffold.subject] || ["Claim", "Relevant knowledge", "Evidence", "Reasoned link"];
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
    const subjectSteps = {
      mathematics: ["Identify the mathematical structure", "Choose a representation and explain why it fits", "Carry out the strategy while linking each move to the structure", "Check with estimation, inverse or a different representation"],
      computing: ["Define the intended outcome", "Trace the planned logic and changing state", "Implement or correct one deliberate step", "Test with a case chosen to reveal an error"],
      english: ["Notice the writer or reader decision", "Explain what the choice achieves", "Apply the same principle in a new context", "Reread and evaluate the effect"]
    };
    const steps = subjectSteps[scaffold.subject] || ["Notice what the task is asking", "Choose the first useful representation or action", "Carry out the method and explain the decision", "Check the result against the original task"];
    const hideFrom = { seed: 4, sprout: 2, growth: 1, independent: 0 }[scaffold.stage];
    return `<h2>Study the decisions, then complete the thinking</h2><div class="worked-example"><section class="worked-column"><h3>Worked thinking</h3>${steps.map((step, index) => `<div class="worked-step"><span>${index + 1}</span><span class="${index >= hideFrom ? "" : "answer-content"}">${index < hideFrom ? esc(step) : "What would you do here—and why?"}</span></div>`).join("")}</section><section class="worked-column"><h3>Your parallel example</h3>${steps.map((step, index) => `<div class="worked-step"><span>${index + 1}</span><span>${supportText(scaffold, index === 0 ? "Identify the task." : "Follow the same kind of decision—not the same answer.", index < 2 ? "Use the model, then make your own choice." : "Explain your choice.", index === 0 ? "What matters first?" : "", "Plan, solve and check independently.")}</span></div>`).join("")}</section></div><h2>What should fade next?</h2><p>Circle the modelled step you no longer need to see.</p>`;
  }

  function renderRepresentationSelector(scaffold) {
    const intelligence = curriculumIntelligence(scaffold);
    const preferred = scaffold.representation ? intelligence.representations.find(item => item.name === scaffold.representation) : null;
    const representations = [...(preferred ? [preferred] : []), ...intelligence.representations.filter(item => item !== preferred)].slice(0, 3);
    while (representations.length < 3) representations.push({ name: ["Words and notation", "A second model", "No external model"][representations.length], use: "when it exposes the intended relationship", avoid: "when it adds visual load without insight" });
    return `<h2>Which representation reveals the subject relationship?</h2><div class="representation-grid">${representations.map((item, index) => `<section class="representation-card ${index === 0 && preferred ? "is-recommended" : ""}"><h3>${index + 1}. ${esc(item.name)}</h3><small>${esc(item.use)}</small><div class="representation-space"></div><p><strong>It makes visible…</strong></p><p><strong>It may conceal…</strong></p></section>`).join("")}</div><h2>Make a reasoned choice</h2><p>${supportText(scaffold, "The most useful representation is ___ because it makes ___ visible. I rejected ___ because…", "I would choose ___ because…", "Which representation exposes the important relationship?", "Choose, use and evaluate a representation independently.")}</p>${blankLines(3)}`;
  }

  function renderReasoningLadder(scaffold) {
    const subjectSteps = {
      english: [["Notice", "Which exact word, sentence or pattern matters?"], ["Connect", "What does the reader know that makes it meaningful?"], ["Interpret", "What idea or impression does that support?"], ["Justify", "Why is this evidence strong enough?"], ["Test", "What other reading is possible—and why is yours stronger?"]],
      mathematics: [["Notice structure", "What stays the same and what changes?"], ["Represent", "Which model exposes the relationship?"], ["Generalise", "What mathematical statement may be true?"], ["Justify", "Why must it work, not only in this example?"], ["Test", "Use a boundary case or counterexample."]],
      science: [["Observe", "What exactly was seen or measured?"], ["Select evidence", "Which result is relevant to the question?"], ["Use science", "Which scientific idea or model applies?"], ["Explain mechanism", "How does the idea account for the evidence?"], ["Limit", "What can the evidence not yet show?"]],
      history: [["Claim", "What historical claim are you considering?"], ["Use knowledge", "Which period knowledge makes the evidence meaningful?"], ["Select evidence", "What can this source or example reveal?"], ["Reason", "How does it support the claim?"], ["Test", "What other interpretation or factor must be considered?"]],
      geography: [["Locate", "Where is the pattern or process?"], ["Describe pattern", "What is distributed, connected or changing?"], ["Explain process", "Which human or physical process accounts for it?"], ["Connect", "How do place and scale shape the explanation?"], ["Scale test", "Would this claim still hold at another scale?"]],
      computing: [["Goal", "What should the system or algorithm do?"], ["Trace", "What instruction runs next?"], ["State", "What changes, and what remains stored?"], ["Explain", "Why does that produce the output?"], ["Test", "Which input is most likely to reveal a flaw?"]]
    };
    const steps = subjectSteps[scaffold.subject] || [["Notice", "What do you see, know or calculate?"], ["Connect", "Which detail, rule or relationship matters?"], ["Explain", "How does that connection support your idea?"], ["Justify", "Why should someone accept this conclusion?"], ["Test", "What might challenge it?"]];
    const visible = { seed: 5, sprout: 4, growth: 2, independent: 1 }[scaffold.stage];
    return `<h2>Move from noticing to a defensible conclusion</h2><div class="reasoning-steps">${steps.map(([label, prompt], index) => `<section class="reasoning-step"><div><strong>${esc(label)}</strong><span>${index < visible ? esc(prompt) : "Use your own next reasoning move."}</span>${blankLines(index < 2 ? 1 : 2)}</div></section>`).join("")}</div>`;
  }

  function renderObservationRecorder(scaffold) {
    const cells = scaffold.subject === "geography"
      ? [["Located observation", "Record what is present and exactly where."], ["Spatial pattern", "Describe distribution, connection or change without explaining yet."], ["Fieldwork limitation", "What might time, site or sampling have missed?"], ["Geographical meaning", "Connect the pattern to a human or physical process."]]
      : [["I see / measure", "Record only what can be observed or measured."], ["I notice a change", "Compare carefully with the start or another case."], ["I wonder", "Ask a question that could guide further observation."], ["I think this means", "Interpret the pattern. Link the claim to evidence."]];
    return `<h2>Observe before you explain</h2><div class="observation-grid">${cells.map(([title, prompt], index) => `<section class="observation-cell"><h3>${esc(title)}</h3><p>${scaffold.stage === "independent" && index < 3 ? "" : esc(prompt)}</p>${blankLines(4)}</section>`).join("")}</div><h2>Keep evidence and interpretation distinct</h2><p>Underline one observation. Draw an arrow to the idea it supports.</p>`;
  }

  function renderEvidenceBuilder(scaffold) {
    const labels = scaffold.subject === "science" ? ["Scientific claim", "Observation or result", "Scientific mechanism"]
      : scaffold.subject === "history" ? ["Historical claim", "Source plus period knowledge", "Historical inference"]
      : scaffold.subject === "geography" ? ["Located claim", "Map, fieldwork or case evidence", "Process and scale"]
      : scaffold.subject === "english" ? ["Interpretation", "Precise textual evidence", "Reader's reasoning"] : ["Claim", "Evidence", "Reasoning"];
    return `<h2>Build a subject chain that holds</h2><div class="evidence-chain"><section class="chain-card"><h3>${esc(labels[0])}</h3><p>${supportText(scaffold, "My answer or interpretation is…", "I think…", "State a precise claim.", "")}</p>${blankLines(5)}</section><div class="chain-link">→</div><section class="chain-card"><h3>${esc(labels[1])}</h3><p>${supportText(scaffold, "The exact detail, result or source feature is…", "This is shown by…", "Choose the strongest evidence.", "")}</p>${blankLines(5)}</section><div class="chain-link">→</div><section class="chain-card"><h3>${esc(labels[2])}</h3><p>${supportText(scaffold, "This evidence supports the claim because…", "This matters because…", "Make the connection explicit.", "")}</p>${blankLines(5)}</section></div><h2>Stress-test the chain</h2><p>Where is the weakest link? Strengthen it without adding irrelevant information.</p>${blankLines(2)}`;
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
    return RESOURCE.qualityAudit(scaffold);
  }

  function renderLibrary() {
    const filters = state.libraryFilters;
    const filtered = state.library
      .filter(item => Boolean(item.archived) === Boolean(filters.archived))
      .filter(item => !filters.query || `${item.title} ${item.topic} ${item.objective} ${item.situation} ${engineById(item.engineId).name} ${(item.tags || []).join(" ")}`.toLowerCase().includes(filters.query.toLowerCase()))
      .filter(item => filters.year === "all" || item.year === filters.year)
      .filter(item => filters.subject === "all" || item.subject === filters.subject)
      .filter(item => filters.family === "all" || (item.familyId || engineById(item.engineId).family) === filters.family)
      .filter(item => filters.format === "all" || item.format === filters.format)
      .filter(item => filters.stage === "all" || (item.growthStages || [item.stage]).includes(filters.stage))
      .filter(item => filters.aiStatus === "all" || (filters.aiStatus === "needs-review" ? ["response-imported", "review-required", "warnings-unresolved"].includes(AI.statusForResource(item)) : filters.aiStatus === "approved" ? ["teacher-approved", "print-ready"].includes(AI.statusForResource(item)) : AI.statusForResource(item) === filters.aiStatus))
      .filter(item => filters.source === "all" || (filters.source === "attached" ? (item.sources || []).length > 0 : (item.sources || []).length === 0))
      .filter(item => !filters.favourite || item.favourite)
      .sort((a, b) => filters.sort === "printed" ? new Date(b.lastPrintedAt || 0) - new Date(a.lastPrintedAt || 0) : filters.sort === "title" ? a.title.localeCompare(b.title) : new Date(b.updatedAt) - new Date(a.updatedAt));
    const cards = filtered.map(item => `
      <article class="library-card">
        <div class="library-thumb"><div class="mini-paper"></div><label class="library-select"><input type="checkbox" data-library-select="${esc(item.id)}" ${state.librarySelection.includes(item.id) ? "checked" : ""}><span>Select</span></label><span class="library-ai-status resource-status status-${esc(AI.statusForResource(item))}">${esc(aiStatusName(item))}</span><button class="favourite-button ${item.favourite ? "is-active" : ""}" data-action="toggle-favourite" data-id="${esc(item.id)}" aria-label="${item.favourite ? "Remove from" : "Add to"} favourites" aria-pressed="${item.favourite}">${icon("heart")}</button></div>
        <div class="library-card-body"><div class="library-card-title"><h3 title="${esc(item.title)}">${esc(item.title)}</h3><button class="text-link" data-action="rename-scaffold" data-id="${esc(item.id)}">Rename</button></div><p>${esc(item.year)} · ${esc(subjectById(item.subject).name)} · ${esc(engineById(item.engineId).name)}</p>
          <dl class="library-facts"><div><dt>Sticking point</dt><dd>${esc((item.customBarrier || item.situation || "Not recorded").slice(0, 110))}</dd></div><div><dt>Growth pathway</dt><dd>${esc((item.growthStages || DATA.stages.map(stage => stage.id)).map(titleCase).join(" · "))}</dd></div><div><dt>Formats</dt><dd>${esc(printFormatById(item.format || "workpage").name)} · ${esc((engineById(item.engineId).formats || []).slice(0, 2).map(id => printFormatById(id).name).join(" · "))}</dd></div></dl>
          <div class="tag-row"><span class="tag">Edited ${relativeDate(item.updatedAt)}</span>${item.ai?.rounds?.length ? `<span class="tag tag-ai">${item.ai.rounds.length} AI round${item.ai.rounds.length === 1 ? "" : "s"}</span>` : ""}${(item.sources || []).length ? '<span class="tag">Source attached</span>' : ""}${item.reflection ? '<span class="tag tag-reflected">Reflected</span>' : ""}${item.versions?.length ? `<span class="tag">${item.versions.length} version${item.versions.length === 1 ? "" : "s"}</span>` : ""}${(item.tags || []).slice(0, 2).map(tag => `<span class="tag">${esc(tag)}</span>`).join("")}</div>
          <div class="card-actions"><button class="button" data-action="open-scaffold" data-id="${esc(item.id)}"><span data-icon="eye"></span> Open</button><button class="icon-button" data-action="open-ai" data-id="${esc(item.id)}" aria-label="Open AI Companion for ${esc(item.title)}">${icon("editorial")}</button><button class="icon-button" data-action="show-versions" data-id="${esc(item.id)}" aria-label="View version history for ${esc(item.title)}">${icon("copy")}</button><button class="icon-button" data-action="record-use-reflection" data-id="${esc(item.id)}" aria-label="Reflect after using ${esc(item.title)}">${icon("brain")}</button><button class="icon-button" data-action="duplicate-scaffold" data-id="${esc(item.id)}" aria-label="Duplicate ${esc(item.title)}">${icon("plus")}</button><button class="icon-button" data-action="${item.archived ? "restore-scaffold" : "archive-scaffold"}" data-id="${esc(item.id)}" aria-label="${item.archived ? "Restore" : "Archive"} ${esc(item.title)}">${item.archived ? icon("upload") : icon("download")}</button>${item.archived ? `<button class="icon-button" data-action="delete-scaffold" data-id="${esc(item.id)}" aria-label="Permanently delete ${esc(item.title)}">${icon("trash")}</button>` : ""}</div>
        </div>
      </article>`).join("");
    return `
      <div class="page-heading"><div><span class="eyebrow">Saved on this device · Build 4</span><h2>${filters.archived ? "Archived scaffolds" : "Your scaffold library"}</h2><p>Local and AI-assisted resources share one calm library. Status, provenance and unresolved review remain visible without cluttering pupil pages.</p></div><button class="button button-primary" data-action="new-scaffold"><span data-icon="plus"></span> New scaffold</button></div>
      <div class="library-view-tabs"><button class="${!filters.archived ? "is-active" : ""}" data-action="library-view" data-id="active">Current <span>${state.library.filter(item => !item.archived).length}</span></button><button class="${filters.archived ? "is-active" : ""}" data-action="library-view" data-id="archived">Archive <span>${state.library.filter(item => item.archived).length}</span></button></div>
      ${state.librarySelection.length ? `<div class="library-batch"><strong>${state.librarySelection.length} selected</strong><button class="button button-compact" data-action="batch-export">Export</button><button class="button button-compact" data-action="batch-reviewed">Mark reviewed</button><button class="button button-compact" data-action="batch-archive">${filters.archived ? "Restore" : "Archive"}</button><button class="text-link" data-action="batch-clear">Clear selection</button><small>Resources with unresolved high-risk findings cannot be bulk approved.</small></div>` : ""}
      <div class="toolbar library-toolbar">
        <label class="search-field"><span data-icon="search"></span><input class="input" id="library-search" data-library-filter="query" value="${esc(filters.query)}" placeholder="Search titles, objectives or tags"><span class="visually-hidden"></span></label>
        <select data-library-filter="year" aria-label="Filter by year"><option value="all">All years</option>${DATA.years.map(year => `<option ${year === filters.year ? "selected" : ""}>${esc(year)}</option>`).join("")}</select>
        <select data-library-filter="subject" aria-label="Filter by subject"><option value="all">All subjects</option>${DATA.subjects.map(subject => `<option value="${subject.id}" ${subject.id === filters.subject ? "selected" : ""}>${esc(subject.name)}</option>`).join("")}</select>
        <select data-library-filter="family" aria-label="Filter by scaffold family"><option value="all">All families</option>${DATA.scaffoldFamilies.map(family => `<option value="${family.id}" ${family.id === filters.family ? "selected" : ""}>${esc(family.name)}</option>`).join("")}</select>
        <select data-library-filter="format" aria-label="Filter by classroom format"><option value="all">All formats</option>${DATA.printFormats.map(format => `<option value="${format.id}" ${format.id === filters.format ? "selected" : ""}>${esc(format.name)}</option>`).join("")}</select>
        <select data-library-filter="stage" aria-label="Filter by growth stage"><option value="all">All growth stages</option>${DATA.stages.map(stage => `<option value="${stage.id}" ${stage.id === filters.stage ? "selected" : ""}>${esc(stage.name)}</option>`).join("")}</select>
        <select data-library-filter="aiStatus" aria-label="Filter by AI review status"><option value="all">All review states</option><option value="needs-review" ${filters.aiStatus === "needs-review" ? "selected" : ""}>Needs review</option><option value="approved" ${filters.aiStatus === "approved" ? "selected" : ""}>Approved or print ready</option>${DATA.ai.statuses.map(status => `<option value="${status.id}" ${status.id === filters.aiStatus ? "selected" : ""}>${esc(status.name)}</option>`).join("")}</select>
        <select data-library-filter="source" aria-label="Filter by source record"><option value="all" ${filters.source === "all" ? "selected" : ""}>Any source state</option><option value="attached" ${filters.source === "attached" ? "selected" : ""}>Source attached</option><option value="none" ${filters.source === "none" ? "selected" : ""}>No source attached</option></select>
        <select data-library-filter="sort" aria-label="Sort library"><option value="edited" ${filters.sort === "edited" ? "selected" : ""}>Recently edited</option><option value="printed" ${filters.sort === "printed" ? "selected" : ""}>Recently printed</option><option value="title" ${filters.sort === "title" ? "selected" : ""}>Title</option></select>
        <button class="button ${filters.favourite ? "button-soft" : ""}" data-action="filter-favourites" aria-pressed="${filters.favourite}">${icon("heart")} Favourites</button>
      </div>
      ${state.library.length === 0 ? `<div class="empty-help"><span class="empty-mark">${icon("library")}</span><h4>A library built from real needs</h4><p>Your saved scaffolds will show objective, barrier, engine, fading stages, formats and intentional versions.</p><button class="button button-primary" data-action="new-scaffold">Create a scaffold</button></div>` : filtered.length ? `<div class="library-grid">${cards}</div>` : `<div class="empty-help"><span class="empty-mark">${icon("search")}</span><h4>No scaffolds match this view</h4><p>Clear one filter to widen the view. Nothing has been removed.</p><button class="button" data-action="clear-library-filters">Clear filters</button></div>`}`;
  }

  function renderKnowledge() {
    const subject = subjectById(state.knowledgeSubject);
    const brain = brainBySubject(subject.id);
    if (!brain.profiles.some(profile => profile.id === state.knowledgeProfile)) state.knowledgeProfile = brain.profiles[0].id;
    const profile = brain.profiles.find(item => item.id === state.knowledgeProfile) || brain.profiles[0];
    const lensLabels = { ideas: "Subject architecture", progression: "Small steps", misconceptions: "Misconceptions", toolkit: "Teacher toolkit" };
    return `
      <div class="page-heading"><div><span class="eyebrow">Built for England · Build 3 curriculum engineering</span><h2>Knowledge Studio</h2><p>Browse the subject thinking used inside every recommendation: big ideas, progression, misconceptions, representations and teacher decisions.</p></div></div>
      <div class="knowledge-layout">
        <div class="knowledge-nav"><div class="subject-tabs" role="tablist" aria-label="Subjects">${DATA.subjects.map(item => `<button class="subject-tab ${item.id === subject.id ? "is-active" : ""}" style="--subject-colour:${item.colour}" role="tab" aria-selected="${item.id === subject.id}" data-action="knowledge-subject" data-id="${item.id}">${esc(item.name)}</button>`).join("")}</div><div class="profile-list"><span class="eyebrow">Subject lenses</span>${brain.profiles.map(item => `<button class="profile-button ${item.id === profile.id ? "is-active" : ""}" data-action="knowledge-profile" data-id="${item.id}"><span></span>${esc(item.name)}</button>`).join("")}</div></div>
        <section class="knowledge-content" style="--subject-colour:${subject.colour}">
          <div class="knowledge-hero"><span class="eyebrow">${esc(subject.name)} · subject identity</span><h3>${esc(profile.name)}</h3><p>${esc(profile.disciplinary)}</p><div class="knowledge-hero-meta"><span>${brain.profiles.length} subject lenses</span><span>${subject.entries.length} curriculum contexts</span><span>${brain.knowledgeTypes.length} knowledge types</span></div></div>
          <div class="knowledge-lenses" role="tablist" aria-label="Knowledge lens">${Object.entries(lensLabels).map(([id, label]) => `<button class="${state.knowledgeLens === id ? "is-active" : ""}" data-action="knowledge-lens" data-id="${id}" role="tab" aria-selected="${state.knowledgeLens === id}">${esc(label)}</button>`).join("")}</div>
          <div class="knowledge-sections knowledge-studio-sections">${renderKnowledgeLens(subject, brain, profile)}</div>
        </section>
      </div>`;
  }

  function renderKnowledgeLens(subject, brain, profile) {
    if (state.knowledgeLens === "progression") {
      return `<article class="knowledge-card knowledge-feature"><span class="eyebrow">Threshold concept</span><h4>${esc(profile.threshold)}</h4><p>This is the relationship a scaffold must reveal without explaining away.</p></article>
        <article class="knowledge-card"><h4>Prerequisite knowledge</h4><p>Check these before adding more task structure.</p><ol class="knowledge-sequence">${profile.prerequisites.map(item => `<li>${esc(item)}</li>`).join("")}</ol></article>
        <article class="knowledge-card"><h4>Intelligent small steps</h4><p>A likely conceptual sequence—not a compulsory lesson script.</p><ol class="knowledge-sequence numbered">${profile.smallSteps.map(item => `<li>${esc(item)}</li>`).join("")}</ol></article>
        <article class="knowledge-card"><h4>Progression across primary</h4><p>How the wider subject demand grows.</p><ol class="knowledge-sequence numbered">${brain.progression.map(item => `<li>${esc(item)}</li>`).join("")}</ol></article>`;
    }
    if (state.knowledgeLens === "misconceptions") {
      return `<article class="knowledge-card knowledge-feature"><span class="eyebrow">Misconception principle</span><h4>Expose the idea; do not quietly design around it.</h4><p>A scaffold should make the pupil's current model discussable while leaving the repair work intellectually active.</p></article>
        ${profile.misconceptions.map((item, index) => `<article class="knowledge-card misconception-card"><span class="misconception-number">${String(index + 1).padStart(2, "0")}</span><h4>${esc(item)}</h4><p>${esc(profile.assessment[index % profile.assessment.length])}</p></article>`).join("")}
        <article class="knowledge-card"><h4>Teacher questions</h4><p>Use these before adding another written prompt.</p><div class="question-stack">${profile.questions.map(item => `<button data-action="copy-question" data-question="${esc(item)}">“${esc(item)}”<small>Copy</small></button>`).join("")}</div></article>`;
    }
    if (state.knowledgeLens === "toolkit") {
      const families = profile.families.map(familyById).filter(Boolean);
      return `<article class="knowledge-card"><h4>Representation guidance</h4><p>Representations are recommended for a reason, never as a subject decoration.</p><div class="representation-list">${profile.representations.map(item => `<section><div><strong>${esc(item.name)}</strong><p>Use ${esc(item.use)}.</p></div><small>Avoid ${esc(item.avoid)}.</small></section>`).join("")}</div></article>
        <article class="knowledge-card"><h4>Useful scaffold families</h4><p>Families organise the purpose of support before a printable engine is chosen.</p><div class="family-grid">${families.map(family => `<section><strong>${esc(family.name)}</strong><p>${esc(family.purpose)}</p></section>`).join("")}</div></article>
        <article class="knowledge-card"><h4>Assessment opportunities</h4><p>Small checks that reveal understanding before more support is added.</p><ul class="knowledge-list">${profile.assessment.map(item => `<li>${esc(item)}</li>`).join("")}</ul></article>
        <article class="knowledge-card"><h4>Teacher reminders</h4><p>Decisions used quietly throughout the recommendation engine.</p><ul class="knowledge-list">${brain.teacherReminders.map(item => `<li>${esc(item)}</li>`).join("")}</ul></article>`;
    }
    return `<article class="knowledge-card knowledge-feature"><span class="eyebrow">Subject identity</span><h4>${esc(brain.identity)}</h4><p>${esc(subject.summary)}</p></article>
      <article class="knowledge-card"><h4>Big ideas</h4><p>Ideas that connect individual curriculum statements into a coherent subject.</p><ul class="knowledge-list">${brain.bigIdeas.map(item => `<li>${esc(item)}</li>`).join("")}</ul></article>
      <article class="knowledge-card"><h4>Knowledge types</h4><p>What pupils may need to know and coordinate here.</p><div class="knowledge-pills">${brain.knowledgeTypes.map(item => `<span class="knowledge-pill">${esc(item)}</span>`).join("")}</div></article>
      <article class="knowledge-card"><h4>High-leverage vocabulary</h4><p>Teach form, meaning, connection and use—not a detached glossary.</p><div class="knowledge-pills">${profile.vocabulary.map(item => `<span class="knowledge-pill word-pill">${esc(item)}</span>`).join("")}</div></article>
      <article class="knowledge-card"><h4>What strong scaffolding protects</h4><p>These principles are used by the recommendation and quality systems.</p><div class="knowledge-pills">${subject.principles.map(item => `<span class="knowledge-pill">${esc(item)}</span>`).join("")}</div></article>`;
  }

  function activeForAI() {
    return state.activeScaffold || state.library.find(item => !item.archived) || null;
  }

  function ensureAIWorkspace(scaffold = activeForAI(), force = false) {
    if (!scaffold) return null;
    if (force || !state.aiWorkspace || state.aiWorkspace.resourceId !== scaffold.id) {
      const saved = readStore(`${STORAGE.aiWorkspace}.${scaffold.id}`, null)
        || (!force && state.aiWorkspace?.resourceId === scaffold.id ? state.aiWorkspace : null);
      state.aiWorkspace = AI.createWorkspace(scaffold, saved);
      state.aiTaskFamily = AI.taskById(state.aiWorkspace.options.taskId).family;
      saveAIWorkspace();
    }
    return state.aiWorkspace;
  }

  function aiStatusName(resource) {
    const id = AI.statusForResource(resource);
    return DATA.ai.statuses.find(status => status.id === id)?.name || "Local draft";
  }

  function updateAIResourceStatus(status, extras = {}) {
    const scaffold = activeForAI();
    if (!scaffold) return;
    scaffold.ai = { ...(scaffold.ai || {}), schemaVersion: 4, rounds: scaffold.ai?.rounds || [], provenance: scaffold.ai?.provenance || [], status, ...extras };
    const index = state.library.findIndex(item => item.id === scaffold.id);
    if (index >= 0) state.library[index] = scaffold;
    state.activeScaffold = scaffold;
    writeStore(STORAGE.library, state.library);
  }

  function renderAIStudio() {
    const scaffold = activeForAI();
    if (!scaffold) {
      return `<div class="page-heading"><div><span class="eyebrow">Controlled external intelligence</span><h2>AI Companion</h2><p>Design a complete local scaffold before inviting an external content contribution.</p></div></div><div class="empty-help"><span class="empty-mark">${icon("editorial")}</span><h4>Scaffold Seeds designs first</h4><p>Create the learning, barrier, protected thinking and scaffold structure locally. AI Companion will then know exactly what may—and may not—change.</p><button class="button button-primary" data-action="new-scaffold">Create a scaffold</button></div>`;
    }
    const workspace = ensureAIWorkspace(scaffold);
    const phases = [
      ["task", "1", "Request"], ["prompt", "2", "Prepare"], ["import", "3", "Return"], ["review", "4", "Review"], ["verify", "5", "Verify & rebuild"]
    ];
    const phaseIndex = phases.findIndex(([id]) => id === workspace.phase);
    const content = { task: renderAITaskPhase, prompt: renderAIPromptPhase, import: renderAIImportPhase, review: renderAIReviewPhase, verify: renderAIVerifyPhase }[workspace.phase](scaffold, workspace);
    const stage = stageById(scaffold.stage);
    const engine = engineById(scaffold.engineId);
    return `<div class="page-heading ai-page-heading"><div><span class="eyebrow">AI Companion 4 · careful editorial exchange</span><h2>External range. Local control.</h2><p>Invite one narrow contribution, bring it back as inert content, inspect every change, then rebuild it inside Scaffold Seeds.</p></div><div class="local-only-badge">${icon("shield")}<span><strong>Nothing sent automatically</strong><small>No API, account or backend</small></span></div></div>
      <div class="ai-progress" role="navigation" aria-label="AI enhancement workflow">${phases.map(([id, number, label], index) => `<button class="${workspace.phase === id ? "is-active" : index < phaseIndex ? "is-complete" : ""}" data-action="ai-phase" data-id="${id}" ${index > 0 && !workspace.prompt ? "disabled" : index > 2 && !workspace.parsed ? "disabled" : ""}><span>${index < phaseIndex ? "✓" : number}</span><strong>${label}</strong></button>`).join("")}</div>
      <div class="ai-studio-layout">
        <aside class="ai-context-rail">
          <span class="resource-status status-${esc(AI.statusForResource(scaffold))}">${esc(aiStatusName(scaffold))}</span>
          <div class="ai-resource-summary"><span class="eyebrow">Current local scaffold</span><h3>${esc(scaffold.title)}</h3><p>${esc(scaffold.year)} · ${esc(subjectById(scaffold.subject).name)}</p><dl><div><dt>Objective</dt><dd>${esc(scaffold.objective)}</dd></div><div><dt>Engine</dt><dd>${esc(engine.name)}</dd></div><div><dt>Support now</dt><dd>${esc(stage.name)}</dd></div></dl></div>
          <div class="protected-rail"><span>${icon("shield")}</span><div><strong>Protected pupil thinking</strong><p>${esc(scaffold.essentialThinking || scaffold.disciplinaryThinking)}</p></div></div>
          <div class="ai-boundary"><strong>The boundary</strong><p>AI may contribute content. It cannot control page geometry, fonts, stage labels, diagrams, hierarchy or the removal pathway.</p></div>
          <button class="text-link" data-action="edit-design">← Return to local designer</button>
        </aside>
        <section class="ai-workbench">${content}</section>
      </div>`;
  }

  function renderAISpecialistControls(task, options) {
    const passageTasks = ["reading-passage", "information-text", "background-knowledge"];
    const questionTasks = ["practice-questions", "reasoning-prompts", "retrieval-questions", "extension", "challenge-pathway", "independence-check"];
    const exampleTasks = ["accurate-examples", "non-examples", "alternative-examples", "misconception-contrast"];
    const modelTasks = ["model-responses", "flawed-responses"];
    const misconceptionTasks = ["misconceptions", "misconception-contrast", "critique-misconceptions"];
    const vocabularyTasks = ["vocabulary-set", "verify-vocabulary"];
    let fields = "";
    let title = "";
    let note = "";
    if (passageTasks.includes(task.id)) {
      title = "Reading passage studio";
      note = "Set purpose and knowledge demand without reducing reading quality to one score.";
      fields = `<label><span>Text type</span><input class="input" data-ai-option="textType" value="${esc(options.textType)}" placeholder="information text, narrative, explanation…"></label><label><span>Curriculum purpose</span><select data-ai-option="passagePurpose"><option ${options.passagePurpose === "subject access" ? "selected" : ""}>subject access</option><option ${options.passagePurpose === "reading instruction" ? "selected" : ""}>reading instruction</option><option ${options.passagePurpose === "fluency practice" ? "selected" : ""}>fluency practice</option></select></label><label><span>Version requested</span><select data-ai-option="passageVersion"><option ${options.passageVersion === "original" ? "selected" : ""}>original</option><option ${options.passageVersion === "clearer language" ? "selected" : ""}>clearer language</option><option ${options.passageVersion === "chunked" ? "selected" : ""}>chunked</option><option ${options.passageVersion === "read-aloud support" ? "selected" : ""}>read-aloud support</option><option ${options.passageVersion === "vocabulary-supported" ? "selected" : ""}>vocabulary-supported</option></select></label><label><span>Vocabulary focus</span><input class="input" data-ai-option="vocabularyFocus" value="${esc(options.vocabularyFocus)}" placeholder="Words to include and explain"></label><label class="span-2"><span>Background knowledge assumed</span><textarea data-ai-option="assumedKnowledge" rows="2" placeholder="What readers may already know…">${esc(options.assumedKnowledge)}</textarea></label>`;
    } else if (questionTasks.includes(task.id)) {
      title = "Question generation studio";
      note = "Lock purpose, response and progression before generating practice.";
      fields = `<label><span>Question purpose</span><select data-ai-option="questionPurpose">${["retrieval", "fluency", "application", "reasoning", "explanation", "comparison", "misconception diagnosis", "independent check", "extension"].map(value => `<option ${options.questionPurpose === value ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label><label><span>Response type</span><input class="input" data-ai-option="responseType" value="${esc(options.responseType)}" placeholder="short explanation, oral, selection…"></label><label><span>Difficulty pattern</span><input class="input" data-ai-option="difficultyPattern" value="${esc(options.difficultyPattern)}" placeholder="e.g. build then vary"></label><label><span>Context range</span><input class="input" data-ai-option="contextRange" value="${esc(options.contextRange)}"></label><label><span>Answer requirements</span><input class="input" data-ai-option="answerRequirements" value="${esc(options.answerRequirements)}"></label><label><span>Misconception focus</span><input class="input" data-ai-option="misconceptionFocus" value="${esc(options.misconceptionFocus)}" placeholder="Optional diagnostic focus"></label>`;
    } else if (exampleTasks.includes(task.id)) {
      title = "Example and non-example studio";
      note = "Vary surface features while protecting the concept boundary.";
      fields = `<label class="span-2"><span>Defining feature</span><textarea data-ai-option="coreFeature" rows="2" placeholder="The feature every example must preserve…">${esc(options.coreFeature)}</textarea></label><label class="span-2"><span>Variation plan</span><textarea data-ai-option="variationPattern" rows="2">${esc(options.variationPattern)}</textarea></label>`;
    } else if (modelTasks.includes(task.id)) {
      title = "Model response studio";
      note = "Choose the teaching purpose and how much pupils should see.";
      fields = `<label><span>Model purpose</span><select data-ai-option="modelPurpose">${["noticing quality", "identifying success", "finding misconceptions", "editing", "comparing explanations", "discussing authorial choices"].map(value => `<option ${options.modelPurpose === value ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label><label><span>Model type</span><select data-ai-option="modelType">${["strong and partial contrast", "strong model", "partial model", "flawed model", "improved model", "annotated model", "oral model"].map(value => `<option ${options.modelType === value ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label><label><span>Reveal guidance</span><input class="input" data-ai-option="revealAmount" value="${esc(options.revealAmount)}"></label>`;
    } else if (misconceptionTasks.includes(task.id)) {
      title = "Misconception studio";
      note = "Separate a conceptual model from an error, slip or missing prerequisite.";
      fields = `<label class="span-2"><span>Observed misconception or response</span><textarea data-ai-option="observedMisconception" rows="2" placeholder="Leave blank for cautious candidates…">${esc(options.observedMisconception)}</textarea></label><label><span>Current classification</span><select data-ai-option="misconceptionKind">${["not yet classified", "conceptual misconception", "procedural error", "language misunderstanding", "careless slip", "missing prerequisite knowledge"].map(value => `<option ${options.misconceptionKind === value ? "selected" : ""}>${esc(value)}</option>`).join("")}</select></label>`;
    } else if (vocabularyTasks.includes(task.id)) {
      title = "Vocabulary verification studio";
      note = "Keep rich teacher knowledge separate from the small pupil-facing selection.";
      fields = `<label class="span-2"><span>Words or concept focus</span><textarea data-ai-option="vocabularyFocus" rows="2" placeholder="Enter exact words, or use the selected local vocabulary…">${esc(options.vocabularyFocus)}</textarea></label><label><span>Detail balance</span><select data-ai-option="vocabularyDetail"><option ${options.vocabularyDetail === "full teacher record; concise pupil selection" ? "selected" : ""}>full teacher record; concise pupil selection</option><option ${options.vocabularyDetail === "definitions and examples only" ? "selected" : ""}>definitions and examples only</option><option ${options.vocabularyDetail === "morphology and multiple meanings" ? "selected" : ""}>morphology and multiple meanings</option></select></label>`;
    } else if (task.id === "teacher-modelling") {
      title = "Teacher modelling generator";
      note = "A useful think-aloud is concise and stops before it owns the pupil's decision.";
      fields = `<label><span>Deliberate mistake</span><select data-ai-option="modellingMistake"><option ${options.modellingMistake === "include only if instructionally useful" ? "selected" : ""}>include only if instructionally useful</option><option ${options.modellingMistake === "include one plausible mistake" ? "selected" : ""}>include one plausible mistake</option><option ${options.modellingMistake === "do not include a mistake" ? "selected" : ""}>do not include a mistake</option></select></label><label><span>Maximum script words</span><input class="input" type="number" min="60" max="300" value="${Number(options.modellingLimit) || 140}" data-ai-option="modellingLimit"></label>`;
    }
    if (!fields) return "";
    return `<section class="ai-specialist-controls"><div class="section-heading"><div><span class="eyebrow">Focused configuration</span><h4>${esc(title)}</h4><p>${esc(note)}</p></div></div><div class="ai-control-grid">${fields}</div></section>`;
  }

  function renderImageChecks(image) {
    const analysis = image?.analysis;
    if (!analysis) return '<section class="image-analysis"><strong>Local image checks pending</strong><span>Contrast, ink coverage and print size will be sampled in this browser.</span></section>';
    const warnings = [];
    if (analysis.contrast === "low") warnings.push("Low tonal separation: check important details in greyscale before printing.");
    if (analysis.inkCoverage > 45) warnings.push("High estimated ink coverage: crop or lighten the image for photocopying.");
    if (analysis.printWidthMm < 75 || analysis.printHeightMm < 50) warnings.push("Limited print resolution: keep this image small to avoid softness.");
    return '<section class="image-analysis ' + (warnings.length ? 'needs-review' : 'is-clear') + '"><div><strong>Local image checks</strong><span>Pattern-based guidance—not a guarantee of print quality.</span></div><dl><div><dt>Contrast</dt><dd>' + esc(titleCase(analysis.contrast)) + ' tonal range</dd></div><div><dt>Ink</dt><dd>' + analysis.inkCoverage + '% estimated coverage</dd></div><div><dt>Print size</dt><dd>about ' + analysis.printWidthMm + ' × ' + analysis.printHeightMm + ' mm at 300 ppi</dd></div></dl>' + (warnings.length ? '<ul>' + warnings.map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>' : '<p>No obvious local image warning. Confirm the final print preview yourself.</p>') + '</section>';
  }

  function renderAITaskPhase(scaffold, workspace) {
    const options = workspace.options;
    const engine = engineById(scaffold.engineId);
    const compatible = new Set(engine.ai?.compatibleTasks || []);
    const family = DATA.ai.taskFamilies.find(item => item.id === state.aiTaskFamily) || DATA.ai.taskFamilies[0];
    const tasks = DATA.aiTasks.filter(task => task.family === family.id).sort((a, b) => Number(compatible.has(b.id)) - Number(compatible.has(a.id)) || a.name.localeCompare(b.name));
    const selected = AI.taskById(options.taskId);
    const templates = DATA.ai.templates.filter(template => template.subjects.includes("all") || template.subjects.includes(scaffold.subject));
    const knowledge = [["prerequisites", "Prior learning"], ["vocabulary", "Vocabulary"], ["misconceptions", "Misconceptions"], ["progression", "Progression notes"], ["representations", "Representation guidance"]];
    return `<div class="ai-phase-head"><span class="phase-number">01</span><div><span class="eyebrow">Design locally · request narrowly</span><h3>Choose one useful contribution</h3><p>Every option states what changes and what remains untouched. Compatible tasks are shown first.</p></div></div>
      <section class="ai-templates"><div class="section-heading"><div><h4>Starting configurations</h4><p>These configure the prompt engine; they do not insert generic content.</p></div></div><div class="ai-template-strip">${templates.map(template => `<button data-action="ai-template" data-id="${template.id}"><span>${icon("file")}</span><strong>${esc(template.name)}</strong><small>${esc(titleCase(template.depth))} · ${template.quantity} item${template.quantity === 1 ? "" : "s"}</small></button>`).join("")}</div></section>
      <section class="ai-task-selector"><div class="ai-family-tabs" role="tablist">${DATA.ai.taskFamilies.map(item => `<button class="${item.id === family.id ? "is-active" : ""}" data-action="ai-family" data-id="${item.id}" role="tab" aria-selected="${item.id === family.id}"><strong>${esc(item.name)}</strong><small>${esc(item.description)}</small></button>`).join("")}</div><div class="ai-task-grid">${tasks.map(task => `<button class="ai-task-card ${task.id === selected.id ? "is-selected" : ""}" data-action="ai-choose-task" data-id="${task.id}" aria-pressed="${task.id === selected.id}">${compatible.has(task.id) ? '<span class="compatible-mark">Engine fit</span>' : ""}<span class="review-dot risk-${task.risk}"></span><h4>${esc(task.name)}</h4><p>${esc(task.summary)}</p><dl><div><dt>Changes</dt><dd>${esc(task.changes)}</dd></div><div><dt>Leaves</dt><dd>${esc(task.preserves)}</dd></div></dl></button>`).join("")}</div></section>
      <section class="ai-request-controls"><div class="section-heading"><div><h4>Bound the request</h4><p>${esc(selected.summary)} It deliberately leaves ${esc(selected.leavesUntouched.toLowerCase())}</p></div><span class="review-level risk-${esc(options.reviewLevel)}">${esc(DATA.ai.reviewLevels[options.reviewLevel]?.name || "Careful")} review</span></div><div class="ai-control-grid">
        <label><span>Prompt depth</span><select data-ai-option="depth">${DATA.ai.promptDepths.map(depth => `<option value="${depth.id}" ${options.depth === depth.id ? "selected" : ""}>${esc(depth.name)} — ${esc(depth.description)}</option>`).join("")}</select></label>
        <label><span>Review level</span><select data-ai-option="reviewLevel">${Object.values(DATA.ai.reviewLevels).map(level => `<option value="${level.id}" ${options.reviewLevel === level.id ? "selected" : ""}>${esc(level.name)} — ${esc(level.description)}</option>`).join("")}</select></label>
        <label><span>Number of items</span><input class="input" type="number" min="1" max="20" value="${Number(options.quantity) || selected.quantity}" data-ai-option="quantity"></label>
        <label><span>Maximum main-content words</span><input class="input" type="number" min="60" max="1500" step="10" value="${Number(options.maxWords) || 180}" data-ai-option="maxWords"></label>
        <label><span>Return format</span><select data-ai-option="returnFormat"><option value="structured-text" ${options.returnFormat === "structured-text" ? "selected" : ""}>Plain structured text</option><option value="json" ${options.returnFormat === "json" ? "selected" : ""}>Constrained JSON</option></select></label>
        <label><span>Content slot AI may change</span><select data-ai-option="changeSlot">${(engine.ai?.allowedSlots || ["example", "prompts", "vocabulary", "teacherNotes"]).map(slot => `<option value="${slot}" ${options.changeSlot === slot ? "selected" : ""}>${esc(titleCase(slot))}</option>`).join("")}</select></label>
        <label><span>Apply accepted content to</span><select data-ai-option="stageScope"><option value="all" ${options.stageScope === "all" ? "selected" : ""}>Shared pathway content</option><option value="current" ${options.stageScope === "current" ? "selected" : ""}>${esc(stageById(scaffold.stage).name)} only</option></select></label>
        ${scaffold.subject === "english" ? `<label><span>School phonics programme, if relevant</span><input class="input" data-ai-option="phonicsProgramme" value="${esc(options.phonicsProgramme)}" placeholder="Leave blank when not a phonics task"></label>` : ""}
        ${scaffold.subject === "languages" ? `<label><span>Target language and variant</span><input class="input" data-ai-option="targetLanguage" value="${esc(options.targetLanguage)}" placeholder="e.g. French · France"></label>` : ""}
        <label class="span-2"><span>Precise context note, if needed</span><textarea data-ai-option="contextNote" rows="2" placeholder="Names, values, text type, scenario boundary or content to retain…">${esc(options.contextNote)}</textarea></label>
      </div></section>
      ${renderAISpecialistControls(selected, options)}
      <section class="knowledge-inclusion"><div><span class="eyebrow">Knowledge Studio connection</span><h4>Local knowledge included in the prompt</h4><p>Only relevant selected items are included—not the full curriculum database.</p></div><div>${knowledge.map(([id, label]) => `<label><input type="checkbox" data-ai-knowledge="${id}" ${(options.selectedKnowledge || []).includes(id) ? "checked" : ""}><span>${esc(label)}</span></label>`).join("")}</div></section>
      <details class="image-preparation"><summary>Prepare an optional local image</summary><div class="image-prep-body"><div><h4>Teacher-added image preparation</h4><p>The image stays in this browser. It is never uploaded by Scaffold Seeds.</p><label class="button" for="ai-image-file">Choose local image</label><input class="file-input" id="ai-image-file" type="file" accept="image/png,image/jpeg,image/webp" data-ai-image-file></div>${workspace.image ? `<div class="image-prep-preview"><img src="${esc(workspace.image.dataUrl)}" alt="${esc(workspace.image.alt || "Local preview")}" style="transform:rotate(${Number(workspace.image.rotation) || 0}deg);object-fit:${esc(workspace.image.fit || "contain")};filter:${workspace.image.greyscale ? "grayscale(1)" : "none"}"><span>${Math.round((workspace.image.bytes || 0) / 1024)} KB · ${workspace.image.width || "?"} × ${workspace.image.height || "?"}</span></div><div class="image-prep-controls"><label>Caption<input class="input" data-ai-image-field="caption" value="${esc(workspace.image.caption || "")}"></label><label>Alt text<input class="input" data-ai-image-field="alt" value="${esc(workspace.image.alt || "")}"></label><label>Fit<select data-ai-image-field="fit"><option value="contain" ${workspace.image.fit === "contain" ? "selected" : ""}>Contain</option><option value="cover" ${workspace.image.fit === "cover" ? "selected" : ""}>Crop to fit</option></select></label><div class="image-button-row"><button class="button button-compact" data-action="ai-rotate-image">Rotate</button><button class="button button-compact" data-action="ai-toggle-greyscale">Greyscale preview</button><button class="button button-compact" data-action="ai-remove-image">Remove</button></div>${workspace.image.bytes > 850000 ? '<p class="image-warning">Large image: local browser storage may become unreliable. Reduce the file before saving many versions.</p>' : ""}</div>` : '<div class="image-empty">PNG, JPEG or WebP · use no identifiable pupil images</div>'}</div></details>
      ${workspace.image ? renderImageChecks(workspace.image) : ""}
      <div class="ai-phase-footer"><span>${icon("shield")} The scaffold already works without AI.</span><button class="button button-primary" data-action="ai-prepare-prompt">Prepare AI prompt ${icon("arrow")}</button></div>`;
  }

  function promptTextForView(workspace) {
    const prompt = workspace.prompt;
    if (!prompt) return "";
    const view = workspace.promptView || "primary";
    if (workspace.promptManual && view === "primary") return workspace.promptManual;
    return { primary: prompt.scrubbed, compact: prompt.compact, structured: prompt.structured, packet: prompt.packet, image: prompt.imageBrief, verify: prompt.verificationOnly }[view] || prompt.scrubbed;
  }

  function renderAIPromptPhase(scaffold, workspace) {
    if (!workspace.prompt) return `<div class="empty-help"><h4>No prompt prepared yet</h4><p>Choose one bounded task first.</p><button class="button" data-action="ai-phase" data-id="task">Choose a task</button></div>`;
    const prompt = workspace.prompt;
    const view = workspace.promptView || "primary";
    const privacy = view === "primary" && !workspace.promptManual ? prompt.privacy : AI.privacyScan(promptTextForView(workspace));
    const views = [["primary", "Professional"], ["compact", "Compact"], ["structured", "Structured"], ["packet", "Prompt packet"], ...(prompt.taskId === "image-brief" || prompt.taskId === "visual-description" ? [["image", "Image brief"]] : []), ["verify", "Verification only"]];
    return `<div class="ai-phase-head"><span class="phase-number">02</span><div><span class="eyebrow">Request narrowly</span><h3>Inspect the prompt before it leaves</h3><p>${esc(prompt.taskName)} · ${esc(titleCase(prompt.depth))} depth · ${esc(titleCase(prompt.reviewLevel))} review. A longer prompt is not presented as a guarantee.</p></div></div>
      <section class="prompt-editorial"><div class="prompt-view-tabs">${views.map(([id, label]) => `<button class="${view === id ? "is-active" : ""}" data-action="ai-prompt-view" data-id="${id}">${esc(label)}</button>`).join("")}</div><textarea class="prompt-output ai-prompt-output" data-ai-prompt-manual rows="28" ${view !== "primary" ? "readonly" : ""}>${esc(promptTextForView(workspace))}</textarea><div class="prompt-editorial-footer"><span>${prompt.sectionsIncluded.length} purposeful sections · provider neutral</span><div><button class="button button-compact" data-action="ai-download-prompt" data-id="${view}">${icon("download")} Download</button><button class="button button-primary" data-action="ai-copy-prompt" data-id="${view}">${icon("copy")} Copy ${esc(views.find(([id]) => id === view)?.[1] || "prompt")}</button></div></div></section>
      <section class="privacy-scrubber ${privacy.clean ? "is-clear" : "needs-review"}"><span>${icon("shield")}</span><div><h4>${privacy.clean ? "Privacy check ready for your review" : `${privacy.findings.length} possible privacy item${privacy.findings.length === 1 ? "" : "s"}`}</h4><p>${esc(privacy.warning)}</p>${privacy.findings.length ? `<div class="privacy-findings">${privacy.findings.map(item => `<span><strong>${esc(item.label)}</strong> ${esc(item.value)} → ${esc(item.replacement)}</span>`).join("")}</div>` : ""}</div><button class="button button-compact" data-action="ai-rescrub-prompt">Apply neutral replacements</button></section>
      <section class="expected-return"><div><span class="eyebrow">Expected return</span><h4>Human-readable, inert content</h4><p>External AI is asked for structured text—not a document, HTML or executable code.</p></div><pre>${esc(prompt.expected)}</pre></section>
      <div class="safe-leave-note">${icon("check")}<span><strong>Scaffold saved. You can safely leave and return.</strong><small>Copying opens no external service and sends nothing automatically.</small></span></div>
      <div class="ai-phase-footer"><button class="button" data-action="ai-phase" data-id="task">← Refine request</button><button class="button button-primary" data-action="ai-phase" data-id="import">I have a response to import ${icon("arrow")}</button></div>`;
  }

  function renderAIImportPhase(scaffold, workspace) {
    const parsed = workspace.parsed;
    return `<div class="ai-phase-head"><span class="phase-number">03</span><div><span class="eyebrow">Return safely</span><h3>Paste the complete response</h3><p>The raw response is preserved. Scripts, styles and markup are never executed.</p></div></div>
      <section class="import-desk"><div class="import-desk-head"><div><h4>External AI response</h4><p>Plain text, markdown, tables, lists and simple JSON are supported.</p></div>${workspace.rawPreservedAt ? `<span class="raw-preserved">Raw response preserved ${relativeDate(workspace.rawPreservedAt)}</span>` : ""}</div><textarea id="ai-raw-import" data-ai-raw-import rows="18" placeholder="Paste the full response here. Introductory commentary and imperfect headings are safe to include…">${esc(workspace.rawImport || "")}</textarea><div class="import-actions"><button class="button button-primary" data-action="ai-structure-import">Try automatic structuring</button><button class="button" data-action="ai-import-plain">Use as plain text</button><button class="button" data-action="ai-manual-import">Split manually</button><button class="button button-ghost" data-action="ai-clear-import">Start over</button></div></section>
      ${parsed ? `<section class="import-result"><div class="section-heading"><div><span class="eyebrow">Import recovery</span><h4>${esc(parsed.format)} organised into ${parsed.sections.length} section${parsed.sections.length === 1 ? "" : "s"}</h4><p>${parsed.missing.length ? `${parsed.missing.length} expected section${parsed.missing.length === 1 ? " is" : "s are"} still missing.` : "All expected content types were detected."}</p></div><span class="local-check-label">Raw response retained</span></div><div class="import-summary-grid">${parsed.sections.map(section => `<div class="import-summary-card ${section.unexpected ? "is-unexpected" : ""}"><span>${section.expected ? "Expected" : section.unexpected ? "Unexpected" : "Optional"}</span><strong>${esc(section.label)}</strong><small>${section.items.length} item${section.items.length === 1 ? "" : "s"}</small></div>`).join("")}</div>${parsed.warnings.length ? `<div class="import-warnings">${parsed.warnings.map(warning => `<p><strong>${esc(warning.title)}</strong> ${esc(warning.message)}</p>`).join("")}</div>` : ""}</section>` : ""}
      <div class="ai-phase-footer"><button class="button" data-action="ai-phase" data-id="prompt">← Return to prompt</button><button class="button button-primary" data-action="ai-phase" data-id="review" ${parsed ? "" : "disabled"}>Review sections ${icon("arrow")}</button></div>`;
  }

  function diffSegmentsHTML(segments) {
    return segments.map(segment => segment.type === "same" ? esc(segment.text) : segment.type === "added" ? `<mark class="diff-added">${esc(segment.text)}</mark>` : `<del class="diff-removed">${esc(segment.text)}</del>`).join("");
  }

  function renderAIReviewPhase(scaffold, workspace) {
    const parsed = workspace.parsed;
    if (!parsed) return `<div class="empty-help"><h4>No imported response yet</h4><p>Paste and structure a response before reviewing changes.</p><button class="button" data-action="ai-phase" data-id="import">Import a response</button></div>`;
    const total = parsed.sections.reduce((sum, section) => sum + section.items.length, 0);
    const decided = parsed.sections.reduce((sum, section) => sum + section.items.filter(item => item.status !== "pending").length, 0);
    const compareId = workspace.comparisonSection || parsed.sections.find(section => section.id !== "other")?.id || "";
    const comparison = compareId ? AI.compareSection(scaffold, parsed, compareId) : null;
    const lastTrim = parsed.trimHistory?.[0];
    return `<div class="ai-phase-head"><span class="phase-number">04</span><div><span class="eyebrow">Review changes</span><h3>Accept small pieces—not a replacement document</h3><p>${decided} of ${total} items decided. Keep original content wherever the external contribution is weaker.</p></div></div>
      <section class="review-tools"><div class="decision-progress"><span style="--progress:${total ? Math.round(decided / total * 100) : 0}%"></span><strong>${decided}/${total}</strong><small>items reviewed</small></div><div><button class="button button-compact" data-action="ai-trim" data-id="keep-six">Keep best six</button><button class="button button-compact" data-action="ai-trim" data-id="remove-repeats">Remove repeats</button><button class="button button-compact" data-action="ai-trim" data-id="reduce-vocabulary">Reduce vocabulary</button><button class="button button-compact" data-action="ai-trim" data-id="shorten-instructions">Shorten instructions</button><button class="button button-compact" data-action="ai-trim" data-id="move-teacher-notes">Move notes off pupil page</button><button class="button button-compact" data-action="ai-trim" data-id="bullet-explanations">Explanations to bullets</button><button class="button button-compact" data-action="ai-trim" data-id="stems-to-questions">Stems to questions</button><button class="button button-compact" data-action="ai-trim" data-id="split-pages">Split into two pages</button><button class="button button-compact" data-action="ai-trim" data-id="compact-cards">Compact card version</button></div></section>
      ${lastTrim ? `<details class="trim-record"><summary>Show the latest trimming record · ${lastTrim.removed.length} changed or removed</summary>${lastTrim.removed.length ? `<ul>${lastTrim.removed.slice(0, 12).map(item => `<li><span>${esc(DATA.ai.sections[item.sectionId]?.name || item.sectionId)}</span><del>${esc(item.text)}</del>${item.replacement ? `<ins>${esc(item.replacement)}</ins>` : ""}</li>`).join("")}</ul>` : "<p>No content matched that trimming action. Nothing was discarded.</p>"}</details>` : ""}
      <div class="imported-sections">${parsed.sections.map((section, sectionIndex) => `<section class="imported-section ${section.unexpected ? "is-unexpected" : ""}"><div class="imported-section-head"><div><span>${section.expected ? "Expected section" : section.unexpected ? "Unexpected content" : "Optional section"}</span><h4>${esc(section.label)}</h4></div><label>Map as<select data-ai-section-map data-index="${sectionIndex}"><option value="ignore" ${section.mapping === "ignore" ? "selected" : ""}>Ignore</option>${Object.entries(DATA.ai.sections).map(([id, schema]) => `<option value="${id}" ${section.id === id && section.mapping !== "ignore" ? "selected" : ""}>${esc(schema.name)}</option>`).join("")}</select></label><div><button class="text-link" data-action="ai-decide-section" data-id="${section.id}" data-status="accepted">Accept section</button><button class="text-link" data-action="ai-decide-section" data-id="${section.id}" data-status="rejected">Reject section</button><button class="text-link" data-action="ai-compare-section" data-id="${section.id}">Compare</button></div></div><div class="imported-items">${section.items.map((item, itemIndex) => `<article class="imported-item status-${item.status}" data-item-id="${item.id}"><div class="item-number">${String(itemIndex + 1).padStart(2, "0")}</div><textarea data-ai-item-edit="${item.id}" rows="${Math.max(2, Math.min(8, Math.ceil((item.editedText ?? item.text).length / 95)))}">${esc(item.editedText ?? item.text)}</textarea><div class="item-decisions"><button class="${item.status === "accepted" ? "is-active" : ""}" data-action="ai-item-decision" data-id="${item.id}" data-status="accepted">Accept</button><button class="${item.status === "edited" ? "is-active" : ""}" data-action="ai-item-decision" data-id="${item.id}" data-status="edited">Edit</button><button class="${item.status === "rejected" ? "is-active" : ""}" data-action="ai-item-decision" data-id="${item.id}" data-status="rejected">Reject</button><button class="${item.status === "original" ? "is-active" : ""}" data-action="ai-item-decision" data-id="${item.id}" data-status="original">Keep original</button></div></article>`).join("")}</div><button class="regenerate-section-link" data-action="ai-regenerate-section" data-id="${section.id}">Prepare a new prompt for only this section →</button></section>`).join("")}</div>
      ${comparison ? `<section class="plain-comparison"><div class="section-heading"><div><span class="eyebrow">What actually changed?</span><h4>${esc(DATA.ai.sections[comparison.sectionId]?.name || comparison.sectionId)}</h4><p>${comparison.beforeWords} original words → ${comparison.afterWords} proposed words ${comparison.readingChange > 0 ? `(+${comparison.readingChange})` : `(${comparison.readingChange})`}</p></div><select data-ai-compare-select>${parsed.sections.map(section => `<option value="${section.id}" ${section.id === compareId ? "selected" : ""}>${esc(section.label)}</option>`).join("")}</select></div><div class="comparison-columns"><div><span>Original local content</span><p>${esc(comparison.before || "No content in this local slot.")}</p></div><div><span>Proposed external content</span><p>${esc(comparison.after || "No proposed content.")}</p></div></div><details><summary>Show highlighted change</summary><div class="word-diff">${diffSegmentsHTML(comparison.diff)}</div></details></section>` : ""}
      <div class="ai-phase-footer"><button class="button" data-action="ai-phase" data-id="import">← Restore or re-import</button><button class="button button-primary" data-action="ai-run-verification" ${decided ? "" : "disabled"}>Verify selected content ${icon("arrow")}</button></div>`;
  }

  function renderFindingCard(item) {
    const control = item.severity === "do-not-use" && !item.resolved
      ? `<button class="button button-compact" data-action="ai-correct-finding" data-id="${item.id}">Correct in review</button>`
      : `<button class="button button-compact" data-action="ai-toggle-finding" data-id="${item.id}">${item.resolved ? "Reopen" : "Mark reviewed"}</button>`;
    return `<article class="verification-finding severity-${esc(item.severity)} ${item.resolved ? "is-resolved" : ""}"><div class="finding-symbol">${item.resolved ? "✓" : item.severity === "do-not-use" ? "!" : item.severity === "important" ? "!" : item.severity === "review" ? "?" : "i"}</div><div><div class="finding-meta"><span>${esc(item.severityLabel)}</span><span>${esc(item.dimension)}</span><span>${esc(item.validationLabel)}</span></div><h4>${esc(item.title)}</h4><p>${esc(item.message)}</p><small><strong>Next action:</strong> ${esc(item.action)}</small></div>${control}</article>`;
  }

  function recomputeVerificationSummary(result) {
    if (!result) return;
    result.blocking = result.findings.filter(item => item.severity === "do-not-use" && !item.resolved).length;
    result.important = result.findings.filter(item => item.severity === "important" && !item.resolved).length;
    result.review = result.findings.filter(item => item.severity === "review" && !item.resolved).length;
    result.canApprove = result.blocking === 0;
    result.status = result.blocking ? "Do not use yet" : result.important ? "Warnings unresolved" : "Ready for review";
  }

  function renderComputingTrace(workspace) {
    const trace = VERIFY.traceSimpleAlgorithm(workspace.options.traceAlgorithm || "");
    return `<section class="manual-trace"><div class="section-heading"><div><span class="eyebrow">Optional local tool</span><h4>Manual trace mode</h4><p>Step through simple SET, ADD, SUBTRACT, MULTIPLY and DIVIDE instructions. This checks the trace—not whether the algorithm solves the intended problem.</p></div><button class="button button-compact" data-action="ai-run-trace">Run trace</button></div><textarea data-ai-option="traceAlgorithm" rows="5" aria-label="Simple algorithm to trace">${esc(workspace.options.traceAlgorithm || "")}</textarea>${trace.length ? `<div class="trace-table"><div><strong>Step</strong><strong>Instruction</strong><strong>State after step</strong></div>${trace.map(row => `<div><span>${row.step}</span><span>${esc(row.instruction)}</span><span>${esc(Object.entries(row.state).map(([key, value]) => `${key} = ${value}`).join(" · ") || "No tracked value")}</span></div>`).join("")}</div>` : '<p class="trace-empty">Enter one instruction per line to see the local trace.</p>'}</section>`;
  }

  function acceptedImportForVerification(parsed, sourceRecords = []) {
    const result = {
      ...parsed,
      raw: "",
      sections: (parsed?.sections || []).map(section => ({
        ...section,
        items: (section.items || []).filter(item => ["accepted", "edited"].includes(item.status))
      })).filter(section => section.items.length)
    };
    const sourceItems = sourceRecords.filter(record => record.title || record.author || record.url).map(record => ({ id: record.id, text: [record.title, record.author, record.date, record.publisher, record.url].filter(Boolean).join(" · "), status: "accepted" }));
    if (sourceItems.length) {
      const existing = result.sections.find(section => section.id === "sources");
      if (existing) existing.items.push(...sourceItems);
      else result.sections.push({ id: "sources", label: "Sources", mapping: "sources", expected: false, unexpected: false, items: sourceItems });
    }
    return result;
  }

  function renderAIVerifyPhase(scaffold, workspace) {
    if (!workspace.parsed) return `<div class="empty-help"><h4>No content to verify</h4><button class="button" data-action="ai-phase" data-id="import">Import a response</button></div>`;
    if (!workspace.verification) {
      workspace.verification = VERIFY.verify(scaffold, acceptedImportForVerification(workspace.parsed, workspace.sourceRecords), { ...workspace.options, taskId: workspace.options.taskId, reviewLevel: workspace.options.reviewLevel });
      saveAIWorkspace();
    }
    const result = workspace.verification;
    recomputeVerificationSummary(result);
    const acceptedCount = Object.values(AI.acceptedContent(workspace.parsed)).flat().length;
    const canApply = workspace.approvalChecked && result.canApprove && acceptedCount > 0;
    const preview = acceptedCount ? AI.applyAccepted(scaffold, workspace.parsed, { verification: result, prompt: workspace.prompt, approved: false, includeRaw: false }).resource : scaffold;
    const dimensions = [...new Set(result.findings.map(item => item.dimension))];
    return `<div class="ai-phase-head"><span class="phase-number">05</span><div><span class="eyebrow">Verify and rebuild</span><h3>Local checks, honest limits, human judgement</h3><p>${esc(result.methodNote)}</p></div></div>
      <section class="verification-summary status-${result.blocking ? "block" : result.important ? "warn" : "ready"}"><div><span>${result.blocking ? "!" : result.important ? "!" : "✓"}</span><div><strong>${esc(result.status)}</strong><small>${esc(titleCase(result.reviewLevel))} review · ${acceptedCount} accepted item${acceptedCount === 1 ? "" : "s"}</small></div></div><dl><div><dt>Do not use yet</dt><dd>${result.blocking}</dd></div><div><dt>Important</dt><dd>${result.important}</dd></div><div><dt>Review</dt><dd>${result.review}</dd></div><div><dt>Locally checked</dt><dd>${result.findings.filter(item => item.validation === "local" || item.validation === "calculation" || item.validation === "structure").length}</dd></div></dl></section>
      <div class="verification-dimensions">${dimensions.map(dimension => `<button data-action="ai-filter-findings" data-id="${esc(dimension)}">${esc(dimension)} <span>${result.findings.filter(item => item.dimension === dimension && !item.resolved).length}</span></button>`).join("")}</div>
      <section class="verification-findings">${result.findings.filter(item => !workspace.findingFilter || item.dimension === workspace.findingFilter).map(renderFindingCard).join("")}</section>
      <section class="verification-metrics"><div><span class="eyebrow">Reading indicators—not a reading-age score</span><h4>${result.metrics.words} words · ${result.metrics.averageSentenceWords} words per sentence on average</h4><p>Longest sentence ${result.metrics.longestSentenceWords} words · longest paragraph ${result.metrics.longestParagraphWords} words${result.metrics.properNouns?.length ? ` · possible proper nouns: ${esc(result.metrics.properNouns.slice(0, 6).join(", "))}` : ""}${result.metrics.repeated?.length ? ` · repeated terms: ${esc(result.metrics.repeated.slice(0, 5).map(item => `${item.word} (${item.count})`).join(", "))}` : ""}. Use these alongside knowledge demand, cohesion and teacher review.</p></div><div><button class="button button-compact" data-action="ai-rerun-verification">Re-run checks</button><button class="button button-compact" data-action="ai-download-report">Download report</button></div></section>
      ${scaffold.subject === "computing" ? renderComputingTrace(workspace) : ""}
      <section class="source-awareness"><div class="section-heading"><div><span class="eyebrow">Private teacher record</span><h4>Source awareness</h4><p>Keep provenance in Library guidance; pupil pages remain uncluttered.</p></div><button class="button button-compact" data-action="ai-add-source">Add source record</button></div>${workspace.sourceRecords?.length ? `<div class="source-records">${workspace.sourceRecords.map((record, index) => `<article><div class="source-record-head"><strong>Source ${index + 1}</strong><button class="text-link" data-action="ai-remove-source" data-id="${record.id}">Remove</button></div><div class="source-record-grid"><label>Type<select data-ai-source-field="type" data-source-id="${record.id}">${DATA.ai.sourceTypes.map(type => `<option ${record.type === type ? "selected" : ""}>${esc(type)}</option>`).join("")}</select></label><label>Title<input class="input" data-ai-source-field="title" data-source-id="${record.id}" value="${esc(record.title || "")}"></label><label>Author<input class="input" data-ai-source-field="author" data-source-id="${record.id}" value="${esc(record.author || "")}"></label><label>Date<input class="input" data-ai-source-field="date" data-source-id="${record.id}" value="${esc(record.date || "")}"></label><label>Publisher<input class="input" data-ai-source-field="publisher" data-source-id="${record.id}" value="${esc(record.publisher || "")}"></label><label>URL reference<input class="input" data-ai-source-field="url" data-source-id="${record.id}" value="${esc(record.url || "")}"></label><label>Retrieval date<input class="input" type="date" data-ai-source-field="retrievalDate" data-source-id="${record.id}" value="${esc(record.retrievalDate || "")}"></label><label>Classroom note<input class="input" data-ai-source-field="note" data-source-id="${record.id}" value="${esc(record.note || "")}"></label></div></article>`).join("")}</div>` : '<div class="source-empty">No source record attached. Add one whenever the content depends on a publication, quotation, statistic or lived testimony.</div>'}</section>
      <section class="rebuild-preview"><div class="section-heading"><div><span class="eyebrow">Scaffold Seeds rebuild</span><h4>Accepted content inside the controlled local page</h4><p>External AI does not control type, margins, hierarchy, diagrams or growth labels.</p></div><span>${esc(stageById(scaffold.stage).name)}</span></div><div class="paper-wrap">${renderResourceDocument(preview)}</div></section>
      <section class="human-approval ${result.blocking ? "is-blocked" : ""}"><label><input type="checkbox" data-ai-approval ${workspace.approvalChecked ? "checked" : ""} ${result.blocking ? "disabled" : ""}><span><strong>${esc(DATA.ai.approvalText)}</strong><small>${result.blocking ? "Review and resolve every ‘Do not use yet’ finding first." : "This approval is private and stored with the resource provenance record."}</small></span></label><div><label>Round name<input class="input" data-ai-round-name value="${esc(workspace.roundName || "")}" placeholder="e.g. Final vocabulary revision"></label><label>Approval scope<select data-ai-approval-scope><option value="resource" ${workspace.approvalScope === "resource" ? "selected" : ""}>Whole resource</option><option value="sections" ${workspace.approvalScope === "sections" ? "selected" : ""}>Accepted sections only</option><option value="page" ${workspace.approvalScope === "page" ? "selected" : ""}>Current page</option></select></label></div></section>
      ${workspace.appliedAt ? `<div class="applied-confirmation">${icon("check")}<div><strong>Approved content rebuilt locally</strong><p>A version checkpoint, decision record, findings and provenance were saved. Print Studio will use this Scaffold Seeds page—not the external response.</p></div><button class="button" data-action="open-print">Open Print Studio</button></div>` : ""}
      <div class="ai-phase-footer"><button class="button" data-action="ai-phase" data-id="review">← Review decisions</button><button class="button button-primary" data-action="ai-apply-content" ${canApply ? "" : "disabled"}>Rebuild approved resource ${icon("arrow")}</button></div>`;
  }

  function ensureAIBaselineSaved(scaffold) {
    let item = scaffold;
    let index = state.library.findIndex(resource => resource.id === scaffold.id);
    if (index < 0) {
      item = { ...scaffold, ai: scaffold.ai || null, updatedAt: new Date().toISOString() };
      state.library.unshift(item);
      index = 0;
    } else state.library[index] = item;
    state.activeScaffold = item;
    state.draft.editingId = item.id;
    writeStore(STORAGE.library, state.library);
    saveDraft();
    return item;
  }

  function prepareAIPrompt() {
    const scaffold = ensureAIBaselineSaved(activeForAI());
    state.aiWorkspace.resourceId = scaffold.id;
    state.aiWorkspace.prompt = AI.buildPrompt(scaffold, state.aiWorkspace.options);
    state.aiWorkspace.promptView = "primary";
    state.aiWorkspace.promptManual = "";
    state.aiWorkspace.phase = "prompt";
    state.settings.aiPromptDepth = state.aiWorkspace.options.depth;
    state.preferences.aiTask = state.aiWorkspace.options.taskId;
    writeStore(STORAGE.settings, state.settings);
    writeStore(STORAGE.preferences, state.preferences);
    updateAIResourceStatus("prompt-prepared", { pendingPrompt: { id: state.aiWorkspace.prompt.id, taskId: state.aiWorkspace.prompt.taskId, createdAt: state.aiWorkspace.prompt.createdAt } });
    saveAIWorkspace();
    render();
  }

  function structureAIImport(mode = "automatic") {
    const raw = state.aiWorkspace.rawImport;
    if (!raw.trim()) { toast("Paste the external response first."); return; }
    state.aiWorkspace.rawPreservedAt = new Date().toISOString();
    state.aiWorkspace.parsed = AI.parseImport(raw, state.aiWorkspace.options.taskId, mode);
    state.aiWorkspace.sourceRecords = state.aiWorkspace.parsed.sections.filter(section => section.id === "sources").flatMap(section => section.items).map(item => AI.makeSourceRecord(item.text));
    state.aiWorkspace.verification = null;
    updateAIResourceStatus("response-imported");
    saveAIWorkspace();
    toast("Raw response preserved and organised into reviewable sections.");
    render();
  }

  function runAIVerification() {
    const workspace = state.aiWorkspace;
    if (!workspace.parsed) return;
    const undecided = workspace.parsed.sections.flatMap(section => section.items).filter(item => item.status === "pending");
    if (undecided.length) {
      undecided.forEach(item => { item.status = "rejected"; });
      toast(`${undecided.length} undecided item${undecided.length === 1 ? " was" : "s were"} left out, not accepted silently.`);
    }
    workspace.verification = VERIFY.verify(activeForAI(), acceptedImportForVerification(workspace.parsed, workspace.sourceRecords), { ...workspace.options, taskId: workspace.options.taskId, reviewLevel: workspace.options.reviewLevel });
    workspace.phase = "verify";
    updateAIResourceStatus(workspace.verification.blocking || workspace.verification.important ? "warnings-unresolved" : "review-required", { lastVerification: workspace.verification });
    saveAIWorkspace();
    render();
  }

  function applyAIContent() {
    const scaffold = activeForAI();
    const workspace = state.aiWorkspace;
    recomputeVerificationSummary(workspace.verification);
    if (!workspace.approvalChecked || workspace.verification.blocking) { toast("Complete the human approval gate and resolve serious findings first."); return; }
    const index = state.library.findIndex(item => item.id === scaffold.id);
    const original = index >= 0 ? state.library[index] : scaffold;
    const checkpoint = versionSnapshot(original, `Before ${workspace.roundName || AI.taskById(workspace.options.taskId).name}`);
    const applied = AI.applyAccepted(original, workspace.parsed, { verification: workspace.verification, prompt: workspace.prompt, approved: true, approvalScope: workspace.approvalScope, roundName: workspace.roundName, includeRaw: true });
    if (workspace.parsed.localSuggestion?.format) applied.resource.format = workspace.parsed.localSuggestion.format;
    applied.resource.versions = [checkpoint, ...(original.versions || [])].slice(0, 20);
    if (workspace.image) applied.resource.assets = [{ ...workspace.image, id: workspace.image.id || uid(), addedAt: new Date().toISOString() }, ...(original.assets || [])].slice(0, 8);
    if (workspace.sourceRecords?.length) applied.resource.sources = workspace.sourceRecords.map(record => ({ ...record }));
    if (index >= 0) state.library[index] = applied.resource;
    else state.library.unshift(applied.resource);
    state.activeScaffold = applied.resource;
    state.draft = normaliseDraft({ ...applied.resource, selectedBarriers: applied.resource.barriers, vocabulary: (applied.resource.content?.vocabulary || applied.resource.vocabulary || []).join(", "), tags: (applied.resource.tags || []).join(", "), editingId: applied.resource.id });
    state.draft.engineId = applied.resource.engineId;
    workspace.appliedAt = new Date().toISOString();
    workspace.resourceId = applied.resource.id;
    writeStore(STORAGE.library, state.library);
    saveDraft();
    saveAIWorkspace();
    toast("Approved content rebuilt inside Scaffold Seeds. The original was checkpointed.");
    render();
  }

  function downloadText(filename, text, type = "text/plain") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function analyseLocalImage(image) {
    // Sample a small white-backed canvas so the check stays quick and never uploads the image.
    const longest = Math.max(image.naturalWidth, image.naturalHeight, 1);
    const scale = Math.min(1, 180 / longest);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    let darkest = 255;
    let lightest = 0;
    let darkness = 0;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      const red = pixels[index] * alpha + 255 * (1 - alpha);
      const green = pixels[index + 1] * alpha + 255 * (1 - alpha);
      const blue = pixels[index + 2] * alpha + 255 * (1 - alpha);
      const luminance = .2126 * red + .7152 * green + .0722 * blue;
      darkest = Math.min(darkest, luminance);
      lightest = Math.max(lightest, luminance);
      darkness += 1 - luminance / 255;
      count += 1;
    }
    return AI.assessImageSample({ darkest, lightest, darkness, count, widthPixels: image.naturalWidth, heightPixels: image.naturalHeight });
  }

  function copyText(text, confirmation = "Copied.") {
    const fallback = () => {
      const area = document.createElement("textarea");
      area.value = text; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0";
      document.body.appendChild(area); area.select(); document.execCommand?.("copy"); area.remove(); toast(confirmation);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast(confirmation), fallback);
    else fallback();
  }

  function activeForPrint() {
    return state.activeScaffold || state.library[0] || null;
  }

  function paperClasses() {
    return [state.print.paper === "a5" ? "a5" : "", state.print.orientation === "landscape" ? "landscape" : "", `ink-${state.print.colour}`, state.print.colour === "greyscale" ? "greyscale" : "", state.print.photocopy ? "photocopy" : "", state.print.largePrint ? "large-print" : "", state.print.cropMarks ? "crop-marks" : "", state.print.cutLines ? "show-cut-lines" : "hide-cut-lines", state.settings.pageNumbers ? "page-numbers" : "", state.print.answers ? "" : "hide-answers"].filter(Boolean).join(" ");
  }

  function applyPaperOptions(html) {
    const classes = paperClasses();
    return html.replace(/class="paper(?=[\s"])/, `class="paper ${classes}`);
  }

  function printPromptSet(scaffold) {
    const intelligence = curriculumIntelligence(scaffold);
    const stage = DATA.stages.find(item => item.id === scaffold.stage) || DATA.stages[1];
    const sourceSteps = scaffold.smallSteps?.length ? scaffold.smallSteps : intelligence.profile.smallSteps;
    const visibleCount = { seed: 6, sprout: 4, growth: 2, independent: 1 }[scaffold.stage] || 4;
    const steps = sourceSteps.slice(0, visibleCount);
    const questions = scaffold.teacherQuestions?.length ? scaffold.teacherQuestions : intelligence.profile.questions;
    return {
      intelligence,
      stage,
      steps,
      questions,
      selfPrompt: questions[0] || "What matters here, and how will I check it?",
      misconception: scaffold.misconception || intelligence.misconceptions[0],
      vocabulary: (scaffold.content?.vocabulary?.length ? scaffold.content.vocabulary : scaffold.vocabulary || intelligence.vocabulary).slice(0, 6)
    };
  }

  function formatPage(scaffold, format, body, className = "") {
    const subject = subjectById(scaffold.subject);
    const stageIndex = Math.max(0, DATA.stages.findIndex(item => item.id === scaffold.stage));
    return `<article class="paper format-page format-${format.id} ${className}" data-page="resource" data-stage="${esc(scaffold.stage)}"><div class="paper-brand">Scaffold Seeds · ${esc(format.name)} <small>SS-${String.fromCharCode(65 + stageIndex)}</small></div><div class="resource-meta"><span>${esc(scaffold.year)}</span><span>${esc(subject.name)}</span></div>${body}<footer class="resource-footer"><span>${esc(scaffold.topic)}</span><span>Designed to fade</span></footer></article>`;
  }

  function renderCompactWorkpage(scaffold) {
    const format = printFormatById();
    const prompts = printPromptSet(scaffold);
    const content = RESOURCE.normalise(scaffold).content;
    const independent = scaffold.stage === "independent";
    const promptLimit = state.print.paper === "a5" ? 3 : 4;
    const visiblePrompts = content.prompts.slice(0, promptLimit);
    const diagram = content.diagramType && !independent ? `<div class="compact-sheet-diagram">${RESOURCE.renderDiagram(content.diagramType, scaffold.diagram || { labels: content.diagramLabels })}</div>` : "";
    const example = !independent && ["seed", "sprout"].includes(scaffold.stage) && !content.hiddenSections.includes("example") ? `<section class="compact-sheet-example"><span>${scaffold.stage === "seed" ? "Model one decision" : "Complete the missing decision"}</span><p>${esc(content.example)}</p></section>` : "";
    const oral = !independent && content.oralRehearsal && !content.hiddenSections.includes("oral") ? `<p class="compact-oral"><strong>Say first:</strong> ${esc(content.oralPrompt)}</p>` : "";
    const body = independent
      ? `<div class="compact-sheet-title"><span class="independence-mark">Support removed</span><h1>${esc(scaffold.title)}</h1><p>${esc(scaffold.objective)}</p></div><section class="compact-independence"><h2>Before you begin</h2><p>${esc(content.independencePrompt)}</p><h2>Afterwards</h2><p>What did you decide for yourself? What evidence shows the learning?</p>${blankLines(state.print.paper === "a5" ? 4 : 3)}</section>`
      : `<div class="compact-sheet-title"><span class="eyebrow">${esc(engineById(scaffold.engineId).name)}</span><h1>${esc(scaffold.title)}</h1><p>${esc(scaffold.objective)}</p></div><div class="compact-sheet-instruction"><strong>${esc(content.instruction)}</strong><small>${esc(content.vocabulary.slice(0, 4).join(" · "))}</small></div>${example}${diagram}<div class="compact-prompt-grid">${visiblePrompts.map((prompt, index) => `<section><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(prompt)}</strong>${blankLines(1)}</section>`).join("")}</div>${oral}<section class="compact-sheet-check"><strong>Independence check</strong><p>${esc(content.checkPrompt || prompts.selfPrompt)}</p></section>`;
    return formatPage(scaffold, format, body, "compact-workpage");
  }

  function renderFormatDocument(scaffold) {
    const format = printFormatById();
    if (format.id === "workpage") return state.print.paper === "a5" || state.print.orientation === "landscape" ? renderCompactWorkpage(scaffold) : renderResourceDocument(scaffold);
    const prompts = printPromptSet(scaffold);
    const title = `<div class="format-title"><span class="eyebrow">${esc(engineById(scaffold.engineId).name)}</span><h1>${esc(scaffold.title)}</h1><p>${esc(scaffold.objective)}</p></div>`;
    const cards = prompts.steps.length ? prompts.steps : [prompts.selfPrompt];
    if (format.id === "laminated-card") {
      return formatPage(scaffold, format, `${title}<div class="laminated-grid"><section><span class="card-seed">1 · Enter the thinking</span><h2>${esc(cards[0])}</h2><p>${esc(cards[1] || prompts.selfPrompt)}</p><div class="wipe-space"></div></section><section><span class="card-seed">2 · Check and release</span><h2>${esc(prompts.selfPrompt)}</h2><p><strong>Watch for:</strong> ${esc(prompts.misconception)}</p><div class="vocabulary-line">${prompts.vocabulary.map(word => `<span>${esc(word)}</span>`).join("")}</div></section></div>`);
    }
    if (format.id === "desk-strip") {
      const stripPrompts = [...cards, prompts.selfPrompt, "Cover this strip when you can prompt yourself."].slice(0, 4);
      return formatPage(scaffold, format, `${title}<div class="desk-strips">${stripPrompts.map((item, index) => `<section><span>${index + 1}</span><strong>${esc(item)}</strong><small>${index === stripPrompts.length - 1 ? "My own self-prompt: ____________________" : esc(prompts.vocabulary[index] || scaffold.topic)}</small></section>`).join("")}</div><p class="cut-note">Cut on the dotted lines · place one strip beside the task · remove as soon as it is no longer needed</p>`);
    }
    if (format.id === "table-card") {
      const tablePrompts = [...cards, ...prompts.questions].slice(0, 4);
      return formatPage(scaffold, format, `${title}<div class="print-card-grid table-cards">${tablePrompts.map((item, index) => `<section><span class="card-seed">Card ${index + 1}</span><h2>${esc(item)}</h2><p>${index % 2 ? "Ask for evidence, then listen without rescuing." : "Pause. Each person offers one precise idea."}</p><div class="wipe-space small"></div></section>`).join("")}</div>`);
    }
    if (format.id === "mini-card") {
      const miniPrompts = [...cards, ...prompts.questions, "What can I now do without this card?"].slice(0, 6);
      return formatPage(scaffold, format, `${title}<div class="print-card-grid mini-cards">${miniPrompts.map((item, index) => `<section><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(item)}</strong><small>${esc(prompts.vocabulary[index % Math.max(prompts.vocabulary.length, 1)] || scaffold.topic)}</small></section>`).join("")}</div>`);
    }
    if (format.id === "teacher-card") {
      const teacherPrompts = [...prompts.questions, `Listen for: ${prompts.misconception}`, "Which prompt can I remove now?"].slice(0, 4);
      return formatPage(scaffold, format, `${title}<div class="print-card-grid teacher-cards">${teacherPrompts.map((item, index) => `<section><span class="card-seed">Teacher move ${index + 1}</span><h2>${esc(item)}</h2><p>${index < 2 ? "Wait after asking. Use the pupil response to decide whether support is needed." : "Return the next subject decision to the pupil."}</p></section>`).join("")}</div>`);
    }
    if (format.id === "discussion-card") {
      const discussion = [["A · Build", prompts.questions[0]], ["B · Probe", "What evidence or relationship makes that idea work?"], ["A · Refine", prompts.questions[1] || "What would make the explanation more precise?"], ["Together · Conclude", prompts.selfPrompt]];
      return formatPage(scaffold, format, `${title}<div class="print-card-grid discussion-cards">${discussion.map(([role, item]) => `<section><span class="card-seed">${esc(role)}</span><h2>${esc(item)}</h2><p>Listen · paraphrase · add or challenge with a reason.</p></section>`).join("")}</div>`);
    }
    if (format.id === "group-sheet") {
      return formatPage(scaffold, format, `${title}<div class="group-workspace"><section class="group-roles"><h2>Roles that protect the thinking</h2><div><span>Noticer</span><span>Connector</span><span>Challenger</span><span>Checker</span></div></section><section class="group-focus"><h2>Shared focus</h2><p>${esc(cards[0])}</p><div class="wipe-space"></div></section><section class="group-conclusion"><h2>Our reasoned conclusion</h2><p>${esc(prompts.selfPrompt)}</p>${blankLines(5)}</section></div>`);
    }
    if (format.id === "display-poster") {
      const poster = `<div class="poster-layout"><span class="eyebrow">${esc(subjectById(scaffold.subject).name)} thinking</span><h1>${esc(scaffold.title)}</h1><p class="poster-question">${esc(prompts.selfPrompt)}</p><div class="poster-steps">${cards.slice(0, 4).map((item, index) => `<section><span>${index + 1}</span><strong>${esc(item)}</strong></section>`).join("")}</div><div class="poster-release">When you can prompt yourself, let the scaffold go.</div></div>`;
      return formatPage(scaffold, format, scaffold.printTile !== undefined ? `<div class="poster-tile-window tile-${scaffold.printTile}"><div class="poster-tile-canvas">${poster}</div></div><p class="tile-note">Tile ${scaffold.printTile + 1} of 4 · trim and align matching edges</p>` : poster);
    }
    if (format.id === "foldable") {
      const panels = [["Open", cards[0]], ["Connect", cards[1] || prompts.questions[0]], ["Check", prompts.selfPrompt], ["Fold away", "Name the one prompt you will keep in your head."]];
      return formatPage(scaffold, format, `${title}<div class="foldable-panels">${panels.map(([label, item], index) => `<section><span class="card-seed">${index + 1} · ${esc(label)}</span><h2>${esc(item)}</h2><div class="fold-write"></div></section>`).join("")}</div><p class="cut-note">Cut around the outer edge · fold on the dotted vertical lines</p>`);
    }
    if (format.id === "a5-sheet") return renderCompactWorkpage(scaffold);
    if (format.id === "cut-cards") {
      const count = [4, 6, 8].includes(Number(state.print.arrangement)) ? Number(state.print.arrangement) : 6;
      const items = [...cards, ...prompts.questions, prompts.selfPrompt, "What can I now do without this card?"].slice(0, count);
      return formatPage(scaffold, format, `${title}<div class="cut-card-grid cards-${count}">${items.map((item, index) => `<section><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(item)}</strong><small>${esc(prompts.vocabulary[index % Math.max(1, prompts.vocabulary.length)] || scaffold.topic)}</small></section>`).join("")}</div><p class="cut-note">Cut on dashed lines · teacher code is discreetly printed in the footer</p>`);
    }
    if (format.id === "mini-booklet") {
      const pages = [["Begin", cards[0]], ["Connect", cards[1] || prompts.questions[0]], ["Check", prompts.selfPrompt], ["Fade", "Name the prompt you can now keep without the booklet."]];
      return formatPage(scaffold, format, `${title}<div class="booklet-grid">${pages.map(([label,item], index) => `<section><span>${index + 1} · ${esc(label)}</span><h2>${esc(item)}</h2>${blankLines(3)}</section>`).join("")}</div><p class="cut-note">Print duplex · flip on short edge · fold and staple on centre line</p>`);
    }
    if (["modelling-page", "presentation-board"].includes(format.id)) {
      return formatPage(scaffold, format, `<div class="modelling-layout"><span class="eyebrow">${esc(format.id === "presentation-board" ? "Classroom board" : "Teacher modelling")}</span><h1>${esc(scaffold.title)}</h1><p>${esc(scaffold.objective)}</p><div class="modelling-focus"><strong>${esc(cards[0])}</strong><span>${esc(cards[1] || prompts.questions[0])}</span></div><div class="modelling-reveal"><small>Reveal next</small><strong>${esc(prompts.selfPrompt)}</strong></div></div>`);
    }
    if (format.id === "intervention-pack") {
      return formatPage(scaffold, format, `${title}<div class="intervention-overview"><section><h2>Introduce</h2><p>Model one decision aloud. Do not complete the final decision required in the task.</p></section><section><h2>Use</h2><p>${esc(cards[0])}</p>${blankLines(3)}</section><section><h2>Check independence</h2><p>${esc(prompts.selfPrompt)}</p>${blankLines(2)}</section><section><h2>Reduce next</h2><p>${esc(RESOURCE.nextFade(scaffold))}</p></section></div>`);
    }
    if (format.id === "home-support") {
      return formatPage(scaffold, format, `${title}<div class="home-support-grid"><section><h2>For the pupil</h2><p>${esc(cards[0])}</p><p>${esc(prompts.selfPrompt)}</p>${blankLines(4)}</section><section><h2>For an adult helping</h2><p>Ask the prompt, wait, and return the decision to the pupil. Do not supply the answer.</p><p><strong>Useful language:</strong> ${esc(prompts.vocabulary.join(" · "))}</p><p><strong>Stop using this page when:</strong> the pupil can name and use their own next prompt.</p></section></div>`);
    }
    if (format.id === "mixed-pack") return state.print.paper === "a5" || state.print.orientation === "landscape" ? renderCompactWorkpage(scaffold) : renderResourceDocument(scaffold);
    return renderResourceDocument(scaffold);
  }

  function renderTeacherGuide(scaffold) {
    const stage = DATA.stages.find(item => item.id === scaffold.stage);
    const nextStageIndex = DATA.stages.findIndex(item => item.id === scaffold.stage) + 1;
    const nextStage = DATA.stages[nextStageIndex];
    const barriers = scaffold.barriers.map(barrierById).filter(Boolean);
    const intelligence = curriculumIntelligence(scaffold);
    const questions = scaffold.teacherQuestions?.length ? scaffold.teacherQuestions : intelligence.profile.questions;
    const assessments = scaffold.assessmentOpportunities?.length ? scaffold.assessmentOpportunities : intelligence.profile.assessment;
    const engine = engineById(scaffold.engineId);
    if (state.print.paper === "a5" || state.print.orientation === "landscape") {
      return `<article class="paper teacher-page compact-teacher-guide ${paperClasses()}" data-page="teacher"><div class="paper-brand">Scaffold Seeds · Teacher guidance</div><div class="resource-meta"><span>${esc(scaffold.year)}</span><span>${esc(subjectById(scaffold.subject).name)}</span><span>${esc(engine.name)}</span></div><h1>Use, notice, reduce</h1><p class="resource-objective"><strong>${esc(scaffold.title)}</strong> · ${esc(scaffold.objective)}</p><div class="compact-guide-grid">
        <section><h3>Purpose and barrier</h3><p>${esc(scaffold.situation)}</p><p><strong>Keep with pupils:</strong> ${esc(scaffold.essentialThinking || scaffold.disciplinaryThinking || intelligence.profile.disciplinary)}</p></section>
        <section><h3>Introduce briefly</h3><p>Model one decision aloud, then complete only one example together. Do not model the final ${esc(engine.preserves || "decision")} required in the task.</p></section>
        <section><h3>Notice and avoid</h3><p><strong>Listen for:</strong> ${esc(scaffold.misconception || "an insecure underlying connection")}</p><p><strong>Misuse:</strong> ${esc(engine.risk || "too many prompts may supply the next decision")}</p></section>
        <section><h3>Check and fade</h3><p>${esc(assessments[0] || "Cover one prompt and inspect whether the core decision survives.")}</p><p><strong>Next:</strong> ${esc(RESOURCE.nextFade(scaffold))}</p></section>
      </div><footer class="resource-footer"><span>Teacher copy</span><span>Remove the barrier · preserve the challenge</span></footer></article>`;
    }
    return `<article class="paper teacher-page ${paperClasses()}" data-page="teacher"><div class="paper-brand">Scaffold Seeds · Teacher guidance</div><div class="resource-meta"><span>${esc(scaffold.year)}</span><span>${esc(subjectById(scaffold.subject).name)}</span><span>${esc(engineById(scaffold.engineId).name)}</span></div><h1>Using this scaffold well</h1><p class="resource-objective"><strong>${esc(scaffold.title)}</strong> · ${esc(scaffold.objective)}</p><div class="teacher-guide-grid">
      <section class="guide-block"><h3>Observed barrier</h3><p>${esc(scaffold.situation)}</p><ul>${barriers.map(barrier => `<li><strong>${esc(barrier.name)}:</strong> ${esc(barrier.hint)}</li>`).join("")}</ul></section>
      <section class="guide-block"><h3>Subject thinking to preserve</h3><p>${esc(scaffold.essentialThinking || scaffold.disciplinaryThinking || intelligence.profile.disciplinary)}</p><p><strong>Threshold:</strong> ${esc(scaffold.threshold || intelligence.profile.threshold)}</p></section>
      <section class="guide-block"><h3>Introduce it briefly</h3><p>Model one decision aloud. Show how to use the first prompt, then complete only one example together. Do not model the final ${esc(engine.preserves || "decision")} required in the independent task.</p></section>
      <section class="guide-block"><h3>Watch and listen for</h3><p>${esc(scaffold.misconception || "Listen for language or actions that reveal an insecure underlying connection.")}</p><p><strong>Useful language:</strong> ${esc((scaffold.vocabulary || []).join(", "))}</p><p><strong>Representation:</strong> ${esc(scaffold.representation || "Use only if it reveals the intended relationship.")}</p></section>
      <section class="guide-block"><h3>Plan the fade</h3><p><strong>Current:</strong> ${esc(stage.name)} · ${esc(stage.description)}</p><p><strong>Next:</strong> ${esc(RESOURCE.nextFade(scaffold))}</p></section>
      <section class="guide-block"><h3>In-the-moment questions</h3><ul>${questions.map(item => `<li>${esc(item)}</li>`).join("")}</ul><p><strong>Preserve:</strong> ${esc(engineById(scaffold.engineId).preserves)}</p></section>
      <section class="guide-block"><h3>Misuse warning</h3><p>${esc(engine.risk || "Too many prompts may increase cognitive load or supply the next decision.")}</p><p><strong>Common misuse:</strong> keeping the scaffold after pupils can self-prompt.</p></section>
      <section class="guide-block"><h3>Evidence and independence</h3><ul>${assessments.slice(0,2).map(item => `<li>${esc(item)}</li>`).join("")}</ul><p><strong>Listen for:</strong> the pupil choosing the next subject move without an adult cue.</p><p><strong>Inspect:</strong> whether the core decision survives when one support is covered.</p></section>
    </div><footer class="resource-footer"><span>Teacher copy</span><span>Remove the barrier · preserve the challenge</span></footer></article>`;
  }

  function renderPrintPage(scaffold, type, index, options = {}) {
    const html = type === "resource" ? applyPaperOptions(renderFormatDocument(scaffold)) : renderTeacherGuide(scaffold);
    const stageControls = type === "resource" && options.allowStageMove ? `<div><button data-action="move-print-stage" data-id="${scaffold.stage}" data-direction="up" aria-label="Move ${esc(scaffold.stage)} page earlier" ${options.first ? "disabled" : ""}>${icon("up")}</button><button data-action="move-print-stage" data-id="${scaffold.stage}" data-direction="down" aria-label="Move ${esc(scaffold.stage)} page later" ${options.last ? "disabled" : ""}>${icon("down")}</button></div>` : "";
    return `<div class="page-shell"><div class="page-controls"><span>Page ${index + 1} · ${type === "resource" ? esc(printFormatById().name) : "Teacher guidance"}</span>${stageControls}</div>${html}</div>`;
  }

  function renderPrintStudio() {
    const scaffold = activeForPrint();
    if (!scaffold) {
      return `<div class="page-heading"><div><span class="eyebrow">Classroom-ready output</span><h2>Print Studio</h2><p>Control the pupil page and teacher guidance before printing.</p></div></div><div class="empty-help"><span class="empty-mark">${icon("print")}</span><h4>Bring a scaffold here when it is ready</h4><p>Create a scaffold first. Print Studio will then manage paper size, orientation, colour, answers and page order intentionally.</p><button class="button button-primary" data-action="new-scaffold">Create a scaffold</button></div>`;
    }
    const format = printFormatById();
    const stageIds = format.id === "mixed-pack" ? DATA.stages.map(stage => stage.id) : (state.print.stages.length ? state.print.stages : [scaffold.stage]);
    const stageScaffolds = stageIds.map(stage => RESOURCE.createStage(scaffold, stage));
    const tiledScaffolds = format.id === "display-poster" && state.print.arrangement === "2x2" ? stageScaffolds.flatMap(item => [0,1,2,3].map(tile => ({ ...item, printTile: tile }))) : stageScaffolds;
    const pages = tiledScaffolds.map(item => ({ type: "resource", scaffold: item }));
    if (state.print.teacherGuidance) pages.push({ type: "teacher", scaffold });
    return `<div class="page-heading"><div><span class="eyebrow">Classroom-ready output</span><h2>Print Studio</h2><p>Preview exactly what will print. Reorder pages, simplify presentation and separate pupil material from teacher guidance.</p></div></div>
      <div class="studio-layout"><aside class="studio-controls"><h3>Print choices</h3>
        <div class="control-group format-control"><h4>Classroom format</h4><button class="format-current" data-action="choose-print-format"><span>${esc(format.group)}</span><strong>${esc(format.name)}</strong><small>${esc(format.note)}</small></button></div>
        <div class="control-group"><h4>Paper size</h4><div class="segmented">${["a4","a5"].map(value => `<button class="${state.print.paper === value ? "is-active" : ""}" data-print-option="paper" data-value="${value}">${value.toUpperCase()}</button>`).join("")}</div></div>
        <div class="control-group"><h4>Orientation</h4><div class="segmented">${["portrait","landscape"].map(value => `<button class="${state.print.orientation === value ? "is-active" : ""}" data-print-option="orientation" data-value="${value}">${titleCase(value)}</button>`).join("")}</div></div>
        <div class="control-group"><h4>Ink and photocopy</h4><div class="ink-options">${DATA.build3.printModes.map(value => `<button class="${state.print.colour === value ? "is-active" : ""}" data-print-option="colour" data-value="${value}">${titleCase(value)}</button>`).join("")}</div></div>
        ${["cut-cards","mini-card"].includes(format.id) ? `<div class="control-group"><h4>Cards per page</h4><div class="segmented">${[4,6,8].map(value => `<button class="${String(state.print.arrangement) === String(value) ? "is-active" : ""}" data-print-option="arrangement" data-value="${value}">${value}</button>`).join("")}</div></div>` : ""}
        ${format.id === "display-poster" ? `<div class="control-group"><h4>Poster tiling</h4><div class="segmented"><button class="${state.print.arrangement !== "2x2" ? "is-active" : ""}" data-print-option="arrangement" data-value="single">Single page</button><button class="${state.print.arrangement === "2x2" ? "is-active" : ""}" data-print-option="arrangement" data-value="2x2">2 × 2 tiles</button></div></div>` : ""}
        <div class="control-group"><h4>Growth stages</h4><div class="print-stage-list">${DATA.stages.map(stage => `<label><input type="checkbox" data-print-stage="${stage.id}" ${stageIds.includes(stage.id) ? "checked" : ""} ${format.id === "mixed-pack" ? "disabled" : ""}><span>${stage.glyph} ${stage.name}</span></label>`).join("")}</div><small>Pupil pages carry discreet teacher codes, not public level labels.</small></div>
        <div class="control-group"><div class="switch-row"><span>Teacher guidance</span><button class="switch" role="switch" aria-checked="${state.print.teacherGuidance}" data-print-toggle="teacherGuidance"></button></div><div class="switch-row"><span>Model answers</span><button class="switch" role="switch" aria-checked="${state.print.answers}" data-print-toggle="answers"></button></div><div class="switch-row"><span>Enlarged print</span><button class="switch" role="switch" aria-checked="${state.print.largePrint}" data-print-toggle="largePrint"></button></div><div class="switch-row"><span>Photocopy intelligence</span><button class="switch" role="switch" aria-checked="${state.print.photocopy}" data-print-toggle="photocopy"></button></div><div class="switch-row"><span>Crop marks</span><button class="switch" role="switch" aria-checked="${state.print.cropMarks}" data-print-toggle="cropMarks"></button></div><div class="switch-row"><span>Cut lines</span><button class="switch" role="switch" aria-checked="${state.print.cutLines}" data-print-toggle="cutLines"></button></div><div class="switch-row"><span>Duplex guidance</span><button class="switch" role="switch" aria-checked="${state.print.duplex}" data-print-toggle="duplex"></button></div></div>
        ${state.print.duplex ? `<div class="duplex-note">${format.id === "mini-booklet" ? "Print double-sided, flip on the short edge, then fold at the centre." : "Print double-sided and flip on the long edge unless your printer preview shows otherwise."}</div>` : ""}
        <button class="button button-primary" data-action="print-now"><span data-icon="print"></span> Print ${pages.length} page${pages.length === 1 ? "" : "s"}</button>
      </aside><div class="page-stack">${pages.map((page, index) => renderPrintPage(page.scaffold, page.type, index, {
        allowStageMove: page.type === "resource" && format.id !== "mixed-pack" && state.print.arrangement !== "2x2" && stageIds.length > 1,
        first: page.type === "resource" && stageIds.indexOf(page.scaffold.stage) === 0,
        last: page.type === "resource" && stageIds.indexOf(page.scaffold.stage) === stageIds.length - 1
      })).join("")}</div></div>`;
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
        <div class="settings-row"><span><strong>Default ink</strong><small>Colour can always be changed per print.</small></span><select data-setting-select="defaultColour">${DATA.build3.printModes.map(mode => `<option value="${mode}" ${state.settings.defaultColour === mode ? "selected" : ""}>${titleCase(mode)}</option>`).join("")}</select></div>
        <div class="settings-row"><span><strong>Typical year group</strong><small>Used as a starting point, never a limit.</small></span><select data-setting-select="typicalYear">${DATA.years.map(year => `<option ${state.settings.typicalYear === year ? "selected" : ""}>${esc(year)}</option>`).join("")}</select></div>
        <div class="settings-row"><span><strong>Preferred density</strong><small>Controls initial resource spacing.</small></span><select data-setting-select="preferredDensity">${DATA.build3.densityModes.map(mode => `<option value="${mode}" ${state.settings.preferredDensity === mode ? "selected" : ""}>${titleCase(mode)}</option>`).join("")}</select></div>
      </div></section>
      <section class="settings-card"><h3>Classroom resource preferences</h3><p>Remember practical defaults transparently on this device.</p><div class="settings-list">
        ${settingSwitch("Include teacher guidance", "Add concise introduction, misuse and fading guidance by default.", "includeTeacherGuidance")}
        ${settingSwitch("Include answer pages", "Show optional answer guidance in Print Studio.", "includeAnswers")}
        ${settingSwitch("Page numbers", "Number printed pages where the format supports it.", "pageNumbers")}
        <div class="settings-row"><span><strong>Line thickness</strong><small>Useful for photocopying and enlarged print.</small></span><select data-setting-select="lineThickness"><option value="standard" ${state.settings.lineThickness === "standard" ? "selected" : ""}>Standard</option><option value="strong" ${state.settings.lineThickness === "strong" ? "selected" : ""}>Stronger</option></select></div>
        <div class="settings-row settings-row-stack"><span><strong>School or class label</strong><small>Optional. Never enter pupil names.</small></span><div><input class="input" data-setting-field="schoolLabel" value="${esc(state.settings.schoolLabel)}" placeholder="School name"><input class="input" data-setting-field="classLabel" value="${esc(state.settings.classLabel)}" placeholder="Class label"></div></div>
        <div class="settings-row"><span><strong>Preferred terminology</strong><small>Used in teacher-facing guidance.</small></span><select data-setting-select="terminology"><option value="pupils" ${state.settings.terminology === "pupils" ? "selected" : ""}>Pupils</option><option value="children" ${state.settings.terminology === "children" ? "selected" : ""}>Children</option><option value="learners" ${state.settings.terminology === "learners" ? "selected" : ""}>Learners</option></select></div>
      </div></section>
      <section class="settings-card"><h3>AI Companion defaults</h3><p>Remember practical choices transparently. These are local defaults—not educational truth learned by the app.</p><div class="settings-list">
        <div class="settings-row"><span><strong>Preferred prompt depth</strong><small>Professional is the balanced default.</small></span><select data-setting-select="aiPromptDepth">${DATA.ai.promptDepths.map(depth => `<option value="${depth.id}" ${state.settings.aiPromptDepth === depth.id ? "selected" : ""}>${esc(depth.name)}</option>`).join("")}</select></div>
        ${settingSwitch("Keep raw AI responses in backups", "Turn off for smaller exported files; local resource provenance remains.", "aiIncludeResponseHistory")}
        <div class="settings-row"><span><strong>Remembered choices</strong><small>${esc(AI.taskById(state.preferences.aiTask || "accurate-examples").name)} · ${esc(state.settings.aiPromptDepth)}</small></span><button class="button button-compact" data-action="reset-ai-preferences">Reset</button></div>
      </div></section>
      <section class="settings-card"><h3>Local data</h3><p>Back up or move your library without creating an account.</p><div class="settings-list"><div class="settings-row"><span><strong>Export a backup</strong><small>Download scaffolds, settings and reflections as JSON.</small></span><button class="button button-compact" data-action="export-data"><span data-icon="download"></span> Export</button></div><div class="settings-row"><span><strong>Import a backup</strong><small>Restore a Scaffold Seeds JSON backup.</small></span><label class="button button-compact" for="import-file"><span data-icon="upload"></span> Import</label><input class="file-input" type="file" id="import-file" accept="application/json" data-action="import-data"></div></div></section>
      <section class="settings-card"><h3>Privacy and reset</h3><p>Scaffold Seeds has no login or server. Copied prompts leave only when you paste them elsewhere; returned content stays in this browser.</p><div class="settings-list"><div class="settings-row"><span><strong>Pupil-information guardrail</strong><small>Never include names, diagnoses, assessment records, family details or safeguarding information in an external prompt.</small></span><span class="local-check-label">Local warning only</span></div><div class="settings-row"><span><strong>Clear local data</strong><small>Deletes saved scaffolds, AI rounds, raw responses, reflections and the current draft.</small></span><button class="button button-compact button-danger" data-action="clear-data"><span data-icon="trash"></span> Clear</button></div></div></section>
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
    const compatible = DATA.engines.filter(engine => engine.subjects.includes("all") || engine.subjects.includes(state.draft.subject));
    openModal({
      title: "Choose a scaffold engine",
      subtitle: `${compatible.length} subject-compatible structures from a ${DATA.engines.length}-engine professional library.`,
      body: `<div class="engine-recommendations engine-browser">${compatible.map((engine, index) => `<button class="engine-card ${state.draft.engineId === engine.id ? "is-selected" : ""}" data-action="modal-choose-engine" data-id="${engine.id}"><span class="engine-number">${String(index + 1).padStart(2, "0")}</span><span class="family-label">${esc(familyById(engine.family).name)}</span><h4>${esc(engine.name)}</h4><p>${esc(engine.tagline)}</p><small><strong>Preserves:</strong> ${esc(engine.preserves)}</small><small><strong>Watch:</strong> ${esc(engine.risk)}</small></button>`).join("")}</div>`
    });
  }

  function showPrintFormats() {
    openModal({
      title: "Choose a classroom format",
      subtitle: "One scaffold can travel into the room in different physical forms.",
      body: `<div class="format-picker">${DATA.printFormats.map(format => `<button class="format-option ${format.id === state.print.format ? "is-selected" : ""}" data-action="select-print-format" data-id="${format.id}"><span>${esc(format.group)}</span><strong>${esc(format.name)}</strong><p>${esc(format.note)}</p><small>${format.pieces} ${format.pieces === 1 ? "piece" : "pieces"} per pupil page</small></button>`).join("")}</div>`
    });
  }

  function showQualityReport() {
    const scaffold = state.activeScaffold || scaffoldFromDraft();
    const audit = qualityAudit({ ...scaffold, stage: state.draft.stage || scaffold.stage });
    const reviewCount = audit.filter(item => item.status !== "Strong").length;
    openModal({
      title: reviewCount ? `Scaffold quality · ${reviewCount} review point${reviewCount === 1 ? "" : "s"}` : "Scaffold quality · Strong",
      subtitle: "Eleven explainable professional judgements—never a fake effectiveness percentage.",
      body: `<div class="quality-report build3-quality">${audit.map(item => `<section class="quality-${esc(item.status.toLowerCase().replaceAll(" ", "-"))}"><div class="quality-report-head"><strong>${esc(item.label)}</strong><span>${esc(item.status)}</span></div><p>${esc(item.reason)}</p>${item.action && item.status !== "Strong" ? `<small>${esc(item.action)}</small>` : ""}</section>`).join("")}</div><div class="quality-principle"><strong>Professional judgement remains final.</strong><p>The real test is what pupils do when the support becomes lighter. Use one or two independence checks rather than generating a quiz.</p></div>`
    });
  }

  function showUseReflection(id) {
    const scaffold = state.library.find(item => item.id === id) || (state.activeScaffold?.id === id ? state.activeScaffold : null);
    if (!scaffold) return;
    const reflection = scaffold.reflection || {};
    const choice = (name, value, label) => `<label class="reflection-choice"><input type="radio" name="${name}" value="${value}" ${reflection[name] === value ? "checked" : ""}><span>${label}</span></label>`;
    openModal({
      title: "Reflect after use",
      subtitle: `${scaffold.title} · observations here improve future local recommendations.`,
      body: `<form class="use-reflection" id="use-reflection-form" data-id="${esc(scaffold.id)}">
        <fieldset><legend>Did the scaffold remove the intended barrier?</legend><div class="reflection-choices">${choice("worked", "not-yet", "Not yet")}${choice("worked", "partly", "Partly")}${choice("worked", "yes", "Yes")}</div></fieldset>
        <div class="form-field"><label for="reflection-surprise">What surprised you?</label><textarea id="reflection-surprise" name="surprise" rows="3" placeholder="A response, strategy or moment you did not expect…">${esc(reflection.surprise || "")}</textarea></div>
        <div class="form-field"><label for="reflection-misconception">What misconception actually appeared?</label><textarea id="reflection-misconception" name="misconception" rows="3" placeholder="Use the pupil's words or action if useful…">${esc(reflection.misconception || "")}</textarea></div>
        <fieldset><legend>Would you reuse this structure?</legend><div class="reflection-choices">${choice("reuse", "no", "No")}${choice("reuse", "adapt", "With changes")}${choice("reuse", "yes", "Yes")}</div></fieldset>
        <div class="form-field"><label for="reflection-reduce">What could reduce next time?</label><textarea id="reflection-reduce" name="reduceNext" rows="3" placeholder="A prompt, example, word bank or visual cue to remove…">${esc(reflection.reduceNext || "")}</textarea></div>
      </form>`,
      footer: '<button class="button" data-action="close-modal">Not now</button><button class="button button-primary" data-action="save-use-reflection">Save reflection</button>'
    });
  }

  function saveUseReflection() {
    const form = document.getElementById("use-reflection-form");
    if (!form) return;
    const scaffold = state.library.find(item => item.id === form.dataset.id);
    if (!scaffold) return;
    const fields = new FormData(form);
    const worked = fields.get("worked") || "partly";
    const reuse = fields.get("reuse") || "adapt";
    const currentStageIndex = DATA.stages.findIndex(stage => stage.id === scaffold.stage);
    scaffold.reflection = {
      worked,
      reuse,
      surprise: String(fields.get("surprise") || "").trim(),
      misconception: String(fields.get("misconception") || "").trim(),
      reduceNext: String(fields.get("reduceNext") || "").trim(),
      recommendedNextStage: worked === "yes" ? (DATA.stages[Math.min(currentStageIndex + 1, DATA.stages.length - 1)]?.id || scaffold.stage) : scaffold.stage,
      updatedAt: new Date().toISOString()
    };
    const reflectionText = `${scaffold.reflection.surprise} ${scaffold.reflection.reduceNext}`.toLowerCase();
    if (/sentence stem|stems/.test(reflectionText)) state.preferences.questionPrompts = true;
    if (/more space|larger writing|bigger lines|wider lines/.test(reflectionText)) state.preferences.largerWritingArea = true;
    writeStore(STORAGE.preferences, state.preferences);
    scaffold.updatedAt = new Date().toISOString();
    if (state.activeScaffold?.id === scaffold.id) state.activeScaffold = scaffold;
    writeStore(STORAGE.library, state.library);
    closeModal();
    toast(worked === "yes" ? "Reflection saved. Future suggestions will favour what worked and a lighter next step." : "Reflection saved. Future suggestions will treat this structure more cautiously.");
    render();
  }

  function regenerateSection(sectionName) {
    const scaffold = RESOURCE.normalise({ ...scaffoldFromDraft(), content: state.draft.content });
    const profile = RESOURCE.profileFor(scaffold);
    const engine = engineById(scaffold.engineId);
    if (sectionName === "instruction") {
      state.draft.content.instructionMode = "one-at-a-time";
      state.draft.content.instruction = (engine.prompts?.[0] || profile.questions?.[0] || "Begin with the first subject decision.").replace(/[.:;]+$/, "") + ".";
      state.draft.content.subInstruction = "Complete this decision before reading the next prompt.";
    }
    if (sectionName === "example") {
      state.draft.content.example = scaffold.subject === "mathematics" ? "Use a new set of values with the same mathematical structure. Complete only the first decision; leave the operation and conclusion for the pupil." : scaffold.subject === "history" ? "Use a different source detail. Model how provenance changes the question we can ask, but leave the historical inference blank." : scaffold.subject === "science" ? "Model one observation and one measurement. Leave the pattern and scientific explanation for pupils to form from the evidence." : "Model one transferable decision in a parallel context. Leave the central content, interpretation or conclusion blank.";
    }
    if (sectionName === "prompts") {
      const questions = [...(profile.questions || []), `What must remain true for this ${profile.name.toLowerCase()} decision to work?`, "What evidence or relationship makes your choice defensible?", "Which prompt can you now remove?" ];
      state.draft.content.prompts = questions.slice(0, 5);
      state.preferences.questionPrompts = true;
      writeStore(STORAGE.preferences, state.preferences);
    }
    state.activeScaffold = { ...(state.activeScaffold || scaffoldFromDraft()), content: { ...state.draft.content }, updatedAt: new Date().toISOString() };
    saveDraft();
    toast(sectionName === "prompts" ? "Prompts replaced with subject questions." : sectionName === "example" ? "A new local example frame was created." : "Instruction language shortened without lowering the objective.");
    render();
  }

  function saveScaffold() {
    const scaffold = state.activeScaffold ? { ...state.activeScaffold, ...scaffoldFromDraft(), id: state.activeScaffold.id, createdAt: state.activeScaffold.createdAt, reflection: state.activeScaffold.reflection || null } : scaffoldFromDraft();
    scaffold.updatedAt = new Date().toISOString();
    const index = state.library.findIndex(item => item.id === scaffold.id);
    if (index >= 0) {
      const previous = state.library[index];
      const versions = [...(previous.versions || [])];
      if (meaningfulHash(previous) !== meaningfulHash(scaffold)) versions.unshift(versionSnapshot(previous, `Before ${formatDate(scaffold.updatedAt)}`));
      scaffold.versions = versions.slice(0, 16);
      state.library[index] = scaffold;
    }
    else state.library.unshift(scaffold);
    state.activeScaffold = scaffold;
    state.draft.editingId = scaffold.id;
    writeStore(STORAGE.library, state.library);
    saveDraft();
    toast(index >= 0 ? "Scaffold changes saved locally." : "Scaffold saved to your library.");
    render();
  }

  function versionSnapshot(scaffold, name = "Saved checkpoint") {
    const { versions, ...snapshot } = scaffold;
    return { id: uid(), name, savedAt: new Date().toISOString(), snapshot: JSON.parse(JSON.stringify(snapshot)) };
  }

  function meaningfulHash(scaffold) {
    const { updatedAt, lastPrintedAt, versions, favourite, reflection, ...meaningful } = scaffold || {};
    return JSON.stringify(meaningful);
  }

  function saveVersion() {
    if (!state.activeScaffold || !state.library.some(item => item.id === state.activeScaffold.id)) saveScaffold();
    const scaffold = state.library.find(item => item.id === state.activeScaffold?.id);
    if (!scaffold) return;
    const name = window.prompt("Name this checkpoint", `Ready for ${scaffold.phase.toLowerCase()}`);
    if (name === null) return;
    scaffold.versions = [versionSnapshot(scaffold, name.trim() || "Named checkpoint"), ...(scaffold.versions || [])].slice(0, 16);
    scaffold.updatedAt = new Date().toISOString();
    writeStore(STORAGE.library, state.library);
    toast("Version checkpoint created.");
    render();
  }

  function showVersions(id) {
    const scaffold = state.library.find(item => item.id === id);
    if (!scaffold) return;
    const versions = scaffold.versions || [];
    openModal({
      title: "Version history",
      subtitle: `${scaffold.title} · checkpoints are created only on deliberate saves.`,
      body: versions.length ? `<div class="version-list">${versions.map((version, index) => `<section><div><span class="eyebrow">${relativeDate(version.savedAt)}</span><h3>${esc(version.name)}</h3><p>${esc(version.snapshot.stage ? `${titleCase(version.snapshot.stage)} · ${engineById(version.snapshot.engineId).name}` : "Earlier resource")}</p></div><div><button class="button button-compact" data-action="restore-version" data-parent="${esc(id)}" data-id="${esc(version.id)}">Restore</button><button class="button button-compact" data-action="duplicate-version" data-parent="${esc(id)}" data-id="${esc(version.id)}">Duplicate</button></div></section>`).join("")}</div>` : `<div class="empty-help"><h4>No earlier checkpoints yet</h4><p>Save a meaningful edit or create a named checkpoint from the review screen.</p></div>`
    });
  }

  function restoreVersion(parentId, versionId, duplicate = false) {
    const parent = state.library.find(item => item.id === parentId);
    const version = parent?.versions?.find(item => item.id === versionId);
    if (!parent || !version) return;
    const restored = JSON.parse(JSON.stringify(version.snapshot));
    const now = new Date().toISOString();
    if (duplicate) {
      restored.id = uid(); restored.title = `${restored.title} · from version`; restored.createdAt = now; restored.updatedAt = now; restored.versions = [];
      state.library.unshift(restored);
    } else {
      const currentVersion = versionSnapshot(parent, "Before version restore");
      Object.assign(parent, restored, { id: parent.id, createdAt: parent.createdAt, updatedAt: now, versions: [currentVersion, ...(parent.versions || [])].slice(0, 16) });
      if (state.activeScaffold?.id === parent.id) state.activeScaffold = parent;
    }
    writeStore(STORAGE.library, state.library);
    closeModal();
    toast(duplicate ? "A new scaffold was created from that version." : "Earlier version restored. The replaced state was checkpointed.");
    render();
  }

  function renameScaffold(id) {
    const scaffold = state.library.find(item => item.id === id);
    if (!scaffold) return;
    const name = window.prompt("Rename scaffold", scaffold.title);
    if (!name?.trim() || name.trim() === scaffold.title) return;
    scaffold.versions = [versionSnapshot(scaffold, "Before rename"), ...(scaffold.versions || [])].slice(0, 16);
    scaffold.title = name.trim().slice(0, 140);
    scaffold.updatedAt = new Date().toISOString();
    writeStore(STORAGE.library, state.library);
    toast("Scaffold renamed.");
    render();
  }

  function setArchive(id, archived) {
    const scaffold = state.library.find(item => item.id === id);
    if (!scaffold) return;
    scaffold.archived = archived;
    scaffold.updatedAt = new Date().toISOString();
    writeStore(STORAGE.library, state.library);
    toast(archived ? "Scaffold moved to the archive." : "Scaffold restored to the library.");
    render();
  }

  function recordFade(id) {
    const scaffold = state.library.find(item => item.id === id);
    if (!scaffold) return;
    const from = scaffold.stage;
    const to = state.draft.stage;
    scaffold.fadeHistory = [...(scaffold.fadeHistory || []), { from, to, at: new Date().toISOString() }].slice(-20);
    scaffold.stage = to;
    scaffold.updatedAt = new Date().toISOString();
    writeStore(STORAGE.library, state.library);
    toast(`Move from ${titleCase(from)} to ${titleCase(to)} recorded.`);
    render();
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
      familyId: scaffold.familyId,
      representation: scaffold.representation,
      editingId: scaffold.id
    });
    analyseBarrier();
    state.draft.selectedBarriers = [...scaffold.barriers];
    state.draft.engineId = scaffold.engineId;
    state.createStep = 5;
    saveDraft();
    navigate("create");
  }

  function duplicateScaffold(id) {
    const original = state.library.find(item => item.id === id);
    if (!original) return;
    const now = new Date().toISOString();
    const copy = { ...original, id: uid(), title: `${original.title} · copy`, favourite: false, archived: false, reflection: null, versions: [], createdAt: now, updatedAt: now };
    state.library.unshift(copy);
    writeStore(STORAGE.library, state.library);
    toast("A fresh copy has been added to your library.");
    render();
  }

  function deleteScaffold(id) {
    const item = state.library.find(scaffold => scaffold.id === id);
    if (!item?.archived || !window.confirm(`Permanently delete “${item.title}”? Export a backup first if you may need it later.`)) return;
    state.library = state.library.filter(scaffold => scaffold.id !== id);
    localStorage.removeItem(`${STORAGE.aiWorkspace}.${id}`);
    if (state.activeScaffold?.id === id) state.activeScaffold = state.library[0] || null;
    writeStore(STORAGE.library, state.library);
    toast("Archived scaffold permanently deleted. It can be recovered only from an exported backup.");
    render();
  }

  function exportData() {
    const library = state.settings.aiIncludeResponseHistory ? state.library : state.library.map(item => AI.portableResource(item, { excludeHistory: true }).resource);
    const payload = JSON.stringify({ product: "Scaffold Seeds", version: 4, schemaVersion: 4, exportedAt: new Date().toISOString(), library, settings: state.settings, reflections: state.reflections, preferences: state.preferences, aiWorkspaces: storedAIWorkspaces(state.settings.aiIncludeResponseHistory) }, null, 2);
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
      state.library = migrateLibrary(data.library.filter(item => item && typeof item === "object" && typeof item.title === "string" && typeof item.subject === "string"));
      state.settings = { ...defaultSettings, ...data.settings };
      state.reflections = data.reflections || {};
      state.preferences = data.preferences || {};
      writeStore(STORAGE.library, state.library);
      writeStore(STORAGE.settings, state.settings);
      writeStore(STORAGE.reflections, state.reflections);
      writeStore(STORAGE.preferences, state.preferences);
      if (data.aiWorkspaces && typeof data.aiWorkspaces === "object") Object.entries(data.aiWorkspaces).forEach(([resourceId, workspace]) => {
        if (workspace && typeof workspace === "object" && workspace.resourceId === resourceId) writeStore(`${STORAGE.aiWorkspace}.${resourceId}`, AI.createWorkspace(state.library.find(item => item.id === resourceId) || {}, workspace));
      });
      state.activeScaffold = state.library[0] || null;
      state.aiWorkspace = AI.createWorkspace(state.activeScaffold || {}, state.activeScaffold?.id ? readStore(`${STORAGE.aiWorkspace}.${state.activeScaffold.id}`, null) : null);
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
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(`${STORAGE.aiWorkspace}.`)) localStorage.removeItem(key);
    }
    state.library = [];
    state.reflections = {};
    state.preferences = {};
    state.archives = [];
    state.draft = normaliseDraft(null);
    state.activeScaffold = null;
    state.settings = { ...defaultSettings };
    state.aiWorkspace = AI.createWorkspace({});
    applySettings();
    toast("Local Scaffold Seeds data has been cleared.");
    render();
  }

  function printNow() {
    const scaffold = activeForPrint();
    if (!scaffold) return;
    const format = printFormatById();
    const stageIds = format.id === "mixed-pack" ? DATA.stages.map(stage => stage.id) : (state.print.stages.length ? state.print.stages : [scaffold.stage]);
    const stageResources = stageIds.map(stage => RESOURCE.createStage(scaffold, stage));
    const resources = format.id === "display-poster" && state.print.arrangement === "2x2" ? stageResources.flatMap(item => [0,1,2,3].map(tile => ({ ...item, printTile: tile }))) : stageResources;
    const printRoot = document.getElementById("print-root");
    printRoot.innerHTML = resources.map(item => applyPaperOptions(renderFormatDocument(item))).join("") + (state.print.teacherGuidance ? renderTeacherGuide(scaffold) : "");
    let style = document.getElementById("print-dynamic-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "print-dynamic-style";
      document.head.appendChild(style);
    }
    style.textContent = `@media print { @page { size: ${state.print.paper.toUpperCase()} ${state.print.orientation}; margin: 0; } }`;
    const libraryItem = state.library.find(item => item.id === scaffold.id);
    if (libraryItem) {
      libraryItem.lastPrintedAt = new Date().toISOString();
      if (libraryItem.ai?.status === "teacher-approved") libraryItem.ai.status = "print-ready";
      writeStore(STORAGE.library, state.library);
    }
    setTimeout(() => window.print(), 30);
  }

  document.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      if (viewButton.dataset.aiHomeFilter === "review") state.libraryFilters.aiStatus = "needs-review";
      if (viewButton.dataset.aiHomeFilter === "approved") state.libraryFilters.aiStatus = "approved";
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
      if (state.createStep === 2 && !state.draft.selectedBarriers.length && !state.draft.customBarrier.trim()) {
        toast("Choose or describe the barrier that best explains the sticking point.");
        return;
      }
      if (state.createStep === 2 && !state.draft.essentialThinking.trim()) {
        toast("State the thinking that must remain with pupils.");
        return;
      }
      if (state.createStep === 3 && !state.draft.engineId) {
        toast("Choose the scaffold engine that best preserves the thinking.");
        return;
      }
      state.createStep = Math.min(6, state.createStep + 1);
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
    if (action === "move-barrier") {
      const current = state.draft.selectedBarriers.indexOf(id);
      const target = current + (button.dataset.direction === "up" ? -1 : 1);
      if (current >= 0 && target >= 0 && target < state.draft.selectedBarriers.length) {
        [state.draft.selectedBarriers[current], state.draft.selectedBarriers[target]] = [state.draft.selectedBarriers[target], state.draft.selectedBarriers[current]];
        updateRecommendations();
        saveDraft();
        render();
      }
    }
    if (action === "choose-engine") {
      state.draft.engineId = id;
      state.draft.preferredEngine = "";
      state.draft.familyId = engineById(id).family;
      state.draft.content = { ...normaliseDraft(null).content };
      saveDraft();
      render();
    }
    if (action === "modal-choose-engine") {
      state.draft.engineId = id;
      state.draft.preferredEngine = "";
      state.draft.familyId = engineById(id).family;
      state.draft.content = { ...normaliseDraft(null).content };
      saveDraft();
      closeModal();
      render();
    }
    if (action === "show-all-barriers") showAllBarriers();
    if (action === "show-all-engines") showAllEngines();
    if (action === "choose-stage") {
      state.draft.stage = id;
      if (state.activeScaffold) {
        state.activeScaffold = RESOURCE.createStage({ ...state.activeScaffold, content: state.draft.content }, id);
      }
      saveDraft();
      render();
    }
    if (action === "toggle-stage-compare") {
      state.compareStages = !state.compareStages;
      render();
    }
    if (action === "regenerate-section") regenerateSection(button.dataset.section);
    if (action === "generate-scaffold") {
      if (!state.draft.title.trim()) {
        toast("Give the resource a clear title first.");
        return;
      }
      state.activeScaffold = scaffoldFromDraft();
      state.createStep = 5;
      saveDraft();
      render();
    }
    if (action === "save-scaffold") saveScaffold();
    if (action === "save-version") saveVersion();
    if (action === "record-fade") recordFade(id);
    if (action === "record-use-reflection") showUseReflection(id);
    if (action === "save-use-reflection") saveUseReflection();
    if (action === "show-quality-report") showQualityReport();
    if (action === "open-print") {
      state.activeScaffold = state.activeScaffold || scaffoldFromDraft();
      state.print.format = state.activeScaffold.format || state.print.format;
      state.print.stages = [state.activeScaffold.stage || state.settings.defaultStage];
      navigate("print");
    }
    if (action === "open-ai") {
      const selected = id ? state.library.find(item => item.id === id) : (state.activeScaffold || scaffoldFromDraft());
      if (selected) {
        if (state.aiWorkspace?.resourceId && state.aiWorkspace.resourceId !== selected.id) saveAIWorkspace();
        state.activeScaffold = selected;
        state.draft = normaliseDraft({ ...selected, selectedBarriers: selected.barriers, vocabulary: (selected.content?.vocabulary || selected.vocabulary || []).join(", "), tags: (selected.tags || []).join(", "), editingId: selected.id });
        state.draft.engineId = selected.engineId;
        ensureAIWorkspace(selected, state.aiWorkspace?.resourceId !== selected.id);
        navigate("ai");
      }
    }
    if (action === "ai-template-task") {
      const scaffold = activeForAI();
      if (scaffold) {
        ensureAIWorkspace(scaffold, state.aiWorkspace?.resourceId !== scaffold.id);
        const task = AI.taskById(id);
        state.aiWorkspace.options.taskId = task.id;
        state.aiWorkspace.options.reviewLevel = task.risk;
        state.aiWorkspace.options.quantity = task.quantity;
        state.aiWorkspace.options.depth = task.risk === "forensic" ? "forensic" : "professional";
        state.aiTaskFamily = task.family;
        state.aiWorkspace.phase = "task";
        saveAIWorkspace();
        navigate("ai");
      }
    }
    if (action === "ai-family") { state.aiTaskFamily = id; render(); }
    if (action === "ai-choose-task") {
      const task = AI.taskById(id);
      state.aiWorkspace.options.taskId = task.id;
      state.aiWorkspace.options.quantity = task.quantity;
      state.aiWorkspace.options.reviewLevel = task.risk;
      state.aiWorkspace.options.depth = task.risk === "forensic" ? "forensic" : "professional";
      state.aiWorkspace.options.sourceDetails = task.sourceSensitive;
      state.aiWorkspace.prompt = null;
      state.aiWorkspace.parsed = null;
      state.aiWorkspace.verification = null;
      saveAIWorkspace();
      render();
    }
    if (action === "ai-template") {
      const template = DATA.ai.templates.find(item => item.id === id);
      if (template) {
        state.aiWorkspace.options = { ...state.aiWorkspace.options, taskId: template.taskId, depth: template.depth, reviewLevel: template.review, quantity: template.quantity };
        state.aiTaskFamily = AI.taskById(template.taskId).family;
        state.aiWorkspace.prompt = null;
        saveAIWorkspace();
        toast(`${template.name} configured.`);
        render();
      }
    }
    if (action === "ai-phase") {
      if (id === "review" && !state.aiWorkspace.parsed) { toast("Import and structure a response first."); return; }
      if (id === "verify" && !state.aiWorkspace.verification) { runAIVerification(); return; }
      state.aiWorkspace.phase = id;
      saveAIWorkspace();
      render();
    }
    if (action === "ai-prepare-prompt") prepareAIPrompt();
    if (action === "ai-prompt-view") { state.aiWorkspace.promptView = id; saveAIWorkspace(); render(); }
    if (action === "ai-copy-prompt") {
      ensureAIBaselineSaved(activeForAI());
      saveAIWorkspace();
      const prompt = state.aiWorkspace.prompt;
      const text = id === "primary" ? (state.aiWorkspace.promptManual || prompt.scrubbed) : ({ compact: prompt.compact, structured: prompt.structured, packet: prompt.packet, image: prompt.imageBrief, verify: prompt.verificationOnly }[id] || prompt.scrubbed);
      copyText(AI.privacyScan(text).scrubbed, "Scaffold saved. Prompt copied; you can safely leave and return.");
    }
    if (action === "ai-download-prompt") {
      const prompt = state.aiWorkspace.prompt;
      const text = id === "primary" ? (state.aiWorkspace.promptManual || prompt.scrubbed) : ({ compact: prompt.compact, structured: prompt.structured, packet: prompt.packet, image: prompt.imageBrief, verify: prompt.verificationOnly }[id] || prompt.scrubbed);
      downloadText(`scaffold-seeds-${id}-${new Date().toISOString().slice(0, 10)}.txt`, AI.privacyScan(text).scrubbed);
      toast("Prompt downloaded as plain text.");
    }
    if (action === "ai-rescrub-prompt") {
      state.aiWorkspace.promptManual = AI.privacyScan(state.aiWorkspace.promptManual || state.aiWorkspace.prompt.scrubbed).scrubbed;
      saveAIWorkspace();
      toast("Neutral replacements applied. Review them before copying.");
      render();
    }
    if (action === "ai-structure-import") structureAIImport("automatic");
    if (action === "ai-import-plain") structureAIImport("plain");
    if (action === "ai-manual-import") structureAIImport("manual");
    if (action === "ai-clear-import") {
      state.aiWorkspace.rawImport = "";
      state.aiWorkspace.parsed = null;
      state.aiWorkspace.verification = null;
      state.aiWorkspace.rawPreservedAt = null;
      saveAIWorkspace();
      render();
    }
    if (action === "ai-item-decision") {
      const current = state.aiWorkspace.parsed.sections.flatMap(section => section.items).find(item => item.id === id);
      state.aiWorkspace.parsed = AI.setItemDecision(state.aiWorkspace.parsed, id, button.dataset.status, current?.editedText ?? current?.text);
      state.aiWorkspace.verification = null;
      updateAIResourceStatus("review-required");
      saveAIWorkspace();
      render();
    }
    if (action === "ai-decide-section") {
      state.aiWorkspace.parsed = AI.decideSection(state.aiWorkspace.parsed, id, button.dataset.status);
      state.aiWorkspace.verification = null;
      updateAIResourceStatus("review-required");
      saveAIWorkspace();
      render();
    }
    if (action === "ai-compare-section") { state.aiWorkspace.comparisonSection = id; saveAIWorkspace(); render(); }
    if (action === "ai-trim") {
      state.aiWorkspace.parsed = AI.trimContent(state.aiWorkspace.parsed, id);
      state.aiWorkspace.verification = null;
      saveAIWorkspace();
      toast("Trimming applied visibly; removed content remains recorded.");
      render();
    }
    if (action === "ai-regenerate-section") {
      const taskMap = { vocabulary: "vocabulary-set", questions: "practice-questions", answers: "verify-answer-guidance", passage: "reading-passage", scenarios: "scenario-cards", misconceptions: "misconceptions", critique: "critique-pupil-thinking", sources: "verify-quotation", instructions: "shorten-instructions", examples: "accurate-examples", "non-examples": "non-examples", "teacher-guidance": "teacher-modelling", "image-brief": "image-brief", "diagram-spec": "diagram-specification" };
      const task = AI.taskById(taskMap[id] || "accurate-examples");
      state.aiWorkspace.rejectedChanges = [...(state.aiWorkspace.rejectedChanges || []), ...state.aiWorkspace.parsed.sections.flatMap(section => section.items).filter(item => item.status === "rejected").map(item => item.text)].slice(-20);
      state.aiWorkspace.options.taskId = task.id;
      state.aiWorkspace.options.reviewLevel = task.risk;
      state.aiWorkspace.options.contextNote = `Regenerate ${DATA.ai.sections[id]?.name || id} only. Preserve all approved content and do not reintroduce previously rejected changes: ${(state.aiWorkspace.rejectedChanges || []).slice(-5).join(" | ")}`;
      state.aiTaskFamily = task.family;
      prepareAIPrompt();
    }
    if (action === "ai-run-verification") runAIVerification();
    if (action === "ai-toggle-finding") {
      const item = state.aiWorkspace.verification.findings.find(finding => finding.id === id);
      if (item?.severity === "do-not-use" && !item.resolved) { toast("Correct the serious issue, then re-run local checks."); return; }
      if (item) item.resolved = !item.resolved;
      recomputeVerificationSummary(state.aiWorkspace.verification);
      saveAIWorkspace();
      render();
    }
    if (action === "ai-correct-finding") {
      const item = state.aiWorkspace.verification.findings.find(finding => finding.id === id);
      if (item?.title === "Local representation is malformed") {
        state.createStep = 4;
        toast("Correct the local diagram in the Scaffold Designer, then return and re-run checks.");
        navigate("create");
        return;
      }
      state.aiWorkspace.comparisonSection = item?.sectionId || state.aiWorkspace.comparisonSection;
      state.aiWorkspace.phase = "review";
      saveAIWorkspace();
      toast("Edit or reject the flagged content, then run verification again.");
      render();
    }
    if (action === "ai-rerun-verification") {
      state.aiWorkspace.verification = null;
      state.aiWorkspace.approvalChecked = false;
      runAIVerification();
    }
    if (action === "ai-filter-findings") { state.aiWorkspace.findingFilter = state.aiWorkspace.findingFilter === id ? "" : id; saveAIWorkspace(); render(); }
    if (action === "ai-run-trace") { saveAIWorkspace(); render(); }
    if (action === "ai-download-report") {
      downloadText(`scaffold-seeds-verification-${new Date().toISOString().slice(0, 10)}.txt`, AI.verificationReport(activeForAI(), state.aiWorkspace.verification));
      toast("Verification report downloaded.");
    }
    if (action === "ai-add-source") {
      state.aiWorkspace.sourceRecords = [...(state.aiWorkspace.sourceRecords || []), AI.makeSourceRecord("", "unverified")];
      saveAIWorkspace();
      render();
    }
    if (action === "ai-remove-source") {
      state.aiWorkspace.sourceRecords = (state.aiWorkspace.sourceRecords || []).filter(record => record.id !== id);
      saveAIWorkspace();
      render();
    }
    if (action === "ai-apply-content") applyAIContent();
    if (action === "ai-rotate-image" && state.aiWorkspace.image) { state.aiWorkspace.image.rotation = ((state.aiWorkspace.image.rotation || 0) + 90) % 360; saveAIWorkspace(); render(); }
    if (action === "ai-toggle-greyscale" && state.aiWorkspace.image) { state.aiWorkspace.image.greyscale = !state.aiWorkspace.image.greyscale; saveAIWorkspace(); render(); }
    if (action === "ai-remove-image") { state.aiWorkspace.image = null; saveAIWorkspace(); render(); }
    if (action === "reset-ai-preferences") {
      delete state.preferences.aiTask;
      state.settings.aiPromptDepth = "professional";
      writeStore(STORAGE.preferences, state.preferences);
      writeStore(STORAGE.settings, state.settings);
      if (activeForAI()) resetAIWorkspace(activeForAI());
      toast("AI Companion defaults reset.");
      render();
    }
    if (action === "edit-design") {
      state.createStep = 4;
      navigate("create");
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
    if (action === "rename-scaffold") renameScaffold(id);
    if (action === "archive-scaffold") setArchive(id, true);
    if (action === "restore-scaffold") setArchive(id, false);
    if (action === "show-versions") showVersions(id);
    if (action === "restore-version") restoreVersion(button.dataset.parent, id, false);
    if (action === "duplicate-version") restoreVersion(button.dataset.parent, id, true);
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
      state.libraryFilters = { query: "", year: "all", subject: "all", family: "all", format: "all", stage: "all", aiStatus: "all", source: "all", favourite: false, archived: state.libraryFilters.archived, sort: "edited" };
      render();
    }
    if (action === "library-view") {
      state.libraryFilters.archived = id === "archived";
      state.libraryFilters.query = "";
      state.librarySelection = [];
      render();
    }
    if (action === "batch-clear") { state.librarySelection = []; render(); }
    if (action === "batch-export") {
      const resources = state.library.filter(item => state.librarySelection.includes(item.id)).map(item => AI.portableResource(item, { excludeHistory: !state.settings.aiIncludeResponseHistory }).resource);
      downloadText(`scaffold-seeds-selected-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ product: "Scaffold Seeds", schemaVersion: 4, exportedAt: new Date().toISOString(), resources }, null, 2), "application/json");
      toast(`${resources.length} selected resource${resources.length === 1 ? "" : "s"} exported.`);
    }
    if (action === "batch-reviewed") {
      let count = 0;
      state.library.filter(item => state.librarySelection.includes(item.id)).forEach(item => {
        const unresolvedHighRisk = item.ai?.lastVerification?.findings?.some(finding => !finding.resolved && ["important", "do-not-use"].includes(finding.severity));
        if (!unresolvedHighRisk) { item.ai = { ...(item.ai || {}), batchReviewedAt: new Date().toISOString() }; count += 1; }
      });
      writeStore(STORAGE.library, state.library);
      toast(`${count} resource${count === 1 ? "" : "s"} marked reviewed. No resource was bulk approved.`);
      render();
    }
    if (action === "batch-archive") {
      const archive = !state.libraryFilters.archived;
      state.library.filter(item => state.librarySelection.includes(item.id)).forEach(item => { item.archived = archive; item.updatedAt = new Date().toISOString(); });
      writeStore(STORAGE.library, state.library);
      state.librarySelection = [];
      toast(archive ? "Selected resources archived." : "Selected resources restored.");
      render();
    }
    if (action === "knowledge-subject") {
      state.knowledgeSubject = id;
      state.knowledgeProfile = brainBySubject(id).profiles[0].id;
      render();
    }
    if (action === "knowledge-profile") {
      state.knowledgeProfile = id;
      render();
    }
    if (action === "knowledge-lens") {
      state.knowledgeLens = id;
      render();
    }
    if (action === "choose-print-format") showPrintFormats();
    if (action === "select-print-format") {
      state.print.format = id;
      if (id === "a5-sheet") state.print.paper = "a5";
      closeModal();
      render();
    }
    if (action === "copy-question") {
      const question = button.dataset.question || button.textContent.trim();
      navigator.clipboard?.writeText(question).then(() => toast("Teacher question copied."), () => toast("Select and copy the question from the screen."));
    }
    if (action === "move-print-stage") {
      const currentIndex = state.print.stages.indexOf(id);
      const offset = button.dataset.direction === "up" ? -1 : 1;
      const targetIndex = currentIndex + offset;
      if (currentIndex >= 0 && targetIndex >= 0 && targetIndex < state.print.stages.length) {
        [state.print.stages[currentIndex], state.print.stages[targetIndex]] = [state.print.stages[targetIndex], state.print.stages[currentIndex]];
        render();
      }
    }
    if (action === "print-now") printNow();
    if (action === "export-data") exportData();
    if (action === "clear-data") clearData();
    if (action === "close-modal") closeModal();
  });

  document.addEventListener("input", event => {
    const aiOption = event.target.closest("[data-ai-option]");
    if (aiOption && aiOption.tagName !== "SELECT") {
      const key = aiOption.dataset.aiOption;
      state.aiWorkspace.options[key] = ["quantity", "maxWords", "modellingLimit"].includes(key) ? Number(aiOption.value) : aiOption.value;
      if (key !== "traceAlgorithm") state.aiWorkspace.prompt = null;
      scheduleAIWorkspaceSave();
      return;
    }
    const aiRaw = event.target.closest("[data-ai-raw-import]");
    if (aiRaw) {
      state.aiWorkspace.rawImport = aiRaw.value;
      state.aiWorkspace.parsed = null;
      state.aiWorkspace.verification = null;
      scheduleAIWorkspaceSave();
      return;
    }
    const aiPromptManual = event.target.closest("[data-ai-prompt-manual]");
    if (aiPromptManual) {
      state.aiWorkspace.promptManual = aiPromptManual.value;
      scheduleAIWorkspaceSave();
      return;
    }
    const aiItem = event.target.closest("[data-ai-item-edit]");
    if (aiItem) {
      const item = state.aiWorkspace.parsed?.sections.flatMap(section => section.items).find(entry => entry.id === aiItem.dataset.aiItemEdit);
      if (item) { item.editedText = AI.sanitiseRaw(aiItem.value).slice(0, 5000); item.status = "edited"; }
      state.aiWorkspace.verification = null;
      scheduleAIWorkspaceSave();
      return;
    }
    const aiImageField = event.target.closest("[data-ai-image-field]");
    if (aiImageField && aiImageField.tagName !== "SELECT" && state.aiWorkspace.image) {
      state.aiWorkspace.image[aiImageField.dataset.aiImageField] = aiImageField.value.slice(0, 500);
      scheduleAIWorkspaceSave();
      return;
    }
    const aiRoundName = event.target.closest("[data-ai-round-name]");
    if (aiRoundName) { state.aiWorkspace.roundName = aiRoundName.value.slice(0, 120); scheduleAIWorkspaceSave(); return; }
    const aiSourceField = event.target.closest("[data-ai-source-field]");
    if (aiSourceField && aiSourceField.tagName !== "SELECT") {
      const record = (state.aiWorkspace.sourceRecords || []).find(item => item.id === aiSourceField.dataset.sourceId);
      if (record) record[aiSourceField.dataset.aiSourceField] = aiSourceField.value.slice(0, 800);
      scheduleAIWorkspaceSave();
      return;
    }
    const contentField = event.target.closest("[data-content-field]");
    if (contentField && contentField.tagName !== "SELECT") {
      const key = contentField.dataset.contentField;
      const mode = contentField.dataset.listMode;
      state.draft.content[key] = mode === "lines" ? contentField.value.split(/\n+/).map(item => item.trim()).filter(Boolean) : mode === "commas" ? contentField.value.split(/[,\n]/).map(item => item.trim()).filter(Boolean) : contentField.value;
      if (key === "vocabulary") state.draft.vocabulary = state.draft.content.vocabulary.join(", ");
      setSaveStatus("unsaved");
      saveDraft();
      const preview = document.getElementById("live-resource-preview");
      if (preview) {
        const scaffold = { ...scaffoldFromDraft(), content: state.draft.content, diagram: { ...state.draft.diagram, type: state.draft.content.diagramType, labels: state.draft.content.diagramLabels } };
        preview.innerHTML = renderResourceDocument(scaffold);
      }
      return;
    }
    const settingField = event.target.closest("[data-setting-field]");
    if (settingField) {
      state.settings[settingField.dataset.settingField] = settingField.value.slice(0, 120);
      writeStore(STORAGE.settings, state.settings);
      return;
    }
    const field = event.target.closest("[data-draft-field]");
    if (field && field.tagName !== "SELECT") {
      state.draft[field.dataset.draftField] = field.value;
      saveDraft();
      if (field.dataset.draftField === "situation") {
        const guidance = document.getElementById("live-guidance");
        if (guidance) guidance.innerHTML = renderLiveGuidance();
      }
      if (state.createStep === 4) {
        const preview = document.getElementById("live-resource-preview");
        if (preview) preview.innerHTML = renderResourceDocument({ ...scaffoldFromDraft(), content: state.draft.content, diagram: { ...state.draft.diagram, type: state.draft.content.diagramType, labels: state.draft.content.diagramLabels } });
      }
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
    const librarySelect = event.target.closest("[data-library-select]");
    if (librarySelect) {
      const resourceId = librarySelect.dataset.librarySelect;
      state.librarySelection = librarySelect.checked
        ? [...new Set([...state.librarySelection, resourceId])]
        : state.librarySelection.filter(id => id !== resourceId);
      render();
      return;
    }
    const aiOption = event.target.closest("[data-ai-option]");
    if (aiOption) {
      const key = aiOption.dataset.aiOption;
      state.aiWorkspace.options[key] = ["quantity", "maxWords", "modellingLimit"].includes(key) ? Number(aiOption.value) : aiOption.value;
      if (key === "depth") state.settings.aiPromptDepth = aiOption.value;
      if (key !== "traceAlgorithm") state.aiWorkspace.prompt = null;
      saveAIWorkspace();
      render();
      return;
    }
    const aiKnowledge = event.target.closest("[data-ai-knowledge]");
    if (aiKnowledge) {
      const id = aiKnowledge.dataset.aiKnowledge;
      const selected = state.aiWorkspace.options.selectedKnowledge || [];
      state.aiWorkspace.options.selectedKnowledge = aiKnowledge.checked ? [...new Set([...selected, id])] : selected.filter(item => item !== id);
      state.aiWorkspace.prompt = null;
      saveAIWorkspace();
      return;
    }
    const aiSectionMap = event.target.closest("[data-ai-section-map]");
    if (aiSectionMap) {
      state.aiWorkspace.parsed = AI.mapSection(state.aiWorkspace.parsed, Number(aiSectionMap.dataset.index), aiSectionMap.value);
      state.aiWorkspace.verification = null;
      saveAIWorkspace();
      render();
      return;
    }
    const aiCompare = event.target.closest("[data-ai-compare-select]");
    if (aiCompare) { state.aiWorkspace.comparisonSection = aiCompare.value; saveAIWorkspace(); render(); return; }
    const aiApproval = event.target.closest("[data-ai-approval]");
    if (aiApproval) { state.aiWorkspace.approvalChecked = aiApproval.checked; saveAIWorkspace(); render(); return; }
    const aiApprovalScope = event.target.closest("[data-ai-approval-scope]");
    if (aiApprovalScope) { state.aiWorkspace.approvalScope = aiApprovalScope.value; saveAIWorkspace(); return; }
    const aiImageField = event.target.closest("[data-ai-image-field]");
    if (aiImageField && state.aiWorkspace.image) { state.aiWorkspace.image[aiImageField.dataset.aiImageField] = aiImageField.value; saveAIWorkspace(); render(); return; }
    const aiSourceField = event.target.closest("[data-ai-source-field]");
    if (aiSourceField) {
      const record = (state.aiWorkspace.sourceRecords || []).find(item => item.id === aiSourceField.dataset.sourceId);
      if (record) record[aiSourceField.dataset.aiSourceField] = aiSourceField.value.slice(0, 800);
      saveAIWorkspace();
      return;
    }
    const aiImageFile = event.target.closest("[data-ai-image-file]");
    if (aiImageFile) {
      const file = aiImageFile.files?.[0];
      if (!file) return;
      if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 2500000) { toast("Choose a PNG, JPEG or WebP under 2.5 MB."); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          state.aiWorkspace.image = { id: uid(), name: file.name.slice(0, 120), type: file.type, bytes: file.size, dataUrl: reader.result, width: image.naturalWidth, height: image.naturalHeight, rotation: 0, fit: "contain", caption: "", alt: "", greyscale: false, storedLocally: true, analysis: analyseLocalImage(image) };
          saveAIWorkspace();
          toast(file.size > 850000 ? "Image loaded locally. Its size may limit how many versions the browser can store." : "Image loaded locally. Add a caption and alt text before use.");
          render();
        };
        image.onerror = () => toast("That image could not be previewed.");
        image.src = reader.result;
      };
      reader.onerror = () => toast("That image could not be read.");
      reader.readAsDataURL(file);
      return;
    }
    const contentField = event.target.closest("[data-content-field]");
    if (contentField) {
      const key = contentField.dataset.contentField;
      const mode = contentField.dataset.listMode;
      state.draft.content[key] = mode === "commas" ? contentField.value.split(/[,\n]/).map(item => item.trim()).filter(Boolean) : contentField.value;
      if (key === "diagramType") state.draft.diagram.type = contentField.value;
      saveDraft();
      render();
      return;
    }
    const contentToggle = event.target.closest("[data-content-toggle]");
    if (contentToggle) {
      state.draft.content[contentToggle.dataset.contentToggle] = contentToggle.checked;
      saveDraft();
      render();
      return;
    }
    const sectionToggle = event.target.closest("[data-hidden-section]");
    if (sectionToggle) {
      const id = sectionToggle.dataset.hiddenSection;
      const hidden = state.draft.content.hiddenSections || [];
      state.draft.content.hiddenSections = sectionToggle.checked ? hidden.filter(item => item !== id) : [...new Set([...hidden, id])];
      saveDraft();
      render();
      return;
    }
    const printStage = event.target.closest("[data-print-stage]");
    if (printStage) {
      const stage = printStage.dataset.printStage;
      state.print.stages = printStage.checked ? [...new Set([...state.print.stages, stage])] : state.print.stages.filter(item => item !== stage);
      if (!state.print.stages.length) state.print.stages = [state.activeScaffold?.stage || "sprout"];
      render();
      return;
    }
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
      if (["year", "subject", "topic", "objective"].includes(key)) {
        state.draft.analysis = [];
        state.draft.recommendations = [];
        state.draft.engineId = "";
        state.draft.familyId = "";
        state.draft.representation = "";
      }
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
      applySettings();
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
  window.addEventListener("pagehide", () => { if (state.aiWorkspace) saveAIWorkspace(); saveDraft(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { if (state.aiWorkspace) saveAIWorkspace(); saveDraft(); } });

  applySettings();
  hydrateIcons(document);
  render();
})();
