// diff.js – Compares two versions of a Figma file and returns a structured changelog.

const POSITION_THRESHOLD = 1;
const SIZE_THRESHOLD = 1;
const SKIP_TYPES = new Set(["DOCUMENT", "CANVAS"]);
// Containers that shouldn't become the grouping label themselves
const TRANSPARENT_TYPES = new Set(["SECTION"]);

function rgbaHex(color, opacity) {
  if (!color) return "";
  const to255 = (v) => Math.round((v ?? 0) * 255);
  const hex = [to255(color.r), to255(color.g), to255(color.b)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  const alpha = (color.a ?? 1) * (opacity ?? 1);
  return alpha < 0.999 ? `#${hex} ${Math.round(alpha * 100)}%` : `#${hex}`;
}

function paintSig(paints) {
  if (!Array.isArray(paints)) return null;
  const visible = paints.filter((p) => p.visible !== false);
  if (visible.length === 0) return "none";
  return visible
    .map((p) =>
      p.type === "SOLID"
        ? rgbaHex(p.color, p.opacity)
        : `${p.type}(${(p.gradientStops ?? []).map((s) => rgbaHex(s.color)).join(",")}),`,
    )
    .join(" + ");
}

function typeSig(style) {
  if (!style) return null;
  const parts = [];
  if (style.fontFamily) parts.push(style.fontFamily);
  if (style.fontWeight) parts.push(String(style.fontWeight));
  if (style.fontSize) parts.push(`${Math.round(style.fontSize)}px`);
  if (style.lineHeightPx) parts.push(`${Math.round(style.lineHeightPx)}/lh`);
  if (typeof style.letterSpacing === "number" && style.letterSpacing !== 0)
    parts.push(`${style.letterSpacing.toFixed(1)}ls`);
  if (style.textCase && style.textCase !== "ORIGINAL")
    parts.push(style.textCase);
  return parts.length ? parts.join(" ") : null;
}

function flattenTree(
  node,
  parentFrame = null,
  parentId = null,
  map = new Map(),
) {
  let currentFrame = parentFrame;
  if (
    parentFrame === null &&
    !SKIP_TYPES.has(node.type) &&
    !TRANSPARENT_TYPES.has(node.type)
  ) {
    // First real container below the page, whatever its type
    currentFrame = node.name;
  }

  map.set(node.id, {
    id: node.id,
    name: node.name,
    parentFrame: currentFrame,
    parentId,
    x: node.absoluteBoundingBox?.x ?? null,
    y: node.absoluteBoundingBox?.y ?? null,
    width: node.absoluteBoundingBox?.width ?? null,
    height: node.absoluteBoundingBox?.height ?? null,
    characters: node.characters ?? null,
    fills: paintSig(node.fills),
    strokes: paintSig(node.strokes),
    strokeWeight: node.strokeWeight ?? null,
    opacity: node.opacity ?? 1,
    visible: node.visible !== false,
    typography: typeSig(node.style),
    cornerRadius: node.cornerRadius ?? null,
  });

  if (node.children) {
    for (const child of node.children) {
      flattenTree(child, currentFrame, node.id, map);
    }
  }

  return map;
}

// How far a node's parent moved, so a dragged frame doesn't report every descendant as individually moved
function parentDelta(node, fromMap, toMap) {
  const pFrom = node.parentId ? fromMap.get(node.parentId) : null;
  const pTo = node.parentId ? toMap.get(node.parentId) : null;
  if (!pFrom || !pTo || pFrom.x === null || pTo.x === null)
    return { dx: 0, dy: 0 };
  return { dx: pTo.x - pFrom.x, dy: pTo.y - pFrom.y };
}

function compareNodes(fromMap, toMap) {
  const changes = [];

  for (const [id, fromNode] of fromMap) {
    if (SKIP_TYPES.has(fromNode.type)) continue;

    if (!toMap.has(id)) {
      changes.push({
        type: "removed",
        name: fromNode.name,
        parentFrame: fromNode.parentFrame,
        delta: "deleted",
      });
      continue;
    }

    const toNode = toMap.get(id);
    const push = (type, delta) =>
      changes.push({
        type,
        name: fromNode.name,
        parentFrame: fromNode.parentFrame,
        delta,
      });

    // Visibility
    if (fromNode.visible !== toNode.visible) {
      push("visibility", toNode.visible ? "shown" : "hidden");
      continue;
    }

    // Text content
    if (
      fromNode.characters !== null &&
      toNode.characters !== null &&
      fromNode.characters !== toNode.characters
    ) {
      push(
        "text",
        `"${truncate(fromNode.characters)}" → "${truncate(toNode.characters)}"`,
      );
    }

    // Typography
    if (
      fromNode.typography &&
      toNode.typography &&
      fromNode.typography !== toNode.typography
    ) {
      push("typography", `${fromNode.typography} → ${toNode.typography}`);
    }

    // Fill
    if (fromNode.fills && toNode.fills && fromNode.fills !== toNode.fills) {
      push("fill", `${fromNode.fills} → ${toNode.fills}`);
    }

    // Stroke
    if (
      fromNode.strokes &&
      toNode.strokes &&
      fromNode.strokes !== toNode.strokes
    ) {
      push("stroke", `${fromNode.strokes} → ${toNode.strokes}`);
    } else if (
      fromNode.strokeWeight !== null &&
      toNode.strokeWeight !== null &&
      fromNode.strokeWeight !== toNode.strokeWeight
    ) {
      push("stroke", `${fromNode.strokeWeight}px → ${toNode.strokeWeight}px`);
    }

    // Opacity
    if (Math.abs(fromNode.opacity - toNode.opacity) > 0.001) {
      push(
        "opacity",
        `${Math.round(fromNode.opacity * 100)}% → ${Math.round(toNode.opacity * 100)}%`,
      );
    }

    // Corner radius
    if (
      fromNode.cornerRadius !== null &&
      toNode.cornerRadius !== null &&
      fromNode.cornerRadius !== toNode.cornerRadius
    ) {
      push("radius", `${fromNode.cornerRadius}px → ${toNode.cornerRadius}px`);
    }

    // Moved, net of any movement inherited from the parent
    if (fromNode.x !== null && toNode.x !== null) {
      const pd = parentDelta(fromNode, fromMap, toMap);
      const dx = Math.round(toNode.x - fromNode.x - pd.dx);
      const dy = Math.round(toNode.y - fromNode.y - pd.dy);
      if (
        Math.abs(dx) > POSITION_THRESHOLD ||
        Math.abs(dy) > POSITION_THRESHOLD
      ) {
        const parts = [];
        if (dx !== 0)
          parts.push(
            `${dx > 0 ? "+" : ""}${dx}px ${dx > 0 ? "right" : "left"}`,
          );
        if (dy !== 0)
          parts.push(`${dy > 0 ? "+" : ""}${dy}px ${dy > 0 ? "down" : "up"}`);
        push("moved", parts.join(", "));
      }
    }

    // Resized
    if (
      fromNode.width !== null &&
      toNode.width !== null &&
      (Math.abs(fromNode.width - toNode.width) > SIZE_THRESHOLD ||
        Math.abs(fromNode.height - toNode.height) > SIZE_THRESHOLD)
    ) {
      push(
        "resized",
        `${Math.round(fromNode.width)}×${Math.round(fromNode.height)} → ${Math.round(toNode.width)}×${Math.round(toNode.height)}`,
      );
    }
  }

  for (const [id, toNode] of toMap) {
    if (!fromMap.has(id) && !SKIP_TYPES.has(toNode.type)) {
      changes.push({
        type: "added",
        name: toNode.name,
        parentFrame: toNode.parentFrame,
        delta: "new element",
      });
    }
  }

  return changes;
}

function truncate(str, max = 20) {
  if (str.length <= max) return str;
  return str.slice(0, max) + "...";
}

function groupByFrame(changes, fromMap, toMap) {
  const frameMap = new Map();
  const findId = (name) => {
    for (const map of [fromMap, toMap]) {
      for (const [id, node] of map) {
        if (node.name === name && node.parentFrame === name) return id;
      }
    }
    return null;
  };

  for (const change of changes) {
    const frame = change.parentFrame || "Other";
    if (!frameMap.has(frame)) {
      frameMap.set(frame, { id: findId(frame), changes: [] });
    }
    frameMap.get(frame).changes.push({
      type: change.type,
      name: change.name,
      delta: change.delta,
    });
  }

  return [...frameMap].map(([name, data]) => ({
    name,
    id: data.id,
    changes: data.changes,
  }));
}

export function diff(fromFile, toFile) {
  const fromMap = new Map();
  const toMap = new Map();

  for (const page of fromFile.document?.children || []) {
    flattenTree(page, null, null, fromMap);
  }
  for (const page of toFile.document?.children || []) {
    flattenTree(page, null, null, toMap);
  }

  const changes = compareNodes(fromMap, toMap);
  const sections = groupByFrame(changes, fromMap, toMap);

  return { totalChanges: changes.length, sections };
}
