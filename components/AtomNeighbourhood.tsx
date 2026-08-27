"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Node,
  Edge,
  Position,
  Handle,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AtomManifestItem, AtomType } from "@/lib/schema";

interface AtomNeighbourhoodProps {
  atom: AtomManifestItem;
  allAtoms: Record<string, AtomManifestItem>;
  reverseIndex: Record<string, string[]>;
}

const TYPE_BORDER_COLORS: Record<AtomType, string> = {
  concept: "#315F7D",
  mechanism: "#51518A",
  procedure: "#3E7D5A",
  delta: "#7D5A31",
  example: "#C9711F",
  reference: "#6B747E",
};

// Custom Node Component
function CustomAtomNode(props: NodeProps) {
  const data = props.data as unknown as { id: string; type: AtomType; isTarget: boolean };
  const { id, type, isTarget } = data;
  const borderColor = TYPE_BORDER_COLORS[type] || "#6B747E";

  return (
    <div
      className={`px-2 py-1 rounded-[3px] font-mono text-[10px] font-bold cursor-pointer transition-all select-none shadow-sm ${
        isTarget
          ? "bg-[#2A1D10] text-[#C9711F] border-2 border-[#C9711F] ring-1 ring-[#C9711F]/50 scale-105"
          : "bg-[#191C20] text-[#E6E8EB] border hover:border-[#E6E8EB]"
      }`}
      style={{ borderColor: isTarget ? "#C9711F" : borderColor }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <span>{id}</span>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = {
  atomNode: CustomAtomNode,
};

export function AtomNeighbourhood({ atom, allAtoms, reverseIndex }: AtomNeighbourhoodProps) {
  const router = useRouter();

  const { nodes, edges } = useMemo(() => {
    const nodesList: Node[] = [];
    const edgesList: Edge[] = [];

    // Target node at center
    const centerX = 110;
    const centerY = 110;

    nodesList.push({
      id: atom.id,
      type: "atomNode",
      position: { x: centerX, y: centerY },
      data: { id: atom.id, type: atom.type, isTarget: true },
    });

    // 1. Prerequisites (Above center: y = 20)
    const prereqs = atom.prerequisites;
    prereqs.forEach((prereqId, idx) => {
      const pAtom = allAtoms[prereqId];
      if (!pAtom) return;

      const spacing = 75;
      const startX = centerX - ((prereqs.length - 1) * spacing) / 2;
      const x = startX + idx * spacing;
      const y = 20;

      nodesList.push({
        id: prereqId,
        type: "atomNode",
        position: { x, y },
        data: { id: prereqId, type: pAtom.type, isTarget: false },
      });

      edgesList.push({
        id: `e-${prereqId}-${atom.id}`,
        source: prereqId,
        target: atom.id,
        style: { stroke: "#3E7D5A", strokeWidth: 1.5 },
        animated: false,
      });
    });

    // 2. Dependents / Reverse Index (Below center: y = 200)
    const dependents = reverseIndex[atom.id] || [];
    dependents.slice(0, 3).forEach((depId, idx) => {
      const dAtom = allAtoms[depId];
      if (!dAtom) return;

      const spacing = 75;
      const startX = centerX - ((Math.min(dependents.length, 3) - 1) * spacing) / 2;
      const x = startX + idx * spacing;
      const y = 200;

      nodesList.push({
        id: depId,
        type: "atomNode",
        position: { x, y },
        data: { id: depId, type: dAtom.type, isTarget: false },
      });

      edgesList.push({
        id: `e-${atom.id}-${depId}`,
        source: atom.id,
        target: depId,
        style: { stroke: "#3E7D5A", strokeWidth: 1.5 },
      });
    });

    // 3. See Also (Left side: x = 15, y = 110)
    if (atom.see_also.length > 0) {
      const saId = atom.see_also[0];
      const saAtom = allAtoms[saId];
      if (saAtom) {
        nodesList.push({
          id: saId,
          type: "atomNode",
          position: { x: 10, y: 110 },
          data: { id: saId, type: saAtom.type, isTarget: false },
        });

        edgesList.push({
          id: `e-sa-${atom.id}-${saId}`,
          source: atom.id,
          target: saId,
          style: { stroke: "#315F7D", strokeDasharray: "3,3", strokeWidth: 1.5 },
        });
      }
    }

    // 4. Contrast With (Right side: x = 210, y = 110)
    if (atom.contrast_with.length > 0) {
      const cwId = atom.contrast_with[0];
      const cwAtom = allAtoms[cwId];
      if (cwAtom) {
        nodesList.push({
          id: cwId,
          type: "atomNode",
          position: { x: 210, y: 110 },
          data: { id: cwId, type: cwAtom.type, isTarget: false },
        });

        edgesList.push({
          id: `e-cw-${atom.id}-${cwId}`,
          source: atom.id,
          target: cwId,
          style: { stroke: "#8A6D2F", strokeDasharray: "6,4", strokeWidth: 1.5 },
        });
      }
    }

    return { nodes: nodesList, edges: edgesList };
  }, [atom, allAtoms, reverseIndex]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.id !== atom.id) {
      router.push(`/atom/${node.id}`);
    }
  };

  return (
    <div className="border border-[#23272D] bg-[#121417] rounded-[3px] overflow-hidden">
      <div className="bg-[#191C20] px-3 py-1.5 border-b border-[#23272D] flex items-center justify-between font-mono text-[10px] select-none">
        <span className="text-[#9AA3AD] font-bold uppercase">1-HOP NEIGHBOURHOOD</span>
        <span className="text-[#6B747E]">LOCAL GRAPH</span>
      </div>

      <div className="w-full h-[240px] bg-[#0B0C0E]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
          panOnDrag={false}
          zoomOnScroll={false}
          nodesDraggable={false}
        />
      </div>
    </div>
  );
}
