'use client';

/**
 * Tournament Bracket Visualization Component
 *
 * Renders single and double elimination tournament brackets
 * with SVG-based visualization and interactive features
 */

import { useEffect, useState, useRef } from 'react';
import type { TournamentBracket, TournamentMatch } from '@/types/database';
import {
  transformBracketData,
  calculateBracketLayout,
  getMatchPosition,
  type BracketMatchNode,
  type BracketStructure
} from '@/lib/bracket-transform';

interface BracketVisualizationProps {
  tournamentId: string;
  tournamentType: string;
}

interface BracketApiResponse {
  brackets: Record<string, TournamentBracket[]>;
  matches: (TournamentMatch & {
    tournament_round?: { round_number: number };
  })[];
}

export default function BracketVisualization({
  tournamentId,
  tournamentType
}: BracketVisualizationProps) {
  const [bracketData, setBracketData] = useState<BracketStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    async function fetchBracket() {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/bracket`);
        if (!res.ok) throw new Error('Failed to fetch bracket data');

        const data: BracketApiResponse = await res.json();

        // Flatten brackets from grouped structure
        const allBrackets = Object.values(data.brackets).flat();

        // Transform to visualization structure
        const structure = transformBracketData(
          allBrackets,
          data.matches,
          tournamentType
        );

        setBracketData(structure);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchBracket();
  }, [tournamentId, tournamentType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }

  if (!bracketData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-600">No bracket data available</p>
      </div>
    );
  }

  const layout = calculateBracketLayout(bracketData);

  // Group matches by round for positioning
  const upperByRound = new Map<number, BracketMatchNode[]>();
  bracketData.upper.forEach(match => {
    const matches = upperByRound.get(match.round) || [];
    matches.push(match);
    upperByRound.set(match.round, matches);
  });

  const lowerByRound = new Map<number, BracketMatchNode[]>();
  bracketData.lower?.forEach(match => {
    const matches = lowerByRound.get(match.round) || [];
    matches.push(match);
    lowerByRound.set(match.round, matches);
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Bracket {bracketData.type === 'double' ? '(Double Elimination)' : '(Single Elimination)'}
        </h3>
        <button
          onClick={() => {
            if (svgRef.current) {
              const svgData = new XMLSerializer().serializeToString(svgRef.current);
              const blob = new Blob([svgData], { type: 'image/svg+xml' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `bracket-${tournamentId}.svg`;
              link.click();
              URL.revokeObjectURL(url);
            }
          }}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Download SVG
        </button>
      </div>

      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          width={layout.width}
          height={layout.height}
          className="border border-gray-200 rounded"
        >
          {/* Upper Bracket */}
          {Array.from(upperByRound.entries()).map(([round, matches]) => (
            <g key={`upper-round-${round}`}>
              {/* Round Header */}
              <text
                x={(round - 1) * (layout.matchWidth + layout.horizontalGap) + layout.horizontalGap + layout.matchWidth / 2}
                y={15}
                textAnchor="middle"
                className="text-sm font-semibold fill-gray-700"
              >
                Round {round}
              </text>

              {/* Matches */}
              {matches.map((match, index) => {
                const pos = getMatchPosition(match, layout, matches.length, index, false);
                return (
                  <g key={match.id}>
                    {/* Connector line to next match */}
                    {match.nextMatchId && (
                      <BracketConnector
                        fromX={pos.x + layout.matchWidth}
                        fromY={pos.y + layout.matchHeight / 2}
                        toMatch={bracketData.upper.find(m => m.id === match.nextMatchId)}
                        layout={layout}
                        upperByRound={upperByRound}
                        isLower={false}
                      />
                    )}

                    {/* Match Box */}
                    <MatchBox
                      match={match}
                      x={pos.x}
                      y={pos.y}
                      width={layout.matchWidth}
                      height={layout.matchHeight}
                      isSelected={selectedMatch === match.id}
                      onClick={() => setSelectedMatch(match.id)}
                    />
                  </g>
                );
              })}
            </g>
          ))}

          {/* Lower Bracket (Double Elimination) */}
          {bracketData.lower && Array.from(lowerByRound.entries()).map(([round, matches]) => (
            <g key={`lower-round-${round}`}>
              {/* Round Header */}
              <text
                x={(round - 1) * (layout.matchWidth + layout.horizontalGap) + layout.horizontalGap + layout.matchWidth / 2}
                y={layout.upperHeight + 45}
                textAnchor="middle"
                className="text-sm font-semibold fill-gray-700"
              >
                LB Round {round}
              </text>

              {/* Matches */}
              {matches.map((match, index) => {
                const pos = getMatchPosition(match, layout, matches.length, index, true);
                return (
                  <g key={match.id}>
                    {/* Connector line to next match */}
                    {match.nextMatchId && bracketData.lower && (
                      <BracketConnector
                        fromX={pos.x + layout.matchWidth}
                        fromY={pos.y + layout.matchHeight / 2}
                        toMatch={bracketData.lower.find(m => m.id === match.nextMatchId)}
                        layout={layout}
                        upperByRound={lowerByRound}
                        isLower={true}
                      />
                    )}

                    {/* Match Box */}
                    <MatchBox
                      match={match}
                      x={pos.x}
                      y={pos.y}
                      width={layout.matchWidth}
                      height={layout.matchHeight}
                      isSelected={selectedMatch === match.id}
                      onClick={() => setSelectedMatch(match.id)}
                    />
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Match Details Panel */}
      {selectedMatch && (
        <MatchDetailsPanel
          match={bracketData.upper.find(m => m.id === selectedMatch) ||
            bracketData.lower?.find(m => m.id === selectedMatch)}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

/**
 * Match Box Component
 */
function MatchBox({
  match,
  x,
  y,
  width,
  height,
  isSelected,
  onClick
}: {
  match: BracketMatchNode;
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusColors = {
    completed: 'fill-green-50 stroke-green-600',
    in_progress: 'fill-blue-50 stroke-blue-600',
    pending: 'fill-gray-50 stroke-gray-300',
    cancelled: 'fill-red-50 stroke-red-600'
  };

  const color = statusColors[match.status as keyof typeof statusColors] || statusColors.pending;

  return (
    <g onClick={onClick} className="cursor-pointer">
      {/* Match Container */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        className={`${color} ${isSelected ? 'stroke-2' : 'stroke-1'}`}
        rx={4}
      />

      {/* Team 1 */}
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height / 2}
          className={match.team1?.isWinner ? 'fill-green-100' : 'fill-transparent'}
        />
        <text
          x={x + 8}
          y={y + height / 4 + 5}
          className="text-sm fill-gray-800"
        >
          {match.team1?.name || 'TBD'}
        </text>
        {match.team1?.score !== undefined && (
          <text
            x={x + width - 8}
            y={y + height / 4 + 5}
            textAnchor="end"
            className="text-sm font-semibold fill-gray-900"
          >
            {match.team1.score}
          </text>
        )}
      </g>

      {/* Divider */}
      <line
        x1={x}
        y1={y + height / 2}
        x2={x + width}
        y2={y + height / 2}
        className="stroke-gray-300 stroke-1"
      />

      {/* Team 2 */}
      <g>
        <rect
          x={x}
          y={y + height / 2}
          width={width}
          height={height / 2}
          className={match.team2?.isWinner ? 'fill-green-100' : 'fill-transparent'}
        />
        <text
          x={x + 8}
          y={y + 3 * height / 4 + 5}
          className="text-sm fill-gray-800"
        >
          {match.team2?.name || 'TBD'}
        </text>
        {match.team2?.score !== undefined && (
          <text
            x={x + width - 8}
            y={y + 3 * height / 4 + 5}
            textAnchor="end"
            className="text-sm font-semibold fill-gray-900"
          >
            {match.team2.score}
          </text>
        )}
      </g>
    </g>
  );
}

/**
 * Bracket Connector Component
 */
function BracketConnector({
  fromX,
  fromY,
  toMatch,
  layout,
  upperByRound,
  isLower
}: {
  fromX: number;
  fromY: number;
  toMatch?: BracketMatchNode;
  layout: ReturnType<typeof calculateBracketLayout>;
  upperByRound: Map<number, BracketMatchNode[]>;
  isLower: boolean;
}) {
  if (!toMatch) return null;

  const toRoundMatches = upperByRound.get(toMatch.round) || [];
  const toIndex = toRoundMatches.findIndex(m => m.id === toMatch.id);
  const toPos = getMatchPosition(toMatch, layout, toRoundMatches.length, toIndex, isLower);

  const toX = toPos.x;
  const toY = toPos.y + layout.matchHeight / 2;

  const midX = (fromX + toX) / 2;

  return (
    <path
      d={`M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`}
      className="stroke-gray-400 stroke-2 fill-none"
    />
  );
}

/**
 * Match Details Panel Component
 */
function MatchDetailsPanel({
  match,
  onClose
}: {
  match?: BracketMatchNode;
  onClose: () => void;
}) {
  if (!match) return null;

  return (
    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Match Details</h4>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2 text-sm">
        <p><span className="font-medium">Round:</span> {match.round}</p>
        <p><span className="font-medium">Position:</span> {match.position}</p>
        <p><span className="font-medium">Status:</span> {match.status}</p>
        {match.scheduledAt && (
          <p><span className="font-medium">Scheduled:</span> {new Date(match.scheduledAt).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
