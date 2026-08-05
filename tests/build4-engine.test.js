"use strict";

const assert = require("node:assert/strict");
global.window = global;
require("../data.js");
require("../build3-data.js");
require("../build4-data.js");
require("../resource-engine.js");
require("../verification-engine.js");
require("../persistence.js");
require("../ai-companion.js");

const DATA = global.SCAFFOLD_DATA;
const RESOURCE = global.ScaffoldResourceEngine;
const VERIFY = global.ScaffoldVerificationEngine;
const AI = global.ScaffoldAICompanion;
let assertions = 0;
const check = (condition, message) => { assertions += 1; assert.ok(condition, message); };

function engineFor(subject) {
  return DATA.engines.find(engine => (engine.subjects || []).includes(subject)) || DATA.engines[0];
}

function scaffold(subject = "english", overrides = {}) {
  const engine = engineFor(subject);
  return RESOURCE.normalise({
    id: `test-${subject}`,
    title: `${subject} test scaffold`,
    year: "Year 4",
    subject,
    topic: "A focused curriculum topic",
    objective: "Explain a relationship using relevant evidence and precise subject vocabulary.",
    phase: "Guided practice",
    expectedOutcome: "A justified explanation.",
    situation: "Pupils can notice details but do not yet connect them into a justified explanation.",
    barriers: ["reasoning"],
    essentialThinking: "Pupils must still select the relevant evidence and form the final explanation.",
    pupilAction: "Select evidence, decide what it shows and justify the relationship.",
    engineId: engine.id,
    familyId: engine.family,
    profileId: "",
    stage: "sprout",
    format: "workpage",
    removalPathway: "Remove the partial example, then retain one checking question.",
    vocabulary: ["evidence", "explain", "relationship"],
    prerequisites: ["Notice relevant details", "Use because to connect ideas"],
    misconception: "Any detail counts as relevant evidence.",
    content: {
      instruction: "Select relevant evidence and explain what relationship it supports.",
      example: "A partial example that stops before the final explanation.",
      prompts: ["Which detail is relevant?", "What does it suggest?"],
      vocabulary: ["evidence", "relationship"],
      answerGuidance: [],
      teacherNotes: "Model one decision and stop before the final explanation.",
      diagramType: "",
      diagramLabels: []
    },
    ...overrides
  });
}

function parsed(sectionId, items, taskId = "accurate-examples") {
  return {
    taskId,
    raw: items.join("\n"),
    format: "test",
    warnings: [],
    expectedSections: [sectionId],
    sections: [{ id: sectionId, label: sectionId, mapping: sectionId, expected: true, unexpected: false, items: items.map((text, index) => ({ id: `item-${index}`, text, status: "accepted" })) }]
  };
}

check(DATA.subjects.length === 13, "Build 4 retains all 13 subject areas");
check(DATA.engines.length === 78, "Build 4 retains all 78 Build 3 engines");
check(DATA.printFormats.length === 18, "Build 4 retains all 18 classroom formats");
check(DATA.aiTasks.length >= 56, "The focused task catalogue covers all requested task families");
check(DATA.engines.every(engine => engine.ai?.compatibleTasks?.length && engine.ai?.protectedElements?.length && engine.ai?.allowedSlots?.length), "Every engine declares AI compatibility metadata");
check(DATA.engines.every(engine => engine.ai.localVerificationRules.length && engine.ai.contentLimits), "Every engine declares local checks and content limits");
check(DATA.engines.every(engine => engine.ai.compatibleTasks.every(id => DATA.aiTasks.some(task => task.id === id))), "Every engine compatibility entry resolves to a real focused task");
check(DATA.engines.every(engine => engine.ai.expectedSections.every(id => DATA.ai.sections[id])), "Every engine expected return section resolves to a safe schema");

