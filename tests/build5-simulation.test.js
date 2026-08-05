"use strict";

const assert = require("node:assert/strict");

// Keep IDs and timestamps repeatable without changing any product module.
const NativeDate = Date;
const fixedEpoch = NativeDate.parse("2026-08-03T12:00:00.000Z");
let clockTick = 0;
global.Date = class DeterministicDate extends NativeDate {
  constructor(...args) {
    super(...(args.length ? args : [fixedEpoch + clockTick++]));
  }

  static now() {
    return fixedEpoch + clockTick++;
  }
};

let randomState = 0x5caFF01d;
Math.random = () => {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 0x100000000;
};

// The browser modules expose their APIs on window. Disable Node's native
// BroadcastChannel so this local process cannot be kept alive by a test tab.
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
const VERIFY = global.ScaffoldVerificationEngine;
const AI = global.ScaffoldAICompanion;
const NOW = "2026-08-03T12:00:00.000Z";
const STAGES = ["seed", "sprout", "growth", "independent"];

let assertions = 0;
function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function acceptedOnly(parsed) {
  return {
    ...deepClone(parsed),
    raw: "",
    sections: parsed.sections
      .map(section => ({
        ...deepClone(section),
        items: section.items.filter(item => ["accepted", "edited"].includes(item.status)).map(deepClone)
      }))
      .filter(section => section.items.length)
  };
}

function releaseScaffold() {
  const coreTask = "Choose the operation from the multiplicative relationship and justify how the bar model represents it.";
  return RESOURCE.normalise({
    id: "release-year4-multiplicative-bar-model",
    title: "Multiplicative relationships · bar-model bridge",
    year: "Year 4",
    subject: "mathematics",
    topic: "Multiplication and division",
    objective: "Recall and use multiplication and division facts",
    phase: "Guided practice",
    expectedOutcome: "Choose and justify multiplication or division from the relationship between the quantities.",
    situation: "Pupils identify the quantities but lose the equal-group relationship when choosing an operation.",
    barriers: ["representation", "reasoning"],
    customBarrier: "The unknown is not consistently placed in the representation before calculation.",
    essentialThinking: coreTask,
    disciplinaryThinking: "Reason multiplicatively from equal groups rather than matching an operation to a keyword.",
    pupilAction: coreTask,
    engineId: "bar-model",
    familyId: "representation",
    profileId: "multiplicative",
    stage: "seed",
    format: "workpage",
    growthStages: [...STAGES],
    removalPathway: "Remove the completed bar first, then labels, then retain only the pupil-owned checking question.",
    vocabulary: ["factor", "product", "equal groups", "multiply", "divide"],
    prerequisites: ["Recall relevant times-table facts", "Identify equal groups", "Name the known and unknown quantities"],
    misconception: "The operation can be chosen from a single word without considering the relationship.",
    teacherQuestions: ["What does each part represent?", "Where is the unknown?", "How does the bar justify the operation?"],
    assessmentOpportunities: ["Ask the pupil to redraw the relationship with different values."],
    diagram: {
      type: "bar-model",
      labels: ["6", "6", "6", "6", "24"],
      values: [6, 6, 6, 6],
      total: 24
    },
    content: {
      instruction: "Represent the equal-group relationship before choosing a calculation.",
      subInstruction: "Name each quantity and explain what the whole bar represents.",
      example: "A partial example shows four equal parts but stops before the operation is selected.",
      prompts: ["Name each quantity.", "Show the equal groups.", "Mark the unknown.", coreTask],
      coreTask,
      vocabulary: ["factor", "product", "equal groups", "multiply", "divide"],
      answerGuidance: [],
      misconception: "A keyword alone determines the operation.",
      teacherNotes: "Model how quantities map to the bar, then stop before selecting the operation.",
      oralPrompt: "Explain the relationship without naming an operation first.",
      checkPrompt: "Does every bar part match a quantity in the problem?",
      independencePrompt: "What is the relationship, and how will I check my operation?",
      diagramType: "bar-model",
      diagramLabels: ["6", "6", "6", "6", "24"],
      responseSpace: "standard",
      instructionMode: "standard",
      density: "calm",
      oralRehearsal: true,
      hiddenSections: []
    },
    createdAt: NOW,
    updatedAt: NOW
  });
}

function printChecksumIsValid(bundle) {
  const material = deepClone(bundle);
  delete material.integrity;
  return bundle.integrity?.checksum === PERSISTENCE.canonicalChecksumSync(material);
}

