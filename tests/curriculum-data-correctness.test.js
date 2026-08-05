"use strict";

const assert = require("node:assert/strict");

global.window = global;
require("../data.js");
require("../build3-data.js");
require("../build4-data.js");
require("../build5-data.js");

const DATA = global.SCAFFOLD_DATA;
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function subject(id) {
  return DATA.subjects.find(item => item.id === id);
}

function entriesFor(subjectId, title, year) {
  return subject(subjectId).entries.filter(entry => entry.title === title && (!year || entry.years.includes(year)));
}

function profileFor(subjectId, title, year) {
  const matches = entriesFor(subjectId, title, year);
  check(matches.length === 1, `${subjectId} / ${title} / ${year} must resolve to one curriculum entry; found ${matches.length}.`);
  return matches[0]?.profileId;
}

// Bundled data must use deterministic semantic routing rather than incidental
// words inside an objective (for example "ratio" inside "operations").
const expectedProfiles = [
  ["english", "Reading comprehension", "Year 6", "reading"],
  ["english", "Composition", "Year 4", "composition"],
  ["mathematics", "Place value", "Year 6", "number"],
  ["mathematics", "Addition and subtraction", "Year 3", "additive"],
  ["mathematics", "Geometry and measure", "Year 5", "geometry"],
  ["geography", "Place knowledge", "Year 4", "place"],
  ["computing", "Computer systems and networks", "Year 5", "systems"],
  ["art", "Drawing and observation", "Year 4", "looking"],
  ["music", "Composition and performance", "Year 5", "compose"],
  ["physical-education", "Dance and gymnastics", "Year 5", "movement"]
];

for (const [subjectId, title, year, expected] of expectedProfiles) {
  check(profileFor(subjectId, title, year) === expected, `${subjectId} / ${title} must route to ${expected}.`);
}

for (const curriculumSubject of DATA.subjects) {
  const validProfiles = new Set((DATA.subjectBrains[curriculumSubject.id]?.profiles || []).map(profile => profile.id));
  for (const year of DATA.years) {
    check(Boolean(curriculumSubject.release?.statusByYear?.[year]), `${curriculumSubject.name} has no selected-year status for ${year}.`);
    check(Boolean(curriculumSubject.release?.sourceVersionByYear?.[year]), `${curriculumSubject.name} has no selected-year source for ${year}.`);
  }
  for (const entry of curriculumSubject.entries) {
    check(validProfiles.has(entry.profileId), `${curriculumSubject.name} / ${entry.title} has invalid profile ${entry.profileId}.`);
    check(entry.profileReviewRequired === false, `${curriculumSubject.name} / ${entry.title} fell through to an unreviewed profile fallback.`);
    check(["bundled-title", "declared"].includes(entry.profileRouting), `${curriculumSubject.name} / ${entry.title} has an unexplained profile route.`);
  }
}

const science = subject("science");
check(!science.entries.some(entry => entry.title === "Forces, light and sound"), "The inaccurate combined Forces, light and sound entry must not return.");

const scienceTopicYears = {
  "Forces and magnets": ["Year 3"],
  Sound: ["Year 4"],
  Forces: ["Year 5"],
  Light: ["Year 3", "Year 6"]
};

for (const [title, expectedYears] of Object.entries(scienceTopicYears)) {
  const actualYears = entriesFor("science", title).flatMap(entry => entry.years).sort();
  check(JSON.stringify(actualYears) === JSON.stringify([...expectedYears].sort()), `${title} must map only to ${expectedYears.join(" and ")}; found ${actualYears.join(", ")}.`);
}

for (const year of DATA.years) {
  const soundEntries = entriesFor("science", "Sound", year);
  check(soundEntries.length === (year === "Year 4" ? 1 : 0), `Sound topic coverage is wrong for ${year}.`);
}

