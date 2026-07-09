import { renderEditorCanvas } from "./editorRenderer.js";

const TOOL_DEFS = [
  ["select", "Select", "↖"],
  ["wall", "Wall", "╱"],
  ["zone", "Room / Zone", "□"],
  ["door", "Door", "⌒"],
  ["window", "Window", "▥"],
  ["furniture", "Furniture", "▰"],
  ["hotspot", "Hotspot", "●"]
];

const TYPE_LABELS = { site: "Site", building: "Building", level: "Level", zone: "Room / Zone", wall: "Wall", door: "Door", window: "Window", furniture: "Furniture", hotspot: "Hotspot" };

export function createEditorController({ root, store, onPreview }) {
  let activeTool = "select";
  let state = store.getState();
  let noticeTimer;

  root.innerHTML = `
    <div class="studio-shell">
      <div class="studio-header">
        <div>
          <p class="eyebrow">stan360 studio</p>
          <h1>Apartment editor</h1>
          <p>Pripremi prostorije, zidove i tačke za interaktivni 3D oglas.</p>
        </div>
        <div class="studio-header-actions">
          <span class="studio-save-state" id="studioSaveState">Draft spreman</span>
          <button class="ghost-button" data-editor-action="undo" title="Undo">↶</button>
          <button class="ghost-button" data-editor-action="redo" title="Redo">↷</button>
          <button class="primary-small-button" data-editor-action="save">Sačuvaj draft</button>
        </div>
      </div>
      <div class="studio-mobile-note">Editor je najudobniji na desktopu. Na telefonu koristi se kao pregled i brza izmena scene.</div>
      <div class="studio-workspace">
        <aside class="studio-panel studio-tools">
          <div class="studio-panel-heading"><span>Tools</span><small>Scene actions</small></div>
          <div class="studio-tool-list">${TOOL_DEFS.map(([id, label, icon]) => `<button class="studio-tool ${id === activeTool ? "active" : ""}" data-tool="${id}"><b>${icon}</b><span>${label}</span></button>`).join("")}</div>
          <div class="studio-divider"></div>
          <button class="studio-wide-button" data-editor-action="add">+ Dodaj ${TYPE_LABELS[activeTool] || "objekat"}</button>
          <button class="studio-wide-button" data-editor-action="duplicate">Dupliraj selekciju</button>
          <button class="studio-danger-button" data-editor-action="delete">Obriši selekciju</button>
        </aside>
        <section class="studio-canvas-panel">
          <div class="studio-canvas-toolbar"><span>Prizemlje / Floor plan</span><span id="studioNodeCount">0 nodes</span></div>
          <div class="studio-canvas-wrap"><canvas id="studioCanvas" aria-label="Editor plana stana"></canvas><div class="studio-canvas-empty" id="studioCanvasEmpty" hidden>Dodaj prvi element scene da počneš.</div></div>
          <div class="studio-bottom-bar"><button class="ghost-button" data-editor-action="reset">Reset scene</button><button class="secondary-button" data-editor-action="export">Export JSON</button><button class="primary-button" data-editor-action="preview">Preview walkthrough</button></div>
        </section>
        <aside class="studio-panel studio-inspector">
          <div class="studio-panel-heading"><span>Inspector</span><small id="studioSelectionType">Nothing selected</small></div>
          <div id="studioInspectorContent" class="studio-inspector-content"></div>
          <div class="studio-hierarchy"><div class="studio-panel-heading"><span>Scene</span><small id="studioSceneName">Novi stan</small></div><div id="studioTree"></div></div>
        </aside>
      </div>
      <div class="studio-toast" id="studioToast" role="status" aria-live="polite"></div>
    </div>
  `;

  const canvas = root.querySelector("#studioCanvas");
  const toast = (message) => {
    const element = root.querySelector("#studioToast");
    element.textContent = message;
    element.classList.add("visible");
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => element.classList.remove("visible"), 2200);
  };

  function render(nextState = state) {
    state = nextState;
    const selected = state.scene.nodes[state.scene.selectedId];
    root.querySelector("#studioNodeCount").textContent = `${Object.keys(state.scene.nodes).length} nodes`;
    root.querySelector("#studioSceneName").textContent = state.scene.name;
    root.querySelector("#studioSaveState").textContent = state.scene.updatedAt ? `Sačuvano ${new Date(state.scene.updatedAt).toLocaleTimeString("sr-RS", { hour: "2-digit", minute: "2-digit" })}` : "Draft spreman";
    root.querySelectorAll("[data-tool]").forEach((button) => button.classList.toggle("active", button.dataset.tool === activeTool));
    root.querySelector("#studioSelectionType").textContent = selected ? TYPE_LABELS[selected.type] : "Nothing selected";
    renderEditorCanvas(canvas, state.scene, state.scene.selectedId, (id) => {
      if (id) store.selectNode(id);
    });
    renderInspector(selected);
    renderTree();
  }

  function renderInspector(selected) {
    const content = root.querySelector("#studioInspectorContent");
    if (!selected) {
      content.innerHTML = `<div class="studio-empty-state"><strong>Nothing selected</strong><span>Izaberi prostoriju ili objekat na planu.</span></div>`;
      return;
    }
    content.innerHTML = `
      <label>Ime<input data-field="label" value="${escapeAttr(selected.label)}" /></label>
      <label>Tip<select data-field="type" ${["site", "building", "level"].includes(selected.type) ? "disabled" : ""}>${Object.entries(TYPE_LABELS).map(([value, label]) => `<option value="${value}" ${value === selected.type ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      <div class="studio-two-fields"><label>X<input data-field="x" type="number" step="1" value="${selected.position.x}" /></label><label>Y<input data-field="y" type="number" step="1" value="${selected.position.y}" /></label></div>
      <div class="studio-two-fields"><label>Širina<input data-field="width" type="number" step="1" value="${selected.size.width}" /></label><label>Visina<input data-field="height" type="number" step="1" value="${selected.size.height}" /></label></div>
      ${selected.type === "hotspot" ? `<label>Opis<textarea data-field="description">${escapeHtml(selected.description || "")}</textarea></label>` : ""}
    `;
    content.querySelectorAll("[data-field]").forEach((field) => {
      field.addEventListener("change", () => {
        const patch = { [field.dataset.field]: field.value };
        if (["x", "y"].includes(field.dataset.field)) patch.position = { ...selected.position, [field.dataset.field]: Number(field.value) || 0 };
        if (["width", "height"].includes(field.dataset.field)) patch.size = { ...selected.size, [field.dataset.field]: Math.max(1, Number(field.value) || 1) };
        if (field.dataset.field === "type") patch.type = field.value;
        store.updateNode(selected.id, patch);
      });
    });
  }

  function renderTree() {
    const tree = root.querySelector("#studioTree");
    tree.innerHTML = Object.values(state.scene.nodes).map((node) => `<button class="studio-tree-row ${node.id === state.scene.selectedId ? "active" : ""}" data-node-id="${node.id}"><span class="studio-tree-dot type-${node.type}"></span><span>${escapeHtml(node.label)}</span><small>${TYPE_LABELS[node.type]}</small></button>`).join("");
    tree.querySelectorAll("[data-node-id]").forEach((button) => button.addEventListener("click", () => store.selectNode(button.dataset.nodeId)));
  }

  root.addEventListener("click", (event) => {
    const tool = event.target.closest("[data-tool]");
    if (tool) {
      activeTool = tool.dataset.tool;
      render();
      return;
    }
    const action = event.target.closest("[data-editor-action]")?.dataset.editorAction;
    if (!action) return;
    if (action === "undo") store.undo();
    if (action === "redo") store.redo();
    if (action === "save") { store.save(); toast("Draft je sačuvan u ovom browseru."); }
    if (action === "reset") { store.reset(); toast("Scene je vraćen na početni plan."); }
    if (action === "delete") { store.deleteNode(state.scene.selectedId); toast("Selekcija je obrisana."); }
    if (action === "duplicate") { store.duplicateNode(state.scene.selectedId); toast("Objekat je dupliran."); }
    if (action === "add") { store.createNode(activeTool === "select" ? "zone" : activeTool); toast("Element je dodat u scenu."); }
    if (action === "export") downloadJson(store.exportJson());
    if (action === "preview") onPreview(state.scene);
  });

  window.addEventListener("resize", () => render(), { passive: true });
  const unsubscribe = store.subscribe(render);
  render();
  return { destroy: unsubscribe, getScene: () => state.scene };
}

function escapeAttr(value) {
  return String(value).replace(/[&"<>]/g, (character) => ({ "&": "&amp;", "\"": "&quot;", "<": "&lt;", ">": "&gt;" }[character]));
}

function escapeHtml(value) {
  return escapeAttr(value).replace(/&#39;/g, "'");
}

function downloadJson(json) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "stan360-apartment-scene.json";
  link.click();
  URL.revokeObjectURL(url);
}
