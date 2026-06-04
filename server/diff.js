// diff.js — Compares two versions of a Figma file and returns a structured changelog.

const POSITION_THRESHOLD = 1; // ignore moves smaller than 1px
const SIZE_THRESHOLD = 1; // ignore resizes smaller than 1px

/**
 * Walk a Figma file tree and build a flat map of { nodeId → node }
 * Also tracks each node's parent frame name for grouping.
 */
function flattenTree(node, parentFrame = null, map = new Map()) {
  // Determine the current frame context
  let currentFrame = parentFrame;
  if (node.type === "FRAME" && parentFrame === null) {
    // This is a top-level frame (direct child of a page)
    currentFrame = node.name;
  }

  // Store this node with its frame context
  map.set(node.id, {
    id: node.id,
    name: node.name,
    type: node.type,
    parentFrame: currentFrame,
    x: node.absoluteBoundingBox?.x ?? null,
    y: node.absoluteBoundingBox?.y ?? null,
    width: node.absoluteBoundingBox?.width ?? null,
    height: node.absoluteBoundingBox?.height ?? null,
    characters: node.characters ?? null,
  });

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      flattenTree(child, currentFrame, map);
    }
  }

  return map;
}

/**
 * Compare two flattened node maps and return a list of changes.
 */
function compareNodes(fromMap, toMap) {
  const changes = [];

  // Check for removed and modified nodes
  for (const [id, fromNode] of fromMap) {
    if (!toMap.has(id)) {
      // Node was removed
      if (fromNode.parentFrame) {
        changes.push({
          type: "removed",
          name: fromNode.name,
          parentFrame: fromNode.parentFrame,
          delta: "frame deleted",
        });
      }
      continue;
    }

    const toNode = toMap.get(id);

    // Skip document-level and page-level nodes
    if (!fromNode.parentFrame) continue;

    // Check for text changes
    if (
      fromNode.characters !== null &&
      toNode.characters !== null &&
      fromNode.characters !== toNode.characters
    ) {
      changes.push({
        type: "text",
        name: fromNode.name,
        parentFrame: fromNode.parentFrame,
        delta: `"${truncate(fromNode.characters)}" → "${truncate(toNode.characters)}"`,
      });
      continue; // Don't report move/resize if text changed — text is the main story
    }

    // Check for moved
    if (
      fromNode.x !== null &&
      toNode.x !== null &&
      (Math.abs(fromNode.x - toNode.x) > POSITION_THRESHOLD ||
        Math.abs(fromNode.y - toNode.y) > POSITION_THRESHOLD)
    ) {
      const dx = Math.round(toNode.x - fromNode.x);
      const dy = Math.round(toNode.y - fromNode.y);
      const parts = [];
      if (dx !== 0)
        parts.push(`${dx > 0 ? "+" : ""}${dx}px ${dx > 0 ? "right" : "left"}`);
      if (dy !== 0)
        parts.push(`${dy > 0 ? "+" : ""}${dy}px ${dy > 0 ? "down" : "up"}`);

      changes.push({
        type: "moved",
        name: fromNode.name,
        parentFrame: fromNode.parentFrame,
        delta: parts.join(", "),
      });
    }

    // Check for resized
    if (
      fromNode.width !== null &&
      toNode.width !== null &&
      (Math.abs(fromNode.width - toNode.width) > SIZE_THRESHOLD ||
        Math.abs(fromNode.height - toNode.height) > SIZE_THRESHOLD)
    ) {
      changes.push({
        type: "resized",
        name: fromNode.name,
        parentFrame: fromNode.parentFrame,
        delta: `${Math.round(fromNode.width)}×${Math.round(fromNode.height)} → ${Math.round(toNode.width)}×${Math.round(toNode.height)}`,
      });
    }
  }

  // Check for added nodes
  for (const [id, toNode] of toMap) {
    if (!fromMap.has(id) && toNode.parentFrame) {
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

/**
 * Truncate a string for display in deltas.
 */
function truncate(str, max = 20) {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

/**
 * Group a flat list of changes by their parent frame.
 */
function groupByFrame(changes) {
  const frameMap = new Map();

  for (const change of changes) {
    const frame = change.parentFrame || "Other";
    if (!frameMap.has(frame)) {
      frameMap.set(frame, []);
    }
    frameMap.get(frame).push({
      type: change.type,
      name: change.name,
      delta: change.delta,
    });
  }

  const sections = [];
  for (const [name, changes] of frameMap) {
    sections.push({ name, changes });
  }

  return sections;
}

/**
 * Main diff function. Takes two Figma file JSON responses and returns
 * a structured changelog.
 */
export function diff(fromFile, toFile) {
  // Walk the document tree starting from the pages
  const fromPages = fromFile.document?.children || [];
  const toPages = toFile.document?.children || [];

  const fromMap = new Map();
  const toMap = new Map();

  for (const page of fromPages) {
    flattenTree(page, null, fromMap);
  }
  for (const page of toPages) {
    flattenTree(page, null, toMap);
  }

  const changes = compareNodes(fromMap, toMap);
  const sections = groupByFrame(changes);

  return {
    totalChanges: changes.length,
    sections,
  };
}
