(function () {
  "use strict";

  const DATA = window.SCAFFOLD_DATA;
  const RESOURCE = window.ScaffoldResourceEngine;
  const VERIFY = window.ScaffoldVerificationEngine;
  const AI = window.ScaffoldAICompanion;
  const PERSISTENCE = window.ScaffoldPersistence;
  const startupRecovery = [];
  const STORAGE = {
    library: "scaffold-seeds.library.v1",
    settings: "scaffold-seeds.settings.v1",
    reflections: "scaffold-seeds.reflections.v1",
    draft: "scaffold-seeds.draft.v1",
    archives: "scaffold-seeds.archives.v3",
    preferences: "scaffold-seeds.preferences.v3",
    aiWorkspace: "scaffold-seeds.ai-workspace.v4",
    schema: "scaffold-seeds.schema.v5"
  };

  const defaultSettings = {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    defaultPaper: "a4",
    defaultColour: "full-colour",
    defaultStage: "sprout",
    interfaceScale: "standard",
    preferredDensity: "calm",
    typicalYear: "Year 4",
    favouriteSubjects: ["english", "mathematics"],
    includeTeacherGuidance: true,
    defaultGrowthStages: ["sprout"],
    lineThickness: "standard",
    pageNumbers: true,
    schoolLabel: "",
    classLabel: "",
    terminology: "pupils",
    aiPromptDepth: "professional",
    aiIncludeResponseHistory: true
  };

  function normalisePrintMode(value) {
    const aliased = DATA.build5?.printModeAliases?.[value] || value;
    return DATA.build5?.printModes?.some(mode => mode.id === aliased) ? aliased : "full-colour";
  }

  function normaliseSettings(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const settings = { ...defaultSettings, ...source };
    settings.defaultPaper = ["a4", "a5"].includes(settings.defaultPaper) ? settings.defaultPaper : "a4";
    settings.defaultColour = normalisePrintMode(settings.defaultColour);
    settings.defaultStage = DATA.stages.some(stage => stage.id === settings.defaultStage) ? settings.defaultStage : "sprout";
    settings.typicalYear = DATA.years.includes(settings.typicalYear) ? settings.typicalYear : "Year 4";
    settings.preferredDensity = DATA.build3.densityModes.includes(settings.preferredDensity) ? settings.preferredDensity : "calm";
    settings.lineThickness = ["standard", "strong"].includes(settings.lineThickness) ? settings.lineThickness : "standard";
    settings.terminology = ["pupils", "children", "learners"].includes(settings.terminology) ? settings.terminology : "pupils";
    settings.aiPromptDepth = DATA.ai.promptDepths.some(depth => depth.id === settings.aiPromptDepth) ? settings.aiPromptDepth : "professional";
    settings.defaultGrowthStages = Array.isArray(settings.defaultGrowthStages) ? settings.defaultGrowthStages.filter(id => DATA.stages.some(stage => stage.id === id)) : ["sprout"];
    if (!settings.defaultGrowthStages.length) settings.defaultGrowthStages = ["sprout"];
    settings.favouriteSubjects = Array.isArray(settings.favouriteSubjects) ? settings.favouriteSubjects.filter(id => DATA.subjects.some(subject => subject.id === id)) : ["english", "mathematics"];
    ["highContrast", "largeText", "reduceMotion", "includeTeacherGuidance", "pageNumbers", "aiIncludeResponseHistory"].forEach(key => { settings[key] = Boolean(settings[key]); });
    settings.schoolLabel = String(settings.schoolLabel || "").slice(0, 120);
    settings.classLabel = String(settings.classLabel || "").slice(0, 120);
    return settings;
  }

  function normaliseLocalImage(raw) {
    if (!raw || typeof raw !== "object") return null;
    const dataUrl = String(raw.dataUrl || "");
    if (dataUrl.length > 3600000 || !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(dataUrl)) return null;
    const rotation = [0, 90, 180, 270].includes(Number(raw.rotation)) ? Number(raw.rotation) : 0;
    return {
      ...raw,
      id: String(raw.id || uid()).slice(0, 100),
      name: String(raw.name || "Local image").slice(0, 120),
      type: ["image/png", "image/jpeg", "image/webp"].includes(raw.type) ? raw.type : "image/png",
      bytes: Math.max(0, Math.min(2500000, Number(raw.bytes) || 0)),
      dataUrl,
      width: Math.max(0, Math.min(20000, Number(raw.width) || 0)),
      height: Math.max(0, Math.min(20000, Number(raw.height) || 0)),
      rotation,
      fit: ["contain", "cover"].includes(raw.fit) ? raw.fit : "contain",
      caption: String(raw.caption || "").slice(0, 500),
      alt: String(raw.alt || "").slice(0, 500),
      greyscale: Boolean(raw.greyscale),
      storedLocally: true
    };
  }

  function safeAIWorkspace(scaffold, saved) {
    const workspace = AI.createWorkspace(scaffold || {}, saved && typeof saved === "object" ? saved : null);
    workspace.rawImport = String(workspace.rawImport || "").slice(0, 65000);
    if (workspace.parsed?.raw) workspace.parsed.raw = String(workspace.parsed.raw).slice(0, 65000);
    workspace.image = normaliseLocalImage(workspace.image);
    return workspace;
  }

  const state = {
    view: "home",
    createStep: 0,
    library: migrateLibrary(readStore(STORAGE.library, [])),
    settings: normaliseSettings(readStore(STORAGE.settings, {})),
    reflections: readStore(STORAGE.reflections, {}),
    archives: readStore(STORAGE.archives, []),
    preferences: readStore(STORAGE.preferences, { largerWritingArea: false, questionPrompts: false, printMode: "" }),
    draft: normaliseDraft(readStore(STORAGE.draft, null)),
    activeScaffold: null,
    libraryFilters: { query: "", year: "all", subject: "all", family: "all", format: "all", stage: "all", aiStatus: "all", source: "all", favourite: false, archived: false, sort: "edited" },
    librarySelection: [],
    libraryVisible: 60,
    knowledgeSubject: "english",
    knowledgeProfile: "reading",
    knowledgeLens: "ideas",
    print: {
      paper: "a4",
      orientation: "portrait",
      colour: "full-colour",
      format: "workpage",
      teacherGuidance: true,
      largePrint: false,
      cropMarks: false,
      cutLines: true,
      arrangement: "single",
      stages: ["sprout"]
    },
    saveStatus: "saved",
    compareStages: false,
    aiWorkspace: readStore(STORAGE.aiWorkspace, null),
    aiTaskFamily: "generate",
    pendingImport: null,
    recoveryNoticeDismissed: false
  };

  state.print.paper = state.settings.defaultPaper;
  state.print.colour = state.settings.defaultColour;
  state.print.teacherGuidance = state.settings.includeTeacherGuidance;
  state.print.stages = [...state.settings.defaultGrowthStages];
  if (!state.activeScaffold && state.library.length) state.activeScaffold = state.library[0];
  const activeWorkspaceKey = state.activeScaffold?.id ? `${STORAGE.aiWorkspace}.${state.activeScaffold.id}` : STORAGE.aiWorkspace;
  const activeWorkspaceSaved = readStore(activeWorkspaceKey, null) || ([4, 5].includes(state.aiWorkspace?.schemaVersion) ? state.aiWorkspace : null);
  state.aiWorkspace = safeAIWorkspace(state.activeScaffold || {}, activeWorkspaceSaved);

  const main = document.getElementById("main-content");
  const modalLayer = document.getElementById("modal-layer");
  const toastRegion = document.getElementById("toast-region");
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("sidebar-scrim");
  const appShell = document.querySelector(".app-shell");
  const menuButton = document.getElementById("menu-button");
  let modalReturnFocus = null;
  try { localStorage.setItem(STORAGE.schema, JSON.stringify({ version: 5, migratedAt: new Date().toISOString(), previousLibraryKey: STORAGE.library })); } catch (error) { /* Storage status is surfaced on the first attempted save. */ }

  const viewMeta = {
    home: ["Remove the barrier · preserve the thinking", "Scaffold Seeds"],
    create: ["Four clear decisions", "New scaffold"],
    library: ["Saved on this device", "Library"],
    knowledge: ["Used inside every recommendation", "Curriculum reference"],
    ai: ["Optional external contribution", "AI review"],
    print: ["Classroom-ready output", "Print"],
    settings: ["Occasional controls", "Preferences & backup"]
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
    const subjects = new Set(DATA.subjects.map(item => item.id));
    const years = new Set(DATA.years);
    const engines = new Set(DATA.engines.map(item => item.id));
    const stages = new Set(DATA.stages.map(item => item.id));
    const formats = new Set(DATA.printFormats.map(item => item.id));
    const migrated = [];
    items.forEach((item, index) => {
      if (!item || typeof item !== "object" || !subjects.has(item.subject) || typeof item.title !== "string") {
        startupRecovery.push(`Library record ${index + 1} was quarantined because its title or subject was invalid.`);
        return;
      }
      const ai = item.ai && typeof item.ai === "object" ? {
        ...item.ai,
        schemaVersion: 5,
        rounds: Array.isArray(item.ai.rounds) ? item.ai.rounds.filter(round => round && typeof round === "object").slice(0, 20) : [],
        provenance: Array.isArray(item.ai.provenance) ? item.ai.provenance.filter(record => record && typeof record === "object").slice(0, 100) : [],
        lastVerification: item.ai.lastVerification && typeof item.ai.lastVerification === "object" ? item.ai.lastVerification : null
      } : null;
      const reflectionHistory = Array.isArray(item.reflections) ? item.reflections : item.reflection && typeof item.reflection === "object" ? [item.reflection] : [];
      migrated.push({
        ...item,
        id: typeof item.id === "string" && item.id ? item.id : uid(),
        title: item.title.trim().slice(0, 140) || "Untitled scaffold",
        year: years.has(item.year) ? item.year : "Year 4",
        objective: String(item.objective || "").slice(0, 500),
        topic: String(item.topic || "Curriculum focus").slice(0, 180),
        engineId: engines.has(item.engineId) ? item.engineId : DATA.engines.find(engine => engine.subjects.includes(item.subject) || engine.subjects.includes("all"))?.id || DATA.engines[0].id,
        stage: stages.has(item.stage) ? item.stage : "sprout",
        format: formats.has(item.format) ? item.format : "workpage",
        barriers: Array.isArray(item.barriers) ? item.barriers.filter(id => DATA.barriers.some(barrier => barrier.id === id)).slice(0, 6) : [],
        tags: Array.isArray(item.tags) ? item.tags.map(String).slice(0, 8) : [],
        growthStages: Array.isArray(item.growthStages) ? item.growthStages.filter(id => stages.has(id)) : DATA.stages.map(stage => stage.id),
        content: item.content && typeof item.content === "object" ? item.content : {},
        diagram: item.diagram && typeof item.diagram === "object" ? item.diagram : { type: "", labels: [], values: [] },
        versions: Array.isArray(item.versions) ? item.versions.filter(version => version && typeof version === "object" && version.snapshot && typeof version.snapshot === "object").slice(0, 20) : [],
        reflections: reflectionHistory.filter(reflection => reflection && typeof reflection === "object").slice(0, 30),
        reflection: reflectionHistory.find(reflection => reflection && typeof reflection === "object") || null,
        sources: Array.isArray(item.sources) ? item.sources.filter(source => source && typeof source === "object").slice(0, 100) : [],
        assets: Array.isArray(item.assets) ? item.assets.filter(asset => asset && typeof asset === "object").slice(0, 30) : [],
        ai,
        schemaVersion: 5,
        revision: Number.isInteger(item.revision) && item.revision > 0 ? item.revision : 1
      });
    });
    return migrated;
  }

  let aiSaveTimer = null;
  let librarySearchTimer = null;
  const failedStores = new Set();
  let durableSaveTimer = null;
  let durableGeneration = 0;
  let durableReady = false;
  let durableCommitInFlight = false;
  let suppressDurable = false;

  function saveAIWorkspace() {
    if (aiSaveTimer) clearTimeout(aiSaveTimer);
    aiSaveTimer = null;
    state.aiWorkspace.lastSavedAt = new Date().toISOString();
    if (state.aiWorkspace.resourceId) {
      writeStore(`${STORAGE.aiWorkspace}.${state.aiWorkspace.resourceId}`, state.aiWorkspace);
      writeStore(STORAGE.aiWorkspace, { schemaVersion: 5, resourceId: state.aiWorkspace.resourceId, lastSavedAt: state.aiWorkspace.lastSavedAt });
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
    state.aiWorkspace = safeAIWorkspace(scaffold || {});
    state.aiTaskFamily = AI.taskById(state.aiWorkspace.options.taskId).family;
    saveAIWorkspace();
  }

  function readStore(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) sessionStorage.setItem(`scaffold-seeds.corrupt.${Date.now()}`, JSON.stringify({ key, raw: raw.slice(0, 250000), capturedAt: new Date().toISOString() }));
      } catch (recoveryError) { /* The in-memory fallback remains available. */ }
      startupRecovery.push(`${key.replace("scaffold-seeds.", "")} could not be read and was isolated rather than erased.`);
      return fallback;
    }
  }

  function writeStore(key, value) {
    try {
      setSaveStatus("saving");
      localStorage.setItem(key, JSON.stringify(value));
      failedStores.delete(key);
      setSaveStatus(failedStores.size ? "issue" : "saved");
      scheduleDurableCommit();
      return true;
    } catch (error) {
      failedStores.add(key);
      setSaveStatus("issue");
      toast("Browser storage is unavailable. Your changes remain in this session.");
      return false;
    }
  }

  function durableBundle() {
    let aiWorkspaces = {};
    try { aiWorkspaces = storedAIWorkspaces(state.settings.aiIncludeResponseHistory); } catch (error) { /* The active workspace is still included below. */ }
    if (state.aiWorkspace?.resourceId) aiWorkspaces[state.aiWorkspace.resourceId] = safeAIWorkspace(state.activeScaffold || {}, state.aiWorkspace);
    return {
      product: "Scaffold Seeds",
      schemaVersion: 5,
      exportedAt: new Date().toISOString(),
      library: state.library,
      settings: normaliseSettings(state.settings),
      reflections: state.reflections,
      preferences: state.preferences,
      draft: state.draft,
      aiWorkspaces,
      metadata: { source: "Scaffold Seeds local application" }
    };
  }

  function scheduleDurableCommit() {
    if (!PERSISTENCE || !durableReady || suppressDurable) return;
    clearTimeout(durableSaveTimer);
    setSaveStatus("saving");
    durableSaveTimer = setTimeout(commitDurableSnapshot, 420);
  }

  async function commitDurableSnapshot() {
    if (!PERSISTENCE || !durableReady || durableCommitInFlight) return;
    durableCommitInFlight = true;
    try {
      const result = await PERSISTENCE.commitSnapshot(durableBundle(), { expectedGeneration: durableGeneration, createRecovery: false });
      durableGeneration = Number(result.snapshot?.metadata?.generation || durableGeneration + 1);
      failedStores.delete("durable");
      setSaveStatus(failedStores.size ? "issue" : "saved");
    } catch (error) {
      failedStores.add("durable");
      setSaveStatus("issue");
      if (error?.name === "ConflictError" || error?.code === "REVISION_CONFLICT") toast("This library changed in another tab. Reload before saving more changes, or export a recovery copy.");
      else toast("The durable save did not complete. Your current tab still holds the changes; export a recovery copy if the issue continues.");
    } finally {
      durableCommitInFlight = false;
    }
  }

  function newestLibraryTime(items) {
    return Math.max(0, ...(items || []).map(item => Date.parse(item.updatedAt || item.createdAt || 0) || 0));
  }

  function cacheSnapshot(snapshot) {
    suppressDurable = true;
    try {
      state.library = migrateLibrary(snapshot.library || []);
      state.settings = normaliseSettings(snapshot.settings || {});
      state.reflections = snapshot.reflections && typeof snapshot.reflections === "object" ? snapshot.reflections : {};
      state.preferences = snapshot.preferences && typeof snapshot.preferences === "object" ? snapshot.preferences : {};
      state.draft = normaliseDraft(snapshot.draft);
      state.activeScaffold = state.library.find(item => item.id === state.activeScaffold?.id) || state.library[0] || null;
      const savedWorkspace = state.activeScaffold?.id ? snapshot.aiWorkspaces?.[state.activeScaffold.id] : null;
      state.aiWorkspace = safeAIWorkspace(state.activeScaffold || {}, savedWorkspace);
      localStorage.setItem(STORAGE.library, JSON.stringify(state.library));
      localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
      localStorage.setItem(STORAGE.reflections, JSON.stringify(state.reflections));
      localStorage.setItem(STORAGE.preferences, JSON.stringify(state.preferences));
      localStorage.setItem(STORAGE.draft, JSON.stringify(state.draft));
      Object.entries(snapshot.aiWorkspaces || {}).forEach(([id, workspace]) => localStorage.setItem(`${STORAGE.aiWorkspace}.${id}`, JSON.stringify(workspace)));
      applySettings();
    } finally {
      suppressDurable = false;
    }
  }

  async function initialisePersistence() {
    if (!PERSISTENCE) return;
    try {
      const capabilities = await PERSISTENCE.open();
      const snapshot = await PERSISTENCE.getSnapshot();
      durableGeneration = Number(snapshot.metadata?.generation || 0);
      const localChecksum = PERSISTENCE.canonicalChecksumSync(state.library);
      const durableChecksum = PERSISTENCE.canonicalChecksumSync(snapshot.library || []);
      if (durableChecksum !== localChecksum && snapshot.library?.length && newestLibraryTime(snapshot.library) >= newestLibraryTime(state.library)) {
        cacheSnapshot(snapshot);
        startupRecovery.push("A newer durable library snapshot was restored after this page opened.");
        render();
      }
      durableReady = true;
      if (durableChecksum !== PERSISTENCE.canonicalChecksumSync(state.library) || durableGeneration === 0) await commitDurableSnapshot();
      PERSISTENCE.subscribe(event => {
        if (durableCommitInFlight || !event?.type || event.type === "recovery-created") return;
        startupRecovery.push("Another Scaffold Seeds tab changed local data. Reload before editing the same resource; no automatic overwrite was made.");
        state.recoveryNoticeDismissed = false;
        if (state.view !== "create" || !state.draft.editingId) render();
      });
      if (!capabilities.persistent) startupRecovery.push("Durable browser storage is unavailable in this browsing mode. Export a backup before leaving.");
    } catch (error) {
      failedStores.add("durable");
      setSaveStatus("issue");
      startupRecovery.push("Durable storage could not be opened. The local cache remains available for recovery and export.");
      render();
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
    return writeStore(STORAGE.draft, state.draft);
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
    const entry = currentEntry(draft);
    const profile = brain.profiles.find(item => item.id === entry?.profileId) || profileForDraft(draft);
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
    if (!Number.isFinite(date.getTime())) return "Unknown date";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function relativeDate(dateValue) {
    const time = new Date(dateValue).getTime();
    if (!Number.isFinite(time)) return "Unknown date";
    const days = Math.floor((Date.now() - time) / 86400000);
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
    closeSidebar(false);
    if (options.focus !== false) main.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: state.settings.reduceMotion ? "auto" : "smooth" });
  }

  function render() {
    const renderers = { home: renderHome, create: renderCreate, library: renderLibrary, knowledge: renderKnowledge, ai: renderAIStudio, print: renderPrintStudio, settings: renderSettings };
    const recovery = startupRecovery.length && !state.recoveryNoticeDismissed ? `<aside class="recovery-banner" role="status"><div><strong>Recovery notice</strong><p>${esc(startupRecovery[0])}${startupRecovery.length > 1 ? ` ${startupRecovery.length - 1} other record${startupRecovery.length === 2 ? "" : "s"} also need review.` : ""}</p></div><button class="button button-compact" data-action="dismiss-recovery">Dismiss</button></aside>` : "";
    main.innerHTML = `${recovery}<div class="view-enter">${renderers[state.view]()}</div>`;
    hydrateIcons(main);
    main.querySelectorAll('[role="tablist"]').forEach(list => {
      const tabs = [...list.querySelectorAll('[role="tab"]')];
      tabs.forEach((tab, index) => { tab.tabIndex = tab.getAttribute("aria-selected") === "true" || (!tabs.some(item => item.getAttribute("aria-selected") === "true") && index === 0) ? 0 : -1; });
    });
  }

  function openSidebar() {
    sidebar.classList.add("is-open");
    scrim.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Close navigation");
    requestAnimationFrame(() => sidebar.querySelector(".nav-item.is-active, .nav-item")?.focus());
  }

  function closeSidebar(restoreFocus = true) {
    const wasOpen = sidebar.classList.contains("is-open");
    sidebar.classList.remove("is-open");
    scrim.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open navigation");
    if (wasOpen && restoreFocus) menuButton.focus();
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
    const recent = [...state.library]
      .filter(item => !item.archived)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 3);
    const recentHTML = recent.length
      ? `<div class="recent-list">${recent.map(item => `
          <button class="recent-row" data-action="open-scaffold" data-id="${esc(item.id)}">
            <span class="recent-symbol">${icon("create")}</span>
            <span><h4>${esc(item.title)}</h4><p>${esc(item.year)} · ${esc(subjectById(item.subject).name)} · ${esc(engineById(item.engineId).name)}</p></span>
            <span class="recent-meta"><span class="quiet-note">${relativeDate(item.updatedAt)}</span>${icon("arrow")}</span>
          </button>`).join("")}</div>`
      : `<div class="empty-help"><h4>Your first scaffold starts with one observation</h4><p>Describe what pupils can do and the exact point where independent success ends.</p><button class="button button-primary" data-action="new-scaffold">Create your first scaffold</button></div>`;

    return `
      <section class="hero hero-reduced" aria-labelledby="home-heading">
        <div class="hero-copy">
          <span class="eyebrow">Temporary support · lasting independence</span>
          <h2 id="home-heading">Where are pupils <br><em>getting stuck?</em></h2>
          <p>Scaffold Seeds finds the smallest useful support, protects the thinking and plans how that support will disappear.</p>
          <button class="button button-primary home-primary" data-action="new-scaffold"><span data-icon="create"></span> Create a scaffold</button>
        </div>
        <div class="hero-principle" aria-label="Scaffold Seeds principle">
          <span>01</span><p>Notice the barrier.</p>
          <span>02</span><p>Preserve the thinking.</p>
          <span>03</span><p>Remove the support.</p>
        </div>
      </section>
      <section class="home-recent panel panel-pad">
        <div class="panel-header"><div><h3>Continue where you left off</h3><p>${recent.length ? "Your three most recent scaffolds" : "Nothing to organise yet"}</p></div>${recent.length ? '<button class="text-link" data-view="library">View library</button>' : ""}</div>
        ${recentHTML}
      </section>`;
  }
  function renderCreate() {
    const stepNames = ["Need", "Support", "Shape", "Use"];
    const content = [renderBriefStep, renderSupportDecisionStep, renderDesignStep, renderReviewStep][state.createStep]();
    const summary = state.draft.objective
      ? `<div class="context-summary"><span>${esc(state.draft.year)} · ${esc(subjectById(state.draft.subject).name)}</span><p>${esc(state.draft.objective)}</p></div>`
      : "";
    return `
      <div class="create-layout ${state.createStep >= 2 ? "is-review" : ""}">
        <section class="create-card" aria-label="Scaffold creation step ${state.createStep + 1} of 4">${content}</section>
        <aside class="create-rail">
          <div class="progress-card"><div class="step-list">
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

  function renderBriefStep() {
    const entries = curriculumEntries();
    if (!entries.some(entry => entry.title === state.draft.topic)) {
      state.draft.topic = entries[0]?.title || "";
      state.draft.objective = entries[0]?.objectives[0] || "";
    }
    const entry = currentEntry();
    if (entry && !state.draft.objective.trim()) state.draft.objective = entry.objectives[0];
    const intelligence = curriculumIntelligence();
    const frameworkNote = state.draft.subject === "religious-education"
      ? "Use the objective wording from your locally applicable RE syllabus."
      : state.draft.subject === "pshe"
        ? "Check the objective against school policy and current statutory guidance."
        : "Use the lesson wording pupils will encounter.";

    return `${createHead(1, "What is the learning—and where does it break down?", "One precise observation is enough. Scaffold Seeds will do the sorting.")}
      <div class="create-card-body brief-step">
        <div class="form-grid context-fields">
          <div class="form-field"><label for="year">Year group</label><div class="select-wrap"><select id="year" data-draft-field="year">${DATA.years.map(year => `<option ${year === state.draft.year ? "selected" : ""}>${esc(year)}</option>`).join("")}</select></div></div>
          <div class="form-field"><label for="subject">Subject</label><div class="select-wrap"><select id="subject" data-draft-field="subject">${DATA.subjects.map(subject => `<option value="${subject.id}" ${subject.id === state.draft.subject ? "selected" : ""}>${esc(subject.name)}</option>`).join("")}</select></div></div>
          <div class="form-field"><label for="topic">Curriculum area</label><div class="select-wrap"><select id="topic" data-draft-field="topic">${entries.map(item => `<option ${item.title === state.draft.topic ? "selected" : ""}>${esc(item.title)}</option>`).join("")}</select></div></div>
          <div class="form-field"><label for="phase">Lesson moment</label><div class="select-wrap"><select id="phase" data-draft-field="phase">${DATA.lessonPhases.map(phase => `<option ${phase === state.draft.phase ? "selected" : ""}>${esc(phase)}</option>`).join("")}</select></div></div>
          <div class="form-field span-2"><label for="objective">Learning objective</label><input class="input" id="objective" list="objective-suggestions" data-draft-field="objective" value="${esc(state.draft.objective)}"><datalist id="objective-suggestions">${(entry?.objectives || []).map(objective => `<option value="${esc(objective)}"></option>`).join("")}</datalist><span class="field-hint">${esc(frameworkNote)}</span></div>
        </div>
        <div class="need-divider" aria-hidden="true"></div>
        <div class="form-field need-field"><label for="situation">Where does independent success stop?</label><textarea id="situation" class="situation-field" data-draft-field="situation" maxlength="800" placeholder="They can… but when they need to…">${esc(state.draft.situation)}</textarea><span class="field-hint">Start with what pupils can already do. Then name the precise breakdown.</span></div>
        <details class="inline-reference">
          <summary>Curriculum lens · ${esc(intelligence.profile.name)}</summary>
          <div><p><strong>Protect:</strong> ${esc(intelligence.profile.threshold)}</p><p><strong>Listen for:</strong> ${esc(intelligence.misconceptions[0])}</p><p><strong>Useful language:</strong> ${esc(intelligence.vocabulary.slice(0, 5).join(" · "))}</p></div>
        </details>
      </div>
      ${stepFooter({ back: false, nextLabel: "Find the smallest support", nextAction: "analyse-barrier" })}`;
  }

  function protectedThinkingStatement(draft = state.draft) {
    const profile = profileForDraft(draft);
    const release = subjectById(draft.subject).release;
    const protectedMove = release?.protect || `the central ${profile.name.toLowerCase()} decision`;
    const objective = String(draft.objective || "the intended learning").replace(/[.!?]+$/, "");
    return `Pupils must still own ${protectedMove} while working towards “${objective}”.`;
  }

  function renderSupportDecisionStep() {
    if (!state.draft.analysis.length) analyseBarrier();
    if (!state.draft.essentialThinking) state.draft.essentialThinking = protectedThinkingStatement();
    if (!state.draft.recommendations.length) updateRecommendations();
    const intelligence = curriculumIntelligence();
    const barrierOptions = state.draft.analysis.slice(0, 3);
    const selected = state.draft.selectedBarriers;
    const engine = engineById(state.draft.engineId || state.draft.recommendations[0]);
    const alternatives = state.draft.recommendations.filter(id => id !== engine.id).map(engineById);
    const representation = intelligence.representations[0];
    const practiceMemory = similarReflection();

    return `${createHead(2, "Use the smallest support that fits", "The best match is selected. Change it only when your classroom knowledge says otherwise.")}
      <div class="create-card-body decision-step">
        <section class="decision-block">
          <div class="decision-label"><span>Barrier</span><small>Best local match</small></div>
          <div class="barrier-choice-row">${barrierOptions.map((result, index) => {
            const barrier = barrierById(result.id);
            return `<button class="barrier-choice ${selected.includes(result.id) ? "is-selected" : ""}" data-action="toggle-barrier" data-id="${result.id}" aria-pressed="${selected.includes(result.id)}"><span>${index + 1}</span><strong>${esc(barrier.name)}</strong><small>${esc(result.reason)}</small></button>`;
          }).join("")}</div>
          <button class="text-link" data-action="show-all-barriers">Choose a different barrier</button>
        </section>

        <section class="protected-thinking-card compact-protection">
          <span class="eyebrow">The thinking stays with pupils</span>
          <blockquote>${esc(state.draft.essentialThinking)}</blockquote>
          <details><summary>Edit this sentence</summary><textarea data-draft-field="essentialThinking" rows="2">${esc(state.draft.essentialThinking)}</textarea></details>
        </section>

        <section class="decision-block">
          <div class="decision-label"><span>Support</span><small>Recommended from the barrier, subject and lesson moment</small></div>
          <button class="support-choice-primary is-selected" data-action="choose-engine" data-id="${engine.id}" aria-pressed="true">
            <span class="support-mark">${icon("create")}</span>
            <span><small>${esc(familyById(engine.family).name)}</small><strong>${esc(engine.name)}</strong><p>${esc(engine.tagline)}</p></span>
            <span class="support-give-leave"><small><b>Gives</b> ${esc(engine.bestFor || engine.tagline)}</small><small><b>Leaves</b> ${esc(engine.preserves)}</small><small><b>Remove first</b> ${esc(engine.release?.removeFirst || RESOURCE.nextFade({ ...scaffoldFromDraft(), engineId: engine.id }))}</small></span>
          </button>
          <details class="alternative-supports">
            <summary>Two other good fits</summary>
            <div>${alternatives.map(item => `<button data-action="choose-engine" data-id="${item.id}"><strong>${esc(item.name)}</strong><small>${esc(item.tagline)}</small></button>`).join("")}</div>
            <button class="text-link" data-action="show-all-engines">Browse all support types</button>
          </details>
        </section>

        ${practiceMemory ? `<aside class="practice-memory compact-memory"><strong>Last time: ${esc(practiceMemory.item.title)}</strong><p>${esc(practiceMemory.reflection.whatWorked || practiceMemory.reflection.supportRemoved || practiceMemory.reflection.reduceNext || "A classroom reflection was recorded.")}</p></aside>` : ""}
        <details class="inline-reference">
          <summary>Why this recommendation?</summary>
          <div><p><strong>Subject move:</strong> ${esc(intelligence.profile.disciplinary)}</p><p><strong>Representation:</strong> ${esc(representation ? `${representation.name} — useful ${representation.use}` : "No extra representation is required.")}</p><p><strong>Watch for:</strong> ${esc(engine.risk || intelligence.misconceptions[0])}</p></div>
        </details>
      </div>
      ${stepFooter({ nextLabel: "Shape this scaffold" })}`;
  }
  function renderDiagramValueControls(type) {
    if (!type) return "";
    const diagram = state.draft.diagram || {};
    const values = `<div class="form-field"><label for="diagram-values">Diagram values <small>— comma separated; used for deterministic checks</small></label><input id="diagram-values" class="input" inputmode="decimal" data-diagram-field="values" data-list-mode="numbers" value="${esc((diagram.values || []).join(", "))}"></div>`;
    if (["number-line", "timeline", "part-whole", "bar-model"].includes(type)) {
      const total = type === "bar-model" ? `<div class="form-field"><label for="diagram-total">Stated whole <small>— optional check</small></label><input id="diagram-total" class="input" inputmode="decimal" data-diagram-field="total" value="${esc(diagram.total ?? "")}"></div>` : "";
      return `${values}${total}<p class="diagram-check-note">${type === "timeline" ? "Supplied values create proportional spacing; without them the timeline is marked schematic." : "When values are supplied, Scaffold Seeds checks the numerical relationship rather than only the shape."}</p>`;
    }
    if (type === "fraction-strip") return `<div class="form-grid compact-fields"><div class="form-field"><label for="diagram-parts">Equal parts</label><input id="diagram-parts" class="input" type="number" min="2" max="24" data-diagram-field="parts" value="${esc(diagram.parts || 4)}"></div><div class="form-field"><label for="diagram-numerator">Shaded parts</label><input id="diagram-numerator" class="input" type="number" min="0" max="24" data-diagram-field="numerator" value="${esc(diagram.numerator ?? 0)}"></div></div>`;
    if (type === "array") return `<div class="form-grid compact-fields"><div class="form-field"><label for="diagram-rows">Rows</label><input id="diagram-rows" class="input" type="number" min="1" max="12" data-diagram-field="rows" value="${esc(diagram.rows || 3)}"></div><div class="form-field"><label for="diagram-columns">Columns</label><input id="diagram-columns" class="input" type="number" min="1" max="12" data-diagram-field="columns" value="${esc(diagram.columns || 5)}"></div><div class="form-field"><label for="diagram-total">Stated total <small>— optional check</small></label><input id="diagram-total" class="input" inputmode="numeric" data-diagram-field="total" value="${esc(diagram.total ?? "")}"></div></div>`;
    return `<p class="diagram-check-note">This diagram is checked for structure and label length. Subject accuracy still requires teacher review.</p>`;
  }

  function renderDesignStep() {
    const engine = engineById(state.draft.engineId);
    const entry = currentEntry();
    const intelligence = curriculumIntelligence();
    const vocabulary = state.draft.vocabulary || intelligence.vocabulary.slice(0, 6).join(", ") || entry?.vocabulary.join(", ") || "";
    if (!state.draft.title) state.draft.title = `${state.draft.topic}: ${engine.name}`;
    if (!state.draft.vocabulary) state.draft.vocabulary = vocabulary;
    if (!state.draft.misconception) state.draft.misconception = intelligence.misconceptions[0] || "";
    if (!state.draft.familyId) state.draft.familyId = engine.family;
    if (!state.draft.representation) state.draft.representation = intelligence.representations[0]?.name || "";
    if (!state.draft.essentialThinking) state.draft.essentialThinking = protectedThinkingStatement();

    const generated = RESOURCE.normalise(scaffoldFromDraft());
    const currentContent = state.draft.content || {};
    if (!currentContent.instruction) {
      state.draft.content = {
        ...generated.content,
        ...currentContent,
        instruction: generated.content.instruction,
        prompts: currentContent.prompts?.length ? currentContent.prompts : generated.content.prompts,
        coreTask: currentContent.coreTask || generated.content.coreTask,
        vocabulary: currentContent.vocabulary?.length ? currentContent.vocabulary : generated.content.vocabulary,
        example: currentContent.example || generated.content.example,
        subInstruction: currentContent.subInstruction || generated.content.subInstruction,
        misconception: currentContent.misconception || generated.content.misconception,
        oralPrompt: currentContent.oralPrompt || generated.content.oralPrompt,
        checkPrompt: currentContent.checkPrompt || generated.content.checkPrompt,
        independencePrompt: currentContent.independencePrompt || generated.content.independencePrompt,
        diagramType: currentContent.diagramType || engine.diagram || ""
      };
    }

    const activeStage = DATA.stages.find(stage => stage.id === state.draft.stage) || DATA.stages[1];
    const nextStage = DATA.stages[DATA.stages.findIndex(stage => stage.id === state.draft.stage) + 1];
    const scaffold = { ...scaffoldFromDraft(), content: state.draft.content, diagram: { ...state.draft.diagram, type: state.draft.content.diagramType, labels: state.draft.content.diagramLabels } };
    const diagramTypes = ["", "number-line", "part-whole", "place-value", "array", "bar-model", "fraction-strip", "timeline", "causal-chain", "flowchart", "classification-tree", "concept-map", "cycle"];
    const hidden = state.draft.content.hiddenSections || [];

    return `${createHead(3, "Shape the resource", `${engine.name} is already built. Edit only what tomorrow's pupils need.`)}
      <div class="create-card-body designer-shell">
        <div class="designer-toolbar"><span class="toolbar-label">Support now</span><div class="compact-stage-path">${DATA.stages.map(stage => `<button class="${stage.id === state.draft.stage ? "is-active" : ""}" data-action="choose-stage" data-id="${stage.id}"><span>${stage.glyph}</span>${esc(stage.name)}</button>`).join("")}</div></div>
        <div class="live-designer-grid">
          <aside class="designer-controls" aria-label="Resource controls">
            <div class="design-identity" style="--subject-colour:${intelligence.subject.colour}"><div><span class="eyebrow">${esc(familyById(engine.family).name)}</span><h3>${esc(engine.name)}</h3></div><p>${esc(engine.preserves)}</p></div>
            <details open><summary>Essentials</summary><div class="designer-control-body">
              <div class="form-field"><label for="scaffold-title">Title</label><input class="input" id="scaffold-title" data-draft-field="title" value="${esc(state.draft.title)}"></div>
              <div class="form-field"><label for="content-instruction">Pupil instruction</label><textarea id="content-instruction" data-content-field="instruction" rows="2">${esc(state.draft.content.instruction)}</textarea></div>
              <div class="form-field"><label for="content-prompts">Prompts <small>— one per line</small></label><textarea id="content-prompts" data-content-field="prompts" data-list-mode="lines" rows="5">${esc((state.draft.content.prompts || []).join("\n"))}</textarea></div>
              <div class="form-field protected-core-field"><label for="content-core-task">Protected pupil decision</label><textarea id="content-core-task" data-content-field="coreTask" rows="2">${esc(state.draft.content.coreTask || RESOURCE.coreTaskFor(scaffold))}</textarea></div>
              <div class="form-field"><label for="content-vocabulary">Vocabulary</label><textarea id="content-vocabulary" data-content-field="vocabulary" data-list-mode="commas" rows="2">${esc((state.draft.content.vocabulary || []).join(", "))}</textarea></div>
            </div></details>
            <details><summary>Example &amp; access</summary><div class="designer-control-body">
              <div class="form-field"><label for="content-example">Example or partial example</label><textarea id="content-example" data-content-field="example" rows="3">${esc(state.draft.content.example)}</textarea></div>
              <div class="form-field"><label>Response</label><select data-content-field="responseSpace"><option value="standard" ${state.draft.content.responseSpace === "standard" ? "selected" : ""}>Standard writing space</option><option value="large" ${state.draft.content.responseSpace === "large" ? "selected" : ""}>Larger writing space</option><option value="oral" ${state.draft.content.responseSpace === "oral" ? "selected" : ""}>Oral response</option></select></div>
              <label class="check-row"><input type="checkbox" data-content-toggle="oralRehearsal" ${state.draft.content.oralRehearsal ? "checked" : ""}><span>Add oral rehearsal</span></label>
            </div></details>
            <details><summary>Diagram</summary><div class="designer-control-body">
              <div class="form-field"><label for="diagram-type">Type</label><select id="diagram-type" data-content-field="diagramType">${diagramTypes.map(type => `<option value="${type}" ${type === state.draft.content.diagramType ? "selected" : ""}>${type ? titleCase(type) : "No diagram"}</option>`).join("")}</select></div>
              <div class="form-field"><label for="diagram-labels">Labels</label><input id="diagram-labels" class="input" data-content-field="diagramLabels" data-list-mode="commas" value="${esc((state.draft.content.diagramLabels || []).join(", "))}"></div>
              ${renderDiagramValueControls(state.draft.content.diagramType)}
            </div></details>
            <details><summary>Teacher notes &amp; library</summary><div class="designer-control-body">
              <div class="section-switches">${[["example","Example"],["vocabulary","Vocabulary"],["oral","Oral rehearsal"]].map(([id,label]) => `<label><input type="checkbox" data-hidden-section="${id}" ${hidden.includes(id) ? "" : "checked"}><span>${label}</span></label>`).join("")}</div>
              <div class="form-field"><label for="teacher-notes">Teacher note</label><textarea id="teacher-notes" data-content-field="teacherNotes" rows="3">${esc(state.draft.content.teacherNotes || "")}</textarea></div>
              <div class="form-field"><label for="tags">Tags</label><input class="input" id="tags" data-draft-field="tags" value="${esc(state.draft.tags)}" placeholder="fractions, guided group"></div>
            </div></details>
            <div class="fade-explanation"><span>Remove next</span><strong>${esc(nextStage ? RESOURCE.nextFade(scaffold) : "Remove the page; retain only the pupil-owned self-prompt.")}</strong></div>
          </aside>
          <section class="designer-preview-panel"><div class="preview-bar"><span>Pupil preview</span><small>${esc(activeStage.name)}</small></div><div class="paper-wrap live-resource-preview" id="live-resource-preview">${renderResourceDocument(scaffold)}</div></section>
        </div>
      </div>${stepFooter({ nextLabel: "Check and use", nextAction: "generate-scaffold" })}`;
  }
  function renderReviewStep() {
    const scaffold = state.activeScaffold || scaffoldFromDraft();
    const audit = qualityAudit(scaffold);
    const flagged = audit.filter(item => item.status !== "Strong");
    const stageSet = RESOURCE.stageSet(scaffold);
    const aiStatus = AI.statusForResource(scaffold);
    const saved = scaffold.id && state.library.some(item => item.id === scaffold.id);

    return `${createHead(4, "Use it", "The scaffold is ready. Save it, print it, or make one optional external contribution.")}
      <div class="create-card-body finish-step">
        <div class="review-stage-switch"><div><span class="eyebrow">Support now</span><p>Move only when pupils can take over the next decision.</p></div><div class="compact-stage-path">${DATA.stages.map(stage => `<button class="${stage.id === scaffold.stage ? "is-active" : ""}" data-action="choose-stage" data-id="${stage.id}"><span>${stage.glyph}</span>${esc(stage.name)}</button>`).join("")}</div></div>
        ${state.compareStages ? `<div class="stage-compare-grid">${DATA.stages.map(stage => `<section><div class="stage-compare-head"><strong>${stage.name}</strong><span>${stage.support}</span></div><div class="stage-mini-paper">${renderResourceDocument(stageSet[stage.id])}</div></section>`).join("")}</div>` : `<div class="preview-workspace finish-workspace">
          <div class="paper-wrap">${renderResourceDocument({ ...scaffold, stage: state.draft.stage, content: state.draft.content })}</div>
          <aside class="finish-actions">
            <button class="button button-primary" data-action="save-scaffold"><span data-icon="check"></span> Save to library</button>
            <button class="button" data-action="open-print"><span data-icon="print"></span> Print</button>
            <div class="finish-audit ${flagged.length ? "has-review" : ""}"><span>${flagged.length ? "!" : "✓"}</span><div><strong>${flagged.length ? `${flagged.length} point${flagged.length === 1 ? "" : "s"} to review` : "Local checks passed"}</strong><p>${flagged.length ? esc(flagged[0].reason) : "No obvious barrier, ownership, representation or fading issue was found."}</p><button class="text-link" data-action="show-quality-report">See judgements</button></div></div>
            <details class="finish-more">
              <summary>Optional</summary>
              <button class="button" data-action="open-ai"><span data-icon="editorial"></span> Improve one part with AI</button>
              <button class="button" data-action="toggle-stage-compare"><span data-icon="eye"></span> Compare all stages</button>
              ${saved ? `<button class="button" data-action="record-use-reflection" data-id="${esc(scaffold.id)}"><span data-icon="brain"></span> Reflect after use</button>` : ""}
              <small>Nothing is sent automatically. Imported content must be reviewed before it can replace local content.</small>
            </details>
            <button class="text-link finish-edit" data-action="edit-design">← Edit the resource</button>
            <span class="resource-status status-${esc(aiStatus)}">${esc(DATA.ai.statuses.find(status => status.id === aiStatus)?.name || "Local resource")}</span>
          </aside>
        </div>`}
      </div>`;
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
    state.draft.analysis = ranked.map(([id, score], index) => ({
      id,
      score,
      confidence: score >= 9 ? "Well-supported suggestion" : score >= 5 ? "Suggested" : "Possible",
      reason: index < 3 ? analysisReason(id, entry) : barrierById(id).hint
    }));
    state.draft.selectedBarriers = ranked.length ? [ranked[0][0]] : [];
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
    const reflectedPractice = state.library.filter(item => item.subject === subject && (item.reflection || item.reflections?.length));
    state.draft.recommendations = DATA.engines
      .map(engine => {
        const barrierScore = engine.barriers.reduce((total, id) => total + (chosen.includes(id) ? 4 : 0), 0);
        const subjectScore = engine.subjects.includes(subject) ? 7 : engine.subjects.includes("all") ? 3 : -40;
        const familyScore = intelligence.preferredFamilies.includes(engine.family) ? 3 : 0;
        const phaseScore = state.draft.phase === "Teacher modelling" && ["worked-example", "incomplete-example", "modelling-page"].includes(engine.id) ? 3
          : state.draft.phase === "Before the lesson" && engine.id === "vocabulary-preteach" ? 3
          : state.draft.phase === "Review and reflection" && engine.id === "metacognition-planner" ? 3
          : state.draft.phase === "Independent practice" && ["metacognition-planner", "reasoning-ladder"].includes(engine.id) ? 2 : 0;
        const similarPractice = reflectedPractice.filter(item => item.engineId === engine.id && (!item.profileId || item.profileId === intelligence.profile.id) && (item.barriers || []).some(id => chosen.includes(id)));
        const latestReflections = similarPractice.map(item => item.reflections?.[0] || item.reflection).filter(Boolean);
        const practiceScore = latestReflections.some(item => item.worked === "yes") ? 3 : latestReflections.some(item => item.worked === "not-yet") ? -4 : 0;
        const avoidText = String(engine.avoidWhen || "").toLowerCase();
        const currentText = `${state.draft.situation} ${state.draft.customBarrier}`.toLowerCase();
        const avoidScore = avoidText && avoidText.split(/\W+/).filter(word => word.length > 6).some(word => currentText.includes(word)) ? -3 : 0;
        const profileScore = (engine.prompts || []).some(prompt => `${state.draft.objective} ${state.draft.situation}`.toLowerCase().includes(prompt.toLowerCase().split(" ")[0])) ? 1 : 0;
        return { id: engine.id, score: barrierScore + subjectScore + familyScore + phaseScore + practiceScore + avoidScore + profileScore };
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

  function similarReflection() {
    const intelligence = curriculumIntelligence();
    const candidates = state.library
      .filter(item => item.subject === state.draft.subject && (!item.profileId || item.profileId === intelligence.profile.id))
      .filter(item => (item.barriers || []).some(id => state.draft.selectedBarriers.includes(id)))
      .flatMap(item => (item.reflections?.length ? item.reflections : item.reflection ? [item.reflection] : []).map(reflection => ({ item, reflection })))
      .sort((a, b) => new Date(b.reflection.updatedAt || 0) - new Date(a.reflection.updatedAt || 0));
    return candidates[0] || null;
  }

  function scaffoldFromDraft() {
    const entry = currentEntry();
    const engine = engineById(state.draft.engineId);
    const intelligence = curriculumIntelligence();
    const now = new Date().toISOString();
    const existing = state.draft.editingId ? state.library.find(item => item.id === state.draft.editingId) : null;
    return {
      id: existing?.id || uid(),
      schemaVersion: 5,
      revision: existing?.revision || 1,
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
      reflections: existing?.reflections || (existing?.reflection ? [existing.reflection] : []),
      lastPrintedAt: existing?.lastPrintedAt || null
    };
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
    const owner = [state.settings.schoolLabel, state.settings.classLabel].filter(Boolean).join(" · ");
    return `<article class="paper density-${esc(density)} response-${esc(responseSpace)}" data-page="resource" data-stage="${esc(stage.id)}">
      <div class="paper-brand">Scaffold Seeds · ${esc(engine.name)}${owner ? ` · ${esc(owner)}` : ""} <small>${teacherCode}</small></div>
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
    const visibleItems = filtered.slice(0, state.libraryVisible);
    const activeFilterCount = [filters.year, filters.subject, filters.aiStatus].filter(value => value !== "all").length + (filters.sort !== "edited" ? 1 : 0);
    const cards = visibleItems.map(item => `
      <article class="library-card library-card-reduced">
        <div class="library-thumb"><div class="mini-paper"></div><span class="library-ai-status resource-status status-${esc(AI.statusForResource(item))}">${esc(aiStatusName(item))}</span><button class="favourite-button ${item.favourite ? "is-active" : ""}" data-action="toggle-favourite" data-id="${esc(item.id)}" aria-label="${item.favourite ? "Remove from" : "Add to"} favourites" aria-pressed="${item.favourite}">${icon("heart")}</button></div>
        <div class="library-card-body">
          <h3 title="${esc(item.title)}">${esc(item.title)}</h3>
          <p>${esc(item.year)} · ${esc(subjectById(item.subject).name)} · ${esc(engineById(item.engineId).name)}</p>
          <div class="library-sticking-point"><span>Sticking point</span><p>${esc((item.customBarrier || item.situation || "Not recorded").slice(0, 130))}</p></div>
          <div class="tag-row"><span class="tag">Edited ${relativeDate(item.updatedAt)}</span>${item.reflection ? '<span class="tag tag-reflected">Reflected</span>' : ""}${item.versions?.length ? `<span class="tag">${item.versions.length} checkpoint${item.versions.length === 1 ? "" : "s"}</span>` : ""}</div>
          <div class="card-actions">
            <button class="button" data-action="open-scaffold" data-id="${esc(item.id)}"><span data-icon="eye"></span> Open</button>
            <details class="card-more"><summary aria-label="More actions for ${esc(item.title)}">More</summary><div>
              <button data-action="rename-scaffold" data-id="${esc(item.id)}">Rename</button>
              <button data-action="open-ai" data-id="${esc(item.id)}">AI review</button>
              <button data-action="show-versions" data-id="${esc(item.id)}">Checkpoints</button>
              <button data-action="record-use-reflection" data-id="${esc(item.id)}">Reflect after use</button>
              <button data-action="duplicate-scaffold" data-id="${esc(item.id)}">Duplicate</button>
              <label><input type="checkbox" data-library-select="${esc(item.id)}" ${state.librarySelection.includes(item.id) ? "checked" : ""}> Select for batch action</label>
              <button data-action="${item.archived ? "restore-scaffold" : "archive-scaffold"}" data-id="${esc(item.id)}">${item.archived ? "Restore" : "Archive"}</button>
              ${item.archived ? `<button class="danger-link" data-action="delete-scaffold" data-id="${esc(item.id)}">Delete</button>` : ""}
            </div></details>
          </div>
        </div>
      </article>`).join("");

    return `
      <div class="page-heading library-heading"><div><span class="eyebrow">Saved on this device</span><h2>${filters.archived ? "Archive" : "Library"}</h2><p>Find a resource, open it and get back to the lesson.</p></div><button class="button button-primary" data-action="new-scaffold"><span data-icon="plus"></span> New scaffold</button></div>
      <div class="library-view-tabs"><button class="${!filters.archived ? "is-active" : ""}" data-action="library-view" data-id="active">Current <span>${state.library.filter(item => !item.archived).length}</span></button><button class="${filters.archived ? "is-active" : ""}" data-action="library-view" data-id="archived">Archive <span>${state.library.filter(item => item.archived).length}</span></button></div>
      ${state.librarySelection.length ? `<div class="library-batch"><strong>${state.librarySelection.length} selected</strong><button class="button button-compact" data-action="batch-export">Export</button><button class="button button-compact" data-action="batch-reviewed">Mark reviewed</button><button class="button button-compact" data-action="batch-archive">${filters.archived ? "Restore" : "Archive"}</button><button class="text-link" data-action="batch-clear">Clear</button></div>` : ""}
      <div class="library-find">
        <label class="search-field"><span data-icon="search"></span><input class="input" id="library-search" data-library-filter="query" value="${esc(filters.query)}" placeholder="Search your library"><span class="visually-hidden">Search titles, objectives and tags</span></label>
        <button class="button ${filters.favourite ? "button-soft" : ""}" data-action="filter-favourites" aria-pressed="${filters.favourite}">${icon("heart")} Favourites</button>
        <details class="library-filters"><summary>Filter${activeFilterCount ? ` · ${activeFilterCount}` : ""}</summary><div class="filter-grid">
          <label>Year<select data-library-filter="year"><option value="all">All years</option>${DATA.years.map(year => `<option ${year === filters.year ? "selected" : ""}>${esc(year)}</option>`).join("")}</select></label>
          <label>Subject<select data-library-filter="subject"><option value="all">All subjects</option>${DATA.subjects.map(subject => `<option value="${subject.id}" ${subject.id === filters.subject ? "selected" : ""}>${esc(subject.name)}</option>`).join("")}</select></label>
          <label>Review state<select data-library-filter="aiStatus"><option value="all">Any review state</option><option value="needs-review" ${filters.aiStatus === "needs-review" ? "selected" : ""}>Needs review</option><option value="approved" ${filters.aiStatus === "approved" ? "selected" : ""}>Approved or print ready</option></select></label>
          <label>Order<select data-library-filter="sort"><option value="edited" ${filters.sort === "edited" ? "selected" : ""}>Recently edited</option><option value="printed" ${filters.sort === "printed" ? "selected" : ""}>Recently printed</option><option value="title" ${filters.sort === "title" ? "selected" : ""}>Title</option></select></label>
          <button class="text-link" data-action="clear-library-filters">Clear filters</button>
        </div></details>
      </div>
      ${state.library.length === 0 ? `<div class="empty-help"><h4>A library built from real classroom needs</h4><p>Saved scaffolds appear here automatically.</p><button class="button button-primary" data-action="new-scaffold">Create a scaffold</button></div>` : filtered.length ? `<p class="library-count" aria-live="polite">${visibleItems.length} of ${filtered.length}</p><div class="library-grid">${cards}</div>${filtered.length > visibleItems.length ? `<button class="button library-more" data-action="library-more">Show 60 more</button>` : ""}` : `<div class="empty-help"><h4>No match</h4><p>Clear the filters to see the whole library.</p><button class="button" data-action="clear-library-filters">Clear filters</button></div>`}`;
  }
  function renderKnowledge() {
    const subject = subjectById(state.knowledgeSubject);
    const brain = brainBySubject(subject.id);
    if (!brain.profiles.some(profile => profile.id === state.knowledgeProfile)) state.knowledgeProfile = brain.profiles[0].id;
    const profile = brain.profiles.find(item => item.id === state.knowledgeProfile) || brain.profiles[0];
    const lensLabels = { ideas: "Subject architecture", progression: "Small steps", misconceptions: "Misconceptions", toolkit: "Teacher toolkit" };
    return `
      <div class="page-heading"><div><span class="eyebrow">Curriculum knowledge for primary education in England</span><h2>Knowledge Studio</h2><p>Browse the subject thinking used inside every recommendation: big ideas, progression, misconceptions, representations and teacher decisions.</p></div></div>
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
      state.aiWorkspace = safeAIWorkspace(scaffold, saved);
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
    scaffold.ai = { ...(scaffold.ai || {}), schemaVersion: 5, rounds: scaffold.ai?.rounds || [], provenance: scaffold.ai?.provenance || [], status, ...extras };
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
      ["task", "1", "Choose task"], ["prompt", "2", "Prepare AI prompt"], ["import", "3", "Import AI response"], ["review", "4", "Review imported content"], ["verify", "5", "Verify & rebuild"]
    ];
    const phaseIndex = phases.findIndex(([id]) => id === workspace.phase);
    const content = { task: renderAITaskPhase, prompt: renderAIPromptPhase, import: renderAIImportPhase, review: renderAIReviewPhase, verify: renderAIVerifyPhase }[workspace.phase](scaffold, workspace);
    const stage = stageById(scaffold.stage);
    const engine = engineById(scaffold.engineId);
    return `<div class="page-heading ai-page-heading"><div><span class="eyebrow">AI Companion · careful editorial exchange</span><h2>External range. Local control.</h2><p>Invite one narrow contribution, bring it back as inert content, inspect every change, then rebuild it inside Scaffold Seeds. Teacher judgement remains central.</p></div><div class="local-only-badge">${icon("shield")}<span><strong>Nothing sent automatically</strong><small>No API, account or backend</small></span></div></div>
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
      <section class="import-desk"><div class="import-desk-head"><div><h4>External AI response</h4><p>Plain text, markdown, tables, lists and simple JSON are supported.</p></div>${workspace.rawPreservedAt ? `<span class="raw-preserved">Raw response preserved ${relativeDate(workspace.rawPreservedAt)}</span>` : ""}</div><textarea id="ai-raw-import" data-ai-raw-import rows="18" maxlength="65000" placeholder="Paste the full response here. Introductory commentary and imperfect headings are safe to include…">${esc(workspace.rawImport || "")}</textarea><div class="import-actions"><button class="button button-primary" data-action="ai-structure-import">Try automatic structuring</button><button class="button" data-action="ai-import-plain">Use as plain text</button><button class="button" data-action="ai-manual-import">Split manually</button><button class="button button-ghost" data-action="ai-clear-import">Start over</button>${workspace.importRecovery ? '<button class="text-link" data-action="ai-restore-import">Restore previous import</button>' : ""}</div></section>
      ${parsed ? `<section class="import-result"><div class="section-heading"><div><span class="eyebrow">Import recovery</span><h4>${esc(parsed.format)} organised into ${parsed.sections.length} section${parsed.sections.length === 1 ? "" : "s"}</h4><p>${parsed.missing.length ? `${parsed.missing.length} expected section${parsed.missing.length === 1 ? " is" : "s are"} still missing.` : "All expected content types were detected."}</p></div><span class="local-check-label">Raw response retained</span></div><div class="import-summary-grid">${parsed.sections.map(section => `<div class="import-summary-card ${section.unexpected ? "is-unexpected" : ""}"><span>${section.expected ? "Expected" : section.unexpected ? "Unexpected" : "Optional"}</span><strong>${esc(section.label)}</strong><small>${section.items.length} item${section.items.length === 1 ? "" : "s"}</small></div>`).join("")}</div>${parsed.warnings.length ? `<div class="import-warnings">${parsed.warnings.map(warning => `<p><strong>${esc(warning.title)}</strong> ${esc(warning.message)}</p>`).join("")}</div>` : ""}</section>` : ""}
      <div class="ai-phase-footer"><button class="button" data-action="ai-phase" data-id="prompt">← Return to prompt</button><button class="button button-primary" data-action="ai-phase" data-id="review" ${parsed ? "" : "disabled"}>Review sections ${icon("arrow")}</button></div>`;
  }

  function diffSegmentsHTML(segments) {
    return segments.map(segment => segment.type === "same" ? esc(segment.text) : segment.type === "added" ? `<mark class="diff-added">${esc(segment.text)}</mark>` : `<del class="diff-removed">${esc(segment.text)}</del>`).join("");
  }

  function renderAIReviewPhase(scaffold, workspace) {
    const parsed = workspace.parsed;
    if (!parsed) return `<div class="empty-help"><h4>No imported response yet</h4><p>Paste and structure a response before reviewing changes.</p><button class="button" data-action="ai-phase" data-id="import">Import AI response</button></div>`;
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
      document.body.appendChild(area); area.select();
      let copied = false;
      try { copied = Boolean(document.execCommand?.("copy")); } catch (error) { copied = false; }
      area.remove();
      toast(copied ? confirmation : "Copy was blocked. Select the text on screen and copy it manually.");
      return copied;
    };
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => { toast(confirmation); return true; }, fallback);
    return Promise.resolve(fallback());
  }

  function activeForPrint() {
    return state.activeScaffold || state.library[0] || null;
  }

  function paperClasses() {
    const mode = normalisePrintMode(state.print.colour);
    return [state.print.paper === "a5" ? "a5" : "", state.print.orientation === "landscape" ? "landscape" : "", `ink-${mode}`, state.print.largePrint ? "large-print" : "", state.print.cropMarks ? "crop-marks" : "", state.print.cutLines ? "show-cut-lines" : "hide-cut-lines", state.settings.pageNumbers ? "page-numbers" : ""].filter(Boolean).join(" ");
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
    const owner = [state.settings.schoolLabel, state.settings.classLabel].filter(Boolean).join(" · ");
    return `<article class="paper format-page format-${format.id} ${className}" data-page="resource" data-stage="${esc(scaffold.stage)}"><div class="paper-brand">Scaffold Seeds · ${esc(format.name)}${owner ? ` · ${esc(owner)}` : ""} <small>SS-${String.fromCharCode(65 + stageIndex)}</small></div><div class="resource-meta"><span>${esc(scaffold.year)}</span><span>${esc(subject.name)}</span></div>${body}<footer class="resource-footer"><span>${esc(scaffold.topic)}</span><span>Designed to fade</span></footer></article>`;
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
      const count = [4, 6, 8].includes(Number(state.print.arrangement)) ? Number(state.print.arrangement) : 6;
      const miniPrompts = [...cards, ...prompts.questions, "What can I now do without this card?", ...cards].slice(0, count);
      return formatPage(scaffold, format, `${title}<div class="print-card-grid mini-cards">${miniPrompts.map((item, index) => `<section><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(item)}</strong><small>${esc(prompts.vocabulary[index % Math.max(prompts.vocabulary.length, 1)] || scaffold.topic)}</small></section>`).join("")}</div>`);
    }
    if (format.id === "vocabulary-card") {
      const vocabulary = prompts.vocabulary.length ? prompts.vocabulary : [scaffold.topic];
      const count = [4, 6, 8].includes(Number(state.print.arrangement)) ? Number(state.print.arrangement) : 6;
      const cardsToPrint = Array.from({ length: Math.min(count, Math.max(vocabulary.length, 1)) }, (_, index) => vocabulary[index % vocabulary.length]);
      return formatPage(scaffold, format, `${title}<div class="print-card-grid vocabulary-cards">${cardsToPrint.map((word, index) => `<section><span class="card-seed">Word ${index + 1} · SS-V</span><h2>${esc(word)}</h2><p><strong>Precise meaning</strong><br><span class="write-in">________________________________</span></p><p><strong>Use it in ${esc(subjectById(scaffold.subject).name)}</strong><br><span class="write-in">________________________________</span></p><small>Keep only while this word unlocks the subject thinking.</small></section>`).join("")}</div><p class="cut-note">Cut on dashed lines · complete precise meanings before pupil use</p>`);
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
      const side = scaffold.printPart === "booklet-back" ? [pages[1], pages[2]] : [pages[3], pages[0]];
      const numbers = scaffold.printPart === "booklet-back" ? [2, 3] : [4, 1];
      return formatPage(scaffold, format, `<div class="booklet-side-label">${scaffold.printPart === "booklet-back" ? "Inside · pages 2–3" : "Outside · pages 4–1"}</div><div class="booklet-grid booklet-imposed">${side.map(([label,item], index) => `<section><span>${numbers[index]} · ${esc(label)}</span><h2>${esc(item)}</h2>${blankLines(5)}<small>SS-B${numbers[index]}</small></section>`).join("")}</div><p class="cut-note">Print double-sided · flip on short edge · fold on the centre line</p>`);
    }
    if (["modelling-page", "presentation-board"].includes(format.id)) {
      return formatPage(scaffold, format, `<div class="modelling-layout"><span class="eyebrow">${esc(format.id === "presentation-board" ? "Classroom board" : "Teacher modelling")}</span><h1>${esc(scaffold.title)}</h1><p>${esc(scaffold.objective)}</p><div class="modelling-focus"><strong>${esc(cards[0])}</strong><span>${esc(cards[1] || prompts.questions[0])}</span></div><div class="modelling-reveal"><small>Reveal next</small><strong>${esc(prompts.selfPrompt)}</strong></div></div>`);
    }
    if (format.id === "intervention-pack") {
      const part = scaffold.printPart || "intervention-introduce";
      const contentByPart = {
        "intervention-introduce": ["1 · Introduce", "Model one decision aloud", "Name the barrier briefly. Demonstrate how one support is used, but stop before the pupil's protected decision.", cards[0]],
        "intervention-use": ["2 · Use", "Pupil practice", cards[0], cards[1] || prompts.questions[0]],
        "intervention-check": ["3 · Check", "Inspect independence", prompts.selfPrompt, "Cover one prompt. Record what the pupil can now initiate or check without it."],
        "intervention-reduce": ["4 · Reduce", "Plan the next removal", RESOURCE.nextFade(scaffold), "Record the support that disappeared and the evidence that the core learning remained."]
      };
      const [label, heading, first, second] = contentByPart[part] || contentByPart["intervention-introduce"];
      return formatPage(scaffold, format, `${title}<div class="intervention-page"><span class="card-seed">${esc(label)}</span><h2>${esc(heading)}</h2><section><p>${esc(first)}</p>${blankLines(5)}</section><section><p>${esc(second)}</p>${blankLines(5)}</section><aside>One objective · one protected decision · support reduced from observed evidence</aside></div>`, part);
    }
    if (format.id === "home-support") {
      return formatPage(scaffold, format, `${title}<div class="home-support-grid"><section><h2>For the pupil</h2><p>${esc(cards[0])}</p><p>${esc(prompts.selfPrompt)}</p>${blankLines(4)}</section><section><h2>For an adult helping</h2><p>Ask the prompt, wait, and return the decision to the pupil. Do not supply the answer.</p><p><strong>Useful language:</strong> ${esc(prompts.vocabulary.join(" · "))}</p><p><strong>Stop using this page when:</strong> the pupil can name and use their own next prompt.</p></section></div>`);
    }
    if (format.id === "mixed-pack") return state.print.paper === "a5" || state.print.orientation === "landscape" ? renderCompactWorkpage(scaffold) : renderResourceDocument(scaffold);
    return renderResourceDocument(scaffold);
  }

  function buildPrintResourcePages(scaffold, format = printFormatById()) {
    const stageIds = format.id === "mixed-pack" ? DATA.stages.map(stage => stage.id) : (state.print.stages.length ? state.print.stages : [scaffold.stage]);
    const stages = stageIds.map(stage => RESOURCE.createStage(scaffold, stage));
    if (format.id === "display-poster" && state.print.arrangement === "2x2") {
      return stages.flatMap(item => [0, 1, 2, 3].map(tile => ({ ...item, printTile: tile })));
    }
    if (format.id === "mini-booklet") {
      return stages.flatMap(item => [{ ...item, printPart: "booklet-front" }, { ...item, printPart: "booklet-back" }]);
    }
    if (format.id === "intervention-pack") {
      return stages.flatMap(item => ["introduce", "use", "check", "reduce"].map(part => ({ ...item, printPart: `intervention-${part}` })));
    }
    return stages;
  }

  function printPreflight(scaffold, format = printFormatById()) {
    const options = { paper: state.print.paper, orientation: state.print.orientation, largePrint: state.print.largePrint, mode: normalisePrintMode(state.print.colour), duplex: Boolean(format.release?.recommendsDuplex) };
    const local = RESOURCE.printPreflight ? RESOURCE.printPreflight(scaffold, format.id, options) : { errors: [], warnings: [] };
    const errors = [...(local.blocking || local.errors || [])];
    const warnings = [...(local.warnings || [])];
    const rule = format.release || DATA.build5?.formatRules?.[format.id];
    if (rule?.recommendsDuplex && format.id === "mini-booklet") warnings.push("Booklet output has two imposed sides; select short-edge duplex in the printer dialog.");
    return { errors: [...new Set(errors)], warnings: [...new Set(warnings)], ready: errors.length === 0 };
  }

  function measuredPrintPreflight(root) {
    const findings = [];
    root.querySelectorAll(".paper").forEach((page, index) => {
      const bottom = page.getBoundingClientRect().bottom;
      const footer = page.querySelector(".resource-footer");
      const overflowingChild = [...page.children].find(child => child.getBoundingClientRect().bottom > bottom + 1);
      if (page.scrollHeight > page.clientHeight + 2 || overflowingChild) findings.push(`Page ${index + 1} needs reflow; content would be clipped.`);
      if (footer && [...page.children].some(child => child !== footer && child.getBoundingClientRect().bottom > footer.getBoundingClientRect().top - 2)) findings.push(`Page ${index + 1} content reaches the footer.`);
    });
    return [...new Set(findings)];
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
      return `<div class="empty-help"><h4>Create a scaffold first</h4><p>Print choices appear only when there is a finished resource.</p><button class="button button-primary" data-action="new-scaffold">Create a scaffold</button></div>`;
    }
    const format = printFormatById();
    const stageIds = format.id === "mixed-pack" ? DATA.stages.map(stage => stage.id) : (state.print.stages.length ? state.print.stages : [scaffold.stage]);
    const pages = buildPrintResourcePages(scaffold, format).map(item => ({ type: "resource", scaffold: item }));
    if (state.print.teacherGuidance) pages.push({ type: "teacher", scaffold });
    const rule = format.release || DATA.build5?.formatRules?.[format.id] || {};
    const audit = printPreflight(scaffold, format);
    const canReorder = !["mixed-pack", "mini-booklet", "intervention-pack"].includes(format.id) && state.print.arrangement !== "2x2";
    const switchControl = (label, key) => `<div class="switch-row"><span id="print-${key}-label">${esc(label)}</span><button class="switch" role="switch" aria-labelledby="print-${key}-label" aria-checked="${state.print[key]}" data-print-toggle="${key}"></button></div>`;

    return `<div class="page-heading compact-heading print-heading"><div><span class="eyebrow">${esc(scaffold.year)} · ${esc(subjectById(scaffold.subject).name)}</span><h2>${esc(scaffold.title)}</h2><p>${esc(format.name)} · ${pages.length} page${pages.length === 1 ? "" : "s"}</p></div><button class="text-link" data-action="edit-design">← Back to scaffold</button></div>
      <div class="studio-layout studio-reduced"><aside class="studio-controls">
        <div class="control-group format-control"><h4>Format</h4><button class="format-current" data-action="choose-print-format"><span>${esc(format.group)}</span><strong>${esc(format.name)}</strong><small>${esc(format.note)}</small></button></div>
        <div class="print-audit ${audit.ready ? "is-ready" : "has-errors"}"><strong>${audit.ready ? "Ready to print" : "Needs attention"}</strong>${audit.errors.map(item => `<p>${esc(item)}</p>`).join("")}${audit.warnings.slice(0, 1).map(item => `<p>${esc(item)}</p>`).join("") || "<p>Page and format are compatible.</p>"}</div>
        <button class="button button-primary print-primary" data-action="print-now" ${audit.ready ? "" : "disabled"}><span data-icon="print"></span> Print ${pages.length} page${pages.length === 1 ? "" : "s"}</button>
        <details class="print-options"><summary>Print options</summary><div>
          <label>Paper<select data-print-select="paper"><option value="a4" ${state.print.paper === "a4" ? "selected" : ""} ${rule.safePaper && !rule.safePaper.includes("a4") ? "disabled" : ""}>A4</option><option value="a5" ${state.print.paper === "a5" ? "selected" : ""} ${rule.safePaper && !rule.safePaper.includes("a5") ? "disabled" : ""}>A5</option></select></label>
          <label>Orientation<select data-print-select="orientation"><option value="portrait" ${state.print.orientation === "portrait" ? "selected" : ""}>Portrait</option><option value="landscape" ${state.print.orientation === "landscape" ? "selected" : ""}>Landscape</option></select></label>
          <label>Style<select data-print-select="colour">${DATA.build5.printModes.map(mode => `<option value="${mode.id}" ${state.print.colour === mode.id ? "selected" : ""}>${esc(mode.name)}</option>`).join("")}</select></label>
          ${["cut-cards","mini-card","vocabulary-card"].includes(format.id) ? `<label>Cards per page<select data-print-select="arrangement">${[4,6,8].map(value => `<option value="${value}" ${String(state.print.arrangement) === String(value) ? "selected" : ""}>${value}</option>`).join("")}</select></label>` : ""}
          ${format.id === "display-poster" ? `<label>Poster size<select data-print-select="arrangement"><option value="single" ${state.print.arrangement !== "2x2" ? "selected" : ""}>Single page</option><option value="2x2" ${state.print.arrangement === "2x2" ? "selected" : ""}>2 × 2 tiles</option></select></label>` : ""}
          <fieldset><legend>Growth stages</legend><div class="print-stage-list">${DATA.stages.map(stage => `<label><input type="checkbox" data-print-stage="${stage.id}" ${stageIds.includes(stage.id) ? "checked" : ""} ${format.id === "mixed-pack" ? "disabled" : ""}><span>${stage.glyph} ${stage.name}</span></label>`).join("")}</div></fieldset>
          <div class="print-switches">${switchControl("Teacher guidance", "teacherGuidance")}${switchControl("Larger pupil text", "largePrint")}${rule.cuttable ? switchControl("Cut lines", "cutLines") : ""}${["display-poster", "cut-cards", "mini-card", "vocabulary-card"].includes(format.id) ? switchControl("Crop marks", "cropMarks") : ""}</div>
          ${rule.recommendsDuplex ? `<p class="duplex-note">Print both sides using short-edge duplex, then fold on the centre line.</p>` : ""}
        </div></details>
      </aside><div class="page-stack">${pages.map((page, index) => renderPrintPage(page.scaffold, page.type, index, {
        allowStageMove: page.type === "resource" && canReorder && stageIds.length > 1,
        first: page.type === "resource" && stageIds.indexOf(page.scaffold.stage) === 0,
        last: page.type === "resource" && stageIds.indexOf(page.scaffold.stage) === stageIds.length - 1
      })).join("")}</div></div>`;
  }
  function renderSettings() {
    return `<div class="page-heading compact-heading"><div><span class="eyebrow">Occasional controls</span><h2>Preferences &amp; backup</h2><p>Defaults for this device. Most teachers can leave these alone.</p></div></div>
      <div class="settings-grid settings-reduced">
        <section class="settings-card"><h3>Comfort</h3><div class="settings-list">
          ${settingSwitch("High contrast", "Stronger edges and darker text.", "highContrast")}
          ${settingSwitch("Large interface text", "Increase interface text without changing pupil resources.", "largeText")}
          ${settingSwitch("Reduce motion", "Remove transitions and animated entrances.", "reduceMotion")}
        </div></section>
        <section class="settings-card"><h3>Starting points</h3><div class="settings-list">
          <div class="settings-row"><span><strong>Typical year group</strong></span><select data-setting-select="typicalYear">${DATA.years.map(year => `<option ${state.settings.typicalYear === year ? "selected" : ""}>${esc(year)}</option>`).join("")}</select></div>
          <div class="settings-row"><span><strong>Starting support</strong></span><select data-setting-select="defaultStage">${DATA.stages.map(item => `<option value="${item.id}" ${item.id === state.settings.defaultStage ? "selected" : ""}>${esc(item.name)}</option>`).join("")}</select></div>
          <div class="settings-row"><span><strong>Paper</strong></span><select data-setting-select="defaultPaper"><option value="a4" ${state.settings.defaultPaper === "a4" ? "selected" : ""}>A4</option><option value="a5" ${state.settings.defaultPaper === "a5" ? "selected" : ""}>A5</option></select></div>
          <div class="settings-row"><span><strong>Print style</strong></span><select data-setting-select="defaultColour">${DATA.build5.printModes.map(mode => `<option value="${mode.id}" ${state.settings.defaultColour === mode.id ? "selected" : ""}>${esc(mode.name)}</option>`).join("")}</select></div>
        </div></section>
        <section class="settings-card settings-data"><h3>Backup &amp; recovery</h3><div class="settings-list">
          <div class="settings-row"><span><strong>Export backup</strong><small>Scaffolds, settings and reflections.</small></span><button class="button button-compact" data-action="export-data"><span data-icon="download"></span> Export</button></div>
          <div class="settings-row"><span><strong>Import backup</strong><small>Inspect before merging or replacing.</small></span><label class="button button-compact" for="import-file"><span data-icon="upload"></span> Import</label><input class="file-input" type="file" id="import-file" accept="application/json" data-action="import-data"></div>
          <div class="settings-row"><span><strong>Recovery checkpoints</strong></span><button class="button button-compact" data-action="recovery-checkpoints">Review</button></div>
          <div class="settings-row"><span><strong>Recently deleted</strong><small>${state.archives.length} recoverable.</small></span><button class="button button-compact" data-action="recently-deleted">Review</button></div>
        </div></section>
        <section class="settings-card settings-privacy"><h3>Privacy</h3><p>No login, cloud or direct AI connection. Never place identifiable pupil information in an external prompt.</p><button class="text-link danger-link" data-action="clear-data">Clear all local data</button></section>
      </div>`;
  }
  function settingSwitch(title, description, key) {
    const id = `setting-${key}-label`;
    return `<div class="settings-row"><span id="${id}"><strong>${esc(title)}</strong><small>${esc(description)}</small></span><button class="switch" role="switch" aria-labelledby="${id}" aria-checked="${state.settings[key]}" data-setting-toggle="${key}"></button></div>`;
  }

  function openModal({ title, subtitle = "", body, footer = "" }) {
    modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalLayer.hidden = false;
    modalLayer.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ${subtitle ? 'aria-describedby="modal-description"' : ""}><div class="modal-head"><div><h2 id="modal-title">${esc(title)}</h2>${subtitle ? `<p id="modal-description">${esc(subtitle)}</p>` : ""}</div><button class="icon-button" data-action="close-modal" aria-label="Close dialog">${icon("close")}</button></div><div class="modal-body">${body}</div>${footer ? `<div class="modal-footer">${footer}</div>` : ""}</section>`;
    hydrateIcons(modalLayer);
    document.body.style.overflow = "hidden";
    if (appShell) appShell.inert = true;
    setTimeout(() => modalLayer.querySelector("button, input, textarea")?.focus(), 0);
  }

  function closeModal() {
    modalLayer.hidden = true;
    modalLayer.innerHTML = "";
    document.body.style.overflow = "";
    if (appShell) appShell.inert = false;
    const returnTo = modalReturnFocus;
    modalReturnFocus = null;
    if (returnTo?.isConnected) returnTo.focus();
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
      subtitle: `${audit.length} explainable local judgements—never a fake effectiveness percentage.`,
      body: `<div class="quality-report quality-judgements">${audit.map(item => `<section class="quality-${esc(item.status.toLowerCase().replaceAll(" ", "-"))}"><div class="quality-report-head"><strong>${esc(item.label)}</strong><span>${esc(item.status)}</span></div><p>${esc(item.reason)}</p>${item.action && item.status !== "Strong" ? `<small>${esc(item.action)}</small>` : ""}</section>`).join("")}</div><div class="quality-principle"><strong>Professional judgement remains final.</strong><p>The real test is what pupils do when the support becomes lighter. Use one or two independence checks rather than generating a quiz.</p></div>`
    });
  }

  function showUseReflection(id) {
    const scaffold = state.library.find(item => item.id === id) || (state.activeScaffold?.id === id ? state.activeScaffold : null);
    if (!scaffold) return;
    const reflection = scaffold.reflections?.[0] || scaffold.reflection || {};
    const choice = (name, value, label) => `<label class="reflection-choice"><input type="radio" name="${name}" value="${value}" ${reflection[name] === value ? "checked" : ""}><span>${label}</span></label>`;
    openModal({
      title: "Reflect after use",
      subtitle: `${scaffold.title} · observations here improve future local recommendations.`,
      body: `<form class="use-reflection" id="use-reflection-form" data-id="${esc(scaffold.id)}">
        <fieldset><legend>Did the scaffold remove the intended barrier?</legend><div class="reflection-choices">${choice("worked", "not-yet", "Not yet")}${choice("worked", "partly", "Partly")}${choice("worked", "yes", "Yes")}</div></fieldset>
        <div class="form-field"><label for="reflection-worked">What worked?</label><textarea id="reflection-worked" name="whatWorked" rows="3" placeholder="The specific prompt, representation or teacher move that opened the learning…">${esc(reflection.whatWorked || "")}</textarea></div>
        <div class="form-field"><label for="reflection-surprise">What surprised you?</label><textarea id="reflection-surprise" name="surprise" rows="3" placeholder="A response, strategy or moment you did not expect…">${esc(reflection.surprise || "")}</textarea></div>
        <div class="form-field"><label for="reflection-misconception">What misconception actually appeared?</label><textarea id="reflection-misconception" name="misconceptionObserved" rows="3" placeholder="Use the pupil's words or action if useful…">${esc(reflection.misconceptionObserved || reflection.misconception || "")}</textarea></div>
        <div class="form-field"><label for="reflection-disappeared">What support disappeared during the lesson?</label><textarea id="reflection-disappeared" name="supportRemoved" rows="2" placeholder="A model, word bank, prompt or adult cue pupils stopped needing…">${esc(reflection.supportRemoved || "")}</textarea></div>
        <fieldset><legend>Would you reuse this structure?</legend><div class="reflection-choices">${choice("reuse", "no", "No")}${choice("reuse", "adapt", "With changes")}${choice("reuse", "yes", "Yes")}</div></fieldset>
        <div class="form-field"><label for="reflection-reduce">What would you remove next time?</label><textarea id="reflection-reduce" name="removeNext" rows="3" placeholder="A prompt, example, word bank or visual cue that no longer earns its place…">${esc(reflection.removeNext || reflection.reduceNext || "")}</textarea></div>
        <div class="form-field"><label for="reflection-next">Next professional decision</label><textarea id="reflection-next" name="nextDecision" rows="2" placeholder="The one adjustment you want surfaced when a similar barrier returns…">${esc(reflection.nextDecision || "")}</textarea></div>
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
    const reflection = {
      id: uid(),
      worked,
      reuse,
      whatWorked: String(fields.get("whatWorked") || "").trim(),
      surprise: String(fields.get("surprise") || "").trim(),
      misconceptionObserved: String(fields.get("misconceptionObserved") || "").trim(),
      supportRemoved: String(fields.get("supportRemoved") || "").trim(),
      removeNext: String(fields.get("removeNext") || "").trim(),
      nextDecision: String(fields.get("nextDecision") || "").trim(),
      recommendedNextStage: worked === "yes" ? (DATA.stages[Math.min(currentStageIndex + 1, DATA.stages.length - 1)]?.id || scaffold.stage) : scaffold.stage,
      updatedAt: new Date().toISOString()
    };
    scaffold.reflections = [reflection, ...(scaffold.reflections || (scaffold.reflection ? [scaffold.reflection] : []))].slice(0, 30);
    scaffold.reflection = reflection;
    const reflectionText = `${reflection.whatWorked} ${reflection.surprise} ${reflection.supportRemoved} ${reflection.removeNext}`.toLowerCase();
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

  function saveScaffold() {
    const scaffold = state.activeScaffold ? { ...state.activeScaffold, ...scaffoldFromDraft(), id: state.activeScaffold.id, createdAt: state.activeScaffold.createdAt, reflection: state.activeScaffold.reflection || null, reflections: state.activeScaffold.reflections || (state.activeScaffold.reflection ? [state.activeScaffold.reflection] : []) } : scaffoldFromDraft();
    scaffold.updatedAt = new Date().toISOString();
    const index = state.library.findIndex(item => item.id === scaffold.id);
    if (index >= 0) {
      const previous = state.library[index];
      const versions = [...(previous.versions || [])];
      if (meaningfulHash(previous) !== meaningfulHash(scaffold)) versions.unshift(versionSnapshot(previous, `Before ${formatDate(scaffold.updatedAt)}`));
      scaffold.versions = versions.slice(0, 16);
      scaffold.revision = (previous.revision || 1) + 1;
      state.library[index] = scaffold;
    }
    else { scaffold.revision = 1; state.library.unshift(scaffold); }
    state.activeScaffold = scaffold;
    state.draft.editingId = scaffold.id;
    const librarySaved = writeStore(STORAGE.library, state.library);
    const draftSaved = saveDraft();
    if (librarySaved && draftSaved) toast(index >= 0 ? "Scaffold changes saved locally." : "Scaffold saved to your library.");
    render();
  }

  function versionSnapshot(scaffold, name = "Saved checkpoint") {
    const { versions, ...snapshot } = scaffold;
    const compact = JSON.parse(JSON.stringify(snapshot));
    compact.assets = (compact.assets || []).map(({ dataUrl, analysis, ...metadata }) => ({ ...metadata, assetStoredSeparately: Boolean(dataUrl), analysis }));
    if (compact.ai?.lastVerification?.raw) delete compact.ai.lastVerification.raw;
    return { id: uid(), name, savedAt: new Date().toISOString(), snapshot: compact };
  }

  function meaningfulHash(scaffold) {
    const { updatedAt, lastPrintedAt, versions, favourite, reflection, reflections, ...meaningful } = scaffold || {};
    return JSON.stringify(meaningful);
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
      const assetData = new Map((parent.assets || []).map(asset => [asset.id, asset.dataUrl]));
      restored.assets = (restored.assets || []).map(asset => assetData.get(asset.id) ? { ...asset, dataUrl: assetData.get(asset.id) } : asset);
      const replacement = { ...restored, id: parent.id, createdAt: parent.createdAt, updatedAt: now, revision: (parent.revision || 1) + 1, versions: [currentVersion, ...(parent.versions || [])].slice(0, 16) };
      const index = state.library.findIndex(item => item.id === parent.id);
      state.library[index] = replacement;
      if (state.activeScaffold?.id === parent.id) {
        state.activeScaffold = replacement;
        state.draft = normaliseDraft({ ...replacement, editingId: replacement.id });
        state.aiWorkspace = safeAIWorkspace(replacement, readStore(`${STORAGE.aiWorkspace}.${replacement.id}`, null));
        saveDraft();
      }
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
    state.createStep = 3;
    saveDraft();
    navigate("create");
  }

  function duplicateScaffold(id) {
    const original = state.library.find(item => item.id === id);
    if (!original) return;
    const now = new Date().toISOString();
    const copy = { ...original, id: uid(), title: `${original.title} · copy`, favourite: false, archived: false, reflection: null, reflections: [], versions: [], createdAt: now, updatedAt: now };
    state.library.unshift(copy);
    writeStore(STORAGE.library, state.library);
    toast("A fresh copy has been added to your library.");
    render();
  }

  function deleteScaffold(id) {
    const item = state.library.find(scaffold => scaffold.id === id);
    if (!item?.archived || !window.confirm(`Move “${item.title}” to Recently deleted? You can restore it from Settings.`)) return;
    const workspace = readStore(`${STORAGE.aiWorkspace}.${id}`, null);
    const deleted = { id: uid(), resourceId: item.id, deletedAt: new Date().toISOString(), resource: JSON.parse(JSON.stringify(item)), workspace };
    const nextArchives = [deleted, ...(Array.isArray(state.archives) ? state.archives : [])].slice(0, 50);
    if (!writeStore(STORAGE.archives, nextArchives)) { toast("The scaffold was not removed because a recovery copy could not be saved."); return; }
    const previousLibrary = state.library;
    state.library = state.library.filter(scaffold => scaffold.id !== id);
    if (!writeStore(STORAGE.library, state.library)) {
      state.library = previousLibrary;
      toast("The scaffold was not removed because the library could not be saved.");
      return;
    }
    state.archives = nextArchives;
    if (state.activeScaffold?.id === id) state.activeScaffold = state.library[0] || null;
    toast("Moved to Recently deleted. It can be restored from Settings.");
    render();
  }

  function showRecentlyDeleted() {
    const deleted = Array.isArray(state.archives) ? state.archives : [];
    openModal({
      title: "Recently deleted",
      subtitle: "Resources remain recoverable here until you explicitly remove them.",
      body: deleted.length ? `<div class="version-list">${deleted.map(item => `<section><div><span class="eyebrow">Deleted ${relativeDate(item.deletedAt)}</span><h3>${esc(item.resource?.title || "Untitled scaffold")}</h3><p>${esc(item.resource?.year || "")} · ${esc(subjectById(item.resource?.subject).name)}</p></div><div><button class="button button-compact" data-action="restore-deleted" data-id="${esc(item.id)}">Restore</button><button class="text-link danger-link" data-action="purge-deleted" data-id="${esc(item.id)}">Delete permanently</button></div></section>`).join("")}</div>` : '<div class="empty-help"><h4>Nothing here</h4><p>Deleted resources will be held here for recovery.</p></div>'
    });
  }

  function restoreDeleted(id) {
    const record = state.archives.find(item => item.id === id);
    if (!record?.resource) return;
    const restored = migrateLibrary([record.resource])[0];
    if (!restored) { toast("That recovery copy could not be restored safely."); return; }
    if (state.library.some(item => item.id === restored.id)) restored.id = uid();
    restored.archived = true;
    restored.updatedAt = new Date().toISOString();
    state.library.unshift(restored);
    if (!writeStore(STORAGE.library, state.library)) { state.library.shift(); return; }
    if (record.workspace) writeStore(`${STORAGE.aiWorkspace}.${restored.id}`, { ...record.workspace, resourceId: restored.id });
    state.archives = state.archives.filter(item => item.id !== id);
    writeStore(STORAGE.archives, state.archives);
    closeModal();
    toast("Resource restored to the Archive.");
    render();
  }

  function purgeDeleted(id) {
    const record = state.archives.find(item => item.id === id);
    if (!record || !window.confirm(`Permanently delete “${record.resource?.title || "this resource"}”? This cannot be undone.`)) return;
    state.archives = state.archives.filter(item => item.id !== id);
    writeStore(STORAGE.archives, state.archives);
    showRecentlyDeleted();
  }

  function exportData() {
    if (state.aiWorkspace) saveAIWorkspace();
    saveDraft();
    const library = state.settings.aiIncludeResponseHistory ? state.library : state.library.map(item => AI.portableResource(item, { excludeHistory: true }).resource);
    const bundle = PERSISTENCE.createBundle({ ...durableBundle(), library });
    const payload = JSON.stringify(bundle, null, 2);
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
      if (file.size > (PERSISTENCE?.MAX_BACKUP_BYTES || 50 * 1024 * 1024)) throw new Error("too-large");
      const rawText = await file.text();
      const validation = PERSISTENCE.validateBundle(rawText);
      if (!validation.valid) {
        openModal({ title: "This backup cannot be imported safely", subtitle: "No current data was changed.", body: `<div class="audit-list">${validation.errors.map(error => `<p><strong>${esc(error.code)}</strong> · ${esc(error.message)}</p>`).join("") || "<p>The file did not contain a valid resource envelope.</p>"}</div>`, footer: '<button class="button" data-action="close-modal">Close</button>' });
        return;
      }
      state.pendingImport = { rawText, validation, fileName: file.name };
      const accepted = validation.bundle.library.length;
      const warningCount = validation.warnings.length;
      openModal({
        title: "Review backup import",
        subtitle: `${file.name} · nothing changes until you choose an import method.`,
        body: `<div class="import-preview"><dl><div><dt>Accepted resources</dt><dd>${accepted}</dd></div><div><dt>Envelope</dt><dd>${esc(validation.detectedEnvelope)}</dd></div><div><dt>Source schema</dt><dd>${validation.sourceSchemaVersion}${validation.migrated ? " · will be migrated" : ""}</dd></div><div><dt>Warnings</dt><dd>${warningCount}</dd></div><div><dt>Quarantined</dt><dd>${validation.quarantined.length}</dd></div></dl>${validation.warnings.length ? `<details><summary>Review ${warningCount} import note${warningCount === 1 ? "" : "s"}</summary><ul>${validation.warnings.slice(0, 20).map(item => `<li>${esc(item.message)}</li>`).join("")}</ul></details>` : ""}<p><strong>Merge</strong> keeps this library and imports ID conflicts as copies. <strong>Replace</strong> creates a recovery checkpoint, then uses the backup as the library.</p></div>`,
        footer: '<button class="button" data-action="close-modal">Cancel</button><button class="button" data-action="commit-import" data-mode="merge">Merge safely</button><button class="button button-primary" data-action="commit-import" data-mode="replace">Replace after checkpoint</button>'
      });
    } catch (error) {
      toast(error?.message === "too-large" ? "That backup exceeds the safe local import size." : "That file is not a valid Scaffold Seeds backup.");
    }
  }

  async function commitImport(mode) {
    const pending = state.pendingImport;
    if (!pending || !["merge", "replace"].includes(mode)) return;
    const buttons = [...modalLayer.querySelectorAll("button")];
    buttons.forEach(button => { button.disabled = true; });
    setSaveStatus("saving");
    durableCommitInFlight = true;
    try {
      const result = await PERSISTENCE.importBundle(pending.rawText, { mode, conflict: "copy", keepCurrentSettings: mode === "merge", recoveryLabel: `Before importing ${pending.fileName}` });
      durableGeneration = Number(result.snapshot.metadata?.generation || durableGeneration + 1);
      cacheSnapshot(result.snapshot);
      durableReady = true;
      failedStores.delete("durable");
      state.pendingImport = null;
      closeModal();
      setSaveStatus(failedStores.size ? "issue" : "saved");
      const importedCount = pending.validation.bundle.library.length;
      toast(`${importedCount} resource${importedCount === 1 ? "" : "s"} ${mode === "merge" ? "merged" : "restored"}. A pre-import recovery checkpoint was kept.`);
      render();
    } catch (error) {
      buttons.forEach(button => { button.disabled = false; });
      setSaveStatus("issue");
      toast("Import stopped without changing the current library. Review the file or try again.");
    } finally { durableCommitInFlight = false; }
  }

  async function clearData() {
    if (!window.confirm("Clear every saved scaffold, reflection and draft from this browser? A recovery checkpoint will be created first.")) return;
    try {
      if (durableReady) {
        durableCommitInFlight = false;
        await commitDurableSnapshot();
        if (failedStores.has("durable")) throw new Error("durable-save-failed");
        await PERSISTENCE.createRecoverySnapshot("Before clearing local data");
        durableCommitInFlight = true;
        const result = await PERSISTENCE.commitSnapshot({ product: "Scaffold Seeds", schemaVersion: 5, library: [], settings: defaultSettings, reflections: {}, preferences: {}, draft: null, aiWorkspaces: {} }, { expectedGeneration: durableGeneration, createRecovery: false });
        durableGeneration = Number(result.snapshot.metadata?.generation || durableGeneration + 1);
      }
    } catch (error) {
      durableCommitInFlight = false;
      toast("Clear stopped because a recovery checkpoint could not be confirmed.");
      return;
    }
    durableCommitInFlight = false;
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
    state.aiWorkspace = safeAIWorkspace({});
    applySettings();
    toast("Local data cleared. A recovery checkpoint is available in Settings.");
    render();
  }

  async function showRecoveryCheckpoints() {
    try {
      const snapshots = await PERSISTENCE.listRecoverySnapshots();
      openModal({ title: "Recovery checkpoints", subtitle: "Restoring creates another checkpoint first, so the current library is not silently lost.", body: snapshots.length ? `<div class="version-list">${snapshots.slice(0, 20).map(item => `<section><div><span class="eyebrow">${relativeDate(item.createdAt)}</span><h3>${esc(item.label)}</h3><p>${item.bundle?.library?.length || 0} resource${item.bundle?.library?.length === 1 ? "" : "s"}</p></div><button class="button button-compact" data-action="restore-recovery" data-id="${esc(item.id)}">Restore</button></section>`).join("")}</div>` : '<div class="empty-help"><h4>No recovery checkpoints yet</h4><p>They are created before high-risk local operations.</p></div>' });
    } catch (error) { toast("Recovery checkpoints could not be opened in this browsing mode."); }
  }

  async function restoreRecoveryCheckpoint(id) {
    try {
      durableCommitInFlight = true;
      const result = await PERSISTENCE.restoreRecoverySnapshot(id);
      durableGeneration = Number(result.snapshot.metadata?.generation || durableGeneration + 1);
      cacheSnapshot(result.snapshot);
      closeModal();
      toast("Recovery checkpoint restored. The replaced state was checkpointed too.");
      render();
    } catch (error) { toast("That recovery checkpoint could not be restored."); }
    finally { durableCommitInFlight = false; }
  }

  async function printNow() {
    const scaffold = activeForPrint();
    if (!scaffold) return;
    const format = printFormatById();
    const audit = printPreflight(scaffold, format);
    if (!audit.ready) { toast("Resolve the print preflight before printing."); return; }
    const resources = buildPrintResourcePages(scaffold, format);
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
    try { await document.fonts?.ready; } catch (error) { /* Fallback fonts preserve the layout if font loading fails. */ }
    await Promise.all([...printRoot.querySelectorAll("img")].map(image => image.decode?.().catch(() => undefined)));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const measured = measuredPrintPreflight(printRoot);
    if (measured.length) {
      printRoot.innerHTML = "";
      openModal({ title: "Print layout needs reflow", subtitle: "Nothing has been sent to the printer.", body: `<div class="audit-list">${measured.map(item => `<p>${esc(item)}</p>`).join("")}</div><p>Choose a larger paper size, reduce the number of cards, turn off larger pupil text, or split the material into another format.</p>`, footer: '<button class="button" data-action="close-modal">Return to Print Studio</button>' });
      return;
    }
    window.print();
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
    if (action === "dismiss-recovery") { state.recoveryNoticeDismissed = true; render(); }
    if (action === "create-back") {
      state.createStep = Math.max(0, state.createStep - 1);
      render();
    }
    if (action === "create-next") {
      if (state.createStep === 0 && !state.draft.objective.trim()) {
        toast("Choose or write a learning objective first.");
        return;
      }
      if (state.createStep === 1 && !state.draft.selectedBarriers.length && !state.draft.customBarrier.trim()) {
        toast("Choose or describe the barrier that best explains the sticking point.");
        return;
      }
      if (state.createStep === 1 && !state.draft.essentialThinking.trim()) {
        toast("State the thinking that must remain with pupils.");
        return;
      }
      if (state.createStep === 1 && !state.draft.engineId) {
        toast("Choose the scaffold engine that best preserves the thinking.");
        return;
      }
      state.createStep = Math.min(3, state.createStep + 1);
      saveDraft();
      render();
    }
    if (action === "analyse-barrier") {
      if (!state.draft.objective.trim()) {
        toast("Choose or write the learning objective first.");
        document.getElementById("objective")?.focus();
        return;
      }
      if (state.draft.situation.trim().length < 16) {
        toast("Add a little more detail about what pupils can do and where it breaks down.");
        document.getElementById("situation")?.focus();
        return;
      }
      analyseBarrier();
      state.createStep = 1;
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
    if (action === "generate-scaffold") {
      if (!state.draft.title.trim()) {
        toast("Give the resource a clear title first.");
        return;
      }
      state.activeScaffold = scaffoldFromDraft();
      state.createStep = 3;
      saveDraft();
      render();
    }
    if (action === "save-scaffold") saveScaffold();
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
      state.aiWorkspace.importRecovery = { rawImport: state.aiWorkspace.rawImport, parsed: state.aiWorkspace.parsed, verification: state.aiWorkspace.verification, rawPreservedAt: state.aiWorkspace.rawPreservedAt, savedAt: new Date().toISOString() };
      state.aiWorkspace.rawImport = "";
      state.aiWorkspace.parsed = null;
      state.aiWorkspace.verification = null;
      state.aiWorkspace.rawPreservedAt = null;
      if (!(state.aiWorkspace.rounds || []).length) updateAIResourceStatus("local-draft");
      saveAIWorkspace();
      render();
    }
    if (action === "ai-restore-import" && state.aiWorkspace.importRecovery) {
      const recovery = state.aiWorkspace.importRecovery;
      state.aiWorkspace.rawImport = recovery.rawImport || "";
      state.aiWorkspace.parsed = recovery.parsed || null;
      state.aiWorkspace.verification = recovery.verification || null;
      state.aiWorkspace.rawPreservedAt = recovery.rawPreservedAt || recovery.savedAt;
      state.aiWorkspace.importRecovery = null;
      updateAIResourceStatus(state.aiWorkspace.parsed ? "review-required" : "response-imported");
      saveAIWorkspace();
      toast("Previous imported response restored.");
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
        state.createStep = 2;
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
      state.createStep = 2;
      navigate("create");
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
    if (action === "recently-deleted") showRecentlyDeleted();
    if (action === "restore-deleted") restoreDeleted(id);
    if (action === "purge-deleted") purgeDeleted(id);
    if (action === "recovery-checkpoints") showRecoveryCheckpoints();
    if (action === "restore-recovery") restoreRecoveryCheckpoint(id);
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
      state.libraryVisible = 60;
      render();
    }
    if (action === "library-more") { state.libraryVisible += 60; render(); }
    if (action === "library-view") {
      state.libraryFilters.archived = id === "archived";
      state.libraryFilters.query = "";
      state.librarySelection = [];
      state.libraryVisible = 60;
      render();
    }
    if (action === "batch-clear") { state.librarySelection = []; render(); }
    if (action === "batch-export") {
      const resources = state.library.filter(item => state.librarySelection.includes(item.id)).map(item => AI.portableResource(item, { excludeHistory: !state.settings.aiIncludeResponseHistory }).resource);
      const bundle = PERSISTENCE.createBundle({ product: "Scaffold Seeds", schemaVersion: 5, exportedAt: new Date().toISOString(), resources });
      downloadText(`scaffold-seeds-selected-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2), "application/json");
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
      const selected = printFormatById(id);
      const rule = selected.release || DATA.build5?.formatRules?.[id];
      if (rule?.safePaper?.length && !rule.safePaper.includes(state.print.paper)) state.print.paper = rule.safePaper[0];
      if (rule?.preferredOrientation) state.print.orientation = rule.preferredOrientation;
      state.print.arrangement = ["cut-cards", "mini-card", "vocabulary-card"].includes(id) ? "6" : "single";
      state.print.cropMarks = ["display-poster", "cut-cards", "mini-card", "vocabulary-card"].includes(id) && state.print.cropMarks;
      state.print.cutLines = Boolean(rule?.cuttable);
      closeModal();
      render();
    }
    if (action === "copy-question") {
      const question = button.dataset.question || button.textContent.trim();
      copyText(question, "Teacher question copied.");
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
    if (action === "commit-import") commitImport(button.dataset.mode);
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
      state.aiWorkspace.rawImport = aiRaw.value.slice(0, 65000);
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
    const diagramField = event.target.closest("[data-diagram-field]");
    if (diagramField) {
      const key = diagramField.dataset.diagramField;
      const value = diagramField.dataset.listMode === "numbers"
        ? diagramField.value.split(/[,\n]/).map(item => Number(item.trim())).filter(Number.isFinite).slice(0, 24)
        : ["parts", "numerator", "rows", "columns", "total"].includes(key) && diagramField.value !== "" ? Number(diagramField.value) : diagramField.value;
      state.draft.diagram = { ...(state.draft.diagram || {}), [key]: value };
      saveDraft();
      const preview = document.getElementById("live-resource-preview");
      if (preview) preview.innerHTML = renderResourceDocument({ ...scaffoldFromDraft(), content: state.draft.content, diagram: { ...state.draft.diagram, type: state.draft.content.diagramType, labels: state.draft.content.diagramLabels } });
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
      if (state.createStep === 2) {
        const preview = document.getElementById("live-resource-preview");
        if (preview) preview.innerHTML = renderResourceDocument({ ...scaffoldFromDraft(), content: state.draft.content, diagram: { ...state.draft.diagram, type: state.draft.content.diagramType, labels: state.draft.content.diagramLabels } });
      }
      return;
    }
    const filter = event.target.closest("[data-library-filter='query']");
    if (filter) {
      state.libraryFilters.query = filter.value;
      state.libraryVisible = 60;
      clearTimeout(librarySearchTimer);
      librarySearchTimer = setTimeout(() => {
        if (state.view !== "library") return;
        const selection = filter.selectionStart;
        render();
        const refreshed = document.getElementById("library-search");
        refreshed?.focus();
        refreshed?.setSelectionRange(selection, selection);
      }, 140);
    }
  });

  document.addEventListener("change", event => {
    const printSelect = event.target.closest("[data-print-select]");
    if (printSelect) {
      state.print[printSelect.dataset.printSelect] = printSelect.value;
      render();
      return;
    }
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
    if (aiImageField && state.aiWorkspace.image) {
      const key = aiImageField.dataset.aiImageField;
      state.aiWorkspace.image[key] = key === "fit" ? (["contain", "cover"].includes(aiImageField.value) ? aiImageField.value : "contain") : aiImageField.value.slice(0, 500);
      saveAIWorkspace(); render(); return;
    }
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
      const targetWorkspace = state.aiWorkspace;
      const targetResourceId = targetWorkspace.resourceId;
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          targetWorkspace.image = normaliseLocalImage({ id: uid(), name: file.name.slice(0, 120), type: file.type, bytes: file.size, dataUrl: reader.result, width: image.naturalWidth, height: image.naturalHeight, rotation: 0, fit: "contain", caption: "", alt: "", greyscale: false, storedLocally: true, analysis: analyseLocalImage(image) });
          if (state.aiWorkspace === targetWorkspace) saveAIWorkspace();
          else if (targetResourceId) writeStore(`${STORAGE.aiWorkspace}.${targetResourceId}`, targetWorkspace);
          toast(file.size > 850000 ? "Image loaded locally. Its size may limit how many versions the browser can store." : "Image loaded locally. Add a caption and alt text before use.");
          if (state.aiWorkspace === targetWorkspace) render();
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
      state.libraryVisible = 60;
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

  menuButton.addEventListener("click", () => sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar());
  scrim.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", event => {
    const tab = event.target.closest?.('[role="tab"]');
    if (tab && ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
      const tabs = [...tab.closest('[role="tablist"]')?.querySelectorAll('[role="tab"]') || []];
      if (tabs.length) {
        event.preventDefault();
        const current = tabs.indexOf(tab);
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (current + (["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next].focus();
        tabs[next].click();
      }
    }
    if (event.key === "Tab" && !modalLayer.hidden) {
      const focusable = [...modalLayer.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(item => !item.hidden && item.getClientRects().length);
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    if (event.key === "Escape") {
      if (!modalLayer.hidden) closeModal();
      else closeSidebar();
    }
  });
  window.addEventListener("pagehide", () => { if (state.aiWorkspace) saveAIWorkspace(); saveDraft(); });
  window.addEventListener("afterprint", () => { const root = document.getElementById("print-root"); if (root) root.innerHTML = ""; });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { if (state.aiWorkspace) saveAIWorkspace(); saveDraft(); } });

  applySettings();
  hydrateIcons(document);
  render();
  initialisePersistence();
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => undefined);
})();
