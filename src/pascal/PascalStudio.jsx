import { Editor } from "@pascal-app/editor";
import { useScene } from "@pascal-app/core";
import React, { Component, useEffect, useMemo, useState } from "react";

export class PascalStudioErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="pascal-fallback-screen">
          <strong>Pascal Studio nije mogao da se pokrene</strong>
          <span>Postojeći stan360 editor je spreman kao fallback. Detalj: {this.state.error.message || "nepoznata greška"}</span>
          <button className="primary-button" onClick={() => this.setState({ error: null })}>Pokušaj ponovo</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PascalStudio({ mode = "standalone", listingId = null, listingTitle = "", listingLocation = "", initialScene = null, onSave, onBack, onPreview }) {
  const [graphics, setGraphics] = useState("checking");
  const [saveState, setSaveState] = useState("Draft spreman");
  const nodes = useScene((scene) => scene.nodes);
  const storageKey = listingId ? `stan360:listing:${listingId}:pascalScene` : "stan360:pascal-scene:v1";

  useEffect(() => {
    setGraphics(typeof navigator !== "undefined" && "gpu" in navigator ? "webgpu" : "fallback");
  }, []);

  const saveScene = async (scene) => {
    localStorage.setItem(storageKey, JSON.stringify(scene));
    await onSave?.(scene);
    setSaveState("Sačuvano lokalno");
  };

  const loadScene = async () => {
    try {
      if (initialScene?.nodes && initialScene?.rootNodeIds) return initialScene;
      const draft = JSON.parse(localStorage.getItem(storageKey) || "null");
      return draft?.nodes && draft?.rootNodeIds ? draft : null;
    } catch {
      return null;
    }
  };

  const exportScene = () => {
    const scene = useScene.getState();
    const payload = JSON.stringify({ nodes: scene.nodes, rootNodeIds: scene.rootNodeIds }, null, 2);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    link.download = "stan360-pascal-scene.json";
    link.click();
    URL.revokeObjectURL(link.href);
    setSaveState("JSON exportovan");
  };

  const toolbar = useMemo(() => (
    <div className="pascal-host-toolbar">
      <span className="pascal-host-brand">stan360 <b>{mode === "embedded" ? "3D editor oglasa" : "Studio"}</b>{listingTitle ? <small> · {listingTitle}{listingLocation ? ` · ${listingLocation}` : ""}</small> : null}</span>
      <span className={`pascal-graphics-status ${graphics}`}>{graphics === "webgpu" ? "WebGPU spreman" : graphics === "fallback" ? "WebGPU nije dostupan" : "Provera grafike…"}</span>
      <button className="pascal-host-button" onClick={exportScene}>Export JSON</button>
      <button className="pascal-host-button" onClick={() => onPreview({ nodes, rootNodeIds: useScene.getState().rootNodeIds })}>Preview</button>
      <button className="pascal-host-button primary" onClick={() => saveScene({ nodes: useScene.getState().nodes, rootNodeIds: useScene.getState().rootNodeIds })}>{saveState}</button>
      <button className="pascal-host-button" onClick={onBack}>Nazad na oglase</button>
    </div>
  ), [graphics, nodes, onBack, onPreview, saveState]);

  return (
    <div className="pascal-studio-root">
      <div className="pascal-mobile-warning">Pascal Studio je najudobniji na desktopu. Na telefonu koristi landscape orijentaciju.</div>
      <PascalStudioErrorBoundary>
        <Editor
          layoutVersion="v2"
          navbarSlot={toolbar}
          projectId={listingId || "stan360-local-studio"}
          onLoad={loadScene}
          onSave={saveScene}
          onDirty={() => setSaveState("Nes sačuvano")}
          onSaveStatusChange={(status) => setSaveState(status === "saved" ? "Sačuvano" : "Nije sačuvano")}
        />
      </PascalStudioErrorBoundary>
    </div>
  );
}
