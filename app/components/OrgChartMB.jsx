"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ReactFlow,
  Controls,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import boardData from "@/public/data/management-board.json";
import { getAssetUrl } from "@/lib/audioUtils";
import "@xyflow/react/dist/style.css";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 210;
const SIBLING_GAP = 30;
const LEVEL_GAP = 80;

// Prune tree to what's visible: GM + all directors; only the expanded branch keeps its children
function visibleTree(expandedId) {
  function clone(node, depth) {
    const children =
      expandedId === node.id
        ? (node.children || []).map((c) => clone(c, depth + 1))
        : [];
    return { ...node, depth, children, expandable: (node.children || []).length > 0, expanded: expandedId === node.id };
  }
  const root = clone(boardData, 0);
  // GM's children (directors) are always shown as collapsed cards
  root.children = (boardData.children || []).map((c) => clone(c, 1));
  return root;
}

function subtreeWidth(node) {
  if (!node.children.length) return NODE_WIDTH;
  const total = node.children.reduce((sum, c) => sum + subtreeWidth(c), 0);
  return Math.max(NODE_WIDTH, total + (node.children.length - 1) * SIBLING_GAP);
}

function layout(node, x, y, nodes, edges) {
  const width = subtreeWidth(node);
  nodes.push({
    id: node.id,
    type: "member",
    position: { x: x + width / 2 - NODE_WIDTH / 2, y },
    data: node,
  });

  let childX = x;
  for (const child of node.children) {
    edges.push({
      id: `${node.id}-${child.id}`,
      source: node.id,
      target: child.id,
      type: "smoothstep",
    });
    layout(child, childX, y + NODE_HEIGHT + LEVEL_GAP, nodes, edges);
    childX += subtreeWidth(child) + SIBLING_GAP;
  }
}

function buildFlow(expandedId) {
  const tree = visibleTree(expandedId);
  const nodes = [];
  const edges = [];
  layout(tree, 0, 0, nodes, edges);
  return { nodes, edges };
}

function MemberNode({ data }) {
  const photoUrl = getAssetUrl(data.photo) || "/8eh-real.svg";

  return (
    <div
      className={`w-[180px] bg-white rounded-2xl border shadow-md overflow-hidden select-none ${
        data.depth === 1 ? "border-orange-300" : "border-gray-300"
      } ${data.expandable ? "cursor-pointer hover:shadow-lg transition-shadow" : ""}`}
    >
      <div className="w-full h-[100px] bg-gray-200 flex items-center justify-center overflow-hidden">
        <Image
          src={photoUrl}
          alt={`Photo of ${data.name}`}
          width={180}
          height={100}
          className="object-cover w-full h-full"
        />
      </div>
      <div className="px-2 py-2 text-center">
        <p className="font-heading font-semibold text-[13px] leading-tight text-gray-900">
          {data.name}
        </p>
        <p className="font-body text-[11px] text-gray-500 leading-tight mt-0.5">
          {data.role}
        </p>
        {data.angkatan && (
          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-full">
            {data.angkatan}
          </span>
        )}
        <div className="flex justify-center space-x-3 mt-1.5">
          {(data.linkedin && (
            <a
              href={data.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src="/LinkedIn.svg" alt="LinkedIn" width={20} height={20} />
            </a>
          )) || (
            <div className="opacity-30">
              <Image src="/LinkedIn.svg" alt="LinkedIn" width={20} height={20} />
            </div>
          )}
          {(data.ig && (
            <a
              href={`https://instagram.com/${data.ig}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src="/Instagram.svg" alt="Instagram" width={20} height={20} />
            </a>
          )) || (
            <div className="opacity-30">
              <Image src="/Instagram.svg" alt="Instagram" width={20} height={20} />
            </div>
          )}
        </div>
        {data.expandable && (
          <span className="inline-block mt-1 text-[10px] font-medium text-gray-400">
            {data.expanded ? "▲ tutup" : "▼ lihat tim"}
          </span>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { member: MemberNode };

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
    <div className="w-full h-[70vh] min-h-[420px] rounded-2xl border border-gray-200 bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        maxZoom={1.5}
      >
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
