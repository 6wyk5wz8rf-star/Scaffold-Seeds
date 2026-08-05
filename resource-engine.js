(function () {
  "use strict";

  const DATA = window.SCAFFOLD_DATA;
  const esc = value => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const unique = values => [...new Set(values.filter(Boolean))];
  const words = text => String(text || "").trim().split(/\s+/).filter(Boolean);

  const stageRules = {
    seed: { supports: 3, words: 6, example: "modelled", response: 3, instruction: "explicit" },
    sprout: { supports: 2, words: 4, example: "partial", response: 4, instruction: "guided" },
    growth: { supports: 1, words: 2, example: "none", response: 5, instruction: "strategic" },
    independent: { supports: 0, words: 0, example: "none", response: 6, instruction: "self" }
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

  function coreTaskFor(scaffold, content = scaffold.content || {}) {
    const engine = engineById(scaffold.engineId);
    const declared = String(content.coreTask || scaffold.coreTask || engine.coreTask || "").trim();
    if (declared) return declared;
    const preserved = String(engine.preserves || "").trim()
      .replace(/^the pupil['’]s\s+/i, "your ")
      .replace(/^the writer['’]s\s+/i, "your ");
    if (preserved) return `Make and justify the central decision: ${preserved}.`;
    const pupilAction = String(scaffold.pupilAction || "").trim();
    if (pupilAction) return pupilAction;
    const essentialThinking = String(scaffold.essentialThinking || "").trim();
    if (essentialThinking) return essentialThinking;
    const enginePrompts = Array.isArray(engine.prompts) ? engine.prompts.filter(Boolean) : [];
    return String(enginePrompts[enginePrompts.length - 1] || content.independencePrompt || scaffold.essentialThinking || "Make and justify the central subject decision.").trim();
  }

  function stagePromptSet(rawScaffold, contentOverride = null) {
    const scaffold = contentOverride ? { ...rawScaffold, content: contentOverride } : rawScaffold;
    const content = scaffold.content || {};
    const rule = stageRules[scaffold.stage] || stageRules.sprout;
    const coreTask = coreTaskFor(scaffold, content);
    if (scaffold.stage === "independent") return [coreTask].filter(Boolean);
    const prompts = Array.isArray(content.prompts) ? content.prompts.filter(Boolean) : [];
    const supports = prompts.filter(prompt => prompt !== coreTask).slice(0, rule.supports);
    return unique([...supports, coreTask]);
  }

  function supportProfile(rawScaffold) {
    const scaffold = normalise(rawScaffold);
    const rule = stageRules[scaffold.stage] || stageRules.sprout;
    return {
      stage: scaffold.stage,
      coreTask: coreTaskFor(scaffold, scaffold.content),
      visiblePrompts: stagePromptSet(scaffold, scaffold.content),
      supportPromptCount: scaffold.stage === "independent" ? 0 : Math.max(0, stagePromptSet(scaffold, scaffold.content).length - 1),
      vocabularyCount: Math.min(rule.words, scaffold.content.vocabulary.length),
      example: rule.example,
      oralRehearsal: scaffold.stage !== "independent" && Boolean(scaffold.content.oralRehearsal)
    };
  }

  function defaultContent(scaffold) {
    const engine = engineById(scaffold.engineId);
    const profile = profileFor(scaffold);
    const actions = subjectActions[scaffold.subject] || subjectActions.english;
    const vocabulary = unique([...(scaffold.vocabulary || []), ...(profile.vocabulary || [])]).slice(0, 8);
    const prompts = unique([...(engine.prompts || [])]).slice(0, 6);
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
      coreTask: coreTaskFor(scaffold, { prompts }),
      vocabulary,
      misconception: scaffold.misconception || profile.misconceptions?.[0] || "",
      teacherNotes: scaffold.teacherNotes || "",
      oralPrompt: "Explain your current idea to a partner. Your partner paraphrases before adding or challenging with a reason.",
      checkPrompt: "Try the central decision without looking at the scaffold. Explain how you checked it.",
      independencePrompt: "What is the decision I need to make, and how will I check it?",
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
    content.coreTask = coreTaskFor(scaffold, content);
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
    const warnings = [];
    const rawValues = Array.isArray(config.values) ? config.values : [];
    const supplied = value => value !== undefined && value !== null && (typeof value !== "string" || value.trim() !== "");
    const values = rawValues.filter(supplied).map(Number).filter(Number.isFinite);
    const labels = Array.isArray(config.labels) ? config.labels : [];
    if (!type) return { valid: true, errors, warnings, status: "not-needed" };
    const supportedTypes = new Set(["array", "bar-model", "causal-chain", "classification-tree", "concept-map", "cycle", "flowchart", "fraction-strip", "number-line", "part-whole", "place-value", "timeline"]);
    if (!supportedTypes.has(type)) return { valid: false, errors: [`Unknown diagram type: ${type}.`], warnings, status: "invalid" };
    if (["number-line", "timeline", "part-whole", "bar-model"].includes(type) && rawValues.some(value => supplied(value) && !Number.isFinite(Number(value)))) errors.push("Diagram values must be valid finite numbers; none can be silently omitted.");
    if (["number-line", "timeline"].includes(type) && values.length > 1) {
      for (let index = 1; index < values.length; index += 1) {
        if (type === "number-line" ? values[index] <= values[index - 1] : values[index] < values[index - 1]) errors.push(type === "number-line" ? "Number-line values must increase from left to right without duplicates." : "Values must be ordered from left to right.");
      }
    }
    if (type === "number-line" && values.length > 2) {
      const interval = values[1] - values[0];
      if (!values.slice(2).every((value, index) => Math.abs(value - values[index + 1] - interval) < 0.00001)) errors.push("Number-line intervals are inconsistent.");
    }
    if (type === "number-line" && values.length === 1) errors.push("A number line needs at least two located values.");
    if (type === "number-line" && values.length === 0) warnings.push("No located values were supplied, so this number line is a schematic template.");
    if (type === "fraction-strip") {
      const parts = Number(config.parts);
      const numerator = Number(config.numerator);
      if (supplied(config.parts) && (!Number.isInteger(parts) || parts < 2 || parts > 24)) errors.push("A fraction strip needs between two and twenty-four equal parts.");
      if (supplied(config.numerator) && (!Number.isInteger(numerator) || numerator < 0 || !Number.isInteger(parts) || numerator > parts)) errors.push("The shaded numerator must be a whole number between zero and the denominator.");
      if (!supplied(config.parts) || !supplied(config.numerator)) warnings.push("Supply a denominator and numerator before treating the fraction strip as value-checked.");
    }
    if (type === "bar-model") {
      if (values.some(value => value <= 0)) errors.push("Bar parts must use positive quantities.");
      if (values.length > 6 || (!values.length && labels.length > 6)) errors.push("A clear bar model can show no more than six parts on one page.");
      if (values.length && labels.length && ![values.length, values.length + 1].includes(labels.length)) errors.push("Bar labels and numerical parts do not correspond.");
      if (supplied(config.total) && !Number.isFinite(Number(config.total))) errors.push("The stated bar-model whole must be a valid finite number.");
      if (supplied(config.total) && Number.isFinite(Number(config.total)) && values.length && Math.abs(values.reduce((sum, value) => sum + value, 0) - Number(config.total)) > 0.00001) errors.push("Bar parts do not add to the stated whole.");
      if (!values.length) warnings.push("No bar values were supplied, so this is a schematic relationship rather than a scale-validated model.");
    }
    if (type === "part-whole") {
      if (values.length >= 3 && Math.abs(values[0] - values.slice(1).reduce((sum, value) => sum + value, 0)) > 0.00001) errors.push("The parts do not combine to the stated whole.");
      if (values.length > 0 && values.length < 3) errors.push("A checked part-whole model needs a whole and at least two parts.");
      if (values.length > 5 || labels.length > 5) errors.push("A clear part-whole model can show one whole and no more than four parts.");
      if (values.length && labels.length && values.length !== labels.length) errors.push("Part-whole labels and numerical values do not correspond.");
      if (!values.length) warnings.push("No quantities were supplied, so the part-whole model is schematic.");
    }
    if (type === "array") {
      const rows = Number(config.rows);
      const columns = Number(config.columns);
      if (supplied(config.rows) && (!Number.isInteger(rows) || rows < 1 || rows > 12)) errors.push("Array rows must be a whole number between one and twelve.");
      if (supplied(config.columns) && (!Number.isInteger(columns) || columns < 1 || columns > 12)) errors.push("Array columns must be a whole number between one and twelve.");
      if (supplied(config.total) && !Number.isFinite(Number(config.total))) errors.push("The stated array total must be a valid finite number.");
      if (supplied(config.total) && Number.isFinite(Number(config.total)) && rows * columns !== Number(config.total)) errors.push("Array rows and columns do not match the stated total.");
      if (!supplied(config.rows) || !supplied(config.columns) || !supplied(config.total)) warnings.push("Supply rows, columns and total before treating the array as relationship-checked.");
    }
    if (type === "timeline" && (!values.length || values.length !== labels.length)) warnings.push("Timeline spacing is schematic until every event has a corresponding value.");
    if (type === "place-value") {
      const value = Number(config.value);
      if (!supplied(config.value)) warnings.push("No represented number was supplied, so this place-value chart is an unvalidated template.");
      else if (!Number.isSafeInteger(value) || value < 0 || value > 99999999) errors.push("A checked place-value chart needs a whole number from zero to 99,999,999.");
      if (labels.length > 8) errors.push("A place-value chart can show no more than eight columns on one page.");
      if (supplied(config.value) && Number.isSafeInteger(value) && value >= 0 && labels.length && labels.length < String(value).length) errors.push("The supplied place-value headings would hide one or more digits of the represented number.");
      if (labels.length) warnings.push("Custom place-value headings require teacher confirmation before printing.");
    }
    if (["flowchart", "classification-tree", "causal-chain", "cycle"].includes(type) && labels.length < 2) errors.push("Add at least two labelled steps or nodes.");
    if (type === "concept-map" && labels.length < 2) warnings.push("The concept map is a schematic template until at least two subject-specific nodes are supplied.");
    if (["timeline", "flowchart", "classification-tree", "causal-chain", "concept-map", "cycle"].includes(type) && labels.length > 5) errors.push("This diagram can show no more than five labelled nodes without silently losing information.");
    if (labels.some(label => String(label).length > 32)) warnings.push("One or more diagram labels will be shortened in print. Use 32 characters or fewer.");
    return { valid: errors.length === 0, errors, warnings, status: errors.length ? "invalid" : warnings.length ? "schematic-review" : "locally-checked" };
  }

  function renderDiagram(type, config = {}) {
    const safe = diagramValidation(type, config);
    const labels = (Array.isArray(config.labels) ? config.labels : []).map(String).filter(Boolean);
    const values = (Array.isArray(config.values) ? config.values : []).map(Number).filter(Number.isFinite);
    const label = value => {
      const text = value === 0 ? "0" : String(value || "Add label");
      return esc(text.length > 32 ? `${text.slice(0, 29).trim()}…` : text);
    };
    if (!type) return "";
    if (!safe.valid) return `<div class="diagram-warning"><strong>Diagram needs review</strong><span>${esc(safe.errors.join(" "))}</span></div>`;
    if (type === "number-line") {
      const marks = values.length ? values : [0, 1, 2, 3, 4];
      return `<svg class="local-diagram" viewBox="0 0 640 150" role="img" aria-label="Editable number line"><path d="M52 70H588M52 70l16-9M52 70l16 9M588 70l-16-9M588 70l-16 9"/>${marks.map((value, index) => { const x = 80 + index * (480 / Math.max(1, marks.length - 1)); return `<path d="M${x} 54v32"/><text x="${x}" y="112">${label(value)}</text>`; }).join("")}</svg>`;
    }
    if (type === "part-whole") {
      const partCount = Math.max(2, Math.min(4, Math.max(values.length - 1, labels.length - 1, 2)));
      const partXs = Array.from({ length: partCount }, (_, index) => partCount === 1 ? 320 : 105 + index * (430 / (partCount - 1)));
      const branches = partXs.map(x => `<path d="M320 96  ${x} 143"/>`).join("");
      const partNodes = partXs.map((x, index) => `<circle cx="${x}" cy="181" r="37"/><text x="${x}" y="186">${label(labels[index + 1] ?? values[index + 1] ?? (index ? "?" : "part"))}</text>`).join("");
      return `<svg class="local-diagram" viewBox="0 0 640 230" role="img" aria-label="Part whole model with ${partCount} parts"><title>${esc(safe.warnings.length ? safe.warnings.join(" ") : `A whole connected to ${partCount} parts`)}</title><circle cx="320" cy="55" r="42"/><text x="320" y="60">${label(labels[0] ?? values[0] ?? "whole")}</text>${branches}${partNodes}</svg>`;
    }
    if (type === "place-value") {
      const hasValue = config.value !== undefined && config.value !== null && String(config.value).trim() !== "" && Number.isSafeInteger(Number(config.value)) && Number(config.value) >= 0;
      const valueText = hasValue ? String(Number(config.value)) : "";
      const columnCount = labels.length ? Math.min(labels.length, 8) : hasValue ? Math.min(valueText.length, 8) : 3;
      const heads = labels.length
        ? labels.slice(0, columnCount)
        : Array.from({ length: columnCount }, (_, index) => (10 ** (columnCount - index - 1)).toLocaleString("en-GB"));
      const digits = hasValue ? valueText.padStart(columnCount, "0").slice(-columnCount).split("") : [];
      const width = 600 / columnCount;
      return `<svg class="local-diagram" viewBox="0 0 640 210" role="img" aria-label="${hasValue ? `Place value chart representing ${esc(valueText)}` : "Schematic place value chart"}"><title>${hasValue ? `${esc(valueText)} partitioned by place value` : esc(safe.warnings.join(" "))}</title>${heads.map((head, index) => `<rect x="${20 + index * width}" y="30" width="${width - 4}" height="150"/><text x="${20 + index * width + (width - 4) / 2}" y="62">${label(head)}</text><path d="M${20 + index * width} 78h${width - 4}"/>${hasValue ? `<text class="place-value-digit" x="${20 + index * width + (width - 4) / 2}" y="135">${label(digits[index])}</text>` : ""}`).join("")}</svg>`;
    }
    if (type === "array") {
      const rows = Math.max(1, Math.min(12, Number(config.rows) || 3));
      const columns = Math.max(1, Math.min(12, Number(config.columns) || 5));
      const horizontalGap = columns > 1 ? 480 / (columns - 1) : 48;
      const verticalGap = rows > 1 ? 154 / (rows - 1) : 48;
      const radius = Math.max(4, Math.min(13, Math.min(horizontalGap, verticalGap) * .28));
      return `<svg class="local-diagram" viewBox="0 0 640 230" role="img" aria-label="Array model with ${rows} rows and ${columns} columns">${Array.from({ length: rows * columns }, (_, index) => { const column = index % columns; const row = Math.floor(index / columns); const x = columns === 1 ? 320 : 80 + column * horizontalGap; const y = rows === 1 ? 115 : 38 + row * verticalGap; return `<circle cx="${x}" cy="${y}" r="${radius}"/>`; }).join("")}</svg>`;
    }
    if (type === "bar-model") {
      const partCount = values.length ? values.length : Math.max(2, Math.min(labels.length || 3, 6));
      const parts = Array.from({ length: partCount }, (_, index) => labels[index] || (values[index] ?? (index === partCount - 1 ? "?" : "known")));
      const weights = values.length ? values : Array(partCount).fill(1);
      const total = weights.reduce((sum, value) => sum + value, 0) || partCount;
      let cursor = 60;
      const segments = parts.map((part, index) => {
        const width = 520 * weights[index] / total;
        const segment = `<path d="M${cursor} 50v78"/><text x="${cursor + width / 2}" y="94">${label(part)}</text>`;
        cursor += width;
        return segment;
      }).join("");
      const wholeLabel = values.length && labels.length === values.length + 1 ? labels[labels.length - 1] : config.total || "whole or comparison";
      return `<svg class="local-diagram" viewBox="0 0 640 210" role="img" aria-label="${values.length ? "Value-aware bar model" : "Schematic bar model requiring teacher confirmation"}"><title>${esc(values.length ? "Bar widths correspond to the supplied positive quantities." : safe.warnings.join(" "))}</title><rect x="60" y="50" width="520" height="78"/>${segments}<path d="M580 50v78M60 155v18M60 164h520M580 155v18"/><text x="320" y="198">${label(wholeLabel)}</text></svg>`;
    }
    if (type === "fraction-strip") {
      const parts = Math.max(2, Math.min(24, Number(config.parts) || 4));
      const numerator = Math.max(0, Math.min(parts, Number(config.numerator) || 0));
      return `<svg class="local-diagram" viewBox="0 0 640 210" role="img" aria-label="Fraction strip divided into ${parts} equal parts with ${numerator} shaded"><title>${numerator}/${parts}</title><rect x="45" y="85" width="550" height="48"/>${Array.from({ length: parts }, (_, index) => `<rect class="${index < numerator ? "diagram-shade" : "diagram-clear"}" x="${45 + index * 550 / parts}" y="85" width="${550 / parts}" height="48"/>${index ? `<path d="M${45 + index * 550 / parts} 85v48"/>` : ""}`).join("")}<text x="320" y="165">${label(`${numerator}/${parts}`)}</text></svg>`;
    }
    if (type === "timeline") {
      const events = labels.length ? labels.slice(0, 5) : ["Earlier", "Event", "Turning point", "Later"];
      const proportional = values.length === events.length && Math.max(...values) !== Math.min(...values);
      const minimum = proportional ? Math.min(...values) : 0;
      const span = proportional ? Math.max(...values) - minimum : 1;
      return `<svg class="local-diagram" viewBox="0 0 640 210" role="img" aria-label="Timeline ${proportional ? "with proportionally spaced supplied values" : "marked as schematic and not to scale"}"><path d="M55 105H585"/><text x="55" y="28">${proportional ? "Spacing follows supplied values" : "Schematic · not to scale"}</text>${events.map((event, index) => { const x = proportional ? 80 + (values[index] - minimum) / span * 480 : 80 + index * 480 / Math.max(1, events.length - 1); return `<circle cx="${x}" cy="105" r="9"/><path d="M${x} 105v${index % 2 ? 45 : -45}"/><text x="${x}" y="${index % 2 ? 180 : 48}">${label(event)}</text>`; }).join("")}</svg>`;
    }
    if (type === "cycle") {
      const nodes = labels.length ? labels.slice(0, 5) : ["Notice", "Choose", "Try", "Check"];
      const positions = nodes.map((_, index) => {
        const angle = -Math.PI / 2 + index * (2 * Math.PI / nodes.length);
        return { x: 320 + Math.cos(angle) * 220, y: 120 + Math.sin(angle) * 78 };
      });
      return `<svg class="local-diagram diagram-cycle" viewBox="0 0 640 240" role="img" aria-label="Cycle returning from the final step to the first"><title>The final step reconnects to the first.</title>${positions.map((point, index) => { const next = positions[(index + 1) % positions.length]; return `<path class="cycle-link" d="M${point.x} ${point.y}L${next.x} ${next.y}"/>`; }).join("")}${positions.map((point, index) => `<rect x="${point.x - 58}" y="${point.y - 24}" width="116" height="48" rx="12"/><text x="${point.x}" y="${point.y + 5}">${label(nodes[index])}</text>`).join("")}</svg>`;
    }
    if (["flowchart", "causal-chain"].includes(type)) {
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
    const coreTask = coreTaskFor(scaffold, content);
    const selfPrompt = String(content.independencePrompt || "").trim() || "What is the decision I need to make, and how will I check it?";
    return `<div class="independent-resource"><span class="independence-mark">External support removed</span><h2>${esc(scaffold.objective)}</h2><section><strong>Your decision</strong><p>${esc(coreTask)}</p></section><section><strong>Before you begin</strong><p>${esc(selfPrompt)}</p></section><section><strong>Afterwards</strong><p>What did you decide for yourself? What evidence shows the learning?</p>${lines(5)}</section></div>`;
  }

  function renderBody(rawScaffold) {
    const scaffold = normalise(rawScaffold);
    const engine = engineById(scaffold.engineId);
    const content = scaffold.content;
    const rule = stageRules[scaffold.stage] || stageRules.sprout;
    if (scaffold.stage === "independent") return renderIndependent(scaffold);
    const prompts = stagePromptSet(scaffold, content);
    const coreTask = coreTaskFor(scaffold, content);
    const supportPrompts = prompts.filter(prompt => prompt !== coreTask);
    const vocabulary = content.vocabulary.slice(0, rule.words);
    const diagram = content.diagramType ? `<div class="engine-diagram">${renderDiagram(content.diagramType, scaffold.diagram || { labels: content.diagramLabels })}</div>` : "";
    const layout = engine.layout || "sequence";
    const layoutOwnsExample = ["worked", "error"].includes(layout) || (["source", "phrase-strip", "locator", "noticer", "lens", "challenge", "scenario", "primer", "shrinker"].includes(layout) && !diagram);
    const exampleText = rule.example === "partial" ? String(content.partialExample || "").trim() : String(content.example || "").trim();
    const example = rule.example === "none" || !exampleText || layoutOwnsExample || content.hiddenSections.includes("example") ? "" : section(rule.example === "modelled" ? "Study one modelled decision" : "Complete the missing decision", `<p>${esc(exampleText)}</p>${rule.example === "partial" ? lines(2) : ""}`, "engine-example");
    const oral = content.oralRehearsal && !content.hiddenSections.includes("oral") ? section("Rehearse before recording", `<p>${esc(content.oralPrompt)}</p>`, "engine-oral") : "";
    const vocabularyHTML = vocabulary.length && !content.hiddenSections.includes("vocabulary") ? `<div class="engine-vocabulary">${vocabulary.map(word => `<span>${esc(word)}</span>`).join("")}</div>` : "";
    const check = section("Independence check", `<p>${esc(content.checkPrompt)}</p>`, "engine-check");
    const intro = `<div class="engine-intro"><p>${esc(instructionForMode(content))}</p><small>${esc(content.subInstruction)}</small>${vocabularyHTML}</div>`;
    let core = "";

    if (["word-cards", "prompt-cards", "cue-card"].includes(layout)) core = promptCards(supportPrompts, layout);
    else if (["sequence", "flow", "cycle", "route", "causal-chain", "timeline", "ladder"].includes(layout)) core = `<div class="${layout === "ladder" ? "engine-ladder" : "engine-sequence"}">${supportPrompts.map((prompt, index) => `<section class="${layout === "ladder" ? "ladder-rung" : ""}"><span>${index + 1}</span><div><strong>${esc(prompt)}</strong>${lines(rule.response > 4 ? 2 : 1)}</div></section>`).join("")}</div>`;
    else if (["bridge", "chain"].includes(layout)) core = `<div class="engine-chain">${supportPrompts.slice(0, 3).map((prompt, index) => `<section><span>${index + 1}</span><strong>${esc(prompt)}</strong>${lines(3)}</section>${index < Math.min(2, supportPrompts.length - 1) ? '<i aria-hidden="true">→</i>' : ""}`).join("")}</div>`;
    else if (["compare", "choice", "decision-board", "sort"].includes(layout)) core = `<div class="engine-choice">${supportPrompts.map((prompt, index) => `<section><span>${index === 0 ? "Option or case A" : index === 1 ? "Option or case B" : "Use the same criterion"}</span><strong>${esc(prompt)}</strong>${lines(3)}</section>`).join("")}</div>`;
    else if (["table", "test-grid", "quadrant"].includes(layout)) core = supportPrompts.length ? `<div class="engine-table"><div class="engine-table-row engine-table-head">${supportPrompts.slice(0, 3).map(prompt => `<strong>${esc(prompt)}</strong>`).join("")}</div>${Array.from({ length: rule.response }, () => `<div class="engine-table-row">${supportPrompts.slice(0, 3).map(() => "<span></span>").join("")}</div>`).join("")}</div>` : "";
    else if (["dialogue", "substitution"].includes(layout)) core = `<div class="engine-dialogue">${supportPrompts.map((prompt, index) => `<section><span>${index === 0 ? "A · rehearse" : index === 1 ? "B · listen and build" : "Together · improve"}</span><strong>${esc(prompt)}</strong>${lines(2)}</section>`).join("")}</div>`;
    else if (["tree", "network", "map"].includes(layout)) core = `<div class="engine-network"><section class="engine-centre"><strong>${esc(scaffold.topic)}</strong></section>${supportPrompts.slice(0, 4).map(prompt => `<section><strong>${esc(prompt)}</strong>${lines(2)}</section>`).join("")}</div>`;
    else if (["worked", "error"].includes(layout)) core = `<div class="engine-worked">${exampleText ? `<section><span>Model or current attempt</span><strong>${esc(exampleText)}</strong><div class="worked-steps">${supportPrompts.map((prompt, index) => `<p><b>${index + 1}</b>${esc(prompt)}</p>`).join("")}</div></section>` : ""}<section><span>Your parallel thinking</span>${lines(Math.max(3, rule.response))}</section></div>`;
    else if (["math-model", "source", "phrase-strip", "locator", "noticer", "lens", "challenge", "scenario", "primer", "shrinker"].includes(layout)) core = `${diagram || (exampleText ? `<div class="engine-stimulus"><span>${layout === "source" ? "Source, text or stimulus" : "Working space"}</span><p>${esc(exampleText)}</p></div>` : "")}${promptCards(supportPrompts, layout)}`;
    else core = `${diagram}${promptCards(supportPrompts, layout)}`;
    if (diagram && !core.includes('class="engine-diagram"')) core = `${diagram}${core}`;

    const protectedDecision = `<section class="engine-core-task"><span>Your subject decision</span><strong>${esc(coreTask)}</strong><small>This remains yours at every growth stage.</small></section>`;
    return `${intro}${example}${core}${protectedDecision}${oral}${check}`;
  }

  function nextFade(scaffold) {
    const index = DATA.stages.findIndex(stage => stage.id === scaffold.stage);
    const next = DATA.stages[index + 1];
    if (!next) return "Remove the page. Keep only one pupil-owned self-prompt.";
    const engine = engineById(scaffold.engineId);
    if (next.id === "sprout") return scaffold.removalPathway || engine.release?.removeFirst || "Replace the modelled example with a partial example and remove the least essential prompt.";
    if (next.id === "growth") return `Remove the example and one more support cue. Keep the core pupil decision: ${coreTaskFor(scaffold)}.`;
    return `Remove the organiser. Keep the learning objective and let the pupil own this decision: ${coreTaskFor(scaffold)}.`;
  }

  function validationIssues(rawScaffold) {
    const scaffold = normalise(rawScaffold);
    const content = scaffold.content;
    const issues = [];
    const pupilFields = [content.instruction, content.subInstruction, ...content.prompts, content.coreTask, content.oralPrompt, content.checkPrompt, content.independencePrompt].filter(Boolean);
    const combined = [content.example, content.partialExample, ...pupilFields].join(" ");
    if (!String(scaffold.objective || "").trim()) issues.push({ type: "error", code: "objective", message: "Learning objective is missing." });
    if (!String(scaffold.situation || "").trim()) issues.push({ type: "review", code: "barrier", message: "The observed sticking point needs a precise description." });
    if (!String(scaffold.essentialThinking || scaffold.disciplinaryThinking || "").trim()) issues.push({ type: "error", code: "thinking", message: "The essential pupil thinking has not been protected explicitly." });
    if (content.prompts.length !== unique(content.prompts).length) issues.push({ type: "review", code: "repeat", message: "Repeated prompts should be removed." });
    if (words(content.instruction).length > 32) issues.push({ type: "review", code: "instruction-load", message: "The pupil instruction is longer than one manageable entry step." });
    if (content.vocabulary.length > 8) issues.push({ type: "review", code: "vocabulary-load", message: "More than eight vocabulary items may increase visual and retrieval load." });
    if (/low ability|middle ability|high ability|bottom group|weak pupil|low attainer/i.test(combined)) issues.push({ type: "error", code: "fixed-label", message: "Fixed-ability language must be replaced with a temporary, observable barrier." });
    const completedCalculation = /\b-?\d+(?:\.\d+)?\s*(?:[+\-×x*÷/])\s*-?\d+(?:\.\d+)?\s*=\s*-?\d+(?:\.\d+)?\b/i;
    const directiveAnswer = /\b(?:write|record|choose|answer)\s+(?:is\s+)?-?\d+(?:\.\d+)?\b|\b(?:the answer|the total|the result)\s+(?:is|equals)\s+-?\d+(?:\.\d+)?\b/i;
    if (/the answer is|therefore the answer|copy this answer/i.test(combined) || pupilFields.some(field => completedCalculation.test(String(field)) || directiveAnswer.test(String(field)))) issues.push({ type: "error", code: "answer-leak", message: "A pupil-facing cue contains a completed calculation or conclusion. Keep worked answers in a genuinely parallel model, not in the task prompts." });
    const visiblePrompts = stagePromptSet(scaffold, content);
    const coreTask = coreTaskFor(scaffold, content);
    if (scaffold.stage !== "independent" && coreTask && !visiblePrompts.includes(coreTask)) issues.push({ type: "error", code: "core-task", message: "The growth stage has removed the engine's protected pupil decision." });
    if (scaffold.stage === "independent" && !String(content.independencePrompt || coreTask).trim()) issues.push({ type: "review", code: "independent", message: "Independent needs one pupil-owned self-prompt without task-completing support." });
    const diagram = diagramValidation(content.diagramType, scaffold.diagram || { labels: content.diagramLabels });
    diagram.errors.forEach(message => issues.push({ type: "error", code: "diagram", message }));
    return issues;
  }

  function qualityAudit(rawScaffold) {
    const scaffold = normalise(rawScaffold);
    const engine = engineById(scaffold.engineId);
    const subject = subjectById(scaffold.subject);
    const issues = validationIssues(scaffold);
    const has = code => issues.some(issue => issue.code === code);
    const judgement = (label, status, reason, action = "") => ({ label, status, reason, action });
    const entry = (subject.entries || []).find(item => item.title === scaffold.topic && (item.years || []).includes(scaffold.year));
    const objectiveMapped = entry?.objectives?.includes(scaffold.objective);
    const objectivesForYear = entry?.objectivesByYear?.[scaffold.year];
    const declaredObjectiveYears = entry?.objectiveYears?.[scaffold.objective];
    const objectiveYearExact = Boolean(objectiveMapped && ((Array.isArray(objectivesForYear) && objectivesForYear.includes(scaffold.objective)) || (Array.isArray(declaredObjectiveYears) && declaredObjectiveYears.includes(scaffold.year)) || (entry.years || []).length === 1));
    const objectiveStatus = objectiveYearExact ? "Strong" : entry ? "Teacher review needed" : "Not locally established";
    const engineCompatible = (engine.subjects || []).includes(scaffold.subject) || (engine.subjects || []).includes("all");
    const barrierFit = (engine.barriers || []).some(id => (scaffold.barriers || []).includes(id));
    const profile = supportProfile(scaffold);
    const stageIntegrity = profile.coreTask && (scaffold.stage === "independent" || profile.visiblePrompts.includes(profile.coreTask));
    const representation = diagramValidation(scaffold.content.diagramType, scaffold.diagram || { labels: scaffold.content.diagramLabels });
    const print = printPreflight(scaffold, scaffold.format || "workpage", { paper: "a4", orientation: "portrait", colour: "full-colour" });
    return [
      judgement("Curriculum integrity", objectiveStatus, objectiveYearExact ? "The objective is explicitly mapped to the selected year in the local curriculum data." : objectiveMapped ? "The objective belongs to this curriculum area, but the multi-year record does not establish an exact selected-year match." : entry ? "The objective is teacher-edited, so local year alignment cannot be established automatically." : "The selected topic is not mapped locally for this subject and year.", "Confirm the exact intended learning and year alignment."),
      judgement("Barrier precision", has("barrier") ? "Review recommended" : "Strong", has("barrier") ? "The sticking point is not yet precise enough." : "The support responds to an observable point of breakdown.", "Name what pupils can do and where success stops."),
      judgement("Intellectual ownership", has("thinking") || has("answer-leak") || has("core-task") ? "Possible over-scaffolding" : "Strong", has("answer-leak") ? "A prompt may reveal the conclusion." : has("core-task") ? "The core pupil decision disappeared during fading." : `Every visible stage retains ${engine.preserves || "the central pupil decision"}.`, "Remove task-completing support, never the protected decision."),
      judgement("Subject authenticity", engineCompatible ? "Strong" : "Not locally established", engineCompatible ? `${engine.name} is declared for ${subject.name} and retains its disciplinary action.` : `${engine.name} is not declared as compatible with ${subject.name}.`, "Choose a subject-compatible engine or record the professional reason for overriding it."),
      judgement("Barrier–engine fit", barrierFit ? "Strong" : "Teacher review needed", barrierFit ? "The engine directly addresses at least one selected observable barrier." : "The engine does not directly match a selected barrier in its local metadata.", "Confirm why this structure removes the named barrier better than a lighter alternative."),
      judgement("Cognitive load", has("instruction-load") || has("vocabulary-load") ? "Review recommended" : "Strong", has("instruction-load") || has("vocabulary-load") ? "Language or vocabulary density may compete with the learning." : "Directions and vocabulary are deliberately limited.", "Reduce entry language before reducing curriculum demand."),
      judgement("Language demand", has("instruction-load") ? "Teacher review needed" : "Strong", has("instruction-load") ? "The entry instruction may be too long to function as access support." : "The local instruction-length check found no obvious overload.", "Test the instruction aloud and shorten the entry action first."),
      judgement("Representation accuracy", !representation.valid ? "Representation requires checking" : representation.warnings.length ? "Teacher review needed" : "Strong", !representation.valid ? representation.errors.join(" ") : representation.warnings.length ? representation.warnings.join(" ") : scaffold.content.diagramType ? "The selected diagram passed its deterministic type-specific checks." : "No diagram is forced where one may not help.", "Correct quantities, labels, order, scale or structure before printing."),
      judgement("Independence pathway", has("independent") || !stageIntegrity ? "Fading pathway incomplete" : "Strong", has("independent") || !stageIntegrity ? "The independent self-prompt or protected decision is incomplete." : `Support decreases while the core task remains. Next: ${nextFade(scaffold)}`),
      judgement("Classroom usability", has("repeat") ? "Review recommended" : "Strong", has("repeat") ? "Repeated prompts add noise without support." : "The resource can be introduced through one modelled decision and used immediately."),
      judgement("Print fitness", print.blocking.length ? "Print review needed" : print.warnings.length ? "Teacher review needed" : "Strong", print.blocking[0] || print.warnings[0] || "The chosen format passes local content-density and paper-purpose checks.", "Use Print Studio preflight and inspect the physical printer preview."),
      judgement("Inclusion", has("fixed-label") ? "Review recommended" : "Strong", has("fixed-label") ? "Fixed-ability language appears in the resource." : "Support is described through access features and observable barriers, not diagnoses or attainment labels."),
      judgement("Evidence of fading", scaffold.reflection?.supportRemoved || scaffold.fadeHistory?.length ? "Strong" : "Not yet observed", scaffold.reflection?.supportRemoved ? `Recorded support removal: ${scaffold.reflection.supportRemoved}` : scaffold.fadeHistory?.length ? "A move to lighter support has been recorded." : "The pathway is designed, but classroom evidence of support disappearing has not yet been recorded.", "After use, record what pupils managed without and what should disappear next.")
    ];
  }

  function printPreflight(rawScaffold, formatId = "workpage", options = {}) {
    const scaffold = normalise(rawScaffold);
    const format = DATA.printFormats.find(item => item.id === formatId) || DATA.printFormats[0];
    const rule = format.release || DATA.build5?.formatRules?.[format.id] || {};
    const paper = String(options.paper || (format.id === "a5-sheet" ? "a5" : "a4")).toLowerCase();
    const orientation = String(options.orientation || "portrait").toLowerCase();
    const blocking = [];
    const warnings = [];
    const requestedMode = String(options.mode || "full-colour");
    const allowedModes = new Set((DATA.build5?.printModes || []).map(mode => mode.id));
    const mode = allowedModes.has(requestedMode) ? requestedMode : "invalid";
    if (mode === "invalid") blocking.push(`Unknown print style: ${requestedMode}. Choose one of the seven designed output styles.`);
    const visible = stagePromptSet(scaffold, scaffold.content);
    const wordCount = words([scaffold.title, scaffold.objective, scaffold.content.instruction, scaffold.content.example, ...visible, ...scaffold.content.vocabulary].join(" ")).length;
    if (rule.safePaper?.length && !rule.safePaper.includes(paper)) blocking.push(`${format.name} is not intentionally composed for ${paper.toUpperCase()}.`);
    if (format.id === "mini-booklet" && !options.duplex) warnings.push("Mini-booklet imposition needs duplex printing and a short-edge flip.");
    if (rule.preferredOrientation && orientation !== rule.preferredOrientation) warnings.push(`${format.name} is usually clearest in ${rule.preferredOrientation}. Inspect the preview carefully.`);
    if (paper === "a5" && wordCount > 180) warnings.push("This A5 page is content-dense. Reduce items or use A4 rather than shrinking the type.");
    if (["desk-strip", "mini-card", "cut-cards", "display-poster"].includes(format.id) && visible.length > 4) warnings.push("This compact format contains too many simultaneous prompts.");
    if (scaffold.content.vocabulary.length > (paper === "a5" ? 4 : 6)) warnings.push("Move surplus vocabulary to teacher guidance or a separate vocabulary-card page.");
    if (scaffold.content.diagramType) {
      const diagram = diagramValidation(scaffold.content.diagramType, scaffold.diagram || { labels: scaffold.content.diagramLabels });
      if (!diagram.valid) blocking.push(...diagram.errors);
      else warnings.push(...diagram.warnings);
    }
    if (options.largePrint && wordCount > (paper === "a5" ? 110 : 230)) warnings.push("Enlarged print needs more pages or fewer items; type must not be squeezed to fit.");
    return { formatId: format.id, paper, orientation, mode, wordCount, blocking: unique(blocking), warnings: unique(warnings), status: blocking.length ? "Do not print yet" : warnings.length ? "Review preview" : "Ready for physical preview" };
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
    createStage, stageSet, nextFade, sanitizeImport, engineById, profileFor, stageRules,
    coreTaskFor, stagePromptSet, supportProfile, printPreflight
  };
})();
