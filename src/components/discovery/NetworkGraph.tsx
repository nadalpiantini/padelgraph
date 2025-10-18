'use client';

/**
 * Network Graph Component
 *
 * Visualizes the user's complete social network including:
 * - Direct connections (users)
 * - Club memberships
 * - Community clusters
 *
 * Uses D3.js force-directed graph layout
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Users, Building, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  type: 'user' | 'club';
  level?: string;
  city?: string;
  avatar_url?: string | null;
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  type: 'connection' | 'membership';
  strength?: number;
}

interface NetworkGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    total_nodes: number;
    total_edges: number;
    user_nodes: number;
    club_nodes: number;
  };
}

interface NetworkGraphProps {
  t: {
    loading: string;
    noData: string;
    zoomIn: string;
    zoomOut: string;
    resetZoom: string;
    users: string;
    clubs: string;
    connections: string;
  };
}

export default function NetworkGraph({ t }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData] = useState<NetworkGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Load graph data
  useEffect(() => {
    async function fetchGraphData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/discover/graph?depth=2&limit=50');

        if (!response.ok) {
          throw new Error('Failed to fetch graph data');
        }

        const data = await response.json();
        setGraphData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchGraphData();
  }, []);

  // Render D3 graph
  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 600;

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Create graph container
    const g = svg.append('g');

    // Setup zoom behavior
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoomBehavior);
    setZoom(zoomBehavior);

    // Create force simulation
    const simulation = d3
      .forceSimulation<GraphNode>(graphData.nodes)
      .force(
        'link',
        d3
          .forceLink<GraphNode, GraphEdge>(graphData.edges)
          .id((d) => d.id)
          .distance((d) => (d.type === 'membership' ? 100 : 80))
          .strength((d) => d.strength || 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create links
    const link = g
      .append('g')
      .selectAll('line')
      .data(graphData.edges)
      .join('line')
      .attr('stroke', (d) => (d.type === 'membership' ? '#10b981' : '#6366f1'))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => (d.strength || 0.5) * 3);

    // Create nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .join('g')
      .attr('cursor', 'pointer');

    // Add node circles
    node
      .append('circle')
      .attr('r', (d) => (d.type === 'club' ? 25 : 20))
      .attr('fill', (d) => {
        if (d.type === 'club') return '#10b981'; // green for clubs
        // Color by level for users
        const levels: Record<string, string> = {
          beginner: '#3b82f6',
          intermediate: '#8b5cf6',
          advanced: '#ec4899',
          professional: '#f59e0b',
        };
        return levels[d.level || 'intermediate'] || '#6366f1';
      })
      .attr('stroke', '#1e293b')
      .attr('stroke-width', 2);

    // Add node labels
    node
      .append('text')
      .text((d) => d.name.split(' ')[0]) // First name only
      .attr('x', 0)
      .attr('y', (d) => (d.type === 'club' ? 35 : 30))
      .attr('text-anchor', 'middle')
      .attr('fill', '#e2e8f0')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('pointer-events', 'none');

    // Add node icons
    node
      .append('text')
      .text((d) => (d.type === 'club' ? '🏛️' : '👤'))
      .attr('x', 0)
      .attr('y', 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '16px')
      .attr('pointer-events', 'none');

    // Add tooltips
    node.append('title').text((d) => {
      if (d.type === 'club') {
        return `${d.name}\n${d.city || 'Unknown location'}`;
      }
      return `${d.name}\n${d.level || 'Unknown level'}\n${d.city || 'Unknown location'}`;
    });

    // Apply drag behavior
    node.call(drag(simulation) as any);

    // Click handler
    node.on('click', (event, d) => {
      event.stopPropagation();
      if (d.type === 'user') {
        window.location.href = `/player/${d.id}`;
      } else if (d.type === 'club') {
        window.location.href = `/club/${d.id}`;
      }
    });

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x || 0)
        .attr('y1', (d) => (d.source as GraphNode).y || 0)
        .attr('x2', (d) => (d.target as GraphNode).x || 0)
        .attr('y2', (d) => (d.target as GraphNode).y || 0);

      node.attr('transform', (d) => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Drag behavior
    function drag(simulation: d3.Simulation<GraphNode, GraphEdge>) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      return d3.drag<SVGGElement, GraphNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [graphData]);

  const handleZoomIn = () => {
    if (zoom && svgRef.current) {
      d3.select(svgRef.current).transition().call(zoom.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (zoom && svgRef.current) {
      d3.select(svgRef.current).transition().call(zoom.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (zoom && svgRef.current) {
      d3.select(svgRef.current)
        .transition()
        .call(zoom.transform, d3.zoomIdentity);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[600px] bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !graphData) {
    return (
      <div className="w-full h-[600px] bg-slate-900 rounded-xl border border-slate-700 flex items-center justify-center">
        <div className="text-center p-8">
          <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">{error || t.noData}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition-colors"
          aria-label={t.zoomIn}
          title={t.zoomIn}
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition-colors"
          aria-label={t.zoomOut}
          title={t.zoomOut}
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 bg-slate-800/90 hover:bg-slate-700 border border-slate-600 rounded-lg text-white transition-colors"
          aria-label={t.resetZoom}
          title={t.resetZoom}
        >
          <Maximize className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="absolute bottom-4 left-4 z-10 bg-slate-800/90 border border-slate-600 rounded-lg px-4 py-2">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-white font-medium">{graphData.metadata.user_nodes}</span>
            <span className="text-slate-400">{t.users}</span>
          </div>
          <div className="flex items-center gap-1">
            <Building className="w-4 h-4 text-green-400" />
            <span className="text-white font-medium">{graphData.metadata.club_nodes}</span>
            <span className="text-slate-400">{t.clubs}</span>
          </div>
          <div className="text-slate-500">|</div>
          <span className="text-slate-400">{graphData.metadata.total_edges} {t.connections}</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
        <svg ref={svgRef} data-testid="network-graph" />
      </div>

      {/* Legend */}
      <div className="mt-4 p-4 bg-slate-800 border border-slate-700 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-3">Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#3b82f6]" />
            <span className="text-slate-300">Beginner</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#8b5cf6]" />
            <span className="text-slate-300">Intermediate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#ec4899]" />
            <span className="text-slate-300">Advanced</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-[#10b981]" />
            <span className="text-slate-300">Club</span>
          </div>
        </div>
      </div>
    </div>
  );
}
