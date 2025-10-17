'use client';

/**
 * Connection Visualizer Component
 *
 * Visualizes the social graph connection path between two users
 * using D3.js force-directed graph layout.
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Users, ArrowRight, Activity } from 'lucide-react';

interface GraphNode {
  id: string;
  name: string;
  avatar?: string;
  isCurrentUser?: boolean;
  isTarget?: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  connectionType: string;
}

interface ConnectionPath {
  path: GraphNode[];
  degrees: number;
}

interface ConnectionVisualizerProps {
  fromUserId: string;
  toUserId: string;
  className?: string;
}

export function ConnectionVisualizer({
  fromUserId,
  toUserId,
  className = '',
}: ConnectionVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [connectionPath, setConnectionPath] = useState<ConnectionPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConnection() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/graph/connection?from=${fromUserId}&to=${toUserId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch connection');
        }

        const data = await response.json();
        setConnectionPath(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (fromUserId && toUserId) {
      fetchConnection();
    }
  }, [fromUserId, toUserId]);

  useEffect(() => {
    if (!connectionPath || !svgRef.current) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const width = svgRef.current.clientWidth || 600;
    const height = 400;

    // Create nodes and links from path
    const nodes: GraphNode[] = connectionPath.path;
    const links: GraphLink[] = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({
        source: nodes[i].id,
        target: nodes[i + 1].id,
        connectionType: 'played_with',
      });
    }

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Create force simulation
    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(150)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50));

    // Create links
    const link = svg
      .append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#6366f1')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)');

    // Create arrowhead marker
    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('markerWidth', 10)
      .attr('markerHeight', 10)
      .attr('refX', 25)
      .attr('refY', 3)
      .attr('orient', 'auto')
      .append('polygon')
      .attr('points', '0 0, 6 3, 0 6')
      .attr('fill', '#6366f1');

    // Create node groups
    const node = svg
      .append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer');

    // Add circles to nodes
    node
      .append('circle')
      .attr('r', 30)
      .attr('fill', (d) => {
        if (d.isCurrentUser) return '#10b981';
        if (d.isTarget) return '#f59e0b';
        return '#6366f1';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);

    // Add labels
    node
      .append('text')
      .text((d) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 45)
      .attr('font-size', '12px')
      .attr('fill', '#374151')
      .attr('font-weight', '500');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag behavior
    const drag = d3
      .drag<SVGGElement, GraphNode>()
      .on('start', (event) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on('drag', (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on('end', (event) => {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });

    node.call(drag as any);

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [connectionPath]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <Activity className="h-5 w-5 animate-spin" />
            <span>Finding connection path...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!connectionPath) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">No connection found</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="bg-indigo-600 px-6 py-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Users className="h-5 w-5" />
          Connection Path
        </h3>
      </div>

      {/* Stats */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Degrees of separation:</span>
            <span className="font-semibold text-indigo-600">
              {connectionPath.degrees}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              {connectionPath.path.length} players
            </span>
          </div>
        </div>
      </div>

      {/* Graph Visualization */}
      <div className="p-6">
        <svg ref={svgRef} className="w-full" style={{ minHeight: '400px' }} />
      </div>

      {/* Legend */}
      <div className="px-6 pb-6 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
          <span className="text-gray-600">You</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white" />
          <span className="text-gray-600">Target</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-white" />
          <span className="text-gray-600">Connection</span>
        </div>
      </div>
    </div>
  );
}
