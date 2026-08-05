(function (root, factory) {
  "use strict";

  const api = factory(root || globalThis);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ScaffoldPersistence = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";

  const PRODUCT = "Scaffold Seeds";
  const SCHEMA_VERSION = 5;
  const DATABASE_NAME = "scaffold-seeds.v5";
  const DATABASE_VERSION = 5;
  const CHANNEL_NAME = "scaffold-seeds.persistence.v5";
  const PULSE_KEY = "scaffold-seeds.persistence.pulse.v5";
  const MAX_IMPORT_TEXT = 60000;
  const MAX_IMAGE_BYTES = 2500000;
  const MAX_BACKUP_BYTES = 50 * 1024 * 1024;
  const MAX_BACKUP_RESOURCES = 10000;
  const MAX_RECOVERY_SNAPSHOTS = 20;
  const STORE_NAMES = ["resources", "workspaces", "versions", "assets", "drafts", "trash", "recovery", "meta"];
  const DANGEROUS_KEYS = new Set(["__proto__", "prototype", "constructor"]);

  const ENUMS = Object.freeze({
    years: ["EYFS", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"],
    subjects: ["english", "mathematics", "science", "history", "geography", "computing", "art", "design-technology", "music", "physical-education", "languages", "religious-education", "pshe"],
    stages: ["seed", "sprout", "growth", "independent"],
    phases: ["Before the lesson", "Teacher modelling", "Guided practice", "Independent practice", "Review and reflection"],
    formats: ["workpage", "laminated-card", "desk-strip", "table-card", "mini-card", "vocabulary-card", "teacher-card", "discussion-card", "group-sheet", "display-poster", "foldable", "a5-sheet", "cut-cards", "mini-booklet", "modelling-page", "presentation-board", "intervention-pack", "home-support", "mixed-pack"],
    families: ["knowledge", "vocabulary", "representation", "reasoning", "planning", "recording", "discussion", "metacognition", "assessment", "executive-function", "language", "visual-thinking"],
    printModes: ["full-colour", "soft-classroom", "pastel-classroom", "greyscale", "black-white", "high-contrast", "ink-saver"],
    legacyPrintModes: ["colour", "low-colour", "photocopy"],
    papers: ["a4", "a5"],
    orientations: ["portrait", "landscape"],
    densities: ["calm", "reduced", "spacious"],
    instructionModes: ["standard", "shorter", "one-at-a-time", "explicit", "read-aloud"],
    responseSpaces: ["standard", "large", "oral"],
    lineThicknesses: ["standard", "strong"],
    terminology: ["pupils", "children", "learners"],
    promptDepths: ["quick", "professional", "forensic"],
    reviewLevels: ["routine", "careful", "forensic"],
    aiPhases: ["task", "prompt", "import", "review", "verify"],
    aiStatuses: ["local-draft", "prompt-prepared", "response-imported", "review-required", "warnings-unresolved", "teacher-approved", "print-ready", "used-in-class", "revision-suggested"],
    severities: ["information", "review", "important", "do-not-use"],
    imageTypes: ["image/png", "image/jpeg", "image/webp"],
    imageFits: ["contain", "cover"],
    sourceTypes: ["teacher knowledge", "curriculum document", "school material", "published source", "AI generated", "reconstruction", "unverified"],
    diagramTypes: ["", "number-line", "part-whole", "place-value", "array", "bar-model", "fraction-strip", "timeline", "causal-chain", "flowchart", "classification-tree", "concept-map", "cycle"]
  });

  const DEFAULT_SETTINGS = Object.freeze({
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
    includeAnswers: false,
    defaultGrowthStages: ["sprout"],
    lineThickness: "standard",
    pageNumbers: true,
    schoolLabel: "",
    classLabel: "",
    terminology: "pupils",
    aiPromptDepth: "professional",
    aiIncludeResponseHistory: true
  });

  class PersistenceError extends Error {
    constructor(message, code = "PERSISTENCE_ERROR", details = {}) {
      super(message);
      this.name = "PersistenceError";
      this.code = code;
      this.details = details;
    }
  }

  class ConflictError extends PersistenceError {
    constructor(message, details = {}) {
      super(message, "REVISION_CONFLICT", details);
      this.name = "ConflictError";
    }
  }

  function normaliseStorageFailure(error, operation = "write") {
    if (error instanceof PersistenceError) return error;
    const name = String(error?.name || "");
    const code = Number(error?.code);
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED" || code === 22 || code === 1014) {
      return new PersistenceError("Browser storage is full. The previous durable data remains unchanged.", "STORAGE_QUOTA", {
        operation,
        unchanged: true,
        causeName: name || "QuotaExceededError"
      });
    }
    return error;
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function text(value, fallback = "", maximum = 10000) {
    if (value === undefined || value === null) return fallback;
    return String(value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
      .slice(0, maximum);
  }

  function cleanLine(value, fallback = "", maximum = 1000) {
    return text(value, fallback, maximum).replace(/\s+/g, " ").trim();
  }

  function enumValue(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function booleanValue(value, fallback = false) {
    return typeof value === "boolean" ? value : fallback;
  }

  function numberValue(value, fallback = 0, minimum = -Number.MAX_SAFE_INTEGER, maximum = Number.MAX_SAFE_INTEGER) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
  }

  function arrayOfStrings(value, maximumItems = 100, maximumLength = 1000) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, maximumItems).map(item => cleanLine(item, "", maximumLength)).filter(Boolean);
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function validDate(value, fallback) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : fallback;
  }

  function safeId(value, fallback) {
    const candidate = cleanLine(value, "", 160);
    return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(candidate) ? candidate : fallback;
  }

  function safeJsonValue(value, options = {}, seen = new WeakSet(), depth = 0) {
    const maximumDepth = options.maximumDepth ?? 12;
    const maximumArray = options.maximumArray ?? 500;
    const maximumString = options.maximumString ?? 60000;
    if (depth > maximumDepth) return null;
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "string") return text(value, "", maximumString);
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (Array.isArray(value)) return value.slice(0, maximumArray).map(item => safeJsonValue(item, options, seen, depth + 1));
    if (!isPlainObject(value)) return null;
    if (seen.has(value)) return null;
    seen.add(value);
    const output = {};
    Object.keys(value).slice(0, 500).forEach(key => {
      if (DANGEROUS_KEYS.has(key)) return;
      const safeKey = cleanLine(key, "", 120);
      if (!safeKey) return;
      const safeValue = safeJsonValue(value[key], options, seen, depth + 1);
      if (safeValue !== undefined) output[safeKey] = safeValue;
    });
    seen.delete(value);
    return output;
  }

  function clone(value) {
    if (typeof structuredClone === "function") {
      try { return structuredClone(value); } catch (error) { /* Fall through to canonical JSON clone. */ }
    }
    return JSON.parse(JSON.stringify(value));
  }

  function reportWarning(report, code, message, path = "") {
    if (report) report.warnings.push({ code, message, path });
  }

  function reportError(report, code, message, path = "") {
    if (report) report.errors.push({ code, message, path });
  }

  function decodedBase64Bytes(base64) {
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
    return Math.floor(base64.length * 3 / 4) - padding;
  }

  function normaliseImage(raw, options = {}) {
    if (!isPlainObject(raw)) return null;
    const report = options.report;
    const path = options.path || "image";
    const fallbackId = options.fallbackId || `asset-${options.index || 0}`;
    const type = enumValue(raw.type, ENUMS.imageTypes, "");
    const dataUrl = typeof raw.dataUrl === "string" ? raw.dataUrl : "";
    const assetReference = safeId(raw.assetId || raw.id, "");
    let bytes = numberValue(raw.bytes, 0, 0, MAX_IMAGE_BYTES);
    let safeDataUrl = "";

    if (dataUrl) {
      const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/i);
      if (!match) {
        reportWarning(report, "IMAGE_REJECTED", "An image used an unsupported or non-local source and was removed.", path);
        return null;
      }
      const detectedType = `image/${match[1].toLowerCase()}`;
      const detectedBytes = decodedBase64Bytes(match[2]);
      if (!ENUMS.imageTypes.includes(detectedType) || detectedBytes > MAX_IMAGE_BYTES) {
        reportWarning(report, "IMAGE_REJECTED", "An image exceeded the local image limit and was removed.", path);
        return null;
      }
      if (type && type !== detectedType) {
        reportWarning(report, "IMAGE_TYPE_REPAIRED", "Image metadata did not match its data and was corrected.", path);
      }
      safeDataUrl = `data:${detectedType};base64,${match[2]}`;
      bytes = detectedBytes;
    } else if (!assetReference || !type) {
      return null;
    }

    const id = assetReference || safeId(raw.id, fallbackId);
    const rotationValue = numberValue(raw.rotation, 0, 0, 359);
    const rotation = [0, 90, 180, 270].includes(rotationValue) ? rotationValue : 0;
    return {
      id,
      assetId: safeId(raw.assetId, id),
      name: cleanLine(raw.name, "Local image", 120),
      type: safeDataUrl ? safeDataUrl.slice(5, safeDataUrl.indexOf(";")) : type,
      bytes,
      dataUrl: safeDataUrl,
      width: numberValue(raw.width, 0, 0, 30000),
      height: numberValue(raw.height, 0, 0, 30000),
      rotation,
      fit: enumValue(raw.fit, ENUMS.imageFits, "contain"),
      caption: text(raw.caption, "", 500),
      alt: text(raw.alt, "", 500),
      greyscale: booleanValue(raw.greyscale, false),
      storedLocally: true,
      analysis: isPlainObject(raw.analysis) ? safeJsonValue(raw.analysis, { maximumDepth: 4, maximumArray: 30, maximumString: 500 }) : null,
      addedAt: validDate(raw.addedAt, options.now || new Date().toISOString())
    };
  }

  function normaliseSource(raw, options = {}) {
    if (!isPlainObject(raw)) return null;
    const origin = cleanLine(raw.type, "unverified", 80);
    return {
      id: safeId(raw.id, `source-${options.index || 0}`),
      type: ENUMS.sourceTypes.find(item => item.toLowerCase() === origin.toLowerCase()) || "unverified",
      title: text(raw.title, "", 300),
      author: text(raw.author, "", 200),
      date: text(raw.date, "", 80),
      publisher: text(raw.publisher, "", 200),
      url: /^https?:\/\/[^\s]{1,2000}$/i.test(String(raw.url || "")) ? String(raw.url).slice(0, 2000) : "",
      retrievalDate: validDate(raw.retrievalDate, options.now || new Date().toISOString()).slice(0, 10),
      note: text(raw.note, "", 1000)
    };
  }

  function normaliseFinding(raw, options = {}) {
    if (!isPlainObject(raw)) return null;
    return {
      ...safeJsonValue(raw, { maximumDepth: 5, maximumArray: 50, maximumString: 3000 }),
      id: safeId(raw.id, `finding-${options.index || 0}`),
      severity: enumValue(raw.severity, ENUMS.severities, "review"),
      severityLabel: cleanLine(raw.severityLabel, "Review", 80),
      dimension: cleanLine(raw.dimension, "Review", 80),
      validationLabel: cleanLine(raw.validationLabel, "Teacher review required", 120),
      title: text(raw.title, "Review finding", 300),
      message: text(raw.message, "", 3000),
      action: text(raw.action, "Review this item.", 1000),
      resolved: booleanValue(raw.resolved, false)
    };
  }

  function normaliseAI(raw, options = {}) {
    if (!isPlainObject(raw)) return null;
    const safe = safeJsonValue(raw, { maximumDepth: 10, maximumArray: 250, maximumString: MAX_IMPORT_TEXT });
    const rounds = Array.isArray(raw.rounds) ? raw.rounds.slice(0, 20).filter(isPlainObject).map((round, index) => ({
      ...safeJsonValue(round, { maximumDepth: 8, maximumArray: 250, maximumString: MAX_IMPORT_TEXT }),
      id: safeId(round.id, `round-${index}`),
      name: text(round.name, "AI enhancement", 160),
      rawResponse: text(round.rawResponse, "", MAX_IMPORT_TEXT),
      decisions: Array.isArray(round.decisions) ? round.decisions.slice(0, 250).map(item => safeJsonValue(item, { maximumDepth: 4, maximumArray: 20, maximumString: 5000 })).filter(Boolean) : [],
      findings: Array.isArray(round.findings) ? round.findings.slice(0, 200).map((item, findingIndex) => normaliseFinding(item, { index: findingIndex })).filter(Boolean) : [],
      createdAt: validDate(round.createdAt, options.now)
    })) : [];
    const provenance = Array.isArray(raw.provenance) ? raw.provenance.slice(0, 100).map(item => safeJsonValue(item, { maximumDepth: 5, maximumArray: 30, maximumString: 2000 })).filter(Boolean) : [];
    const lastVerification = isPlainObject(raw.lastVerification) ? {
      ...safeJsonValue(raw.lastVerification, { maximumDepth: 8, maximumArray: 250, maximumString: 5000 }),
      findings: Array.isArray(raw.lastVerification.findings) ? raw.lastVerification.findings.slice(0, 250).map((item, index) => normaliseFinding(item, { index })).filter(Boolean) : []
    } : null;
    const requestedStatus = enumValue(raw.status, ENUMS.aiStatuses, "local-draft");
    const approvalFingerprintValid = /^[a-f0-9]{64}$/i.test(String(lastVerification?.contentChecksum || ""))
      && Number.isFinite(Date.parse(lastVerification?.checkedAt || ""))
      && Array.isArray(raw.lastVerification?.findings)
      && isPlainObject(raw.approval)
      && Boolean(text(raw.approval.text, "", 1000))
      && Number.isFinite(Date.parse(raw.approval.approvedAt || ""));
    const approvalRequiresRecheck = ["teacher-approved", "print-ready"].includes(requestedStatus) && !approvalFingerprintValid;
    return {
      ...safe,
      schemaVersion: SCHEMA_VERSION,
      status: approvalRequiresRecheck ? "review-required" : requestedStatus,
      rounds,
      provenance,
      approval: approvalRequiresRecheck ? null : isPlainObject(raw.approval) ? safeJsonValue(raw.approval, { maximumDepth: 4, maximumArray: 20, maximumString: 2000 }) : null,
      lastVerification: approvalRequiresRecheck ? null : lastVerification
    };
  }

  function normaliseContent(raw) {
    const source = isPlainObject(raw) ? raw : {};
    return {
      ...safeJsonValue(source, { maximumDepth: 8, maximumArray: 100, maximumString: 12000 }),
      instruction: text(source.instruction, "", 5000),
      subInstruction: text(source.subInstruction, "", 5000),
      example: text(source.example, "", 12000),
      prompts: arrayOfStrings(source.prompts, 30, 5000),
      vocabulary: arrayOfStrings(source.vocabulary, 30, 500),
      answerGuidance: arrayOfStrings(source.answerGuidance, 50, 5000),
      misconception: text(source.misconception, "", 5000),
      teacherNotes: text(source.teacherNotes, "", 12000),
      oralPrompt: text(source.oralPrompt, "", 5000),
      checkPrompt: text(source.checkPrompt, "", 5000),
      independencePrompt: text(source.independencePrompt, "", 5000),
      diagramType: enumValue(source.diagramType, ENUMS.diagramTypes, ""),
      diagramLabels: arrayOfStrings(source.diagramLabels, 20, 300),
      responseSpace: enumValue(source.responseSpace, ENUMS.responseSpaces, "standard"),
      instructionMode: enumValue(source.instructionMode, ENUMS.instructionModes, "standard"),
      density: enumValue(source.density, ENUMS.densities, "calm"),
      oralRehearsal: booleanValue(source.oralRehearsal, false),
      hiddenSections: unique(arrayOfStrings(source.hiddenSections, 10, 50).filter(item => ["example", "vocabulary", "oral"].includes(item)))
    };
  }

  function normaliseVersion(raw, options = {}) {
    if (!isPlainObject(raw) || !isPlainObject(raw.snapshot)) return null;
    const snapshot = safeJsonValue(raw.snapshot, { maximumDepth: 12, maximumArray: 500, maximumString: MAX_IMPORT_TEXT });
    delete snapshot.versions;
    if (Array.isArray(snapshot.assets)) snapshot.assets = snapshot.assets.map((asset, index) => normaliseImage(asset, { ...options, index, path: `version.assets[${index}]` })).filter(Boolean);
    if (snapshot.ai) snapshot.ai = normaliseAI(snapshot.ai, options);
    return {
      id: safeId(raw.id, `version-${options.index || 0}`),
      name: text(raw.name, "Saved checkpoint", 160),
      savedAt: validDate(raw.savedAt, options.now),
      snapshot
    };
  }

  function normaliseResource(raw, options = {}) {
    const report = options.report;
    const path = options.path || `library[${options.index || 0}]`;
    const now = options.now || new Date().toISOString();
    if (!isPlainObject(raw)) {
      reportError(report, "RESOURCE_INVALID", "A resource was not an object and was quarantined.", path);
      return null;
    }
    if (!ENUMS.subjects.includes(raw.subject)) {
      reportError(report, "RESOURCE_SUBJECT_INVALID", "A resource had no recognised subject and was quarantined.", `${path}.subject`);
      return null;
    }
    const fallbackId = `recovered-${options.index || 0}-${String(options.idSeed || "resource")}`;
    const id = safeId(raw.id, fallbackId);
    if (id !== raw.id) reportWarning(report, "RESOURCE_ID_REPAIRED", "A missing or unsafe resource ID was replaced.", `${path}.id`);
    const createdAt = validDate(raw.createdAt, now);
    const updatedAt = validDate(raw.updatedAt, createdAt);
    const safe = safeJsonValue(raw, { maximumDepth: 12, maximumArray: 500, maximumString: MAX_IMPORT_TEXT });
    const content = normaliseContent(raw.content);
    const diagramSource = isPlainObject(raw.diagram) ? raw.diagram : {};
    const assets = Array.isArray(raw.assets) ? raw.assets.slice(0, 12).map((asset, index) => normaliseImage(asset, { report, path: `${path}.assets[${index}]`, fallbackId: `${id}-asset-${index}`, index, now })).filter(Boolean) : [];
    const sources = Array.isArray(raw.sources) ? raw.sources.slice(0, 50).map((source, index) => normaliseSource(source, { index, now })).filter(Boolean) : [];
    const versions = options.snapshot ? [] : Array.isArray(raw.versions) ? raw.versions.slice(0, 20).map((version, index) => normaliseVersion(version, { report, path: `${path}.versions[${index}]`, index, now })).filter(Boolean) : [];
    const growthStages = unique(arrayOfStrings(raw.growthStages, 4, 30).filter(stage => ENUMS.stages.includes(stage)));
    const ai = normaliseAI(raw.ai, { now });
    return {
      ...safe,
      schemaVersion: SCHEMA_VERSION,
      id,
      revision: Math.floor(numberValue(raw.revision, 0, 0, Number.MAX_SAFE_INTEGER)),
      createdAt,
      updatedAt,
      favourite: booleanValue(raw.favourite, false),
      archived: booleanValue(raw.archived, false),
      year: enumValue(raw.year, ENUMS.years, "Year 4"),
      subject: raw.subject,
      topic: text(raw.topic, "Untitled topic", 300),
      objective: text(raw.objective, "", 1000),
      phase: enumValue(raw.phase, ENUMS.phases, "Guided practice"),
      situation: text(raw.situation, "", 5000),
      expectedOutcome: text(raw.expectedOutcome, "", 3000),
      barriers: arrayOfStrings(raw.barriers, 30, 120),
      customBarrier: text(raw.customBarrier, "", 1000),
      engineId: safeId(raw.engineId, "reasoning-ladder"),
      familyId: enumValue(raw.familyId, ENUMS.families, "reasoning"),
      profileId: safeId(raw.profileId, ""),
      stage: enumValue(raw.stage, ENUMS.stages, "sprout"),
      title: text(raw.title, "Untitled scaffold", 300).trim() || "Untitled scaffold",
      vocabulary: arrayOfStrings(raw.vocabulary, 30, 500),
      misconception: text(raw.misconception, "", 3000),
      intention: text(raw.intention, "", 3000),
      essentialThinking: text(raw.essentialThinking, "", 5000),
      pupilAction: text(raw.pupilAction, "", 3000),
      removalPathway: text(raw.removalPathway, "", 3000),
      representation: text(raw.representation, "", 500),
      threshold: text(raw.threshold, "", 3000),
      disciplinaryThinking: text(raw.disciplinaryThinking, "", 5000),
      prerequisites: arrayOfStrings(raw.prerequisites, 30, 1000),
      smallSteps: arrayOfStrings(raw.smallSteps, 30, 1000),
      teacherQuestions: arrayOfStrings(raw.teacherQuestions, 30, 1000),
      assessmentOpportunities: arrayOfStrings(raw.assessmentOpportunities, 30, 1000),
      tags: arrayOfStrings(raw.tags, 30, 120),
      content,
      diagram: {
        ...safeJsonValue(diagramSource, { maximumDepth: 5, maximumArray: 40, maximumString: 1000 }),
        type: enumValue(diagramSource.type || content.diagramType, ENUMS.diagramTypes, ""),
        labels: arrayOfStrings(diagramSource.labels || content.diagramLabels, 20, 300),
        values: Array.isArray(diagramSource.values) ? diagramSource.values.slice(0, 30).map(value => numberValue(value, 0, -1000000000, 1000000000)) : []
      },
      format: enumValue(raw.format, ENUMS.formats, "workpage"),
      growthStages: growthStages.length ? growthStages : ["seed", "sprout", "growth", "independent"],
      versions,
      reflection: isPlainObject(raw.reflection) ? safeJsonValue(raw.reflection, { maximumDepth: 6, maximumArray: 50, maximumString: 5000 }) : null,
      fadeHistory: Array.isArray(raw.fadeHistory) ? raw.fadeHistory.slice(-50).map(item => safeJsonValue(item, { maximumDepth: 4, maximumArray: 10, maximumString: 500 })).filter(Boolean) : [],
      lastPrintedAt: raw.lastPrintedAt ? validDate(raw.lastPrintedAt, "") : null,
      ai,
      sources,
      assets
    };
  }

  function normaliseSettings(raw) {
    const source = isPlainObject(raw) ? raw : {};
    const safe = safeJsonValue(source, { maximumDepth: 5, maximumArray: 50, maximumString: 1000 });
    const printAliases = { colour: "full-colour", "low-colour": "soft-classroom", photocopy: "ink-saver" };
    const printMode = printAliases[source.defaultColour] || source.defaultColour;
    const growthStages = unique(arrayOfStrings(source.defaultGrowthStages, 4, 30).filter(stage => ENUMS.stages.includes(stage)));
    const favouriteSubjects = unique(arrayOfStrings(source.favouriteSubjects, 13, 50).filter(subject => ENUMS.subjects.includes(subject)));
    return {
      ...safe,
      highContrast: booleanValue(source.highContrast, DEFAULT_SETTINGS.highContrast),
      largeText: booleanValue(source.largeText, DEFAULT_SETTINGS.largeText),
      reduceMotion: booleanValue(source.reduceMotion, DEFAULT_SETTINGS.reduceMotion),
      defaultPaper: enumValue(source.defaultPaper, ENUMS.papers, DEFAULT_SETTINGS.defaultPaper),
      defaultColour: enumValue(printMode, ENUMS.printModes, DEFAULT_SETTINGS.defaultColour),
      defaultStage: enumValue(source.defaultStage, ENUMS.stages, DEFAULT_SETTINGS.defaultStage),
      interfaceScale: enumValue(source.interfaceScale, ["standard", "large"], DEFAULT_SETTINGS.interfaceScale),
      preferredDensity: enumValue(source.preferredDensity, ENUMS.densities, DEFAULT_SETTINGS.preferredDensity),
      typicalYear: enumValue(source.typicalYear, ENUMS.years, DEFAULT_SETTINGS.typicalYear),
      favouriteSubjects: favouriteSubjects.length ? favouriteSubjects : [...DEFAULT_SETTINGS.favouriteSubjects],
      includeTeacherGuidance: booleanValue(source.includeTeacherGuidance, DEFAULT_SETTINGS.includeTeacherGuidance),
      includeAnswers: booleanValue(source.includeAnswers, DEFAULT_SETTINGS.includeAnswers),
      defaultGrowthStages: growthStages.length ? growthStages : [...DEFAULT_SETTINGS.defaultGrowthStages],
      lineThickness: enumValue(source.lineThickness, ENUMS.lineThicknesses, DEFAULT_SETTINGS.lineThickness),
      pageNumbers: booleanValue(source.pageNumbers, DEFAULT_SETTINGS.pageNumbers),
      schoolLabel: text(source.schoolLabel, "", 120),
      classLabel: text(source.classLabel, "", 120),
      terminology: enumValue(source.terminology, ENUMS.terminology, DEFAULT_SETTINGS.terminology),
      aiPromptDepth: enumValue(source.aiPromptDepth, ENUMS.promptDepths, DEFAULT_SETTINGS.aiPromptDepth),
      aiIncludeResponseHistory: booleanValue(source.aiIncludeResponseHistory, DEFAULT_SETTINGS.aiIncludeResponseHistory)
    };
  }

  function normaliseWorkspace(raw, options = {}) {
    if (!isPlainObject(raw)) return null;
    const now = options.now || new Date().toISOString();
    const resourceId = safeId(raw.resourceId || options.resourceId, "");
    if (!resourceId) return null;
    const safe = safeJsonValue(raw, { maximumDepth: 12, maximumArray: 500, maximumString: MAX_IMPORT_TEXT });
    const sourceOptions = isPlainObject(raw.options) ? raw.options : {};
    const safeOptions = safeJsonValue(sourceOptions, { maximumDepth: 8, maximumArray: 100, maximumString: 5000 });
    safeOptions.depth = enumValue(sourceOptions.depth, ENUMS.promptDepths, "professional");
    safeOptions.reviewLevel = enumValue(sourceOptions.reviewLevel, ENUMS.reviewLevels, "careful");
    safeOptions.returnFormat = enumValue(sourceOptions.returnFormat, ["structured-text", "json", "plain-text"], "structured-text");
    safeOptions.stageScope = enumValue(sourceOptions.stageScope, ["all", "current", ...ENUMS.stages], "all");
    safeOptions.paper = enumValue(String(sourceOptions.paper || "").toLowerCase(), ENUMS.papers, "a4");
    safeOptions.orientation = enumValue(sourceOptions.orientation, ENUMS.orientations, "portrait");
    safeOptions.inkMode = enumValue(sourceOptions.inkMode, [...ENUMS.printModes, ...ENUMS.legacyPrintModes], "ink-saver");
    const image = normaliseImage(raw.image, { report: options.report, path: `${options.path || "workspace"}.image`, fallbackId: `${resourceId}-workspace-image`, now });
    return {
      ...safe,
      schemaVersion: SCHEMA_VERSION,
      id: safeId(raw.id, `workspace-${resourceId}`),
      resourceId,
      revision: Math.floor(numberValue(raw.revision, 0, 0, Number.MAX_SAFE_INTEGER)),
      phase: enumValue(raw.phase, ENUMS.aiPhases, "task"),
      options: safeOptions,
      rawImport: text(raw.rawImport, "", MAX_IMPORT_TEXT),
      parsed: isPlainObject(raw.parsed) ? safeJsonValue(raw.parsed, { maximumDepth: 12, maximumArray: 500, maximumString: MAX_IMPORT_TEXT }) : null,
      verification: isPlainObject(raw.verification) ? {
        ...safeJsonValue(raw.verification, { maximumDepth: 10, maximumArray: 300, maximumString: 5000 }),
        findings: Array.isArray(raw.verification.findings) ? raw.verification.findings.slice(0, 250).map((item, index) => normaliseFinding(item, { index })).filter(Boolean) : []
      } : null,
      sourceRecords: Array.isArray(raw.sourceRecords) ? raw.sourceRecords.slice(0, 50).map((source, index) => normaliseSource(source, { index, now })).filter(Boolean) : [],
      image,
      rejectedChanges: arrayOfStrings(raw.rejectedChanges, 50, 5000),
      lastSavedAt: validDate(raw.lastSavedAt, now)
    };
  }

  function canonicalise(value, seen = new WeakSet()) {
    if (value === null || typeof value === "boolean" || typeof value === "string") return value;
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (Array.isArray(value)) return value.map(item => canonicalise(item, seen));
    if (!isPlainObject(value)) return null;
    if (seen.has(value)) throw new PersistenceError("Cannot checksum a circular value.", "CHECKSUM_CIRCULAR");
    seen.add(value);
    const output = {};
    Object.keys(value).filter(key => !DANGEROUS_KEYS.has(key) && value[key] !== undefined).sort().forEach(key => {
      output[key] = canonicalise(value[key], seen);
    });
    seen.delete(value);
    return output;
  }

  function canonicalStringify(value) {
    return JSON.stringify(canonicalise(value));
  }

  function utf8Bytes(value) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(value);
    const encoded = unescape(encodeURIComponent(value));
    return Uint8Array.from(encoded, character => character.charCodeAt(0));
  }

  function sha256Fallback(value) {
    const bytes = utf8Bytes(value);
    const bitLength = bytes.length * 8;
    const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
    const input = new Uint8Array(paddedLength);
    input.set(bytes);
    input[bytes.length] = 0x80;
    const view = new DataView(input.buffer);
    const high = Math.floor(bitLength / 0x100000000);
    const low = bitLength >>> 0;
    view.setUint32(paddedLength - 8, high, false);
    view.setUint32(paddedLength - 4, low, false);
    const constants = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const words = new Uint32Array(64);
    const rotate = (number, amount) => (number >>> amount) | (number << (32 - amount));
    for (let offset = 0; offset < input.length; offset += 64) {
      for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
      for (let index = 16; index < 64; index += 1) {
        const s0 = rotate(words[index - 15], 7) ^ rotate(words[index - 15], 18) ^ (words[index - 15] >>> 3);
        const s1 = rotate(words[index - 2], 17) ^ rotate(words[index - 2], 19) ^ (words[index - 2] >>> 10);
        words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
      }
      let [a,b,c,d,e,f,g,h] = hash;
      for (let index = 0; index < 64; index += 1) {
        const sum1 = rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25);
        const choose = (e & f) ^ (~e & g);
        const temporary1 = (h + sum1 + choose + constants[index] + words[index]) >>> 0;
        const sum0 = rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22);
        const majority = (a & b) ^ (a & c) ^ (b & c);
        const temporary2 = (sum0 + majority) >>> 0;
        h = g; g = f; f = e; e = (d + temporary1) >>> 0; d = c; c = b; b = a; a = (temporary1 + temporary2) >>> 0;
      }
      hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0; hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0; hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
    }
    return hash.map(number => number.toString(16).padStart(8, "0")).join("");
  }

  function canonicalChecksumSync(value) {
    return sha256Fallback(canonicalStringify(value));
  }

  async function canonicalChecksum(value) {
    const canonical = canonicalStringify(value);
    if (root.crypto?.subtle) {
      try {
        const digest = await root.crypto.subtle.digest("SHA-256", utf8Bytes(canonical));
        return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
      } catch (error) { /* The deterministic local fallback remains available. */ }
    }
    return sha256Fallback(canonical);
  }

  function bundleForIntegrity(bundle) {
    const copy = clone(bundle);
    delete copy.integrity;
    return copy;
  }

  function withIntegrity(bundle) {
    const copy = clone(bundle);
    copy.integrity = {
      algorithm: "SHA-256",
      checksum: canonicalChecksumSync(bundleForIntegrity(copy)),
      resourceCount: Array.isArray(copy.library) ? copy.library.length : 0
    };
    return copy;
  }

  function parseInput(raw, report) {
    if (typeof raw !== "string") return raw;
    if (raw.length > MAX_BACKUP_BYTES || utf8Bytes(raw).byteLength > MAX_BACKUP_BYTES) {
      reportError(report, "BACKUP_TOO_LARGE", "The backup exceeds the safe local import limit.");
      return null;
    }
    try { return JSON.parse(raw); }
    catch (error) {
      reportError(report, "JSON_INVALID", "The backup is not valid JSON.");
      return null;
    }
  }

  function validateBundle(raw, options = {}) {
    const report = { errors: [], warnings: [], quarantined: [], detectedEnvelope: "", sourceSchemaVersion: 0, migrated: false };
    const input = parseInput(raw, report);
    if (!input) return { valid: false, ...report, bundle: null };
    let source;
    if (Array.isArray(input)) {
      source = { library: input };
      report.detectedEnvelope = "array";
      reportWarning(report, "LEGACY_ARRAY", "A legacy resource array was migrated into a full bundle.");
    } else if (isPlainObject(input)) source = input;
    else {
      reportError(report, "BUNDLE_INVALID", "The backup root must be an object or legacy resource array.");
      return { valid: false, ...report, bundle: null };
    }

    if (source.product !== undefined && source.product !== PRODUCT) reportError(report, "PRODUCT_INVALID", "This file is not a Scaffold Seeds export.", "product");
    else if (source.product === undefined) reportWarning(report, "PRODUCT_MISSING", "A legacy file without a product marker was accepted cautiously.", "product");

    const schemaVersion = Number(source.schemaVersion || source.version || 1);
    report.sourceSchemaVersion = Number.isFinite(schemaVersion) ? schemaVersion : 1;
    if (report.sourceSchemaVersion > SCHEMA_VERSION) reportError(report, "SCHEMA_FUTURE", "This backup was created by a newer Scaffold Seeds data schema.", "schemaVersion");
    report.migrated = report.sourceSchemaVersion < SCHEMA_VERSION;

    let resources;
    if (Array.isArray(source.library)) {
      resources = source.library;
      report.detectedEnvelope ||= "library";
    } else if (Array.isArray(source.resources)) {
      resources = source.resources;
      report.detectedEnvelope ||= "resources";
    } else if (isPlainObject(source.resource)) {
      resources = [source.resource];
      report.detectedEnvelope ||= "resource";
    } else {
      reportError(report, "RESOURCE_ENVELOPE_MISSING", "The file contains no library, resources or resource envelope.");
      resources = [];
    }

    const sourceResourceCount = resources.length;
    if (sourceResourceCount > MAX_BACKUP_RESOURCES) {
      reportError(report, "RESOURCE_LIMIT_EXCEEDED", `The backup contains more than ${MAX_BACKUP_RESOURCES.toLocaleString("en-GB")} resources. Split it into smaller verified backups.`, "library");
      resources = resources.slice(0, MAX_BACKUP_RESOURCES);
    }

    const requireIntegrity = options.requireIntegrity ?? (typeof raw === "string" && report.sourceSchemaVersion >= SCHEMA_VERSION);
    if (source.integrity !== undefined && !isPlainObject(source.integrity)) {
      reportError(report, "INTEGRITY_INVALID", "The backup integrity record is malformed.", "integrity");
    } else if (source.integrity?.checksum) {
      if (source.integrity.algorithm !== "SHA-256") reportError(report, "INTEGRITY_ALGORITHM_INVALID", "The backup does not use the supported SHA-256 integrity algorithm.", "integrity.algorithm");
      if (!Number.isSafeInteger(source.integrity.resourceCount) || source.integrity.resourceCount !== sourceResourceCount) {
        reportError(report, "RESOURCE_COUNT_MISMATCH", "The backup resource count does not match its integrity record.", "integrity.resourceCount");
      }
      if (!/^[a-f0-9]{64}$/i.test(String(source.integrity.checksum))) {
        reportError(report, "CHECKSUM_INVALID", "The backup integrity checksum is malformed.", "integrity.checksum");
      } else {
        try {
          const calculated = canonicalChecksumSync(bundleForIntegrity(source));
          if (calculated !== source.integrity.checksum) reportError(report, "CHECKSUM_MISMATCH", "The backup checksum does not match its contents.", "integrity.checksum");
        } catch (error) {
          reportError(report, "CHECKSUM_INVALID", "The backup could not be checksummed safely.", "integrity.checksum");
        }
      }
    } else if (requireIntegrity) {
      reportError(report, "CHECKSUM_MISSING", "A current Scaffold Seeds backup must include its integrity checksum.", "integrity");
    } else reportWarning(report, "CHECKSUM_MISSING", "This legacy export has no integrity checksum.", "integrity");

    const now = validDate(options.now, new Date().toISOString());
    const library = [];
    const ids = new Set();
    resources.forEach((resource, index) => {
      const localReport = { errors: [], warnings: [] };
      let normalised = normaliseResource(resource, { report: localReport, index, idSeed: `import-${index}`, now, path: `library[${index}]` });
      report.warnings.push(...localReport.warnings);
      if (!normalised || localReport.errors.length) {
        report.quarantined.push({ index, reason: localReport.errors.map(item => item.message).join(" ") || "Invalid resource", raw: safeJsonValue(resource, { maximumDepth: 8, maximumArray: 100, maximumString: 5000 }) });
        report.warnings.push(...localReport.errors.map(item => ({ ...item, code: `QUARANTINED_${item.code}` })));
        return;
      }
      if (ids.has(normalised.id)) {
        const originalId = normalised.id;
        let suffix = 2;
        while (ids.has(`${originalId}-import-${suffix}`)) suffix += 1;
        normalised = { ...normalised, id: `${originalId}-import-${suffix}`, title: `${normalised.title} · imported copy` };
        reportWarning(report, "DUPLICATE_ID_REPAIRED", "A duplicate resource ID was imported as a separate copy.", `library[${index}].id`);
      }
      ids.add(normalised.id);
      library.push(normalised);
    });
    if (resources.length > 0 && library.length === 0) reportError(report, "NO_VALID_RESOURCES", "Every resource in this backup was quarantined, so it cannot replace the current library.", "library");

    const rawWorkspaces = Array.isArray(source.aiWorkspaces)
      ? source.aiWorkspaces.map(workspace => [workspace?.resourceId, workspace])
      : isPlainObject(source.aiWorkspaces) ? Object.entries(source.aiWorkspaces) : [];
    const aiWorkspaces = {};
    rawWorkspaces.forEach(([resourceId, workspace], index) => {
      const normalised = normaliseWorkspace(workspace, { resourceId, report, path: `aiWorkspaces[${index}]`, now });
      if (!normalised) {
        reportWarning(report, "WORKSPACE_QUARANTINED", "A malformed AI workspace was left out of the import.", `aiWorkspaces[${index}]`);
        return;
      }
      if (!ids.has(normalised.resourceId)) {
        reportWarning(report, "WORKSPACE_ORPHANED", "An AI workspace without a matching resource was left out of the import.", `aiWorkspaces.${normalised.resourceId}`);
        return;
      }
      aiWorkspaces[normalised.resourceId] = normalised;
    });

    const assets = Array.isArray(source.assets) ? source.assets.slice(0, 100).map((asset, index) => normaliseImage(asset, { report, index, path: `assets[${index}]`, now })).filter(Boolean) : [];
    const bundle = {
      product: PRODUCT,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: validDate(source.exportedAt, now),
      library,
      settings: normaliseSettings(source.settings),
      reflections: isPlainObject(source.reflections) ? safeJsonValue(source.reflections, { maximumDepth: 4, maximumArray: 50, maximumString: 5000 }) : {},
      preferences: isPlainObject(source.preferences) ? safeJsonValue(source.preferences, { maximumDepth: 6, maximumArray: 100, maximumString: 5000 }) : {},
      draft: isPlainObject(source.draft) ? safeJsonValue(source.draft, { maximumDepth: 12, maximumArray: 300, maximumString: MAX_IMPORT_TEXT }) : null,
      aiWorkspaces,
      assets,
      metadata: isPlainObject(source.metadata) ? safeJsonValue(source.metadata, { maximumDepth: 5, maximumArray: 50, maximumString: 2000 }) : {}
    };
    return { valid: report.errors.length === 0, ...report, bundle };
  }

  function createBundle(input = {}, options = {}) {
    const source = Array.isArray(input)
      ? { library: input }
      : isPlainObject(input) && (input.library || input.resources || input.resource) ? input : { library: [] };
    const report = validateBundle({ ...source, product: PRODUCT, schemaVersion: Math.min(Number(source.schemaVersion) || SCHEMA_VERSION, SCHEMA_VERSION), integrity: undefined }, options);
    if (!report.valid || !report.bundle) throw new PersistenceError("A bundle could not be created from invalid data.", "BUNDLE_CREATE_FAILED", report);
    report.bundle.exportedAt = validDate(options.now, new Date().toISOString());
    return withIntegrity(report.bundle);
  }

  function readLegacyLocalStorage(storage, options = {}) {
    const failures = [];
    const read = (key, fallback) => {
      try {
        const raw = storage?.getItem?.(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (error) {
        failures.push({ key, message: error.message || "Could not read legacy data." });
        return fallback;
      }
    };
    const library = read("scaffold-seeds.library.v1", []);
    const aiWorkspaces = {};
    try {
      for (let index = 0; index < (storage?.length || 0); index += 1) {
        const key = storage.key(index);
        if (!key?.startsWith("scaffold-seeds.ai-workspace.v4.")) continue;
        const resourceId = key.slice("scaffold-seeds.ai-workspace.v4.".length);
        const workspace = read(key, null);
        if (workspace) aiWorkspaces[resourceId] = workspace;
      }
    } catch (error) {
      failures.push({ key: "ai-workspaces", message: error.message || "Could not enumerate legacy workspaces." });
    }
    const report = validateBundle({
      product: PRODUCT,
      schemaVersion: 4,
      library,
      settings: read("scaffold-seeds.settings.v1", {}),
      reflections: read("scaffold-seeds.reflections.v1", {}),
      preferences: read("scaffold-seeds.preferences.v3", {}),
      draft: read("scaffold-seeds.draft.v1", null),
      aiWorkspaces
    }, options);
    report.legacyReadFailures = failures;
    return report;
  }

  function invalidateCopiedApproval(resource) {
    const copy = clone(resource);
    const ai = copy?.ai;
    if (ai && (ai.lastVerification || ai.approval || ["teacher-approved", "print-ready"].includes(ai.status))) {
      copy.ai = { ...ai, status: "review-required", approval: null, lastVerification: null };
    }
    return copy;
  }

  function mergeBundles(current, incoming, options = {}) {
    const conflict = options.conflict || "copy";
    const resources = new Map((current.library || []).map(resource => [resource.id, clone(resource)]));
    const idMap = new Map();
    (incoming.library || []).forEach(resource => {
      const existing = resources.get(resource.id);
      if (!existing) {
        resources.set(resource.id, clone(resource));
        idMap.set(resource.id, resource.id);
        return;
      }
      if (canonicalChecksumSync(existing) === canonicalChecksumSync(resource)) {
        idMap.set(resource.id, resource.id);
        return;
      }
      if (conflict === "overwrite") {
        resources.set(resource.id, clone(resource));
        idMap.set(resource.id, resource.id);
        return;
      }
      if (conflict === "skip") return;
      let suffix = 2;
      let id = `${resource.id}-import-${suffix}`;
      while (resources.has(id)) { suffix += 1; id = `${resource.id}-import-${suffix}`; }
      resources.set(id, invalidateCopiedApproval({ ...clone(resource), id, title: `${resource.title} · imported copy`, revision: 0 }));
      idMap.set(resource.id, id);
    });
    const workspaces = { ...(current.aiWorkspaces || {}) };
    Object.entries(incoming.aiWorkspaces || {}).forEach(([resourceId, workspace]) => {
      const mappedId = idMap.get(resourceId);
      if (!mappedId) return;
      const copied = mappedId !== resourceId;
      if (!copied && workspaces[mappedId] && conflict !== "overwrite") return;
      workspaces[mappedId] = {
        ...clone(workspace),
        resourceId: mappedId,
        id: `workspace-${mappedId}`,
        revision: 0,
        ...(copied ? { verification: null, approvalChecked: false, appliedAt: null } : {})
      };
    });
    return createBundle({
      ...current,
      library: [...resources.values()],
      settings: options.keepCurrentSettings ? current.settings : incoming.settings,
      reflections: { ...(current.reflections || {}), ...(incoming.reflections || {}) },
      preferences: options.keepCurrentSettings ? current.preferences : { ...(current.preferences || {}), ...(incoming.preferences || {}) },
      draft: options.keepCurrentSettings ? current.draft : incoming.draft || current.draft,
      aiWorkspaces: workspaces,
      assets: [...(current.assets || []), ...(incoming.assets || [])]
    });
  }

  function requestPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new PersistenceError("IndexedDB request failed.", "IDB_REQUEST_FAILED"));
    });
  }

  function transactionPromise(transaction, rejection) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(rejection?.() || transaction.error || new PersistenceError("IndexedDB transaction failed.", "IDB_TRANSACTION_FAILED"));
      transaction.onabort = () => reject(rejection?.() || transaction.error || new PersistenceError("IndexedDB transaction was aborted.", "IDB_TRANSACTION_ABORTED"));
    });
  }

  function excessRecoveryIds(records, maximum = MAX_RECOVERY_SNAPSHOTS, protectedId = "") {
    if (!Array.isArray(records) || records.length <= maximum) return [];
    return [...records]
      .sort((a, b) => {
        if (a?.id === protectedId) return -1;
        if (b?.id === protectedId) return 1;
        const timeDifference = (Date.parse(b?.createdAt || "") || 0) - (Date.parse(a?.createdAt || "") || 0);
        return timeDifference || String(b?.id || "").localeCompare(String(a?.id || ""));
      })
      .slice(maximum)
      .map(record => record?.id)
      .filter(Boolean);
  }

  function createIndexedDBAdapter(factory, databaseName = DATABASE_NAME) {
    let databasePromise = null;
    const open = () => {
      if (databasePromise) return databasePromise;
      databasePromise = new Promise((resolve, reject) => {
        let request;
        try { request = factory.open(databaseName, DATABASE_VERSION); }
        catch (error) { reject(error); return; }
        request.onupgradeneeded = () => {
          const database = request.result;
          STORE_NAMES.forEach(name => {
            if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: name === "meta" ? "key" : "id" });
          });
          const resources = request.transaction.objectStore("resources");
          [["updatedAt", "updatedAt"], ["subject", "subject"], ["archived", "archived"], ["favourite", "favourite"], ["aiStatus", "ai.status"]].forEach(([name, keyPath]) => {
            if (!resources.indexNames.contains(name)) resources.createIndex(name, keyPath, { unique: false });
          });
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          resolve(request.result);
        };
        request.onerror = () => reject(request.error || new PersistenceError("IndexedDB could not be opened.", "IDB_OPEN_FAILED"));
        request.onblocked = () => reject(new PersistenceError("Another tab is blocking the data upgrade.", "IDB_UPGRADE_BLOCKED"));
      });
      return databasePromise;
    };

    async function snapshot() {
      const database = await open();
      const transaction = database.transaction(["resources", "workspaces", "assets", "meta"], "readonly");
      const completed = transactionPromise(transaction);
      const resourcesRequest = transaction.objectStore("resources").getAll();
      const workspacesRequest = transaction.objectStore("workspaces").getAll();
      const assetsRequest = transaction.objectStore("assets").getAll();
      const metadataRequest = transaction.objectStore("meta").getAll();
      const [library, workspaces, assets, metadataRecords] = await Promise.all([requestPromise(resourcesRequest), requestPromise(workspacesRequest), requestPromise(assetsRequest), requestPromise(metadataRequest)]);
      await completed;
      const metadata = Object.fromEntries(metadataRecords.map(record => [record.key, record.value]));
      return { library, aiWorkspaces: Object.fromEntries(workspaces.map(workspace => [workspace.resourceId, workspace])), assets, metadata };
    }

    async function commitBundle(bundle, options = {}) {
      const database = await open();
      const transaction = database.transaction(["resources", "workspaces", "assets", "meta", "recovery"], "readwrite");
      const metaStore = transaction.objectStore("meta");
      let failure = null;
      let committedGeneration = 0;
      const generationRequest = metaStore.get("generation");
      generationRequest.onsuccess = () => {
        try {
          const generation = Number(generationRequest.result?.value || 0);
          if (options.expectedGeneration !== undefined && generation !== options.expectedGeneration) {
            failure = new ConflictError("The library changed in another tab before this transaction could commit.", { expected: options.expectedGeneration, actual: generation });
            transaction.abort();
            return;
          }
          committedGeneration = generation + 1;
          const resources = transaction.objectStore("resources");
          const workspaces = transaction.objectStore("workspaces");
          const assets = transaction.objectStore("assets");
          resources.clear(); workspaces.clear(); assets.clear();
          bundle.library.forEach(resource => resources.put(clone(resource)));
          Object.values(bundle.aiWorkspaces || {}).forEach(workspace => workspaces.put({ ...clone(workspace), workspaceId: workspace.id, id: workspace.resourceId }));
          (bundle.assets || []).forEach(asset => assets.put(clone(asset)));
          [["settings", bundle.settings], ["reflections", bundle.reflections], ["preferences", bundle.preferences], ["draft", bundle.draft], ["bundleMetadata", bundle.metadata || {}], ["generation", committedGeneration], ["schemaVersion", SCHEMA_VERSION]].forEach(([key, value]) => metaStore.put({ key, value: clone(value) }));
          if (options.recoveryRecord) {
            const recovery = transaction.objectStore("recovery");
            recovery.put(clone(options.recoveryRecord));
            const recoveryRequest = recovery.getAll();
            recoveryRequest.onsuccess = () => excessRecoveryIds(recoveryRequest.result, MAX_RECOVERY_SNAPSHOTS, options.recoveryRecord.id).forEach(id => recovery.delete(id));
            recoveryRequest.onerror = () => {
              failure = recoveryRequest.error || new PersistenceError("Recovery retention could not be applied.", "RECOVERY_RETENTION_FAILED");
              transaction.abort();
            };
          }
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      generationRequest.onerror = () => { failure = generationRequest.error; };
      await transactionPromise(transaction, () => failure);
      return { generation: committedGeneration };
    }

    async function putRecord(storeName, record, options = {}) {
      const database = await open();
      const incrementGeneration = options.incrementGeneration !== false;
      const transaction = database.transaction(incrementGeneration ? [storeName, "meta"] : [storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const meta = incrementGeneration ? transaction.objectStore("meta") : null;
      let output;
      let failure = null;
      const existingRequest = store.get(record.id);
      existingRequest.onsuccess = () => {
        try {
          const existing = existingRequest.result;
          if (options.requireAbsent && existing) {
            failure = new ConflictError("A record already uses this ID.", { id: record.id, remote: existing });
            transaction.abort();
            return;
          }
          const revision = Number(existing?.revision || 0);
          if (options.expectedRevision !== undefined && revision !== options.expectedRevision) {
            failure = new ConflictError("This record changed in another tab.", { id: record.id, expected: options.expectedRevision, actual: revision, remote: existing });
            transaction.abort();
            return;
          }
          output = { ...clone(record), revision: revision + 1 };
          store.put(output);
          if (incrementGeneration) {
            const generationRequest = meta.get("generation");
            generationRequest.onsuccess = () => meta.put({ key: "generation", value: Number(generationRequest.result?.value || 0) + 1 });
          }
          if (options.maximumRecords) {
            const recordsRequest = store.getAll();
            recordsRequest.onsuccess = () => excessRecoveryIds(recordsRequest.result, options.maximumRecords, output.id).forEach(id => store.delete(id));
            recordsRequest.onerror = () => {
              failure = recordsRequest.error || new PersistenceError("Record retention could not be applied.", "RETENTION_FAILED");
              transaction.abort();
            };
          }
        } catch (error) { failure = error; transaction.abort(); }
      };
      await transactionPromise(transaction, () => failure);
      return output;
    }

    async function getRecord(storeName, id) {
      const database = await open();
      const transaction = database.transaction(storeName, "readonly");
      const completed = transactionPromise(transaction);
      const result = await requestPromise(transaction.objectStore(storeName).get(id));
      await completed;
      return result || null;
    }

    async function getAll(storeName) {
      const database = await open();
      const transaction = database.transaction(storeName, "readonly");
      const completed = transactionPromise(transaction);
      const result = await requestPromise(transaction.objectStore(storeName).getAll());
      await completed;
      return result;
    }

    async function deleteRecord(storeName, id) {
      const database = await open();
      const transaction = database.transaction(storeName, "readwrite");
      const completed = transactionPromise(transaction);
      transaction.objectStore(storeName).delete(id);
      await completed;
    }

    async function softDelete(id, options = {}) {
      const database = await open();
      const transaction = database.transaction(["resources", "workspaces", "trash", "meta"], "readwrite");
      let failure = null;
      const completed = transactionPromise(transaction, () => failure);
      const resources = transaction.objectStore("resources");
      const workspaces = transaction.objectStore("workspaces");
      const trash = transaction.objectStore("trash");
      const meta = transaction.objectStore("meta");
      const resourceRequest = resources.get(id);
      const workspaceRequest = workspaces.get(id);
      const generationRequest = meta.get("generation");
      const draftRequest = meta.get("draft");
      let resource, workspace, generation, draft;
      try {
        [resource, workspace, generation, draft] = await Promise.all([requestPromise(resourceRequest), requestPromise(workspaceRequest), requestPromise(generationRequest), requestPromise(draftRequest)]);
      } catch (error) {
        failure = error;
        try { transaction.abort(); } catch (abortError) { /* already inactive */ }
        await completed;
      }
      if (!resource) {
        failure = new PersistenceError("Resource not found.", "NOT_FOUND", { id });
        transaction.abort();
        await completed;
      }
      const currentGeneration = Number(generation?.value || 0);
      if (options.expectedGeneration !== undefined && currentGeneration !== options.expectedGeneration) {
        failure = new ConflictError("The library changed in another tab before this resource could be deleted.", { expected: options.expectedGeneration, actual: currentGeneration });
        transaction.abort();
        await completed;
      }
      if (options.expectedRevision !== undefined && Number(resource.revision || 0) !== options.expectedRevision) {
        failure = new ConflictError("This resource changed in another tab.", { id, expected: options.expectedRevision, actual: Number(resource.revision || 0), remote: resource });
        transaction.abort();
        await completed;
      }
      const deletedAt = options.now || new Date().toISOString();
      const output = { id, resource: clone(resource), workspace: workspace ? clone(workspace) : null, deletedAt, purgeAfter: new Date(new Date(deletedAt).getTime() + 30 * 86400000).toISOString() };
      trash.put(output); resources.delete(id); workspaces.delete(id);
      if (draft?.value?.editingId === id) meta.put({ key: "draft", value: null });
      meta.put({ key: "generation", value: Number(generation?.value || 0) + 1 });
      await completed;
      return output;
    }

    async function putDeletedRecord(record, options = {}) {
      const database = await open();
      const transaction = database.transaction(["resources", "workspaces", "trash", "meta"], "readwrite");
      let failure = null;
      const completed = transactionPromise(transaction, () => failure);
      const resources = transaction.objectStore("resources");
      const workspaces = transaction.objectStore("workspaces");
      const trash = transaction.objectStore("trash");
      const meta = transaction.objectStore("meta");
      let current, currentWorkspace, currentDeleted, generation;
      try {
        [current, currentWorkspace, currentDeleted, generation] = await Promise.all([
          requestPromise(resources.get(record.id)),
          requestPromise(workspaces.get(record.id)),
          requestPromise(trash.get(record.id)),
          requestPromise(meta.get("generation"))
        ]);
      } catch (error) {
        failure = error;
        try { transaction.abort(); } catch (abortError) { /* already inactive */ }
        await completed;
      }
      if (options.requireAbsent && (current || currentWorkspace || currentDeleted)) {
        failure = new ConflictError("A current or deleted record already uses this ID.", { id: record.id, remote: current || currentDeleted || currentWorkspace });
        transaction.abort();
        await completed;
      }
      trash.put(clone(record));
      meta.put({ key: "generation", value: Number(generation?.value || 0) + 1 });
      await completed;
      return clone(record);
    }

    async function restoreDeleted(id) {
      const database = await open();
      const transaction = database.transaction(["resources", "workspaces", "trash", "meta"], "readwrite");
      let failure = null;
      const completed = transactionPromise(transaction, () => failure);
      const resources = transaction.objectStore("resources");
      const workspaces = transaction.objectStore("workspaces");
      const trash = transaction.objectStore("trash");
      const meta = transaction.objectStore("meta");
      const trashRequest = trash.get(id);
      const currentRequest = resources.get(id);
      const generationRequest = meta.get("generation");
      const [record, current, generation] = await Promise.all([requestPromise(trashRequest), requestPromise(currentRequest), requestPromise(generationRequest)]);
      if (!record) {
        failure = new PersistenceError("Deleted resource not found.", "NOT_FOUND", { id });
        transaction.abort();
        await completed;
      }
      if (current) {
        failure = new ConflictError("A current resource already uses this ID.", { id, remote: current });
        transaction.abort();
        await completed;
      }
      const output = { ...clone(record.resource), revision: Number(record.resource.revision || 0) + 1, updatedAt: new Date().toISOString() };
      resources.put(output);
      if (record.workspace) workspaces.put({ ...clone(record.workspace), id, workspaceId: record.workspace.workspaceId || record.workspace.id, revision: Number(record.workspace.revision || 0) + 1 });
      trash.delete(id);
      meta.put({ key: "generation", value: Number(generation?.value || 0) + 1 });
      await completed;
      return output;
    }

    return { kind: "indexeddb", persistent: true, open, snapshot, commitBundle, putRecord, getRecord, getAll, deleteRecord, softDelete, putDeletedRecord, restoreDeleted, close: async () => { const database = await open(); database.close(); databasePromise = null; } };
  }

  function createMemoryAdapter() {
    const stores = Object.fromEntries(STORE_NAMES.map(name => [name, new Map()]));
    stores.meta.set("generation", { key: "generation", value: 0 });
    const snapshot = async () => {
      const metadata = Object.fromEntries([...stores.meta.values()].map(record => [record.key, clone(record.value)]));
      return {
        library: [...stores.resources.values()].map(clone),
        aiWorkspaces: Object.fromEntries([...stores.workspaces.values()].map(workspace => [workspace.resourceId, clone(workspace)])),
        assets: [...stores.assets.values()].map(clone),
        metadata
      };
    };
    const commitBundle = async (bundle, options = {}) => {
      const generation = Number(stores.meta.get("generation")?.value || 0);
      if (options.expectedGeneration !== undefined && generation !== options.expectedGeneration) throw new ConflictError("The in-memory library changed before commit.", { expected: options.expectedGeneration, actual: generation });
      const nextResources = new Map(bundle.library.map(resource => [resource.id, clone(resource)]));
      const nextWorkspaces = new Map(Object.values(bundle.aiWorkspaces || {}).map(workspace => [workspace.resourceId, clone(workspace)]));
      const nextAssets = new Map((bundle.assets || []).map(asset => [asset.id, clone(asset)]));
      stores.resources = nextResources; stores.workspaces = nextWorkspaces; stores.assets = nextAssets;
      [["settings", bundle.settings], ["reflections", bundle.reflections], ["preferences", bundle.preferences], ["draft", bundle.draft], ["bundleMetadata", bundle.metadata || {}], ["generation", generation + 1], ["schemaVersion", SCHEMA_VERSION]].forEach(([key, value]) => stores.meta.set(key, { key, value: clone(value) }));
      if (options.recoveryRecord) {
        stores.recovery.set(options.recoveryRecord.id, clone(options.recoveryRecord));
        excessRecoveryIds([...stores.recovery.values()], MAX_RECOVERY_SNAPSHOTS, options.recoveryRecord.id).forEach(id => stores.recovery.delete(id));
      }
      return { generation: generation + 1 };
    };
    const putRecord = async (storeName, record, options = {}) => {
      const store = stores[storeName];
      const existing = store.get(record.id);
      if (options.requireAbsent && existing) throw new ConflictError("A record already uses this ID.", { id: record.id, remote: clone(existing) });
      const revision = Number(existing?.revision || 0);
      if (options.expectedRevision !== undefined && revision !== options.expectedRevision) throw new ConflictError("This in-memory record changed.", { id: record.id, expected: options.expectedRevision, actual: revision, remote: clone(existing) });
      const output = { ...clone(record), revision: revision + 1 };
      store.set(output.id, output);
      if (options.maximumRecords) excessRecoveryIds([...store.values()], options.maximumRecords, output.id).forEach(id => store.delete(id));
      if (options.incrementGeneration !== false) {
        const generation = Number(stores.meta.get("generation")?.value || 0) + 1;
        stores.meta.set("generation", { key: "generation", value: generation });
      }
      return clone(output);
    };
    const getRecord = async (storeName, id) => stores[storeName].has(id) ? clone(stores[storeName].get(id)) : null;
    const getAll = async storeName => [...stores[storeName].values()].map(clone);
    const deleteRecord = async (storeName, id) => { stores[storeName].delete(id); };
    const softDelete = async (id, options = {}) => {
      const resource = stores.resources.get(id);
      if (!resource) throw new PersistenceError("Resource not found.", "NOT_FOUND", { id });
      const generation = Number(stores.meta.get("generation")?.value || 0);
      if (options.expectedGeneration !== undefined && generation !== options.expectedGeneration) throw new ConflictError("The in-memory library changed before this resource could be deleted.", { expected: options.expectedGeneration, actual: generation });
      if (options.expectedRevision !== undefined && Number(resource.revision || 0) !== options.expectedRevision) throw new ConflictError("This resource changed.", { id, expected: options.expectedRevision, actual: Number(resource.revision || 0), remote: clone(resource) });
      const deletedAt = options.now || new Date().toISOString();
      const record = { id, resource: clone(resource), workspace: stores.workspaces.has(id) ? clone(stores.workspaces.get(id)) : null, deletedAt, purgeAfter: new Date(new Date(deletedAt).getTime() + 30 * 86400000).toISOString() };
      stores.trash.set(id, record); stores.resources.delete(id); stores.workspaces.delete(id);
      if (stores.meta.get("draft")?.value?.editingId === id) stores.meta.set("draft", { key: "draft", value: null });
      stores.meta.set("generation", { key: "generation", value: generation + 1 });
      return clone(record);
    };
    const putDeletedRecord = async (record, options = {}) => {
      const current = stores.resources.get(record.id);
      const currentWorkspace = stores.workspaces.get(record.id);
      const currentDeleted = stores.trash.get(record.id);
      if (options.requireAbsent && (current || currentWorkspace || currentDeleted)) throw new ConflictError("A current or deleted record already uses this ID.", { id: record.id, remote: clone(current || currentDeleted || currentWorkspace) });
      stores.trash.set(record.id, clone(record));
      const generation = Number(stores.meta.get("generation")?.value || 0) + 1;
      stores.meta.set("generation", { key: "generation", value: generation });
      return clone(record);
    };
    const restoreDeleted = async id => {
      const record = stores.trash.get(id);
      if (!record) throw new PersistenceError("Deleted resource not found.", "NOT_FOUND", { id });
      if (stores.resources.has(id)) throw new ConflictError("A current resource already uses this ID.", { id });
      const resource = { ...clone(record.resource), revision: Number(record.resource.revision || 0) + 1, updatedAt: new Date().toISOString() };
      stores.resources.set(id, resource);
      if (record.workspace) stores.workspaces.set(id, { ...clone(record.workspace), revision: Number(record.workspace.revision || 0) + 1 });
      stores.trash.delete(id);
      const generation = Number(stores.meta.get("generation")?.value || 0) + 1;
      stores.meta.set("generation", { key: "generation", value: generation });
      return clone(resource);
    };
    return { kind: "memory", persistent: false, open: async () => null, snapshot, commitBundle, putRecord, getRecord, getAll, deleteRecord, softDelete, putDeletedRecord, restoreDeleted, close: async () => {} };
  }

  const localSubscribers = new Set();
  let broadcastChannel = null;
  let storageListenerAttached = false;

  function dispatchChange(message) {
    localSubscribers.forEach(listener => {
      try { listener(clone(message)); } catch (error) { /* Subscribers cannot break persistence. */ }
    });
  }

  function initialiseNotifications() {
    const browserContext = typeof root.document !== "undefined" || root.window === root;
    if (browserContext && !broadcastChannel && typeof root.BroadcastChannel === "function") {
      try {
        broadcastChannel = new root.BroadcastChannel(CHANNEL_NAME);
        broadcastChannel.onmessage = event => dispatchChange(event.data || {});
      } catch (error) { broadcastChannel = null; }
    }
    if (!storageListenerAttached && typeof root.addEventListener === "function") {
      root.addEventListener("storage", event => {
        if (event.key !== PULSE_KEY || !event.newValue) return;
        try { dispatchChange(JSON.parse(event.newValue)); } catch (error) { /* Ignore malformed pulses. */ }
      });
      storageListenerAttached = true;
    }
  }

  function notifyChange(message) {
    const event = { ...message, at: new Date().toISOString() };
    dispatchChange(event);
    try { broadcastChannel?.postMessage(event); } catch (error) { /* storage pulse remains. */ }
    try { root.localStorage?.setItem(PULSE_KEY, JSON.stringify(event)); root.localStorage?.removeItem(PULSE_KEY); } catch (error) { /* Memory-only operation remains safe. */ }
  }

  function subscribe(listener) {
    if (typeof listener !== "function") throw new TypeError("A persistence subscriber must be a function.");
    initialiseNotifications();
    localSubscribers.add(listener);
    return () => localSubscribers.delete(listener);
  }

  function createRepository(options = {}) {
    let adapter = null;
    let fallbackReason = "";
    let sessionId = safeId(options.sessionId, `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

    function subscribeRepository(listener, subscribeOptions = {}) {
      if (typeof listener !== "function") throw new TypeError("A persistence subscriber must be a function.");
      return subscribe(event => {
        if (subscribeOptions.remoteOnly && event?.sessionId === sessionId) return;
        listener(event);
      });
    }

    async function open() {
      if (adapter) return capabilities();
      if (!options.forceMemory && (options.indexedDB || root.indexedDB)) {
        try {
          adapter = createIndexedDBAdapter(options.indexedDB || root.indexedDB, options.databaseName || DATABASE_NAME);
          await adapter.open();
        } catch (error) {
          fallbackReason = error?.message || "IndexedDB is unavailable.";
          adapter = createMemoryAdapter();
          await adapter.open();
        }
      } else {
        fallbackReason = options.forceMemory ? "Memory mode was requested." : "IndexedDB is unavailable.";
        adapter = createMemoryAdapter();
        await adapter.open();
      }
      initialiseNotifications();
      return capabilities();
    }

    function capabilities() {
      return {
        backend: adapter?.kind || "unopened",
        persistent: Boolean(adapter?.persistent),
        transactional: Boolean(adapter?.persistent),
        multiTabSignals: Boolean(broadcastChannel || typeof root.addEventListener === "function"),
        schemaVersion: SCHEMA_VERSION,
        fallbackReason
      };
    }

    async function rawSnapshot() {
      await open();
      return adapter.snapshot();
    }

    async function getSnapshot() {
      const raw = await rawSnapshot();
      return createBundle({
        product: PRODUCT,
        schemaVersion: SCHEMA_VERSION,
        library: raw.library,
        settings: raw.metadata.settings || DEFAULT_SETTINGS,
        reflections: raw.metadata.reflections || {},
        preferences: raw.metadata.preferences || {},
        draft: raw.metadata.draft || null,
        aiWorkspaces: raw.aiWorkspaces,
        assets: raw.assets,
        metadata: { ...(raw.metadata.bundleMetadata || {}), generation: Number(raw.metadata.generation || 0), backend: adapter.kind }
      });
    }

    async function createRecoverySnapshot(label = "Recovery snapshot", suppliedBundle = null) {
      await open();
      let bundle;
      if (suppliedBundle !== null && suppliedBundle !== undefined) {
        const validation = validateBundle(suppliedBundle);
        if (!validation.valid || !validation.bundle) throw new PersistenceError("The supplied recovery state did not pass validation.", "RECOVERY_BUNDLE_INVALID", validation);
        bundle = withIntegrity(validation.bundle);
      } else bundle = await getSnapshot();
      const id = `recovery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const record = { id, label: text(label, "Recovery snapshot", 160), createdAt: new Date().toISOString(), bundle };
      let saved;
      try {
        saved = await adapter.putRecord("recovery", record, { incrementGeneration: false, maximumRecords: MAX_RECOVERY_SNAPSHOTS });
      } catch (error) {
        throw normaliseStorageFailure(error, "create-recovery");
      }
      notifyChange({ type: "recovery-created", id, sessionId });
      return saved || record;
    }

    async function commitSnapshot(raw, options = {}) {
      await open();
      const validation = validateBundle(raw, options);
      if (!validation.valid) throw new PersistenceError("The snapshot did not pass validation.", "BUNDLE_INVALID", validation);
      const current = await rawSnapshot();
      const currentGeneration = Number(current.metadata.generation || 0);
      const expectedGeneration = options.expectedGeneration ?? currentGeneration;
      if (expectedGeneration !== currentGeneration) {
        throw new ConflictError("The library changed before the snapshot could be prepared.", { expected: expectedGeneration, actual: currentGeneration });
      }
      const recovery = options.createRecovery === false ? null : {
        id: `recovery-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        label: text(options.recoveryLabel, "Before snapshot commit", 160),
        createdAt: new Date().toISOString(),
        bundle: await getSnapshot()
      };
      let commitResult;
      try {
        commitResult = await adapter.commitBundle(validation.bundle, { expectedGeneration, recoveryRecord: recovery });
      } catch (error) {
        throw normaliseStorageFailure(error, "commit-snapshot");
      }
      const committedSnapshot = withIntegrity({
        ...clone(validation.bundle),
        metadata: {
          ...(validation.bundle.metadata || {}),
          generation: Number(commitResult?.generation || expectedGeneration + 1),
          backend: adapter.kind
        }
      });
      notifyChange({ type: "snapshot-committed", mode: options.mode || "replace", sessionId });
      return { validation, recoveryId: recovery?.id || null, snapshot: committedSnapshot };
    }

    async function importBundle(raw, options = {}) {
      await open();
      if (typeof raw === "string" && raw.length > MAX_BACKUP_BYTES) throw new PersistenceError("The backup exceeds the safe import limit.", "BACKUP_TOO_LARGE");
      const validation = validateBundle(raw, options);
      if (!validation.valid) throw new PersistenceError("The backup did not pass validation.", "BUNDLE_INVALID", validation);
      const current = await getSnapshot();
      const finalBundle = options.mode === "replace" ? createBundle(validation.bundle) : mergeBundles(current, validation.bundle, { conflict: options.conflict || "copy", keepCurrentSettings: options.keepCurrentSettings });
      const result = await commitSnapshot(finalBundle, { expectedGeneration: Number(current.metadata?.generation || 0), recoveryLabel: options.recoveryLabel || "Before backup import", mode: options.mode || "merge" });
      return { ...result, importValidation: validation };
    }

    async function putResource(raw, options = {}) {
      await open();
      const report = { errors: [], warnings: [] };
      const resource = normaliseResource(raw, { report, now: new Date().toISOString(), path: "resource" });
      if (!resource || report.errors.length) throw new PersistenceError("The resource did not pass validation.", "RESOURCE_INVALID", report);
      const saved = await adapter.putRecord("resources", resource, options);
      notifyChange({ type: "resource-updated", id: saved.id, revision: saved.revision, sessionId });
      return saved;
    }

    async function putWorkspace(raw, options = {}) {
      await open();
      const report = { errors: [], warnings: [] };
      const workspace = normaliseWorkspace(raw, { report, now: new Date().toISOString(), path: "workspace" });
      if (!workspace) throw new PersistenceError("The workspace did not pass validation.", "WORKSPACE_INVALID", report);
      const record = { ...workspace, workspaceId: workspace.id, id: workspace.resourceId };
      const saved = await adapter.putRecord("workspaces", record, options);
      notifyChange({ type: "workspace-updated", id: saved.resourceId, revision: saved.revision, sessionId });
      return { ...saved, id: workspace.id };
    }

    async function getResource(id) { await open(); return adapter.getRecord("resources", id); }
    async function getWorkspace(resourceId) { await open(); const value = await adapter.getRecord("workspaces", resourceId); return value ? { ...value, id: value.workspaceId || (value.id === resourceId ? `workspace-${resourceId}` : value.id) } : null; }
    async function listResources() { await open(); return adapter.getAll("resources"); }
    async function listRecoverySnapshots() { await open(); return (await adapter.getAll("recovery")).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
    async function getRecoverySnapshot(id) { await open(); return adapter.getRecord("recovery", id); }
    async function deleteRecoverySnapshot(id) { await open(); await adapter.deleteRecord("recovery", id); notifyChange({ type: "recovery-removed", id, sessionId }); }
    async function restoreRecoverySnapshot(id) {
      const record = await getRecoverySnapshot(id);
      if (!record?.bundle) throw new PersistenceError("Recovery snapshot not found.", "NOT_FOUND", { id });
      return importBundle(record.bundle, { mode: "replace", recoveryLabel: "Before recovery restore" });
    }
    async function softDelete(id, options = {}) { await open(); const result = await adapter.softDelete(id, options); notifyChange({ type: "resource-deleted", id, sessionId }); return result; }
    async function importDeletedRecord(raw, options = {}) {
      await open();
      if (!isPlainObject(raw) || !isPlainObject(raw.resource)) throw new PersistenceError("The deleted record did not contain a resource.", "DELETED_RECORD_INVALID");
      const now = options.now || new Date().toISOString();
      const report = { errors: [], warnings: [] };
      const resource = normaliseResource(raw.resource, { report, now, path: "deleted.resource" });
      if (!resource || report.errors.length) throw new PersistenceError("The deleted resource did not pass validation.", "DELETED_RECORD_INVALID", report);
      let workspace = null;
      if (isPlainObject(raw.workspace)) {
        const normalised = normaliseWorkspace({ ...raw.workspace, resourceId: resource.id }, { report, now, path: "deleted.workspace" });
        if (!normalised) throw new PersistenceError("The deleted AI workspace did not pass validation.", "DELETED_WORKSPACE_INVALID", report);
        workspace = { ...normalised, workspaceId: normalised.id, id: resource.id };
      }
      const deletedAt = validDate(raw.deletedAt, now);
      const defaultPurge = new Date(new Date(deletedAt).getTime() + 30 * 86400000).toISOString();
      const record = { id: resource.id, resource, workspace, deletedAt, purgeAfter: validDate(raw.purgeAfter, defaultPurge) };
      let saved;
      try { saved = await adapter.putDeletedRecord(record, { ...options, requireAbsent: options.requireAbsent !== false }); }
      catch (error) { throw normaliseStorageFailure(error, "import-deleted"); }
      notifyChange({ type: "resource-deleted", id: resource.id, sessionId });
      return saved;
    }
    async function restoreDeleted(id) { await open(); const result = await adapter.restoreDeleted(id); notifyChange({ type: "resource-restored", id, revision: result.revision, sessionId }); return result; }
    async function listDeleted() { await open(); return adapter.getAll("trash"); }
    async function purgeDeleted(id) { await open(); await adapter.deleteRecord("trash", id); notifyChange({ type: "resource-purged", id, sessionId }); }
    async function putAsset(raw, options = {}) {
      await open();
      const asset = normaliseImage(raw, { report: options.report, fallbackId: `asset-${Date.now().toString(36)}` });
      if (!asset) throw new PersistenceError("The image did not pass local validation.", "IMAGE_INVALID");
      const saved = await adapter.putRecord("assets", asset, options);
      notifyChange({ type: "asset-updated", id: saved.id, revision: saved.revision, sessionId });
      return saved;
    }
    async function getAsset(id) { await open(); return adapter.getRecord("assets", id); }
    async function estimateStorage() {
      await open();
      if (root.navigator?.storage?.estimate) {
        try {
          const estimate = await root.navigator.storage.estimate();
          return { backend: adapter.kind, persistent: adapter.persistent, usage: Number(estimate.usage || 0), quota: Number(estimate.quota || 0), ratio: estimate.quota ? Number(estimate.usage || 0) / Number(estimate.quota) : null };
        } catch (error) { /* Estimate the current serialisable snapshot below. */ }
      }
      const snapshot = await getSnapshot();
      return { backend: adapter.kind, persistent: adapter.persistent, usage: canonicalStringify(snapshot).length * 2, quota: null, ratio: null, estimated: true };
    }
    async function close() { if (adapter) await adapter.close(); adapter = null; }

    return {
      open, close, capabilities, getSnapshot, commitSnapshot, importBundle,
      createRecoverySnapshot, listRecoverySnapshots, getRecoverySnapshot, deleteRecoverySnapshot, restoreRecoverySnapshot,
      putResource, getResource, listResources, putWorkspace, getWorkspace,
      softDelete, importDeletedRecord, restoreDeleted, listDeleted, purgeDeleted,
      putAsset, getAsset, estimateStorage, subscribe: subscribeRepository
    };
  }

  let defaultRepository = null;
  function repository() {
    if (!defaultRepository) defaultRepository = createRepository();
    return defaultRepository;
  }
  const proxy = method => (...args) => repository()[method](...args);

  return Object.freeze({
    PRODUCT, SCHEMA_VERSION, DATABASE_NAME, ENUMS, DEFAULT_SETTINGS, MAX_IMPORT_TEXT, MAX_IMAGE_BYTES, MAX_BACKUP_BYTES, MAX_BACKUP_RESOURCES, MAX_RECOVERY_SNAPSHOTS,
    PersistenceError, ConflictError,
    isPlainObject, safeJsonValue, normaliseImage, normaliseResource, normaliseSettings, normaliseWorkspace,
    canonicalStringify, canonicalChecksumSync, canonicalChecksum, withIntegrity,
    validateBundle, createBundle, mergeBundles, readLegacyLocalStorage,
    createRepository, subscribe: proxy("subscribe"),
    open: proxy("open"), close: proxy("close"), capabilities: () => repository().capabilities(),
    getSnapshot: proxy("getSnapshot"), commitSnapshot: proxy("commitSnapshot"), importBundle: proxy("importBundle"),
    createRecoverySnapshot: proxy("createRecoverySnapshot"), listRecoverySnapshots: proxy("listRecoverySnapshots"), getRecoverySnapshot: proxy("getRecoverySnapshot"), deleteRecoverySnapshot: proxy("deleteRecoverySnapshot"), restoreRecoverySnapshot: proxy("restoreRecoverySnapshot"),
    putResource: proxy("putResource"), getResource: proxy("getResource"), listResources: proxy("listResources"), putWorkspace: proxy("putWorkspace"), getWorkspace: proxy("getWorkspace"),
    softDelete: proxy("softDelete"), importDeletedRecord: proxy("importDeletedRecord"), restoreDeleted: proxy("restoreDeleted"), listDeleted: proxy("listDeleted"), purgeDeleted: proxy("purgeDeleted"),
    putAsset: proxy("putAsset"), getAsset: proxy("getAsset"), estimateStorage: proxy("estimateStorage")
  });
});
