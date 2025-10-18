'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Network, ChevronRight, Send } from 'lucide-react';
import { socialAPI } from '@/lib/api/social-api';

// Dynamically import ForceGraph2D (client-side only)
const ForceGraph2D = dynamic(() => import('react-force-graph').then((m) => m.ForceGraph2D), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] flex items-center justify-center bg-slate-800/50 rounded-xl">
      <div className="text-slate-400">Loading graph...</div>
    </div>
  ),
});

interface GraphNode {
  id: string;
  label: string;
  type: 'player' | 'club';
  level?: number;
  avatar_url?: string;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  kind: string;
}

interface SixDegreesProProps {
  onInvite?: (userId: string) => void;
}

export function SixDegreesPro({ onInvite }: SixDegreesProProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [path, setPath] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const graphRef = useRef<any>(null);

  // Fetch graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      setLoading(true);
      try {
        const { data } = await socialAPI.graph.nodes();
        if (data) {
          const graphData = data as any;
          setNodes(graphData.nodes || []);
          setLinks(graphData.links || []);

          // Set default from/to (first two players)
          const players = (graphData.nodes || []).filter((n: GraphNode) => n.type === 'player');
          if (players.length >= 2) {
            setFrom(players[0].id);
            setTo(players[1].id);
          }
        }
      } catch (error) {
        console.error('Error fetching graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  // Fetch shortest path when from/to changes
  useEffect(() => {
    if (!from || !to || from === to) {
      setPath([]);
      return;
    }

    const fetchPath = async () => {
      try {
        const { data } = await socialAPI.graph.shortestPath(from, to);
        if (data) {
          setPath(data.path || []);
        }
      } catch (error) {
        console.error('Error fetching shortest path:', error);
        setPath([]);
      }
    };

    fetchPath();
  }, [from, to]);

  // Highlight nodes and links in path
  const highlightNodes = useMemo(() => new Set(path), [path]);
  const highlightLinks = useMemo(() => {
    if (path.length < 2) return new Set<string>();
    const links = new Set<string>();
    for (let i = 0; i < path.length - 1; i++) {
      links.add(`${path[i]}-${path[i + 1]}`);
      links.add(`${path[i + 1]}-${path[i]}`); // Bidirectional
    }
    return links;
  }, [path]);

  const getBrandColor = useCallback(() => {
    if (typeof window === 'undefined') return '#6366f1'; // Default indigo
    const color = getComputedStyle(document.documentElement).getPropertyValue('--brand');
    return color || '#6366f1';
  }, []);

  const playerNodes = nodes.filter((n) => n.type === 'player');

  const handleInvite = () => {
    if (to && onInvite) {
      onInvite(to);
    } else {
      alert(`Invite sent to user ${to}`);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4">
        <div className="h-[420px] flex items-center justify-center text-slate-400">
          Loading Six Degrees graph...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-white">Six Degrees · Connect Players</h3>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="border border-slate-600 bg-slate-700 text-white rounded px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          >
            {playerNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label || n.id.slice(0, 8)}
              </option>
            ))}
          </select>

          <ChevronRight className="w-4 h-4 text-slate-400" />

          <select
            className="border border-slate-600 bg-slate-700 text-white rounded px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          >
            {playerNodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.label || n.id.slice(0, 8)}
              </option>
            ))}
          </select>

          <button
            onClick={handleInvite}
            className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 text-sm"
          >
            <Send className="w-4 h-4" />
            Invite to Play
          </button>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="relative">
        <ForceGraph2D
          ref={graphRef}
          graphData={{ nodes, links }}
          nodeLabel={(node: any) => node.label}
          nodeColor={(node: any) => {
            const isHighlighted = highlightNodes.has(node.id);
            if (isHighlighted) return getBrandColor();
            return node.type === 'club' ? '#64748b' : '#0ea5e9';
          }}
          nodeRelSize={6}
          nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
            const size = node.type === 'club' ? 5 : highlightNodes.has(node.id) ? 8 : 6;
            const isHighlighted = highlightNodes.has(node.id);

            // Draw node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = isHighlighted
              ? getBrandColor()
              : node.type === 'club'
                ? '#64748b'
                : '#0ea5e9';
            ctx.fill();

            // Draw label
            const label = node.label || node.id.slice(0, 8);
            const fontSize = 12 / globalScale + 2;
            ctx.font = `${fontSize}px Inter, system-ui`;
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText(label, node.x + 10, node.y + 4);
          }}
          linkColor={(link: any) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const linkKey = `${sourceId}-${targetId}`;
            return highlightLinks.has(linkKey) ? getBrandColor() : '#334155';
          }}
          linkWidth={(link: any) => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const linkKey = `${sourceId}-${targetId}`;
            return highlightLinks.has(linkKey) ? 3 : 1;
          }}
          onNodeClick={(node: any) => {
            if (node.type === 'player') {
              setTo(node.id);
            }
          }}
          width={640}
          height={420}
          backgroundColor="#1e293b"
          enableNodeDrag={true}
          cooldownTicks={100}
          onEngineStop={() => graphRef.current?.zoomToFit(400)}
        />
      </div>

      {/* Path Display */}
      <div className="p-4 border-t border-slate-700/50">
        <p className="text-sm text-slate-400">
          {path.length > 0 ? (
            <>
              <span className="text-slate-300 font-medium">Shortest path:</span>{' '}
              {path
                .map(
                  (nodeId) =>
                    nodes.find((n) => n.id === nodeId)?.label || nodeId.slice(0, 8)
                )
                .join(' → ')}
            </>
          ) : (
            <span className="text-slate-500">No connection found or same user selected</span>
          )}
        </p>
      </div>
    </div>
  );
}
