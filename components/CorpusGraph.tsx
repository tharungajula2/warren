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
}

const DOMAIN_COLORS: Record<string, string> = {
  foundation: "#7D5A31",
  "credit-risk": "#315F7D",
  impairment: "#5A7D3E",
  "regulatory-capital": "#A6503C",
  "treasury-alm": "#8A456D",
  "traded-products": "#6B5A7D",
  "counterparty-risk": "#51518A",
  "market-risk": "#C9711F",
  "operational-risk": "#8A6D2F",
  "model-risk": "#4A6B82",
  "risk-data": "#3E7D5A",
  "financial-crime": "#4A7D7D",
  "india-lending": "#7D7D3E",
  "business-analysis": "#6B4A82",
  technical: "#3E5A7D",
  quantitative: "#7D3E5A",
  regulatory: "#A6503C",
};

// Level of detail zoom threshold scale
const LOD_ZOOM_THRESHOLD = 0.55;

export function CorpusGraph({ atoms, isEmbedded = false, syntheticCount }: CorpusGraphProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [dpr, setDpr] = useState<number>(1);

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

  // Build Graph Nodes (In-degree square-root mapping: 2.5px to 6.0px)
  const { nodes, edges, nodeMap } = useMemo(() => {
    const nMap: Record<string, GraphNode> = {};
    const nodeList: GraphNode[] = [];

    Object.values(atoms).forEach((atom) => {
      const inDeg = reverseIndex[atom.id]?.length || 0;
      // Non-linear square-root sizing map: 2.5px to 6.0px
      const r = 2.5 + Math.sqrt(inDeg / maxInDegree) * 3.5;
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
    Object.values(atoms).forEach((atom) => {
      const targetNode = nMap[atom.id];
      if (!targetNode) return;
      atom.prerequisites.forEach((pId) => {
        const sourceNode = nMap[pId];
        if (sourceNode) {
          edgeList.push({ source: sourceNode, target: targetNode });
        }
      });
    });

    return { nodes: nodeList, edges: edgeList, nodeMap: nMap };
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

    const cssWidth = canvas.clientWidth || window.innerWidth;
    const cssHeight = canvas.clientHeight || window.innerHeight;

    const scaleX = (cssWidth * 0.92) / graphWidth;
    const scaleY = (cssHeight * 0.92) / graphHeight;
    const scale = Math.min(scaleX, scaleY, 2.5);

    const t = zoomIdentity.translate(-centerX * scale, -centerY * scale).scale(scale);
    transformRef.current = t;
  }, [nodes]);

  // Force simulation setup (identical tick & settle parameters)
  useEffect(() => {
    const sim = forceSimulation(nodes as any)
      .force(
        "link",
        forceLink(edges as any)
          .id((d: any) => d.id)
          .distance(70)
          .strength(0.25)
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
        fitGraphToCanvas();
      }
    });

    return () => {
      sim.stop();
    };
  }, [nodes, edges, domainCentroids, fitGraphToCanvas]);

  // TASK 1: Handle DPR Scaling on Canvas Buffer & Resize
  const setupCanvasDpr = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const deviceRatio = window.devicePixelRatio || 1;
    setDpr(deviceRatio);

    const cssWidth = container.clientWidth;
    const cssHeight = container.clientHeight;

    canvas.width = Math.round(cssWidth * deviceRatio);
    canvas.height = Math.round(cssHeight * deviceRatio);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    fitGraphToCanvas();
  }, [fitGraphToCanvas]);

  useEffect(() => {
    setupCanvasDpr();
    window.addEventListener("resize", setupCanvasDpr);

    // Detect screen / DPR changes
    const mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    mediaQuery.addEventListener("change", setupCanvasDpr);

    return () => {
      window.removeEventListener("resize", setupCanvasDpr);
      mediaQuery.removeEventListener("change", setupCanvasDpr);
    };
  }, [setupCanvasDpr]);

  // Main Canvas Render Loop
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

    // TASK 3: LEVEL OF DETAIL (LOD) - Zoom out overview discs when scale < 0.55
    if (t.k < LOD_ZOOM_THRESHOLD) {
      // Draw single domain summary discs sized by atom count
      Object.entries(domainClusterBounds).forEach(([domain, bounds]) => {
        const isDomainSelected = !selectedDomain || selectedDomain === domain;
        const color = DOMAIN_COLORS[domain] || "#9AA3AD";
        const discRadius = Math.min(60, Math.max(25, Math.sqrt(bounds.count) * 6));

        ctx.save();
        ctx.globalAlpha = isDomainSelected ? 0.85 : 0.20;

        // Disc Core
        ctx.beginPath();
        ctx.arc(bounds.centerX, bounds.centerY, discRadius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        // Disc Ring
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = isDomainSelected ? 0.40 : 0.10;
        ctx.stroke();

        // Label Background Knockout Rect
        ctx.font = "bold 13px monospace";
        const labelText = `${domain.toUpperCase()} ${bounds.count}`;
        const metrics = ctx.measureText(labelText);
        const textWidth = metrics.width + 12;
        const textHeight = 18;

        ctx.fillStyle = "#0B0C0E";
        ctx.fillRect(
          bounds.centerX - textWidth / 2,
          bounds.centerY - textHeight / 2,
          textWidth,
          textHeight
        );

        // Label Text
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = isDomainSelected ? 1.0 : 0.30;
        ctx.fillText(labelText, bounds.centerX, bounds.centerY);

        ctx.restore();
      });

      ctx.restore();
      return;
    }

    // TASK 2: EDGES - Hairline, single alpha, recede further than nodes
    edges.forEach((edge) => {
      const isConnectedToHover =
        activeHoverId && (edge.source.id === activeHoverId || edge.target.id === activeHoverId);

      let edgeAlpha = 0.08; // Quietened edge alpha floor
      if (activeHoverId) {
        edgeAlpha = isConnectedToHover ? 0.60 : 0.04;
      } else if (selectedDomain) {
        const isEdgeInDomain = edge.source.domain === selectedDomain || edge.target.domain === selectedDomain;
        edgeAlpha = isEdgeInDomain ? 0.40 : 0.04;
      }

      ctx.beginPath();
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
      ctx.strokeStyle = isConnectedToHover ? "#C9711F" : "#333940";
      ctx.globalAlpha = edgeAlpha;
      ctx.lineWidth = isConnectedToHover ? 1.5 : 1.0;
      ctx.stroke();
    });

    // TASK 2: NODES - Filled core in domain colour + 1px ring at lower alpha
    nodes.forEach((node) => {
      const isHovered = activeHoverId === node.id;
      const isNeighbor = activeHoverNeighbors?.has(node.id);
      const isDomainSelected = !selectedDomain || node.domain === selectedDomain;
      const isSearchMatched =
        !qLower || node.id.toLowerCase().includes(qLower) || node.title.toLowerCase().includes(qLower);

      // Node Alpha Floor: 0.35 so cluster shape survives dimming
      let nodeAlpha = 0.35;
      let ringAlpha = 0.20;

      if (activeHoverId) {
        if (isHovered) {
          nodeAlpha = 1.0;
          ringAlpha = 1.0;
        } else if (isNeighbor) {
          nodeAlpha = 0.85;
          ringAlpha = 0.50;
        } else {
          nodeAlpha = 0.15;
          ringAlpha = 0.05;
        }
      } else if (selectedDomain || qLower) {
        if (isDomainSelected && isSearchMatched) {
          nodeAlpha = 0.85;
          ringAlpha = 0.40;
        } else {
          nodeAlpha = 0.15;
          ringAlpha = 0.05;
        }
      }

      ctx.save();
      const color = DOMAIN_COLORS[node.domain] || "#9AA3AD";
      const renderRadius = isHovered ? node.radius + 1.0 : node.radius;

      // Filled Core
      ctx.beginPath();
      ctx.arc(node.x, node.y, renderRadius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.globalAlpha = nodeAlpha;
      ctx.fill();

      // 1px Hue-Matched Ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, renderRadius + 1.2, 0, 2 * Math.PI);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.0;
      ctx.globalAlpha = ringAlpha;
      ctx.stroke();

      ctx.restore();
    });

    // TASK 3: DOMAIN CENTROID LABELS - Paint order above nodes with background knockout & collision detection
    const renderedLabelBoxes: Array<{ minX: number; maxX: number; minY: number; maxY: number }> = [];

    // Sort domain labels by count descending so higher count takes priority
    const sortedDomains = Object.entries(domainClusterBounds).sort((a, b) => b[1].count - a[1].count);

    sortedDomains.forEach(([domain, bounds]) => {
      const isSel = !selectedDomain || selectedDomain === domain;
      const color = DOMAIN_COLORS[domain] || "#9AA3AD";
      const labelText = `${domain.toUpperCase()} ${bounds.count}`;

      ctx.save();
      ctx.font = "bold 12px monospace";
      const metrics = ctx.measureText(labelText);
      const textWidth = metrics.width + 10;
      const textHeight = 16;

      const screenLabelX = bounds.centerX;
      const screenLabelY = bounds.minY - 20;

      // Check Label Collisions
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

      if (!collides) {
        renderedLabelBoxes.push(box);

        // Solid Background Knockout Rect (#0B0C0E) so label NEVER sits on top of nodes/edges
        ctx.fillStyle = "#0B0C0E";
        ctx.globalAlpha = 1.0;
        ctx.fillRect(box.minX, box.minY, textWidth, textHeight);

        // Label Text
        ctx.fillStyle = color;
        ctx.globalAlpha = isSel ? 0.90 : 0.25;
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
        const labelY = bounds.minY - 20;
        const dx = worldX - labelX;
        const dy = worldY - labelY;
        if (Math.abs(dx) < 50 && Math.abs(dy) < 12) {
          foundDomain = dom;
        }
      });

      // Check Node Hovers
      let foundNode: GraphNode | null = null;
      if (t.k >= LOD_ZOOM_THRESHOLD) {
        for (const node of nodes) {
          const dx = node.x - worldX;
          const dy = node.y - worldY;
          if (dx * dx + dy * dy <= (node.radius + 5) * (node.radius + 5)) {
            foundNode = node;
            break;
          }
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
        const labelY = bounds.minY - 20;
        const dx = worldX - labelX;
        const dy = worldY - labelY;
        if (Math.abs(dx) < 50 && Math.abs(dy) < 12) {
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
      }`}
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

      {/* TASK 4 & RULE 3: Legend Panel — Solid Background, Hairline Border, No Translucent Overlay, No Scrollbar */}
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

      {/* Hover Tooltip with Domain-Coloured Border */}
      {hoveredNode && tooltipPos && (
        <div
          className="fixed pointer-events-none z-50 bg-surface-2 p-2.5 rounded-sm shadow-2xl font-mono text-xs space-y-1 -translate-x-1/2 -translate-y-full mb-3 max-w-xs"
          style={{
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
