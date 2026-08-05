"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(ROOT, file), "utf8");
const html = read("index.html");
const app = read("app.js");
const css = read("styles.css");
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function bodyOf(name, nextName) {
  const start = app.indexOf(`  function ${name}(`);
  const end = app.indexOf(`  function ${nextName}(`, start + 1);
  assert.ok(start >= 0 && end > start, `Could not isolate ${name}`);
  return app.slice(start, end);
}

const nav = html.match(/<nav class="nav-list"[\s\S]*?<\/nav>/)?.[0] || "";
const navViews = [...nav.matchAll(/data-view="([^"]+)"/g)].map(match => match[1]);
check(JSON.stringify(navViews) === JSON.stringify(["home", "library"]), "Permanent navigation is reduced to Home and Library");
check(!/AI Companion|Print Studio|Knowledge|Settings/.test(nav), "Contextual and occasional tools do not compete in permanent navigation");
check(/sidebar-tools[\s\S]*Curriculum reference[\s\S]*Preferences &amp; backup/.test(html), "Reference and preferences remain available as occasional utilities");
check(!/topbar-actions[\s\S]*data-action="new-scaffold"/.test(html), "The top bar does not duplicate or accidentally reset the active creation task");

const home = bodyOf("renderHome", "renderCreate");
check(/Where are pupils/.test(home) && /Create a scaffold/.test(home), "Home communicates the task and next action immediately");
for (const removed of ["Quick start", "Today’s inspiration", "Favourite scaffold engines", "Editorial review", "Teaching reflection"]) {
  check(!home.includes(removed), `Home no longer renders the ${removed} panel`);
}
check(/slice\(0, 3\)/.test(home), "Home limits recency to three useful continuations");

const create = bodyOf("renderCreate", "createHead");
check(/\["Need", "Support", "Shape", "Use"\]/.test(create), "Creation is expressed as four teacher decisions");
check(/step \$\{state\.createStep \+ 1\} of 4/.test(create), "The accessible step count is four");
check(/\[renderBriefStep, renderSupportDecisionStep, renderDesignStep, renderReviewStep\]/.test(create), "The seven-screen tunnel is replaced by four canonical stages");
check(!/renderOutputStep|renderContextStep|renderSituationStep|renderAnalysisStep|renderSupportStep/.test(app), "Superseded creation screens are removed from the product code");
check(/Math\.min\(3, state\.createStep \+ 1\)/.test(app), "Navigation cannot re-enter a historical fifth, sixth or seventh step");

const brief = bodyOf("renderBriefStep", "protectedThinkingStatement");
check(/Where does independent success stop/.test(brief), "The first step centres the observable sticking point");
check((brief.match(/data-draft-field=/g) || []).length <= 6, "The first step asks only for the minimum useful context");
check(/Curriculum lens/.test(brief), "Curriculum intelligence is contextual rather than a compulsory detour");

const decision = bodyOf("renderSupportDecisionStep", "renderDiagramValueControls");
check(/Best local match/.test(decision) && /Recommended from the barrier/.test(decision), "The app makes a recommendation instead of exposing system configuration");
check(/slice\(0, 3\)/.test(decision), "Only three barrier candidates are surfaced");
check(/Two other good fits/.test(decision), "Alternatives remain available through progressive disclosure");
check(/The thinking stays with pupils/.test(decision), "Protected pupil thinking remains explicit");

const designer = bodyOf("renderDesignStep", "renderReviewStep");
check(!/regenerate-section|Classroom format|Instruction language|Visual density/.test(designer), "Duplicated and implementation-shaped designer controls are removed");
check(/<details open><summary>Essentials/.test(designer), "The designer opens on essential editable content only");
check(/Example &amp; access/.test(designer) && /Teacher notes &amp; library/.test(designer), "Occasional designer controls remain available without visual competition");

const finish = bodyOf("renderReviewStep", "scoreBarrierCandidates");
check(/Save to library/.test(finish) && /> Print</.test(finish), "The final step leads with the two primary classroom outcomes");
check(/<details class="finish-more">/.test(finish), "AI, stage comparison and reflection are secondary to use");
check(/Nothing is sent automatically/.test(finish), "The compressed AI entry still states the trust boundary");

const library = bodyOf("renderLibrary", "renderKnowledge");
check(/placeholder="Search your library"/.test(library), "Library search is the dominant retrieval control");
check((library.match(/data-action="new-scaffold"/g) || []).length === 2, "Library offers one creation action in its heading and one only in the empty state");
check((library.match(/data-library-filter="(?:year|subject|aiStatus|sort)"/g) || []).length === 4, "Library exposes only four purposeful secondary filters");
check(!/data-library-filter="(?:family|format|stage|source)"/.test(library), "Low-value filter controls are removed from the interface");
check(/<details class="card-more">/.test(library), "Rare resource maintenance actions are grouped once per card");

const print = bodyOf("renderPrintStudio", "renderSettings");
check(/Ready for physical preview/.test(print) && /class="button button-primary print-primary"/.test(print), "Print leads with honest preview readiness and the print action");
check(/<details class="print-options">/.test(print), "Specialist print controls use progressive disclosure");
check((print.match(/data-print-select=/g) || []).length >= 3, "Paper, orientation and style remain adjustable");

const settings = bodyOf("renderSettings", "settingSwitch");
check((settings.match(/<section class="settings-card/g) || []).length === 4, "Preferences are reduced to four coherent groups");
check(!/AI Companion defaults|School or class label|Preferred terminology|Line thickness/.test(settings), "Rare defaults no longer create a settings tax");

check(/\/\* Build 6 · reduction layer \*\//.test(css), "The reduced interface has a deliberate responsive design layer");
check(/@media \(max-width: 760px\)[\s\S]*\.studio-reduced, \.finish-workspace/.test(css), "The shortened workflow remains single-column on narrow iPad split views");
check(/\.step-list \{ grid-template-columns: repeat\(4,1fr\); \}/.test(css), "Responsive progress styling matches the four-stage workflow");

console.log(`Build 6 product reduction tests passed · ${assertions} assertions`);
