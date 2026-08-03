(function () {
  "use strict";

  const years = ["EYFS", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"];

  const subjects = [
    {
      id: "english",
      name: "English",
      colour: "#626b8f",
      summary: "Language-rich scaffolds that protect comprehension, composition and authorial choice.",
      principles: ["Oral rehearsal before recording", "Explicit vocabulary in meaningful contexts", "Models as objects for noticing, not copying", "Prompts that fade from structure to self-cueing"],
      entries: [
        { title: "Communication and language", years: ["EYFS"], objectives: ["Listen attentively and respond to what they hear", "Express ideas and feelings using full sentences", "Use new vocabulary through the day"], vocabulary: ["listen", "respond", "explain", "because"], misconceptions: ["A longer answer is always a clearer answer", "Repeating an adult's words shows secure understanding"], barriers: ["vocabulary", "working-memory", "explanation"] },
        { title: "Reading comprehension", years: ["Year 1", "Year 2"], objectives: ["Discuss the sequence of events in books", "Make inferences from what is said and done", "Predict what might happen from what has been read"], vocabulary: ["character", "event", "clue", "predict"], misconceptions: ["An inference is a guess without evidence", "Every answer is stated directly in the text"], barriers: ["reading", "reasoning", "vocabulary"] },
        { title: "Reading comprehension", years: ["Year 3", "Year 4"], objectives: ["Draw inferences such as inferring characters’ feelings, thoughts and motives", "Predict what might happen from details stated and implied", "Identify main ideas drawn from more than one paragraph"], vocabulary: ["evidence", "infer", "imply", "motive", "summarise"], misconceptions: ["Evidence means copying a whole sentence", "Inference and prediction are the same"], barriers: ["reasoning", "reading", "explanation"] },
        { title: "Reading comprehension", years: ["Year 5", "Year 6"], objectives: ["Draw inferences and justify them with evidence", "Summarise the main ideas across paragraphs", "Discuss how authors use language and consider its impact"], vocabulary: ["justify", "impression", "impact", "viewpoint", "theme"], misconceptions: ["Any quotation proves an interpretation", "Impact can be explained by naming a technique alone"], barriers: ["reasoning", "explanation", "vocabulary"] },
        { title: "Sentence construction", years: ["Year 1", "Year 2"], objectives: ["Compose a sentence orally before writing it", "Use coordination and some subordination", "Use expanded noun phrases to describe and specify"], vocabulary: ["sentence", "noun", "verb", "join", "describe"], misconceptions: ["Every sentence needs to be long", "Adding adjectives always improves writing"], barriers: ["writing", "working-memory", "planning"] },
        { title: "Sentence construction", years: ["Year 3", "Year 4"], objectives: ["Extend the range of sentences with more than one clause", "Choose nouns and pronouns for clarity and cohesion", "Use fronted adverbials appropriately"], vocabulary: ["clause", "adverbial", "cohesion", "pronoun"], misconceptions: ["A fronted adverbial makes every sentence better", "A clause is any group of words with a comma"], barriers: ["writing", "knowledge", "self-monitoring"] },
        { title: "Sentence construction", years: ["Year 5", "Year 6"], objectives: ["Use relative clauses beginning with who, which, where, when, whose, that or an omitted relative pronoun", "Use a wide range of devices to build cohesion", "Use modal verbs and adverbs to indicate degrees of possibility"], vocabulary: ["relative clause", "cohesion", "modal", "ambiguity"], misconceptions: ["Complex writing must use longer sentences", "Cohesion means repeating the same noun"], barriers: ["knowledge", "writing", "working-memory"] },
        { title: "Composition", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Plan or say aloud what will be written", "Draft and organise writing for purpose and audience", "Evaluate and edit writing to improve its effectiveness"], vocabulary: ["purpose", "audience", "organise", "revise", "edit"], misconceptions: ["Planning must be completed before any drafting", "Editing means correcting spelling only"], barriers: ["planning", "organisation", "self-monitoring"] }
      ]
    },
    {
      id: "mathematics",
      name: "Mathematics",
      colour: "#536f70",
      summary: "Representations, worked examples and prompts that make structure visible without removing mathematical decisions.",
      principles: ["Move between concrete, pictorial and abstract representations", "Keep the mathematical goal unchanged", "Make one structural feature visible at a time", "Fade examples into independent completion"],
      entries: [
        { title: "Number foundations", years: ["EYFS"], objectives: ["Develop a deep understanding of numbers to 10", "Subitise up to 5", "Compare quantities up to 10 in different contexts"], vocabulary: ["more", "fewer", "equal", "altogether", "part"], misconceptions: ["Objects spread further apart make a larger quantity", "The last number said is unrelated to the total"], barriers: ["conceptual", "representation", "vocabulary"] },
        { title: "Place value", years: ["Year 1", "Year 2"], objectives: ["Recognise the place value of each digit in a two-digit number", "Compare and order numbers", "Use place value and number facts to solve problems"], vocabulary: ["digit", "tens", "ones", "greater", "partition"], misconceptions: ["The largest digit makes the largest number", "Zero has no function as a placeholder"], barriers: ["conceptual", "representation", "knowledge"] },
        { title: "Place value", years: ["Year 3", "Year 4"], objectives: ["Recognise the place value of each digit in a four-digit number", "Find 1,000 more or less than a given number", "Round whole numbers to the nearest 10, 100 or 1,000"], vocabulary: ["place value", "partition", "round", "boundary", "interval"], misconceptions: ["Rounding changes every digit independently", "A zero digit has no place-value meaning"], barriers: ["conceptual", "representation", "working-memory"] },
        { title: "Place value", years: ["Year 5", "Year 6"], objectives: ["Read, write, order and compare numbers to at least 1,000,000", "Use negative numbers in context", "Understand the value of digits in numbers with up to three decimal places"], vocabulary: ["integer", "decimal", "magnitude", "interval", "negative"], misconceptions: ["More decimal digits means a larger number", "Negative numbers further from zero are greater"], barriers: ["conceptual", "representation", "reasoning"] },
        { title: "Addition and subtraction", years: ["Year 1", "Year 2", "Year 3", "Year 4"], objectives: ["Add and subtract numbers using concrete objects, pictorial representations and formal methods", "Estimate and use inverse operations to check answers", "Solve one-step and two-step problems in context"], vocabulary: ["sum", "difference", "exchange", "inverse", "estimate"], misconceptions: ["The equals sign means ‘write the answer next’", "Subtraction always makes a number smaller"], barriers: ["representation", "working-memory", "reasoning"] },
        { title: "Multiplication and division", years: ["Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Recall and use multiplication and division facts", "Recognise and use factor pairs and commutativity", "Solve problems involving scaling, grouping and correspondence"], vocabulary: ["factor", "multiple", "product", "group", "remainder"], misconceptions: ["Multiplication always makes numbers larger", "Division always means sharing one at a time"], barriers: ["knowledge", "representation", "reasoning"] },
        { title: "Fractions", years: ["Year 1", "Year 2", "Year 3", "Year 4"], objectives: ["Recognise, find and write fractions of shapes and quantities", "Recognise and show equivalent fractions", "Add and subtract fractions with the same denominator"], vocabulary: ["whole", "part", "equal", "numerator", "denominator", "equivalent"], misconceptions: ["More pieces means each fraction is larger", "Different-looking fractions cannot be equivalent"], barriers: ["conceptual", "representation", "vocabulary"] },
        { title: "Fractions, decimals and percentages", years: ["Year 5", "Year 6"], objectives: ["Identify, name and write equivalent fractions", "Associate a fraction with division", "Recall and use equivalences between simple fractions, decimals and percentages"], vocabulary: ["equivalent", "convert", "percentage", "quotient", "proportion"], misconceptions: ["A fraction and decimal are different quantities", "Percent always describes part of 100 visible objects"], barriers: ["conceptual", "representation", "reasoning"] },
        { title: "Geometry and measure", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Describe and compare properties of shapes", "Measure, compare, add and subtract quantities", "Reason about position, direction, angles, perimeter and area"], vocabulary: ["property", "parallel", "perpendicular", "perimeter", "area"], misconceptions: ["A rotated shape changes its name", "Perimeter and area increase together"], barriers: ["vocabulary", "representation", "reasoning"] }
      ]
    },
    {
      id: "science",
      name: "Science",
      colour: "#61795d",
      summary: "Observation, explanation and enquiry supports that retain the work of thinking scientifically.",
      principles: ["Separate observation from interpretation", "Use precise disciplinary vocabulary", "Connect evidence to claims explicitly", "Keep practical decisions with the pupil where possible"],
      entries: [
        { title: "Understanding the world", years: ["EYFS"], objectives: ["Explore the natural world around them", "Describe what they see, hear and feel", "Understand some important processes and changes in the natural world"], vocabulary: ["observe", "change", "same", "different", "because"], misconceptions: ["Looking and observing are identical", "All change is caused by living things"], barriers: ["vocabulary", "attention", "explanation"] },
        { title: "Plants", years: ["Year 1", "Year 2", "Year 3"], objectives: ["Identify and describe the basic structure of flowering plants", "Observe and describe how seeds and bulbs grow", "Investigate the requirements of plants for life and growth"], vocabulary: ["root", "stem", "nutrient", "germination", "pollination"], misconceptions: ["Plants take food from soil", "Seeds are not living"], barriers: ["knowledge", "vocabulary", "conceptual"] },
        { title: "Animals including humans", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Identify and compare animals and their structures", "Describe the importance of nutrition and movement", "Describe changes, circulation and the impact of lifestyle"], vocabulary: ["organ", "nutrient", "circulation", "habitat", "offspring"], misconceptions: ["All animals with wings can fly", "Food travels through the body unchanged"], barriers: ["knowledge", "vocabulary", "representation"] },
        { title: "Materials and states of matter", years: ["Year 1", "Year 2", "Year 4", "Year 5"], objectives: ["Compare and group materials by their properties", "Describe changes of state", "Explain dissolving, separation and reversible changes"], vocabulary: ["property", "solid", "liquid", "evaporation", "condensation", "dissolve"], misconceptions: ["Melting and dissolving are the same", "Evaporation only happens when water boils"], barriers: ["conceptual", "vocabulary", "explanation"] },
        { title: "Forces, light and sound", years: ["Year 3", "Year 5", "Year 6"], objectives: ["Compare how things move on different surfaces", "Explain that light travels from sources to our eyes", "Identify how sounds are made and change"], vocabulary: ["force", "friction", "vibration", "reflection", "shadow"], misconceptions: ["A force is needed to keep every moving object moving", "Eyes send out light to see"], barriers: ["conceptual", "representation", "reasoning"] },
        { title: "Working scientifically", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Ask questions and use different types of scientific enquiry", "Make systematic observations and take measurements", "Use results to draw conclusions and evaluate evidence"], vocabulary: ["variable", "measure", "pattern", "evidence", "conclusion"], misconceptions: ["A fair test changes nothing", "Results prove a conclusion absolutely"], barriers: ["organisation", "reasoning", "self-monitoring"] }
      ]
    },
    {
      id: "history",
      name: "History",
      colour: "#98715d",
      summary: "Chronology, source and explanation supports that help pupils construct, rather than receive, historical meaning.",
      principles: ["Keep evidence distinct from interpretation", "Build secure chronological frameworks", "Teach substantive and disciplinary vocabulary together", "Allow more than one defensible interpretation"],
      entries: [
        { title: "Past and present", years: ["EYFS"], objectives: ["Talk about the lives of people around them and their roles in society", "Know some similarities and differences between things in the past and now", "Understand the past through settings, characters and events"], vocabulary: ["past", "present", "before", "after", "change"], misconceptions: ["The past is one single time", "Old objects all come from the same period"], barriers: ["conceptual", "vocabulary", "chronology"] },
        { title: "Changes within living memory", years: ["Year 1", "Year 2"], objectives: ["Identify changes within living memory", "Place known events and objects in chronological order", "Use sources to ask and answer questions about the past"], vocabulary: ["memory", "source", "chronology", "evidence", "change"], misconceptions: ["Adults can remember any point in the past", "A photograph shows everything that happened"], barriers: ["chronology", "reasoning", "vocabulary"] },
        { title: "Ancient Britain", years: ["Year 3", "Year 4"], objectives: ["Understand changes in Britain from the Stone Age to the Iron Age", "Understand the Roman Empire and its impact on Britain", "Use evidence to construct informed accounts"], vocabulary: ["settlement", "empire", "invasion", "continuity", "archaeology"], misconceptions: ["Change happened everywhere at the same moment", "The Romans transformed every aspect of life immediately"], barriers: ["chronology", "knowledge", "reasoning"] },
        { title: "Britain after Rome", years: ["Year 5", "Year 6"], objectives: ["Understand Britain’s settlement by Anglo-Saxons and Scots", "Study the Viking and Anglo-Saxon struggle for England", "Address historically valid questions about cause, change and significance"], vocabulary: ["migration", "settlement", "kingdom", "conquest", "legacy"], misconceptions: ["Groups migrated once as a single army", "Historical periods have clean start and end dates"], barriers: ["chronology", "reasoning", "knowledge"] },
        { title: "Historical enquiry", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Understand how knowledge of the past is constructed from sources", "Identify similarities, differences, cause, change and significance", "Create structured accounts and analyses"], vocabulary: ["source", "evidence", "interpretation", "cause", "significance"], misconceptions: ["Primary sources are always reliable", "There is only one correct account of the past"], barriers: ["reasoning", "reading", "explanation"] }
      ]
    },
    {
      id: "geography",
      name: "Geography",
      colour: "#567786",
      summary: "Place, scale, fieldwork and explanation supports that preserve geographical enquiry.",
      principles: ["Move between local and global scales carefully", "Use maps as selective representations", "Link human and physical processes", "Ground generalisations in located examples"],
      entries: [
        { title: "People, culture and communities", years: ["EYFS"], objectives: ["Describe their immediate environment using knowledge from observation and maps", "Explain similarities and differences between life here and in other countries", "Know some similarities and differences between environments"], vocabulary: ["place", "map", "near", "far", "environment"], misconceptions: ["A map is a tiny photograph", "Places far away are all similar"], barriers: ["representation", "vocabulary", "conceptual"] },
        { title: "Locational knowledge", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Name and locate significant places and features", "Use maps to locate countries and describe position", "Develop knowledge of the United Kingdom and the wider world"], vocabulary: ["continent", "country", "region", "hemisphere", "latitude"], misconceptions: ["The UK and England are interchangeable", "Countries appear the same size on every map"], barriers: ["knowledge", "representation", "vocabulary"] },
        { title: "Place knowledge", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Compare the human and physical geography of contrasting places", "Understand geographical similarities and differences", "Use located examples to explain patterns"], vocabulary: ["similarity", "difference", "settlement", "climate", "land use"], misconceptions: ["A country has one type of landscape", "Hot places are always dry"], barriers: ["comparison", "knowledge", "reasoning"] },
        { title: "Human and physical geography", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Identify seasonal and daily weather patterns", "Describe and understand key physical processes", "Describe and understand settlement, trade and resource distribution"], vocabulary: ["climate", "weather", "erosion", "settlement", "resource"], misconceptions: ["Weather and climate mean the same", "Physical and human geography operate separately"], barriers: ["conceptual", "vocabulary", "explanation"] },
        { title: "Geographical skills and fieldwork", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Use maps, atlases, globes and digital mapping", "Use compass directions, symbols and keys", "Observe, measure, record and present features in the local area"], vocabulary: ["scale", "symbol", "key", "grid reference", "fieldwork"], misconceptions: ["North is always straight ahead", "A larger-scale map shows a larger area"], barriers: ["representation", "organisation", "self-monitoring"] }
      ]
    },
    {
      id: "computing",
      name: "Computing",
      colour: "#6d6685",
      summary: "Planning, debugging and concept supports that leave the computational problem with the pupil.",
      principles: ["Separate the plan from the code", "Treat debugging as reasoning, not failure", "Make system state visible", "Use precise language for sequence, selection and repetition"],
      entries: [
        { title: "Computational thinking", years: ["EYFS"], objectives: ["Recognise and continue simple patterns", "Give and follow clear sequences of instructions", "Explore cause and effect with digital and non-digital systems"], vocabulary: ["order", "instruction", "pattern", "repeat", "change"], misconceptions: ["Instructions can be understood without being precise", "A device knows what we meant"], barriers: ["organisation", "conceptual", "self-monitoring"] },
        { title: "Programming", years: ["Year 1", "Year 2"], objectives: ["Understand what algorithms are", "Create and debug simple programs", "Use logical reasoning to predict the behaviour of simple programs"], vocabulary: ["algorithm", "program", "instruction", "sequence", "debug"], misconceptions: ["An algorithm must be written in code", "Debugging means starting again"], barriers: ["organisation", "conceptual", "self-monitoring"] },
        { title: "Programming", years: ["Year 3", "Year 4"], objectives: ["Design, write and debug programs that accomplish specific goals", "Use sequence, selection and repetition", "Use logical reasoning to explain how simple algorithms work"], vocabulary: ["sequence", "selection", "repetition", "variable", "debug"], misconceptions: ["Repetition always means an infinite loop", "Changing multiple things is the fastest way to debug"], barriers: ["planning", "working-memory", "self-monitoring"] },
        { title: "Programming", years: ["Year 5", "Year 6"], objectives: ["Design, write and debug programs using sequence, selection and repetition", "Work with variables and input and output", "Detect and correct errors in algorithms and programs"], vocabulary: ["variable", "condition", "selection", "input", "output"], misconceptions: ["A variable can hold only numbers", "A correct-looking output proves the algorithm is correct"], barriers: ["conceptual", "planning", "reasoning"] },
        { title: "Information technology", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Create, organise, store, manipulate and retrieve digital content", "Select and use software to accomplish given goals", "Collect, analyse, evaluate and present data and information"], vocabulary: ["data", "information", "format", "retrieve", "evaluate"], misconceptions: ["More visual effects always communicate more clearly", "Data and information are identical"], barriers: ["organisation", "planning", "self-monitoring"] },
        { title: "Computer systems and networks", years: ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6"], objectives: ["Recognise common uses of information technology", "Understand computer networks including the internet", "Understand how search results are selected and ranked"], vocabulary: ["network", "internet", "server", "search", "rank"], misconceptions: ["The internet and the web are the same", "The first search result is the most truthful"], barriers: ["knowledge", "conceptual", "vocabulary"] }
      ]
    }
  ];

  const barriers = [
    { id: "knowledge", name: "Prior knowledge", hint: "A required fact, concept or procedure is not yet secure.", keywords: ["remember", "recall", "know", "facts", "procedure", "forgot", "knowledge"] },
    { id: "vocabulary", name: "Vocabulary", hint: "The language needed to understand or express the learning is a barrier.", keywords: ["word", "vocabulary", "language", "term", "meaning", "say", "name"] },
    { id: "reading", name: "Reading demand", hint: "Decoding, fluency or text complexity is masking the intended learning.", keywords: ["read", "text", "passage", "question", "comprehension", "instructions"] },
    { id: "conceptual", name: "Conceptual understanding", hint: "Pupils can perform or recall something but its underlying structure is fragile.", keywords: ["understand", "why", "confuse", "concept", "meaning", "equivalent", "difference"] },
    { id: "representation", name: "Representation", hint: "The current image, model or example is not making the structure visible.", keywords: ["see", "visual", "model", "represent", "diagram", "abstract", "imagine"] },
    { id: "working-memory", name: "Working memory", hint: "Too many elements must be held and coordinated at once.", keywords: ["steps", "forget", "overwhelm", "too much", "hold", "multi-step", "lose track"] },
    { id: "reasoning", name: "Reasoning", hint: "Pupils need support connecting evidence, claims, choices or consequences.", keywords: ["reason", "justify", "explain", "evidence", "because", "prove", "infer"] },
    { id: "organisation", name: "Organisation", hint: "Ideas or information are present but not yet sequenced or grouped effectively.", keywords: ["organise", "order", "sequence", "structure", "chronology", "messy"] },
    { id: "planning", name: "Planning", hint: "Pupils struggle to turn an intention into manageable actions.", keywords: ["plan", "start", "independent", "task", "approach", "what to do"] },
    { id: "writing", name: "Recording and writing", hint: "The physical or compositional act of recording is blocking the subject thinking.", keywords: ["write", "sentence", "paragraph", "record", "compose", "spelling"] },
    { id: "explanation", name: "Explanation", hint: "Understanding is present, but pupils cannot make the causal or logical connection explicit.", keywords: ["explain", "express", "describe", "tell me", "talk", "show understanding"] },
    { id: "attention", name: "Attention", hint: "The pupil needs the relevant feature or stage made easier to notice and revisit.", keywords: ["attention", "focus", "distract", "notice", "miss", "concentrate"] },
    { id: "self-monitoring", name: "Self-monitoring", hint: "Pupils do not yet check progress, notice errors or choose a next action.", keywords: ["check", "edit", "debug", "review", "mistake", "monitor", "evaluate"] },
    { id: "chronology", name: "Chronology", hint: "Sequence, duration or relationships between periods are insecure.", keywords: ["chronology", "timeline", "before", "after", "period", "date", "time"] },
    { id: "comparison", name: "Comparison", hint: "Pupils notice features separately but cannot form a meaningful comparison.", keywords: ["compare", "similar", "different", "contrast", "both"] }
  ];

  const engines = [
    { id: "vocabulary-builder", name: "Vocabulary Builder", tagline: "Make essential words usable, not merely visible.", barriers: ["vocabulary", "reading", "writing"], subjects: ["all"], distinctive: "word cards with definition, example and non-example" },
    { id: "vocabulary-network", name: "Vocabulary Network", tagline: "Reveal how a concept sits among related language.", barriers: ["vocabulary", "conceptual", "knowledge"], subjects: ["all"], distinctive: "a central concept with meaningful connections" },
    { id: "inference-bridge", name: "Inference Bridge", tagline: "Connect what is noticed to what can be inferred.", barriers: ["reasoning", "reading", "explanation"], subjects: ["english", "history", "science"], distinctive: "evidence-to-inference bridge" },
    { id: "paragraph-planner", name: "Paragraph Planner", tagline: "Hold structure lightly while the pupil makes the choices.", barriers: ["writing", "organisation", "planning"], subjects: ["english", "history", "geography", "science"], distinctive: "purposeful paragraph architecture" },
    { id: "sentence-ladder", name: "Sentence Expansion Ladder", tagline: "Grow precision one deliberate choice at a time.", barriers: ["writing", "working-memory", "vocabulary"], subjects: ["english"], distinctive: "graduated sentence expansion rungs" },
    { id: "worked-example", name: "Worked Example Builder", tagline: "Make expert decisions visible, then hand them back.", barriers: ["working-memory", "knowledge", "self-monitoring"], subjects: ["mathematics", "computing", "english"], distinctive: "model and faded completion side by side" },
    { id: "representation-selector", name: "Representation Selector", tagline: "Choose the model that exposes the important structure.", barriers: ["representation", "conceptual", "reasoning"], subjects: ["mathematics", "science", "geography"], distinctive: "three representations compared by usefulness" },
    { id: "reasoning-ladder", name: "Reasoning Ladder", tagline: "Move from noticing to a defensible conclusion.", barriers: ["reasoning", "explanation", "conceptual"], subjects: ["all"], distinctive: "sequenced prompts from notice to justify" },
    { id: "observation-recorder", name: "Observation Recorder", tagline: "Protect careful noticing before explanation begins.", barriers: ["attention", "organisation", "explanation"], subjects: ["science", "geography", "eyfs"], distinctive: "observation and interpretation quadrants" },
    { id: "evidence-builder", name: "Evidence Builder", tagline: "Join claims to precise evidence and warranted reasoning.", barriers: ["reasoning", "explanation", "reading"], subjects: ["english", "history", "science", "geography"], distinctive: "claim–evidence–reasoning chain" },
    { id: "chronology-builder", name: "Chronology Builder", tagline: "Make sequence, duration and change visible together.", barriers: ["chronology", "organisation", "knowledge"], subjects: ["history", "science", "english"], distinctive: "annotated event sequence" },
    { id: "comparison-organiser", name: "Comparison Organiser", tagline: "Compare through criteria, not disconnected lists.", barriers: ["comparison", "organisation", "reasoning"], subjects: ["all"], distinctive: "paired cases and an explicit shared pattern" },
    { id: "algorithm-planner", name: "Algorithm Planner", tagline: "Plan, test and debug one purposeful step at a time.", barriers: ["planning", "working-memory", "self-monitoring"], subjects: ["computing", "mathematics"], distinctive: "ordered steps with a test column" },
    { id: "metacognition-planner", name: "Metacognition Planner", tagline: "Support pupils to plan, monitor and evaluate their own approach.", barriers: ["self-monitoring", "planning", "attention"], subjects: ["all"], distinctive: "plan–monitor–evaluate cycle" },
    { id: "vocabulary-preteach", name: "Vocabulary Pre-teaching Planner", tagline: "Prepare a small number of high-leverage words before the lesson.", barriers: ["vocabulary", "reading", "knowledge"], subjects: ["all"], distinctive: "teacher sequence for see, say, mean and use" }
  ];

  const stages = [
    { id: "seed", name: "Seed", glyph: "●", support: "Maximum support", description: "Modelled content, explicit choices and tightly sequenced prompts." },
    { id: "sprout", name: "Sprout", glyph: "◒", support: "Partial support", description: "Some content and choices remain; pupils complete meaningful gaps." },
    { id: "growth", name: "Growth", glyph: "◐", support: "Minimal support", description: "Only strategic cues and a light structure remain." },
    { id: "independent", name: "Independent", glyph: "○", support: "Support removed", description: "A self-check prompt replaces the external scaffold." }
  ];

  const lessonPhases = ["Before the lesson", "Teacher modelling", "Guided practice", "Independent practice", "Review and reflection"];

  const inspiration = [
    { quote: "If the scaffold holds the answer, it has quietly taken the learning away.", note: "Design check · Preserve the decision" },
    { quote: "The smallest useful prompt is often the most powerful one.", note: "Design check · Reduce before adding" },
    { quote: "Plan the fade at the same moment you plan the support.", note: "Design check · Independence is the destination" },
    { quote: "A barrier belongs to the task–pupil relationship, not to the child as a label.", note: "Design check · Stay precise and humane" },
    { quote: "Make the invisible structure visible, then let it become invisible again.", note: "Design check · Representation with purpose" }
  ];

  window.SCAFFOLD_DATA = { years, subjects, barriers, engines, stages, lessonPhases, inspiration };
})();