function loadResource(index) {
  const isTarget = index % 10 === 0;
  const archived = index % 17 === 0;
  const year = index % 2 === 0 ? "Year 4" : "Year 5";
  const topic = index % 5 === 0 ? "Fractions" : "Multiplication and division";
  return {
    id: `load-resource-${String(index).padStart(5, "0")}`,
    title: `${topic} practice ${String(index).padStart(5, "0")}`,
    year,
    subject: "mathematics",
    topic,
    objective: topic === "Fractions" ? "Recognise and show equivalent fractions" : "Recall and use multiplication and division facts",
    phase: "Guided practice",
    stage: STAGES[index % STAGES.length],
    engineId: "bar-model",
    familyId: "representation",
    profileId: topic === "Fractions" ? "fractions" : "multiplicative",
    format: DATA.printFormats[index % DATA.printFormats.length].id,
    titleKey: topic.toLowerCase(),
    favourite: isTarget,
    archived,
    barriers: ["representation"],
    essentialThinking: "Represent the relationship and choose the operation independently.",
    pupilAction: "Represent the relationship and choose the operation independently.",
    growthStages: [...STAGES],
    createdAt: NOW,
    updatedAt: NOW,
    content: {
      instruction: "Represent before calculating.",
      prompts: ["What is known?", "What is unknown?"],
      coreTask: "Represent the relationship and choose the operation independently.",
      vocabulary: topic === "Fractions" ? ["equivalent", "numerator", "denominator"] : ["factor", "product"],
      density: "calm",
      responseSpace: "standard",
      instructionMode: "standard"
    }
  };
}

