import {
  ReportData,
  BonusAssignment,
  getBonusDefinitions,
  RankingEntry,
  CastEntry,
} from '../types';

function findRankedPlayer(entries: RankingEntry[], rank: number): RankingEntry | null {
  if (rank <= 0 || rank > entries.length) return null;
  const sorted = [...entries].sort((a, b) => b.total - a.total);
  return sorted[rank - 1] || null;
}

function findRankedCaster(entries: CastEntry[], rank: number): CastEntry | null {
  if (rank <= 0 || rank > entries.length) return null;
  const sorted = [...entries].sort((a, b) => b.total - a.total);
  return sorted[rank - 1] || null;
}

export function autoDetectBonuses(reportData: ReportData): BonusAssignment[] {
  const assignments: BonusAssignment[] = [];
  const bonusDefinitions = getBonusDefinitions(reportData.raidType);

  for (const bonus of bonusDefinitions) {
    let assignment: BonusAssignment = {
      bonusId: bonus.id,
      playerId: null,
      playerName: null,
      autoDetected: false,
    };

    switch (bonus.detectionMethod) {
      case 'damageTaken': {
        if (bonus.rank) {
          const player = findRankedPlayer(reportData.damageTaken, bonus.rank);
          if (player) {
            assignment = {
              bonusId: bonus.id,
              playerId: player.id,
              playerName: player.name,
              autoDetected: true,
            };
          }
        }
        break;
      }

      case 'damageDone': {
        if (bonus.rank) {
          const player = findRankedPlayer(reportData.damageDone, bonus.rank);
          if (player) {
            assignment = {
              bonusId: bonus.id,
              playerId: player.id,
              playerName: player.name,
              autoDetected: true,
            };
          }
        }
        break;
      }

      case 'healingDone': {
        if (bonus.rank) {
          const player = findRankedPlayer(reportData.healingDone, bonus.rank);
          if (player) {
            assignment = {
              bonusId: bonus.id,
              playerId: player.id,
              playerName: player.name,
              autoDetected: true,
            };
          }
        }
        break;
      }

      case 'dispel': {
        if (bonus.rank) {
          const sorted = [...reportData.dispels].sort((a, b) => b.total - a.total);
          const player = sorted[bonus.rank - 1];
          if (player) {
            assignment = {
              bonusId: bonus.id,
              playerId: player.id,
              playerName: player.name,
              autoDetected: true,
            };
          }
        }
        break;
      }

      case 'cast': {
        let castData: CastEntry[] = [];

        // Map bonus IDs to their cast data
        switch (bonus.id) {
          case 'priestMc1':
          case 'priestMc2':
            castData = reportData.castsMindControl;
            break;
          case 'kings':
            castData = reportData.castsKings;
            break;
          case 'mightWisdom':
            castData = reportData.castsMightWisdom;
            break;
          case 'salvation':
            castData = reportData.castsSalvation;
            break;
          case 'exposeArmor':
            castData = reportData.castsExposeArmor;
            break;
          case 'faerieFire':
            castData = reportData.castsFaerieFire;
            break;
          case 'curseRecklessness':
            castData = reportData.castsCurseRecklessness;
            break;
          case 'curseElements':
            castData = reportData.castsCurseElements;
            break;
          case 'topDecurse':
            castData = reportData.castsDecurse;
            break;
        }

        if (castData.length > 0) {
          const rank = bonus.rank || 1;
          const player = findRankedCaster(castData, rank);
          if (player) {
            assignment = {
              bonusId: bonus.id,
              playerId: player.id,
              playerName: player.name,
              autoDetected: true,
            };
          }
        }
        break;
      }

      case 'manual':
      case 'buff':
      case 'debuff':
        // No auto-detection for manual, buff/debuff now handled via cast
        break;
    }

    assignments.push(assignment);
  }

  return assignments;
}
