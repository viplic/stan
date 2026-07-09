const TYPE_COLORS = {
  zone: "#2dd4bf",
  wall: "#cbd5e1",
  door: "#f59e0b",
  window: "#60a5fa",
  furniture: "#8b5cf6",
  hotspot: "#fb7185"
};

export function renderEditorCanvas(canvas, scene, selectedId, onSelect) {
  const ctx = canvas.getContext("2d");
  const width = canvas.clientWidth || 760;
  const height = canvas.clientHeight || 520;
  const scale = Math.min(width / 100, height / 70);
  const offsetX = (width - 100 * scale) / 2;
  const offsetY = (height - 70 * scale) / 2;
  canvas.width = Math.max(1, Math.floor(width * devicePixelRatio));
  canvas.height = Math.max(1, Math.floor(height * devicePixelRatio));
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#111916";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(167, 176, 170, .12)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= 100; x += 5) {
    ctx.beginPath();
    ctx.moveTo(offsetX + x * scale, offsetY);
    ctx.lineTo(offsetX + x * scale, offsetY + 70 * scale);
    ctx.stroke();
  }
  for (let y = 0; y <= 70; y += 5) {
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + y * scale);
    ctx.lineTo(offsetX + 100 * scale, offsetY + y * scale);
    ctx.stroke();
  }

  const ordered = Object.values(scene.nodes).filter((node) => ["zone", "wall", "door", "window", "furniture", "hotspot"].includes(node.type));
  ordered.forEach((node) => {
    const x = offsetX + node.position.x * scale;
    const y = offsetY + node.position.y * scale;
    const w = node.size.width * scale;
    const h = node.size.height * scale;
    const color = node.color || TYPE_COLORS[node.type] || TYPE_COLORS.furniture;
    ctx.save();
    if (node.type === "hotspot") {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, Math.max(6, Math.min(w, h) / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f1412";
      ctx.font = "700 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("i", x + w / 2, y + h / 2);
    } else {
      ctx.globalAlpha = node.type === "zone" ? .2 : .85;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = color;
      ctx.lineWidth = node.id === selectedId ? 3 : node.type === "zone" ? 1 : 2;
      ctx.strokeRect(x, y, w, h);
      if (node.type !== "wall") {
        ctx.fillStyle = "#f8fafc";
        ctx.font = `${Math.max(10, Math.min(13, scale * 1.5))}px Inter, sans-serif`;
        ctx.fillText(node.label, x + 6, y + Math.min(18, h - 4));
      }
    }
    if (node.id === selectedId && node.type !== "hotspot") {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "#f8fafc";
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
    }
    ctx.restore();
  });

  canvas.onclick = (event) => {
    const rect = canvas.getBoundingClientRect();
    const px = (event.clientX - rect.left - offsetX) / scale;
    const py = (event.clientY - rect.top - offsetY) / scale;
    const hit = ordered.slice().reverse().find((node) => px >= node.position.x && px <= node.position.x + node.size.width && py >= node.position.y && py <= node.position.y + node.size.height);
    onSelect(hit?.id || null);
  };
}