for (const subject of DATA.subjects.map(item => item.id)) {
  const local = scaffold(subject);
  for (const depth of ["quick", "professional", "forensic"]) {
    const taskId = local.engineId === "bar-model" ? "verify-calculations" : engineFor(subject).ai.compatibleTasks[0];
    const prompt = AI.buildPrompt(local, { taskId, depth, quantity: 4, targetLanguage: subject === "languages" ? "French · France" : "" });
    check(prompt.scrubbed.includes("PROTECTED PUPIL THINKING"), `${subject} ${depth} prompt protects pupil thinking`);
    check(prompt.scrubbed.includes(local.objective), `${subject} ${depth} prompt retains the objective`);
    check(!prompt.scrubbed.includes("<script"), `${subject} ${depth} prompt is inert text`);
    if (depth === "quick") check(!prompt.sectionsIncluded.includes("barrier"), `${subject} quick prompt omits non-essential barrier detail`);
    if (depth === "professional") check(prompt.sectionsIncluded.includes("subject") && prompt.sectionsIncluded.includes("growth"), `${subject} professional prompt includes safeguards and fading`);
    if (depth === "forensic") check(prompt.sectionsIncluded.includes("sources") && prompt.sectionsIncluded.includes("print"), `${subject} forensic prompt includes provenance and print bounds`);
  }
}

for (const task of DATA.aiTasks) {
  const subject = task.subjects[0] === "all" ? "english" : task.subjects[0];
  for (const depth of ["quick", "professional", "forensic"]) {
    const prompt = AI.buildPrompt(scaffold(subject), { taskId: task.id, depth, quantity: task.quantity });
    check(prompt.taskId === task.id && prompt.sectionsIncluded.includes("task") && prompt.sectionsIncluded.includes("return"), `${task.id} builds a bounded ${depth} prompt`);
  }
}
check(AI.buildPrompt(scaffold("english"), { taskId: "reading-passage", textType: "explanation", passagePurpose: "reading instruction", vocabularyFocus: "cohesion" }).scrubbed.includes("Text type: explanation"), "Reading passage studio configuration enters the prompt");
check(AI.buildPrompt(scaffold("mathematics"), { taskId: "practice-questions", questionPurpose: "misconception diagnosis", responseType: "oral explanation" }).scrubbed.includes("Question purpose: misconception diagnosis"), "Question studio configuration enters the prompt");
check(AI.buildPrompt(scaffold("english"), { taskId: "teacher-modelling", modellingLimit: 90 }).scrubbed.includes("Maximum script length: 90 words"), "Teacher modelling stops at a configured concise limit");

const packet = AI.buildPrompt(scaffold("history"), { taskId: "verify-quotation", depth: "forensic", sourceDetails: true });
for (const heading of ["PRIMARY PROMPT", "EXPECTED RESPONSE FORMAT", "RETURN TO SCAFFOLD SEEDS", "TEACHER VERIFICATION CHECKLIST", "LOCAL SCAFFOLD SUMMARY", "COMPACT FALLBACK PROMPT"]) check(packet.packet.includes(heading), `Prompt packet contains ${heading}`);
check(packet.scrubbed.includes("do not invent one"), "Source-sensitive prompt forbids invented sources");
check(packet.providerNeutral && !/OpenAI|ChatGPT|Claude|Gemini/i.test(packet.scrubbed), "Core prompt is provider-neutral");

const privacyText = "Pupil named Oliver Smith, who has ADHD, attends Meadow View Primary School. DOB: 14/05/2016. Email parent@example.org, phone 07123 456789, address 12 Oak Road.";
const privacy = AI.privacyScan(privacyText);
for (const type of ["name", "diagnosis", "school", "dob", "email", "phone", "address"]) check(privacy.findings.some(item => item.type === type), `Privacy scrubber detects ${type}`);
check(!privacy.scrubbed.includes("Oliver") && !privacy.scrubbed.includes("parent@example.org"), "Privacy scrubber offers neutral replacements");
check(AI.privacyScan("Scaffold Seeds has already designed the structure.").clean, "Privacy scan does not mistake the product name for a pupil");

