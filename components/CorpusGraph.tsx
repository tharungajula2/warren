"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { forceSimulation, forceLink, forceManyBody, forceX, forceY } from "d3-force";
import { zoom as d3Zoom, zoomIdentity, ZoomTransform } from "d3-zoom";
import { select as d3Select } from "d3-selection";
import { AtomManifestItem } from "@/lib/schema";

interface CorpusGraphProps {
  atoms: Record<string, AtomManifestItem>;
  isEmbedded?: boolean;
  syntheticCount?: number;
}

interface GraphNode {
  id: string;
  title: string;
  domain: string;
  status: string;
  verified: boolean;
  readingMinutes: number;
  inDegree: number;
  radius: number;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: GraphNode;
  target: GraphNode;
  type: "prerequisite" | "related";
  kind?: "prerequisite" | "see_also" | "contrast_with";
}

// Luminous, high-contrast domain palette for pitch-black canvas background
const DOMAIN_COLORS: Record<string, string> = {
  foundation: "#D97706",
  "credit-risk": "#0284C7",
  impairment: "#16A34A",
  "regulatory-capital": "#DC2626",
  "treasury-alm": "#C026D3",
  "model-risk": "#2563EB",
  "risk-data": "#0D9488",
  "india-lending": "#65A30D",
  "business-analysis": "#A21CAF",
  technical: "#3B82F6",
  "quantitative": "#E11D48",
  regulatory: "#DC2626",
};