async function run() {
  check(DATA.subjects.some(subject => subject.id === "mathematics"), "Mathematics is available in the local curriculum data");
  check(DATA.engines.some(engine => engine.id === "bar-model"), "The local Bar Model Builder engine is available");

  const scaffold = releaseScaffold();
  const coreTask = scaffold.content.coreTask;
  check(scaffold.year === "Year 4" && scaffold.subject === "mathematics", "The release scaffold is normalised in the intended Year 4 mathematics context");
  check(scaffold.engineId === "bar-model" && scaffold.familyId === "representation", "The scaffold retains its subject-specific engine and family");
  check(scaffold.barriers.includes("representation") && scaffold.barriers.includes("reasoning"), "The observed barriers are explicit and bounded");
  check(Boolean(coreTask) && coreTask === scaffold.essentialThinking, "The protected core task is explicit and unchanged by normalisation");
  check(scaffold.stage === "seed" && scaffold.growthStages.join("|") === STAGES.join("|"), "The complete four-stage pathway is declared");
  check(RESOURCE.diagramValidation(scaffold.content.diagramType, scaffold.diagram).valid, "The local bar model passes deterministic relationship validation");
  check(!RESOURCE.validationIssues(scaffold).some(issue => issue.type === "error"), "The local scaffold has no blocking engine validation issue");

  const prompt = AI.buildPrompt(scaffold, {
    taskId: "verify-calculations",
    depth: "forensic",
    reviewLevel: "forensic",
    quantity: 1,
    changeSlot: "teacherNotes",
    stageScope: "all",
    selectedKnowledge: ["prerequisites", "vocabulary", "misconceptions", "progression", "representations"],
    sourceDetails: false,
    paper: "A4",
    orientation: "portrait",
    inkMode: "ink-saver"
  });
  check(prompt.taskId === "verify-calculations" && prompt.depth === "forensic", "A narrow forensic calculation-check prompt is prepared");
  check(prompt.providerNeutral === true && !/OpenAI|ChatGPT|Claude|Gemini/i.test(prompt.scrubbed), "The prompt is provider-neutral");
  check(prompt.privacy.clean === true, "The prompt contains no detected personal information");
  check(prompt.scrubbed.includes("PROTECTED PUPIL THINKING") && prompt.scrubbed.includes(coreTask), "The prompt explicitly protects the pupil-owned decision");
  check(prompt.scrubbed.includes(scaffold.objective) && prompt.scrubbed.includes("SUPPORT AND FADING"), "The prompt retains the local objective and connected growth pathway");
  check(prompt.scrubbed.includes("SOURCE HANDLING") && prompt.scrubbed.includes("RETURN FORMAT"), "The forensic prompt retains source and structured-return safeguards");
  check(prompt.packet.includes("RETURN TO SCAFFOLD SEEDS") && prompt.packet.includes("TEACHER VERIFICATION CHECKLIST"), "The complete provider-neutral prompt packet includes the safe return workflow");

  const rawResponse = [
    "VERIFICATION:",
    "1. The two explicit calculations are internally consistent with equal groups.",
    "",
    "ANSWERS:",
    "1. 4 × 6 = 24",
    "2. 24 / 4 = 6",
    "3. 5 × 7 = 35",
    "",
    "UNCERTAINTIES:",
    "1. None recorded."
  ].join("\n");
  let parsed = AI.parseImport(rawResponse, "verify-calculations");
  check(parsed.rawPreserved && parsed.clean === rawResponse, "The safe raw response is preserved and parsed without alteration");
  check(parsed.warnings.length === 0 && parsed.missing.length === 0, "The response matches the expected local structure");
  check(parsed.sections.map(section => section.id).join("|") === "verification|answers|uncertainties", "The imported sections map to the declared return schema");
  check(parsed.sections.flatMap(section => section.items).every(item => item.status === "pending"), "Imported items begin behind the teacher decision gate");

  const verificationItem = parsed.sections.find(section => section.id === "verification").items[0];
  const answerItems = parsed.sections.find(section => section.id === "answers").items;
  const uncertaintyItem = parsed.sections.find(section => section.id === "uncertainties").items[0];
  parsed = AI.setItemDecision(parsed, verificationItem.id, "accepted");
  parsed = AI.setItemDecision(parsed, answerItems[0].id, "accepted");
  parsed = AI.setItemDecision(parsed, answerItems[1].id, "edited", "24 ÷ 4 = 6");
  parsed = AI.setItemDecision(parsed, answerItems[2].id, "rejected");
  parsed = AI.setItemDecision(parsed, uncertaintyItem.id, "rejected");
  const decisions = parsed.sections.flatMap(section => section.items.map(item => item.status));
  check(decisions.includes("accepted") && decisions.includes("edited") && decisions.includes("rejected"), "The teacher can accept, edit and reject individual items");
  check(AI.acceptedContent(parsed).answers.join("|") === "4 × 6 = 24|24 ÷ 4 = 6", "Only accepted and teacher-edited answers cross the approval boundary");

  const reviewPayload = acceptedOnly(parsed);
  check(reviewPayload.sections.flatMap(section => section.items).every(item => ["accepted", "edited"].includes(item.status)), "Rejected items are excluded from verification input");
  const verification = VERIFY.verify(scaffold, reviewPayload, {
    taskId: "verify-calculations",
    reviewLevel: "forensic",
    quantity: 1
  });
  verification.contentChecksum = AI.verificationFingerprint(scaffold, parsed, []);
  check(verification.blocking === 0 && verification.canApprove === true, "Local verification permits professional approval only after the accepted calculations pass");
  check(verification.findings.some(finding => finding.title === "Explicit calculations checked" && finding.resolved), "Both explicit calculations receive a transparent deterministic check");
  check(!verification.findings.some(finding => finding.severity === "do-not-use" && !finding.resolved), "No unresolved do-not-use finding remains");

  const approvalChecked = true;
  const acceptedValues = Object.values(AI.acceptedContent(parsed)).flat();
  const humanGateOpen = approvalChecked && verification.canApprove && acceptedValues.length > 0;
  check(humanGateOpen, "The explicit human approval gate is satisfied before application");
  assert.throws(() => AI.applyAccepted(scaffold, parsed, { prompt, approved: true }), error => error?.code === "STALE_VERIFICATION", "Approval cannot reuse a missing or stale verification result");
  const unverifiedAttempt = AI.applyAccepted(scaffold, parsed, { prompt, approved: false });
  check(unverifiedAttempt.resource.ai.status === "review-required" && !unverifiedAttempt.round.approved, "Unverified content can be previewed but cannot be recorded as approved");
  const pendingAttempt = deepClone(parsed);
  pendingAttempt.sections.find(section => section.id === "uncertainties").items[0].status = "pending";
  assert.throws(() => AI.applyAccepted(scaffold, pendingAttempt, { prompt, verification, approved: true }), error => error?.code === "AI_DECISIONS_PENDING", "Approval cannot be recorded while an imported item remains undecided");
  assertions += 1;
  const applied = AI.applyAccepted(scaffold, parsed, {
    prompt,
    verification,
    approved: humanGateOpen,
    approvalScope: "resource",
    roundName: "Build 5 release simulation",
    includeRaw: true
  });
  check(applied.resource.objective === scaffold.objective && applied.resource.engineId === scaffold.engineId, "Applying the reviewed contribution preserves objective and engine");
  check(applied.resource.content.coreTask === coreTask && applied.resource.stage === scaffold.stage, "Applying the contribution preserves protected thinking and support stage");
  check(applied.resource.content.answerGuidance.join("|") === "4 × 6 = 24|24 ÷ 4 = 6", "The local resource is rebuilt from only approved answer guidance");
  check(!JSON.stringify({
    answerGuidance: applied.resource.content.answerGuidance,
    externalVerification: applied.resource.ai.externalVerification
  }).includes("5 × 7 = 35"), "Rejected content does not enter any rebuilt classroom-facing slot");
  check(applied.round.decisions.some(item => item.status === "rejected" && item.finalText === "5 × 7 = 35"), "Rejected content remains recoverable in the private decision record");
  check(applied.resource.ai.status === "teacher-approved" && applied.resource.ai.approval.text === DATA.ai.approvalText, "The rebuilt resource records the exact human approval statement");
  check(applied.round.approved && applied.round.decisions.some(item => item.status === "rejected"), "The accepted round retains its decision provenance, including rejection");
  check(applied.changedPaths.includes("content.answerGuidance") && applied.changedPaths.includes("ai.externalVerification"), "The change record names every locally rebuilt slot");

  const stageSet = RESOURCE.stageSet(applied.resource);
  check(Object.keys(stageSet).join("|") === STAGES.join("|"), "The applied resource produces the exact four connected stages");
  const profiles = STAGES.map(stage => RESOURCE.supportProfile(stageSet[stage]));
  const exampleRank = { none: 0, partial: 1, modelled: 2 };
  for (let index = 0; index < STAGES.length; index += 1) {
    const stage = STAGES[index];
    const staged = stageSet[stage];
    const profile = profiles[index];
    check(staged.stage === stage && profile.stage === stage, `${stage} is generated as its declared growth stage`);
    check(profile.coreTask === coreTask && profile.visiblePrompts.includes(coreTask), `${stage} retains the protected pupil decision`);
    check(!RESOURCE.validationIssues(staged).some(issue => issue.type === "error"), `${stage} has no blocking fade-integrity issue`);
    check(RESOURCE.renderBody(staged).includes(coreTask), `${stage} renders the protected pupil decision visibly`);
    if (index > 0) {
      check(profile.supportPromptCount <= profiles[index - 1].supportPromptCount, `${stage} never adds support prompts during fading`);
      check(profile.vocabularyCount <= profiles[index - 1].vocabularyCount, `${stage} never adds vocabulary support during fading`);
      check(exampleRank[profile.example] <= exampleRank[profiles[index - 1].example], `${stage} never restores a more complete model during fading`);
    }
  }
  check(profiles.map(profile => profile.supportPromptCount).join("|") === "3|2|1|0", "Support prompts fade deterministically from three to none");
  check(profiles[0].vocabularyCount > profiles[3].vocabularyCount && profiles[3].vocabularyCount === 0, "Vocabulary support disappears by Independent");
  check(profiles[3].example === "none" && profiles[3].oralRehearsal === false, "Independent retains no model or external oral rehearsal support");

  const formats = DATA.printFormats;
  const printModes = DATA.build5.printModes;
  check(formats.length === 19, "The release print studio exposes exactly 19 intentional formats");
  check(printModes.length === 7, "The release print studio exposes exactly seven professional output modes");
  const formatModePairs = new Set();
  let printMatrixCases = 0;
  let safePaperCases = 0;
  for (const format of formats) {
    const rule = format.release || DATA.build5.formatRules[format.id];
    check(Boolean(rule?.purpose) && rule.safePaper.length > 0, `${format.name} declares a print purpose and safe paper`);
    check(["portrait", "landscape"].includes(rule.preferredOrientation), `${format.name} declares an intentional orientation`);
    for (const paper of ["a4", "a5"]) {
      for (const orientation of ["portrait", "landscape"]) {
        for (const printMode of printModes) {
          for (const duplex of [false, true]) {
            printMatrixCases += 1;
            if (rule.safePaper.includes(paper)) safePaperCases += 1;
            formatModePairs.add(`${format.id}|${printMode.id}`);
            const preflight = RESOURCE.printPreflight(applied.resource, format.id, {
              paper,
              orientation,
              mode: printMode.id,
              duplex
            });
            const label = `${format.name} · ${paper.toUpperCase()} ${orientation} · ${printMode.name} · duplex ${duplex ? "on" : "off"}`;
            const expectsPaperBlock = !rule.safePaper.includes(paper);
            const hasPaperBlock = preflight.blocking.some(message => /not intentionally composed/i.test(message));
            const expectsOrientationWarning = orientation !== rule.preferredOrientation;
            const hasOrientationWarning = preflight.warnings.some(warning => /usually clearest in/i.test(warning));
            const expectsDuplexWarning = Boolean(rule.recommendsDuplex) && !duplex;
            const hasDuplexWarning = preflight.warnings.some(warning => /duplex/i.test(warning));
            check(preflight.formatId === format.id, `${label} retains its format identity`);
            check(preflight.paper === paper && preflight.orientation === orientation, `${label} reports the requested physical composition`);
            check(preflight.mode === printMode.id, `${label} genuinely checks the selected output mode`);
            check(Number.isFinite(preflight.wordCount) && Array.isArray(preflight.blocking) && Array.isArray(preflight.warnings), `${label} returns complete finite findings`);
            check(hasPaperBlock === expectsPaperBlock, `${label} enforces the declared safe-paper rule`);
            check(hasOrientationWarning === expectsOrientationWarning, `${label} applies the declared orientation advice`);
            check(hasDuplexWarning === expectsDuplexWarning, `${label} applies the declared duplex rule`);
            check((preflight.blocking.length > 0) === expectsPaperBlock, `${label} has no unrelated blocking print failure`);
          }
        }
      }
    }
  }
  check(printMatrixCases === 19 * 2 * 2 * 7 * 2 && printMatrixCases === 1064, "The full 1,064-case format, paper, orientation, mode and duplex matrix is exercised");
  check(formatModePairs.size === 19 * 7, "Every one of the 133 format-and-mode pairs reaches preflight");
  check(safePaperCases === formats.reduce((total, format) => total + format.release.safePaper.length, 0) * 2 * 7 * 2, "Every declared safe-paper variant is exercised in both orientations, all seven modes and both duplex states");
  check(formats.filter(format => format.release.recommendsDuplex).map(format => format.id).join("|") === "mini-booklet", "Only the imposed mini-booklet declares duplex as a format requirement");

  const versionSnapshot = deepClone(applied.resource);
  versionSnapshot.versions = [];
  const versionedResource = {
    ...deepClone(applied.resource),
    createdAt: NOW,
    updatedAt: NOW,
    versions: [{
      id: "version-teacher-approved",
      name: "Teacher-approved release candidate",
      savedAt: NOW,
      snapshot: versionSnapshot
    }]
  };
  const repository = PERSISTENCE.createRepository({ forceMemory: true, sessionId: "release-simulation-primary" });
  const capabilities = await repository.open();
  check(capabilities.backend === "memory" && capabilities.persistent === false, "The release simulation uses the explicit force-memory repository without pretending it is durable");
  const saved = await repository.putResource(versionedResource, { expectedRevision: 0 });
  check(saved.revision === 1 && saved.versions.length === 1, "The approved resource and one version-like checkpoint save atomically");
  check(saved.versions[0].snapshot.ai.status === "teacher-approved", "The saved checkpoint retains its teacher-approved state");

  const recovery = await repository.createRecoverySnapshot("Teacher-approved release checkpoint");
  check(recovery.bundle.library.length === 1 && printChecksumIsValid(recovery.bundle), "The recoverable release checkpoint contains a valid checksum");
  const exported = await repository.getSnapshot();
  const exportedJSON = JSON.stringify(exported);
  check(exported.integrity.algorithm === "SHA-256" && exported.integrity.resourceCount === 1, "The full release export carries a SHA-256 manifest and resource count");
  check(printChecksumIsValid(exported), "The exported bundle checksum matches its canonical local content");
  check(PERSISTENCE.validateBundle(exportedJSON, { now: NOW }).valid, "The checksummed JSON export validates before leaving the repository");

  const emptyBundle = PERSISTENCE.createBundle({
    product: PERSISTENCE.PRODUCT,
    schemaVersion: PERSISTENCE.SCHEMA_VERSION,
    library: [],
    settings: exported.settings
  }, { now: NOW });
  await repository.commitSnapshot(emptyBundle, {
    expectedGeneration: exported.metadata.generation,
    createRecovery: false,
    mode: "destructive-release-simulation"
  });
  check((await repository.listResources()).length === 0, "The simulation performs a destructive whole-library change after the checkpoint");
  await repository.restoreRecoverySnapshot(recovery.id);
  const restored = await repository.getResource(saved.id);
  check(restored?.title === saved.title && restored.versions.length === 1, "Recovery restores the deleted approved resource and its version checkpoint");
  check(restored.ai.status === "teacher-approved" && restored.content.coreTask === coreTask, "Recovery retains approval and protected-thinking integrity");

  const restoredExport = await repository.getSnapshot();
  check(printChecksumIsValid(restoredExport), "The post-recovery export receives a fresh valid checksum");
  const roundTripRepository = PERSISTENCE.createRepository({ forceMemory: true, sessionId: "release-simulation-round-trip" });
  await roundTripRepository.open();
  const importResult = await roundTripRepository.importBundle(JSON.stringify(restoredExport), {
    mode: "replace",
    conflict: "overwrite",
    recoveryLabel: "Before deterministic round-trip import"
  });
  check(importResult.importValidation.valid, "A second local installation accepts the recovered checksummed export");
  const roundTripped = await roundTripRepository.getSnapshot();
  check(roundTripped.library.length === 1 && roundTripped.library[0].id === saved.id, "The selected resource survives the export/import round trip without duplication");
  check(roundTripped.library[0].content.answerGuidance.join("|") === saved.content.answerGuidance.join("|"), "Approved content survives the export/import round trip exactly");
  check(roundTripped.library[0].versions.length === 1 && roundTripped.library[0].ai.rounds.length === 1, "Version and AI decision provenance survive the round trip");
  check(printChecksumIsValid(roundTripped) && PERSISTENCE.validateBundle(JSON.stringify(roundTripped), { now: NOW }).valid, "The round-tripped installation emits another independently valid checksum");

  const largeLibrary = [];
  let expectedFilteredCount = 0;
  for (let index = 0; index < 5000; index += 1) {
    const resource = loadResource(index);
    largeLibrary.push(resource);
    if (!resource.archived && resource.favourite && resource.year === "Year 4" && resource.topic === "Fractions") expectedFilteredCount += 1;
  }
  check(largeLibrary.length === 5000, "The performance fixture contains at least 5,000 deterministic resources");
  const largeValidation = PERSISTENCE.validateBundle({
    product: PERSISTENCE.PRODUCT,
    schemaVersion: PERSISTENCE.SCHEMA_VERSION,
    exportedAt: NOW,
    library: largeLibrary
  }, { now: NOW });
  check(largeValidation.valid && largeValidation.quarantined.length === 0, "The 5,000-resource library validates without loss or quarantine");
  check(largeValidation.bundle.library.length === 5000, "Validation preserves the complete 5,000-resource library");
  const expectedIds = largeValidation.bundle.library
    .filter(resource => !resource.archived && resource.favourite && resource.year === "Year 4" && `${resource.title} ${resource.topic}`.toLowerCase().includes("fractions"))
    .sort((left, right) => left.title.localeCompare(right.title))
    .map(resource => resource.id);
  check(expectedIds.length === expectedFilteredCount && expectedIds.length > 0, "The combined search and filter produces the independently counted result set");
  let filterAccumulator = 0;
  for (let pass = 0; pass < 40; pass += 1) {
    const results = largeValidation.bundle.library
      .filter(resource => !resource.archived && resource.favourite && resource.year === "Year 4" && `${resource.title} ${resource.topic}`.toLowerCase().includes("fractions"))
      .sort((left, right) => left.title.localeCompare(right.title));
    filterAccumulator += results.length;
    check(results.length === expectedIds.length && results.every((resource, index) => resource.id === expectedIds[index]), `Large-library filter pass ${pass + 1} is stable and complete`);
  }
  check(filterAccumulator === expectedFilteredCount * 40, "Forty full 5,000-resource filter-and-sort passes complete without mutation or dropped records");
  check(largeValidation.bundle.library.length === 5000, "Repeated filtering leaves the validated library unchanged");

  await repository.close();
  await roundTripRepository.close();
  console.log(`Build 5 release simulation passed · ${assertions} assertions · ${printMatrixCases} print-rule combinations · 5,000-resource load`);
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
