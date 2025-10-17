import { describe, it, expect } from 'vitest';
import {
  generateKnockoutBracket,
  generateDoubleEliminationBracket,
  validateKnockoutBracket,
  validateDoubleEliminationBracket,
  calculateKnockoutRounds,
  seedParticipants,
  isPowerOfTwo,
  getByePlayersForKnockout,
} from '../knockout';
import type { Participant } from '../types';

// Helper function to create mock participants
function createMockParticipants(count: number, status: Participant['status'] = 'checked_in'): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `participant-${i + 1}`,
    user_id: `user-${i + 1}`,
    tournament_id: 'tournament-1',
    status,
  }));
}

describe('Knockout Tournament Generator', () => {
  describe('isPowerOfTwo', () => {
    it('should identify powers of two correctly', () => {
      expect(isPowerOfTwo(2)).toBe(true);
      expect(isPowerOfTwo(4)).toBe(true);
      expect(isPowerOfTwo(8)).toBe(true);
      expect(isPowerOfTwo(16)).toBe(true);
      expect(isPowerOfTwo(32)).toBe(true);
      expect(isPowerOfTwo(64)).toBe(true);
    });

    it('should identify non-powers of two correctly', () => {
      expect(isPowerOfTwo(3)).toBe(false);
      expect(isPowerOfTwo(5)).toBe(false);
      expect(isPowerOfTwo(6)).toBe(false);
      expect(isPowerOfTwo(7)).toBe(false);
      expect(isPowerOfTwo(9)).toBe(false);
      expect(isPowerOfTwo(12)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isPowerOfTwo(1)).toBe(true);
      expect(isPowerOfTwo(0)).toBe(false);
    });
  });

  describe('calculateKnockoutRounds', () => {
    it('should calculate correct number of rounds', () => {
      expect(calculateKnockoutRounds(2)).toBe(1);
      expect(calculateKnockoutRounds(4)).toBe(2);
      expect(calculateKnockoutRounds(8)).toBe(3);
      expect(calculateKnockoutRounds(16)).toBe(4);
      expect(calculateKnockoutRounds(32)).toBe(5);
    });

    it('should round up to next power of 2', () => {
      expect(calculateKnockoutRounds(3)).toBe(2); // 4 players = 2 rounds
      expect(calculateKnockoutRounds(5)).toBe(3); // 8 players = 3 rounds
      expect(calculateKnockoutRounds(9)).toBe(4); // 16 players = 4 rounds
    });
  });

  describe('seedParticipants', () => {
    it('should seed participants with ranked method', () => {
      const participants = createMockParticipants(8);
      const seeded = seedParticipants(participants, 8, 'ranked');

      expect(seeded).toHaveLength(8);
      expect(seeded[0]).toBe('participant-1'); // Top seed
      expect(seeded[7]).toBe('participant-8'); // Bottom seed
    });

    it('should handle bracket size larger than participant count', () => {
      const participants = createMockParticipants(6);
      const seeded = seedParticipants(participants, 8, 'ranked');

      expect(seeded).toHaveLength(8);
      expect(seeded.filter(p => p === null)).toHaveLength(2); // 2 BYEs
    });

    it('should seed randomly when method is random', () => {
      const participants = createMockParticipants(8);
      const seeded = seedParticipants(participants, 8, 'random');

      expect(seeded).toHaveLength(8);
      expect(seeded.every(p => p !== null)).toBe(true);
    });

    it('should use custom seed order when provided', () => {
      const participants = createMockParticipants(4);
      const seedOrder = ['participant-4', 'participant-3', 'participant-2', 'participant-1'];
      const seeded = seedParticipants(participants, 4, 'manual', seedOrder);

      expect(seeded[0]).toBe('participant-4');
      expect(seeded[3]).toBe('participant-1');
    });
  });

  describe('getByePlayersForKnockout', () => {
    it('should identify bye positions correctly', () => {
      const participants = createMockParticipants(6);
      const bracket = generateKnockoutBracket(participants);
      const byes = getByePlayersForKnockout(bracket);

      expect(byes.length).toBeGreaterThan(0);
      expect(bracket.totalByes).toBe(2); // 8 - 6 = 2 byes
    });

    it('should return empty array when no byes', () => {
      const participants = createMockParticipants(8);
      const bracket = generateKnockoutBracket(participants);
      const byes = getByePlayersForKnockout(bracket);

      expect(byes).toHaveLength(0);
      expect(bracket.totalByes).toBe(0);
    });
  });

  describe('generateKnockoutBracket', () => {
    it('should generate bracket for power of 2 participants', () => {
      const participants = createMockParticipants(8);
      const bracket = generateKnockoutBracket(participants);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.totalByes).toBe(0);
      expect(bracket.rounds).toHaveLength(3); // QF, SF, F
      expect(bracket.rounds[0].matches).toHaveLength(4); // Quarterfinals
      expect(bracket.rounds[1].matches).toHaveLength(2); // Semifinals
      expect(bracket.rounds[2].matches).toHaveLength(1); // Final
    });

    it('should generate bracket for non-power of 2 participants', () => {
      const participants = createMockParticipants(6);
      const bracket = generateKnockoutBracket(participants);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.totalByes).toBe(2);
      expect(bracket.rounds).toHaveLength(3);
    });

    it('should handle 16 participants correctly', () => {
      const participants = createMockParticipants(16);
      const bracket = generateKnockoutBracket(participants);

      expect(bracket.bracketSize).toBe(16);
      expect(bracket.totalByes).toBe(0);
      expect(bracket.rounds).toHaveLength(4); // R16, QF, SF, F
      expect(bracket.rounds[0].matches).toHaveLength(8);
    });

    it('should handle 32 participants correctly', () => {
      const participants = createMockParticipants(32);
      const bracket = generateKnockoutBracket(participants);

      expect(bracket.bracketSize).toBe(32);
      expect(bracket.totalByes).toBe(0);
      expect(bracket.rounds).toHaveLength(5); // R32, R16, QF, SF, F
    });

    it('should handle 64 participants correctly', () => {
      const participants = createMockParticipants(64);
      const bracket = generateKnockoutBracket(participants);

      expect(bracket.bracketSize).toBe(64);
      expect(bracket.totalByes).toBe(0);
      expect(bracket.rounds).toHaveLength(6); // R64, R32, R16, QF, SF, F
    });

    it('should throw error for insufficient participants', () => {
      const participants = createMockParticipants(1);

      expect(() => generateKnockoutBracket(participants)).toThrow();
    });

    it('should only include checked-in participants', () => {
      const participants = [
        ...createMockParticipants(6, 'checked_in'),
        ...createMockParticipants(2, 'registered'),
      ];
      const bracket = generateKnockoutBracket(participants);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.totalByes).toBe(2); // Only 6 checked in
    });

    it('should generate singles bracket correctly', () => {
      const participants = createMockParticipants(4);
      const bracket = generateKnockoutBracket(participants, 'ranked', undefined, false);

      expect(bracket.rounds[0].matches).toHaveLength(2);
      expect(bracket.rounds[0].matches[0].team1_player1_id).toBe(bracket.rounds[0].matches[0].team1_player2_id);
    });

    it('should use different seeding methods', () => {
      const participants = createMockParticipants(8);

      const rankedBracket = generateKnockoutBracket(participants, 'ranked');
      const randomBracket = generateKnockoutBracket(participants, 'random');

      expect(rankedBracket.rounds[0].matches).toHaveLength(4);
      expect(randomBracket.rounds[0].matches).toHaveLength(4);
    });

    it('should handle odd number of participants', () => {
      const participants = createMockParticipants(7);
      const bracket = generateKnockoutBracket(participants);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.totalByes).toBe(1);
    });
  });

  describe('generateDoubleEliminationBracket', () => {
    it('should generate winners and losers brackets', () => {
      const participants = createMockParticipants(8);
      const bracket = generateDoubleEliminationBracket(participants);

      expect(bracket.winnersBracket).toBeDefined();
      expect(bracket.losersBracket).toBeDefined();
      expect(bracket.grandFinal).toBeDefined();
      expect(bracket.winnersBracket.rounds).toHaveLength(3);
    });

    it('should have correct losers bracket size', () => {
      const participants = createMockParticipants(8);
      const bracket = generateDoubleEliminationBracket(participants);

      // Losers bracket should accommodate all but 1 player
      expect(bracket.losersBracket.rounds.length).toBeGreaterThan(0);
    });

    it('should handle 16 participants in double elimination', () => {
      const participants = createMockParticipants(16);
      const bracket = generateDoubleEliminationBracket(participants);

      expect(bracket.winnersBracket.bracketSize).toBe(16);
      expect(bracket.losersBracket.rounds.length).toBeGreaterThan(0);
    });

    it('should throw error for insufficient participants', () => {
      const participants = createMockParticipants(1);

      expect(() => generateDoubleEliminationBracket(participants)).toThrow();
    });
  });

  describe('validateKnockoutBracket', () => {
    it('should validate a valid bracket', () => {
      const participants = createMockParticipants(8);
      const bracket = generateKnockoutBracket(participants);
      const validation = validateKnockoutBracket(bracket, participants);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid bracket size', () => {
      const participants = createMockParticipants(8);
      const bracket = generateKnockoutBracket(participants);
      bracket.bracketSize = 7; // Not power of 2

      const validation = validateKnockoutBracket(bracket, participants);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing rounds', () => {
      const participants = createMockParticipants(8);
      const bracket = generateKnockoutBracket(participants);
      bracket.rounds = bracket.rounds.slice(0, 1); // Remove rounds

      const validation = validateKnockoutBracket(bracket, participants);

      expect(validation.isValid).toBe(false);
    });
  });

  describe('validateDoubleEliminationBracket', () => {
    it('should validate a valid double elimination bracket', () => {
      const participants = createMockParticipants(8);
      const bracket = generateDoubleEliminationBracket(participants);
      const validation = validateDoubleEliminationBracket(bracket, participants);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid winners bracket', () => {
      const participants = createMockParticipants(8);
      const bracket = generateDoubleEliminationBracket(participants);
      bracket.winnersBracket.rounds = [];

      const validation = validateDoubleEliminationBracket(bracket, participants);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum participants for doubles', () => {
      const participants = createMockParticipants(4);
      const bracket = generateKnockoutBracket(participants, 'ranked', undefined, true);

      expect(bracket.rounds).toHaveLength(2);
      expect(bracket.totalByes).toBe(0);
    });

    it('should handle minimum participants for singles', () => {
      const participants = createMockParticipants(2);
      const bracket = generateKnockoutBracket(participants, 'ranked', undefined, false);

      expect(bracket.rounds).toHaveLength(1);
      expect(bracket.totalByes).toBe(0);
    });

    it('should handle all participants with withdrawn status', () => {
      const participants = createMockParticipants(8, 'withdrawn');

      expect(() => generateKnockoutBracket(participants)).toThrow();
    });

    it('should handle mix of participant statuses', () => {
      const participants = [
        ...createMockParticipants(4, 'checked_in'),
        ...createMockParticipants(2, 'registered'),
        ...createMockParticipants(2, 'no_show'),
      ];

      const bracket = generateKnockoutBracket(participants);
      expect(bracket.bracketSize).toBe(4);
    });
  });
});
