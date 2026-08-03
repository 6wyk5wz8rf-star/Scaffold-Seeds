"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const exists = relative => fs.existsSync(path.join(ROOT, relative));
let assertions = 0;
const check = (condition, message) => {
  assertions += 1;
  assert.ok(condition, message);
};

const html = read("index.html");
const css = read("styles.css");
const app = read("app.js");
const worker = read("sw.js");
const manifest = JSON.parse(read("manifest.webmanifest"));
const scripts = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1]);
const expectedScripts = [
  "data.js", "build3-data.js", "build4-data.js", "build5-data.js",
  "resource-engine.js", "verification-engine.js", "ai-companion.js",
  "persistence.js", "app.js"
];

check(html.startsWith("<!DOCTYPE html>"), "The app has a standards-mode document shell");
check(/<html lang="en-GB">/.test(html), "The document declares British English");
check(/name="viewport"[^>]+viewport-fit=cover/.test(html), "The viewport supports iPad safe areas");
check(/connect-src 'none'/.test(html), "The content security policy forbids document network connections");
check(/object-src 'none'/.test(html) && /base-uri 'self'/.test(html), "The policy removes plug-in and base-tag injection surfaces");
check(!/\son[a-z]+\s*=/.test(html), "The static shell contains no inline event handlers");
check(JSON.stringify(scripts) === JSON.stringify(expectedScripts), "Data, engines, persistence and the interface load in the required order");
scripts.forEach(source => check(exists(source), `Script exists: ${source}`));

check(exists("assets/fonts/playwrite-it-moderna.woff2"), "The Playwrite IT Moderna font is packaged locally");
check(fs.statSync(path.join(ROOT, "assets/fonts/playwrite-it-moderna.woff2")).size > 30000, "The packaged font is not an empty placeholder");
check(exists("assets/fonts/Playwrite-IT-Moderna-OFL.txt"), "The local font licence accompanies the font");
check(/font-family:\s*"Playwrite IT Moderna"/.test(css), "The product identity font is declared explicitly");
check(/font-display:\s*swap/.test(css), "Font loading falls back without blocking the interface");
check(!/@import\b/i.test(css), "Styles do not depend on a remote import");
check(!/(Arial|Helvetica|Georgia|Times New Roman)/i.test(css), "Typography uses the identity stack rather than scattered hard-coded faces");

check(manifest.name === "Scaffold Seeds" && manifest.lang === "en-GB", "The install manifest identifies the product and locale");
check(manifest.start_url === "./" && manifest.scope === "./", "The install scope remains static-host compatible");
check(manifest.display === "standalone" && manifest.orientation === "any", "The installed app supports rotation and standalone use");
check(Array.isArray(manifest.icons) && manifest.icons.length > 0, "The install manifest includes an icon");
manifest.icons.forEach(icon => check(exists(icon.src), `Manifest icon exists: ${icon.src}`));
check(manifest.icons.some(icon => icon.type === "image/png" && icon.sizes === "512x512"), "The install manifest includes a raster maskable icon");
const appleTouchIcon = html.match(/rel="apple-touch-icon"\s+href="([^"]+)"/)?.[1];
check(Boolean(appleTouchIcon) && exists(appleTouchIcon), "iPad Home Screen installation has a local 180px touch icon");

const shellMatch = worker.match(/const APP_SHELL = \[([\s\S]*?)\];/);
check(Boolean(shellMatch), "The offline worker declares an explicit application shell");
const shellPaths = [...shellMatch[1].matchAll(/"([^"]+)"/g)].map(match => match[1]);
shellPaths.filter(item => !["./", "./index.html"].includes(item)).forEach(item => check(exists(item.replace(/^\.\//, "")), `Offline shell asset exists: ${item}`));
check(shellPaths.includes("./manifest.webmanifest") && shellPaths.includes("./assets/fonts/playwrite-it-moderna.woff2"), "Offline installation includes the manifest and identity font");
check(/url\.origin !== self\.location\.origin/.test(worker), "The service worker ignores cross-origin requests");
check(/request\.mode === "navigate"/.test(worker) && /caches\.match\("\.\/index\.html"\)/.test(worker), "Offline navigation falls back to the local application shell");

const productSources = expectedScripts.map(read).join("\n");
check(!/\bXMLHttpRequest\b|\bWebSocket\b|EventSource\b/.test(productSources), "Product modules contain no hidden remote transport");
check(!/\bfetch\s*\(/.test(productSources), "Product modules do not call an external API");
check(!/\beval\s*\(|new\s+Function\s*\(/.test(productSources), "Product modules avoid dynamic code execution");
check(!/Generate with AI|AI genius|Instant perfection|Supercharge|Revolutionise/i.test(app), "AI controls use restrained, accurate language");
check(/Prepare AI prompt/.test(app) && /Import AI response/.test(app) && /Teacher judgement/.test(app), "The AI workflow states what happens and keeps professional review visible");

const modes = ["full-colour", "soft-classroom", "pastel-classroom", "greyscale", "black-white", "high-contrast", "ink-saver"];
modes.forEach(mode => check(css.includes(`ink-${mode}`), `Print style has a dedicated composition: ${mode}`));
check(/@media \(forced-colors: active\)/.test(css), "Forced-colour users receive a deliberate interface treatment");
check(/@media \(pointer: coarse\)/.test(css) && /min-height:\s*44px/.test(css), "Touch layouts preserve 44px targets");
check(/prefers-reduced-motion/.test(css), "Reduced-motion preferences are respected");
check(/\.paper\.large-print/.test(css), "Large print is retypeset rather than visually scaled");
check(/#print-root[^}]+visibility:\s*visible/.test(css), "The print root is revealed only in the print composition");

check(/class="skip-link"/.test(html), "Keyboard users can bypass navigation");
check(/aria-live="polite"/.test(html), "Save state is announced without interrupting work");
check(/aria-label="Primary navigation"/.test(html), "Primary navigation has an accessible name");
check(/modalReturnFocus/.test(app) && /event\.key === "Tab"/.test(app) && /modalLayer\.querySelectorAll/.test(app), "Modal focus is trapped and restored");
check(/serviceWorker\.register\("\.\/sw\.js"\)/.test(app), "The app registers its same-origin offline worker");
check(!/includeAnswers|state\.print\.(?:answers|photocopy|duplex)/.test(app), "Superseded print toggles are removed from the interface state");

check(exists("README.md") && /release candidate/i.test(read("README.md")), "Release documentation describes the current candidate");
check(exists("tests/BUILD5_RELEASE_PROTOCOL.md"), "Physical-device and printer sign-off has a dedicated protocol");
check(/England/.test(html) && /England/.test(read("README.md")), "The current curriculum scope is stated honestly");

console.log(`Build 5 static and offline tests passed · ${assertions} assertions · ${shellPaths.length} cached routes`);