const importCases = [
  ["structured", "EXAMPLES:\n1. First example\n2. Second example\n\nANSWERS:\n1. First answer", "accurate-examples"],
  ["markdown", "Introductory note\n\n## QUESTIONS\n- Why does this happen?\n- What evidence supports it?\n\n## ANSWERS\n- Because of the stated relationship\n- The second detail", "practice-questions"],
  ["table", "VOCABULARY:\n| Word | Meaning |\n|---|---|\n| orbit | a path around another body |", "vocabulary-set"],
  ["json", JSON.stringify({ examples: ["One", "Two"], answers: ["A", "B"], uncertainties: [] }), "accurate-examples"],
  ["malformed JSON", '{"examples":["One", "Two"], "answers": [}', "accurate-examples"],
  ["partial", "QUESTIONS:\n1. One question only", "practice-questions"],
  ["repeated heading", "QUESTIONS:\n1. First\nQUESTIONS:\n1. First", "practice-questions"],
  ["commentary", "Certainly — here is the requested material.\n\nEXAMPLES:\n1. A retained example", "accurate-examples"]
];
for (const [name, raw, taskId] of importCases) {
  const result = AI.parseImport(raw, taskId);
  check(result.rawPreserved && result.sections.length > 0, `${name} import is preserved and recoverable`);
  check(result.sections.every(section => section.items.every(item => !/<script/i.test(item.text))), `${name} import contains inert content only`);
}
const hostile = AI.parseImport("<script>alert(1)</script><style>body{display:none}</style>EXAMPLES:\n1. Safe text", "accurate-examples");
check(!hostile.clean.includes("alert(1)") && !hostile.clean.includes("display:none"), "Scripts and styles are removed rather than executed");
check(AI.parseImport("First block\n\nSecond block", "accurate-examples", "manual").sections.length === 2, "Manual import exposes separate mappable blocks");
check(AI.parseImport("Unstructured content", "reading-passage", "plain").format === "plain text", "Plain-text recovery retains content without requiring headings");
check(AI.trimContent(AI.parseImport("QUESTIONS:\n1. One\n2. Two", "practice-questions"), "split-pages").localSuggestion.format === "mini-booklet", "Content can be reflowed across two pages without silent deletion");
const imageCheck = AI.assessImageSample({ darkest: 220, lightest: 250, darkness: 8.4, count: 10, widthPixels: 600, heightPixels: 400 });
check(imageCheck.contrast === "low" && imageCheck.inkCoverage === 84 && imageCheck.printWidthMm === 51, "Local image sampling reports tonal contrast, ink coverage and safe print size transparently");

let selective = AI.parseImport("EXAMPLES:\n1. Keep this example\n2. Reject this example\n\nANSWERS:\n1. Keep this answer", "accurate-examples");
const exampleItems = selective.sections.find(section => section.id === "examples").items;
selective = AI.setItemDecision(selective, exampleItems[0].id, "accepted");
selective = AI.setItemDecision(selective, exampleItems[1].id, "rejected");
const answerItem = selective.sections.find(section => section.id === "answers").items[0];
selective = AI.setItemDecision(selective, answerItem.id, "edited", "Teacher-edited answer");
const base = scaffold("english");
const selectiveReviewInput = {
  ...JSON.parse(JSON.stringify(selective)),
  raw: "",
  sections: selective.sections.map(section => ({ ...JSON.parse(JSON.stringify(section)), items: section.items.filter(item => ["accepted", "edited"].includes(item.status)) })).filter(section => section.items.length)
};
const selectiveVerification = VERIFY.verify(base, selectiveReviewInput, { taskId: selective.taskId, reviewLevel: "careful" });
selectiveVerification.contentChecksum = AI.verificationFingerprint(base, selective, []);
const applied = AI.applyAccepted(base, selective, { prompt: packet, approved: true, verification: selectiveVerification, roundName: "Selective test" });
check(applied.resource.objective === base.objective && applied.resource.engineId === base.engineId, "Applying content preserves objective and engine");
check(applied.resource.content.example.includes("Keep this example") && !applied.resource.content.example.includes("Reject this example"), "Only accepted items are rebuilt");
check(applied.resource.content.answerGuidance.includes("Teacher-edited answer"), "Teacher edits are applied");
check(applied.resource.ai.rounds[0].decisions.some(item => item.status === "rejected"), "Rejected decisions remain in provenance");
check(AI.portableResource(applied.resource, { excludeHistory: true }).resource.ai.rounds.every(round => round.rawResponse === ""), "Reduced portable export omits raw AI response history without removing the decision record");

