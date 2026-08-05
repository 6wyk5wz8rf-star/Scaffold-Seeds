"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

global.window = global;
global.BroadcastChannel = undefined;
require("../data.js");
require("../build3-data.js");
require("../build4-data.js");
require("../build5-data.js");
require("../resource-engine.js");
require("../verification-engine.js");
const PERSISTENCE = require("../persistence.js");
require("../ai-companion.js");

const RESOURCE = global.ScaffoldResourceEngine;
const VERIFY = global.ScaffoldVerificationEngine;
const AI = global.ScaffoldAICompanion;
const appSource = fs.readFileSync(path.resolve(__dirname, "../app.js"), "utf8");
const persistenceSource = fs.readFileSync(path.resolve(__dirname, "../persistence.js"), "utf8");
const NOW = "2026-08-05T09:00:00.000Z";
let assertions = 0;

function check(condition, message) {
  assertions += 1;
  assert.ok(condition, message);
}

function scaffold(overrides = {}) {
  return RESOURCE.normalise({
    id: "reliability-maths",
    title: "Multiplicative relationship check",
    year: "Year 4",
    subject: "mathematics",
    topic: "Multiplication and division",
    objective: "Use multiplication and division facts to explain a relationship.",
    phase: "Guided practice",
    expectedOutcome: "Choose an operation from the relationship and justify it.",
    situation: "The pupil notices quantities but does not yet coordinate equal groups.",
    barriers: ["reasoning"],
    engineId: "bar-model",
    familyId: "representation",
    stage: "sprout",
    format: "workpage",
    essentialThinking: "The pupil must choose and justify the operation.",
    pupilAction: "Represent the relationship, choose the operation and justify it.",
    removalPathway: "Remove the completed bar, then retain one checking question.",
    vocabulary: ["factor", "product", "equal groups"],
    prerequisites: ["Recognise equal groups"],
    content: {
      instruction: "Represent the equal groups before calculating.",
      prompts: ["What does each part represent?"],
      vocabulary: ["factor", "product"],
      answerGuidance: [],
      diagramType: "bar-model",
      diagramLabels: ["6", "6", "6", "6", "24"]
    },
    diagram: { type: "bar-model", labels: ["6", "6", "6", "6", "24"], values: [6, 6, 6, 6] },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  });
}

function parsed(answer = "4 × 6 = 24") {
  return {
    id: "reliability-import",
    taskId: "verify-calculations",
    raw: `ANSWERS:\n1. ${answer}`,
    clean: `ANSWERS:\n1. ${answer}`,
    format: "structured text",
    mode: "automatic",
    warnings: [],
    expectedSections: ["answers", "verification", "uncertainties"],
    sections: [{
      id: "answers",
      label: "Answers",
      mapping: "answers",
      expected: true,
      unexpected: false,
      items: [{ id: "answer-one", text: answer, status: "accepted" }]
    }]
  };
}

function verified(scaffoldValue, parsedValue, sources = []) {
  const reviewInput = {
    ...JSON.parse(JSON.stringify(parsedValue)),
    raw: "",
    sections: parsedValue.sections.map(section => ({
      ...JSON.parse(JSON.stringify(section)),
      items: section.items.filter(item => ["accepted", "edited"].includes(item.status))
    })).filter(section => section.items.length)
  };
  const result = VERIFY.verify(scaffoldValue, reviewInput, { taskId: parsedValue.taskId, reviewLevel: "forensic" });
  result.contentChecksum = AI.verificationFingerprint(scaffoldValue, parsedValue, sources);
  return result;
}

