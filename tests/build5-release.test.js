"use strict";

global.window = global;
require("../data.js");
require("../build3-data.js");
require("../build4-data.js");
require("../build5-data.js");
require("../resource-engine.js");
require("../verification-engine.js");
require("../ai-companion.js");

const DATA = global.SCAFFOLD_DATA;
const RESOURCE = global.ScaffoldResourceEngine;

const failures = new Set();
let assertions = 0;
let sweepCases = 0;

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.add(message);
}

function run(label, fn) {
  try {
    fn();
  } catch (error) {
    failures.add(`${label} threw ${error?.stack || error}`);
  }
}

const escapeHTML = value => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const years = ["EYFS", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
const stageIds = ["seed", "sprout", "growth", "independent"];
const subjectIds = new Set(DATA.subjects.map(subject => subject.id));
const barrierIds = new Set(DATA.barriers.map(barrier => barrier.id));
const familyIds = new Set(DATA.scaffoldFamilies.map(family => family.id));
const formatIds = new Set(DATA.printFormats.map(format => format.id));
const printModes = DATA.build5?.printModes?.map(mode => mode.id) || [];

function subjectById(id) {
  return DATA.subjects.find(subject => subject.id === id);
}

function brainById(id) {
  return DATA.subjectBrains[id];
}

function firstSubjectForEngine(engine) {
  return (engine.subjects || []).find(id => subjectIds.has(id)) || "english";
}

function entryFor(subjectId, year) {
  const subject = subjectById(subjectId);
  return subject?.entries?.find(entry => (entry.years || []).includes(year));
}

function validDiagram(type) {
  const common = { type, labels: ["A", "B", "Whole"], values: [] };
  if (type === "number-line") return { type, labels: ["0", "2", "4"], values: [0, 2, 4] };
  if (type === "timeline") return { type, labels: ["Earlier", "Middle", "Later"], values: [100, 200, 300] };
  if (type === "part-whole") return { type, labels: ["10", "4", "6"], values: [10, 4, 6] };
  if (type === "bar-model") return { type, labels: ["2", "3", "5"], values: [2, 3], total: 5 };
  if (type === "fraction-strip") return { type, labels: [], values: [], parts: 4, numerator: 3 };
  if (type === "array") return { type, labels: [], values: [], rows: 3, columns: 4, total: 12 };
  if (["flowchart", "classification-tree", "causal-chain"].includes(type)) return { ...common, labels: ["Start", "Decision", "Check"] };
  return common;
}

function scaffoldFor(engine, year = "Year 4", overrides = {}) {
  const subject = firstSubjectForEngine(engine);
  const entry = entryFor(subject, year) || subjectById(subject).entries[0];
  const brain = brainById(subject);
  const profile = brain.profiles.find(item => item.id === entry.profileId) || brain.profiles[0];
  const diagram = validDiagram(engine.diagram || "");
  const coreTask = `Core pupil decision for ${engine.id}: choose and justify the disciplinary move.`;
  return RESOURCE.normalise({
    id: `release-${engine.id}-${year.replaceAll(" ", "-")}`,
    title: `${entry.title}: ${engine.name}`,
    year,
    subject,
    topic: entry.title,
    objective: entry.objectives[0],
    phase: "Guided practice",
    expectedOutcome: "The pupil makes and justifies the intended subject decision.",
    situation: "Pupils can begin the task, but the relevant relationship becomes difficult to coordinate independently.",
    barriers: [(engine.barriers || []).find(id => barrierIds.has(id)) || "reasoning"],
    customBarrier: "",
    essentialThinking: coreTask,
    pupilAction: coreTask,
    engineId: engine.id,
    familyId: engine.family,
    profileId: profile.id,
    stage: "seed",
    format: "workpage",
    removalPathway: "Remove the most task-completing cue first while retaining the core decision.",
    vocabulary: (entry.vocabulary || profile.vocabulary || []).slice(0, 5),
    misconception: entry.misconceptions?.[0] || profile.misconceptions?.[0] || "",
    prerequisites: (profile.prerequisites || []).slice(0, 4),
    teacherQuestions: (profile.questions || []).slice(0, 3),
    assessmentOpportunities: (profile.assessment || []).slice(0, 3),
    diagram,
    content: {
      instruction: "Use the scaffold to enter the task, then make the decision yourself.",
      subInstruction: "Explain why the decision fits the learning.",
      example: "A partial example stops before the final pupil decision.",
      prompts: ["Support cue one", "Support cue two", "Support cue three", coreTask],
      coreTask,
      vocabulary: (entry.vocabulary || profile.vocabulary || []).slice(0, 5),
      oralPrompt: "Rehearse the idea, then improve it after listening.",
      checkPrompt: "Can you make the same kind of decision without the scaffold?",
      independencePrompt: "What matters here, and how will you check it?",
      diagramType: engine.diagram || "",
      diagramLabels: diagram.labels || [],
      instructionMode: "standard",
      density: "calm",
      responseSpace: "standard",
      oralRehearsal: true,
      hiddenSections: []
    },
    ...overrides
  });
}

run("Build 5 manifest", () => {
  check(DATA.build5?.schemaVersion === 5, "Build 5 schema version must be 5.");
  check(DATA.subjects.length === 13, `Expected 13 subjects; found ${DATA.subjects.length}.`);
  check(JSON.stringify(DATA.build5?.years) === JSON.stringify(years), "Build 5 year coverage must be exactly EYFS through Year 6.");
  check(printModes.length === 7, `Expected seven professional print modes; found ${printModes.length}.`);
  check(new Set(printModes).size === printModes.length, "Print-mode IDs must be unique.");
});

run("Curriculum and profile coverage", () => {
  for (const subject of DATA.subjects) {
    const brain = brainById(subject.id);
    check(Boolean(brain), `${subject.name} has no curriculum brain.`);
    check(Array.isArray(brain?.profiles) && brain.profiles.length > 0, `${subject.name} has no subject profiles.`);
    check(Boolean(subject.release), `${subject.name} has no Build 5 release profile.`);
    for (const year of years) {
      const entries = (subject.entries || []).filter(entry => (entry.years || []).includes(year));
      check(entries.length > 0, `${subject.name} has no curriculum context for ${year}.`);
      check(Boolean(subject.release?.yearFocus?.[year]), `${subject.name} has no developmental focus for ${year}.`);
      for (const entry of entries) {
        const prefix = `${subject.name} / ${year} / ${entry.title}`;
        check(Array.isArray(entry.objectives) && entry.objectives.length > 0, `${prefix} has no objectives.`);
        check(Array.isArray(entry.vocabulary) && entry.vocabulary.length > 0, `${prefix} has no vocabulary.`);
        check(Array.isArray(entry.misconceptions) && entry.misconceptions.length > 0, `${prefix} has no misconception knowledge.`);
        check(Array.isArray(entry.barriers) && entry.barriers.length > 0, `${prefix} has no barrier metadata.`);
        check(entry.barriers.every(id => barrierIds.has(id)), `${prefix} contains an invalid barrier ID.`);
        check(Boolean(entry.sourceVersion), `${prefix} has no curriculum source/version metadata.`);
        check(Boolean(entry.statusByYear?.[year]), `${prefix} has no statutory/enrichment status for ${year}.`);
        check(Boolean(entry.profileId), `${prefix} has no explicit profileId; release routing must not depend on keyword guessing.`);
        check(brain.profiles.some(profile => profile.id === entry.profileId), `${prefix} profileId “${entry.profileId}” does not resolve in the ${subject.name} brain.`);
        const resolved = RESOURCE.profileFor({ subject: subject.id, year, topic: entry.title, objective: entry.objectives[0], situation: "", profileId: entry.profileId });
        check(Boolean(resolved) && brain.profiles.includes(resolved), `${prefix} does not resolve to a subject profile.`);
      }
    }
    for (const profile of brain?.profiles || []) {
      const prefix = `${subject.name} profile ${profile.name}`;
      check(Boolean(profile.id) && Boolean(profile.disciplinary) && Boolean(profile.threshold), `${prefix} lacks identity, disciplinary thinking or threshold knowledge.`);
      for (const field of ["prerequisites", "smallSteps", "vocabulary", "misconceptions", "assessment", "questions", "representations"]) {
        check(Array.isArray(profile[field]) && profile[field].length > 0, `${prefix} has no ${field}.`);
      }
    }
  }
});

run("Critical curriculum additions", () => {
  const required = {
    mathematics: ["Statistics", "Ratio and proportion", "Algebra"],
    science: ["Seasonal change", "Living things and habitats", "Rocks and soils", "Electricity", "Earth and space", "Evolution and inheritance"],
    history: ["Significant people, events and places", "Britain from Stone Age to Iron Age", "Roman Britain", "Ancient civilisations and ancient Greece", "Non-European society study"]
  };
  for (const [subjectId, titles] of Object.entries(required)) {
    const subject = subjectById(subjectId);
    for (const title of titles) check(subject.entries.some(entry => entry.title === title), `${subject.name} is missing the Build 5 curriculum domain “${title}”.`);
  }
  check(subjectById("english").entries.some(entry => /blend|phoneme|grapheme|word reading/i.test(`${entry.title} ${(entry.objectives || []).join(" ")}`)), "English lacks an explicit early word-reading/phonics curriculum route.");
});

run("Engine metadata", () => {
  check(DATA.engines.length > 0, "No scaffold engines loaded.");
  for (const engine of DATA.engines) {
    const prefix = `Engine ${engine.id}`;
    check(Boolean(engine.id) && Boolean(engine.name), "Every engine needs a stable ID and name.");
    check(Array.isArray(engine.subjects) && engine.subjects.length > 0, `${prefix} has no subject IDs.`);
    check(engine.subjects.every(id => id === "all" || subjectIds.has(id)), `${prefix} contains an invalid subject ID: ${(engine.subjects || []).filter(id => id !== "all" && !subjectIds.has(id)).join(", ")}.`);
    check(Array.isArray(engine.barriers) && engine.barriers.length > 0, `${prefix} has no barrier metadata.`);
    check(engine.barriers.every(id => barrierIds.has(id)), `${prefix} contains an invalid barrier ID.`);
    check(familyIds.has(engine.family), `${prefix} contains an invalid scaffold family “${engine.family}”.`);
    check(Boolean(engine.preserves) && Boolean(engine.risk), `${prefix} must state what it preserves and its misuse risk.`);
    check(Boolean(engine.release?.protectedThinking) && Boolean(engine.release?.removeFirst), `${prefix} has no Build 5 protection/fade metadata.`);
    check((engine.formats || []).every(id => formatIds.has(id)), `${prefix} references an unknown print format.`);
  }
});

run("Growth pathway invariants", () => {
  const exampleRank = { modelled: 2, partial: 1, none: 0 };
  for (const engine of DATA.engines) {
    const base = scaffoldFor(engine);
    const profiles = stageIds.map(stage => RESOURCE.supportProfile(RESOURCE.createStage(base, stage)));
    const core = profiles[0].coreTask;
    check(Boolean(core), `${engine.name} has no core pupil task.`);
    profiles.forEach((profile, index) => {
      const stage = stageIds[index];
      check(profile.coreTask === core, `${engine.name} changes its core task at ${stage}.`);
      check(profile.visiblePrompts.includes(core), `${engine.name} removes its core task from ${stage}.`);
      const html = RESOURCE.renderBody(RESOURCE.createStage(base, stage));
      check(html.includes(escapeHTML(core)), `${engine.name} declares the core task at ${stage}, but its ${engine.layout || "default"} renderer does not display it.`);
    });
    for (let index = 1; index < profiles.length; index += 1) {
      const previous = profiles[index - 1];
      const current = profiles[index];
      check(current.supportPromptCount <= previous.supportPromptCount, `${engine.name} adds support prompts from ${stageIds[index - 1]} to ${stageIds[index]}.`);
      check(current.vocabularyCount <= previous.vocabularyCount, `${engine.name} adds vocabulary support from ${stageIds[index - 1]} to ${stageIds[index]}.`);
      check(exampleRank[current.example] <= exampleRank[previous.example], `${engine.name} increases example support from ${stageIds[index - 1]} to ${stageIds[index]}.`);
    }
    check(profiles[0].supportPromptCount > profiles[3].supportPromptCount, `${engine.name} does not reduce support between Seed and Independent.`);
    check(profiles[3].supportPromptCount === 0 && profiles[3].vocabularyCount === 0 && profiles[3].example === "none", `${engine.name} leaves task-completing support at Independent.`);
  }
});

run("Evidence-based quality audit", () => {
  const validEngine = DATA.engines.find(engine => engine.subjects.includes("mathematics"));
  const aligned = scaffoldFor(validEngine, "Year 4");
  const alignedAudit = RESOURCE.qualityAudit(aligned);
  const alignedCurriculum = alignedAudit.find(item => item.label === "Curriculum integrity");
  const alignedEntry = entryFor(aligned.subject, aligned.year);
  const exactYearMapping = alignedEntry?.years?.length === 1 || alignedEntry?.objectivesByYear?.[aligned.year]?.includes(aligned.objective);
  check(alignedCurriculum?.status === (exactYearMapping ? "Strong" : "Teacher review needed"), "Curriculum integrity must distinguish exact-year evidence from a broad multi-year curriculum-area match.");

  const incompatible = DATA.engines.find(engine => !engine.subjects.includes("all") && !engine.subjects.includes("history"));
  const historyEntry = entryFor("history", "Year 4");
  const historyBrain = brainById("history");
  const historyProfile = historyBrain.profiles.find(profile => profile.id === historyEntry.profileId) || historyBrain.profiles[0];
  const misaligned = scaffoldFor(incompatible, "Year 4", {
    subject: "history",
    topic: historyEntry.title,
    objective: "An invented objective outside the selected curriculum context",
    profileId: historyProfile.id,
    barriers: ["chronology"],
    situation: "",
    essentialThinking: "Pupils must still form the historical judgement.",
    content: {
      instruction: "The answer is already supplied here.",
      prompts: ["Copy this answer"],
      coreTask: "Pupils must still form the historical judgement.",
      vocabulary: [],
      example: "",
      independencePrompt: "What will you decide?",
      diagramType: "",
      diagramLabels: [],
      hiddenSections: []
    },
    diagram: { type: "", labels: [], values: [] }
  });
  const audit = RESOURCE.qualityAudit(misaligned);
  const status = label => audit.find(item => item.label === label)?.status;
  check(status("Curriculum integrity") !== "Strong", "Quality audit failed to reject an objective outside the selected curriculum context.");
  check(status("Subject authenticity") !== "Strong", "Quality audit failed to reject a subject-incompatible engine.");
  check(status("Barrier–engine fit") !== "Strong", "Quality audit failed to reject a barrier–engine mismatch.");
  check(status("Barrier precision") !== "Strong", "Quality audit failed to notice a missing observed sticking point.");
  check(status("Intellectual ownership") !== "Strong", "Quality audit failed to detect deliberate answer leakage.");
});

run("Diagram relationship validation", () => {
  const invalid = [
    ["number-line", { values: [0, 2, 5] }, "unequal number-line intervals"],
    ["timeline", { values: [200, 100], labels: ["Later", "Earlier"] }, "backwards timeline values"],
    ["part-whole", { values: [10, 4, 5], labels: ["10", "4", "5"] }, "part-whole total mismatch"],
    ["bar-model", { values: [2, 3], total: 6, labels: ["2", "3", "6"] }, "bar-model total mismatch"],
    ["fraction-strip", { parts: 4, numerator: 5 }, "fraction numerator beyond denominator"],
    ["array", { rows: 3, columns: 4, total: 13 }, "array total mismatch"],
    ["flowchart", { labels: ["Only one"] }, "flowchart without a second node"]
  ];
  for (const [type, config, description] of invalid) check(!RESOURCE.diagramValidation(type, config).valid, `Diagram validation accepted ${description}.`);

  const valid = ["number-line", "timeline", "part-whole", "bar-model", "fraction-strip", "array", "flowchart", "classification-tree", "causal-chain"];
  for (const type of valid) check(RESOURCE.diagramValidation(type, validDiagram(type)).valid, `Diagram validation rejected a valid ${type}.`);

  for (const type of ["number-line", "timeline", "part-whole", "bar-model", "fraction-strip", "array", "place-value"]) {
    const result = RESOURCE.diagramValidation(type, { labels: [] });
    check(result.status !== "locally-checked", `${type} claims local relationship validation without the values needed to check the relationship.`);
  }
});

run("Print preflight matrix", () => {
  const engine = DATA.engines.find(item => item.id === "reasoning-ladder") || DATA.engines[0];
  const scaffold = scaffoldFor(engine);
  for (const format of DATA.printFormats) {
    check(Boolean(format.release), `${format.name} has no Build 5 format-purpose metadata.`);
    for (const mode of printModes) {
      const paper = format.release?.safePaper?.[0] || "a4";
      const orientation = format.release?.preferredOrientation || "portrait";
      const result = RESOURCE.printPreflight(scaffold, format.id, { paper, orientation, mode, duplex: true });
      check(result.formatId === format.id, `${format.name} preflight returned the wrong format ID in ${mode}.`);
      check(Number.isFinite(result.wordCount), `${format.name} preflight returned a non-finite word count in ${mode}.`);
      check(Array.isArray(result.blocking) && Array.isArray(result.warnings), `${format.name} preflight returned malformed findings in ${mode}.`);
      check(!result.blocking.length, `${format.name} blocks its own declared safe paper/orientation in ${mode}: ${result.blocking.join(" ")}`);
      check(result.colour === mode || result.mode === mode || result.colourMode === mode, `${format.name} preflight does not report that ${mode} was actually checked.`);
    }
  }
  const invalidMode = RESOURCE.printPreflight(scaffold, "workpage", { paper: "a4", orientation: "portrait", mode: "neon-invalid" });
  check(invalidMode.blocking.length > 0, "Print preflight silently accepts an unknown colour mode.");
});

run("Combinatorial release sweep", () => {
  const hostileInstruction = '<script data-release-gate>throw new Error("unsafe")</script> Enter the task.';
  const hostileExample = '<b data-release-gate onclick="unsafe()">Example</b>';
  const hostilePrompt = '<img data-release-gate src=x onerror="unsafe()"> Support cue';
  const rawTags = ["<script data-release-gate", "<b data-release-gate", "<img data-release-gate"];
  for (const engine of DATA.engines) {
    for (const year of years) {
      const base = scaffoldFor(engine, year);
      base.content.instruction = hostileInstruction;
      base.content.example = hostileExample;
      base.content.prompts = [hostilePrompt, "Support cue two", "Support cue three", base.content.coreTask];
      base.content.vocabulary = ["<unsafe-word>", ...(base.content.vocabulary || []).slice(0, 4)];
      for (const stage of stageIds) {
        const staged = RESOURCE.createStage(base, stage);
        let body;
        try {
          body = RESOURCE.renderBody(staged);
        } catch (error) {
          failures.add(`${engine.name} / ${year} / ${stage} render crashed: ${error.message}`);
          continue;
        }
        check(typeof body === "string" && body.length > 0, `${engine.name} / ${year} / ${stage} rendered no content.`);
        check(!/\b(?:undefined|NaN)\b/.test(body), `${engine.name} / ${year} / ${stage} emitted undefined or NaN.`);
        check(rawTags.every(tag => !body.includes(tag)), `${engine.name} / ${year} / ${stage} emitted unescaped teacher content.`);
        for (const format of DATA.printFormats) {
          sweepCases += 1;
          try {
            const paper = format.release?.safePaper?.[0] || "a4";
            const orientation = format.release?.preferredOrientation || "portrait";
            const result = RESOURCE.printPreflight(staged, format.id, { paper, orientation, mode: printModes[0], duplex: true });
            check(Number.isFinite(result.wordCount), `${engine.name} / ${year} / ${stage} / ${format.name} produced a non-finite preflight.`);
            check(!result.blocking.some(item => /undefined|NaN/.test(item)), `${engine.name} / ${year} / ${stage} / ${format.name} produced an invalid blocking message.`);
          } catch (error) {
            failures.add(`${engine.name} / ${year} / ${stage} / ${format.name} preflight crashed: ${error.message}`);
          }
        }
      }
    }
  }
});

if (failures.size) {
  console.error(`Scaffold Seeds Build 5 release gate FAILED · ${failures.size} distinct failure(s) · ${assertions} assertions · ${sweepCases} sweep cases`);
  [...failures].forEach((failure, index) => console.error(`${String(index + 1).padStart(3, "0")}. ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Scaffold Seeds Build 5 release gate passed · ${assertions} assertions · ${sweepCases} sweep cases`);
}
