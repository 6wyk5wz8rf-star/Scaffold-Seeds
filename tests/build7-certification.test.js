"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

global.window = global;
global.BroadcastChannel = undefined;
require("../data.js");
require("../build3-data.js");
require("../build4-data.js");
require("../build5-data.js");
require("../resource-engine.js");
require("../verification-engine.js");
require("../ai-companion.js");
const PERSISTENCE = require("../persistence.js");

const DATA = global.SCAFFOLD_DATA;
const RESOURCE = global.ScaffoldResourceEngine;
const AI = global.ScaffoldAICompanion;
const ROOT = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const app = read("app.js");
const css = read("styles.css");
const worker = read("sw.js");
const stages = ["seed", "sprout", "growth", "independent"];
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function count(source, value) {
  return value ? String(source).split(String(value)).length - 1 : 0;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function subjectForEngine(engine) {
  return (engine.subjects || []).find(id => DATA.subjects.some(subject => subject.id === id)) || "english";
}

function validDiagram(type) {
  if (type === "number-line") return { type, labels: ["zero", "one", "two"], values: [0, 1, 2] };
  if (type === "timeline") return { type, labels: ["Earlier", "Middle", "Later"], values: [100, 200, 300] };
  if (type === "part-whole") return { type, labels: ["10", "4", "6"], values: [10, 4, 6] };
  if (type === "place-value") return { type, labels: [], values: [], value: 4321 };
  if (type === "array") return { type, labels: [], values: [], rows: 4, columns: 6, total: 24 };
  if (type === "bar-model") return { type, labels: ["4", "6", "10"], values: [4, 6], total: 10 };
  if (type === "fraction-strip") return { type, labels: [], values: [], parts: 6, numerator: 4 };
  return { type, labels: ["First", "Second", "Third"], values: type === "timeline" ? [1, 2, 3] : [] };
}

function productionScaffold(engine) {
  const subjectId = subjectForEngine(engine);
  const subject = DATA.subjects.find(item => item.id === subjectId);
  const entry = subject.entries[0];
  return RESOURCE.normalise({
    id: `build7-${engine.id}`,
    title: `${entry.title} · ${engine.name}`,
    year: entry.years[0],
    subject: subjectId,
    topic: entry.title,
    objective: entry.objectives[0],
    phase: "Guided practice",
    situation: "The pupil can begin but loses the relevant relationship before making the disciplinary decision.",
    barriers: [(engine.barriers || [])[0] || "reasoning"],
    essentialThinking: "Make and justify the subject decision.",
    pupilAction: "Make and justify the subject decision.",
    engineId: engine.id,
    stage: "seed",
    teacherQuestions: ["BUILD7 TEACHER QUESTION MUST STAY OFF PUPIL PAGES"],
    assessmentOpportunities: ["BUILD7 TEACHER ASSESSMENT MUST STAY OFF PUPIL PAGES"],
    diagram: validDiagram(engine.diagram || ""),
    content: {
      example: `BUILD7 UNIQUE EXAMPLE ${engine.id}`,
      hiddenSections: []
    }
  });
}

// Production defaults—not injected test prompts—must preserve pupil ownership.
for (const engine of DATA.engines) {
  const scaffold = productionScaffold(engine);
  const core = RESOURCE.coreTaskFor(scaffold, scaffold.content);
  const profile = RESOURCE.profileFor(scaffold);
  const supportCounts = [];
  for (const stage of stages) {
    const staged = RESOURCE.createStage(scaffold, stage);
    const support = RESOURCE.supportProfile(staged);
    const html = RESOURCE.renderBody(staged);
    supportCounts.push(support.supportPromptCount);
    check(Boolean(core), `${engine.id}: production default has a protected decision`);
    check(count(html, escapeHTML(core)) === 1, `${engine.id}/${stage}: protected decision appears exactly once`);
    check(!/Next fade|Remove the example|Remove the organiser/.test(html), `${engine.id}/${stage}: teacher fading language stays off the pupil page`);
    check(!html.includes("BUILD7 TEACHER QUESTION") && !html.includes("BUILD7 TEACHER ASSESSMENT"), `${engine.id}/${stage}: teacher-only records stay off the pupil page`);
    for (const teacherText of [...(profile.questions || []), ...(profile.assessment || [])]) {
      check(!html.includes(escapeHTML(teacherText)), `${engine.id}/${stage}: profile teacher guidance is not routed to pupils`);
    }
    if (engine.diagram && stage !== "independent") check(/local-diagram|diagram-warning/.test(html), `${engine.id}/${stage}: declared diagram has an explicit local representation`);
  }
  check(JSON.stringify(supportCounts) === JSON.stringify([3, 2, 1, 0]), `${engine.id}: support fades 3 → 2 → 1 → 0`);
  const seedHTML = RESOURCE.renderBody(RESOURCE.createStage(scaffold, "seed"));
  const sproutHTML = RESOURCE.renderBody(RESOURCE.createStage(scaffold, "sprout"));
  check(count(seedHTML, `BUILD7 UNIQUE EXAMPLE ${engine.id}`) === 1, `${engine.id}: the model/stimulus is not duplicated`);
  check(!sproutHTML.includes(`BUILD7 UNIQUE EXAMPLE ${engine.id}`), `${engine.id}: Sprout never relabels a complete example as partial`);
}

// Exercise the real specialist print composer in isolation. Independent pupil
// formats may retain the protected decision and one self-check—nothing else.
const composerStart = app.indexOf("  function renderFormatDocument(");
const composerEnd = app.indexOf("\n  function buildPrintResourcePages(", composerStart);
check(composerStart >= 0 && composerEnd > composerStart, "The specialist print composer can be isolated for an actual-HTML gate");
const composerContext = {
  DATA,
  RESOURCE,
  state: { print: { paper: "a4", orientation: "portrait", arrangement: 6 } },
  currentFormat: DATA.printFormats[0],
  esc: escapeHTML,
  blankLines: countValue => `<div class="write-lines">${"<span></span>".repeat(countValue)}</div>`,
  engineById: id => DATA.engines.find(item => item.id === id) || DATA.engines[0],
  subjectById: id => DATA.subjects.find(item => item.id === id) || DATA.subjects[0],
  printFormatById: () => composerContext.currentFormat,
  formatPage(scaffold, format, body) { return `<article class="paper format-${format.id}">${body}</article>`; },
  renderCompactWorkpage(scaffold) { return `<article class="paper compact">${RESOURCE.renderBody(scaffold)}</article>`; },
  renderResourceDocument(scaffold) { return `<article class="paper workpage">${RESOURCE.renderBody(scaffold)}</article>`; },
  printPromptSet(scaffold) {
    const normalised = RESOURCE.normalise(scaffold);
    const content = normalised.content;
    const coreTask = RESOURCE.coreTaskFor(normalised, content);
    return {
      coreTask,
      steps: RESOURCE.stagePromptSet(normalised, content),
      questions: normalised.teacherQuestions || [],
      selfPrompt: content.independencePrompt,
      misconception: normalised.misconception || content.misconception || "",
      vocabulary: content.vocabulary || []
    };
  }
};
vm.createContext(composerContext);
vm.runInContext(`${app.slice(composerStart, composerEnd)}\nthis.compose = renderFormatDocument;`, composerContext);
const independentBase = productionScaffold(DATA.engines.find(engine => engine.id === "bar-model"));
independentBase.content = {
  ...independentBase.content,
  prompts: ["BUILD7 SUPPORT ONE", "BUILD7 SUPPORT TWO", "BUILD7 SUPPORT THREE"],
  coreTask: "BUILD7 PROTECTED DECISION",
  independencePrompt: "BUILD7 PUPIL SELF CHECK"
};
const independentScaffold = RESOURCE.createStage(independentBase, "independent");
const teacherOnlyFormats = new Set(["teacher-card", "intervention-pack"]);
for (const format of DATA.printFormats) {
  if (teacherOnlyFormats.has(format.id)) continue;
  composerContext.currentFormat = format;
  const scaffold = format.id === "mini-booklet" ? { ...independentScaffold, printPart: "booklet-back" } : independentScaffold;
  const html = composerContext.compose(scaffold);
  check(count(html, "BUILD7 PROTECTED DECISION") === 1, `${format.id}: Independent composed HTML contains the protected decision once`);
  check(count(html, "BUILD7 PUPIL SELF CHECK") <= 1, `${format.id}: Independent composed HTML contains at most one pupil-owned self-check`);
  check(!/BUILD7 SUPPORT (?:ONE|TWO|THREE)/.test(html), `${format.id}: Independent composed HTML contains no externally authored support cue`);
}

// Adversarial representation probes exercise the values actually printed.
const array = RESOURCE.renderDiagram("array", { rows: 12, columns: 12, total: 144 });
check(count(array, "<circle") === 144 && /12 rows and 12 columns/.test(array), "A 12 × 12 array renders 144 marks rather than a fixed substitute");
const strip = RESOURCE.renderDiagram("fraction-strip", { parts: 24, numerator: 7 });
check(count(strip, "diagram-shade") === 7 && count(strip, "diagram-clear") === 17 && strip.includes("7/24"), "A 24-part fraction strip preserves its exact numerator and denominator");
const partWhole = RESOURCE.renderDiagram("part-whole", { values: [10, 1, 2, 3, 4], labels: ["10", "1", "2", "3", "4"] });
for (const value of ["10", "1", "2", "3", "4"]) check(partWhole.includes(`>${value}<`), `Four-part part–whole model retains ${value}`);
const numberLine = RESOURCE.renderDiagram("number-line", { values: [0, 1, 2] });
check(numberLine.includes(">0<") && !numberLine.includes("Add label"), "Explicit zero remains zero on a number line");
const placeValue = RESOURCE.renderDiagram("place-value", { value: 4321 });
check(/representing 4321/.test(placeValue) && count(placeValue, "place-value-digit") === 4, "Place-value validation is tied to a visible represented number");
for (const digit of ["4", "3", "2", "1"]) check(placeValue.includes(`>${digit}<`), `Place-value chart renders digit ${digit}`);
const yearOneTemplate = RESOURCE.renderDiagram("place-value", {});
check(!yearOneTemplate.includes("10,000"), "A schematic place-value chart does not force a Year 5 column into every context");
for (const type of ["timeline", "flowchart", "causal-chain", "classification-tree", "concept-map", "cycle"]) {
  const result = RESOURCE.diagramValidation(type, { labels: ["A", "B", "C", "D", "E", "F"], values: type === "timeline" ? [1, 2, 3, 4, 5, 6] : [] });
  check(!result.valid && result.errors.some(item => item.includes("no more than five")), `${type}: six nodes are rejected rather than silently truncated`);
}
check(RESOURCE.diagramValidation("flowchart", { labels: ["A".repeat(33), "B"] }).warnings.some(item => item.includes("32 characters")), "Long labels receive a print warning");
check(/diagram-cycle/.test(RESOURCE.renderDiagram("cycle", { labels: ["Plan", "Try", "Check"] })), "A declared cycle closes as a cycle rather than a one-way list");

// Explicit answers in any pupil-facing cue can never receive a Strong ownership judgement.
const leakProbe = productionScaffold(DATA.engines.find(engine => engine.id === "bar-model"));
leakProbe.content = {
  ...leakProbe.content,
  instruction: "Use division to solve it. 24 ÷ 6 = 4.",
  example: "24 ÷ 6 = 4.",
  prompts: ["Write 4."],
  coreTask: "Write 4.",
  checkPrompt: "The total is 4.",
  independencePrompt: "The total is 4."
};
check(RESOURCE.validationIssues(leakProbe).some(issue => issue.code === "answer-leak"), "Completed calculation and directive answer are detected across pupil-visible fields");
check(RESOURCE.qualityAudit(leakProbe).find(item => item.label === "Intellectual ownership")?.status !== "Strong", "Answer leakage cannot be certified as Strong intellectual ownership");

// Multi-year curriculum buckets cannot masquerade as exact-year mappings.
const curriculumProbes = [
  ["mathematics", "Year 3", "Place value", "Find 1,000 more or less than a given number"],
  ["mathematics", "Year 1", "Fractions", "Add and subtract fractions with the same denominator"],
  ["mathematics", "Year 5", "Statistics", "Calculate and interpret the mean"]
];
for (const [subject, year, topic, objective] of curriculumProbes) {
  const probe = productionScaffold(DATA.engines.find(engine => (engine.subjects || []).includes(subject)));
  Object.assign(probe, { subject, year, topic, objective });
  const status = RESOURCE.qualityAudit(probe).find(item => item.label === "Curriculum integrity")?.status;
  check(status !== "Strong", `${year} ${topic}: an objective from another year is not certified Strong`);
}

// AI approval is cryptographically bound to resource, accepted content and sources.
const aiScaffold = productionScaffold(DATA.engines.find(engine => engine.id === "bar-model"));
const parsed = {
  raw: "ANSWERS:\n4 × 6 = 24",
  format: "structured-text",
  taskId: "verify-calculations",
  sections: [{ id: "answers", mapping: "answers", items: [{ id: "answer-1", text: "4 × 6 = 24", status: "accepted" }] }]
};
const sources = [{ type: "Official guidance", title: "Named source", author: "", date: "2026", publisher: "DfE", url: "", retrievalDate: "2026-08-05", note: "Checked" }];
const verification = { blocking: 0, canApprove: true, reviewLevel: "forensic", checkedAt: "2026-08-05T12:00:00.000Z", findings: [], contentChecksum: AI.verificationFingerprint(aiScaffold, parsed, sources) };
const approved = AI.applyAccepted(aiScaffold, parsed, { approved: true, verification, sourceRecords: sources });
check(approved.round.approved && approved.resource.ai.status === "teacher-approved", "Current verification can cross the explicit teacher approval gate");
const changedParsed = JSON.parse(JSON.stringify(parsed));
changedParsed.sections[0].items[0].text = "4 × 6 = 999";
assert.throws(() => AI.applyAccepted(aiScaffold, changedParsed, { approved: true, verification, sourceRecords: sources }), error => error?.code === "STALE_VERIFICATION", "Editing accepted AI content invalidates verification");
assert.throws(() => AI.applyAccepted({ ...aiScaffold, objective: "Changed objective" }, parsed, { approved: true, verification, sourceRecords: sources }), error => error?.code === "STALE_VERIFICATION", "Editing the local scaffold invalidates verification");
assert.throws(() => AI.applyAccepted(aiScaffold, parsed, { approved: true, verification, sourceRecords: [{ ...sources[0], note: "Changed" }] }), error => error?.code === "STALE_VERIFICATION", "Editing a source record invalidates verification");

// Static integration gates protect the app-level paths that pure engines cannot invoke.
check(/data-diagram-field="value"/.test(app), "Designer exposes the represented place-value number");
check(/map\(item => item\.trim\(\)\)\.filter\(Boolean\)\.map\(Number\)/.test(app), "Cleared numeric lists remain empty while explicit zero is preserved");
check(/scrollWidth > page\.clientWidth/.test(app) && /rect\.right > pageRect\.right/.test(app), "Measured print preflight detects horizontal clipping");
check(/PERSISTENCE\.softDelete/.test(app) && /PERSISTENCE\.restoreDeleted/.test(app) && /PERSISTENCE\.purgeDeleted/.test(app), "Recently Deleted uses the durable transactional trash API");
check(!/state\.archives\s*=\s*\[[\s\S]{0,200}slice\(0,\s*50\)/.test(app), "Durable trash is not silently capped at fifty items");
check(/flushDurableSnapshot/.test(app) && /createRecovery:\s*true/.test(app), "Destructive clearing flushes current work and creates an atomic recovery checkpoint");
check(/createRecoverySnapshot\("Uncommitted browser state[^\n]+localBundle\)/.test(app) && !/uncommitted-cache/.test(app), "Startup reconciliation keeps complete uncommitted state in the durable recovery system");
check(/PERSISTENCE\.subscribe\([\s\S]{0,500}\{\s*remoteOnly:\s*true\s*\}/.test(app), "The interface reacts only to genuinely remote repository notifications");
check(/verificationOptions:\s*workspace\.options/.test(app), "AI approval binds verification-sensitive workspace options into its checksum");
check(/function cacheSnapshot[\s\S]{0,500}cacheSet/.test(app) && /compatibility cache could not be refreshed/.test(app), "A compatibility-cache failure cannot disguise a successful durable restore or import");
check(/compatibilityCacheFailed/.test(app) && /Saved work was cleared durably/.test(app), "A browser-cache exception cannot leave a successful durable clear looking unchanged");
check(/currentAIVerificationFingerprint/.test(app) && /invalidateAIVerification/.test(app), "The interface invalidates stale AI verification after editable inputs change");
check(/sidebar\.inert\s*=\s*true/.test(app) && /main\.inert\s*=\s*true/.test(app), "Closed and open mobile navigation isolate the inactive region from keyboard and screen-reader users");
check(/focusDatasetEntries\.length/.test(app), "Rerender focus recovery never matches an unrelated control through an empty dataset");
check(/scaffold-seeds-v7-certified/.test(worker), "The certified service worker uses a fresh cache namespace");

// Semantic print modes must retain structure without decorative colour dependence.
check(!/body\.large-text \.paper\s*\{/.test(css), "Large interface text does not resize pupil resources or print output");
check(/ink-black-white[\s\S]*diagram-shade/.test(css) && /ink-ink-saver[\s\S]*diagram-shade/.test(css), "Pure B/W and Ink Saver keep shaded diagram regions distinct from clear regions");
check(/\.paper\.hide-cut-lines \.cut-guides/.test(css), "The cut-line switch controls physical cut guides, not only its explanatory note");
check(/button:disabled|\.button:disabled/.test(css), "Disabled primary actions have a deliberate visual state");
check(/body\.large-text \.app-shell/.test(css), "Large interface text is scoped to the application shell");

check(PERSISTENCE.canonicalChecksumSync({ b: 2, a: 1 }) === PERSISTENCE.canonicalChecksumSync({ a: 1, b: 2 }), "Canonical checksums are stable across object key order");

console.log(`Build 7 release certification passed · ${assertions} adversarial assertions · ${DATA.engines.length} engines`);
