"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
} from "@xyflow/react";
import boardData from "@/public/data/management-board.json";
import { getAssetUrl } from "@/lib/audioUtils";
import "@xyflow/react/dist/style.css";

const BRANCH_W = 200;
const BRANCH_H = 88;
const CARD_W = 180;
const CARD_H = 230;
const SIBLING_GAP = 30;
const LEVEL_GAP = 70;

// Total people under a node (inclusive)
function countMembers(node) {
  return 1 + (node.children || []).reduce((sum, c) => sum + countMembers(c), 0);
}

// Person subtree: director first, then reports; ids suffixed to avoid clash with branch header
function personNode(p, isHead) {
  return {
    id: `${p.id}-person`,
    type: "member",
    ...p,
    isHead,
    w: CARD_W,
    h: CARD_H,
    children: (p.children || []).map((c) => personNode(c, false)),
  };
}

// GM label + 6 branch label cards; people only appear under the expanded branch
function visibleTree(expandedId) {
  return {
    id: "gm",
    type: "branch",
    label: "General Manager",
    w: BRANCH_W,
    h: BRANCH_H,
    expandable: false,
    active: false,
    memberCount: 0,
    children: (boardData.children || []).map((b) => ({
      id: b.id,
      type: "branch",
      label: b.role,
      w: BRANCH_W,
      h: BRANCH_H,
      expandable: true,
      active: expandedId === b.id,
      memberCount: countMembers(b),
      children: expandedId === b.id ? [personNode(b, true)] : [],
    })),
  };
}

function subtreeWidth(node) {
  if (!node.children.length) return node.w;
  const total = node.children.reduce((sum, c) => sum + subtreeWidth(c), 0);
  return Math.max(
    node.w,
    total + (node.children.length - 1) * SIBLING_GAP,
  );
}

function layout(node, x, y, nodes, edges, activeBranchId) {
  const width = subtreeWidth(node);
  nodes.push({
    id: node.id,
    type: node.type,
    position: { x: x + width / 2 - node.w / 2, y },
    data: node,
  });

  let childX = x;
  for (const child of node.children) {
    const isActiveEdge =
      activeBranchId && (node.id === activeBranchId || node.id === `${activeBranchId}-person`);
    edges.push({
      id: `${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      type: "smoothstep",
      style: {
        stroke: isActiveEdge ? "#f3b0b0" : "#d1d5db",
        strokeWidth: isActiveEdge ? 2 : 1.5,
      },
    });
    layout(child, childX, y + node.h + LEVEL_GAP, nodes, edges, activeBranchId);
    childX += subtreeWidth(child) + SIBLING_GAP;
  }
}

function buildFlow(expandedId) {
  const tree = visibleTree(expandedId);
  const nodes = [];
  const edges = [];
  layout(tree, 0, 0, nodes, edges, expandedId);
  return { nodes, edges };
}

function Chevron({ up }) {
  return (
    <svg
      className={`w-3.5 h-3.5 text-red-600 transition-transform ${up ? "rotate-180" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function BranchCard({ data }) {
  return (
    <div
      className={`w-[200px] min-h-[88px] flex flex-col items-center justify-center gap-1 px-3 py-3 bg-white rounded-2xl drop-shadow-md select-none text-center ${
        data.expandable ? "cursor-pointer hover:-translate-y-0.5 transition-transform" : ""
      } ${data.active ? "border border-red-300" : "border border-gray-200"}`}
    >
      <p className="font-heading font-semibold text-[13px] leading-snug text-red-600">
        {data.label}
      </p>
      {data.expandable ? (
        <>
          <p className="font-body text-[11px] text-gray-400">
            {data.memberCount} orang
          </p>
          <Chevron up={data.active} />
        </>
      ) : (
        <span className="w-6 h-px bg-red-200" />
      )}
    </div>
  );
}

function MemberCard({ data }) {
  const photoUrl = getAssetUrl(data.photo) || "/8eh-real.svg";

  return (
    <div
      className={`w-[180px] flex flex-col bg-white rounded-2xl drop-shadow-md overflow-hidden select-none ${
        data.isHead ? "border border-red-200" : "border border-gray-300"
      }`}
    >
      <div className="w-full h-24 bg-gray-100 flex items-center justify-center overflow-hidden">
        <Image
          src={photoUrl}
          alt={`Photo of ${data.name}`}
          width={180}
          height={96}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="flex flex-col items-center text-center px-2 py-2">
        <p className="font-heading font-semibold text-[13px] leading-tight text-gray-900">
          {data.name}
        </p>
        <p className="font-body text-[11px] text-gray-500 leading-tight mt-0.5">
          {data.role}
        </p>
        {data.angkatan && (
          <span className="mt-1 px-2 py-0.5 text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-full">
            {data.angkatan}
          </span>
        )}
        <div className="flex space-x-3 mt-1.5">
          {(data.linkedin && (
            <a
              href={data.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src="/LinkedIn.svg" alt="LinkedIn" width={18} height={18} />
            </a>
          )) || (
            <div className="opacity-30">
              <Image src="/LinkedIn.svg" alt="LinkedIn" width={18} height={18} />
            </div>
          )}
          {(data.ig && (
            <a
              href={`https://instagram.com/${data.ig}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src="/Instagram.svg" alt="Instagram" width={18} height={18} />
            </a>
          )) || (
            <div className="opacity-30">
              <Image src="/Instagram.svg" alt="Instagram" width={18} height={18} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const nodeTypes = { branch: BranchCard, member: MemberCard };

// Re-fit viewport whenever the chart structure changes (expand/collapse)
function FitOnExpand({ nodes }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.15, duration: 350 }), 60);
    return () => clearTimeout(t);
  }, [nodes, fitView]);
  return null;
}

export default function OrgChartMB() {
  const [expandedId, setExpandedId] = useState(null);
  const { nodes: flowNodes, edges: flowEdges } = useMemo(
    () => buildFlow(expandedId),
    [expandedId],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowNodes, flowEdges]);

  const onNodeClick = useCallback((_, node) => {
    if (node.data.expandable) {
      setExpandedId((prev) => (prev === node.id ? null : node.id));
    }
  }, []);

  return (
    <div className="w-full h-[70vh] min-h-[420px] rounded-2xl bg-gradient-to-b from-white to-orange-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        minZoom={0.15}
        maxZoom={1.5}
      >
        <Controls showInteractive={false} />
        <FitOnExpand nodes={nodes} />
      </ReactFlow>
    </div>
  );
}
