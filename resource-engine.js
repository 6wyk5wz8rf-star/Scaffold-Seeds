(function () {
  "use strict";

  const DATA = window.SCAFFOLD_DATA;
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const unique = values => [...new Set(values.filter(Boolean))];
  const words = text => String(text || "").trim().split(/\s+/).filter(Boolean);

  const stageRules = {
    seed: { prompts: 4, words: 6, example: "modelled", response: 3, instruction: "explicit" },
    sprout: { prompts: 3, words: 5, example: "partial", response: 4, instruction: "guided" },
    growth: { prompts: 2, words: 3, example: "none", response: 5, instruction: "strategic" },
    independent: { prompts: 1, words: 0, example: "none", response: 6, instruction: "self" }
  };

  const subjectActions = {
    english: ["Read, say or rehearse the idea first.", "Make a deliberate language choice, then reread for meaning."],
    mathematics: ["Represent the relationship before choosing a calculation.", "Explain how the representation matches the mathematical structure."],
    science: ["Keep observation, measurement and inference distinct.", "Use scientific knowledge to explain what the evidence suggests."],
    history: ["Use period knowledge to interpret evidence for this enquiry.", "State what the evidence can and cannot help us understand."],
    geography: ["Locate the evidence and name the scale.", "Connect the pattern to a human or physical process."],
    computing: ["Trace the logic or state before changing anything.", "Test with a case chosen to reveal a possible flaw."],
    art: ["Look slowly before naming or making.", "Try, notice and choose for an intended visual effect."],
    "design-technology": ["Return to the user, purpose and criterion.", "Test the functional decision and improve from evidence."],
    music: ["Listen or perform before recording.", "Change one musical element and hear its effect."],
    "physical-education": ["Keep one clear movement or tactical cue in mind.", "Practise, notice the effect and adjust."],
    languages: ["Listen and say the pattern before relying on writing.", "Check sound, meaning and agreement together."],
    "religious-education": ["Use a contextual example and recognise internal diversity.", "Distinguish learned evidence, interpretation and reflection."],
    pshe: ["Use the fictional scenario; no personal disclosure is needed.", "Choose a safe response and identify a route to trusted adult help."]
  };

  function engineById(id) {
    return DATA.engines.find(item => item.id === id) || DATA.engines[0];
  }

  function stageById(id) {
    return DATA.stages.find(item => item.id === id) || DATA.stages[1];
  }

  function subjectById(id) {
    return DATA.subjects.find(item => item.id === id) || DATA.subjects[0];
  }

  function brainFor(scaffold) {
    return DATA.subjectBrains[scaffold.subject] || DATA.subjectBrains.english;
  }

  function profileFor(scaffold) {
    const brain = brainFor(scaffold);
    const explicit = brain.profiles.find(item => item.id === scaffold.profileId);
    if (explicit) return explicit;
    const source = `${scaffold.topic || ""} ${scaffold.objective || ""} ${scaffold.situation || ""}`.toLowerCase();
    return brain.profiles.map((profile, index) => ({
      profile, index,
      score: (profile.keywords || []).reduce((total, keyword) => total + (source.includes(keyword) ? 2 : 0), 0)
    })).sort((a, b) => b.score - a.score || a.index - b.index)[0]?.profile || brain.profiles[0];
  }

  function defaultContent(scaffold) {
    const engine = engineById(scaffold.engineId);
    const profile = profileFor(scaffold);
    const actions = subjectActions[scaffold.subject] || subjectActions.english;
    const vocabulary = unique([...(scaffold.vocabulary || []), ...(profile.vocabulary || [])]).slice(0, 8);
    const prompts = unique([...(engine.prompts || []), ...(scaffold.teacherQuestions || []), ...(profile.questions || [])]).slice(0, 6);
    const exampleBase = scaffold.subject === "mathematics"
      ? "Complete one structurally similar example. Explain each decision rather than copying a method."
      : scaffold.subject === "science"
        ? "One modelled row distinguishes what was observed from what is inferred. Complete the next row using new evidence."
        : scaffold.subject === "history"
          ? "One example uses provenance and period knowledge without declaring the source simply reliable or unreliable."
          : scaffold.subject === "languages"
            ? "Hear and rehearse one accurate pattern. Change only a grammatically compatible element."
            : "Study one decision, then make a parallel decision in the new context.";
    return {
      instruction: actions[0],
      subInstruction: actions[1],
      example: exampleBase,
      prompts,
      vocabulary,
      misconception: scaffold.misconception || profile.misconceptions?.[0] || "",
      teacherNotes: scaffold.teacherNotes || "",
      oralPrompt: "Explain your current idea to a partner. Your partner paraphrases before adding or challenging with a reason.",
      checkPrompt: scaffold.assessmentOpportunities?.[0] || profile.assessment?.[0] || "Try the core decision without looking at the scaffold.",
      independencePrompt: scaffold.teacherQuestions?.[0] || profile.questions?.[0] || "What matters here, and how will I check it?",
      diagramType: scaffold.diagram?.type || engine.diagram || "",
      diagramLabels: scaffold.diagram?.labels || [],
      responseSpace: scaffold.content?.responseSpace || "standard",
      instructionMode: scaffold.content?.instructionMode || "standard",
      density: scaffold.content?.density || "calm",
      oralRehearsal: scaffold.content?.oralRehearsal ?? ["english", "languages", "history", "science"].includes(scaffold.subject),
      hiddenSections: scaffold.content?.hiddenSections || []
    };
  }

  function normalise(scaffold) {
    const defaults = defaultContent(scaffold);
    const content = { ...defaults, ...(scaffold.content || {}) };
    content.prompts = Array.isArray(content.prompts) ? content.prompts : String(content.prompts || "").split("\n").filter(Boolean);
    content.vocabulary = Array.isArray(content.vocabulary) ? content.vocabulary : String(content.vocabulary || "").split(/[,\n]/).map(item => item.trim()).filter(Boolean);
    return { ...scaffold, content };
  }

  function lines(count = 3) {
    return `<div class="write-lines">${Array.from({ length: count }, () => "<span></span>").join("")}</div>`;
  }

  function section(title, body, className = "") {
    return `<section class="engine-section ${esc(className)}"><h3>${esc(title)}</h3>${body}</section>`;
  }

  function promptCards(items, className = "") {
    return `<div class="engine-prompt-cards ${esc(className)}">${items.map((item, index) => `<section><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(item)}</strong>${lines(1)}</section>`).join("")}</div>`;
  }

  function instructionForMode(content) {
    const source = String(content.instruction || "").trim();
    if (content.instructionMode === "shorter") return source.split(/[.;:]/)[0].trim() + ".";
    if (content.instructionMode === "one-at-a-time") return `First: ${source.split(/\bthen\b|[.;:]/i)[0].trim().replace(/[.!?]+$/, "")}.`;
    if (content.instructionMode === "explicit") return `${source} Complete this before moving to the next prompt.`;
    if (content.instructionMode === "read-aloud") return `Read aloud: ${source}`;
    return source;
  }

  function diagramValidation(type, config = {}) {
    const errors = [];
    const values = (config.values || []).map(Number).filter(Number.isFinite);
    const labels = config.labels || [];
    if (!type) return { valid: true, errors };
    if (["number-line", "timeline"].includes(type) && values.length > 1) {
      for (let index = 1; index < values.length; index += 1) {
        if (values[index] < values[index - 1]) errors.push("Values must be ordered from left to right.");
      }
    }
    if (type === "number-line" && values.length > 2) {
      const interval = values[1] - values[0];
      if (!values.slice(2).every((value, index) => Math.abs(value - values[index + 1] - interval) < 0.00001)) errors.push("Number-line intervals are inconsistent.");
    }
    if (type === "fraction-strip" && config.parts && Number(config.parts) < 2) errors.push("A fraction strip needs at least two equal parts.");
    if (type === "bar-model" && values.length && values.some(value => value < 0)) errors.push("Bar lengths cannot represent negative quantities.");
    if (["flowchart", "classification-tree", "causal-chain"].includes(type) && labels.length < 2) errors.push("Add at least two labelled steps or nodes.");
    return { valid: errors.length === 0, errors };
  }

  function renderDiagram(type, config = {}) {
    const safe = diagramValidation(type, config);
    const labels = (config.labels || []).map(String).filter(Boolean);
    const values = (config.values || []).map(Number).filter(Number.isFinite);
    const label = text => esc(text || "Add label");
    if (!type) return "";
    if (!safe.valid) return `<div class="diagram-warning"><strong>Diagram needs review</strong><span>${esc(safe.errors.join(" "))}</span></div>`;
    if (type === "number-line") {
      const marks = values.length ? values : [0, 1, 2, 3, 4];
      return `<svg class="local-diagram" viewBox="0 0 640 150" role="img" aria-label="Editable number line"><path d="M52 70H588M52 70l16-9M52 70l16 9M588 70l-16-9M588 70l-16 9"/>${marks.map((value, index) => { const x = 80 + index * (480 / Math.max(1, marks.length - 1)); return `<path d="M${x} 54v32"/><text x="${x}" y="112">${label(value)}</text>`; }).join("")}</svg>`;
    }
    if (type === "part-whole") return `<svg class="local-diagram" viewBox="0 0 640 230" role="img" aria-label="Part whole model"><circle cx="320" cy="62" r="48"/><text x="320" y="67">${label(labels[0] || "whole")}</text><path d="M288 100 220 154M352 100l68 54"/><circle cx="205" cy="177" r="48"/><circle cx="435" cy="177" r="48"/><text x="205" y="182">${label(labels[1] || "part")}</text><text x="435" y="182">${label(labels[2] || "?")}</text></svg>`;
    if (type === "place-value") {
      const heads = labels.length ? labels.slice(0, 5) : ["10,000", "1,000", "100", "10", "1"];
      return `<svg class="local-diagram" viewBox="0 0 640 210" role="img" aria-label="Place value chart">${heads.map((head, index) => `<rect x="${20 + index * 120}" y="30" width="116" height="150"/><text x="${78 + index * 120}" y="62">${label(head)}</text><path d="M${20 + index * 120} 78h116"/>`).join("")}</svg>`;
    }
    if (type === "array") {
      const rows = Math.max(2, Math.min(6, Number(config.rows) || 3));
      const columns = Math.max(2, Math.min(8, Number(config.columns) || 5));
      return `<svg class="local-diagram" viewBox="0 0 640 230" role="img" aria-label="Array model">${Array.from({ length: rows * columns }, (_, index) => `<circle cx="${160 + (index % columns) * 64}" cy="${48 + Math.floor(index / columns) * 48}" r="13"/>`).join("")}</svg>`;
    }
    if (type === "bar-model") {
      const parts = labels.length ? labels.slice(0, 4) : ["known", "known", "?"];
      return `<svg class="local-diagram" viewBox="0 0 640 210" role="img" aria-label="Bar model"><rect x="60" y="50" width="520" height="78"/>${parts.map((part, index) => { const width = 520 / parts.length; return `<path d="M${60 + index * width} 50v78"/><text x="${60 + (index + .5) * width}" y="94">${label(part)}</text>`; }).join("")}<path d="M60 155v18M60 164h520M580 155v18"/><text x="320" y="198">${label(labels[4] || "whole or comparison")}</text></svg>`;
    }
    if (type === "fraction-strip") {
      const parts = Math.max(2, Math.min(12, Number(config.parts) || 4));
      return `<svg class="local-diagram" viewBox="0 0 640 210" role="img" aria-label="Fraction strips">${[2, parts].map((partCount, row) => `<rect x="45" y="${45 + row * 80}" width="550" height="48"/>${Array.from({ length: partCount - 1 }, (_, index) => `<path d="M${45 + (index + 1) * 550 / partCount} ${45 + row * 80}v48"/>`).join("")}`).join("")}</svg>`;
    }
    if (type === "timeline") {
      const events = labels.length ? labels.slice(0, 5) : ["Earlier", "Event", "Turning point", "Later"];
      return `<svg class="local-diagram" viewBox="0 0 640 210" role="img" aria-label="Timeline marked as not to scale"><path d="M55 105H585"/><text x="55" y="28">Not to scale unless dates are proportionally spaced</text>${events.map((event, index) => { const x = 80 + index * 480 / Math.max(1, events.length - 1); return `<circle cx="${x}" cy="105" r="9"/><path d="M${x} 105v${index % 2 ? 45 : -45}"/><text x="${x}" y="${index % 2 ? 180 : 48}">${label(event)}</text>`; }).join("")}</svg>`;
    }
    if (["flowchart", "causal-chain", "cycle"].includes(type)) {
      const nodes = labels.length ? labels.slice(0, 5) : ["Start", "Decision", "Action", "Check"];
      return `<svg class="local-diagram" viewBox="0 0 640 230" role="img" aria-label="${esc(type.replaceAll("-", " "))}">${nodes.map((node, index) => { const x = 28 + index * (584 / nodes.length); const width = 584 / nodes.length - 18; return `<rect x="${x}" y="80" width="${width}" height="64" rx="12"/><text x="${x + width / 2}" y="117">${label(node)}</text>${index < nodes.length - 1 ? `<path d="M${x + width} 112h18m-7-7 7 7-7 7"/>` : ""}`; }).join("")}</svg>`;
    }
    if (["classification-tree", "concept-map"].includes(type)) {
      const nodes = labels.length ? labels.slice(0, 5) : ["Central idea", "Branch A", "Branch B", "Example", "Non-example"];
      return `<svg class="local-diagram" viewBox="0 0 640 250" role="img" aria-label="${esc(type.replaceAll("-", " "))}"><rect x="245" y="20" width="150" height="48" rx="12"/><text x="320" y="49">${label(nodes[0])}</text>${nodes.slice(1).map((node, index) => { const x = 24 + index * 150; return `<path d="M320 68v48H${x + 65}v28"/><rect x="${x}" y="144" width="130" height="54" rx="10"/><text x="${x + 65}" y="175">${label(node)}</text>`; }).join("")}</svg>`;
    }
    return `<svg class="local-diagram" viewBox="0 0 640 180" role="img" aria-label="Editable subject diagram"><rect x="45" y="35" width="550" height="110" rx="16"/><text x="320" y="88">${label(labels[0] || type.replaceAll("-", " "))}</text><text x="320" y="116">Add or edit labels in the designer</text></svg>`;
  }

  function renderIndependent(scaffold) {
    const content = scaffold.content;
    return `<div class="independent-resource"><span class="independence-mark">Support removed</span><h2>${esc(scaffold.objective)}</h2><section><strong>Before you begin</strong><p>${esc(content.independencePrompt)}</p></section><section><strong>Afterwards</strong><p>What did you decide for yourself? What evidence shows the learning?</p>${lines(5)}</section></div>`;
  }

  function renderBody(rawScaffold) {
    const scaffold = normalise(rawScaffold);
    const engine = engineById(scaffold.engineId);
    const content = scaffold.content;
    const rule = stageRules[scaffold.stage] || stageRules.sprout;
    if (scaffold.stage === "independent") return renderIndependent(scaffold);
    const prompts = content.prompts.slice(0, rule.prompts);
    const vocabulary = content.vocabulary.slice(0, rule.words);
    const diagram = content.diagramType ? `<div class="engine-diagram">${renderDiagram(content.diagramType, scaffold.diagram || { labels: content.diagramLabels })}</div>` : "";
    const example = rule.example === "none" || content.hiddenSections.includes("example") ? "" : section(rule.example === "modelled" ? "Study one modelled decision" : "Complete the missing decision", `<p>${esc(content.example)}</p>${rule.example === "partial" ? lines(2) : ""}`, "engine-example");
    const oral = content.oralRehearsal && !content.hiddenSections.includes("oral") ? section("Rehearse before recording", `<p>${esc(content.oralPrompt)}</p>`, "engine-oral") : "";
    const vocabularyHTML = vocabulary.length && !content.hiddenSections.includes("vocabulary") ? `<div class="engine-vocabulary">${vocabulary.map(word => `<span>${esc(word)}</span>`).join("")}</div>` : "";
    const check = section("Independence check", `<p>${esc(content.checkPrompt)}</p>`, "engine-check");
    const intro = `<div class="engine-intro"><p>${esc(instructionForMode(content))}</p><small>${esc(content.subInstruction)}</small>${vocabularyHTML}</div>`;
    const layout = engine.layout || "sequence";
    let core = "";

    if (["word-cards", "prompt-cards", "cue-card"].includes(layout)) core = promptCards(prompts, layout);
    else if (["sequence", "flow", "cycle", "route", "causal-chain"].includes(layout)) core = `<div class="engine-sequence">${prompts.map((prompt, index) => `<section><span>${index + 1}</span><div><strong>${esc(prompt)}</strong>${lines(rule.response > 4 ? 2 : 1)}</div></section>`).join("")}</div>`;
    else if (["bridge", "chain"].includes(layout)) core = `<div class="engine-chain">${prompts.slice(0, 3).map((prompt, index) => `<section><span>${index + 1}</span><strong>${esc(prompt)}</strong>${lines(3)}</section>${index < Math.min(2, prompts.length - 1) ? '<i aria-hidden="true">→</i>' : ""}`).join("")}</div>`;
    else if (["compare", "choice", "decision-board", "sort"].includes(layout)) core = `<div class="engine-choice"><section><span>Option or case A</span><strong>${esc(prompts[0] || "Notice and record")}</strong>${lines(4)}</section><section><span>Option or case B</span><strong>${esc(prompts[1] || "Compare through the same criterion")}</strong>${lines(4)}</section><section class="engine-decision"><span>Decision</span><strong>${esc(prompts[2] || "Choose and justify")}</strong>${lines(3)}</section></div>`;
    else if (["table", "test-grid", "quadrant"].includes(layout)) core = `<div class="engine-table"><div class="engine-table-row engine-table-head">${prompts.slice(0, 3).map(prompt => `<strong>${esc(prompt)}</strong>`).join("")}</div>${Array.from({ length: rule.response }, () => `<div class="engine-table-row">${prompts.slice(0, 3).map(() => "<span></span>").join("")}</div>`).join("")}</div>`;
    else if (["dialogue", "substitution"].includes(layout)) core = `<div class="engine-dialogue"><section><span>A · rehearse</span><strong>${esc(prompts[0] || content.oralPrompt)}</strong>${lines(2)}</section><section><span>B · listen and build</span><strong>${esc(prompts[1] || "Paraphrase, then add or challenge with a reason.")}</strong>${lines(2)}</section><section><span>Together · improve</span><strong>${esc(prompts[2] || content.checkPrompt)}</strong>${lines(2)}</section></div>`;
    else if (["tree", "network", "map"].includes(layout)) core = `<div class="engine-network"><section class="engine-centre"><strong>${esc(scaffold.topic)}</strong></section>${prompts.slice(0, 4).map(prompt => `<section><strong>${esc(prompt)}</strong>${lines(2)}</section>`).join("")}</div>`;
    else if (["worked", "error"].includes(layout)) core = `<div class="engine-worked"><section><span>Model or current attempt</span><strong>${esc(content.example)}</strong><div class="worked-steps">${prompts.map((prompt, index) => `<p><b>${index + 1}</b>${esc(prompt)}</p>`).join("")}</div></section><section><span>Your parallel thinking</span>${prompts.map(prompt => `<strong>${esc(prompt)}</strong>${lines(2)}`).join("")}</section></div>`;
    else if (["math-model", "source", "phrase-strip", "locator", "noticer", "lens", "challenge", "scenario", "primer", "shrinker"].includes(layout)) core = `${diagram || `<div class="engine-stimulus"><span>${layout === "source" ? "Source, text or stimulus" : "Working space"}</span><p>${esc(content.example)}</p></div>`}${promptCards(prompts, layout)}`;
    else core = `${diagram}${promptCards(prompts, layout)}`;

    return `${intro}${example}${core}${oral}${check}<div class="engine-fade-note"><strong>Next fade</strong><span>${esc(nextFade(scaffold))}</span></div>`;
  }

  function nextFade(scaffold) {
    const index = DATA.stages.findIndex(stage => stage.id === scaffold.stage);
    const next = DATA.stages[index + 1];
    if (!next) return "Remove the page. Keep only one pupil-owned self-prompt.";
    if (next.id === "sprout") return "Replace the modelled example with a partial example and remove one prompt.";
    if (next.id === "growth") return "Remove the example and retain only two strategic questions.";
    return "Remove the organiser. Keep the learning focus and one self-monitoring question.";
  }

  function validationIssues(rawScaffold) {
    const scaffold = normalise(rawScaffold);
    const content = scaffold.content;
    const issues = [];
    const combined = [content.instruction, content.example, ...content.prompts].join(" ");
    if (!String(scaffold.objective || "").trim()) issues.push({ type: "error", code: "objective", message: "Learning objective is missing." });
    if (!String(scaffold.situation || "").trim()) issues.push({ type: "review", code: "barrier", message: "The observed sticking point needs a precise description." });
    if (!String(scaffold.essentialThinking || scaffold.disciplinaryThinking || "").trim()) issues.push({ type: "error", code: "thinking", message: "The essential pupil thinking has not been protected explicitly." });
    if (content.prompts.length !== unique(content.prompts).length) issues.push({ type: "review", code: "repeat", message: "Repeated prompts should be removed." });
    if (words(content.instruction).length > 32) issues.push({ type: "review", code: "instruction-load", message: "The pupil instruction is longer than one manageable entry step." });
    if (content.vocabulary.length > 8) issues.push({ type: "review", code: "vocabulary-load", message: "More than eight vocabulary items may increase visual and retrieval load." });
    if (/low ability|middle ability|high ability|bottom group|weak pupil|low attainer/i.test(combined)) issues.push({ type: "error", code: "fixed-label", message: "Fixed-ability language must be replaced with a temporary, observable barrier." });
    if (/the answer is|therefore the answer|copy this answer/i.test(combined)) issues.push({ type: "error", code: "answer-leak", message: "The resource may reveal the pupil's conclusion or answer." });
    if (scaffold.stage === "independent" && (content.prompts.length > 1 || content.vocabulary.length)) issues.push({ type: "review", code: "independent", message: "Independent should contain one self-prompt and no task-completing support." });
    const diagram = diagramValidation(content.diagramType, scaffold.diagram || { labels: content.diagramLabels });
    diagram.errors.forEach(message => issues.push({ type: "error", code: "diagram", message }));
    return issues;
  }

  function qualityAudit(rawScaffold) {
    const scaffold = normalise(rawScaffold);
    const engine = engineById(scaffold.engineId);
    const issues = validationIssues(scaffold);
    const has = code => issues.some(issue => issue.code === code);
    const judgement = (label, status, reason, action = "") => ({ label, status, reason, action });
    return [
      judgement("Curriculum integrity", scaffold.objective ? "Strong" : "Review recommended", scaffold.objective ? "The resource is anchored to the selected objective and subject profile." : "No secure objective is available.", "Confirm the exact intended learning."),
      judgement("Barrier precision", has("barrier") ? "Review recommended" : "Strong", has("barrier") ? "The sticking point is not yet precise enough." : "The support responds to an observable point of breakdown.", "Name what pupils can do and where success stops."),
      judgement("Intellectual ownership", has("thinking") || has("answer-leak") ? "Possible over-scaffolding" : "Strong", has("answer-leak") ? "A prompt may reveal the conclusion." : `The engine protects ${engine.preserves || "the central pupil decision"}.`, "Remove any prompt that supplies the next subject decision."),
      judgement("Subject authenticity", "Strong", `${engine.name} uses ${subjectById(scaffold.subject).name}-responsive actions rather than a universal worksheet grid.`),
      judgement("Cognitive load", has("instruction-load") || has("vocabulary-load") ? "Review recommended" : "Strong", has("instruction-load") || has("vocabulary-load") ? "Language or vocabulary density may compete with the learning." : "Directions and vocabulary are deliberately limited.", "Reduce entry language before reducing curriculum demand."),
      judgement("Language demand", "Strong", "Instruction controls change access language without changing the objective."),
      judgement("Representation accuracy", has("diagram") ? "Representation requires checking" : "Strong", has("diagram") ? "The selected diagram has a structural validation issue." : scaffold.content.diagramType ? "The selected local diagram passed its type-specific checks." : "No diagram is forced where one may not help.", "Correct labels, order, scale or structure before printing."),
      judgement("Independence pathway", has("independent") ? "Fading pathway incomplete" : "Strong", has("independent") ? "Independent still contains task-completing support." : `The next removal is explicit: ${nextFade(scaffold)}`),
      judgement("Classroom usability", has("repeat") ? "Review recommended" : "Strong", has("repeat") ? "Repeated prompts add noise without support." : "The resource can be introduced through one modelled decision and used immediately."),
      judgement("Print quality", "Strong", "The component layout uses fixed safe zones, bounded sections and print-specific reflow."),
      judgement("Inclusion", has("fixed-label") ? "Review recommended" : "Strong", has("fixed-label") ? "Fixed-ability language appears in the resource." : "Support is described through access features and observable barriers, not diagnoses or attainment labels.")
    ];
  }

  function createStage(rawScaffold, stage) {
    const scaffold = normalise(rawScaffold);
    const content = { ...scaffold.content };
    if (stage === "seed") content.hiddenSections = [];
    if (stage === "sprout") content.hiddenSections = unique([...(content.hiddenSections || [])]);
    if (stage === "growth") content.hiddenSections = unique([...(content.hiddenSections || []), "example"]);
    if (stage === "independent") content.hiddenSections = ["example", "vocabulary", "oral"];
    return { ...scaffold, stage, content };
  }

  function stageSet(scaffold) {
    return Object.fromEntries(DATA.stages.map(stage => [stage.id, createStage(scaffold, stage.id)]));
  }

  function sanitizeImport(text) {
    return String(text || "").replace(/<[^>]*>/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").replace(/\s+\n/g, "\n").trim().slice(0, 12000);
  }

  window.ScaffoldResourceEngine = {
    normalise, renderBody, renderDiagram, diagramValidation, validationIssues, qualityAudit,
    createStage, stageSet, nextFade, sanitizeImport, engineById, profileFor, stageRules
  };
})();
