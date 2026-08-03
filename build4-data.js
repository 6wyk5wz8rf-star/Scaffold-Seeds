(function () {
  "use strict";

  const DATA = window.SCAFFOLD_DATA;
  if (!DATA) throw new Error("Scaffold Seeds data must load before Build 4 data.");

  const task = (id, name, family, summary, changes, preserves, sections, options = {}) => ({
    id, name, family, summary, changes, preserves, sections,
    quantity: options.quantity || 6,
    risk: options.risk || "routine",
    subjects: options.subjects || ["all"],
    sourceSensitive: Boolean(options.sourceSensitive),
    accuracySensitive: Boolean(options.accuracySensitive),
    imageTask: Boolean(options.imageTask),
    critiqueOnly: Boolean(options.critiqueOnly),
    promptInstruction: options.promptInstruction || name,
    leavesUntouched: options.leavesUntouched || "The learning objective, scaffold structure, protected pupil thinking, growth pathway and print design."
  });

  const tasks = [
    task("accurate-examples", "Generate accurate examples", "generate", "Populate an existing example slot with precise subject examples.", "Examples only", "The pupil's interpretation, strategy or conclusion", ["examples", "answers", "uncertainties"], { accuracySensitive: true, promptInstruction: "Generate the requested number of accurate examples and a separate answer audit." }),
    task("non-examples", "Generate non-examples", "generate", "Create close contrasts that reveal the boundary of a concept.", "Non-examples and brief rationale only", "The pupil's classification and explanation", ["non-examples", "answers", "uncertainties"], { accuracySensitive: true }),
    task("practice-questions", "Create additional practice questions", "generate", "Add purposeful practice without redesigning the resource.", "Question content only", "The selected representation, response structure and checking routine", ["questions", "answers", "uncertainties"], { accuracySensitive: true, quantity: 8 }),
    task("reasoning-prompts", "Create varied reasoning prompts", "generate", "Add questions that require justification, comparison or generalisation.", "Reasoning prompts only", "The mathematical or disciplinary decision", ["questions", "answers", "uncertainties"], { accuracySensitive: true }),
    task("scenario-cards", "Create scenario cards", "generate", "Create short fictional contexts for discussion or decision-making.", "Scenario text only", "The pupil's judgement and route to explanation", ["scenarios", "teacher-guidance", "uncertainties"], { risk: "careful" }),
    task("reading-passage", "Draft a short reading passage", "generate", "Create an original passage for a defined curriculum purpose.", "Passage content only", "The reading scaffold, questions and protected reading thinking", ["title", "passage", "vocabulary", "uncertainties"], { risk: "careful", sourceSensitive: true, quantity: 1, promptInstruction: "Draft one original passage to the selected length, text type, reading purpose, vocabulary focus and assumed background knowledge. Preserve conceptual quality; do not imitate or continue a copyrighted modern text" }),
    task("information-text", "Draft an information text", "generate", "Create concise subject-access text with named knowledge boundaries.", "Information text only", "The scaffold architecture and pupil task", ["title", "passage", "vocabulary", "sources", "uncertainties"], { risk: "careful", sourceSensitive: true, accuracySensitive: true, quantity: 1 }),
    task("discussion-prompts", "Create oral discussion prompts", "generate", "Add a small set of prompts that support genuine talk.", "Oral prompts only", "Pupil choice, disagreement and explanation", ["questions", "teacher-guidance"], { quantity: 5 }),
    task("model-responses", "Create model responses", "generate", "Create one model for noticing, comparison or teacher modelling.", "Model response content only", "The pupil's later independent composition", ["model-response", "teacher-guidance", "uncertainties"], { risk: "careful", quantity: 2, promptInstruction: "Create only the selected model types for the stated teaching purpose. Explain what to reveal and where the model must stop so pupils do not merely imitate it" }),
    task("flawed-responses", "Create deliberately flawed responses", "generate", "Create plausible errors for diagnosis and improvement.", "Flawed response and error notes only", "The pupil's diagnosis and correction", ["model-response", "answers", "uncertainties"], { accuracySensitive: true, risk: "careful", quantity: 3 }),
    task("misconceptions", "Suggest misconceptions", "generate", "Propose plausible conceptual misunderstandings rather than careless slips.", "Misconception candidates only", "The teacher's diagnosis and instructional decision", ["misconceptions", "teacher-guidance", "uncertainties"], { risk: "careful", promptInstruction: "For each candidate, explain why it is tempting and distinguish a conceptual misconception from a procedural error, language misunderstanding, careless slip or missing prerequisite. Add one diagnostic example and one probing question" }),
    task("retrieval-questions", "Create retrieval questions", "generate", "Create questions answerable directly from supplied content.", "Retrieval questions and answer locations only", "Inference and evaluation tasks", ["questions", "answers", "uncertainties"], { accuracySensitive: true, quantity: 6 }),
    task("vocabulary-set", "Create a vocabulary set", "generate", "Develop precise subject definitions and usable explanations.", "Vocabulary entries only", "The quantity selected for the pupil page", ["vocabulary", "uncertainties"], { risk: "careful", accuracySensitive: true, promptInstruction: "For each selected word, provide a precise subject definition, pupil-friendly explanation, example in context, useful non-example, morphology, multiple-meaning warning, pronunciation note where needed, related concept and common confusion. Keep pupil-page selection separate from richer teacher guidance" }),
    task("image-brief", "Create an image description", "generate", "Describe a simple supporting scene without generating or importing imagery.", "Image brief only", "All precise diagrams and labels", ["image-brief", "uncertainties"], { imageTask: true, quantity: 1 }),
    task("diagram-specification", "Create a diagram specification", "generate", "Describe content for later controlled local redrawing.", "Diagram specification only", "The local SVG renderer, dimensions and print styling", ["diagram-spec", "uncertainties"], { accuracySensitive: true, risk: "careful", quantity: 1 }),

    task("shorten-instructions", "Shorten instruction language", "adapt", "Reduce instruction length while keeping the full curriculum demand.", "Instruction wording only", "Content, examples, answer format and objective", ["instructions", "change-notes"]),
    task("reduce-reading-demand", "Reduce reading demand", "adapt", "Lower incidental reading load without lowering the subject thinking.", "Syntax, chunking and non-essential wording", "Subject terminology and conceptual challenge", ["instructions", "passage", "change-notes"], { risk: "careful" }),
    task("simplify-syntax", "Simplify syntax, preserve content", "adapt", "Use clearer sentence structures without deleting concepts.", "Sentence structure only", "Every factual and conceptual relationship", ["passage", "change-notes"], { risk: "careful" }),
    task("increase-challenge", "Increase conceptual challenge", "adapt", "Raise the reasoning demand without adding avoidable complexity.", "Questions or boundary cases only", "The objective and access supports", ["questions", "answers", "change-notes"], { accuracySensitive: true }),
    task("change-context", "Change the context", "adapt", "Replace a distracting or narrow context while preserving academic structure.", "Names, setting and surface context", "Numbers, relationships, concept and answer", ["scenarios", "change-notes"], { accuracySensitive: true }),
    task("change-names-examples", "Change names or examples", "adapt", "Replace surface details while locking the academic structure and answers.", "Names and example surface features only", "Values, relationships, difficulty, objective and protected thinking", ["examples", "scenarios", "change-notes"], { accuracySensitive: true }),
    task("inclusive-context", "Create a broader context", "adapt", "Use natural, respectful breadth without tokenism.", "Context only", "Academic structure and intended difficulty", ["scenarios", "change-notes"], { risk: "careful" }),
    task("written-to-oral", "Convert written prompts to oral prompts", "adapt", "Create talk-ready prompts with minimal reading and no scripted answers.", "Response mode and wording", "The pupil's reasoning and subject vocabulary", ["questions", "teacher-guidance", "change-notes"]),
    task("worksheet-to-cards", "Convert a worksheet into discussion cards", "adapt", "Reframe existing content for paired or group talk.", "Segmentation and delivery format", "The objective and sequence of thinking", ["scenarios", "questions", "change-notes"]),
    task("larger-print", "Adapt for larger print", "adapt", "Trim and prioritise content for larger text and fewer items per page.", "Quantity and page segmentation", "The selected learning and protected thinking", ["instructions", "questions", "change-notes"]),
    task("remove-writing-demand", "Remove unnecessary writing demand", "adapt", "Offer sorting, pointing or oral response where writing is not the objective.", "Response mode only", "The evidence of subject understanding", ["instructions", "questions", "change-notes"], { risk: "careful" }),
    task("alternative-representation", "Create an alternative representation", "adapt", "Propose another way to make the same relationship visible.", "Representation content only", "The underlying structure and pupil decision", ["diagram-spec", "change-notes", "uncertainties"], { accuracySensitive: true, risk: "careful" }),

    task("critique-over-scaffolding", "Inspect for over-scaffolding", "critique", "Identify support that may perform the pupil's thinking.", "Nothing; critique only", "The complete current resource", ["critique", "uncertainties"], { critiqueOnly: true }),
    task("critique-answer-leakage", "Inspect for answer leakage", "critique", "Locate wording, examples or labels that disclose a required decision.", "Nothing; critique only", "The complete current resource", ["critique", "uncertainties"], { critiqueOnly: true, accuracySensitive: true }),
    task("critique-accuracy", "Inspect subject accuracy", "critique", "Review claims, examples and terminology through the subject lens.", "Nothing; critique only", "The complete current resource", ["critique", "sources", "uncertainties"], { critiqueOnly: true, risk: "careful", sourceSensitive: true, accuracySensitive: true }),
    task("critique-misconceptions", "Inspect misconception risk", "critique", "Find simplifications or representations that may reinforce a misconception.", "Nothing; critique only", "The complete current resource", ["critique", "uncertainties"], { critiqueOnly: true, risk: "careful", accuracySensitive: true }),
    task("critique-clarity", "Inspect language clarity", "critique", "Identify ambiguous or unnecessarily dense pupil-facing language.", "Nothing; critique only", "The objective and subject terminology", ["critique"], { critiqueOnly: true }),
    task("critique-age", "Inspect age appropriateness", "critique", "Review access demands and context without lowering expectations.", "Nothing; critique only", "The objective and subject authenticity", ["critique", "uncertainties"], { critiqueOnly: true, risk: "careful" }),
    task("critique-context", "Inspect cultural assumptions", "critique", "Identify stereotypes, narrow assumptions and inaccessible contexts.", "Nothing; critique only", "The academic structure", ["critique", "uncertainties"], { critiqueOnly: true, risk: "careful" }),
    task("critique-load", "Inspect cognitive load", "critique", "Find avoidable language, visual or procedural load.", "Nothing; critique only", "Necessary subject complexity", ["critique"], { critiqueOnly: true }),
    task("critique-pupil-thinking", "Inspect whether pupil thinking is preserved", "critique", "Test each support against the protected-thinking statement.", "Nothing; critique only", "The complete current resource", ["critique", "uncertainties"], { critiqueOnly: true }),
    task("critique-fading", "Inspect the fading pathway", "critique", "Review whether Seed to Independent remains one connected pathway.", "Nothing; critique only", "The shared objective and common content", ["critique"], { critiqueOnly: true }),

    task("verify-calculations", "Verify calculations", "verify", "Check every computational claim and answer separately.", "Nothing; verification only", "All resource content", ["verification", "answers", "uncertainties"], { risk: "forensic", subjects: ["mathematics", "science", "geography"], accuracySensitive: true }),
    task("verify-answer-guidance", "Verify answer guidance", "verify", "Check that each answer matches its prompt and remains unambiguous.", "Nothing; verification only", "All resource content", ["verification", "answers", "uncertainties"], { risk: "forensic", accuracySensitive: true }),
    task("verify-curriculum", "Verify curriculum alignment", "verify", "Compare content with the supplied objective and year context.", "Nothing; verification only", "The selected curriculum context", ["verification", "uncertainties"], { risk: "careful", accuracySensitive: true }),
    task("verify-vocabulary", "Verify vocabulary definitions", "verify", "Check subject meaning, accessibility and circular definitions.", "Nothing; verification only", "The selected word set", ["verification", "vocabulary", "uncertainties"], { risk: "careful", accuracySensitive: true }),
    task("verify-historical-claims", "Verify historical claims", "verify", "Check dates, provenance, quotation status and cautious interpretation.", "Nothing; verification only", "The original historical enquiry", ["verification", "sources", "uncertainties"], { risk: "forensic", subjects: ["history"], sourceSensitive: true, accuracySensitive: true }),
    task("verify-science", "Verify scientific explanations", "verify", "Check terminology, causal mechanism and observation/inference distinctions.", "Nothing; verification only", "The original enquiry or concept", ["verification", "sources", "uncertainties"], { risk: "careful", subjects: ["science"], sourceSensitive: true, accuracySensitive: true }),
    task("verify-language", "Verify language accuracy", "verify", "Check grammar, agreement, accents and regional variant where supplied.", "Nothing; verification only", "The communicative intention", ["verification", "uncertainties"], { risk: "careful", subjects: ["languages", "english"], accuracySensitive: true }),
    task("verify-quotation", "Check quotation authenticity", "verify", "Require provenance and distinguish quotation, paraphrase and reconstruction.", "Nothing; verification only", "The source enquiry", ["verification", "sources", "uncertainties"], { risk: "forensic", sourceSensitive: true, accuracySensitive: true }),
    task("verify-objective-examples", "Check examples match the objective", "verify", "Check whether each example exposes the intended concept rather than a surface proxy.", "Nothing; verification only", "The objective and scaffold structure", ["verification", "uncertainties"], { risk: "careful", accuracySensitive: true }),

    task("teacher-modelling", "Add teacher modelling guidance", "enrich", "Create a concise think-aloud that stops before pupil ownership is lost.", "Teacher guidance only", "Every pupil-facing section", ["teacher-guidance", "uncertainties"], { risk: "careful", promptInstruction: "Draft a concise think-aloud stating what the teacher notices, the decision made, why it matters, one deliberate mistake if useful, how the teacher checks, and the exact stopping point that returns ownership to pupils" }),
    task("oral-rehearsal", "Add oral rehearsal", "enrich", "Add a short route into subject language without scripting the final response.", "Oral rehearsal only", "Written task and pupil decision", ["questions", "teacher-guidance"]),
    task("alternative-examples", "Add alternative examples", "enrich", "Add carefully varied examples in the existing example slot.", "Examples only", "The scaffold structure and questions", ["examples", "answers", "uncertainties"], { accuracySensitive: true }),
    task("misconception-contrast", "Add misconception contrasts", "enrich", "Add a plausible near miss and a probing contrast.", "Misconception contrast only", "The pupil's diagnosis and correction", ["misconceptions", "questions", "answers"], { accuracySensitive: true, risk: "careful" }),
    task("extension", "Add an extension", "enrich", "Add one deeper conceptual route rather than more of the same.", "Extension only", "The core task and support stage", ["questions", "answers", "uncertainties"], { accuracySensitive: true }),
    task("independence-check", "Add a quick independence check", "enrich", "Create one brief transfer check without the scaffold.", "Independence check only", "The current pupil page", ["questions", "answers"], { accuracySensitive: true, quantity: 2 }),
    task("background-knowledge", "Add background knowledge", "enrich", "Provide only the knowledge required to enter the task.", "Teacher or pupil primer content only", "The disciplinary thinking and later enquiry", ["passage", "vocabulary", "sources", "uncertainties"], { risk: "careful", sourceSensitive: true, accuracySensitive: true }),
    task("challenge-pathway", "Add a challenge pathway", "enrich", "Offer a route into greater depth without removing access support.", "Challenge prompts only", "The common objective and base task", ["questions", "answers", "uncertainties"], { accuracySensitive: true }),
    task("visual-description", "Add a visual description", "enrich", "Describe a supporting visual for teacher creation or image generation.", "Visual brief only", "Precise diagrams and local layout", ["image-brief", "uncertainties"], { imageTask: true, quantity: 1 }),
    task("retrieval-links", "Add links to prior learning", "enrich", "Create short prompts that activate named prerequisites.", "Retrieval links only", "The current objective and pupil task", ["questions", "answers"], { accuracySensitive: true })
  ];

  const taskFamilies = [
    { id: "generate", name: "Generate", description: "Create a bounded piece of content for one existing slot." },
    { id: "adapt", name: "Adapt", description: "Change an access demand or context while preserving the learning." },
    { id: "critique", name: "Critique", description: "Offer another lens without rewriting the scaffold." },
    { id: "verify", name: "Verify", description: "Check a defined accuracy question and state what remains uncertain." },
    { id: "enrich", name: "Enrich", description: "Add one purposeful layer around the existing design." }
  ];

  const promptDepths = [
    { id: "quick", name: "Quick", description: "Concise context for a simple, low-risk task.", includes: ["role", "context", "protected-thinking", "task", "constraints", "return"] },
    { id: "professional", name: "Professional", description: "Full pedagogical context and subject safeguards. Recommended for most work.", includes: ["role", "context", "prior-learning", "barrier", "protected-thinking", "design", "growth", "task", "constraints", "subject", "inclusion", "return", "verification"] },
    { id: "forensic", name: "Forensic", description: "Maximum constraint, provenance and checking for accuracy-sensitive content.", includes: ["role", "context", "prior-learning", "barrier", "protected-thinking", "design", "growth", "task", "constraints", "subject", "inclusion", "print", "sources", "return", "verification"] }
  ];

  const reviewLevels = {
    routine: { id: "routine", name: "Routine", description: "Structure, clarity, duplication and print fit." },
    careful: { id: "careful", name: "Careful", description: "Subject alignment, misconceptions, factual review, inclusion and confirmation." },
    forensic: { id: "forensic", name: "Forensic", description: "Full local validation where possible, provenance and explicit approval." }
  };

  const sections = {
    title: { name: "Title", slot: "title", itemised: false },
    instructions: { name: "Instructions", slot: "instruction", itemised: false },
    vocabulary: { name: "Vocabulary", slot: "vocabulary", itemised: true },
    examples: { name: "Examples", slot: "example", itemised: true },
    "non-examples": { name: "Non-examples", slot: "example", itemised: true },
    questions: { name: "Questions", slot: "prompts", itemised: true },
    answers: { name: "Answers", slot: "answers", itemised: true, teacherOnly: true },
    passage: { name: "Passage", slot: "example", itemised: false },
    scenarios: { name: "Scenario cards", slot: "prompts", itemised: true },
    "model-response": { name: "Model response", slot: "example", itemised: true },
    misconceptions: { name: "Misconceptions", slot: "misconception", itemised: true, teacherOnly: true },
    "teacher-guidance": { name: "Teacher guidance", slot: "teacherNotes", itemised: true, teacherOnly: true },
    critique: { name: "Critique points", slot: "reviewActions", itemised: true, teacherOnly: true },
    verification: { name: "Verification", slot: "verification", itemised: true, teacherOnly: true },
    sources: { name: "Sources", slot: "sources", itemised: true, teacherOnly: true },
    uncertainties: { name: "Uncertainties", slot: "uncertainties", itemised: true, teacherOnly: true },
    "change-notes": { name: "Change notes", slot: "changeNotes", itemised: true, teacherOnly: true },
    "image-brief": { name: "Image brief", slot: "imageBrief", itemised: false, teacherOnly: true },
    "diagram-spec": { name: "Diagram specification", slot: "diagramSpec", itemised: false, teacherOnly: true },
    other: { name: "Other content", slot: "other", itemised: true, teacherOnly: true }
  };

  const commonSafeguards = [
    "Preserve the stated learning objective and protected pupil thinking.",
    "Do not invent evidence, sources, quotations, citations or pupil information.",
    "Use UK spelling and age-appropriate English-primary terminology.",
    "Mark uncertainty explicitly rather than guessing.",
    "Do not return HTML, scripts, styles or executable code."
  ];

  const subjectSafeguards = {
    english: ["Distinguish phonics, reading, vocabulary, grammar, spelling, composition and oracy.", "For phonics-sensitive content, request the school's programme and taught graphemes before claiming decodability.", "Retrieval answers must be supported directly by the text; inference questions must leave the inference with the reader.", "Avoid formulaic writing frames that produce identical outcomes."],
    mathematics: ["Verify every calculation, fraction, decimal, percentage, conversion and answer option.", "Check that diagrams, scales and labels match the mathematical relationships.", "Do not select an operation through keywords or place the answer in a representation label.", "Identify ambiguity, insufficient information and more than one valid answer."],
    science: ["Distinguish observation, measurement, inference, prediction and conclusion.", "Use fair-test variables only for a suitable comparative enquiry.", "Check units, table headings, graph structure and claim-evidence reasoning.", "Avoid anthropomorphic mechanisms and common mass/weight, melting/dissolving, evaporation/boiling, force/movement and adaptation misconceptions."],
    history: ["Do not invent quotations, testimony or primary sources.", "Provide provenance for source-like material and distinguish authentic excerpt, paraphrase, reconstruction and interpretation.", "Avoid simple reliable/unreliable or biased/unbiased judgements.", "Use origin, purpose, context, usefulness and limitation for the specific enquiry."],
    geography: ["Check place names, scale, direction, grid references, keys and symbols.", "Distinguish weather from climate and human from physical geography without forcing a false binary.", "Avoid stereotypes, deficit descriptions and unsupported country comparisons.", "Date-check changeable statistics and label schematic maps as schematic."],
    computing: ["Distinguish algorithm, program, code, data, information, hardware, software and network.", "Trace variables, selection, repetition and expected outputs consistently.", "Do not present platform-specific syntax as universal.", "Do not reveal the correction in a debugging task or request pupil personal information."],
    languages: ["Use the specified target language, regional variant, taught vocabulary and grammar level.", "Check agreement, word order, accents, diacritics and question-answer matching.", "Do not use misleading English phonetic spellings unless explicitly requested as temporary support.", "Recommend fluent-speaker review for generated translation or cultural claims."],
    "religious-education": ["Follow the school's applicable RE syllabus rather than assuming nationally fixed content.", "Represent internal diversity naturally and distinguish belief, practice, history and lived experience.", "Do not fabricate testimony or quotations.", "Avoid ranking worldviews or assuming every pupil has a faith."],
    pshe: ["Use fictional scenarios and never require public personal disclosure.", "Avoid diagnosis, therapeutic claims, shame, unsafe secrecy, family or gender assumptions.", "Give clear trusted-adult routes and state that classroom material does not replace safeguarding procedures.", "Do not ask pupils to share trauma, health information, family conflict, relationships or online incidents."],
    art: ["Keep observation, experimentation, intention and choice central.", "Do not define success through copying, neatness or identical outcomes.", "Do not imitate a living artist's style exactly."],
    "design-technology": ["Preserve user, purpose, criteria, design, making, testing and improvement.", "Do not present decorative craft as design and technology.", "Check material and mechanism claims before use."],
    music: ["Distinguish pulse, rhythm, tempo, pitch, dynamics, texture and structure.", "Keep listening, performing and composing central; written work must not displace sound.", "Do not claim notation is the music itself."],
    "physical-education": ["Use one or two observable cues, minimal text, body-neutral language and safe spacing.", "Preserve active participation and more than one participation route.", "Do not provide medical diagnosis or injury advice." ]
  };

  const templates = [
    { id: "maths-reasoning", name: "Six maths reasoning questions", taskId: "reasoning-prompts", depth: "forensic", review: "forensic", quantity: 6, subjects: ["mathematics"] },
    { id: "science-explanation", name: "Short science explanation text", taskId: "information-text", depth: "forensic", review: "careful", quantity: 1, subjects: ["science"] },
    { id: "vocabulary-verified", name: "Verified vocabulary set", taskId: "vocabulary-set", depth: "professional", review: "careful", quantity: 6, subjects: ["all"] },
    { id: "over-scaffold", name: "Critique for over-scaffolding", taskId: "critique-over-scaffolding", depth: "professional", review: "careful", quantity: 6, subjects: ["all"] },
    { id: "writing-models", name: "Contrasting writing models", taskId: "model-responses", depth: "professional", review: "careful", quantity: 3, subjects: ["english"] },
    { id: "history-scenarios", name: "History scenarios without fabricated sources", taskId: "scenario-cards", depth: "forensic", review: "forensic", quantity: 5, subjects: ["history"] },
    { id: "geography-compare", name: "Geographical place-comparison prompts", taskId: "reasoning-prompts", depth: "professional", review: "careful", quantity: 6, subjects: ["geography"] },
    { id: "clear-instructions", name: "Simplify instructions, preserve content", taskId: "shorten-instructions", depth: "professional", review: "routine", quantity: 1, subjects: ["all"] },
    { id: "black-white-image", name: "Black-and-white illustration brief", taskId: "image-brief", depth: "professional", review: "routine", quantity: 1, subjects: ["all"] },
    { id: "answers-only", name: "Verify answers only", taskId: "verify-answer-guidance", depth: "forensic", review: "forensic", quantity: 1, subjects: ["all"] }
  ];

  const statuses = [
    ["local-draft", "Local draft"], ["prompt-prepared", "AI prompt prepared"],
    ["response-imported", "Response imported"], ["review-required", "Review required"],
    ["warnings-unresolved", "Warnings unresolved"], ["teacher-approved", "Teacher approved"],
    ["print-ready", "Print ready"], ["used-in-class", "Used in class"],
    ["revision-suggested", "Revision suggested"]
  ].map(([id, name]) => ({ id, name }));

  const sourceTypes = ["teacher knowledge", "curriculum document", "school material", "published source", "AI generated", "reconstruction", "unverified"];
  const riskOrder = { routine: 1, careful: 2, forensic: 3 };

  function relevantTasks(engine) {
    const subject = engine.subjects?.[0];
    const base = ["accurate-examples", "non-examples", "change-names-examples", "shorten-instructions", "critique-over-scaffolding", "critique-answer-leakage", "critique-pupil-thinking", "critique-fading", "teacher-modelling", "independence-check"];
    const byFamily = {
      vocabulary: ["vocabulary-set", "verify-vocabulary", "oral-rehearsal"],
      reasoning: ["reasoning-prompts", "misconception-contrast", "verify-objective-examples"],
      representation: ["alternative-representation", "diagram-specification", "verify-objective-examples"],
      assessment: ["flawed-responses", "verify-answer-guidance", "misconceptions"],
      knowledge: ["background-knowledge", "information-text", "retrieval-questions"],
      discussion: ["discussion-prompts", "written-to-oral", "scenario-cards"],
      language: ["simplify-syntax", "oral-rehearsal", "verify-language"],
      planning: ["teacher-modelling", "worksheet-to-cards", "alternative-examples"],
      metacognition: ["critique-fading", "independence-check", "teacher-modelling"]
    };
    const subjectTasks = {
      english: ["reading-passage", "model-responses", "critique-clarity"],
      mathematics: ["verify-calculations", "practice-questions", "reasoning-prompts"],
      science: ["verify-science", "information-text", "misconceptions"],
      history: ["verify-historical-claims", "verify-quotation", "scenario-cards"],
      geography: ["change-context", "critique-context", "information-text"],
      computing: ["flawed-responses", "verify-answer-guidance", "scenario-cards"],
      languages: ["verify-language", "oral-rehearsal", "conversation-path"],
      "religious-education": ["critique-context", "verify-quotation", "scenario-cards"],
      pshe: ["scenario-cards", "critique-context", "written-to-oral"]
    };
    return [...new Set([...base, ...(byFamily[engine.family] || []), ...(subjectTasks[subject] || [])])]
      .filter(id => tasks.some(item => item.id === id));
  }

  DATA.engines.forEach(engine => {
    const compatible = relevantTasks(engine);
    const highRisk = compatible.filter(id => {
      const found = tasks.find(item => item.id === id);
      return found && riskOrder[found.risk] >= 3;
    });
    const allowedSlots = engine.layout === "source" ? ["example", "prompts", "vocabulary", "teacherNotes", "sources"]
      : engine.layout === "math-model" ? ["example", "prompts", "vocabulary", "teacherNotes", "diagramSpec"]
        : ["instruction", "example", "prompts", "vocabulary", "teacherNotes"];
    engine.ai = {
      compatibleTasks: compatible,
      highRiskTasks: highRisk,
      expectedSections: engine.layout === "source" ? ["passage", "questions", "sources", "uncertainties"] : engine.layout === "math-model" ? ["examples", "questions", "answers", "uncertainties"] : ["examples", "questions", "uncertainties"],
      localVerificationRules: ["objective-match", "protected-thinking", "answer-leakage", "duplicate-content", "language-load", "print-fit", engine.diagram ? "diagram-structure" : "section-structure"],
      contentLimits: { prompts: 10, vocabulary: 12, exampleWords: 450, teacherNoteWords: 350 },
      protectedElements: ["objective", "essentialThinking", "engineId", "stage", "removalPathway", "format", "diagram renderer"],
      allowedSlots,
      recommendedReview: highRisk.length ? "careful" : "routine"
    };
  });

  const inference = DATA.engines.find(engine => engine.id === "inference-bridge");
  if (inference) inference.ai = { ...inference.ai, compatibleTasks: ["reading-passage", "vocabulary-set", "alternative-examples", "teacher-modelling", "misconceptions", "critique-answer-leakage", "critique-pupil-thinking"], protectedElements: [...inference.ai.protectedElements, "Pupil generates the final inference", "Evidence and inference remain distinct"], expectedSections: ["passage", "vocabulary", "examples", "questions", "uncertainties"], recommendedReview: "careful" };
  const barModel = DATA.engines.find(engine => engine.id === "bar-model");
  if (barModel) barModel.ai = { ...barModel.ai, compatibleTasks: ["accurate-examples", "practice-questions", "reasoning-prompts", "flawed-responses", "verify-calculations", "verify-answer-guidance"], protectedElements: [...barModel.ai.protectedElements, "Mathematical relationship", "Pupil selects the operation", "Local bar-model renderer"], expectedSections: ["examples", "questions", "answers", "uncertainties"], recommendedReview: "forensic" };

  DATA.aiTasks = tasks;
  DATA.ai = {
    version: 4,
    taskFamilies,
    promptDepths,
    reviewLevels,
    sections,
    commonSafeguards,
    subjectSafeguards,
    templates,
    statuses,
    sourceTypes,
    privacyNote: "Scaffold Seeds does not send content anywhere. A copied prompt leaves the app only when you paste it into another service.",
    approvalText: "I have reviewed the imported content and accept professional responsibility for using it.",
    returnInstruction: "Return plain structured text only. Do not return HTML, scripts, CSS or executable code."
  };

  DATA.build4 = {
    version: 4,
    schemaVersion: 4,
    status: "AI enhancement and verification",
    reviewLevels: Object.keys(reviewLevels),
    promptDepths: promptDepths.map(item => item.id),
    taskCount: tasks.length,
    providerNeutral: true,
    directAPI: false
  };
})();
