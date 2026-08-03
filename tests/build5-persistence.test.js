"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const PERSISTENCE = require("../persistence.js");

let assertions = 0;
const check = (condition, message) => {
  assertions += 1;
  assert.ok(condition, message);
};

const NOW = "2026-08-03T12:00:00.000Z";

function resource(id = "resource-one", overrides = {}) {
  return {
    id,
    title: "Equivalent fractions bridge",
    year: "Year 4",
    subject: "mathematics",
    topic: "Fractions",
    objective: "Recognise and show equivalent fractions.",
    phase: "Guided practice",
    stage: "sprout",
    engineId: "bar-model",
    familyId: "representation",
    format: "workpage",
    createdAt: NOW,
    updatedAt: NOW,
    content: {
      instruction: "Represent the relationship before calculating.",
      prompts: ["What is equal?", "How does the model show it?"],
      vocabulary: ["equivalent", "numerator", "denominator"],
      density: "calm",
      responseSpace: "standard",
      instructionMode: "standard"
    },
    ...overrides
  };
}

async function run() {
  const canonical = PERSISTENCE.canonicalStringify({ z: [3, 2], b: 2, a: 1 });
  check(canonical === '{"a":1,"b":2,"z":[3,2]}', "Canonical JSON sorts object keys and preserves array order");
  const expectedHash = crypto.createHash("sha256").update('{"a":1,"b":2}').digest("hex");
  check(PERSISTENCE.canonicalChecksumSync({ b: 2, a: 1 }) === expectedHash, "Fallback checksum is a correct SHA-256 digest");
  check(await PERSISTENCE.canonicalChecksum({ b: 2, a: 1 }) === expectedHash, "Async checksum matches the deterministic checksum");

  const envelopeCases = [
    ["library", { product: "Scaffold Seeds", schemaVersion: 4, library: [resource()] }],
    ["resources", { product: "Scaffold Seeds", schemaVersion: 4, resources: [resource()] }],
    ["resource", { product: "Scaffold Seeds", schemaVersion: 4, resource: resource() }]
  ];
  for (const [name, payload] of envelopeCases) {
    const result = PERSISTENCE.validateBundle(payload, { now: NOW });
    check(result.valid, `${name} envelope validates`);
    check(result.detectedEnvelope === name, `${name} envelope is identified explicitly`);
    check(result.bundle.library.length === 1 && result.bundle.library[0].schemaVersion === 5, `${name} envelope migrates to schema 5`);
  }

  const migrated = PERSISTENCE.validateBundle({
    product: "Scaffold Seeds",
    schemaVersion: 4,
    library: [resource("legacy", {
      ai: { schemaVersion: 3, rounds: "not-an-array", provenance: "not-an-array", status: "unknown-status" },
      versions: "not-an-array",
      tags: "not-an-array",
      updatedAt: "not-a-date"
    })]
  }, { now: NOW });
  check(migrated.valid && migrated.migrated, "A structurally weak Build 4 resource is migrated rather than crashing the library");
  check(Array.isArray(migrated.bundle.library[0].ai.rounds) && migrated.bundle.library[0].ai.schemaVersion === 5, "AI arrays and schema are normalised after legacy spreading");
  check(Array.isArray(migrated.bundle.library[0].versions) && Array.isArray(migrated.bundle.library[0].tags), "Version and tag collections are repaired");
  check(migrated.bundle.library[0].updatedAt === NOW, "Invalid dates receive a valid deterministic recovery date");

  const hostile = JSON.parse(`{
    "product":"Scaffold Seeds",
    "schemaVersion":4,
    "settings":{
      "defaultColour":"x\\\"><img data-hostile=1>",
      "defaultPaper":"a4; } body { display:none",
      "defaultGrowthStages":null,
      "terminology":"<script>alert(1)</script>"
    },
    "library":[{
      "id":"hostile-resource",
      "title":"Safe <b>text</b>",
      "subject":"english",
      "assets":[{"id":"remote","type":"image/png","dataUrl":"https://tracking.invalid/pixel.png","fit":"contain;background:url(https://tracking.invalid)"}],
      "content":{"density":"calm\\\" autofocus onfocus=alert(1)","instruction":"<script>alert(1)</script> remains inert text"},
      "__proto__":{"polluted":true}
    }]
  }`);
  const hostileResult = PERSISTENCE.validateBundle(hostile, { now: NOW });
  check(hostileResult.valid, "Hostile optional fields are repaired without losing the recoverable resource");
  check(hostileResult.bundle.settings.defaultColour === "full-colour" && hostileResult.bundle.settings.defaultPaper === "a4", "Print enums reject markup and CSS injection");
  check(hostileResult.bundle.settings.terminology === "pupils" && hostileResult.bundle.settings.defaultGrowthStages[0] === "sprout", "Malformed setting types receive safe defaults");
  check(hostileResult.bundle.library[0].assets.length === 0, "Remote image URLs are rejected from local image records");
  check(hostileResult.bundle.library[0].content.density === "calm", "Content enums reject attribute injection");
  check(Object.prototype.polluted === undefined, "Prototype-polluting keys are discarded");

  const tinyPng = "data:image/png;base64,iVBORw0KGgo=";
  const image = PERSISTENCE.normaliseImage({ id: "image-one", type: "image/png", dataUrl: tinyPng, fit: "cover; background:red", rotation: 45 }, { now: NOW });
  check(image && image.fit === "contain" && image.rotation === 0, "Local images retain only allowlisted layout values");
  check(image.dataUrl === tinyPng && image.bytes > 0, "A bounded local PNG data URL is retained with measured byte size");

  const invalidSubject = PERSISTENCE.validateBundle({ product: "Scaffold Seeds", schemaVersion: 4, library: [resource("good"), resource("bad", { subject: "unknown" })] }, { now: NOW });
  check(invalidSubject.valid && invalidSubject.bundle.library.length === 1, "One invalid resource cannot erase valid resources");
  check(invalidSubject.quarantined.length === 1, "Invalid resources are reported in quarantine");
  const future = PERSISTENCE.validateBundle({ product: "Scaffold Seeds", schemaVersion: 99, library: [resource()] }, { now: NOW });
  check(!future.valid && future.errors.some(item => item.code === "SCHEMA_FUTURE"), "A future schema is rejected rather than silently downgraded");

  const complete = PERSISTENCE.createBundle({
    product: "Scaffold Seeds",
    schemaVersion: 5,
    library: [resource()],
    settings: { defaultColour: "pastel-classroom", defaultPaper: "a5" },
    aiWorkspaces: { "resource-one": { id: "workspace-one", resourceId: "resource-one", phase: "review", rawImport: "Imported text" } }
  }, { now: NOW });
  check(complete.integrity.algorithm === "SHA-256" && complete.integrity.resourceCount === 1, "Created bundles contain an explicit integrity manifest");
  const roundTrip = PERSISTENCE.validateBundle(JSON.stringify(complete), { now: NOW });
  check(roundTrip.valid && roundTrip.bundle.library[0].id === "resource-one", "A complete bundle round-trips through JSON and checksum verification");
  check(roundTrip.bundle.settings.defaultColour === "pastel-classroom" && roundTrip.bundle.aiWorkspaces["resource-one"].phase === "review", "Settings and per-resource workspace survive round-trip");
  const tampered = JSON.parse(JSON.stringify(complete));
  tampered.library[0].title = "Changed after export";
  const tamperResult = PERSISTENCE.validateBundle(tampered, { now: NOW });
  check(!tamperResult.valid && tamperResult.errors.some(item => item.code === "CHECKSUM_MISMATCH"), "Checksum detects a modified or truncated backup");

  const fakeStorageValues = new Map([
    ["scaffold-seeds.library.v1", JSON.stringify([resource("legacy-storage")])],
    ["scaffold-seeds.settings.v1", JSON.stringify({ defaultColour: "colour" })],
    ["scaffold-seeds.ai-workspace.v4.legacy-storage", JSON.stringify({ resourceId: "legacy-storage", phase: "import", rawImport: "Recovered response" })]
  ]);
  const fakeStorage = {
    get length() { return fakeStorageValues.size; },
    getItem(key) { return fakeStorageValues.get(key) || null; },
    key(index) { return [...fakeStorageValues.keys()][index] || null; }
  };
  const legacyStorage = PERSISTENCE.readLegacyLocalStorage(fakeStorage, { now: NOW });
  check(legacyStorage.valid && legacyStorage.bundle.library[0].id === "legacy-storage", "Legacy localStorage library is read without deleting the source keys");
  check(legacyStorage.bundle.settings.defaultColour === "full-colour", "Legacy colour preference migrates to the Build 5 print enum");
  check(legacyStorage.bundle.aiWorkspaces["legacy-storage"].rawImport === "Recovered response", "Per-resource legacy workspace is included in migration");

  const repository = PERSISTENCE.createRepository({ forceMemory: true, sessionId: "test-tab" });
  const capabilities = await repository.open();
  check(capabilities.backend === "memory" && capabilities.persistent === false, "No-IDB fallback is explicit memory mode, never false durable storage");
  const changes = [];
  const unsubscribe = repository.subscribe(event => changes.push(event));
  const saved = await repository.putResource(resource("stored"), { expectedRevision: 0 });
  check(saved.revision === 1 && (await repository.getResource("stored")).title.includes("Equivalent"), "Resource save is revisioned and readable");
  await assert.rejects(() => repository.putResource({ ...saved, title: "Stale edit" }, { expectedRevision: 0 }), error => error instanceof PERSISTENCE.ConflictError);
  assertions += 1;
  await repository.putWorkspace({ id: "workspace-stored", resourceId: "stored", phase: "review", rawImport: "Safe response" }, { expectedRevision: 0 });
  check((await repository.getWorkspace("stored")).rawImport === "Safe response", "Workspace saves independently by resource ID");
  check(changes.some(event => event.type === "resource-updated") && changes.some(event => event.type === "workspace-updated"), "Committed changes notify local subscribers");

  const deleted = await repository.softDelete("stored", { expectedRevision: 1, now: NOW });
  check(deleted.resource.id === "stored" && await repository.getResource("stored") === null, "Soft delete removes the current record atomically");
  check((await repository.listDeleted()).length === 1, "Soft-deleted data remains recoverable in trash");
  const restored = await repository.restoreDeleted("stored");
  check(restored.id === "stored" && (await repository.getWorkspace("stored")).rawImport === "Safe response", "Restore returns both the resource and its AI workspace");

  const recovery = await repository.createRecoverySnapshot("Known good state");
  await repository.putResource(resource("later"), { expectedRevision: 0 });
  check((await repository.listResources()).length === 2, "Subsequent work can continue after a recovery checkpoint");
  await repository.restoreRecoverySnapshot(recovery.id);
  check((await repository.listResources()).length === 1 && await repository.getResource("later") === null, "Recovery restore atomically returns to the checkpoint");

  const selectedEnvelope = { product: "Scaffold Seeds", schemaVersion: 4, resources: [resource("selected-import")] };
  await repository.importBundle(selectedEnvelope, { mode: "merge" });
  check(Boolean(await repository.getResource("selected-import")), "Selected-resource export envelope imports into the repository");
  const portableEnvelope = { product: "Scaffold Seeds", schemaVersion: 4, resource: resource("portable-import") };
  await repository.importBundle(portableEnvelope, { mode: "merge" });
  check(Boolean(await repository.getResource("portable-import")), "Single portable resource envelope imports into the repository");
  const snapshot = await repository.getSnapshot();
  check(PERSISTENCE.validateBundle(snapshot, { now: NOW }).valid, "Repository snapshot is a checksummed, importable bundle");
  const estimate = await repository.estimateStorage();
  check(estimate.backend === "memory" && estimate.estimated && estimate.usage > 0, "Storage estimate remains available without the StorageManager API");
  unsubscribe();
  await repository.close();

  console.log(`Build 5 persistence tests passed · ${assertions} assertions`);
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
