const DRAFTS_KEY = "stan360:listings:drafts";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function createListingDraftId() {
  const suffix = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `draft_${suffix}`;
}

export function listingSceneKey(listingId) {
  return `stan360:listing:${listingId}:pascalScene`;
}

export function listingMetadataKey(listingId) {
  return `stan360:listing:${listingId}:metadata`;
}

export function loadListingMetadata(listingId) {
  return readJson(listingMetadataKey(listingId), null);
}

export function saveListingMetadata(listingId, metadata) {
  const drafts = readJson(DRAFTS_KEY, {});
  drafts[listingId] = { ...(drafts[listingId] || {}), ...metadata, listingId, updatedAt: new Date().toISOString() };
  writeJson(DRAFTS_KEY, drafts);
  writeJson(listingMetadataKey(listingId), drafts[listingId]);
  return drafts[listingId];
}

export function loadListingScene(listingId) {
  return readJson(listingSceneKey(listingId), null);
}

export function saveListingScene(listingId, scene) {
  const savedAt = new Date().toISOString();
  const payload = { ...scene, sceneUpdatedAt: savedAt };
  writeJson(listingSceneKey(listingId), payload);
  saveListingMetadata(listingId, { hasPascalScene: true, sceneUpdatedAt: savedAt, sceneDraftKey: listingSceneKey(listingId) });
  return payload;
}

export function migrateListingDraft(fromId, toId) {
  const metadata = loadListingMetadata(fromId);
  const scene = loadListingScene(fromId);
  if (metadata) saveListingMetadata(toId, { ...metadata, listingId: toId, sceneDraftKey: scene ? listingSceneKey(toId) : metadata.sceneDraftKey });
  if (scene) saveListingScene(toId, scene);
  return { metadata, scene };
}
