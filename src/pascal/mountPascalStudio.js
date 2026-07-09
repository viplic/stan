import { createEditorController } from "../editor/editorUi.js";

export async function mountPascalStudio({ mountNode, fallbackNode, fallbackStore, mode = "standalone", listingId = null, listingTitle = "", listingLocation = "", initialScene = null, onSave, onBack, onPreview }) {
  try {
    if (!("WebGLRenderingContext" in window) && !("gpu" in navigator)) {
      throw new Error("Ovaj browser nema WebGL ili WebGPU podršku.");
    }
    const [{ default: React }, { createRoot }, { default: PascalStudio }] = await Promise.all([
      import("react"),
      import("react-dom/client"),
      import("./PascalStudio.jsx")
    ]);
    const root = createRoot(mountNode);
    root.render(React.createElement(PascalStudio, { mode, listingId, listingTitle, listingLocation, initialScene, onSave, onBack, onPreview }));
    fallbackNode.hidden = true;
    return () => {
      root.unmount();
      mountNode.replaceChildren();
    };
  } catch (error) {
    mountNode.innerHTML = `<div class="pascal-runtime-warning"><strong>Pascal editor nije dostupan u ovom browseru.</strong><span>${escapeHtml(error.message)}</span></div>`;
    fallbackNode.hidden = false;
    const fallback = createEditorController({ root: fallbackNode, store: fallbackStore, onPreview });
    return () => fallback.destroy?.();
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character]));
}
