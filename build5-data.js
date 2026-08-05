(function () {
  "use strict";

  const DATA = window.SCAFFOLD_DATA;
  if (!DATA?.subjects || !DATA?.engines || !DATA?.printFormats) throw new Error("Build 5 requires the complete Build 4 data model.");

  const YEARS = ["EYFS", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];
  const BAND_FOR_YEAR = {
    EYFS: "eyfs",
    "Year 1": "ks1",
    "Year 2": "ks1",
    "Year 3": "lower-ks2",
    "Year 4": "lower-ks2",
    "Year 5": "upper-ks2",
    "Year 6": "upper-ks2"
  };
  const DEVELOPMENTAL_MOVE = {
    EYFS: "Begin with talk, play, first-hand experience and visible action; the scaffold should be handled or spoken before it is recorded.",
    "Year 1": "Keep the entry action concrete and singular, with precise oral language and an immediate route into the curriculum task.",
    "Year 2": "Help pupils coordinate two connected ideas while beginning to name the strategy they can later use without the scaffold.",
    "Year 3": "Bridge from concrete or oral support towards a stable representation and a short, pupil-owned checking routine.",
    "Year 4": "Make relationships and disciplinary choices visible, then remove prompts that merely repeat a now-secure routine.",
    "Year 5": "Support pupils to discriminate between plausible approaches, evidence or representations without choosing on their behalf.",
    "Year 6": "Preserve synthesis, justification and independent transfer; retain only strategic prompts that pupils can internalise quickly."
  };

  const subjectReleaseProfiles = {
    english: {
      action: "read, speak, compose and revise for meaning",
      protect: "the pupil's interpretation, language choice, composition and justification",
      misuse: "a frame that produces identical answers or writing while hiding whether meaning is understood",
      fadeEvidence: "the pupil can select evidence or language, explain the choice and sustain meaning when a prompt is covered",
      reviewQuestions: ["Does the prompt preserve interpretation or composition?", "Is decoding, fluency, comprehension, transcription or composition the actual barrier?", "Could the language frame generate a plausible answer without understanding?"],
      bandFocus: {
        eyfs: "communication, attentive listening, vocabulary in meaningful contexts, oral composition and early word reading",
        ks1: "secure word reading, fluency, comprehension, sentence construction, transcription and purposeful oral rehearsal",
        "lower-ks2": "increasing reading stamina, evidence-based comprehension, deliberate sentence choices, composition and revision",
        "upper-ks2": "independent interpretation, comparison across texts, fluent control of purpose and audience, and substantive revision"
      }
    },
    mathematics: {
      action: "notice structure, represent relationships, reason and generalise",
      protect: "the decision about mathematical structure, strategy, representation and justification",
      misuse: "an operation cue, completed model or keyword rule that allows an answer without mathematical reasoning",
      fadeEvidence: "the pupil selects a fitting representation or strategy and checks the relationship without an adult cue",
      reviewQuestions: ["Does every representation match the values and operation structure?", "Is the support revealing a relationship rather than naming the procedure?", "Would the question still require the intended reasoning if the scaffold were removed?"],
      bandFocus: {
        eyfs: "deep number sense to ten, subitising, comparison, composition and spatial relationships through objects and talk",
        ks1: "place value, additive and multiplicative structures, fractions of wholes, measure and spatial reasoning",
        "lower-ks2": "larger-number structure, efficient calculation, multiplicative reasoning, equivalence, measure and geometry",
        "upper-ks2": "proportional and algebraic relationships, fractions-decimals-percentages, generalisation and multi-step reasoning"
      }
    },
    science: {
      action: "observe, enquire, interpret evidence and explain mechanisms",
      protect: "the distinction between observation and inference, the enquiry decision and the evidence-to-explanation connection",
      misuse: "a generic fair-test sheet or supplied conclusion that replaces scientific enquiry and reasoning",
      fadeEvidence: "the pupil chooses what to observe or measure and forms a proportionate conclusion from the available evidence",
      reviewQuestions: ["Is the enquiry type appropriate to the question?", "Are observations, results, inferences and conclusions kept distinct?", "Does a simplified diagram preserve the scientific mechanism?"],
      bandFocus: {
        eyfs: "curious observation of the natural world, talk about similarity, difference, pattern and change",
        ks1: "identification, classification, close observation, simple comparison and questions grounded in experience",
        "lower-ks2": "systematic enquiry, measurement, pattern seeking and increasingly causal scientific explanation",
        "upper-ks2": "control and evaluation of enquiry, interpretation of data, competing explanations and accurate mechanisms"
      }
    },
    history: {
      action: "situate evidence, construct accounts and test interpretations",
      protect: "chronological reasoning, evidential inference and the pupil's historical explanation",
      misuse: "source boxes that ask only whether evidence is reliable or that present reconstruction as authentic testimony",
      fadeEvidence: "the pupil locates a claim in time and context, uses provenance and evidence, and qualifies an interpretation independently",
      reviewQuestions: ["Is every quotation or source-like item labelled with honest provenance?", "Does the prompt use period knowledge as well as source detail?", "Are origin, purpose, context, usefulness and limitation connected to the enquiry?"],
      bandFocus: {
        eyfs: "language of past and present, personal and familiar chronology, and interpretation through stories, objects and images",
        ks1: "sequence, duration and change within and beyond living memory using carefully contextualised sources",
        "lower-ks2": "chronology across periods, cause and consequence, similarity and difference, and evidence-based accounts",
        "upper-ks2": "interacting causes, change and continuity, significance, source provenance and contrasting interpretations"
      }
    },
    geography: {
      action: "locate, observe, compare and explain across scale",
      protect: "the pupil's spatial decision, use of located evidence and explanation of geographical process",
      misuse: "a decorative map, decontextualised fact file or comparison that stereotypes whole places",
      fadeEvidence: "the pupil chooses appropriate map or fieldwork evidence and connects place, scale and process without a template",
      reviewQuestions: ["Are scale, location and date clear?", "Does the map need a key, orientation, grid or explicit schematic label?", "Is the comparison based on located evidence rather than a whole-country generalisation?"],
      bandFocus: {
        eyfs: "immediate environments, observation, simple maps, routes and respectful comparison of familiar and contrasting places",
        ks1: "locational frameworks, seasonal patterns, field observation, map symbols and comparison at an appropriate scale",
        "lower-ks2": "regional and global location, physical and human processes, fieldwork evidence and map conventions",
        "upper-ks2": "interdependence, change over time, scale-sensitive explanation, data interpretation and critical place comparison"
      }
    },
    computing: {
      action: "decompose, specify, trace, test and improve",
      protect: "the algorithmic decision, prediction, diagnosis and test selected by the pupil",
      misuse: "platform syntax presented as universal or a debugging scaffold that reveals the fault and correction",
      fadeEvidence: "the pupil can predict or trace state, choose a useful test and explain the observed behaviour",
      reviewQuestions: ["Are algorithm, program and code distinguished?", "Can every trace-table value be followed consistently?", "Does the online-safety scenario require a reasoned decision without personal disclosure?"],
      bandFocus: {
        eyfs: "precise sequencing, pattern, cause and effect, and purposeful exploration of digital and non-digital systems",
        ks1: "algorithms, simple programs, logical prediction, debugging and purposeful creation of digital content",
        "lower-ks2": "sequence, repetition, input and output, decomposition, networks and responsible information use",
        "upper-ks2": "selection, variables, increasingly complex state, systematic testing, data handling and critical digital judgement"
      }
    },
    art: {
      action: "look closely, experiment, make and reflect",
      protect: "the pupil's observation, material exploration, intention and artistic choice",
      misuse: "success reduced to neat copying or every pupil producing an identical outcome",
      fadeEvidence: "the pupil independently selects and adapts materials, processes or visual qualities for an intention",
      reviewQuestions: ["Do the criteria allow more than one successful artistic response?", "Is the scaffold supporting looking and making rather than replacing them with writing?", "Are artist references contextualised without prescribing imitation?"],
      bandFocus: {
        eyfs: "sensory exploration, noticing, mark-making and talk about choices in open-ended creation",
        ks1: "purposeful use of line, shape, colour, texture and materials through observation and experimentation",
        "lower-ks2": "developed techniques, visual research, comparison of artistic decisions and iterative making",
        "upper-ks2": "sustained intention, critical selection and refinement of media, process and visual language"
      }
    },
    "design-technology": {
      action: "identify a user, design, make, test and improve",
      protect: "the pupil's functional design decisions in relation to user, purpose and criteria",
      misuse: "decorative craft steps presented as design and technology or criteria that pre-decide the solution",
      fadeEvidence: "the pupil refers to user and purpose while selecting, testing and improving a workable solution",
      reviewQuestions: ["Are user, purpose and functional criteria explicit?", "Does testing generate information that can change the design?", "Are tools, materials and food processes described safely and age-appropriately?"],
      bandFocus: {
        eyfs: "purposeful construction, material exploration, joining, adapting and talking about who an object is for",
        ks1: "simple users and purposes, mechanisms or structures, practical making, testing and improvement",
        "lower-ks2": "research-informed criteria, purposeful mechanisms, structures, textiles or food, and iterative evaluation",
        "upper-ks2": "trade-offs between criteria, increasingly precise making, systems thinking and evidence-led refinement"
      }
    },
    music: {
      action: "listen, perform, improvise, compose and refine through sound",
      protect: "the pupil's aural attention, musical response and expressive or structural choice",
      misuse: "a written worksheet that displaces listening, singing, playing or composing",
      fadeEvidence: "the pupil hears and controls the intended musical element without relying on a written cue",
      reviewQuestions: ["Are pulse, rhythm, tempo, pitch, dynamics, timbre, texture and structure distinguished?", "Does written support lead quickly back into sound?", "Can pupils hear or perform the quality named in the criteria?"],
      bandFocus: {
        eyfs: "attentive listening, singing, pulse, movement, sound exploration and playful musical response",
        ks1: "steady pulse, rhythmic and melodic patterns, singing, tuned and untuned performance, and simple composition",
        "lower-ks2": "increasing rhythmic and melodic accuracy, ensemble awareness, notation as support and purposeful composition",
        "upper-ks2": "musical structure, texture and expression, sustained ensemble control, notation and iterative composition"
      }
    },
    "physical-education": {
      action: "perceive, move, adapt and reflect in action",
      protect: "the pupil's movement decision, embodied practice and tactical response",
      misuse: "long written instructions, too many cues or body judgement that reduces active participation",
      fadeEvidence: "the pupil adjusts movement or tactic from what they perceive, using no more than one self-chosen cue",
      reviewQuestions: ["Can the cue be used while moving?", "Are spacing, equipment and participation routes safe and inclusive?", "Does reflection return pupils to another attempt quickly?"],
      bandFocus: {
        eyfs: "fundamental movement, spatial awareness, coordination, confidence and safe active exploration",
        ks1: "agility, balance, coordination, simple sequences, cooperation and elementary tactical choices",
        "lower-ks2": "controlled movement combinations, performance feedback, game principles and increasingly sustained activity",
        "upper-ks2": "adaptation under pressure, tactical decision-making, refined performance, leadership and evaluation"
      }
    },
    languages: {
      action: "listen, notice patterns, interact and create meaning in the target language",
      protect: "the pupil's retrieval, grammatical choice, comprehension and spontaneous response",
      misuse: "English phonetic respelling, unverified translation or a substitution grid that removes all language choice",
      fadeEvidence: "the pupil retrieves and adapts a taught pattern for a new meaning without reading a complete frame",
      reviewQuestions: ["Are target language, regional variant and taught vocabulary confirmed?", "Has grammar or translation been reviewed by a fluent speaker where needed?", "Does the scaffold move from supported pattern to meaningful communication?"],
      bandFocus: {
        eyfs: "optional playful encounter with songs, sounds and greetings; do not present this as statutory language progression",
        ks1: "optional school enrichment through listening, sound play and brief interaction; languages become statutory at Key Stage 2",
        "lower-ks2": "accurate sound-spelling links, high-frequency vocabulary, questions and answers, sentence patterns and cultural context",
        "upper-ks2": "broader retrieval, grammatical manipulation, reading and writing connected text, and increasingly spontaneous interaction"
      }
    },
    "religious-education": {
      action: "build contextual knowledge, interpret and reason about religion and worldviews",
      protect: "the pupil's use of contextual evidence, recognition of diversity and reasoned response",
      misuse: "universal claims, invented testimony or a generic progression that ignores the locally applicable syllabus",
      fadeEvidence: "the pupil uses precise contextual language and evidence to compare interpretations without speaking for a whole tradition",
      reviewQuestions: ["Does this follow the school's applicable syllabus?", "Are belief, practice, text, history and lived experience distinguished?", "Is testimony authentic and sourced, or clearly labelled as reconstruction?"],
      bandFocus: {
        eyfs: "encounter carefully chosen stories, objects, celebrations and lived examples through the locally planned curriculum",
        ks1: "secure contextual examples, simple comparison and precise language about belief, practice and lived experience",
        "lower-ks2": "substantive knowledge across traditions and non-religious worldviews, interpretation and internal diversity",
        "upper-ks2": "more complex texts, practices and lived positions, contrasting interpretations and well-supported personal reasoning"
      }
    },
    pshe: {
      action: "interpret neutral scenarios, make safe decisions and identify routes to help",
      protect: "the pupil's reasoned choice without requiring personal or public disclosure",
      misuse: "therapeutic claims, shame-based advice, unsafe secrecy or prompts that expose private experience",
      fadeEvidence: "the pupil applies a safe principle to a new fictional scenario and can identify an appropriate help-seeking route",
      reviewQuestions: ["Can the learning be explored through a fictional scenario?", "Is the language free from diagnosis, shame and assumptions about family or identity?", "Does the resource align with school policy, safeguarding procedures and statutory guidance in force?"],
      bandFocus: {
        eyfs: "self-regulation, relationships, health routines, boundaries and trusted-adult help through safe, concrete situations",
        ks1: "friendship, respect, emotions, health, privacy, online and offline safety, and clear routes to trusted adults",
        "lower-ks2": "more complex relationships and digital situations, physical and emotional health choices, consent and help-seeking",
        "upper-ks2": "increasingly nuanced relationships, puberty and health knowledge, media influence, risk appraisal and responsible help-seeking"
      }
    }
  };

  const printModes = [
    { id: "full-colour", name: "Full colour", note: "Deep indigo, sage and muted accents retain the complete hierarchy." },
    { id: "soft-classroom", name: "Soft classroom colour", note: "Reduced saturation with quiet fills for everyday classroom printing." },
    { id: "pastel-classroom", name: "Pastel classroom colour", note: "Pale indigo, sage and warm-neutral grouping with dark readable text." },
    { id: "greyscale", name: "Greyscale", note: "Tonal grouping is rebuilt without relying on hue." },
    { id: "black-white", name: "Pure black and white", note: "White backgrounds, black type and structural line patterns only." },
    { id: "high-contrast", name: "High contrast", note: "Strong edges and maximum text contrast for access and display." },
    { id: "ink-saver", name: "Ink saver", note: "Removes decorative fills while preserving grouping, labels and writing space." }
  ];

  const formatRules = {
    workpage: { purpose: "sustained pupil thinking and recording", safePaper: ["a4", "a5"], preferredOrientation: "portrait", densityLimit: "calm", requiresWritingSpace: true },
    "laminated-card": { purpose: "reusable guided prompt and self-check", safePaper: ["a4", "a5"], preferredOrientation: "landscape", densityLimit: "spacious", requiresWritingSpace: false },
    "desk-strip": { purpose: "one removable prompt beside an existing task", safePaper: ["a4"], preferredOrientation: "portrait", densityLimit: "sparse", requiresWritingSpace: false, cuttable: true },
    "table-card": { purpose: "shared prompts for collaborative talk", safePaper: ["a4"], preferredOrientation: "landscape", densityLimit: "calm", requiresWritingSpace: false },
    "mini-card": { purpose: "small personal prompt selected for one barrier", safePaper: ["a4", "a5"], preferredOrientation: "portrait", densityLimit: "sparse", requiresWritingSpace: false, cuttable: true },
    "vocabulary-card": { purpose: "small subject-vocabulary cards with concise meaning and contextual use", safePaper: ["a4", "a5"], preferredOrientation: "portrait", densityLimit: "sparse", requiresWritingSpace: false, cuttable: true },
    "teacher-card": { purpose: "concise teacher questions, noticing and fade decisions", safePaper: ["a4", "a5"], preferredOrientation: "portrait", densityLimit: "calm", requiresWritingSpace: false },
    "discussion-card": { purpose: "paired rehearsal, probing and refinement", safePaper: ["a4", "a5"], preferredOrientation: "landscape", densityLimit: "calm", requiresWritingSpace: false },
    "group-sheet": { purpose: "shared disciplinary roles and a collective conclusion", safePaper: ["a4"], preferredOrientation: "landscape", densityLimit: "calm", requiresWritingSpace: true },
    "display-poster": { purpose: "high-visibility classroom reference", safePaper: ["a4"], preferredOrientation: "portrait", densityLimit: "sparse", requiresWritingSpace: false },
    foldable: { purpose: "folded reference that physically hides support as it fades", safePaper: ["a4"], preferredOrientation: "landscape", densityLimit: "sparse", requiresWritingSpace: true, cuttable: true },
    "a5-sheet": { purpose: "compact individual access without reduced text legibility", safePaper: ["a5"], preferredOrientation: "portrait", densityLimit: "sparse", requiresWritingSpace: true },
    "cut-cards": { purpose: "selectable prompts rather than a full visible scaffold", safePaper: ["a4"], preferredOrientation: "portrait", densityLimit: "sparse", requiresWritingSpace: false, cuttable: true },
    "mini-booklet": { purpose: "sequenced support with a deliberate final fade page", safePaper: ["a4"], preferredOrientation: "landscape", densityLimit: "sparse", requiresWritingSpace: true, recommendsDuplex: true },
    "modelling-page": { purpose: "teacher think-aloud and one modelled decision", safePaper: ["a4"], preferredOrientation: "landscape", densityLimit: "sparse", requiresWritingSpace: false },
    "presentation-board": { purpose: "large classroom display for live teaching", safePaper: ["a4"], preferredOrientation: "landscape", densityLimit: "sparse", requiresWritingSpace: false },
    "intervention-pack": { purpose: "short teach-use-check-reduce cycle", safePaper: ["a4"], preferredOrientation: "portrait", densityLimit: "calm", requiresWritingSpace: true },
    "home-support": { purpose: "pupil prompt plus restrained adult guidance", safePaper: ["a4"], preferredOrientation: "portrait", densityLimit: "calm", requiresWritingSpace: true },
    "mixed-pack": { purpose: "one objective across discreetly coded support stages", safePaper: ["a4", "a5"], preferredOrientation: "portrait", densityLimit: "calm", requiresWritingSpace: true }
  };

  const familyRemoval = {
    knowledge: "Remove the completed example before removing the cue to retrieve relevant knowledge.",
    vocabulary: "Reduce the word set, then remove definitions while retaining only a pupil-selected keyword if needed.",
    representation: "Hide labels or a completed element before removing the representation itself.",
    planning: "Remove intermediate steps, then retain only the pupil's own starting question.",
    reasoning: "Remove sentence structures before removing the evidence or checking question.",
    recording: "Reduce the organiser while preserving the expected subject response.",
    communication: "Remove role or language cues as talk becomes independently responsive.",
    memory: "Replace external reminders with one pupil-owned retrieval or checking cue.",
    attention: "Widen the visual field once the pupil can identify the relevant information independently.",
    metacognition: "Remove adult-authored monitoring questions after the pupil names an effective self-prompt.",
    knowledgeOrganisation: "Remove categories or headings once the pupil can organise the material independently."
  };

  const curriculumAdditions = {
    mathematics: [
      { title: "Statistics", years: ["Year 2"], objectives: ["Interpret and construct simple pictograms, tally charts, block diagrams and tables", "Ask and answer comparison and total questions using categorical data"], vocabulary: ["data", "tally", "category", "total", "difference"], misconceptions: ["A taller picture always means more even when the key changes", "A tally group of five is five separate categories"], barriers: ["representation", "reasoning", "vocabulary"], profileId: "geometry" },
      { title: "Statistics", years: ["Year 3", "Year 4"], objectives: ["Interpret and present data using bar charts, pictograms and tables", "Solve comparison, sum and difference problems using discrete and continuous data", "Interpret and present discrete and continuous data using appropriate graphical methods"], vocabulary: ["axis", "scale", "interval", "frequency", "continuous"], misconceptions: ["Every graph interval must represent one", "A line graph is suitable for unrelated categories"], barriers: ["representation", "reasoning", "self-monitoring"], profileId: "geometry" },
      { title: "Statistics", years: ["Year 5", "Year 6"], objectives: ["Complete, read and interpret information in tables including timetables", "Interpret and construct pie charts and line graphs", "Calculate and interpret the mean as an average"], vocabulary: ["timetable", "line graph", "pie chart", "proportion", "mean"], misconceptions: ["The mean must be one of the original values", "A steeper line always means a larger total"], barriers: ["representation", "reasoning", "knowledge"], profileId: "geometry" },
      { title: "Ratio and proportion", years: ["Year 6"], objectives: ["Solve problems involving relative sizes where missing values can be found using multiplication and division facts", "Solve problems involving unequal sharing and grouping using knowledge of fractions and multiples"], vocabulary: ["ratio", "proportion", "scale factor", "for every", "multiplicative"], misconceptions: ["Equivalent ratios are created by adding the same amount", "Ratio compares only a part with a whole"], barriers: ["conceptual", "representation", "reasoning"], profileId: "multiplicative" },
      { title: "Algebra", years: ["Year 6"], objectives: ["Use simple formulae and generate linear number sequences", "Express missing-number problems algebraically", "Find pairs of numbers that satisfy an equation with two unknowns"], vocabulary: ["variable", "expression", "equation", "formula", "sequence"], misconceptions: ["A letter always stands for one fixed unknown in every context", "The equals sign means calculate what comes next"], barriers: ["conceptual", "representation", "reasoning"], profileId: "number" }
    ],
    science: [
      { title: "Seasonal change", years: ["Year 1"], objectives: ["Observe changes across the four seasons", "Observe and describe weather associated with the seasons and how day length varies"], vocabulary: ["season", "weather", "daylight", "observe", "pattern"], misconceptions: ["Seasons are caused by the Earth moving nearer to the Sun", "Every day in one season has the same weather"], barriers: ["attention", "vocabulary", "reasoning"], profileId: "observation" },
      { title: "Living things and habitats", years: ["Year 2"], objectives: ["Explore and compare the differences between things that are living, dead and have never been alive", "Identify that most living things live in habitats to which they are suited", "Describe how animals obtain food from plants and other animals using a simple food chain"], vocabulary: ["living", "dead", "habitat", "microhabitat", "food chain"], misconceptions: ["Anything that moves is alive", "A habitat is only the place where an animal sleeps"], barriers: ["knowledge", "conceptual", "organisation"], profileId: "observation" },
      { title: "Living things and habitats", years: ["Year 4"], objectives: ["Recognise that living things can be grouped in a variety of ways", "Explore and use classification keys to group, identify and name living things", "Recognise that environments can change and that this can pose dangers to living things"], vocabulary: ["classification", "classification key", "characteristic", "environment", "organism"], misconceptions: ["There is only one correct way to group living things", "Classification groups are chosen only by appearance"], barriers: ["knowledge", "conceptual", "organisation"], profileId: "observation" },
      { title: "Living things and habitats", years: ["Year 5"], objectives: ["Describe the differences in the life cycles of a mammal, an amphibian, an insect and a bird", "Describe the life process of reproduction in some plants and animals"], vocabulary: ["life cycle", "reproduction", "metamorphosis", "mammal", "amphibian"], misconceptions: ["Every animal has the same life-cycle stages", "All plants reproduce using seeds"], barriers: ["knowledge", "conceptual", "organisation"], profileId: "observation" },
      { title: "Living things and habitats", years: ["Year 6"], objectives: ["Describe how living things are classified into broad groups according to common observable characteristics", "Give reasons for classifying plants and animals based on specific characteristics"], vocabulary: ["classification", "vertebrate", "invertebrate", "micro-organism", "characteristic"], misconceptions: ["Micro-organisms are all harmful", "Classification is based on one visible feature"], barriers: ["knowledge", "conceptual", "organisation"], profileId: "observation" },
      { title: "Rocks and soils", years: ["Year 3"], objectives: ["Compare and group rocks by appearance and simple physical properties", "Describe simply how fossils are formed", "Recognise that soils are made from rocks and organic matter"], vocabulary: ["rock", "mineral", "fossil", "permeable", "soil"], misconceptions: ["All rocks are equally hard", "Fossils are bones placed inside rocks"], barriers: ["knowledge", "vocabulary", "conceptual"], profileId: "explanation" },
      { title: "Electricity", years: ["Year 4"], objectives: ["Identify common appliances that run on electricity", "Construct a simple series electrical circuit and identify its basic components", "Recognise whether a lamp will light in a simple series circuit and recognise that a switch opens and closes a circuit", "Recognise common conductors and insulators"], vocabulary: ["circuit", "component", "cell", "switch", "conductor"], misconceptions: ["A battery sends electricity from only one terminal", "Any gap in a circuit can be bridged by any material"], barriers: ["conceptual", "representation", "reasoning"], profileId: "explanation" },
      { title: "Electricity", years: ["Year 6"], objectives: ["Associate the brightness of a lamp or volume of a buzzer with the number and voltage of cells used in a circuit", "Compare and give reasons for variations in how components function", "Use recognised symbols when representing a simple circuit in a diagram"], vocabulary: ["voltage", "cell", "component", "circuit symbol", "current"], misconceptions: ["Current is used up by each component", "Adding cells always improves every circuit"], barriers: ["conceptual", "representation", "reasoning"], profileId: "explanation" },
      { title: "Earth and space", years: ["Year 5"], objectives: ["Describe the movement of the Earth and other planets relative to the Sun", "Use the Earth's rotation to explain day and night"], vocabulary: ["orbit", "rotation", "axis", "planet", "solar system"], misconceptions: ["The Sun travels around the Earth each day", "The Moon produces its own light"], barriers: ["conceptual", "representation", "vocabulary"], profileId: "explanation" },
      { title: "Evolution and inheritance", years: ["Year 6"], objectives: ["Recognise that living things have changed over time and fossils provide information about earlier life", "Recognise that offspring vary and that adaptation may lead to evolution"], vocabulary: ["inheritance", "variation", "adaptation", "evolution", "fossil"], misconceptions: ["Individual organisms choose adaptations they need", "Evolution always means becoming stronger or better"], barriers: ["conceptual", "chronology", "explanation"], profileId: "explanation" }
    ],
    history: [
      { title: "Significant people, events and places", years: ["Year 1", "Year 2"], objectives: ["Use evidence to study significant individuals who contributed to achievement", "Study significant historical events, people and places in the locality"], vocabulary: ["significant", "achievement", "source", "locality", "legacy"], misconceptions: ["Significant means famous to everyone", "One heroic person causes historical change alone"], barriers: ["knowledge", "reasoning", "chronology"], profileId: "causation" },
      { title: "Britain from Stone Age to Iron Age", years: ["Year 3", "Year 4"], objectives: ["Develop chronologically secure knowledge of changes in Britain from the Stone Age to the Iron Age", "Use archaeological evidence to explain settlement, technology and belief"], vocabulary: ["prehistory", "archaeology", "settlement", "technology", "continuity"], misconceptions: ["Everyone changed from hunter-gathering to farming at once", "No written sources means nothing can be known"], barriers: ["chronology", "knowledge", "reasoning"], profileId: "chronology" },
      { title: "Roman Britain", years: ["Year 3", "Year 4"], objectives: ["Explain the impact of the Roman Empire on Britain using period knowledge and evidence", "Examine resistance, settlement and change without treating impact as uniform"], vocabulary: ["empire", "invasion", "resistance", "province", "legacy"], misconceptions: ["Rome conquered all of Britain immediately", "Roman impact was identical everywhere"], barriers: ["chronology", "reasoning", "knowledge"], profileId: "causation" },
      { title: "Ancient civilisations and ancient Greece", years: ["Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Study the achievements of an early civilisation in depth", "Study ancient Greek life, achievements and influence using contextualised evidence"], vocabulary: ["civilisation", "society", "government", "evidence", "legacy"], misconceptions: ["Ancient civilisations existed at separate times", "All people in ancient Greece experienced society in the same way"], barriers: ["chronology", "comparison", "reasoning"], profileId: "evidence" },
      { title: "Non-European society study", years: ["Year 5", "Year 6"], objectives: ["Study a non-European society that provides contrasts with British history", "Use secure contextual knowledge rather than deficit comparison"], vocabulary: ["society", "region", "trade", "power", "interpretation"], misconceptions: ["A whole continent shares one history", "Comparison requires deciding which society was more advanced"], barriers: ["knowledge", "comparison", "reasoning"], profileId: "evidence" }
    ]
  };

  Object.entries(curriculumAdditions).forEach(([subjectId, entries]) => {
    const subject = DATA.subjects.find(item => item.id === subjectId);
    if (!subject) return;
    entries.forEach(entry => {
      const signature = `${entry.title}|${entry.years.join("|")}`;
      if (!subject.entries.some(existing => `${existing.title}|${(existing.years || []).join("|")}` === signature)) subject.entries.push(entry);
    });
  });

  const profileByTitle = {
    english: {
      "communication and language": "oracy",
      "reading comprehension": "reading",
      "reading fluency": "fluency",
      "spelling and morphology": "spelling",
      "grammar and punctuation": "grammar",
      "handwriting and transcription": "handwriting",
      "vocabulary and oracy": "vocabulary",
      "sentence construction": "grammar",
      composition: "composition",
      "editing and revision": "editing"
    },
    mathematics: {
      "number foundations": "number",
      "place value": "number",
      "addition and subtraction": "additive",
      "multiplication and division": "multiplicative",
      fractions: "fractions",
      "fractions, decimals and percentages": "fractions",
      "geometry and measure": "geometry",
      statistics: "geometry",
      "ratio and proportion": "multiplicative",
      algebra: "number"
    },
    science: {
      "understanding the world": "observation",
      plants: "observation",
      "animals including humans": "observation",
      "everyday materials": "observation",
      "uses of everyday materials": "explanation",
      "states of matter": "explanation",
      "properties and changes of materials": "explanation",
      "forces and magnets": "explanation",
      forces: "explanation",
      light: "explanation",
      sound: "explanation",
      "working scientifically": "enquiry",
      "seasonal change": "observation",
      "living things and habitats": "observation",
      "rocks and soils": "explanation",
      electricity: "explanation",
      "earth and space": "explanation",
      "evolution and inheritance": "explanation"
    },
    history: {
      "past and present": "chronology",
      "changes within living memory": "chronology",
      "ancient britain": "chronology",
      "britain after rome": "causation",
      "historical enquiry": "evidence"
    },
    geography: {
      "people, culture and communities": "place",
      "locational knowledge": "maps",
      "place knowledge": "place",
      "human and physical geography": "process",
      "geographical skills and fieldwork": "fieldwork"
    },
    computing: {
      "computational thinking": "algorithms",
      programming: "algorithms",
      "information technology": "data",
      "computer systems and networks": "systems"
    },
    art: {
      "drawing and observation": "looking",
      "colour, paint and surface": "making",
      "sculpture, textiles and materials": "making",
      "artists and creative connections": "looking"
    },
    "design-technology": {
      "user, purpose and design criteria": "design",
      "structures and mechanisms": "making",
      "materials and manufacture": "making",
      "test, evaluate and improve": "making"
    },
    music: {
      "pulse, rhythm and metre": "perform",
      "pitch, melody and notation": "perform",
      "listening and appraisal": "perform",
      "composition and performance": "compose"
    },
    "physical-education": {
      "fundamental movement and skill": "movement",
      "games and tactical decision-making": "tactics",
      "dance and gymnastics": "movement",
      "health, fitness and safe participation": "movement"
    },
    languages: {
      "sounds and spelling": "language",
      "vocabulary and retrieval": "language",
      "sentence building and grammar": "language",
      "interaction and culture": "language"
    },
    "religious-education": {
      "belief, practice and identity": "worldviews",
      "texts, artefacts and interpretation": "worldviews",
      "questions, reasons and lived experience": "worldviews"
    },
    pshe: {
      "relationships and communication": "relationships",
      "health, emotions and strategies": "relationships",
      "online safety and decisions": "relationships",
      "goals and transition": "relationships"
    }
  };

  const defaultProfileBySubject = {
    english: "reading", mathematics: "number", science: "explanation", history: "evidence", geography: "place",
    computing: "algorithms", art: "looking", "design-technology": "design", music: "perform",
    "physical-education": "movement", languages: "language", "religious-education": "worldviews", pshe: "relationships"
  };

  const titleKey = title => String(title || "").trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ");

  function resolveProfile(subjectId, entry) {
    const valid = new Set((DATA.subjectBrains?.[subjectId]?.profiles || []).map(profile => profile.id));
    if (valid.has(entry.profileId)) return { id: entry.profileId, route: "declared", reviewRequired: false };
    const mapped = profileByTitle[subjectId]?.[titleKey(entry.title)];
    if (valid.has(mapped)) return { id: mapped, route: "bundled-title", reviewRequired: false };
    const fallback = valid.has(defaultProfileBySubject[subjectId]) ? defaultProfileBySubject[subjectId] : [...valid][0] || "";
    return { id: fallback, route: "fallback-review", reviewRequired: true };
  }

  const KEY_STAGE_2_YEARS = new Set(["Year 3", "Year 4", "Year 5", "Year 6"]);
  const CORE_YEAR_SUBJECTS = new Set(["english", "mathematics", "science"]);

  function sourceVersionFor(subjectId, year) {
    if (subjectId === "languages" && !KEY_STAGE_2_YEARS.has(year)) return "School curriculum · locally selected language enrichment";
    if (subjectId === "religious-education") return "Locally applicable agreed or trust RE syllabus";
    if (subjectId === "pshe" && year === "EYFS") return "EYFS statutory framework · personal, social and emotional development";
    if (subjectId === "pshe") return "Current RSHE guidance to 31 August 2026 · revised guidance from 1 September 2026";
    if (year === "EYFS") return "Current EYFS framework to 31 August 2026 · revised framework from 1 September 2026";
    return "National curriculum in England · primary";
  }

  function curriculumStatusFor(subjectId, year) {
    if (subjectId === "languages" && !KEY_STAGE_2_YEARS.has(year)) return "school enrichment · locally sequenced";
    if (subjectId === "religious-education") return "locally determined statutory provision";
    if (subjectId === "pshe" && year === "EYFS") return "early-years statutory framework context";
    if (subjectId === "pshe") return "statutory guidance · school-sequenced progression";
    if (year === "EYFS") return "early-years statutory framework context";
    if (CORE_YEAR_SUBJECTS.has(subjectId)) return "national curriculum · selected year or phase context";
    return `national curriculum · ${["Year 1", "Year 2"].includes(year) ? "key stage 1" : "key stage 2"} content with local sequencing`;
  }

  function developmentalFocusFor(subjectId, year) {
    const release = subjectReleaseProfiles[subjectId];
    return release ? `${release.bandFocus[BAND_FOR_YEAR[year]]}. ${DEVELOPMENTAL_MOVE[year]}` : "";
  }

  DATA.subjects.forEach(subject => {
    subject.entries = (subject.entries || []).map(entry => {
      const profile = resolveProfile(subject.id, entry);
      const years = Array.isArray(entry.years) ? entry.years : [];
      const sourceVersionByYear = Object.fromEntries(years.map(year => [year, sourceVersionFor(subject.id, year)]));
      const statusByYear = Object.fromEntries(years.map(year => [year, curriculumStatusFor(subject.id, year)]));
      const curriculumByYear = Object.fromEntries(years.map(year => [year, {
        status: statusByYear[year],
        sourceVersion: sourceVersionByYear[year],
        developmentalFocus: developmentalFocusFor(subject.id, year),
        profileId: profile.id,
        profileReviewRequired: profile.reviewRequired,
        objectives: [...(entry.objectives || [])]
      }]));
      const objectiveYears = subject.id === "science"
        ? Object.fromEntries((entry.objectives || []).map(objective => [objective, [...years]]))
        : entry.objectiveYears;
      return {
        ...entry,
        profileId: profile.id,
        profileRouting: profile.route,
        profileReviewRequired: profile.reviewRequired,
        ...(objectiveYears ? { objectiveYears } : {}),
        sourceVersionByYear,
        sourceVersion: [...new Set(Object.values(sourceVersionByYear))].join(" / "),
        statusByYear,
        curriculumByYear
      };
    });
  });

  DATA.subjects.forEach(subject => {
    const release = subjectReleaseProfiles[subject.id];
    if (!release) return;
    subject.release = {
      ...release,
      yearFocus: Object.fromEntries(YEARS.map(year => [year, `${release.bandFocus[BAND_FOR_YEAR[year]]}. ${DEVELOPMENTAL_MOVE[year]}`])),
      statusByYear: Object.fromEntries(YEARS.map(year => [year, curriculumStatusFor(subject.id, year)])),
      sourceVersionByYear: Object.fromEntries(YEARS.map(year => [year, sourceVersionFor(subject.id, year)]))
    };
  });

  DATA.curriculumMetadataFor = (subjectId, entryOrTitle, year) => {
    const subject = DATA.subjects.find(item => item.id === subjectId);
    const entry = entryOrTitle && typeof entryOrTitle === "object"
      ? entryOrTitle
      : subject?.entries?.find(item => item.title === entryOrTitle && (item.years || []).includes(year));
    const selected = entry?.curriculumByYear?.[year];
    if (!subject || !entry || !selected) {
      return {
        mapped: false,
        subjectId,
        year,
        title: typeof entryOrTitle === "string" ? entryOrTitle : entry?.title || "",
        status: "not mapped for the selected year",
        sourceVersion: sourceVersionFor(subjectId, year),
        developmentalFocus: developmentalFocusFor(subjectId, year),
        objectives: []
      };
    }
    const objectives = (entry.objectives || []).filter(objective => !entry.objectiveYears || entry.objectiveYears[objective]?.includes(year));
    return {
      mapped: true,
      subjectId,
      year,
      title: entry.title,
      status: selected.status,
      sourceVersion: selected.sourceVersion,
      developmentalFocus: selected.developmentalFocus,
      profileId: entry.profileId,
      profileRouting: entry.profileRouting,
      profileReviewRequired: entry.profileReviewRequired,
      objectives
    };
  };

  DATA.engines.forEach(engine => {
    engine.subjects = [...new Set((engine.subjects || []).filter(id => id !== "eyfs"))];
    if (engine.id === "always-sometimes-never") engine.subjects = [...new Set((engine.subjects || []).map(id => id === "grammar" ? "english" : id))];
    if (engine.family === "comparison") engine.family = "reasoning";
    const primarySubject = (engine.subjects || []).find(id => subjectReleaseProfiles[id]);
    const release = primarySubject ? subjectReleaseProfiles[primarySubject] : null;
    engine.release = {
      protectedThinking: engine.preserves || release?.protect || "the central pupil decision",
      removeFirst: familyRemoval[engine.family] || "Remove the most task-completing prompt first, then inspect whether the intended thinking survives.",
      failureSignals: [engine.risk || "The scaffold supplies the next decision.", "The pupil waits for the resource rather than re-entering the task.", "The same support remains after independent success is visible."],
      reviewQuestions: release?.reviewQuestions || ["Does this remove the named barrier?", "What thinking still belongs to the pupil?", "What will disappear first?"]
    };
  });

  if (!DATA.printFormats.some(format => format.id === "vocabulary-card")) DATA.printFormats.splice(7, 0, { id: "vocabulary-card", name: "Vocabulary cards", group: "Cards", note: "Cuttable subject-word cards with concise meaning, context and teacher code.", pieces: 6 });
  const booklet = DATA.printFormats.find(format => format.id === "mini-booklet");
  if (booklet) { booklet.name = "Booklet / mini book"; booklet.note = "A genuinely imposed four-page pathway printed on two sides."; booklet.pieces = 4; }
  const intervention = DATA.printFormats.find(format => format.id === "intervention-pack");
  if (intervention) { intervention.note = "A four-page introduce, use, check and reduce teaching sequence."; intervention.pieces = 4; }
  DATA.printFormats.forEach(format => { format.release = formatRules[format.id] || formatRules.workpage; });
  DATA.build3.printModes = printModes.map(mode => mode.id);
  DATA.build5 = {
    schemaVersion: 5,
    release: "Gold Master",
    years: YEARS,
    bandForYear: BAND_FOR_YEAR,
    developmentalMove: DEVELOPMENTAL_MOVE,
    subjectReleaseProfiles,
    printModes,
    printModeAliases: { colour: "full-colour", "low-colour": "soft-classroom", monochrome: "black-white", photocopy: "ink-saver" },
    formatRules,
    qualityDimensions: ["curriculum integrity", "barrier precision", "protected thinking", "subject authenticity", "support proportionality", "language demand", "representation integrity", "growth coherence", "independence evidence", "inclusion", "print fitness", "teacher usability", "source honesty", "data recoverability"],
    releasePrinciple: "The purpose of a scaffold is to make itself unnecessary."
  };
})();