for (const title of ["Plants", "Animals including humans", "Living things and habitats", "Electricity"]) {
  for (const entry of entriesFor("science", title)) {
    check(entry.years.length === 1, `${title} must use year-specific content rather than a mixed objective bundle.`);
  }
}

for (const entry of science.entries) {
  check(Boolean(entry.objectiveYears), `Science / ${entry.title} has no objective-year metadata.`);
  for (const objective of entry.objectives) {
    check(JSON.stringify(entry.objectiveYears[objective]) === JSON.stringify(entry.years), `Science / ${entry.title} objective is not scoped to its declared year or phase.`);
  }
  for (const year of entry.years) {
    const metadata = DATA.curriculumMetadataFor("science", entry, year);
    check(metadata.mapped, `Science / ${entry.title} / ${year} has no selected-year metadata.`);
    check(metadata.objectives.length === entry.objectives.length, `Science / ${entry.title} / ${year} loses an in-scope objective.`);
  }
}

check(typeof DATA.curriculumMetadataFor === "function", "The selected-year curriculum metadata resolver is not exposed.");

const languageEnrichment = DATA.curriculumMetadataFor("languages", "Interaction and culture", "Year 2");
check(languageEnrichment.mapped && /school enrichment/.test(languageEnrichment.status), "Pre-KS2 languages must be labelled as school enrichment.");
check(/locally selected language enrichment/.test(languageEnrichment.sourceVersion), "Pre-KS2 languages must not cite the statutory KS2 programme as their source.");

const languageStatutory = DATA.curriculumMetadataFor("languages", "Interaction and culture", "Year 4");
check(languageStatutory.mapped && /key stage 2 content with local sequencing/.test(languageStatutory.status), "KS2 languages must expose key-stage status without pretending to be year-prescribed.");
check(/National curriculum/.test(languageStatutory.sourceVersion), "KS2 languages must retain the national-curriculum source.");

const geography = DATA.curriculumMetadataFor("geography", "Place knowledge", "Year 4");
check(geography.mapped && /key stage 2 content with local sequencing/.test(geography.status), "Foundation-subject metadata must state that year sequencing is local.");

const religiousEducation = DATA.curriculumMetadataFor("religious-education", "Belief, practice and identity", "Year 5");
check(religiousEducation.mapped && /locally determined statutory provision/.test(religiousEducation.status), "RE status must remain locally determined and statutory.");
check(/agreed or trust RE syllabus/.test(religiousEducation.sourceVersion), "RE must cite the locally applicable syllabus rather than the national curriculum.");

const artEntry = entriesFor("art", "Drawing and observation", "EYFS")[0];
check(/EYFS/.test(artEntry.sourceVersionByYear.EYFS), "A mixed-age Art entry must expose its EYFS source for EYFS.");
check(/National curriculum/.test(artEntry.sourceVersionByYear["Year 6"]), "A mixed-age Art entry must expose its national-curriculum source for Year 6.");
check(artEntry.sourceVersionByYear.EYFS !== artEntry.sourceVersionByYear["Year 6"], "Mixed-age source metadata must be selected-year specific.");

const currentRSHE = DATA.curriculumMetadataFor("pshe", subject("pshe").entries[0], "Year 4");
check(/to 31 August 2026/.test(currentRSHE.sourceVersion) && /from 1 September 2026/.test(currentRSHE.sourceVersion), "RSHE metadata must distinguish the currently applicable guidance from the September revision.");
check(/to 31 August 2026/.test(artEntry.sourceVersionByYear.EYFS) && /from 1 September 2026/.test(artEntry.sourceVersionByYear.EYFS), "EYFS metadata must distinguish the currently applicable framework from the September revision.");

const unknown = DATA.curriculumMetadataFor("science", "Not a mapped topic", "Year 4");
check(!unknown.mapped && /not mapped/.test(unknown.status), "Unknown curriculum data must return an honest unmapped status.");

console.log(`Curriculum data correctness tests passed · ${assertions} assertions`);