export function CorpusGraph({ atoms, isEmbedded = false, syntheticCount }: CorpusGraphProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isReady, setIsReady] = useState<boolean>(false);

  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const animFrameRef = useRef<number | null>(null);

  // Derive reverse index (in-degree) for all atoms
  const reverseIndex = useMemo(() => {
    const rev: Record<string, string[]> = {};
    Object.keys(atoms).forEach((id) => (rev[id] = []));
    Object.values(atoms).forEach((atom) => {
      atom.prerequisites.forEach((pId) => {
        if (rev[pId] && !rev[pId].includes(atom.id)) {
          rev[pId].push(atom.id);
        }
      });
    });
    return rev;
  }, [atoms]);

  // Max in-degree in manifest (for non-linear sqrt sizing map)
  const maxInDegree = useMemo(() => {
    let maxDeg = 1;
    Object.keys(atoms).forEach((id) => {
      const deg = reverseIndex[id]?.length || 0;
      if (deg > maxDeg) maxDeg = deg;
    });
    return maxDeg;
  }, [atoms, reverseIndex]);

  // Domain Centroids
  const domainCentroids = useMemo(() => {
    const domains = Array.from(new Set(Object.values(atoms).map((a) => a.domain)));
    const centroids: Record<string, { x: number; y: number }> = {};
    const radius = 480;
    domains.forEach((d, idx) => {
      const angle = (2 * Math.PI * idx) / domains.length;
      centroids[d] = {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      };
    });
    return centroids;
  }, [atoms]);

  // Build Graph Nodes & Edges (Two-pass builder: Prerequisite + Related)
  const { nodes, edges } = useMemo(() => {
    const nMap: Record<string, GraphNode> = {};
    const nodeList: GraphNode[] = [];

    Object.values(atoms).forEach((atom) => {
      const inDeg = reverseIndex[atom.id]?.length || 0;
      const r = 3.0 + Math.sqrt(inDeg / maxInDegree) * 4.0;
      const initialX = atom.initialX ?? (domainCentroids[atom.domain]?.x || 0);
      const initialY = atom.initialY ?? (domainCentroids[atom.domain]?.y || 0);

      const node: GraphNode = {
        id: atom.id,
        title: atom.title,
        domain: atom.domain,
        status: atom.status,
        verified: atom.verified,
        readingMinutes: atom.reading_minutes,
        inDegree: inDeg,
        radius: r,
        x: initialX,
        y: initialY,
      };
      nMap[atom.id] = node;
      nodeList.push(node);
    });

    const edgeList: GraphEdge[] = [];
    const prereqPairSet = new Set<string>();
    const edgePairSet = new Set<string>();

    // Pass 1: Prerequisite Edges (strong relationships)
    Object.values(atoms).forEach((atom) => {
      const targetNode = nMap[atom.id];
      if (!targetNode) return;
      atom.prerequisites.forEach((pId) => {
        const sourceNode = nMap[pId];
        if (sourceNode) {
          edgeList.push({
            source: sourceNode,
            target: targetNode,
            type: "prerequisite",
            kind: "prerequisite",
          });
          const unorientedKey = [pId, atom.id].sort().join("<->");
          prereqPairSet.add(unorientedKey);
          edgePairSet.add(unorientedKey);
        }
      });
    });

    // Pass 2: Related Edges (see_also and contrast_with)
    Object.values(atoms).forEach((atom) => {
      const sourceNode = nMap[atom.id];
      if (!sourceNode) return;

      const crossRefs = [
        ...(atom.see_also || []).map((id) => ({ id, kind: "see_also" as const })),
        ...(atom.contrast_with || []).map((id) => ({ id, kind: "contrast_with" as const })),
      ];

      crossRefs.forEach(({ id: targetId, kind }) => {
        const targetNode = nMap[targetId];
        if (!targetNode) return;

        const unorientedKey = [atom.id, targetId].sort().join("<->");

        // Rule 1: Never draw a related-to edge where a prerequisite edge already exists between the same two atoms
        if (prereqPairSet.has(unorientedKey)) return;

        // Rule 2: Deduplicate (e.g. QNT-25 references MRM-17 and MRM-17 references QNT-25; draw once)
        if (edgePairSet.has(unorientedKey)) return;

        edgePairSet.add(unorientedKey);
        edgeList.push({
          source: sourceNode,
          target: targetNode,
          type: "related",
          kind,
        });
      });
    });

    return { nodes: nodeList, edges: edgeList };
  }, [atoms, reverseIndex, maxInDegree, domainCentroids]);

  // Direct Neighbors map
  const neighborMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    nodes.forEach((n) => (map[n.id] = new Set()));
    edges.forEach((e) => {
      map[e.source.id]?.add(e.target.id);
      map[e.target.id]?.add(e.source.id);
    });
    return map;
  }, [nodes, edges]);

  // Domain Cluster Bounds & Counts
  const domainClusterBounds = useMemo(() => {
    const bounds: Record<
      string,
      { minX: number; maxX: number; minY: number; maxY: number; centerX: number; centerY: number; count: number }
    > = {};

    nodes.forEach((node) => {
      if (!bounds[node.domain]) {
        bounds[node.domain] = {
          minX: node.x,
          maxX: node.x,
          minY: node.y,
          maxY: node.y,
          centerX: node.x,
          centerY: node.y,
          count: 1,
        };
      } else {
        const b = bounds[node.domain];
        b.minX = Math.min(b.minX, node.x);
        b.maxX = Math.max(b.maxX, node.x);
        b.minY = Math.min(b.minY, node.y);
        b.maxY = Math.max(b.maxY, node.y);
        b.count++;
      }
    });

    Object.keys(bounds).forEach((dom) => {
      const b = bounds[dom];
      b.centerX = (b.minX + b.maxX) / 2;
      b.centerY = (b.minY + b.maxY) / 2;
    });

    return bounds;
  }, [nodes]);

  // Bounding box canvas fit (92% canvas fill)
  const fitGraphToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || nodes.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });

    const graphWidth = maxX - minX || 1;
    const graphHeight = maxY - minY || 1;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const deviceRatio = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / deviceRatio || canvas.clientWidth || window.innerWidth;
    const cssHeight = canvas.height / deviceRatio || canvas.clientHeight || window.innerHeight;

    const scaleX = (cssWidth * 0.92) / graphWidth;
    const scaleY = (cssHeight * 0.92) / graphHeight;
    const scale = Math.min(scaleX, scaleY, 2.5);

    const t = zoomIdentity.translate(-centerX * scale, -centerY * scale).scale(scale);
    transformRef.current = t;
  }, [nodes]);

  // Setup Canvas DPR & Pre-calculate Bounding Fit BEFORE First Paint
  const setupCanvasDpr = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const deviceRatio = window.devicePixelRatio || 1;
    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;

    canvas.width = Math.round(cssWidth * deviceRatio);
    canvas.height = Math.round(cssHeight * deviceRatio);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    fitGraphToCanvas();
    setIsReady(true);
  }, [fitGraphToCanvas]);

  // Force simulation setup (identical 90 ticks settle parameter)
  useEffect(() => {
    const sim = forceSimulation(nodes as any)
      .force(
        "link",
        forceLink(edges as any)
          .id((d: any) => d.id)
          .distance((d: any) => (d.type === "prerequisite" ? 70 : 120))
          .strength((d: any) => (d.type === "prerequisite" ? 0.25 : 0.08))
      )
      .force("charge", forceManyBody().strength(-180))
      .force(
        "x",
        forceX((d: any) => domainCentroids[d.domain]?.x || 0).strength(0.25)
      )
      .force(
        "y",
        forceY((d: any) => domainCentroids[d.domain]?.y || 0).strength(0.25)
      );

    sim.alpha(0.25);

    let tickCount = 0;
    sim.on("tick", () => {
      tickCount++;
      if (tickCount >= 90) {
        sim.stop();
        setupCanvasDpr();
      }
    });

    return () => {
      sim.stop();
    };
  }, [nodes, edges, domainCentroids, setupCanvasDpr]);

  useEffect(() => {
    setupCanvasDpr();
    window.addEventListener("resize", setupCanvasDpr);

    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mediaQuery.addEventListener("change", setupCanvasDpr);

    return () => {
      window.removeEventListener("resize", setupCanvasDpr);
      mediaQuery.removeEventListener("change", setupCanvasDpr);
    };
  }, [setupCanvasDpr]);

  // Main Canvas Render Loop (High contrast cluster highlighting)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const deviceRatio = window.devicePixelRatio || 1;
    const cssWidth = canvas.width / deviceRatio;
    const cssHeight = canvas.height / deviceRatio;
    const t = transformRef.current;

    ctx.save();
    ctx.scale(deviceRatio, deviceRatio);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Solid Background Color #0B0C0E (var(--color-bg))
    ctx.fillStyle = "#0B0C0E";
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    // Apply Zoom & Pan Transform
    ctx.translate(cssWidth / 2 + t.x, cssHeight / 2 + t.y);
    ctx.scale(t.k, t.k);

    const activeHoverId = hoveredNode?.id;
    const activeHoverNeighbors = activeHoverId ? neighborMap[activeHoverId] : null;
    const qLower = searchQuery.toLowerCase().trim();

    // Determine state mode: IDLE vs FOCUSED
    const isFocused = !!(activeHoverId || selectedDomain || qLower);

    // 1. EDGES RENDER (Distinct styling: prerequisite = solid/strong, related = dashed/lighter)
    edges.forEach((edge) => {
      const isConnectedToHover =
        activeHoverId && (edge.source.id === activeHoverId || edge.target.id === activeHoverId);
      const isEdgeInSelectedDomain =
        selectedDomain && (edge.source.domain === selectedDomain || edge.target.domain === selectedDomain);

      const isRelated = edge.type === "related";

      let edgeAlpha = isRelated ? 0.10 : 0.25;
      let strokeColor = isRelated ? "#315F7D" : "#333940";
      let lineWidth = isRelated ? 0.8 : 1.0;

      if (isFocused) {
        if (isConnectedToHover) {
          edgeAlpha = isRelated ? 0.60 : 0.85;
          strokeColor = isRelated
            ? edge.kind === "contrast_with"
              ? "#8A6D2F"
              : "#315F7D"
            : "#C9711F";
          lineWidth = isRelated ? 1.3 : 1.8;
        } else if (isEdgeInSelectedDomain) {
          edgeAlpha = isRelated ? 0.30 : 0.75;
          strokeColor = DOMAIN_COLORS[selectedDomain] || "#C9711F";
          lineWidth = isRelated ? 1.0 : 1.5;
        } else {
          edgeAlpha = 0.02; // Unfocused edges drop low so selected cluster pops
          strokeColor = "#23272D";
        }
      }

      ctx.save();
      ctx.beginPath();
      if (isRelated) {
        ctx.setLineDash(edge.kind === "contrast_with" ? [6, 4] : [3, 3]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = edgeAlpha;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      ctx.restore();
    });

    // 2. NODES RENDER (High Contrast Highlight for Selected Cluster)
    nodes.forEach((node) => {
      const isHovered = activeHoverId === node.id;
      const isNeighbor = activeHoverNeighbors?.has(node.id);
      const isDomainSelected = selectedDomain ? node.domain === selectedDomain : true;
      const isSearchMatched =
        !qLower || node.id.toLowerCase().includes(qLower) || node.title.toLowerCase().includes(qLower);

      let nodeAlpha = 1.0;  // IDLE State: Full strength core opacity
      let ringAlpha = 0.60; // IDLE State: Strong hue-matched ring
      let isPrimaryHighlight = false;

      if (isFocused) {
        if (isHovered) {
          nodeAlpha = 1.0;
          ringAlpha = 1.0;
          isPrimaryHighlight = true;
        } else if (isNeighbor) {
          nodeAlpha = 0.90;
          ringAlpha = 0.60;
        } else if (selectedDomain && isDomainSelected) {
          nodeAlpha = 1.0;  // Selected cluster nodes: 100% full opacity
          ringAlpha = 0.90; // Selected cluster rings: 90% bright ring
          isPrimaryHighlight = true;
        } else if (qLower && isSearchMatched) {
          nodeAlpha = 1.0;
          ringAlpha = 0.80;
          isPrimaryHighlight = true;
        } else {
          nodeAlpha = 0.12; // Unfocused nodes drop to 0.12 floor for maximum contrast!
          ringAlpha = 0.04;
        }
      }

      ctx.save();
      const color = DOMAIN_COLORS[node.domain] || "#9AA3AD";
      const renderRadius = isHovered ? node.radius + 1.2 : node.radius;

      // Filled Core
      ctx.beginPath();
      ctx.arc(node.x, node.y, renderRadius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = nodeAlpha;
      ctx.fill();

      // 1px Hue-Matched Inner Ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, renderRadius + 1.2, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = ringAlpha;
      ctx.stroke();

      // Extra Luminous Outline Ring for Primary Highlighted Cluster Nodes
      if (isPrimaryHighlight) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, renderRadius + 2.5, 0, 2 * Math.PI);
        ctx.strokeStyle = "#E6E8EB";
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.85;
        ctx.stroke();
      }

      ctx.restore();
    });

    // 3. CLUSTER LABELS — Section Heading Contrast with Knockout Badge for Selected Domain
    const renderedLabelBoxes: Array<{ minX: number; maxX: number; minY: number; maxY: number }> = [];
    const sortedDomains = Object.entries(domainClusterBounds).sort((a, b) => b[1].count - a[1].count);

    sortedDomains.forEach(([domain, bounds]) => {
      const isSel = selectedDomain ? selectedDomain === domain : true;
      const color = DOMAIN_COLORS[domain] || "#9AA3AD";
      const labelText = `${domain.toUpperCase()} ${bounds.count}`;

      ctx.save();
      const isDomainSelected = selectedDomain === domain;
      const font = isDomainSelected ? "bold 14px monospace" : "bold 13px monospace";
      ctx.font = font;
      const metrics = ctx.measureText(labelText);
      const textWidth = metrics.width + (isDomainSelected ? 16 : 12);
      const textHeight = isDomainSelected ? 22 : 18;

      const screenLabelX = bounds.centerX;
      const screenLabelY = bounds.minY - 22;

      // Collision Detection
      const box = {
        minX: screenLabelX - textWidth / 2,
        maxX: screenLabelX + textWidth / 2,
        minY: screenLabelY - textHeight / 2,
        maxY: screenLabelY + textHeight / 2,
      };

      let collides = false;
      for (const b of renderedLabelBoxes) {
        if (box.minX < b.maxX && box.maxX > b.minX && box.minY < b.maxY && box.maxY > b.minY) {
          collides = true;
          break;
        }
      }

      if (!collides || isDomainSelected) {
        renderedLabelBoxes.push(box);

        // Solid Background Knockout Rect (#0B0C0E)
        ctx.fillStyle = "#0B0C0E";
        ctx.globalAlpha = 1.0;
        ctx.fillRect(box.minX, box.minY, textWidth, textHeight);

        // High contrast border for selected cluster label
        if (isDomainSelected) {
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = 1.0;
          ctx.strokeRect(box.minX, box.minY, textWidth, textHeight);
        }

        // Label Text
        ctx.fillStyle = isDomainSelected ? "#E6E8EB" : color;
        ctx.globalAlpha = isFocused ? (isSel ? 1.0 : 0.15) : 0.95;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, screenLabelX, screenLabelY);
      }

      ctx.restore();
    });

    ctx.restore();
  }, [nodes, edges, hoveredNode, neighborMap, selectedDomain, searchQuery, domainClusterBounds]);

  // RequestAnimationFrame Render Loop
  useEffect(() => {
    const loop = () => {
      renderCanvas();
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [renderCanvas]);

  // Pointer & Click Listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.2, 5])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
      });

    d3Select(canvas).call(zoomBehavior as any);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const deviceRatio = window.devicePixelRatio || 1;
      const cssWidth = canvas.width / deviceRatio;
      const cssHeight = canvas.height / deviceRatio;

      const t = transformRef.current;
      const worldX = (mouseX - cssWidth / 2 - t.x) / t.k;
      const worldY = (mouseY - cssHeight / 2 - t.y) / t.k;

      // Check Domain Label Hovers
      let foundDomain: string | null = null;
      Object.entries(domainClusterBounds).forEach(([dom, bounds]) => {
        const labelX = bounds.centerX;
        const labelY = bounds.minY - 22;
        const dx = worldX - labelX;
        const dy = worldY - labelY;
        if (Math.abs(dx) < 55 && Math.abs(dy) < 14) {
          foundDomain = dom;
        }
      });

      // Check Node Hovers
      let foundNode: GraphNode | null = null;
      for (const node of nodes) {
        const dx = node.x - worldX;
        const dy = node.y - worldY;
        if (dx * dx + dy * dy <= (node.radius + 5) * (node.radius + 5)) {
          foundNode = node;
          break;
        }
      }

      setHoveredNode(foundNode);
      if (foundNode) {
        setTooltipPos({ x: e.clientX, y: e.clientY });
        canvas.style.cursor = "pointer";
      } else if (foundDomain) {
        canvas.style.cursor = "pointer";
      } else {
        setTooltipPos(null);
        canvas.style.cursor = "grab";
      }
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const deviceRatio = window.devicePixelRatio || 1;
      const cssWidth = canvas.width / deviceRatio;
      const cssHeight = canvas.height / deviceRatio;

      const t = transformRef.current;
      const worldX = (mouseX - cssWidth / 2 - t.x) / t.k;
      const worldY = (mouseY - cssHeight / 2 - t.y) / t.k;

      for (const [dom, bounds] of Object.entries(domainClusterBounds)) {
        const labelX = bounds.centerX;
        const labelY = bounds.minY - 22;
        const dx = worldX - labelX;
        const dy = worldY - labelY;
        if (Math.abs(dx) < 55 && Math.abs(dy) < 14) {
          setSelectedDomain((prev) => (prev === dom ? null : dom));
          return;
        }
      }

      if (hoveredNode) {
        router.push(`/atom/${hoveredNode.id}`);
      }
    };

    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("click", handleClick);

    return () => {
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("click", handleClick);
    };
  }, [nodes, hoveredNode, domainClusterBounds, router]);

  const domainStats = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((n) => {
      counts[n.domain] = (counts[n.domain] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  const matchingNodeCount = useMemo(() => {
    const qLower = searchQuery.toLowerCase().trim();
    return nodes.filter((node) => {
      const isDomainSelected = !selectedDomain || node.domain === selectedDomain;
      const isSearchMatched =
        !qLower || node.id.toLowerCase().includes(qLower) || node.title.toLowerCase().includes(qLower);
      return isDomainSelected && isSearchMatched;
    }).length;
  }, [nodes, selectedDomain, searchQuery]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-bg select-none ${
        isEmbedded ? "h-full w-full" : "h-[calc(100vh-48px)]"
      } ${isReady ? "opacity-100" : "opacity-0"} transition-opacity duration-150`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Right Controls: Filter Input & Reset Zoom */}
      <div className="absolute top-4 right-4 flex items-center gap-2 font-mono text-xs z-20">
        <input
          type="text"
          placeholder="Filter nodes"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-surface border border-border focus:border-accent text-text px-2.5 py-1 rounded-sm outline-none text-xs w-40"
        />
        <button
          onClick={fitGraphToCanvas}
          className="bg-surface-2 hover:bg-border text-text border border-border px-2.5 py-1 rounded-sm font-bold text-xs uppercase transition-colors cursor-pointer"
        >
          RESET ZOOM
        </button>
      </div>

      {/* Legend Panel — Solid Background, Hairline Border */}
      <div className="absolute top-4 left-4 bg-surface border border-border p-3 rounded-sm font-mono text-xs space-y-1.5 z-20 w-60 select-none">
        <div className="text-text-faint font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>DOMAINS ({Object.keys(domainStats).length})</span>
          {selectedDomain && (
            <button
              onClick={() => setSelectedDomain(null)}
              className="text-accent underline text-xs cursor-pointer"
            >
              CLEAR
            </button>
          )}
        </div>
        <div className="space-y-0.5 scrollbar-none max-h-72 overflow-y-auto">
          {Object.entries(domainStats).map(([dom, count]) => {
            const color = DOMAIN_COLORS[dom] || "#9AA3AD";
            const isSelected = selectedDomain === dom;
            return (
              <button
                key={dom}
                onClick={() => setSelectedDomain(isSelected ? null : dom)}
                className={`w-full flex items-center justify-between px-1.5 py-0.5 rounded-sm transition-colors cursor-pointer ${
                  isSelected ? "bg-accent-soft text-accent" : "hover:bg-surface-2 text-text-muted"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate uppercase text-xs">{dom}</span>
                </div>
                <span className="tabular-nums text-text-faint ml-2">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Empty State for Zero Matching Filter */}
      {matchingNodeCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none font-mono text-xs text-text-faint z-20">
          No atoms match that filter.
        </div>
      )}

      {/* Hover Tooltip with Smart Viewport Clamping */}
      {hoveredNode && tooltipPos && (
        <div
          className="fixed pointer-events-none z-50 bg-surface-2 p-2.5 rounded-sm shadow-2xl font-mono text-xs space-y-1 max-w-xs transition-all duration-75"
          style={{
            left: Math.min(Math.max(tooltipPos.x, 270), typeof window !== "undefined" ? window.innerWidth - 280 : 800),
            top: Math.max(48, Math.min(tooltipPos.y - 12, typeof window !== "undefined" ? window.innerHeight - 150 : 600)),
            transform: tooltipPos.y > (typeof window !== "undefined" ? window.innerHeight - 150 : 600)
              ? "translate(-50%, -100%)"
              : "translate(-50%, -100%)",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: DOMAIN_COLORS[hoveredNode.domain] || "#C9711F",
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-border pb-1">
            <span className="text-accent font-bold">{hoveredNode.id}</span>
            <span
              className="text-xs text-text uppercase px-1 py-0.5 rounded-sm font-bold"
              style={{ backgroundColor: (DOMAIN_COLORS[hoveredNode.domain] || "#9AA3AD") + "40" }}
            >
              {hoveredNode.domain}
            </span>
          </div>
          <div className="font-sans font-semibold text-text text-xs leading-tight">
            {hoveredNode.title}
          </div>
          <div className="flex items-center justify-between text-xs text-text-faint pt-1">
            <span className="tabular-nums">IN-DEGREE: {hoveredNode.inDegree}</span>
            <span className="uppercase font-bold text-rule">{hoveredNode.status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
