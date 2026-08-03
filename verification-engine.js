(function () {
  "use strict";

  const DATA = window.SCAFFOLD_DATA;
  const RESOURCE = window.ScaffoldResourceEngine;
  if (!DATA?.ai || !RESOURCE) throw new Error("Build 4 data and the local resource engine must load before verification.");

  const SEVERITY = { information: 0, review: 1, important: 2, "do-not-use": 3 };
  const severityNames = { information: "Information", review: "Review", important: "Important", "do-not-use": "Do not use yet" };
  const statusNames = { local: "Locally checked", calculation: "Calculation validated", structure: "Structure matches request", pattern: "Pattern-based warning", teacher: "Teacher review required", external: "External verification recommended", source: "Source verification required" };
  const normalise = value => String(value || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9%+\-*/=.'\s]/g, " ").replace(/\s+/g, " ").trim();
  const words = value => String(value || "").trim().split(/\s+/).filter(Boolean);
  const unique = list => [...new Set(list.filter(Boolean))];
  const sectionById = (parsed, id) => (parsed?.sections || []).find(section => section.id === id);
  const sectionItems = (parsed, id) => sectionById(parsed, id)?.items || [];
  const itemText = item => typeof item === "string" ? item : String(item?.editedText ?? item?.text ?? item?.value ?? "");
  const sectionText = (parsed, id) => sectionItems(parsed, id).map(itemText).join("\n");
  const allText = parsed => (parsed?.sections || []).flatMap(section => section.items || []).map(itemText).join("\n");

  function finding(dimension, severity, title, message, action, options = {}) {
    return {
      id: options.id || `vf-${dimension.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`,
      dimension,
      severity,
      severityLabel: severityNames[severity] || severityNames.review,
      validation: options.validation || "pattern",
      validationLabel: statusNames[options.validation || "pattern"],
      title,
      message,
      action,
      sectionId: options.sectionId || "",
      itemId: options.itemId || "",
      resolved: Boolean(options.resolved),
      evidence: options.evidence || ""
    };
  }

  function pushUnique(findings, next) {
    const key = `${next.dimension}|${next.title}|${normalise(next.message)}|${next.sectionId}|${next.itemId}`;
    if (!findings.some(item => `${item.dimension}|${item.title}|${normalise(item.message)}|${item.sectionId}|${item.itemId}` === key)) findings.push(next);
  }

  function readingMetrics(text) {
    const source = String(text || "").trim();
    const wordList = words(source);
    const sentences = source.split(/(?<=[.!?])\s+|\n+/).map(item => item.trim()).filter(Boolean);
    const paragraphs = source.split(/\n\s*\n/).map(item => item.trim()).filter(Boolean);
    const lengths = sentences.map(sentence => words(sentence).length);
    const frequency = {};
    wordList.map(word => normalise(word)).filter(word => word.length > 4).forEach(word => { frequency[word] = (frequency[word] || 0) + 1; });
    const repeated = Object.entries(frequency).filter(([, count]) => count >= 3).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));
    const commonCapitalised = new Set(["The", "This", "That", "These", "Those", "When", "Where", "What", "Why", "How", "If", "Then", "Use", "Read", "Write", "Explain", "Choose", "Answer"]);
    const properNouns = unique([...source.matchAll(/\b[A-Z][a-z][A-Za-z'’-]{1,}\b/g)].map(match => match[0]).filter(word => !commonCapitalised.has(word))).slice(0, 20);
    const headings = source.split("\n").map(line => line.trim().replace(/^#{1,6}\s*/, "")).filter(line => line && words(line).length <= 10 && !/[.!?]$/.test(line) && (/^[A-Z][A-Za-z\s&'’-]+$/.test(line) || /^[A-Z\s&'’-]+$/.test(line))).slice(0, 20);
    return {
      words: wordList.length,
      sentences: sentences.length,
      paragraphs: paragraphs.length || (source ? 1 : 0),
      averageSentenceWords: sentences.length ? Math.round((lengths.reduce((a, b) => a + b, 0) / sentences.length) * 10) / 10 : 0,
      longestSentenceWords: lengths.length ? Math.max(...lengths) : 0,
      longestParagraphWords: paragraphs.length ? Math.max(...paragraphs.map(paragraph => words(paragraph).length)) : wordList.length,
      repeated,
      properNouns,
      headings
    };
  }

  function tokenizeExpression(expression) {
    const clean = String(expression || "").replace(/[×x]/gi, "*").replace(/[÷]/g, "/").replace(/[−–—]/g, "-").replace(/,/g, "").trim();
    if (!clean || /[^0-9.+\-*/()\s]/.test(clean)) return null;
    return clean.match(/\d*\.?\d+|[()+\-*/]/g);
  }

  function evaluateExpression(expression) {
    const tokens = tokenizeExpression(expression);
    if (!tokens?.length || tokens.length > 80) return null;
    let index = 0;
    function factor() {
      const token = tokens[index];
      if (token === "+" || token === "-") {
        index += 1;
        const value = factor();
        return value == null ? null : token === "-" ? -value : value;
      }
      if (token === "(") {
        index += 1;
        const value = expressionValue();
        if (tokens[index] !== ")") return null;
        index += 1;
        return value;
      }
      if (token != null && /^\d*\.?\d+$/.test(token)) {
        index += 1;
        return Number(token);
      }
      return null;
    }
    function term() {
      let value = factor();
      if (value == null) return null;
      while (["*", "/"].includes(tokens[index])) {
        const operator = tokens[index++];
        const right = factor();
        if (right == null || (operator === "/" && Math.abs(right) < 1e-12)) return null;
        value = operator === "*" ? value * right : value / right;
      }
      return value;
    }
    function expressionValue() {
      let value = term();
      if (value == null) return null;
      while (["+", "-"].includes(tokens[index])) {
        const operator = tokens[index++];
        const right = term();
        if (right == null) return null;
        value = operator === "+" ? value + right : value - right;
      }
      return value;
    }
    const result = expressionValue();
    return index === tokens.length && Number.isFinite(result) ? result : null;
  }

  function extractEquations(text) {
    const lines = String(text || "").split(/\n|[.;](?=\s|$)/).map(item => item.trim()).filter(Boolean);
    const results = [];
    lines.forEach((line, lineIndex) => {
      const matches = line.matchAll(/(^|[^\w])([()\d.,\s+\-−–—×x*÷/]+)=\s*(-?\d+(?:\.\d+)?)(?!\s*[=<>])/g);
      for (const match of matches) {
        const expression = match[2].trim();
        if (!/[+\-−–—×x*÷/]/.test(expression)) continue;
        const expected = Number(match[3]);
        const actual = evaluateExpression(expression);
        if (actual != null) results.push({ line, lineIndex, expression, expected, actual, valid: Math.abs(actual - expected) < 1e-9 });
      }
      const percentages = [...line.matchAll(/(\d+(?:\.\d+)?)%\s+of\s+(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/gi)];
      percentages.forEach(match => {
        const actual = Number(match[1]) / 100 * Number(match[2]);
        const expected = Number(match[3]);
        results.push({ line, lineIndex, expression: `${match[1]}% of ${match[2]}`, expected, actual, valid: Math.abs(actual - expected) < 1e-9 });
      });
    });
    return results;
  }

  function mathematicalChecks(text) {
    const results = extractEquations(text);
    const issues = [];
    results.filter(result => !result.valid).forEach(result => issues.push({ type: "incorrect", ...result }));
    const unitPattern = /(\d+(?:\.\d+)?)\s*(mm|cm|m|km|g|kg|ml|l)\s*=\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|km|g|kg|ml|l)/gi;
    const factors = { mm: { base: "length", value: .001 }, cm: { base: "length", value: .01 }, m: { base: "length", value: 1 }, km: { base: "length", value: 1000 }, g: { base: "mass", value: .001 }, kg: { base: "mass", value: 1 }, ml: { base: "volume", value: .001 }, l: { base: "volume", value: 1 } };
    for (const match of String(text || "").matchAll(unitPattern)) {
      const from = factors[match[2].toLowerCase()];
      const to = factors[match[4].toLowerCase()];
      const actual = Number(match[1]) * from.value;
      const expected = Number(match[3]) * to.value;
      if (from.base !== to.base || Math.abs(actual - expected) > 1e-9) issues.push({ type: "unit", line: match[0], actual, expected });
    }
    return { equations: results, issues };
  }

  function structuralChecks(scaffold, parsed, task, findings, options = {}) {
    const sections = parsed?.sections || [];
    const ids = sections.map(section => section.id);
    const expected = task?.sections || [];
    expected.filter(id => !ids.includes(id) && id !== "uncertainties").forEach(id => pushUnique(findings, finding("Structural", "review", `Missing ${DATA.ai.sections[id]?.name || id}`, "The returned content does not contain an expected section.", `Map an imported block to ${DATA.ai.sections[id]?.name || id}, add it manually, or regenerate only that section.`, { validation: "structure", sectionId: id })));
    sections.forEach(section => {
      const seen = new Map();
      (section.items || []).forEach(item => {
        const key = normalise(itemText(item));
        if (!key) pushUnique(findings, finding("Structural", "review", "Empty imported item", "One imported item contains no usable content.", "Reject the empty item.", { sectionId: section.id, itemId: item.id }));
        else if (seen.has(key)) pushUnique(findings, finding("Structural", "review", "Repeated item", "This item appears more than once in the imported response.", "Keep one copy and reject the repeat.", { sectionId: section.id, itemId: item.id, evidence: itemText(item) }));
        else seen.set(key, item.id);
      });
      if ((section.items || []).length > 12 && !["passage", "critique", "verification"].includes(section.id)) pushUnique(findings, finding("Structural", "review", "More content than requested", `${DATA.ai.sections[section.id]?.name || section.label} contains ${section.items.length} items.`, "Keep the strongest items or split them across pages.", { sectionId: section.id }));
    });
    (parsed?.warnings || []).forEach(warning => pushUnique(findings, finding("Structural", warning.level === "important" ? "important" : "review", warning.title || "Import needs attention", warning.message, warning.action || "Inspect the raw response and map the content manually.", { validation: "structure" })));
    if (!sections.length) pushUnique(findings, finding("Structural", "important", "No usable sections detected", "The response was preserved, but automatic structuring found no content blocks.", "Use plain text, split manually, or paste the response again.", { validation: "structure" }));
    const numbering = sectionItems(parsed, "questions").map(itemText).map(text => text.match(/^\s*(\d+)[.)]/)?.[1]).filter(Boolean).map(Number);
    if (numbering.length > 1 && numbering.some((value, index) => index && value !== numbering[index - 1] + 1)) pushUnique(findings, finding("Structural", "review", "Question numbering is inconsistent", "Question numbers skip, repeat or move backwards.", "Renumber after accepting the selected questions.", { sectionId: "questions" }));
    const questions = sectionItems(parsed, "questions");
    const answers = sectionItems(parsed, "answers");
    if (questions.length && answers.length && questions.length !== answers.length) pushUnique(findings, finding("Structural", "important", "Question and answer counts do not match", `${questions.length} questions were paired with ${answers.length} answers.`, "Map, remove or add items until every retained question has clear answer guidance.", { validation: "structure" }));
    const requested = Math.max(1, Math.min(Number(options.quantity) || task?.quantity || 1, 20));
    const primarySection = (task?.sections || []).find(id => DATA.ai.sections[id]?.itemised && !["answers", "uncertainties", "sources", "teacher-guidance", "change-notes", "verification", "critique"].includes(id));
    const actual = primarySection ? sectionItems(parsed, primarySection).length : 0;
    if (requested > 1 && primarySection && actual && actual !== requested) pushUnique(findings, finding("Structural", "review", "Item count differs from the request", `${actual} ${DATA.ai.sections[primarySection]?.name.toLowerCase() || "items"} were retained; the prompt requested ${requested}.`, "Confirm that the smaller or larger set is intentional before rebuilding.", { validation: "structure", sectionId: primarySection }));
  }

  function pedagogicalChecks(scaffold, parsed, findings) {
    const text = allText(parsed);
    const lower = normalise(text);
    const objective = normalise(scaffold.objective);
    if (/\b(the answer is|therefore the answer is|copy this answer|you should conclude|the correct inference is|this proves that)\b/.test(lower)) pushUnique(findings, finding("Pedagogical", "important", "Possible answer leakage", "The proposed content may state a conclusion or answer that should remain with the pupil.", "Reject or rewrite the exact item so the pupil still makes the protected decision.", { validation: "pattern" }));
    if (/\b(sentence starter|complete the sentence|fill in the blank)\b/.test(lower) && /because|therefore|this shows|i infer/.test(lower)) pushUnique(findings, finding("Pedagogical", "review", "Completion frame may perform the reasoning", "A sentence-completion structure may supply the relationship rather than support its expression.", "Replace it with a question or remove the causal words the pupil must choose."));
    if (/\b(low ability|lower ability|weak pupils?|bottom group|less able|high ability|more able)\b/.test(lower)) pushUnique(findings, finding("Pedagogical", "important", "Fixed-ability language", "The imported content labels pupils rather than describing a temporary barrier.", "Use a neutral support description or teacher-defined temporary group name."));
    if (/\b(easy|simpler|basic) (version|worksheet|task|group)\b/.test(lower)) pushUnique(findings, finding("Pedagogical", "review", "Challenge may have been reduced", "The response appears to create a lower-demand task instead of changing access.", "Compare every changed demand with the objective before accepting."));
    if (objective && /learning objective\s*:/i.test(text)) {
      const returnedObjective = normalise(text.match(/learning objective\s*:\s*([^\n]+)/i)?.[1]);
      const overlap = objective.split(" ").filter(word => word.length > 4 && returnedObjective.includes(word)).length;
      if (returnedObjective && overlap < Math.min(2, objective.split(" ").filter(word => word.length > 4).length)) pushUnique(findings, finding("Pedagogical", "important", "Learning objective appears to have changed", "The returned objective does not closely match the locally selected learning.", "Keep the original objective and import content only if it genuinely serves it."));
    }
    const prompts = sectionItems(parsed, "questions").map(itemText);
    if (prompts.length > 10) pushUnique(findings, finding("Pedagogical", "review", "Prompt load may be excessive", `${prompts.length} questions may increase cognitive load or turn the scaffold into a worksheet.`, "Keep only the questions that directly serve the barrier and support stage.", { sectionId: "questions" }));
    if (scaffold.stage === "independent" && (sectionItems(parsed, "vocabulary").length || sectionItems(parsed, "examples").length > 1)) pushUnique(findings, finding("Pedagogical", "important", "Independent support may have grown again", "The returned content adds task-completing support to the Independent stage.", "Apply this content to Seed or Sprout, or keep only one self-monitoring cue."));
    const protectedTerms = normalise(scaffold.essentialThinking).split(" ").filter(word => word.length > 6);
    if (protectedTerms.length && !protectedTerms.some(term => lower.includes(term)) && words(text).length > 120) pushUnique(findings, finding("Pedagogical", "review", "Protected thinking is not visible", "The response is substantial but does not appear to acknowledge the pupil-owned thinking.", "Review whether the content has drifted to a different task or scaffold type."));
  }

  function languageAndInclusionChecks(scaffold, parsed, findings, options = {}) {
    const text = allText(parsed);
    const metrics = readingMetrics(text);
    if (metrics.longestSentenceWords > 35) pushUnique(findings, finding("Language", "review", "Very long sentence", `At least one sentence contains ${metrics.longestSentenceWords} words.`, "Split the sentence only if this reduces access demand without flattening meaning."));
    if (metrics.properNouns.length > 8) pushUnique(findings, finding("Language", "review", "Many proper nouns may increase knowledge demand", `${metrics.properNouns.length} possible names or place terms were detected.`, "Check which names are essential, introduced and pronounceable for this task.", { validation: "teacher" }));
    const targetVocabulary = String(options.vocabularyFocus || "").split(/[,;\n]/).map(item => normalise(item)).filter(item => item.length > 2);
    const missingVocabulary = targetVocabulary.filter(term => !normalise(text).includes(term));
    if (targetVocabulary.length && missingVocabulary.length) pushUnique(findings, finding("Language", "review", "Target vocabulary is missing", `${missingVocabulary.slice(0, 6).join(", ")} ${missingVocabulary.length === 1 ? "was" : "were"} requested but not detected in the retained content.`, "Add the term in a meaningful context or confirm that its omission is deliberate.", { validation: "structure" }));
    if (/\b(it|this|that|they)\b[^.!?]{70,}\b(it|this|that|they)\b/i.test(text)) pushUnique(findings, finding("Language", "review", "Reference may be ambiguous", "Long stretches use pronouns that may not have a clear referent.", "Name the subject once more where the reference could be unclear."));
    if (/\bjust|simply|obviously|clearly\b/i.test(text)) pushUnique(findings, finding("Language", "review", "Dismissive instruction language", "Words such as “just” or “obviously” can conceal complexity or make uncertainty feel like failure.", "State the action directly."));
    if (/\b(use the red|in green|blue means|colour the .* red|red items?)\b/i.test(text) && !/label|shape|pattern|symbol/i.test(text)) pushUnique(findings, finding("Inclusion", "important", "Meaning may rely on colour alone", "The instruction appears to use colour as the only way to distinguish information.", "Add a label, symbol, pattern or position cue."));
    if (/\b(your trauma|your family conflict|your diagnosis|your medical|tell the class|share a private|personal incident|your parents? argue|your online experience)\b/i.test(text)) pushUnique(findings, finding("Inclusion", "do-not-use", "Unsafe personal disclosure prompt", "The content may ask pupils to reveal private, medical, family or safeguarding information publicly.", "Replace it with a fictional third-person scenario and retain a private route to a trusted adult."));
    if (/\b(every family has|mum and dad|boys always|girls always|normal family|foreign country|third world|poor country)\b/i.test(text)) pushUnique(findings, finding("Inclusion", "important", "Narrow or stereotyped assumption", "The context may make an unsupported assumption about family, gender, culture or place.", "Regenerate only the context while locking the academic structure."));
    if (/\b(expensive holiday|skiing holiday|flight abroad|family car|your own bedroom)\b/i.test(text)) pushUnique(findings, finding("Inclusion", "review", "Experience may not be widely accessible", "The task relies on an experience or possession not shared by all pupils.", "Use a neutral, easily understood context unless the experience is taught explicitly."));
    if (/\b(adhd|autis(m|tic)|dyslexi(a|c)|special needs|send pupil|diagnosed)\b/i.test(text)) pushUnique(findings, finding("Inclusion", "important", "Diagnostic assumption", "Imported content includes diagnostic language where a direct access feature would be clearer and safer.", "Describe the observable barrier or requested access change without a pupil label."));
    if (/\b(copy|reproduce) (the|a) (worksheet|chapter|resource pack)|in the exact style of|imitate .* illustrator/i.test(text)) pushUnique(findings, finding("Inclusion", "important", "Copyright-sensitive request", "The content may reproduce commercial material or imitate a living creator too closely.", "Create original content with specified educational features instead."));
    const totalWords = metrics.words;
    const pageLimit = scaffold.format === "desk-strip" ? 120 : scaffold.format === "cut-cards" ? 350 : 700;
    if (totalWords > pageLimit) pushUnique(findings, finding("Print", "review", "Content may not fit the selected format", `${totalWords} imported words exceed the cautious ${pageLimit}-word review point for this format.`, "Trim, split pages, or move teacher notes off the pupil resource."));
    sectionItems(parsed, "questions").forEach(item => {
      if (words(itemText(item)).length > 34) pushUnique(findings, finding("Print", "review", "Question may be too dense for a card", "A question contains more than 34 words before the pupil can respond.", "Shorten or move context into a separate stimulus.", { sectionId: "questions", itemId: item.id }));
    });
    return metrics;
  }

  function questionChecks(parsed, findings) {
    const questions = sectionItems(parsed, "questions").map(itemText);
    if (!questions.length) return;
    const openings = questions.map(question => normalise(question).split(" ").slice(0, 3).join(" ")).filter(Boolean);
    const repeatedOpening = openings.find(opening => openings.filter(value => value === opening).length >= Math.max(3, Math.ceil(openings.length * .7)));
    if (repeatedOpening && questions.length >= 4) pushUnique(findings, finding("Pedagogical", "review", "Questions may lack purposeful variation", "Most retained questions begin in the same way and may rehearse one surface response rather than a progression.", "Check retrieval, application, reasoning and representation demands deliberately; do not vary wording for its own sake.", { sectionId: "questions" }));
    questions.forEach((question, index) => {
      if (/\b(it|they|this|that)\b/i.test(question) && !/text|passage|diagram|source|example|statement|number|shape|character|place/i.test(question)) pushUnique(findings, finding("Language", "review", "Question reference may be unclear", `Question ${index + 1} uses a pronoun without an obvious named referent.`, "Name the text, object, claim or representation the pupil should use.", { sectionId: "questions" }));
      if (/\b(the answer is|because the answer|which is obviously|therefore it must be)\b/i.test(question)) pushUnique(findings, finding("Pedagogical", "important", "Question may reveal its answer", `Question ${index + 1} appears to contain the conclusion or a decisive cue.`, "Remove the cue while retaining enough information to solve the task.", { sectionId: "questions" }));
    });
  }

  function vocabularyChecks(parsed, findings) {
    const items = sectionItems(parsed, "vocabulary").map(itemText);
    items.forEach((text, index) => {
      const parts = text.split(/\s(?:—|–|-)\s|:\s+/);
      if (parts.length < 2) return;
      const headword = normalise(parts[0]).split(" ")[0];
      const definition = normalise(parts.slice(1).join(" "));
      if (headword.length > 3 && new RegExp(`\\b${headword}(?:s|ed|ing)?\\b`).test(definition.slice(0, Math.max(45, headword.length + 8)))) pushUnique(findings, finding("Language", "review", "Definition may be circular", `Vocabulary item ${index + 1} appears to define “${parts[0].trim()}” by repeating the same word.`, "Explain the underlying concept using known language, then retain the precise subject term.", { sectionId: "vocabulary" }));
      if (/\bthing (that|which)|stuff|something to do with\b/i.test(definition)) pushUnique(findings, finding("Language", "review", "Definition may be too vague", `Vocabulary item ${index + 1} uses a general placeholder instead of the subject relationship.`, "Name the class, process, feature or relationship precisely.", { sectionId: "vocabulary" }));
    });
    if (items.length > 8) pushUnique(findings, finding("Print", "review", "Vocabulary selection may be too large", `${items.length} vocabulary items are retained for the pupil resource.`, "Keep richer morphology and confusion notes in teacher guidance; select only the words pupils need now.", { sectionId: "vocabulary" }));
  }

  function localRepresentationChecks(scaffold, findings) {
    const normalised = RESOURCE.normalise(scaffold);
    const type = normalised.content?.diagramType;
    if (!type) return;
    const validation = RESOURCE.diagramValidation(type, scaffold.diagram || { labels: normalised.content.diagramLabels });
    validation.errors.forEach(message => pushUnique(findings, finding("Print", "do-not-use", "Local representation is malformed", message, "Correct the diagram configuration in the local designer before use.", { validation: "local" })));
    if (validation.valid) pushUnique(findings, finding("Print", "information", "Local representation structure checked", `The ${String(type).replaceAll("-", " ")} passed its deterministic local structure check.`, "Still confirm that it represents the intended concept and imported values.", { validation: "local", resolved: true }));
  }

  function mathsChecks(parsed, findings) {
    const text = allText(parsed);
    const audit = mathematicalChecks(text);
    audit.issues.forEach(issue => {
      const message = issue.type === "incorrect" ? `${issue.expression} evaluates to ${Number(issue.actual.toFixed(10))}, not ${issue.expected}.` : `The conversion “${issue.line}” is inconsistent.`;
      pushUnique(findings, finding("Subject", "do-not-use", issue.type === "incorrect" ? "Incorrect mathematical answer" : "Incorrect unit conversion", message, "Correct the value and re-run verification before use.", { validation: "calculation", evidence: issue.line }));
    });
    if (audit.equations.length && !audit.issues.length) pushUnique(findings, finding("Subject", "information", "Explicit calculations checked", `${audit.equations.length} explicit equation${audit.equations.length === 1 ? "" : "s"} passed local arithmetic checking.`, "Still inspect question meaning, units and diagrams.", { validation: "calculation", resolved: true }));
    if (/\b(add means|addition keyword|multiply when you see|divide because it says share)\b/i.test(text)) pushUnique(findings, finding("Subject", "important", "Operation-keyword reasoning", "The wording may teach pupils to choose an operation from a keyword rather than mathematical structure.", "Ask pupils to identify the relationship and justify the operation."));
    if (/\bdenominator.*bigger.*fraction.*bigger|larger denominator.*larger/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Fraction misconception", "The content appears to claim that a larger denominator necessarily creates a larger fraction.", "Compare equal wholes with a valid representation before use."));
    const answers = sectionItems(parsed, "answers").map(itemText).map(normalise).filter(Boolean);
    if (answers.length > 1 && unique(answers).length < answers.length) pushUnique(findings, finding("Subject", "review", "Repeated answer guidance", "Different questions may have received identical or duplicated answer entries.", "Match each accepted answer to its exact question.", { sectionId: "answers" }));
  }

  function englishChecks(scaffold, parsed, findings, options) {
    const text = allText(parsed);
    const passage = sectionText(parsed, "passage");
    const questions = sectionItems(parsed, "questions").map(itemText);
    if (/\bdecodable|phonics[- ]aligned|grapheme|phoneme\b/i.test(text) && !options?.phonicsProgramme) pushUnique(findings, finding("Subject", "important", "Phonics programme not supplied", "Programme-specific progression cannot be checked without the school's sequence and taught correspondences.", "Add the programme and taught graphemes, or mark the text for teacher review.", { validation: "teacher" }));
    if (/look at the picture|use the picture to guess|guess from the first letter/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Picture-guessing prompt", "The prompt may encourage guessing instead of word reading.", "Remove the guessing cue and align support with the school's phonics approach."));
    if (passage) {
      const passageWords = new Set(normalise(passage).split(" ").filter(word => word.length > 3));
      sectionItems(parsed, "answers").forEach(item => {
        const answerWords = normalise(itemText(item)).split(" ").filter(word => word.length > 4);
        if (answerWords.length && !answerWords.some(word => passageWords.has(word))) pushUnique(findings, finding("Subject", "review", "Answer may not be supported by the passage", "A returned answer has little lexical connection to the supplied passage.", "Locate the exact supporting detail or mark this as an inference requiring background knowledge.", { sectionId: "answers", itemId: item.id, validation: "teacher" }));
      });
    }
    if (questions.some(question => /what can we infer|what impression|suggests about/i.test(question)) && /the answer is|this tells us that/i.test(text)) pushUnique(findings, finding("Subject", "important", "Inference may have been completed", "The response may supply the inference rather than the evidence bridge.", "Retain evidence and connection prompts; remove the completed inference."));
    if ((text.match(/I will begin|My first sentence|Firstly, I will/gi) || []).length > 2) pushUnique(findings, finding("Subject", "review", "Writing model may be formulaic", "Repeated openings could lead pupils towards identical composition.", "Keep the model for noticing and invite different authorial choices."));
  }

  function scienceChecks(parsed, findings) {
    const text = allText(parsed);
    const errors = [
      [/\bmass (is|means) (the same as )?weight\b/i, "Mass and weight are treated as the same concept."],
      [/\bmelting (is|means) dissolving\b|\bdissolving (is|means) melting\b/i, "Melting and dissolving are treated as the same process."],
      [/\bevaporat(e|ion).*only.*boil|\bboiling (is|means) evaporation\b/i, "Evaporation and boiling are confused."],
      [/\bforce (always )?causes movement\b/i, "The explanation implies that any force necessarily causes movement."],
      [/\banimals? (choose|decide) to adapt|plants? (choose|decide) to adapt\b/i, "Adaptation is described as intentional change."],
      [/\bplants? eat (soil|sunlight)\b/i, "The explanation says that plants eat soil or sunlight."]
    ];
    errors.forEach(([pattern, message]) => { if (pattern.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Scientific misconception", message, "Correct the scientific explanation and confirm the mechanism before use.")); });
    if (/every (experiment|enquiry|investigation).*fair test|all (experiments|enquiries|investigations).*fair test/i.test(text)) pushUnique(findings, finding("Subject", "important", "Enquiry type has been overgeneralised", "Not every enquiry is a comparative or fair test.", "Match the question to observation over time, pattern seeking, classification, research or comparative testing."));
    if (/conclusion\s*:[^\n]+/i.test(text) && !sectionText(parsed, "answers") && !/results|evidence|data/i.test(text)) pushUnique(findings, finding("Subject", "important", "Conclusion appears before evidence", "A scientific conclusion is supplied without visible results or evidence.", "Place it in teacher guidance or leave pupils to conclude from the data."));
    if (/\bthe (sun|plant|water|electricity) wants|tries to|likes to\b/i.test(text)) pushUnique(findings, finding("Subject", "review", "Anthropomorphic explanation", "The mechanism is described through intention rather than a scientific process.", "Name the physical or biological process directly."));
  }

  function historyChecks(parsed, findings) {
    const text = allText(parsed);
    const quotes = [...String(text).matchAll(/[“\"]([^”\"]{8,220})[”\"]/g)];
    const sources = sectionItems(parsed, "sources").map(itemText).filter(Boolean);
    if (quotes.length && !sources.length) pushUnique(findings, finding("Subject", "do-not-use", "Quotation has no provenance", "This appears to be presented as a historical quotation, but no source information was provided.", "Confirm an authentic source, label it as paraphrase, or mark it clearly as fictional reconstruction.", { validation: "source" }));
    if (/\b(is|was) (this )?source (reliable|unreliable)|\bbiased source\b/i.test(text)) pushUnique(findings, finding("Subject", "review", "Simplistic source judgement", "Reliable/unreliable or biased/unbiased language may detach usefulness from the enquiry.", "Ask about origin, purpose, context, usefulness and limitation for the specific question."));
    if (/\bfirst[- ]hand (source|account).*always|primary source.*always/i.test(text)) pushUnique(findings, finding("Subject", "important", "Source hierarchy misconception", "The content implies that primary or first-hand material is automatically superior.", "Judge what the source can reveal for this enquiry and what requires corroboration."));
    if (/\bpeople in (ancient|medieval|victorian).*all\b/i.test(text)) pushUnique(findings, finding("Subject", "review", "Universal historical claim", "The wording may flatten diversity within a period or society.", "Narrow the claim by place, group, date and evidence."));
  }

  function geographyChecks(parsed, findings) {
    const text = allText(parsed);
    if (/\bafrica is a country|\bengland is (the same as|another name for) (britain|the uk)/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Incorrect place relationship", "The returned geography contains an incorrect place classification.", "Correct the country, continent and UK relationships before use."));
    if (/\bweather (is|means) climate|\bclimate (is|means) today's weather/i.test(text)) pushUnique(findings, finding("Subject", "important", "Weather and climate are confused", "Short-term atmospheric conditions and longer-term patterns are treated as identical.", "Distinguish timescale and evidence."));
    if (/\bpoor countries?|\bthird world|\bprimitive (people|places)|\bbackward countr/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Deficit description of place", "The wording uses a simplistic or demeaning description of a place or population.", "Use located, dated evidence and describe specific processes or indicators."));
    if (/\bmap\b/i.test(text) && !/key|legend|north|scale|schematic/i.test(text) && sectionText(parsed, "diagram-spec")) pushUnique(findings, finding("Subject", "review", "Map specification lacks orientation information", "The proposed map-like diagram does not mention a key, orientation, scale or schematic status.", "Add the features needed for the intended geographical use."));
    if (/\b(current population|latest population|today's population|current gdp)\b/i.test(text) && !sectionItems(parsed, "sources").length) pushUnique(findings, finding("Subject", "important", "Changeable statistic has no source date", "A current geographical statistic needs a named source and date.", "Add source, publication date and retrieval date.", { validation: "source" }));
  }

  function computingChecks(parsed, findings) {
    const text = allText(parsed);
    if (/\ban algorithm is (computer )?code|\bcode is an algorithm\b/i.test(text)) pushUnique(findings, finding("Subject", "important", "Algorithm and code are confused", "The content treats a method and one implementation as identical.", "Describe the algorithm independently, then show code as one implementation."));
    if (/\balways use (python|scratch|javascript) syntax|\buniversal syntax\b/i.test(text)) pushUnique(findings, finding("Subject", "review", "Platform-specific syntax presented as universal", "Programming language or platform conventions may be overgeneralised.", "Name the platform and separate the logical idea from its syntax."));
    if (/the bug is on line|replace .* with .* to fix/i.test(text) && /debug/i.test(text)) pushUnique(findings, finding("Subject", "important", "Debugging answer is revealed", "The task names the correction before pupils trace or test the behaviour.", "Keep expected and actual behaviour visible; remove the location or fix."));
    if (/enter your (full name|address|email|phone|password)|share your password/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Personal information request", "The computing task asks pupils to enter or share private information.", "Use fictional data and a safe decision-making scenario."));
  }

  function languagesChecks(parsed, findings, options) {
    const text = allText(parsed);
    if (!options?.targetLanguage) pushUnique(findings, finding("Subject", "important", "Target language not confirmed", "Grammar and vocabulary cannot be interpreted reliably without the language and relevant regional variant.", "Confirm the target language, regional variant and vocabulary already taught.", { validation: "teacher" }));
    if (/pronounced (like|as) [a-z]+(?:-[a-z]+){2,}|sounds exactly like the english/i.test(text)) pushUnique(findings, finding("Subject", "review", "English pronunciation approximation", "An English respelling may create inaccurate or persistent pronunciation.", "Prefer teacher or audio modelling; use a temporary aid only if deliberately requested."));
    if (/\b(native[- ]level verified|perfect translation|guaranteed fluent)\b/i.test(text)) pushUnique(findings, finding("Subject", "important", "Unsupported language certainty", "The response claims a level of linguistic verification the workflow cannot establish.", "Request fluent-speaker review and keep the status as teacher confirmation required."));
  }

  function reChecks(parsed, findings) {
    const text = allText(parsed);
    if (/\b(all|every) (christians?|muslims?|hindus?|jews?|sikhs?|buddhists?|humanists?) (believe|think|pray|worship|celebrate|wear|eat)\b/i.test(text)) pushUnique(findings, finding("Subject", "important", "Universal claim about a worldview", "The wording presents a diverse tradition or worldview as uniform.", "Narrow the claim naturally by tradition, context or lived example."));
    if (/\bmy faith teaches|as a (christian|muslim|hindu|jew|sikh|buddhist|humanist), i\b/i.test(text) && !sectionItems(parsed, "sources").length) pushUnique(findings, finding("Subject", "do-not-use", "Testimony may be invented", "First-person testimony is presented without a named, checkable source.", "Provide provenance or label the text clearly as a fictional illustrative scenario."));
    if (/\bthe best religion|rank these beliefs|which belief is correct\b/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Judgemental worldview framing", "The task asks pupils to rank beliefs or declare one worldview correct.", "Compare reasoning, interpretation or lived examples without ranking people or traditions."));
  }

  function psheChecks(parsed, findings) {
    const text = allText(parsed);
    if (/\btell (the class|your group|your partner) about (a time|your)\b/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Public personal disclosure", "The prompt may require pupils to disclose a private experience to peers.", "Use a fictional scenario and an optional private route to a trusted adult."));
    if (/\bkeep (this|it) secret from (all )?adults|never tell an adult/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Unsafe secrecy message", "The content may discourage a pupil from seeking appropriate adult help.", "Clarify the difference between a surprise and unsafe secrecy; identify trusted-adult routes."));
    if (/\bcalm down by just|\bchoose to be happy|\bnegative emotions are bad/i.test(text)) pushUnique(findings, finding("Subject", "important", "Simplistic emotional advice", "The wording may blame pupils or present one strategy as universally sufficient.", "Use proportionate strategy options and a clear help-seeking route."));
    if (/\bthis worksheet will (cure|treat|diagnose)|therapy replacement/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Therapeutic claim", "A classroom resource is presented as diagnosis or treatment.", "State the classroom learning purpose and retain school safeguarding procedures."));
  }

  function foundationChecks(subject, parsed, findings) {
    const text = allText(parsed);
    if (subject === "art" && /\ball pupils? (must|should) (copy|produce|draw).*same|success means neat/i.test(text)) pushUnique(findings, finding("Subject", "important", "Art outcome is over-prescribed", "The criteria may replace observation, experimentation and artistic choice with copying or neatness.", "Use intention, process and evidence of choice as the review lens."));
    if (subject === "music" && /\bpulse (is|means) rhythm|\brhythm (is|means) tempo|\bpitch (is|means) volume/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Musical concepts are confused", "The content conflates distinct musical elements.", "Correct the terminology through listening or performance before use."));
    if (subject === "music" && words(text).length > 500) pushUnique(findings, finding("Subject", "review", "Written activity may displace music", "The imported content is unusually text-heavy for a musical scaffold.", "Keep only what supports listening, performing, composing or rehearsal."));
    if (subject === "design-technology" && !/user|purpose/i.test(text) && /decorate|craft|make it look/i.test(text)) pushUnique(findings, finding("Subject", "important", "Decorative craft presented as DT", "The task lacks a clear user and purpose while prioritising appearance.", "Reconnect user, purpose, functional criteria, testing and improvement."));
    if (subject === "physical-education" && sectionItems(parsed, "instructions").some(item => words(itemText(item)).length > 30)) pushUnique(findings, finding("Subject", "review", "PE cue is too long", "The instruction contains too many words to use while moving.", "Keep one or two observable cues and preserve active practice time."));
    if (subject === "physical-education" && /diagnose|injury treatment|medical advice|you are overweight/i.test(text)) pushUnique(findings, finding("Subject", "do-not-use", "Unsafe PE or body language", "The content moves into medical advice or non-neutral body judgement.", "Use safe-spacing guidance and observable skill cues only."));
  }

  function sourceChecks(task, parsed, findings) {
    const text = allText(parsed);
    const sources = sectionItems(parsed, "sources").map(itemText).filter(Boolean);
    if ((task?.sourceSensitive || /quotation|primary source|according to|research shows|statistics show/i.test(text)) && !sources.length) pushUnique(findings, finding("Subject", task?.risk === "forensic" ? "important" : "review", "Source verification required", "The returned content depends on factual or source-like material but supplies no separate provenance record.", "Ask for named sources, distinguish quotation from paraphrase and check each source independently.", { validation: "source" }));
    if (sources.some(source => /example\.com|source unavailable|citation needed|insert source|https?:\/\/[^\s]+\/fake/i.test(source))) pushUnique(findings, finding("Subject", "do-not-use", "Possible invented citation", "A source entry contains placeholder or suspicious provenance.", "Do not use the claim until the source is opened and verified.", { validation: "source" }));
  }

  function verify(scaffold, parsed, options = {}) {
    const task = DATA.aiTasks.find(item => item.id === options.taskId) || DATA.aiTasks[0];
    const findings = [];
    structuralChecks(scaffold, parsed, task, findings, options);
    pedagogicalChecks(scaffold, parsed, findings);
    const metrics = languageAndInclusionChecks(scaffold, parsed, findings, options);
    questionChecks(parsed, findings);
    vocabularyChecks(parsed, findings);
    localRepresentationChecks(scaffold, findings);
    sourceChecks(task, parsed, findings);
    if (scaffold.subject === "mathematics") mathsChecks(parsed, findings);
    if (scaffold.subject === "english") englishChecks(scaffold, parsed, findings, options);
    if (scaffold.subject === "science") scienceChecks(parsed, findings);
    if (scaffold.subject === "history") historyChecks(parsed, findings);
    if (scaffold.subject === "geography") geographyChecks(parsed, findings);
    if (scaffold.subject === "computing") computingChecks(parsed, findings);
    if (scaffold.subject === "languages") languagesChecks(parsed, findings, options);
    if (scaffold.subject === "religious-education") reChecks(parsed, findings);
    if (scaffold.subject === "pshe") psheChecks(parsed, findings);
    foundationChecks(scaffold.subject, parsed, findings);

    if (!findings.some(item => item.severity !== "information")) pushUnique(findings, finding("Structural", "information", "Ready for professional review", "Local checks found no obvious structural, drift, subject-pattern, language, inclusion or print issue.", "Confirm factual accuracy and classroom fit before approval.", { validation: "local", resolved: true }));
    findings.sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity] || a.dimension.localeCompare(b.dimension));
    const blocking = findings.filter(item => item.severity === "do-not-use" && !item.resolved).length;
    const important = findings.filter(item => item.severity === "important" && !item.resolved).length;
    const review = findings.filter(item => item.severity === "review" && !item.resolved).length;
    const suggestedReview = task?.risk || "routine";
    return {
      findings,
      metrics,
      reviewLevel: options.reviewLevel || suggestedReview,
      blocking,
      important,
      review,
      canApprove: blocking === 0,
      status: blocking ? "Do not use yet" : important ? "Warnings unresolved" : "Ready for review",
      checkedAt: new Date().toISOString(),
      methodNote: "Calculations and deterministic structure are checked locally where possible. Other findings are pattern-based and require teacher judgement or source verification."
    };
  }

  function traceSimpleAlgorithm(lines, initial = {}) {
    const state = { ...initial };
    const trace = [];
    const steps = Array.isArray(lines) ? lines : String(lines || "").split(/\n+/).filter(Boolean);
    steps.slice(0, 50).forEach((raw, index) => {
      const line = raw.trim();
      let match = line.match(/^(?:SET\s+)?([A-Za-z]\w*)\s*=\s*(-?\d+(?:\.\d+)?)$/i);
      if (match) state[match[1]] = Number(match[2]);
      match = line.match(/^(ADD|SUBTRACT|MULTIPLY|DIVIDE)\s+([A-Za-z]\w*)\s+(?:BY\s+)?(-?\d+(?:\.\d+)?)$/i);
      if (match && Number.isFinite(state[match[2]])) {
        const value = Number(match[3]);
        if (match[1].toUpperCase() === "ADD") state[match[2]] += value;
        if (match[1].toUpperCase() === "SUBTRACT") state[match[2]] -= value;
        if (match[1].toUpperCase() === "MULTIPLY") state[match[2]] *= value;
        if (match[1].toUpperCase() === "DIVIDE" && value) state[match[2]] /= value;
      }
      trace.push({ step: index + 1, instruction: line, state: { ...state } });
    });
    return trace;
  }

  window.ScaffoldVerificationEngine = {
    verify,
    readingMetrics,
    evaluateExpression,
    extractEquations,
    mathematicalChecks,
    traceSimpleAlgorithm,
    severityNames,
    statusNames
  };
})();