const maths = scaffold("mathematics");
let result = VERIFY.verify(maths, parsed("answers", ["6 × 7 = 45"], "verify-calculations"), { taskId: "verify-calculations", reviewLevel: "forensic" });
check(result.findings.some(item => item.title === "Incorrect mathematical answer" && item.severity === "do-not-use"), "Wrong arithmetic is blocked locally");
result = VERIFY.verify(maths, parsed("answers", ["6 × 7 = 42"], "verify-calculations"), { taskId: "verify-calculations" });
check(result.findings.some(item => item.validation === "calculation" && item.resolved), "Correct explicit arithmetic receives a transparent local check");

const deliberateProblems = [
  ["history", "passage", ['Henry wrote, “This is an authentic quotation from the king.”'], "verify-quotation", "Quotation has no provenance"],
  ["science", "passage", ["Plants eat sunlight to grow."], "verify-science", "Scientific misconception"],
  ["english", "questions", ["The correct inference is that the character is afraid. Copy this answer."], "critique-answer-leakage", "Possible answer leakage"],
  ["religious-education", "passage", ["All Christians believe and practise exactly the same things."], "critique-accuracy", "Universal claim about a worldview"],
  ["pshe", "questions", ["Tell the class about a time your parents argue."], "scenario-cards", "Public personal disclosure"],
  ["geography", "instructions", ["Use the red items only."], "shorten-instructions", "Meaning may rely on colour alone"]
];
for (const [subject, section, items, taskId, expected] of deliberateProblems) {
  result = VERIFY.verify(scaffold(subject), parsed(section, items, taskId), { taskId, reviewLevel: "forensic" });
  check(result.findings.some(item => item.title === expected), `${subject} verifier flags ${expected}`);
}

result = VERIFY.verify(scaffold("english"), parsed("questions", ["What happened?", "What happened?"], "practice-questions"), { taskId: "practice-questions", quantity: 2 });
check(result.findings.some(item => item.title === "Repeated item"), "Duplicate questions are flagged");
result = VERIFY.verify(scaffold("english"), parsed("vocabulary", ["Evaporation — evaporation is when water changes"], "vocabulary-set"), { taskId: "vocabulary-set" });
check(result.findings.some(item => item.title === "Definition may be circular"), "Circular vocabulary definitions are flagged");
result = VERIFY.verify(scaffold("computing", { content: { instruction: "Trace the steps.", example: "", prompts: [], vocabulary: [], diagramType: "flowchart", diagramLabels: ["Start"] }, diagram: { type: "flowchart", labels: ["Start"] } }), parsed("questions", ["Trace the algorithm."], "practice-questions"), { taskId: "practice-questions" });
check(result.findings.some(item => item.title === "Local representation is malformed"), "Malformed local diagrams receive the strongest restrained warning");

const trace = VERIFY.traceSimpleAlgorithm("SET score = 2\nADD score BY 3\nMULTIPLY score BY 4");
check(trace.length === 3 && trace[2].state.score === 20, "Manual computing trace follows simple variable changes");

console.log(`Build 4 engine tests passed · ${assertions} assertions`);