async function run() {
  check(/let durableAIWorkspaces\s*=\s*\{\}/.test(appSource) && /function rememberDurableAIWorkspace/.test(appSource), "The application owns a canonical in-memory AI workspace map independent of the compatibility cache");
  check(/function durableBundle\(\)[\s\S]{0,500}bundledAIWorkspaces/.test(appSource) && !/function durableBundle\(\)[\s\S]{0,500}storedAIWorkspaces/.test(appSource), "Durable snapshots are built from the canonical workspace map rather than localStorage enumeration");
  check(/function cacheSnapshot\(snapshot\)[\s\S]{0,500}replaceDurableAIWorkspaces\(snapshot\.aiWorkspaces/.test(appSource), "Every restored or imported durable snapshot replaces the canonical workspace map before cache writes");
  check(/function recoveryRelevantState/.test(appSource) && /delete copy\.lastSavedAt/.test(appSource) && /recoveryRelevantChecksum\(localBundle\)/.test(appSource), "Startup reconciliation fingerprints all recovery-relevant state without volatile workspace save times");
  check(/commitResult = await adapter\.commitBundle[\s\S]{0,700}snapshot: committedSnapshot/.test(persistenceSource) && !/return \{ validation, recoveryId:[^\n]+snapshot: await getSnapshot\(\)/.test(persistenceSource), "Snapshot commits return the exact committed generation and content rather than adopting a later tab's state");
  check(/createRecoverySnapshot\("Uncommitted browser state[^\n]+localBundle\)/.test(appSource) && !/uncommitted-cache|boundedSessionRecoveryJSON/.test(appSource), "Startup stores the complete differing local state in the durable recovery system rather than an inaccessible session fragment");
  check(/function durableBundle\(\)[\s\S]{0,700}cloneAIWorkspaceForBundle\(state\.aiWorkspace/.test(appSource) && !/function durableBundle\(\)[\s\S]{0,700}safeAIWorkspace\(state\.activeScaffold/.test(appSource), "A workspace is never rebound to a different active resource while preparing a durable snapshot");
  check(/else if \(targetResourceId\) \{[\s\S]{0,120}rememberDurableAIWorkspace\(targetWorkspace\)[\s\S]{0,150}writeStore/.test(appSource), "An image finishing after resource navigation updates the canonical workspace before the durable save");
  check(/recoveryResolutionRequired\s*=\s*true/.test(appSource) && /data-action="download-recovery"/.test(appSource) && /data-action="use-last-saved"/.test(appSource), "A recovery-store failure preserves the visible source state and requires an explicit download-or-discard decision");
  check(/PERSISTENCE\.importDeletedRecord\([\s\S]{0,500}requireAbsent:\s*true/.test(appSource) && /remainingLegacy\.push\(record\)/.test(appSource), "Legacy Recently Deleted records use one atomic create-only migration and failed sources remain available for retry");
  check(/recoveryRelevantChecksum\(snapshot\) === recoveryRelevantChecksum\(durableBundle\(\)\)[\s\S]{0,200}durableGeneration = latestGeneration/.test(appSource), "Startup advances the durable generation only when the in-memory state represents the same snapshot");
  check(/async function restoreDeleted[\s\S]{0,220}await flushDurableSnapshot\(\)[\s\S]{0,220}PERSISTENCE\.restoreDeleted/.test(appSource), "Restoring from Recently Deleted flushes pending edits before replacing in-memory state from the durable snapshot");
  check(/PERSISTENCE\.softDelete\(id, \{ expectedRevision: item\.revision, expectedGeneration: durableGeneration \}\)/.test(appSource), "Deleting a resource binds both its revision and the complete library generation");
  check(/function commitImport\(mode\)[\s\S]{0,350}mode === "replace" && \(!durableReady \|\| !durablePersistent\)/.test(appSource), "Destructive backup replacement is unavailable unless its recovery checkpoint can be durably retained");
  check(/Object\.values\(STORAGE\)\.filter\(key => key !== STORAGE\.archives\)/.test(appSource), "Clear-all retains any legacy Recently Deleted records that could not yet enter durable trash");
  check(/function invalidateResourceApproval/.test(appSource) && /function renameScaffold[\s\S]{0,700}invalidateResourceApproval/.test(appSource) && /function recordFade[\s\S]{0,500}invalidateResourceApproval/.test(appSource), "Rename and fading transitions invalidate approval bound to the previous resource state");
  check(/action === "choose-stage"[\s\S]{0,500}invalidateResourceApproval/.test(appSource) && /action === "generate-scaffold"[\s\S]{0,700}approvalRelevantHash/.test(appSource), "Stage and regenerated-resource transitions cannot retain an approval for earlier content");
  check(!/AI\.applyAccepted[\s\S]{0,500}localSuggestion\?\.format/.test(appSource), "No format mutation is applied after the exact resource has crossed the AI approval boundary");
  check(/function scaffoldFromDraft[\s\S]{0,5000}ai:\s*existing\?\.ai/.test(appSource) && /function versionSnapshot[\s\S]{0,250}delete compact\.assets/.test(appSource) && /restored\.assets = JSON\.parse\(JSON\.stringify\(parent\.assets \|\| \[\]\)\)/.test(appSource), "Text/layout checkpoints preserve provenance while current local images remain intact instead of becoming broken historical references");

  const original = scaffold();
  const accepted = parsed();
  const sources = [{ type: "published source", title: "Teacher-checked source", author: "A. Author", date: "2025", publisher: "Publisher", url: "https://example.org/source", retrievalDate: "2026-08-05", note: "Checked locally." }];
  const fingerprint = AI.verificationFingerprint(original, accepted, sources);
  check(/^[a-f0-9]{64}$/.test(fingerprint), "AI verification uses a fixed SHA-256 content fingerprint");
  check(fingerprint === AI.verificationFingerprint(original, accepted, sources), "Equivalent verification inputs produce the same fingerprint");
  check(fingerprint !== AI.verificationFingerprint(scaffold({ format: "desk-strip" }), accepted, sources), "Changing print format invalidates verification");
  check(fingerprint !== AI.verificationFingerprint(scaffold({ expectedOutcome: "A changed outcome" }), accepted, sources), "Changing the pedagogical context invalidates verification");
  check(fingerprint !== AI.verificationFingerprint(original, parsed("4 × 6 = 999"), sources), "Changing accepted content invalidates verification");
  check(fingerprint !== AI.verificationFingerprint(original, { ...accepted, warnings: [{ level: "important", title: "Trimmed", message: "Content was truncated.", action: "Review it." }] }, sources), "Changing import warnings invalidates verification");
  check(fingerprint !== AI.verificationFingerprint(original, accepted, [{ ...sources[0], title: "Different source" }]), "Changing source provenance invalidates verification");
  check(fingerprint !== AI.verificationFingerprint(original, accepted, sources, { targetLanguage: "French", reviewLevel: "forensic" }), "Verification-sensitive options can be bound into the checksum");

  const safeVerification = verified(original, accepted, sources);
  const applied = AI.applyAccepted(original, accepted, { verification: safeVerification, sourceRecords: sources, approved: true });
  check(applied.round.approved && applied.resource.ai.status === "teacher-approved", "The exact verified content can pass the human approval boundary");

  assert.throws(
    () => AI.applyAccepted(original, parsed("4 × 6 = 999"), { verification: safeVerification, sourceRecords: sources, approved: true }),
    error => error?.code === "STALE_VERIFICATION",
    "A stale safe result cannot approve changed mathematics"
  );
  assertions += 1;

  const tamperedSummary = { ...safeVerification, blocking: 0, findings: [{ severity: "do-not-use", resolved: false, title: "Unsafe" }] };
  assert.throws(
    () => AI.applyAccepted(original, accepted, { verification: tamperedSummary, sourceRecords: sources, approved: true }),
    error => error?.code === "AI_VERIFICATION_BLOCKED",
    "Unresolved blocking findings are authoritative even when the summary count is corrupted"
  );
  assertions += 1;

  const pending = parsed();
  pending.sections[0].items.push({ id: "pending-one", text: "Unchecked answer", status: "pending" });
  const pendingVerification = verified(original, pending, sources);
  assert.throws(
    () => AI.applyAccepted(original, pending, { verification: pendingVerification, sourceRecords: sources, approved: true }),
    error => error?.code === "AI_DECISIONS_PENDING",
    "Approval cannot apply a response while any imported item is undecided"
  );
  assertions += 1;

  const checksumEngine = global.ScaffoldPersistence;
  delete global.ScaffoldPersistence;
  assert.throws(
    () => AI.verificationFingerprint(original, accepted, sources),
    error => error?.code === "VERIFICATION_CHECKSUM_UNAVAILABLE",
    "Approval fails closed if the local checksum engine is unavailable"
  );
  assertions += 1;
  global.ScaffoldPersistence = checksumEngine;

  const backup = PERSISTENCE.createBundle({ product: "Scaffold Seeds", schemaVersion: 5, library: [original] }, { now: NOW });
  const wrongAlgorithm = JSON.parse(JSON.stringify(backup));
  wrongAlgorithm.integrity.algorithm = "MD5";
  const algorithmResult = PERSISTENCE.validateBundle(wrongAlgorithm, { now: NOW });
  check(!algorithmResult.valid && algorithmResult.errors.some(item => item.code === "INTEGRITY_ALGORITHM_INVALID"), "Integrity algorithm tampering is rejected");

  const wrongCount = JSON.parse(JSON.stringify(backup));
  wrongCount.integrity.resourceCount = 999;
  const countResult = PERSISTENCE.validateBundle(wrongCount, { now: NOW });
  check(!countResult.valid && countResult.errors.some(item => item.code === "RESOURCE_COUNT_MISMATCH"), "Integrity resource-count tampering is rejected");

  const strippedCurrent = JSON.parse(JSON.stringify(backup));
  delete strippedCurrent.integrity;
  const strippedResult = PERSISTENCE.validateBundle(JSON.stringify(strippedCurrent), { now: NOW });
  check(!strippedResult.valid && strippedResult.errors.some(item => item.code === "CHECKSUM_MISSING"), "A current exported JSON backup cannot silently lose its checksum");
  const disguisedCurrent = JSON.parse(JSON.stringify(strippedCurrent));
  delete disguisedCurrent.product;
  const disguisedResult = PERSISTENCE.validateBundle(JSON.stringify(disguisedCurrent), { now: NOW });
  check(!disguisedResult.valid && disguisedResult.errors.some(item => item.code === "CHECKSUM_MISSING"), "Removing the product marker cannot downgrade a current-schema backup's checksum requirement");

  const legacy = PERSISTENCE.validateBundle(JSON.stringify({ product: "Scaffold Seeds", schemaVersion: 4, library: [original] }), { now: NOW });
  check(legacy.valid && legacy.warnings.some(item => item.code === "CHECKSUM_MISSING"), "A recognised legacy backup remains recoverable with an explicit checksum warning");

  assert.throws(
    () => PERSISTENCE.createBundle({ library: [{ id: "invalid", subject: "not-a-subject" }] }),
    error => error instanceof PERSISTENCE.PersistenceError && error.code === "BUNDLE_CREATE_FAILED",
    "Bundle creation cannot silently turn wholly invalid input into an empty valid library"
  );
  assertions += 1;

  const stageWorkspace = PERSISTENCE.normaliseWorkspace({ resourceId: original.id, options: { stageScope: "current" } }, { now: NOW });
  check(stageWorkspace.options.stageScope === "current", "Current-stage AI scope survives persistence normalisation");

  const structurallyStaleApproval = PERSISTENCE.createBundle({ library: [scaffold({
    ai: { schemaVersion: 5, status: "teacher-approved", approval: { approved: true }, lastVerification: { contentChecksum: "c".repeat(64), findings: [] }, rounds: [], provenance: [] }
  })] }, { now: NOW }).library[0];
  check(structurallyStaleApproval.ai.status === "review-required" && structurallyStaleApproval.ai.approval === null && structurallyStaleApproval.ai.lastVerification === null, "An old approval without dated verification and human sign-off is reopened for review");
  const structurallyCurrentApproval = PERSISTENCE.createBundle({ library: [scaffold({
    ai: {
      schemaVersion: 5,
      status: "teacher-approved",
      approval: { text: "I have reviewed this resource.", approvedAt: NOW },
      lastVerification: { contentChecksum: "d".repeat(64), checkedAt: NOW, findings: [] },
      rounds: [],
      provenance: []
    }
  })] }, { now: NOW }).library[0];
  check(structurallyCurrentApproval.ai.status === "teacher-approved" && structurallyCurrentApproval.ai.lastVerification.contentChecksum === "d".repeat(64), "A structurally complete current approval survives a backup round trip");

  const repository = PERSISTENCE.createRepository({ forceMemory: true, sessionId: "build7-reliability" });
  await repository.open();
  let committed = await repository.commitSnapshot({ library: [original] }, { expectedGeneration: 0, createRecovery: false });
  check(committed.snapshot.metadata.generation === 1, "The initial durable snapshot commits at the expected generation");

  await repository.createRecoverySnapshot("Manual known-good state");
  const afterManualRecovery = await repository.getSnapshot();
  check(afterManualRecovery.metadata.generation === 1, "Creating recovery metadata does not invalidate the library generation");

  const isolatedRecovery = await repository.createRecoverySnapshot("Isolated compatibility state", { library: [scaffold({ title: "Uncommitted compatibility title" })] });
  const isolatedRecord = await repository.getRecoverySnapshot(isolatedRecovery.id);
  check(isolatedRecord.bundle.library[0].title === "Uncommitted compatibility title", "A supplied valid local state can be retained in the durable recovery store before reconciliation");
  check((await repository.getSnapshot()).metadata.generation === 1, "Retaining a supplied recovery state remains generation-neutral");

  committed = await repository.commitSnapshot({ library: [scaffold({ title: "Second durable title" })] }, { expectedGeneration: 1, createRecovery: false });
  check(committed.snapshot.metadata.generation === 2 && committed.snapshot.library[0].title === "Second durable title", "A commit immediately after manual recovery does not self-conflict");

  const recoveryCountBeforeConflict = (await repository.listRecoverySnapshots()).length;
  await assert.rejects(
    () => repository.commitSnapshot({ library: [original] }, { expectedGeneration: 1, recoveryLabel: "Must not be written" }),
    error => error instanceof PERSISTENCE.ConflictError && error.details.actual === 2
  );
  assertions += 1;
  check((await repository.listRecoverySnapshots()).length === recoveryCountBeforeConflict, "A stale snapshot is rejected before creating a misleading recovery record");

  for (let index = 0; index < PERSISTENCE.MAX_RECOVERY_SNAPSHOTS + 7; index += 1) {
    await repository.createRecoverySnapshot(`Bounded recovery ${index}`);
  }
  const recoveries = await repository.listRecoverySnapshots();
  check(recoveries.length === PERSISTENCE.MAX_RECOVERY_SNAPSHOTS, "Recovery checkpoints use a fixed durable retention bound");
  check(recoveries.some(item => item.label === `Bounded recovery ${PERSISTENCE.MAX_RECOVERY_SNAPSHOTS + 6}`), "Recovery retention keeps the newest checkpoint");
  check(!recoveries.some(item => item.label === "Manual known-good state"), "Recovery retention removes the oldest checkpoint rather than hiding it indefinitely");

  const beforeInvalidImport = await repository.getSnapshot();
  await assert.rejects(
    () => repository.importBundle({ product: "Scaffold Seeds", schemaVersion: 5, library: [{ id: "invalid", subject: "unknown" }] }, { mode: "replace" }),
    error => error instanceof PERSISTENCE.PersistenceError && error.code === "BUNDLE_INVALID"
  );
  assertions += 1;
  const afterInvalidImport = await repository.getSnapshot();
  check(PERSISTENCE.canonicalChecksumSync(beforeInvalidImport.library) === PERSISTENCE.canonicalChecksumSync(afterInvalidImport.library), "A wholly invalid replacement backup leaves durable data unchanged");

  const secondResource = scaffold({ id: "reliability-second", title: "Second workspace resource" });
  const workspaceOne = PERSISTENCE.normaliseWorkspace({ id: "workspace-reliability-maths", resourceId: original.id, rawImport: "first current response" }, { now: NOW });
  const workspaceTwo = PERSISTENCE.normaliseWorkspace({ id: "workspace-reliability-second", resourceId: secondResource.id, rawImport: "second current response" }, { now: NOW });
  const withTwoWorkspaces = await repository.commitSnapshot({ library: [original, secondResource], aiWorkspaces: { [original.id]: workspaceOne, [secondResource.id]: workspaceTwo } }, { expectedGeneration: 2, createRecovery: false });
  const partialCompatibilityCache = { [original.id]: workspaceOne };
  check(Object.keys(partialCompatibilityCache).length === 1 && Object.keys(withTwoWorkspaces.snapshot.aiWorkspaces).length === 2, "The quota-failure probe starts with one cached and two durable workspaces");
  const { integrity: priorIntegrity, ...canonicalSnapshot } = withTwoWorkspaces.snapshot;
  const afterUnrelatedSave = await repository.commitSnapshot({ ...canonicalSnapshot, preferences: { compactLibrary: true }, aiWorkspaces: { ...canonicalSnapshot.aiWorkspaces } }, { expectedGeneration: 3, createRecovery: false });
  check(Object.keys(afterUnrelatedSave.snapshot.aiWorkspaces).sort().join("|") === [original.id, secondResource.id].sort().join("|"), "An unrelated save sourced from canonical memory preserves a workspace missing from the failed compatibility cache");

  const approvedResource = scaffold({ ai: { schemaVersion: 5, status: "teacher-approved", approval: { text: "I have reviewed this resource.", approvedAt: NOW }, lastVerification: { contentChecksum: "a".repeat(64), checkedAt: NOW, findings: [] }, rounds: [], provenance: [] } });
  const incomingApproved = scaffold({ title: "Conflicting approved copy", ai: { schemaVersion: 5, status: "teacher-approved", approval: { text: "I have reviewed this resource.", approvedAt: NOW }, lastVerification: { contentChecksum: "b".repeat(64), checkedAt: NOW, findings: [] }, rounds: [], provenance: [] } });
  const currentApprovedBundle = PERSISTENCE.createBundle({
    library: [approvedResource],
    aiWorkspaces: { [approvedResource.id]: { id: `workspace-${approvedResource.id}`, resourceId: approvedResource.id, rawImport: "new current response", verification: { contentChecksum: "a".repeat(64), findings: [] } } }
  }, { now: NOW });
  const incomingApprovedBundle = PERSISTENCE.createBundle({
    library: [incomingApproved],
    aiWorkspaces: { [incomingApproved.id]: { id: `workspace-${incomingApproved.id}`, resourceId: incomingApproved.id, rawImport: "older imported response", verification: { contentChecksum: "b".repeat(64), findings: [] } } }
  }, { now: NOW });
  const copiedMerge = PERSISTENCE.mergeBundles(currentApprovedBundle, incomingApprovedBundle, { conflict: "copy" });
  const importedCopy = copiedMerge.library.find(item => item.id !== approvedResource.id);
  check(importedCopy?.ai?.status === "review-required" && importedCopy.ai.approval === null && importedCopy.ai.lastVerification === null, "An approved resource copied under a new identity returns to review-required status");
  check(copiedMerge.aiWorkspaces[importedCopy.id]?.verification === null && copiedMerge.aiWorkspaces[importedCopy.id]?.approvalChecked === false, "A copied resource cannot inherit a verification bound to the old identity");
  const identicalIncoming = PERSISTENCE.createBundle({
    library: [approvedResource],
    aiWorkspaces: { [approvedResource.id]: { id: `workspace-${approvedResource.id}`, resourceId: approvedResource.id, rawImport: "older imported response" } }
  }, { now: NOW });
  const identicalMerge = PERSISTENCE.mergeBundles(currentApprovedBundle, identicalIncoming, { conflict: "copy" });
  check(identicalMerge.aiWorkspaces[approvedResource.id].rawImport === "new current response", "Merge does not silently replace a current workspace with an older workspace for an identical resource");
  const contextPreservingMerge = PERSISTENCE.mergeBundles(
    PERSISTENCE.createBundle({ library: [approvedResource], draft: { subject: "mathematics", situation: "current unfinished draft" }, preferences: { compactLibrary: true, questionPrompts: false } }, { now: NOW }),
    PERSISTENCE.createBundle({ library: [secondResource], draft: { subject: "science", situation: "incoming draft" }, preferences: { compactLibrary: false, questionPrompts: true } }, { now: NOW }),
    { conflict: "copy", keepCurrentSettings: true }
  );
  check(contextPreservingMerge.draft.situation === "current unfinished draft" && contextPreservingMerge.preferences.compactLibrary === true && contextPreservingMerge.preferences.questionPrompts === false, "Non-destructive Merge preserves the teacher's current draft and workflow preferences");

  const legacyRepository = PERSISTENCE.createRepository({ forceMemory: true, sessionId: "build7-legacy-trash" });
  await legacyRepository.open();
  const legacyResource = scaffold({ id: "legacy-deleted", title: "Legacy deleted resource", revision: 0 });
  const legacyWorkspace = PERSISTENCE.normaliseWorkspace({ resourceId: legacyResource.id, rawImport: "recoverable legacy response" }, { now: NOW });
  await legacyRepository.importDeletedRecord({ resource: legacyResource, workspace: legacyWorkspace, deletedAt: NOW }, { requireAbsent: true });
  const migratedDeleted = await legacyRepository.listDeleted();
  check((await legacyRepository.listResources()).length === 0 && (await legacyRepository.getWorkspace(legacyResource.id)) === null, "Atomic legacy migration never resurrects a deleted resource or leaves an active workspace");
  check(migratedDeleted.length === 1 && migratedDeleted[0].workspace.rawImport === "recoverable legacy response", "Atomic legacy migration retains the resource and workspace together in durable trash");

  const currentAtRevisionZero = scaffold({ id: "legacy-race", title: "Current revision-zero resource", revision: 0 });
  const seeded = await legacyRepository.commitSnapshot({ library: [currentAtRevisionZero] }, { expectedGeneration: 1, createRecovery: false });
  check(seeded.snapshot.library[0].revision === 0, "The legacy race probe contains a legitimate current record at revision zero");
  await assert.rejects(
    () => legacyRepository.importDeletedRecord({ resource: scaffold({ id: currentAtRevisionZero.id, title: "Stale legacy copy", revision: 0 }), deletedAt: NOW }, { requireAbsent: true }),
    error => error instanceof PERSISTENCE.ConflictError
  );
  assertions += 1;
  const afterLegacyConflict = await legacyRepository.getResource(currentAtRevisionZero.id);
  check(afterLegacyConflict.title === "Current revision-zero resource" && !(await legacyRepository.listDeleted()).some(item => item.id === currentAtRevisionZero.id), "A stale legacy migration cannot overwrite or delete a concurrently current record");
  await legacyRepository.close();

  const deleteRaceRepository = PERSISTENCE.createRepository({ forceMemory: true, sessionId: "build7-delete-race" });
  await deleteRaceRepository.open();
  const deleteTarget = scaffold({ id: "delete-race-target", title: "Delete race target", revision: 0 });
  const unchangedPeer = scaffold({ id: "delete-race-peer", title: "Original peer", revision: 0 });
  await deleteRaceRepository.commitSnapshot({ library: [deleteTarget, unchangedPeer], draft: { editingId: deleteTarget.id, subject: "mathematics" } }, { expectedGeneration: 0, createRecovery: false });
  await deleteRaceRepository.commitSnapshot({ library: [deleteTarget, unchangedPeer, scaffold({ id: "remote-addition", title: "Other tab addition", revision: 0 })], draft: { editingId: deleteTarget.id, subject: "mathematics" } }, { expectedGeneration: 1, createRecovery: false });
  await assert.rejects(
    () => deleteRaceRepository.softDelete(deleteTarget.id, { expectedRevision: 0, expectedGeneration: 1 }),
    error => error instanceof PERSISTENCE.ConflictError && error.details.actual === 2
  );
  assertions += 1;
  check(Boolean(await deleteRaceRepository.getResource(deleteTarget.id)) && Boolean(await deleteRaceRepository.getResource("remote-addition")), "A delete based on a stale library generation cannot remove its target or endanger an unrelated tab's addition");
  await deleteRaceRepository.softDelete(deleteTarget.id, { expectedRevision: 0, expectedGeneration: 2, now: NOW });
  const afterSuccessfulDelete = await deleteRaceRepository.getSnapshot();
  check(afterSuccessfulDelete.draft === null && !afterSuccessfulDelete.library.some(item => item.id === deleteTarget.id) && afterSuccessfulDelete.library.some(item => item.id === "remote-addition"), "A successful delete atomically clears a draft for its target while retaining unrelated current work");
  await deleteRaceRepository.close();

  await repository.close();
  console.log(`Build 7 reliability tests passed · ${assertions} assertions`);
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
