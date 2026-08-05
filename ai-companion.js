(function () {
  "use strict";

  const DATA = window.SCAFFOLD_DATA;
  const RESOURCE = window.ScaffoldResourceEngine;
  const VERIFY = window.ScaffoldVerificationEngine;
  if (!DATA?.ai || !RESOURCE || !VERIFY) throw new Error("Build 4 AI Companion dependencies are missing.");

  const clone = value => JSON.parse(JSON.stringify(value));
  const unique = values => [...new Set(values.filter(Boolean))];
  const words = value => String(value || "").trim().split(/\s+/).filter(Boolean);
  const cleanLine = value => String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\s+/g, " ").trim();
  const normaliseKey = value => cleanLine(value).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const taskById = id => DATA.aiTasks.find(task => task.id === id) || DATA.aiTasks[0];
  const subjectById = id => DATA.subjects.find(subject => subject.id === id) || DATA.subjects[0];
  const engineById = id => DATA.engines.find(engine => engine.id === id) || DATA.engines[0];
  const stageById = id => DATA.stages.find(stage => stage.id === id) || DATA.stages[1];
  const formatById = id => DATA.printFormats.find(format => format.id === id) || DATA.printFormats[0];

  const headingAliases = {
    title: "title", heading: "title",
    instruction: "instructions", instructions: "instructions", directions: "instructions", task: "instructions",
    vocabulary: "vocabulary", words: "vocabulary", definitions: "vocabulary", glossary: "vocabulary",
    example: "examples", examples: "examples", "worked-examples": "examples",
    "non-example": "non-examples", "non-examples": "non-examples", "near-misses": "non-examples",
    question: "questions", questions: "questions", prompts: "questions", "practice-questions": "questions",
    answer: "answers", answers: "answers", "answer-key": "answers", solutions: "answers",
    passage: "passage", text: "passage", "reading-passage": "passage", "information-text": "passage",
    scenario: "scenarios", scenarios: "scenarios", cards: "scenarios", "scenario-cards": "scenarios",
    model: "model-response", "model-response": "model-response", "model-responses": "model-response",
    misconception: "misconceptions", misconceptions: "misconceptions", errors: "misconceptions",
    "teacher-guidance": "teacher-guidance", "teacher-notes": "teacher-guidance", guidance: "teacher-guidance",
    critique: "critique", feedback: "critique", findings: "critique", recommendations: "critique",
    verification: "verification", checks: "verification", "accuracy-check": "verification",
    source: "sources", sources: "sources", provenance: "sources", references: "sources",
    uncertainty: "uncertainties", uncertainties: "uncertainties", caveats: "uncertainties", limitations: "uncertainties",
    "change-notes": "change-notes", changes: "change-notes", "what-changed": "change-notes",
    "image-brief": "image-brief", illustration: "image-brief", "illustration-brief": "image-brief",
    "diagram-spec": "diagram-spec", "diagram-specification": "diagram-spec", diagram: "diagram-spec"
  };

  function defaultOptions(scaffold = {}) {
    const engine = engineById(scaffold.engineId);
    const compatible = engine.ai?.compatibleTasks || DATA.aiTasks.map(item => item.id);
    const taskId = compatible.includes("accurate-examples") ? "accurate-examples" : compatible[0] || "accurate-examples";
    const task = taskById(taskId);
    return {
      taskId,
      depth: task.risk === "forensic" ? "forensic" : "professional",
      reviewLevel: task.risk,
      quantity: task.quantity,
      returnFormat: "structured-text",
      stageScope: "all",
      changeSlot: engine.ai?.allowedSlots?.[0] || "example",
      readingDemand: scaffold.year || "Year 4",
      maxWords: task.id.includes("passage") || task.id === "information-text" ? 350 : 180,
      preserveTerminology: true,
      sourceDetails: task.sourceSensitive,
      selectedKnowledge: ["prerequisites", "vocabulary", "misconceptions", "progression", "representations"],
      targetLanguage: "",
      languageVariant: "",
      phonicsProgramme: "",
      taughtVocabulary: "",
      contextNote: "",
      textType: "information text",
      passagePurpose: "subject access",
      vocabularyFocus: "",
      assumedKnowledge: "",
      passageVersion: "original",
      questionPurpose: "reasoning",
      responseType: "short explanation",
      difficultyPattern: "build then vary",
      contextRange: "one familiar and one unfamiliar context",
      answerRequirements: "separate answer and brief audit",
      misconceptionFocus: "",
      coreFeature: "",
      variationPattern: "vary irrelevant features and include close boundary cases",
      modelPurpose: "noticing quality",
      modelType: "strong and partial contrast",
      revealAmount: "reveal only what pupils need to notice",
      observedMisconception: "",
      misconceptionKind: "not yet classified",
      vocabularyDetail: "full teacher record; concise pupil selection",
      modellingMistake: "include only if instructionally useful",
      modellingLimit: 140,
      traceAlgorithm: "SET score = 2\nADD score BY 3",
      paper: "A4",
      orientation: "portrait",
      inkMode: "photocopy safe",
      imagePurpose: "explanatory",
      manualPromptNote: ""
    };
  }

  function createWorkspace(scaffold, saved = null) {
    const base = {
      schemaVersion: 5,
      id: uid("aiw"),
      resourceId: scaffold?.id || "",
      phase: "task",
      options: defaultOptions(scaffold),
      prompt: null,
      rawImport: "",
      parsed: null,
      verification: null,
      comparisonSection: "",
      rawPreservedAt: null,
      approvalChecked: false,
      approvalScope: "resource",
      selectedPage: "all",
      roundName: "",
      sourceRecords: [],
      image: null,
      lastSavedAt: new Date().toISOString(),
      rejectedChanges: [],
      appliedAt: null
    };
    if (!saved || saved.resourceId !== base.resourceId) return base;
    return {
      ...base,
      ...saved,
      options: { ...base.options, ...(saved.options || {}) },
      schemaVersion: 5,
      lastSavedAt: new Date().toISOString()
    };
  }

  function privacyScan(text) {
    const source = String(text || "");
    const findings = [];
    const patterns = [
      { type: "email", label: "Email address", replacement: "[email removed]", regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
      { type: "phone", label: "Phone number", replacement: "[phone removed]", regex: /(?:\+?44\s?\d{2,4}|0\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g },
      { type: "dob", label: "Possible date of birth", replacement: "[date removed]", regex: /\b(?:date of birth|dob|born on)\s*[:\-]?\s*(?:\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/gi },
      { type: "address", label: "Possible street address", replacement: "[address removed]", regex: /\b\d{1,4}\s+[A-Z][A-Za-z' -]{2,35}\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Close|Court|Way)\b/gi },
      { type: "school", label: "Possible school identifier", replacement: "[school removed]", regex: /\b[A-Z][A-Za-z'& -]{2,45}\s+(?:Primary School|Junior School|Infant School|Academy|Preparatory School)\b/g },
      { type: "initials", label: "Possible pupil initials", replacement: "[pupil]", regex: /\b(?:pupil|student|child)\s+[A-Z](?:\.[A-Z])?\.?\b/gi },
      { type: "name", label: "Possible pupil name", replacement: "A pupil", regex: /\b(?:pupil|student|child)\s+(?:called|named)\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b/gi },
      { type: "name", label: "Possible named pupil", replacement: "A pupil", regex: /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?(?=,\s+(?:who|aged|age)|\s+(?:has\s+(?:ADHD|autism|dyslexia|dyspraxia|a diagnosis|difficulty|difficulties)|is diagnosed|struggles with|finds it difficult to))\b/g },
      { type: "diagnosis", label: "Diagnostic detail", replacement: "an observable access barrier", regex: /\b(?:diagnosed with\s+)?(?:ADHD|autism|autistic|dyslexia|dyslexic|dyspraxia|DCD|ODD|SEND diagnosis|medical condition)\b/gi },
      { type: "safeguarding", label: "Possible sensitive personal history", replacement: "[sensitive detail removed]", regex: /\b(?:safeguarding concern|care order|foster care|family conflict|domestic abuse|trauma history|medical history|behaviour history)\b/gi }
    ];
    patterns.forEach(pattern => {
      for (const match of source.matchAll(pattern.regex)) findings.push({ id: uid("privacy"), type: pattern.type, label: pattern.label, value: match[0], replacement: pattern.replacement, index: match.index, length: match[0].length });
    });
    findings.sort((a, b) => a.index - b.index || b.length - a.length);
    const nonOverlapping = [];
    findings.forEach(item => {
      if (!nonOverlapping.some(existing => item.index < existing.index + existing.length && item.index + item.length > existing.index)) nonOverlapping.push(item);
    });
    let scrubbed = source;
    [...nonOverlapping].sort((a, b) => b.index - a.index).forEach(item => { scrubbed = scrubbed.slice(0, item.index) + item.replacement + scrubbed.slice(item.index + item.length); });
    return {
      original: source,
      scrubbed,
      findings: nonOverlapping,
      warning: nonOverlapping.length ? "Possible identifying or sensitive information was found. Review every replacement before copying." : "No obvious identifying pattern was found. Detection is not flawless; review the prompt yourself.",
      clean: nonOverlapping.length === 0
    };
  }

  function localKnowledge(scaffold, options) {
    const subject = subjectById(scaffold.subject);
    const brain = DATA.subjectBrains[scaffold.subject] || DATA.subjectBrains.english;
    const profile = brain.profiles.find(item => item.id === scaffold.profileId) || brain.profiles[0];
    const selected = new Set(options.selectedKnowledge || []);
    const entries = [];
    if (selected.has("prerequisites")) entries.push(["Relevant prior learning", (scaffold.prerequisites || profile.prerequisites || []).join("; ")]);
    if (selected.has("vocabulary")) entries.push(["Terminology to preserve", (scaffold.vocabulary || profile.vocabulary || []).join(", ")]);
    if (selected.has("misconceptions")) entries.push(["Misconception to avoid or expose", scaffold.misconception || profile.misconceptions?.[0] || "None selected"]);
    if (selected.has("progression")) entries.push(["Progression note", (brain.progression || []).slice(0, 3).join(" → ")]);
    if (selected.has("representations")) entries.push(["Representation guidance", scaffold.representation || profile.representations?.[0]?.name || "Do not force a representation"]);
    entries.push(["Subject principles", (subject.principles || []).join("; ")]);
    return entries.filter(([, value]) => value);
  }

  function returnSchema(task, options) {
    const fields = unique([...(task.sections || []), "uncertainties"]);
    if (options.sourceDetails && !fields.includes("sources")) fields.splice(Math.max(0, fields.length - 1), 0, "sources");
    if (options.returnFormat === "json") {
      return `Return one JSON object with these keys only: ${fields.join(", ")}. Use arrays for item lists and strings for passages or briefs. Do not include HTML or code.`;
    }
    const blocks = fields.map(id => {
      const label = (DATA.ai.sections[id]?.name || id).toUpperCase().replace(/ /g, "_");
      const itemised = DATA.ai.sections[id]?.itemised;
      return `${label}:\n${itemised ? "1. ...\n2. ..." : "..."}`;
    }).join("\n\n");
    return `Return plain structured text using exactly these headings. Do not wrap it in a code fence.\n\n${blocks}`;
  }

  function specialistConstraints(task, options) {
    const passageTasks = ["reading-passage", "information-text", "background-knowledge"];
    const questionTasks = ["practice-questions", "reasoning-prompts", "retrieval-questions", "extension", "challenge-pathway", "independence-check"];
    const exampleTasks = ["accurate-examples", "non-examples", "alternative-examples", "misconception-contrast"];
    const modelTasks = ["model-responses", "flawed-responses"];
    const misconceptionTasks = ["misconceptions", "misconception-contrast", "critique-misconceptions"];
    const vocabularyTasks = ["vocabulary-set", "verify-vocabulary"];
    const lines = [];
    if (passageTasks.includes(task.id)) lines.push(`Text type: ${options.textType}. Purpose: ${options.passagePurpose}. Requested version: ${options.passageVersion}. Vocabulary focus: ${options.vocabularyFocus || "use only the named local terminology"}. Background knowledge assumed: ${options.assumedKnowledge || "only the prior learning stated above"}.`);
    if (questionTasks.includes(task.id)) lines.push(`Question purpose: ${options.questionPurpose}. Response type: ${options.responseType}. Difficulty pattern: ${options.difficultyPattern}. Context range: ${options.contextRange}. Answer requirement: ${options.answerRequirements}. Misconception focus: ${options.misconceptionFocus || "none added beyond local knowledge"}.`);
    if (exampleTasks.includes(task.id)) lines.push(`Defining feature to preserve: ${options.coreFeature || "infer it from the stated objective and flag uncertainty"}. Variation pattern: ${options.variationPattern}. Non-examples must be plausible near misses, not unrelated objects.`);
    if (modelTasks.includes(task.id)) lines.push(`Model purpose: ${options.modelPurpose}. Model type: ${options.modelType}. Reveal: ${options.revealAmount}. State how the teacher can prevent imitation from replacing composition or reasoning.`);
    if (misconceptionTasks.includes(task.id)) lines.push(`Observed misconception: ${options.observedMisconception || "none supplied; offer candidates only"}. Current classification: ${options.misconceptionKind}. Distinguish misconception, procedural error, language misunderstanding, careless slip and missing prerequisite.`);
    if (vocabularyTasks.includes(task.id)) lines.push(`Vocabulary focus: ${options.vocabularyFocus || "the local terminology listed above"}. Detail balance: ${options.vocabularyDetail}. Flag circular definitions, harder unexplained words, inaccurate synonyms and everyday meanings that displace subject meanings.`);
    if (task.id === "teacher-modelling") lines.push(`Deliberate mistake: ${options.modellingMistake}. Maximum script length: ${Math.max(60, Math.min(Number(options.modellingLimit) || 140, 300))} words. End at the exact point where pupils resume the protected thinking.`);
    return lines.join("\n");
  }

  function promptSections(scaffold, options) {
    const task = taskById(options.taskId);
    const engine = engineById(scaffold.engineId);
    const subject = subjectById(scaffold.subject);
    const stage = stageById(scaffold.stage);
    const content = RESOURCE.normalise(scaffold).content;
    const barriers = (scaffold.barriers || []).map(id => DATA.barriers.find(item => item.id === id)?.name).filter(Boolean);
    const selectedDepth = DATA.ai.promptDepths.find(item => item.id === options.depth) || DATA.ai.promptDepths[1];
    const include = new Set(selectedDepth.includes);
    const sections = [];
    const add = (id, title, body) => { if (include.has(id) && cleanLine(body)) sections.push({ id, title, body: String(body).trim() }); };

    add("role", "ROLE", "Scaffold Seeds has already designed the pedagogical structure. You are an external content specialist contributing to one named slot. Do not redesign the resource.");
    add("context", "CURRICULUM CONTEXT", `Jurisdiction: England primary\nYear group: ${scaffold.year}\nSubject: ${subject.name}\nTopic: ${scaffold.topic}\nCurriculum objective: ${scaffold.objective}\nLesson phase: ${scaffold.phase}\nExpected pupil outcome: ${scaffold.expectedOutcome || "Demonstrate the objective through the protected subject decision."}`);
    const knowledge = localKnowledge(scaffold, options);
    add("prior-learning", "RELEVANT LOCAL KNOWLEDGE", knowledge.map(([label, value]) => `${label}: ${value}`).join("\n"));
    add("barrier", "OBSERVED BARRIER", `Teacher observation: ${scaffold.situation || "Not supplied"}\nBarrier analysis: ${barriers.join(", ") || "Teacher-defined barrier"}${scaffold.customBarrier ? `; ${scaffold.customBarrier}` : ""}`);
    add("protected-thinking", "PROTECTED PUPIL THINKING", `${scaffold.essentialThinking || scaffold.disciplinaryThinking}\nThe pupil must still: ${scaffold.pupilAction || engine.preserves}. Do not complete this thinking.`);
    add("design", "LOCAL SCAFFOLD DESIGN", `Engine: ${engine.name}\nPurpose: ${engine.tagline}\nStructure: ${engine.distinctive}\nAllowed content slots: ${(engine.ai?.allowedSlots || []).join(", ")}\nProtected elements: ${(engine.ai?.protectedElements || []).join("; ")}\nCurrent instruction: ${content.instruction}\nCurrent prompts: ${content.prompts.join(" | ")}`);
    add("growth", "SUPPORT AND FADING", `Current stage: ${stage.name} — ${stage.description}\nRemoval pathway: ${scaffold.removalPathway || RESOURCE.nextFade(scaffold)}\nApply returned content to: ${options.stageScope === "all" ? "the shared content used across all connected stages" : `${stage.name} only`}. Do not invent four unrelated worksheets.`);
    add("task", "ONE REQUESTED TASK", `${task.promptInstruction}.\nGenerate ${Math.max(1, Math.min(Number(options.quantity) || task.quantity, 20))} ${task.quantity === 1 ? "item" : "items"} where quantity applies.\nYou may change: ${task.changes}.\nYou must preserve: ${task.preserves}.\nLeave untouched: ${task.leavesUntouched}.\nTarget slot: ${options.changeSlot}.${options.contextNote ? `\nTeacher note: ${options.contextNote}` : ""}${specialistConstraints(task, options) ? `\nSpecialist configuration: ${specialistConstraints(task, options)}` : ""}`);
    add("constraints", "CONTENT CONSTRAINTS", `Maximum response length for the main content: approximately ${Math.max(60, Math.min(Number(options.maxWords) || 180, 1500))} words.\nReading demand: suitable for ${options.readingDemand || scaffold.year} while retaining essential subject terminology.\nUse UK spelling. Avoid filler, marketing language and generic worksheet sections.\nDo not include pupil names, profiles, diagnoses, school identifiers or personal data.\nDo not copy commercial worksheets, reproduce substantial modern texts or imitate a living illustrator exactly.${options.preserveTerminology ? "\nPreserve the terminology named in local knowledge." : ""}`);
    add("subject", "SUBJECT SAFEGUARDS", [...DATA.ai.commonSafeguards, ...(DATA.ai.subjectSafeguards[scaffold.subject] || [])].map(item => `- ${item}`).join("\n"));
    add("inclusion", "ACCESS AND INCLUSION", "Change only the named access demand. Do not simplify the curriculum content itself. Do not rely on colour alone, fixed-ability labels, public personal disclosure, diagnostic assumptions or stereotyped contexts. Keep pupil agency and natural breadth.");
    add("print", "LOCAL PRINT CONSTRAINTS", `Scaffold Seeds—not you—controls page dimensions, fonts, margins, spacing, diagrams and stage labels. Return content that can fit ${options.paper || "A4"} ${options.orientation || "portrait"} in ${options.inkMode || "photocopy-safe"} form. Do not return a finished document.`);
    add("sources", "SOURCE HANDLING", "Use named authoritative sources where factual sourcing is required. Give source details separately. Distinguish quotation from paraphrase and reconstruction. If you cannot verify a quotation or source, do not invent one; state that no verified source was available. Mark all uncertainty.");
    add("return", "RETURN FORMAT", returnSchema(task, options));
    add("verification", "SELF-CHECK BEFORE RETURN", "Check subject accuracy, answer alignment, answer leakage, age appropriateness, cultural assumptions and whether the protected pupil thinking remains intact. Put unresolved issues under UNCERTAINTIES. Do not claim that your own response is verified.");
    return { sections, task, engine, subject, stage, content, depth: selectedDepth };
  }

  function compactPrompt(scaffold, options, parts) {
    const task = parts.task;
    const safeguards = (DATA.ai.subjectSafeguards[scaffold.subject] || []).slice(0, 2).join(" ");
    return `Scaffold Seeds has already designed a ${parts.engine.name} for ${scaffold.year} ${parts.subject.name}: ${scaffold.objective}. ${task.promptInstruction}. Generate ${Math.max(1, Number(options.quantity) || task.quantity)} item(s) only. Change ${task.changes.toLowerCase()}; preserve ${task.preserves.toLowerCase()}, the scaffold structure and this pupil-owned thinking: ${scaffold.essentialThinking || scaffold.disciplinaryThinking}. ${safeguards} Do not invent sources or personal data. ${returnSchema(task, { ...options, returnFormat: "structured-text" })}`;
  }

  function imageBriefPrompt(scaffold, options) {
    return `Create an image-generation brief only; do not generate an image.\n\nEducational purpose: ${options.imagePurpose || "explanatory support"}\nYear group: ${scaffold.year}\nSubject and learning: ${subjectById(scaffold.subject).name} — ${scaffold.objective}\nEssential objects or scene: ${options.contextNote || scaffold.topic}\nSubject accuracy: every visible relationship must be plausible and suitable for teacher review.\nLabels: leave all instructional labels blank for Scaffold Seeds to add locally.\nPerspective: simple, readable and unambiguous.\nStyle: calm original educational illustration; no imitation of a named living artist.\nColour: limited palette that remains legible in greyscale.\nPrint: ${options.paper || "A4"}, ${options.orientation || "portrait"}, white or transparent background, low ink coverage.\nAvoid: text, logos, identifiable pupils, stereotypes, clutter, decorative details that compete with the task, and any precision-critical diagram.\nState whether the image is decorative, explanatory or interactive. Mark anything that requires subject checking.`;
  }

  function buildPrompt(scaffold, supplied = {}) {
    const options = { ...defaultOptions(scaffold), ...supplied };
    const parts = promptSections(scaffold, options);
    const primary = parts.sections.map(section => `${section.title}\n${section.body}`).join("\n\n");
    const compact = compactPrompt(scaffold, options, parts);
    const structured = promptSections(scaffold, { ...options, returnFormat: "json" }).sections.map(section => `${section.title}\n${section.body}`).join("\n\n");
    const verificationOnly = buildVerificationPrompt(scaffold, options);
    const imageBrief = imageBriefPrompt(scaffold, options);
    const scan = privacyScan(primary);
    const expected = returnSchema(parts.task, options);
    const packet = [
      "SCAFFOLD SEEDS · AI PROMPT PACKET",
      "",
      "FOR THE TEACHER",
      `This packet requests one bounded contribution: ${parts.task.name}. Scaffold Seeds retains the learning design, verification and print layout. Review all returned content before use.`,
      "",
      "PRIMARY PROMPT",
      scan.scrubbed,
      "",
      "EXPECTED RESPONSE FORMAT",
      expected,
      "",
      "RETURN TO SCAFFOLD SEEDS",
      "Paste the complete response into AI Companion. Keep the raw response, run automatic structuring, accept or reject individual items, complete verification, then rebuild locally.",
      "",
      "TEACHER VERIFICATION CHECKLIST",
      "- Does each item serve the selected objective?\n- Is the protected pupil thinking still required?\n- Are answers, calculations, vocabulary and sources accurate?\n- Is any quotation authentic and traceable?\n- Is the language, context and print density appropriate?\n- Are unresolved uncertainties recorded?",
      "",
      "LOCAL SCAFFOLD SUMMARY",
      `${scaffold.title}\n${scaffold.year} · ${parts.subject.name} · ${parts.engine.name}\nObjective: ${scaffold.objective}\nProtected thinking: ${scaffold.essentialThinking || scaffold.disciplinaryThinking}`,
      "",
      "COMPACT FALLBACK PROMPT",
      privacyScan(compact).scrubbed
    ].join("\n");
    return {
      id: uid("prompt"),
      createdAt: new Date().toISOString(),
      taskId: parts.task.id,
      taskName: parts.task.name,
      depth: options.depth,
      reviewLevel: options.reviewLevel,
      options,
      primary,
      scrubbed: scan.scrubbed,
      compact,
      structured,
      imageBrief,
      verificationOnly,
      packet,
      expected,
      sectionsIncluded: parts.sections.map(section => section.id),
      privacy: scan,
      providerNeutral: true
    };
  }

  function buildVerificationPrompt(scaffold, options = {}) {
    const task = taskById(options.taskId || "critique-accuracy");
    return `Review the content below without rewriting it. Scaffold Seeds remains the educational authority and local layout engine.\n\nContext: ${scaffold.year} ${subjectById(scaffold.subject).name}; ${scaffold.objective}.\nProtected pupil thinking: ${scaffold.essentialThinking || scaffold.disciplinaryThinking}.\nScaffold: ${engineById(scaffold.engineId).name}, ${stageById(scaffold.stage).name}.\nReview lens: ${task.name}.\n\nCheck factual or mathematical accuracy, answer leakage, barrier alignment, subject authenticity, cognitive load, pupil agency, inclusion, fading and print usability. Distinguish locally checkable structure from claims that require an authoritative source or teacher judgement. Do not claim certainty you cannot establish. Return CRITIQUE, SOURCES and UNCERTAINTIES sections only.\n\nCONTENT TO REVIEW:\n${RESOURCE.sanitizeImport([scaffold.content?.instruction, scaffold.content?.example, ...(scaffold.content?.prompts || []), ...(scaffold.content?.vocabulary || [])].filter(Boolean).join("\n"))}`;
  }

  function sanitiseRaw(raw) {
    let text = String(raw || "").slice(0, 60000);
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
    text = text.replace(/```(?:json|markdown|text|html)?\s*\n?/gi, "").replace(/```/g, "");
    text = text.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p\s*>/gi, "\n").replace(/<[^>]+>/g, " ");
    text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\r\n?/g, "\n");
    return text.split("\n").map(line => line.replace(/[ \t]+$/g, "")).join("\n").trim();
  }

  function canonicalHeading(label) {
    const key = normaliseKey(label.replace(/^#+\s*/, "").replace(/^\*\*|\*\*$/g, ""));
    return headingAliases[key] || (DATA.ai.sections[key] ? key : "");
  }

  function itemiseBlock(text, sectionId) {
    const source = String(text || "").trim();
    if (!source) return [];
    const schema = DATA.ai.sections[sectionId] || DATA.ai.sections.other;
    if (!schema.itemised || ["passage", "instructions", "image-brief", "diagram-spec"].includes(sectionId)) return [{ id: uid("item"), text: source, originalText: source, status: "pending" }];
    const lines = source.split("\n").map(line => line.trim()).filter(Boolean);
    const tableLines = lines.filter(line => /^\|?.+\|.+\|?$/.test(line) && !/^\|?\s*:?-{3,}/.test(line));
    let values;
    if (tableLines.length >= 2) {
      values = tableLines.map(line => line.replace(/^\||\|$/g, "").split("|").map(cleanLine).filter(Boolean).join(" — ")).filter(Boolean);
    } else if (lines.some(line => /^\s*(?:[-*•]|\d+[.)])\s+/.test(line))) {
      values = [];
      lines.forEach(line => {
        const match = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
        if (match) values.push(cleanLine(match[1]));
        else if (values.length) values[values.length - 1] += ` ${cleanLine(line)}`;
        else values.push(cleanLine(line));
      });
    } else values = source.split(/\n\s*\n/).map(cleanLine).filter(Boolean);
    if (values.length === 1 && /\s*;\s*/.test(values[0]) && sectionId === "vocabulary") values = values[0].split(/\s*;\s*/).map(cleanLine).filter(Boolean);
    return values.map(value => ({ id: uid("item"), text: value, originalText: value, status: "pending" }));
  }

  function sectionsFromJSON(value) {
    const object = Array.isArray(value) ? { other: value } : value;
    return Object.entries(object || {}).map(([key, content]) => {
      const id = canonicalHeading(key) || "other";
      const text = Array.isArray(content) ? content.map((item, index) => typeof item === "object" ? `${index + 1}. ${Object.entries(item).map(([k, v]) => `${k}: ${String(v)}`).join("; ")}` : `${index + 1}. ${String(item)}`).join("\n") : typeof content === "object" ? Object.entries(content || {}).map(([k, v]) => `${k}: ${String(v)}`).join("\n") : String(content ?? "");
      return { id, label: DATA.ai.sections[id]?.name || key, items: itemiseBlock(text, id), mapping: id, expected: false, unexpected: id === "other" };
    }).filter(section => section.items.length);
  }

  function sectionsFromText(clean, task) {
    const lines = clean.split("\n");
    const blocks = [];
    let current = { id: "", label: "", lines: [] };
    const finish = () => {
      const text = current.lines.join("\n").trim();
      if (text) blocks.push({ id: current.id || "other", label: current.label || "Other content", text });
      current = { id: "", label: "", lines: [] };
    };
    lines.forEach(line => {
      const markdown = line.match(/^\s*#{1,6}\s+(.{2,60})\s*$/);
      const bold = line.match(/^\s*\*\*(.{2,60})\*\*\s*:?\s*$/);
      const colon = line.match(/^\s*([A-Z][A-Z _\-/]{1,45}|[A-Za-z][A-Za-z _\-/]{1,35})\s*:\s*(.*)$/);
      const candidate = markdown?.[1] || bold?.[1] || colon?.[1] || "";
      const id = candidate ? canonicalHeading(candidate) : "";
      if (id) {
        finish();
        current.id = id;
        current.label = DATA.ai.sections[id]?.name || candidate;
        if (colon?.[2]) current.lines.push(colon[2]);
      } else current.lines.push(line);
    });
    finish();
    if (blocks.length === 1 && blocks[0].id === "other") {
      const expected = task.sections.filter(id => id !== "uncertainties");
      blocks[0].id = expected[0] || "other";
      blocks[0].label = DATA.ai.sections[blocks[0].id]?.name || "Imported text";
    }
    return blocks.map(block => ({ id: block.id, label: block.label, items: itemiseBlock(block.text, block.id), mapping: block.id, expected: task.sections.includes(block.id), unexpected: !task.sections.includes(block.id) && block.id !== "uncertainties" }));
  }

  function mergeSections(sections) {
    const merged = [];
    sections.forEach(section => {
      const existing = merged.find(item => item.id === section.id);
      if (existing) existing.items.push(...section.items);
      else merged.push(section);
    });
    return merged;
  }

  function parseImport(raw, taskId, mode = "automatic") {
    const task = taskById(taskId);
    const clean = sanitiseRaw(raw);
    const warnings = [];
    let format = "structured text";
    let sections = [];
    const looksJSON = /^[\[{]/.test(clean);
    if (mode === "manual") {
      format = "manual blocks";
      sections = clean.split(/\n\s*\n/).map((block, index) => ({ id: "other", label: `Imported block ${index + 1}`, items: itemiseBlock(block, "other"), mapping: "other", expected: false, unexpected: true })).filter(section => section.items.length);
    } else if (mode === "plain") {
      const id = task.sections.find(section => section !== "uncertainties") || "other";
      format = "plain text";
      sections = [{ id, label: DATA.ai.sections[id]?.name || "Imported text", items: itemiseBlock(clean, id), mapping: id, expected: true, unexpected: false }].filter(section => section.items.length);
    } else if (looksJSON) {
      try {
        sections = sectionsFromJSON(JSON.parse(clean));
        format = "JSON";
      } catch (error) {
        warnings.push({ level: "review", title: "JSON could not be read", message: "The response looks like JSON but is malformed. The raw content was preserved and parsed as text.", action: "Inspect brackets and quotation marks, or use manual mapping." });
      }
    }
    if (!sections.length) sections = sectionsFromText(clean, task);
    sections = (mode === "manual" ? sections : mergeSections(sections)).map(section => ({ ...section, expected: task.sections.includes(section.id), unexpected: !task.sections.includes(section.id) && section.id !== "uncertainties" }));
    const duplicates = [];
    sections.forEach(section => {
      const seen = new Set();
      section.items.forEach(item => {
        const key = normaliseKey(item.text);
        if (seen.has(key)) duplicates.push(item.id);
        else seen.add(key);
      });
    });
    if (duplicates.length) warnings.push({ level: "review", title: "Repeated items detected", message: `${duplicates.length} item${duplicates.length === 1 ? " appears" : "s appear"} more than once.`, action: "Keep one copy and reject the repeats." });
    const missing = task.sections.filter(id => id !== "uncertainties" && !sections.some(section => section.id === id));
    if (missing.length) warnings.push({ level: "review", title: "Expected sections are missing", message: missing.map(id => DATA.ai.sections[id]?.name || id).join(", "), action: "Map a block manually, enter it yourself, or prepare a prompt for only the missing section." });
    if (clean.length >= 60000) warnings.push({ level: "important", title: "Import was trimmed", message: "The raw response exceeded the local 60,000-character safety limit.", action: "Split the response into smaller imports." });
    return {
      id: uid("import"),
      taskId: task.id,
      raw: String(raw || ""),
      clean,
      format,
      mode,
      sections,
      warnings,
      expectedSections: task.sections,
      missing,
      importedAt: new Date().toISOString(),
      rawPreserved: true
    };
  }

  function mapSection(parsed, sectionIndex, mapping) {
    const next = clone(parsed);
    const section = next.sections[sectionIndex];
    if (!section) return next;
    section.mapping = mapping;
    section.id = mapping === "ignore" ? "other" : mapping;
    section.label = mapping === "ignore" ? "Ignored" : DATA.ai.sections[mapping]?.name || section.label;
    section.unexpected = mapping === "ignore" ? false : !next.expectedSections.includes(mapping) && mapping !== "uncertainties";
    return next;
  }

  function setItemDecision(parsed, itemId, status, editedText = null) {
    const next = clone(parsed);
    next.sections.forEach(section => section.items.forEach(item => {
      if (item.id === itemId) {
        item.status = status;
        if (editedText != null) item.editedText = sanitiseRaw(editedText).slice(0, 5000);
      }
    }));
    return next;
  }

  function decideSection(parsed, sectionId, status) {
    const next = clone(parsed);
    next.sections.filter(section => section.id === sectionId).forEach(section => section.items.forEach(item => { item.status = status; }));
    return next;
  }

  function originalForSection(scaffold, sectionId) {
    const content = RESOURCE.normalise(scaffold).content;
    const map = {
      title: scaffold.title,
      instructions: content.instruction,
      vocabulary: (content.vocabulary || []).join("\n"),
      examples: content.example,
      "non-examples": content.example,
      questions: (content.prompts || []).join("\n"),
      answers: (content.answerGuidance || []).join("\n"),
      passage: content.example,
      scenarios: (content.prompts || []).join("\n"),
      "model-response": content.example,
      misconceptions: content.misconception || scaffold.misconception,
      "teacher-guidance": content.teacherNotes,
      critique: (scaffold.ai?.reviewActions || []).join("\n"),
      sources: (scaffold.sources || []).map(source => source.title || source.note || "").join("\n"),
      "image-brief": scaffold.ai?.imageBrief || "",
      "diagram-spec": scaffold.ai?.diagramSpec || ""
    };
    return String(map[sectionId] || "");
  }

  function proposedForSection(parsed, sectionId, acceptedOnly = false) {
    return (parsed?.sections || []).filter(section => section.id === sectionId).flatMap(section => section.items || []).filter(item => !acceptedOnly || ["accepted", "edited"].includes(item.status)).map(item => item.editedText ?? item.text).join("\n");
  }

  function diffWords(before, after) {
    const a = String(before || "").match(/\s+|[^\s]+/g) || [];
    const b = String(after || "").match(/\s+|[^\s]+/g) || [];
    if (a.length * b.length > 90000) return [{ type: "removed", text: before }, { type: "added", text: after }].filter(item => item.text);
    const matrix = Array.from({ length: a.length + 1 }, () => new Uint16Array(b.length + 1));
    for (let i = a.length - 1; i >= 0; i -= 1) for (let j = b.length - 1; j >= 0; j -= 1) matrix[i][j] = a[i] === b[j] ? matrix[i + 1][j + 1] + 1 : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
    const segments = [];
    const add = (type, text) => {
      const last = segments[segments.length - 1];
      if (last?.type === type) last.text += text;
      else segments.push({ type, text });
    };
    let i = 0, j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { add("same", a[i]); i += 1; j += 1; }
      else if (matrix[i + 1][j] >= matrix[i][j + 1]) { add("removed", a[i]); i += 1; }
      else { add("added", b[j]); j += 1; }
    }
    while (i < a.length) add("removed", a[i++]);
    while (j < b.length) add("added", b[j++]);
    return segments;
  }

  function compareSection(scaffold, parsed, sectionId) {
    const before = originalForSection(scaffold, sectionId);
    const after = proposedForSection(parsed, sectionId);
    const beforeWords = words(before).length;
    const afterWords = words(after).length;
    return {
      sectionId,
      before,
      after,
      beforeWords,
      afterWords,
      readingChange: afterWords - beforeWords,
      changed: before.trim() !== after.trim(),
      diff: diffWords(before, after)
    };
  }

  function acceptedContent(parsed) {
    const output = {};
    (parsed?.sections || []).forEach(section => {
      if (section.mapping === "ignore") return;
      const accepted = (section.items || []).filter(item => ["accepted", "edited"].includes(item.status)).map(item => cleanLine(item.editedText ?? item.text)).filter(Boolean);
      if (accepted.length) output[section.id] = [...(output[section.id] || []), ...accepted];
    });
    return output;
  }

  function verificationPayload(scaffold, parsed, sourceRecords = [], verificationOptions = {}) {
    const resource = RESOURCE.normalise(scaffold || {});
    return {
      resource: {
        id: resource.id || "",
        year: resource.year || "",
        subject: resource.subject || "",
        topic: resource.topic || "",
        objective: resource.objective || "",
        phase: resource.phase || "",
        situation: resource.situation || "",
        expectedOutcome: resource.expectedOutcome || "",
        barriers: Array.isArray(resource.barriers) ? resource.barriers : [],
        customBarrier: resource.customBarrier || "",
        engineId: resource.engineId || "",
        familyId: resource.familyId || "",
        profileId: resource.profileId || "",
        stage: resource.stage || "",
        title: resource.title || "",
        vocabulary: Array.isArray(resource.vocabulary) ? resource.vocabulary : [],
        misconception: resource.misconception || "",
        intention: resource.intention || "",
        essentialThinking: resource.essentialThinking || "",
        disciplinaryThinking: resource.disciplinaryThinking || "",
        pupilAction: resource.pupilAction || "",
        removalPathway: resource.removalPathway || "",
        representation: resource.representation || "",
        prerequisites: Array.isArray(resource.prerequisites) ? resource.prerequisites : [],
        smallSteps: Array.isArray(resource.smallSteps) ? resource.smallSteps : [],
        teacherQuestions: Array.isArray(resource.teacherQuestions) ? resource.teacherQuestions : [],
        assessmentOpportunities: Array.isArray(resource.assessmentOpportunities) ? resource.assessmentOpportunities : [],
        format: resource.format || "",
        growthStages: Array.isArray(resource.growthStages) ? resource.growthStages : [],
        content: resource.content || {},
        diagram: resource.diagram || {}
      },
      importContext: {
        taskId: cleanLine(parsed?.taskId),
        format: cleanLine(parsed?.format),
        mode: cleanLine(parsed?.mode),
        expectedSections: Array.isArray(parsed?.expectedSections) ? parsed.expectedSections.map(cleanLine) : [],
        warnings: (Array.isArray(parsed?.warnings) ? parsed.warnings : []).map(warning => ({
          level: cleanLine(warning?.level),
          title: cleanLine(warning?.title),
          message: cleanLine(warning?.message),
          action: cleanLine(warning?.action)
        }))
      },
      verificationOptions: {
        taskId: cleanLine(verificationOptions.taskId || parsed?.taskId),
        reviewLevel: cleanLine(verificationOptions.reviewLevel),
        quantity: Number.isFinite(Number(verificationOptions.quantity)) ? Math.max(1, Math.min(Number(verificationOptions.quantity), 20)) : null,
        vocabularyFocus: cleanLine(verificationOptions.vocabularyFocus),
        phonicsProgramme: cleanLine(verificationOptions.phonicsProgramme),
        targetLanguage: cleanLine(verificationOptions.targetLanguage),
        languageVariant: cleanLine(verificationOptions.languageVariant)
      },
      accepted: (parsed?.sections || []).map(section => ({
        id: section.id || "",
        mapping: section.mapping || "",
        items: (section.items || [])
          .filter(item => ["accepted", "edited"].includes(item.status))
          .map(item => ({ status: item.status, text: cleanLine(item.editedText ?? item.text) }))
      })).filter(section => section.items.length),
      sources: (Array.isArray(sourceRecords) ? sourceRecords : []).map(record => ({
        type: cleanLine(record.type),
        title: cleanLine(record.title),
        author: cleanLine(record.author),
        date: cleanLine(record.date),
        publisher: cleanLine(record.publisher),
        url: cleanLine(record.url),
        retrievalDate: cleanLine(record.retrievalDate),
        note: cleanLine(record.note)
      }))
    };
  }

  function verificationFingerprint(scaffold, parsed, sourceRecords = [], verificationOptions = {}) {
    const payload = verificationPayload(scaffold, parsed, sourceRecords, verificationOptions);
    const persistence = window.ScaffoldPersistence;
    if (persistence?.canonicalChecksumSync) return persistence.canonicalChecksumSync(payload);
    const error = new Error("The local checksum engine is unavailable, so this content cannot be approved safely.");
    error.name = "VerificationChecksumError";
    error.code = "VERIFICATION_CHECKSUM_UNAVAILABLE";
    throw error;
  }

  function makeSourceRecord(text, origin = "AI generated") {
    const source = String(text || "");
    const url = source.match(/https?:\/\/\S+/)?.[0] || "";
    const date = source.match(/\b(?:1[5-9]\d{2}|20\d{2})\b/)?.[0] || "";
    return { id: uid("source"), type: origin, title: cleanLine(source.replace(url, "")).slice(0, 180), author: "", date, publisher: "", url, retrievalDate: new Date().toISOString().slice(0, 10), note: "Check this source independently before classroom use." };
  }

  function applyAccepted(scaffold, parsed, details = {}) {
    const next = clone(RESOURCE.normalise(scaffold));
    const accepted = acceptedContent(parsed);
    const acceptedCount = Object.values(accepted).reduce((total, items) => total + items.length, 0);
    const hasPendingDecision = (parsed?.sections || []).some(section => (section.items || []).some(item => item.status === "pending"));
    next.content = { ...(next.content || {}) };
    const changedPaths = [];
    const set = (path, value) => { changedPaths.push(path); return value; };
    if (accepted.title?.length) next.title = set("title", accepted.title[0]);
    if (accepted.instructions?.length) next.content.instruction = set("content.instruction", accepted.instructions.join(" "));
    if (accepted.vocabulary?.length) next.content.vocabulary = set("content.vocabulary", accepted.vocabulary.slice(0, 12));
    if (accepted.questions?.length) next.content.prompts = set("content.prompts", accepted.questions.slice(0, 10));
    if (accepted.scenarios?.length) next.content.prompts = set("content.prompts", accepted.scenarios.slice(0, 10));
    if (accepted.examples?.length) next.content.example = set("content.example", accepted.examples.join("\n\n").slice(0, 5000));
    if (accepted["non-examples"]?.length) next.content.example = set("content.example", [next.content.example, "Non-examples:", ...accepted["non-examples"]].filter(Boolean).join("\n"));
    if (accepted.passage?.length) next.content.example = set("content.example", accepted.passage.join("\n\n").slice(0, 8000));
    if (accepted["model-response"]?.length) next.content.example = set("content.example", accepted["model-response"].join("\n\n").slice(0, 5000));
    if (accepted.misconceptions?.length) next.content.misconception = set("content.misconception", accepted.misconceptions.join("; ").slice(0, 1600));
    if (accepted["teacher-guidance"]?.length) next.content.teacherNotes = set("content.teacherNotes", accepted["teacher-guidance"].join("\n").slice(0, 6000));
    if (accepted.answers?.length) next.content.answerGuidance = set("content.answerGuidance", accepted.answers.slice(0, 20));
    if (accepted.sources?.length) next.sources = set("sources", accepted.sources.map(item => makeSourceRecord(item)));
    next.ai = { ...(next.ai || {}) };
    if (accepted.critique?.length) next.ai.reviewActions = set("ai.reviewActions", accepted.critique.slice(0, 20));
    if (accepted.verification?.length) next.ai.externalVerification = set("ai.externalVerification", accepted.verification.slice(0, 20));
    if (accepted.uncertainties?.length) next.ai.uncertainties = set("ai.uncertainties", accepted.uncertainties.slice(0, 20));
    if (accepted["image-brief"]?.length) next.ai.imageBrief = set("ai.imageBrief", accepted["image-brief"].join("\n"));
    if (accepted["diagram-spec"]?.length) next.ai.diagramSpec = set("ai.diagramSpec", accepted["diagram-spec"].join("\n"));
    if (accepted["change-notes"]?.length) next.ai.changeNotes = set("ai.changeNotes", accepted["change-notes"].slice(0, 20));

    const verification = details.verification || null;
    const findings = Array.isArray(verification?.findings) ? verification.findings : [];
    const declaredBlocking = Number.isFinite(Number(verification?.blocking)) ? Math.max(0, Number(verification.blocking)) : 0;
    const findingsBlocking = findings.filter(item => item?.severity === "do-not-use" && !item.resolved).length;
    const blocking = Math.max(declaredBlocking, findingsBlocking);
    const currentChecksum = verificationFingerprint(scaffold, parsed, details.sourceRecords, details.verificationOptions);
    const checkedAt = Date.parse(verification?.checkedAt || "");
    const verificationCurrent = Boolean(
      /^[a-f0-9]{64}$/i.test(String(verification?.contentChecksum || "")) &&
      verification.contentChecksum === currentChecksum &&
      Array.isArray(verification?.findings) &&
      Number.isFinite(checkedAt)
    );
    if (details.approved && !verificationCurrent) {
      const error = new Error("Verification no longer matches the scaffold and accepted content. Run verification again before approval.");
      error.name = "StaleVerificationError";
      error.code = "STALE_VERIFICATION";
      throw error;
    }
    if (details.approved && hasPendingDecision) {
      const error = new Error("Every imported item must be accepted, edited or rejected before approval.");
      error.name = "AIApprovalError";
      error.code = "AI_DECISIONS_PENDING";
      throw error;
    }
    if (details.approved && acceptedCount === 0) {
      const error = new Error("At least one reviewed item must be accepted before approval.");
      error.name = "AIApprovalError";
      error.code = "AI_NOTHING_ACCEPTED";
      throw error;
    }
    if (details.approved && blocking) {
      const error = new Error("Unresolved do-not-use findings block approval and application.");
      error.name = "AIApprovalError";
      error.code = "AI_VERIFICATION_BLOCKED";
      throw error;
    }
    const approvalValid = Boolean(details.approved && verificationCurrent && verification && !blocking && !hasPendingDecision && acceptedCount > 0);
    const round = {
      id: uid("round"),
      name: details.roundName || details.prompt?.taskName || "AI enhancement",
      taskId: details.prompt?.taskId || parsed.taskId,
      depth: details.prompt?.depth || "professional",
      reviewLevel: verification?.reviewLevel || details.prompt?.reviewLevel || "careful",
      promptId: details.prompt?.id || "",
      promptPreparedAt: details.prompt?.createdAt || "",
      rawResponse: details.includeRaw === false ? "" : parsed.raw,
      importFormat: parsed.format,
      decisions: parsed.sections.flatMap(section => section.items.map(item => ({ sectionId: section.id, itemId: item.id, status: item.status, finalText: item.editedText ?? item.text }))),
      findings: verification?.findings || [],
      verificationChecksum: verification?.contentChecksum || "",
      appliedPaths: changedPaths,
      approved: approvalValid,
      approvalScope: details.approvalScope || "resource",
      createdAt: new Date().toISOString()
    };
    next.ai.schemaVersion = 5;
    next.ai.rounds = [round, ...(next.ai.rounds || [])].slice(0, 20);
    next.ai.provenance = [
      ...changedPaths.map(path => ({ id: uid("prov"), path, origin: "external AI", roundId: round.id, teacherEdited: parsed.sections.some(section => section.items.some(item => item.status === "edited")), acceptedAt: round.createdAt })),
      ...(next.ai.provenance || [])
    ].slice(0, 100);
    next.ai.lastVerification = verification;
    next.ai.status = approvalValid ? "teacher-approved" : blocking ? "warnings-unresolved" : "review-required";
    next.ai.approval = approvalValid ? { text: DATA.ai.approvalText, scope: details.approvalScope || "resource", approvedAt: new Date().toISOString() } : null;
    next.updatedAt = new Date().toISOString();
    return { resource: next, changedPaths, round, accepted };
  }

  function trimContent(parsed, action) {
    const next = clone(parsed);
    const removed = [];
    const allItems = () => next.sections.flatMap(section => section.items.map(item => ({ section, item })));
    if (action === "keep-six") {
      next.sections.forEach(section => {
        if (!DATA.ai.sections[section.id]?.itemised || section.items.length <= 6) return;
        section.items.slice(6).forEach(item => { removed.push({ sectionId: section.id, text: item.text }); item.status = "rejected"; });
      });
    }
    if (action === "remove-repeats") {
      const seen = new Set();
      allItems().forEach(({ section, item }) => {
        const key = `${section.id}|${normaliseKey(item.editedText ?? item.text)}`;
        if (seen.has(key)) { removed.push({ sectionId: section.id, text: item.text }); item.status = "rejected"; }
        else seen.add(key);
      });
    }
    if (action === "reduce-vocabulary") {
      next.sections.filter(section => section.id === "vocabulary").forEach(section => section.items.slice(6).forEach(item => { removed.push({ sectionId: section.id, text: item.text }); item.status = "rejected"; }));
    }
    if (action === "shorten-instructions") {
      next.sections.filter(section => section.id === "instructions").forEach(section => section.items.forEach(item => {
        const original = item.editedText ?? item.text;
        const shortened = original.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
        if (shortened !== original) { removed.push({ sectionId: section.id, text: original.slice(shortened.length) }); item.editedText = shortened; item.status = "edited"; }
      }));
    }
    if (action === "move-teacher-notes") {
      const target = next.sections.find(section => section.id === "teacher-guidance") || { id: "teacher-guidance", label: "Teacher guidance", mapping: "teacher-guidance", expected: false, unexpected: false, items: [] };
      if (!next.sections.includes(target)) next.sections.push(target);
      next.sections.filter(section => ["answers", "uncertainties", "sources"].includes(section.id)).forEach(section => section.items.forEach(item => {
        if (item.status !== "rejected") target.items.push({ ...item, id: uid("item"), status: item.status });
        item.status = "rejected";
      }));
    }
    if (action === "bullet-explanations") {
      next.sections.filter(section => ["passage", "instructions", "teacher-guidance"].includes(section.id)).forEach(section => section.items.forEach(item => {
        const original = item.editedText ?? item.text;
        const sentences = original.split(/(?<=[.!?])\s+/).map(cleanLine).filter(Boolean);
        if (sentences.length > 1) {
          item.editedText = sentences.map(sentence => `• ${sentence}`).join("\n");
          item.status = "edited";
          removed.push({ sectionId: section.id, text: original, replacement: item.editedText });
        }
      }));
    }
    if (action === "stems-to-questions") {
      next.sections.filter(section => ["questions", "instructions"].includes(section.id)).forEach(section => section.items.forEach(item => {
        const original = item.editedText ?? item.text;
        if (!/_{2,}|\[blank\]|\b(i think|this shows|my answer|because)\b.*(?:_{2,}|\.\.\.)/i.test(original)) return;
        const replacement = /^\s*this shows/i.test(original) ? "What does the evidence show? Why?" : /^\s*i think/i.test(original) ? "What do you think? Which evidence justifies it?" : "What must you decide here? Explain your reasoning.";
        item.editedText = replacement;
        item.status = "edited";
        removed.push({ sectionId: section.id, text: original, replacement });
      }));
    }
    if (action === "compact-cards") {
      next.sections.forEach(section => {
        if (!DATA.ai.sections[section.id]?.itemised) return;
        section.items.slice(4).forEach(item => { if (item.status !== "rejected") removed.push({ sectionId: section.id, text: item.editedText ?? item.text }); item.status = "rejected"; });
      });
      next.localSuggestion = { format: "cut-cards", note: "Rebuild accepted content as compact cut-out cards." };
    }
    if (action === "split-pages") {
      next.localSuggestion = { format: "mini-booklet", note: "Reflow accepted content across two calm pages without removing it." };
      removed.push({ sectionId: "other", text: "Single dense page", replacement: "Two-page mini-booklet reflow; accepted content retained." });
    }
    next.trimHistory = [{ action, removed, at: new Date().toISOString() }, ...(next.trimHistory || [])].slice(0, 10);
    return next;
  }

  function statusForResource(resource) {
    const status = resource.ai?.status;
    if (["response-imported", "review-required", "warnings-unresolved"].includes(status)) return status;
    if (resource.reflection?.removeNext || resource.reflection?.reduceNext || resource.reflection?.worked === "not-yet") return "revision-suggested";
    if (resource.lastPrintedAt && resource.reflection) return "used-in-class";
    if (status) return status;
    return resource.updatedAt ? "local-draft" : "local-draft";
  }

  function assessImageSample(sample = {}) {
    const darkest = Math.max(0, Math.min(255, Number(sample.darkest) || 0));
    const lightest = Math.max(darkest, Math.min(255, Number(sample.lightest) || 0));
    const count = Math.max(1, Number(sample.count) || 1);
    const ratio = (lightest + 5) / (darkest + 5);
    return {
      sampledLocally: true,
      contrastRatio: Math.round(ratio * 10) / 10,
      contrast: ratio < 2.2 ? "low" : ratio < 4.5 ? "moderate" : "strong",
      inkCoverage: Math.max(0, Math.min(100, Math.round((Number(sample.darkness) || 0) / count * 100))),
      printWidthMm: Math.max(0, Math.round((Number(sample.widthPixels) || 0) / 300 * 25.4)),
      printHeightMm: Math.max(0, Math.round((Number(sample.heightPixels) || 0) / 300 * 25.4))
    };
  }

  function portableResource(resource, options = {}) {
    const copy = clone(resource);
    if (options.excludeHistory && copy.ai) copy.ai.rounds = (copy.ai.rounds || []).map(round => ({ ...round, rawResponse: "" }));
    return { product: "Scaffold Seeds", schemaVersion: 5, exportedAt: new Date().toISOString(), resource: copy };
  }

  function verificationReport(scaffold, result) {
    const lines = [
      "SCAFFOLD SEEDS · VERIFICATION REPORT",
      `Resource: ${scaffold.title}`,
      `Context: ${scaffold.year} · ${subjectById(scaffold.subject).name} · ${engineById(scaffold.engineId).name}`,
      `Objective: ${scaffold.objective}`,
      `Review level: ${result.reviewLevel}`,
      `Status: ${result.status}`,
      `Checked: ${result.checkedAt}`,
      "",
      result.methodNote,
      ""
    ];
    result.findings.forEach(item => lines.push(`${item.severityLabel.toUpperCase()} · ${item.dimension} · ${item.validationLabel}\n${item.title}\n${item.message}\nAction: ${item.action}\n`));
    return lines.join("\n");
  }

  window.ScaffoldAICompanion = {
    defaultOptions,
    createWorkspace,
    privacyScan,
    buildPrompt,
    buildVerificationPrompt,
    parseImport,
    mapSection,
    setItemDecision,
    decideSection,
    originalForSection,
    proposedForSection,
    compareSection,
    diffWords,
    acceptedContent,
    verificationPayload,
    verificationFingerprint,
    applyAccepted,
    trimContent,
    assessImageSample,
    statusForResource,
    portableResource,
    verificationReport,
    makeSourceRecord,
    sanitiseRaw,
    taskById
  };
})();
