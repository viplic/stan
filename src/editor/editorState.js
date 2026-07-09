const STORAGE_KEY = "stan360:editor-draft:v1";

const NODE_DEFAULTS = {
  site: { label: "Lokacija", kind: "site" },
  building: { label: "Zgrada", kind: "building" },
  level: { label: "Nivo", kind: "level" },
  zone: { label: "Nova prostorija", kind: "zone" },
  wall: { label: "Novi zid", kind: "wall" },
  door: { label: "Nova vrata", kind: "door" },
  window: { label: "Novi prozor", kind: "window" },
  furniture: { label: "Nameštaj", kind: "furniture" },
  hotspot: { label: "Nova tačka", kind: "hotspot" }
};

const DEMO_NODES = {
  site: { id: "site-1", type: "site", label: "Stan360 projekat", parentId: null, position: { x: 0, y: 0 }, size: { width: 100, height: 70 } },
  building: { id: "building-1", type: "building", label: "Stambena jedinica", parentId: "site-1", position: { x: 0, y: 0 }, size: { width: 100, height: 70 } },
  level: { id: "level-1", type: "level", label: "Prizemlje", parentId: "building-1", position: { x: 0, y: 0 }, size: { width: 100, height: 70 } },
  living: { id: "zone-living", type: "zone", label: "Dnevna soba", parentId: "level-1", position: { x: 8, y: 10 }, size: { width: 42, height: 29 }, color: "#2dd4bf" },
  kitchen: { id: "zone-kitchen", type: "zone", label: "Kuhinja", parentId: "level-1", position: { x: 52, y: 10 }, size: { width: 40, height: 29 }, color: "#60a5fa" },
  bedroom: { id: "zone-bedroom", type: "zone", label: "Spavaća soba", parentId: "level-1", position: { x: 8, y: 44 }, size: { width: 42, height: 20 }, color: "#f59e0b" },
  bath: { id: "zone-bath", type: "zone", label: "Kupatilo", parentId: "level-1", position: { x: 52, y: 44 }, size: { width: 18, height: 20 }, color: "#a78bfa" },
  hall: { id: "zone-hall", type: "zone", label: "Hodnik", parentId: "level-1", position: { x: 72, y: 44 }, size: { width: 20, height: 20 }, color: "#94a3b8" },
  "door-1": { id: "door-1", type: "door", label: "Ulaz", parentId: "level-1", position: { x: 48, y: 65 }, size: { width: 5, height: 2 }, rotation: 0 },
  "door-2": { id: "door-2", type: "door", label: "Dnevna / kuhinja", parentId: "level-1", position: { x: 50, y: 22 }, size: { width: 4, height: 2 }, rotation: 90 },
  "window-1": { id: "window-1", type: "window", label: "Veliki prozor", parentId: "zone-living", position: { x: 25, y: 10 }, size: { width: 18, height: 2 }, rotation: 0 },
  "hotspot-1": { id: "hotspot-1", type: "hotspot", label: "Pogled kroz prozor", parentId: "zone-living", position: { x: 33, y: 22 }, size: { width: 4, height: 4 }, description: "Prirodno svetlo i pogled na ulicu." },
  "furniture-1": { id: "furniture-1", type: "furniture", label: "Sofa", parentId: "zone-living", position: { x: 16, y: 28 }, size: { width: 18, height: 5 }, rotation: 0 }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createScene(nodes = DEMO_NODES) {
  return {
    version: 1,
    name: "Novi stan",
    nodes: clone(nodes),
    rootNodeIds: ["site-1"],
    selectedId: "zone-living",
    updatedAt: new Date().toISOString()
  };
}

export function createEditorStore(options = {}) {
  const storageKey = options.storageKey || STORAGE_KEY;
  let scene = loadDraft(storageKey) || createScene();
  let past = [];
  let future = [];
  const listeners = new Set();

  function notify() {
    scene.updatedAt = new Date().toISOString();
    listeners.forEach((listener) => listener(getState()));
  }

  function commit(nextScene) {
    past.push(clone(scene));
    if (past.length > 50) past.shift();
    scene = nextScene;
    future = [];
    notify();
  }

  function getState() {
    return { scene: clone(scene), canUndo: past.length > 0, canRedo: future.length > 0 };
  }

  return {
    getState,
    subscribe(listener) {
      listeners.add(listener);
      listener(getState());
      return () => listeners.delete(listener);
    },
    createNode(type, values = {}) {
      const base = NODE_DEFAULTS[type] || NODE_DEFAULTS.furniture;
      const id = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const parentId = values.parentId || scene.selectedId || "level-1";
      const { id: _ignoredId, type: _ignoredType, ...safeValues } = clone(values);
      const node = {
        id,
        type,
        label: values.label || base.label,
        parentId,
        position: { x: 38, y: 28 },
        size: { width: 12, height: 8 },
        ...safeValues,
        id,
        type,
        label: values.label || base.label,
        parentId,
        position: values.position || { x: 38, y: 28 },
        size: values.size || { width: 12, height: 8 }
      };
      const next = clone(scene);
      next.nodes[id] = node;
      next.selectedId = id;
      commit(next);
    },
    updateNode(id, patch) {
      if (!scene.nodes[id]) return;
      const next = clone(scene);
      next.nodes[id] = { ...next.nodes[id], ...clone(patch) };
      commit(next);
    },
    deleteNode(id) {
      if (!scene.nodes[id] || ["site", "building", "level"].includes(scene.nodes[id].type)) return;
      const next = clone(scene);
      const ids = [id];
      for (let index = 0; index < ids.length; index += 1) {
        ids.push(...Object.values(next.nodes).filter((node) => node.parentId === ids[index]).map((node) => node.id));
      }
      ids.forEach((nodeId) => delete next.nodes[nodeId]);
      next.selectedId = "level-1";
      commit(next);
    },
    duplicateNode(id) {
      const source = scene.nodes[id];
      if (!source || ["site", "building", "level"].includes(source.type)) return;
      this.createNode(source.type, { ...clone(source), id: undefined, label: `${source.label} kopija`, position: { x: source.position.x + 3, y: source.position.y + 3 } });
    },
    selectNode(id) {
      if (!scene.nodes[id] || scene.selectedId === id) return;
      scene = { ...scene, selectedId: id };
      notify();
    },
    undo() {
      if (!past.length) return;
      future.push(clone(scene));
      scene = past.pop();
      notify();
    },
    redo() {
      if (!future.length) return;
      past.push(clone(scene));
      scene = future.pop();
      notify();
    },
    save() {
      localStorage.setItem(storageKey, JSON.stringify(scene));
      notify();
    },
    reset() {
      past.push(clone(scene));
      scene = createScene();
      future = [];
      localStorage.removeItem(storageKey);
      notify();
    },
    exportJson() {
      return JSON.stringify(scene, null, 2);
    }
  };
}

function loadDraft(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft?.nodes || !draft?.rootNodeIds) return null;
    return draft;
  } catch {
    return null;
  }
}

export const editorNodeTypes = Object.keys(NODE_DEFAULTS);
