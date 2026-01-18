import {
  Config,
  BonusAssignment,
  PlayerCut,
  BONUS_DEFINITIONS,
  Player,
} from '../types';

export interface CalculationResult {
  goldToDistribute: number;
  bonusPool: number;
  evenSplitPool: number;
  baseCut: number;
  playerCuts: PlayerCut[];
  totalDistributed: number;
}

export function calculateCuts(
  config: Config,
  assignments: BonusAssignment[],
  players: Player[]
): CalculationResult {
  const { totalPot, organizerCutPercent, bonusPoolPercent, playerCount } = config;

  // Calculate pools
  const goldToDistribute = totalPot * (1 - organizerCutPercent / 100);
  const bonusPool = totalPot * (bonusPoolPercent / 100);
  const evenSplitPool = goldToDistribute - bonusPool;
  const baseCut = evenSplitPool / playerCount;

  // Build player cuts
  const playerCutsMap = new Map<number, PlayerCut>();

  // Initialize all players with base cut
  for (const player of players) {
    playerCutsMap.set(player.id, {
      id: player.id,
      name: player.name,
      baseCut,
      bonuses: [],
      totalCut: baseCut,
    });
  }

  // Add bonuses
  for (const assignment of assignments) {
    if (assignment.playerId === null) continue;

    const bonus = BONUS_DEFINITIONS.find((b) => b.id === assignment.bonusId);
    if (!bonus) continue;

    const bonusAmount = totalPot * (bonus.percentage / 100);

    let playerCut = playerCutsMap.get(assignment.playerId);
    if (!playerCut) {
      // Player not in raid (manual assignment to external player)
      playerCut = {
        id: assignment.playerId,
        name: assignment.playerName || `Player ${assignment.playerId}`,
        baseCut,
        bonuses: [],
        totalCut: baseCut,
      };
      playerCutsMap.set(assignment.playerId, playerCut);
    }

    playerCut.bonuses.push({
      bonusId: bonus.id,
      bonusName: bonus.name,
      amount: bonusAmount,
    });
    playerCut.totalCut += bonusAmount;
  }

  const playerCuts = Array.from(playerCutsMap.values()).sort(
    (a, b) => b.totalCut - a.totalCut
  );

  const totalDistributed = playerCuts.reduce((sum, p) => sum + p.totalCut, 0);

  return {
    goldToDistribute,
    bonusPool,
    evenSplitPool,
    baseCut,
    playerCuts,
    totalDistributed,
  };
}

export function formatGold(amount: number): string {
  return Math.round(amount).toLocaleString();
}

export function generateGargulExport(playerCuts: PlayerCut[]): string {
  const header = 'Player,Gold';
  const rows = playerCuts.map((p) => `${p.name},${Math.round(p.totalCut)}`);
  return [header, ...rows].join('\n');
}
