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
  "credit-risk": "#315F7D",
  "counterparty-risk": "#51518A",
  "risk-data": "#3E7D5A",
  foundation: "#7D5A31",
  "legal-framework": "#6D4545",
  "market-risk": "#C9711F",
  "operational-risk": "#8A6D2F",
  regulatory: "#A6503C",
  quantitative: "#4A6B82",
};

export function CorpusGraph({ atoms, isEmbedded = false, syntheticCount }: CorpusGraphProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fps, setFps] = useState<number>(60);
  const [isSettled, setIsSettled] = useState<boolean>(false);

  const transformRef = useRef<ZoomTransform>(zoomIdentity);
  const animFrameRef = useRef<number | null>(null);

  // Generate synthetic nodes if requested for benchmark
  const effectiveAtoms = useMemo(() => {
    if (!syntheticCount || syntheticCount <= 0) {
      return atoms;
    }
    const synth: Record<string, AtomManifestItem> = { ...atoms };
    const domains = Object.keys(DOMAIN_COLORS);
    const existingCount = Object.keys(atoms).length;

    for (let i = existingCount + 1; i <= syntheticCount; i++) {
      const id = `SYNTH-${String(i).padStart(3, "0")}`;
      const domain = domains[i % domains.length];
      synth[id] = {
        id,
        title: `Synthetic Capability Node ${i}`,
        type: "concept",
        domain,
        subdomain: "synthetic",
        one_screen: "Synthetic test node.",
        prerequisites: i > 1 ? [`SYNTH-${String(Math.max(1, i - 3)).padStart(3, "0")}`] : [],
        see_also: [],
        contrast_with: [],
        jurisdictions: ["universal"],
        perishable: false,
        status: i % 5 === 0 ? "published" : "draft",
        verified: i % 5 === 0,
        reading_minutes: (i % 5) + 1,
        sources: [],
        slug: id.toLowerCase(),
        depth: 1,
        filepath: `${id}.mdx`,
        currentness: "durable",
      };
    }
    return synth;
  }, [atoms, syntheticCount]);

  // Compute Domain Centroids
  const domainCentroids = useMemo(() => {
    const domains = Array.from(new Set(Object.values(effectiveAtoms).map((a) => a.domain)));
    const centroids: Record<string, { x: number; y: number }> = {};
    const radius = 300;
    domains.forEach((d, idx) => {
      const angle = (2 * Math.PI * idx) / domains.length;
      centroids[d] = {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
      };
    });
    return centroids;
  }, [effectiveAtoms]);

  // Build Graph Nodes & Edges
  const { nodes, edges, nodeMap } = useMemo(() => {
    const nMap: Record<string, GraphNode> = {};
    const nodeList: GraphNode[] = [];

    Object.values(effectiveAtoms).forEach((atom) => {
      const r = Math.min(7, Math.max(3, atom.reading_minutes + 2));
      const initialX = atom.initialX ?? (domainCentroids[atom.domain]?.x || 0);
      const initialY = atom.initialY ?? (domainCentroids[atom.domain]?.y || 0);

      const node: GraphNode = {
        id: atom.id,
        title: atom.title,
        domain: atom.domain,
        status: atom.status,
        verified: atom.verified,
        readingMinutes: atom.reading_minutes,
        radius: r,
        x: initialX,
        y: initialY,
      };
      nMap[atom.id] = node;
      nodeList.push(node);
    });

    const edgeList: GraphEdge[] = [];
    Object.values(effectiveAtoms).forEach((atom) => {
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
  }, [effectiveAtoms, domainCentroids]);

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

  // D3 Simulation setup (Settles quickly & freezes)
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      setIsSettled(true);
      return;
    }

    const sim = forceSimulation(nodes as any)
      .force(
        "link",
        forceLink(edges as any)
          .id((d: any) => d.id)
          .distance(55)
          .strength(0.2)
      )
      .force("charge", forceManyBody().strength(-60))
      .force(
        "x",
        forceX((d: any) => domainCentroids[d.domain]?.x || 0).strength(0.25)
      )
      .force(
        "y",
        forceY((d: any) => domainCentroids[d.domain]?.y || 0).strength(0.25)
      );

    sim.alpha(0.3);

    let tickCount = 0;
    sim.on("tick", () => {
      tickCount++;
      if (tickCount >= 100) {
        sim.stop();
        setIsSettled(true);
      }
    });

    return () => {
      sim.stop();
    };
  }, [nodes, edges, domainCentroids]);

  // Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const t = transformRef.current;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Dark background
    ctx.fillStyle = "#0B0C0E";
    ctx.fillRect(0, 0, width, height);

    // Apply Zoom / Pan transform
    ctx.translate(width / 2 + t.x, height / 2 + t.y);
    ctx.scale(t.k, t.k);

    const activeHoverId = hoveredNode?.id;
    const activeHoverNeighbors = activeHoverId ? neighborMap[activeHoverId] : null;
    const qLower = searchQuery.toLowerCase().trim();

    // 1. Draw Edges
    edges.forEach((edge) => {
      const isConnectedToHover =
        activeHoverId && (edge.source.id === activeHoverId || edge.target.id === activeHoverId);

      let edgeAlpha = 0.15;
      if (activeHoverId) {
        edgeAlpha = isConnectedToHover ? 0.8 : 0.04;
      }

      ctx.beginPath();
      ctx.moveTo(edge.source.x, edge.source.y);
      ctx.lineTo(edge.target.x, edge.target.y);
      ctx.strokeStyle = isConnectedToHover ? "#C9711F" : "#333940";
      ctx.globalAlpha = edgeAlpha;
      ctx.lineWidth = isConnectedToHover ? 1.5 : 1;
      ctx.stroke();
    });

    // 2. Draw Nodes
    nodes.forEach((node) => {
      const isHovered = activeHoverId === node.id;
      const isNeighbor = activeHoverNeighbors?.has(node.id);
      const isDomainSelected = !selectedDomain || node.domain === selectedDomain;
      const isSearchMatched = !qLower || node.id.toLowerCase().includes(qLower) || node.title.toLowerCase().includes(qLower);

      let alpha = node.status === "published" && node.verified ? 1.0 : 0.4;

      if (activeHoverId) {
        if (!isHovered && !isNeighbor) {
          alpha = 0.06;
        } else {
          alpha = 1.0;
        }
      } else if (!isDomainSelected || !isSearchMatched) {
        alpha = 0.06;
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      const color = DOMAIN_COLORS[node.domain] || "#9AA3AD";

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Published node ring
      if (node.status === "published" && node.verified) {
        ctx.strokeStyle = "#E6E8EB";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Hovered node highlight ring
      if (isHovered) {
        ctx.strokeStyle = "#C9711F";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    });

    // 3. Draw Domain Centroid Labels
    Object.entries(domainCentroids).forEach(([domain, pos]) => {
      ctx.save();
      const isSel = !selectedDomain || selectedDomain === domain;
      ctx.globalAlpha = isSel ? 0.7 : 0.2;
      ctx.font = "bold 10px monospace";
      ctx.fillStyle = DOMAIN_COLORS[domain] || "#9AA3AD";
      ctx.textAlign = "center";
      ctx.fillText(domain.toUpperCase(), pos.x, pos.y - 45);
      ctx.restore();
    });

    ctx.restore();
  }, [nodes, edges, hoveredNode, neighborMap, selectedDomain, searchQuery, domainCentroids]);

  // RequestAnimationFrame loop & FPS monitoring
  useEffect(() => {
    let lastTime = performance.now();
    let frameCount = 0;

    const loop = () => {
      renderCanvas();
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [renderCanvas]);

  // Setup D3 Zoom & Canvas Event Listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zoomBehavior = d3Zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        transformRef.current = event.transform;
      });

    d3Select(canvas).call(zoomBehavior as any);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const t = transformRef.current;
      const worldX = (mouseX - canvas.width / 2 - t.x) / t.k;
      const worldY = (mouseY - canvas.height / 2 - t.y) / t.k;

      let found: GraphNode | null = null;
      for (const node of nodes) {
        const dx = node.x - worldX;
        const dy = node.y - worldY;
        if (dx * dx + dy * dy <= (node.radius + 4) * (node.radius + 4)) {
          found = node;
          break;
        }
      }

      setHoveredNode(found);
      if (found) {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      } else {
        setTooltipPos(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
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
  }, [nodes, hoveredNode, router]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const resetZoom = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    d3Select(canvas).transition().duration(400).call(d3Zoom().transform as any, zoomIdentity);
    transformRef.current = zoomIdentity;
  };

  // Domain stats breakdown for Legend
  const domainStats = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((n) => {
      counts[n.domain] = (counts[n.domain] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden bg-[#0B0C0E] border border-[#23272D] select-none ${
        isEmbedded ? "h-[540px] rounded-[3px]" : "h-[calc(100vh-48px)]"
      }`}
    >
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing block" />

      {/* Top Right Controls: Search Box & Reset Zoom */}
      <div className="absolute top-3 right-3 flex items-center gap-2 font-mono text-xs z-10">
        <input
          type="text"
          placeholder="Filter nodes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-[#121417] border border-[#23272D] focus:border-[#C9711F] text-[#E6E8EB] px-2.5 py-1 rounded-[3px] outline-none text-xs w-[160px]"
        />
        <button
          onClick={resetZoom}
          className="bg-[#191C20] hover:bg-[#23272D] text-[#E6E8EB] border border-[#23272D] px-2.5 py-1 rounded-[3px] font-bold text-[10px] uppercase transition-colors"
        >
          RESET ZOOM
        </button>
        {syntheticCount && syntheticCount > 0 && (
          <span className="bg-[#2A1D10] text-[#C9711F] border border-[#C9711F] px-2 py-0.5 rounded-[3px] text-[10px] font-bold">
            SYNTHETIC {nodes.length} ({fps} FPS)
          </span>
        )}
      </div>

      {/* Bottom Left Legend */}
      <div className="absolute bottom-3 left-3 bg-[#121417]/90 border border-[#23272D] p-2.5 rounded-[3px] font-mono text-[10px] space-y-1 z-10 max-w-[240px]">
        <div className="text-[#6B747E] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>DOMAINS ({Object.keys(domainStats).length})</span>
          {selectedDomain && (
            <button
              onClick={() => setSelectedDomain(null)}
              className="text-[#C9711F] underline text-[9px]"
            >
              CLEAR
            </button>
          )}
        </div>
        <div className="space-y-0.5">
          {Object.entries(domainStats).map(([dom, count]) => {
            const color = DOMAIN_COLORS[dom] || "#9AA3AD";
            const isSelected = selectedDomain === dom;
            return (
              <button
                key={dom}
                onClick={() => setSelectedDomain(isSelected ? null : dom)}
                className={`w-full flex items-center justify-between px-1.5 py-0.5 rounded-[2px] transition-colors ${
                  isSelected ? "bg-[#2A1D10] text-[#C9711F]" : "hover:bg-[#191C20] text-[#9AA3AD]"
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="truncate uppercase text-[9px]">{dom}</span>
                </div>
                <span className="tabular-nums text-[#6B747E] ml-2">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && tooltipPos && (
        <div
          className="fixed pointer-events-none z-50 bg-[#191C20] border border-[#C9711F] p-2.5 rounded-[3px] shadow-xl font-mono text-xs space-y-1 -translate-x-1/2 -translate-y-full mb-3 max-w-[260px]"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[#23272D] pb-1">
            <span className="text-[#C9711F] font-bold">{hoveredNode.id}</span>
            <span className="text-[9px] text-[#9AA3AD] uppercase border border-[#23272D] px-1 py-0.2 rounded-[2px]">
              {hoveredNode.domain}
            </span>
          </div>
          <div className="font-sans font-semibold text-[#E6E8EB] text-[11px] leading-tight">
            {hoveredNode.title}
          </div>
          <div className="flex items-center justify-between text-[10px] text-[#6B747E] pt-1">
            <span>{hoveredNode.readingMinutes} MIN</span>
            <span
              className={
                hoveredNode.status === "published"
                  ? "text-[#3E7D5A] font-bold"
                  : "text-[#8A6D2F]"
              }
            >
              {hoveredNode.status.toUpperCase()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
