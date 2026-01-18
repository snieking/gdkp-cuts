export interface Player {
  id: number;
  name: string;
  type: string;
  subType: string;
}

export interface Fight {
  id: number;
  name: string;
  startTime: number;
  endTime: number;
}

export interface RankingEntry {
  id: number;
  name: string;
  total: number;
}

export interface BuffDebuffEntry {
  id: number;
  name: string;
  abilityGameID: number;
  totalUptime: number;
}

export interface DispelEntry {
  id: number;
  name: string;
  total: number;
}

export interface CastEntry {
  id: number;
  name: string;
  total: number;
}

export type BonusCategory = 'tank' | 'dps' | 'healer' | 'debuff' | 'utility' | 'manual';

export interface BonusDefinition {
  id: string;
  name: string;
  percentage: number;
  category: BonusCategory;
  detectionMethod: 'damageTaken' | 'damageDone' | 'healingDone' | 'debuff' | 'buff' | 'dispel' | 'cast' | 'manual';
  rank?: number;
  spellId?: number;
  fightName?: string;
}

export const BONUS_DEFINITIONS: BonusDefinition[] = [
  // Tanks (by damage taken)
  { id: 'tank1', name: 'Tank 1', percentage: 1.15, category: 'tank', detectionMethod: 'damageTaken', rank: 1 },
  { id: 'tank2', name: 'Tank 2', percentage: 1.15, category: 'tank', detectionMethod: 'damageTaken', rank: 2 },
  { id: 'tank3', name: 'Tank 3', percentage: 0.95, category: 'tank', detectionMethod: 'damageTaken', rank: 3 },
  { id: 'tank4', name: 'Tank 4', percentage: 0.65, category: 'tank', detectionMethod: 'damageTaken', rank: 4 },
  { id: 'tank5', name: 'Tank 5', percentage: 0.45, category: 'tank', detectionMethod: 'damageTaken', rank: 5 },
  { id: 'tank6', name: 'Tank 6', percentage: 0.40, category: 'tank', detectionMethod: 'damageTaken', rank: 6 },

  // DPS (by damage done)
  { id: 'dps1', name: 'DPS 1', percentage: 1.20, category: 'dps', detectionMethod: 'damageDone', rank: 1 },
  { id: 'dps2', name: 'DPS 2', percentage: 1.05, category: 'dps', detectionMethod: 'damageDone', rank: 2 },
  { id: 'dps3', name: 'DPS 3', percentage: 0.90, category: 'dps', detectionMethod: 'damageDone', rank: 3 },
  { id: 'dps4', name: 'DPS 4', percentage: 0.80, category: 'dps', detectionMethod: 'damageDone', rank: 4 },
  { id: 'dps5', name: 'DPS 5', percentage: 0.70, category: 'dps', detectionMethod: 'damageDone', rank: 5 },
  { id: 'dps6', name: 'DPS 6', percentage: 0.60, category: 'dps', detectionMethod: 'damageDone', rank: 6 },
  { id: 'dps7', name: 'DPS 7', percentage: 0.50, category: 'dps', detectionMethod: 'damageDone', rank: 7 },
  { id: 'dps8', name: 'DPS 8', percentage: 0.40, category: 'dps', detectionMethod: 'damageDone', rank: 8 },
  { id: 'dps9', name: 'DPS 9', percentage: 0.35, category: 'dps', detectionMethod: 'damageDone', rank: 9 },
  { id: 'dps10', name: 'DPS 10', percentage: 0.25, category: 'dps', detectionMethod: 'damageDone', rank: 10 },
  { id: 'dps11', name: 'DPS 11', percentage: 0.25, category: 'dps', detectionMethod: 'damageDone', rank: 11 },
  { id: 'dps12', name: 'DPS 12', percentage: 0.20, category: 'dps', detectionMethod: 'damageDone', rank: 12 },
  { id: 'dps13', name: 'DPS 13', percentage: 0.20, category: 'dps', detectionMethod: 'damageDone', rank: 13 },

  // Healers (by healing done)
  { id: 'healer1', name: 'Healer 1', percentage: 0.80, category: 'healer', detectionMethod: 'healingDone', rank: 1 },
  { id: 'healer2', name: 'Healer 2', percentage: 0.70, category: 'healer', detectionMethod: 'healingDone', rank: 2 },
  { id: 'healer3', name: 'Healer 3', percentage: 0.60, category: 'healer', detectionMethod: 'healingDone', rank: 3 },
  { id: 'healer4', name: 'Healer 4', percentage: 0.50, category: 'healer', detectionMethod: 'healingDone', rank: 4 },
  { id: 'healer5', name: 'Healer 5', percentage: 0.40, category: 'healer', detectionMethod: 'healingDone', rank: 5 },
  { id: 'healer6', name: 'Healer 6', percentage: 0.30, category: 'healer', detectionMethod: 'healingDone', rank: 6 },
  { id: 'healer7', name: 'Healer 7', percentage: 0.20, category: 'healer', detectionMethod: 'healingDone', rank: 7 },
  { id: 'healer8', name: 'Healer 8', percentage: 0.15, category: 'healer', detectionMethod: 'healingDone', rank: 8 },

  // Debuffs (detected by cast count)
  { id: 'exposeArmor', name: 'Expose / IEA', percentage: 0.40, category: 'debuff', detectionMethod: 'cast', rank: 1 },
  { id: 'faerieFire', name: 'Faerie Fire', percentage: 0.40, category: 'debuff', detectionMethod: 'cast', rank: 1 },
  { id: 'curseRecklessness', name: 'CoR', percentage: 0.40, category: 'debuff', detectionMethod: 'cast', rank: 1 },
  { id: 'curseElements', name: 'CoE', percentage: 0.40, category: 'debuff', detectionMethod: 'cast', rank: 1 },

  // Utility (detected by cast count)
  { id: 'priestMc1', name: 'Priest MC 1', percentage: 0.30, category: 'utility', detectionMethod: 'cast', rank: 1 },
  { id: 'priestMc2', name: 'Priest MC 2', percentage: 0.30, category: 'utility', detectionMethod: 'cast', rank: 2 },
  { id: 'topDecurse', name: 'Top Decurse', percentage: 0.20, category: 'utility', detectionMethod: 'cast', rank: 1 },
  { id: 'kings', name: 'Kings', percentage: 0.35, category: 'utility', detectionMethod: 'cast', rank: 1 },
  { id: 'mightWisdom', name: 'Might + Wisdom', percentage: 0.20, category: 'utility', detectionMethod: 'cast', rank: 1 },
  { id: 'salvation', name: 'Salvation', percentage: 0.25, category: 'utility', detectionMethod: 'cast', rank: 1 },

  // Manual
  { id: 'pullingMarks', name: 'Pulling + Marks', percentage: 0.70, category: 'manual', detectionMethod: 'manual' },
  { id: 'topSpender', name: 'Top Spender', percentage: 0.30, category: 'manual', detectionMethod: 'manual' },
  { id: 'masterLooter', name: 'Master Looter', percentage: 1.00, category: 'manual', detectionMethod: 'manual' },
];

export interface BonusAssignment {
  bonusId: string;
  playerId: number | null;
  playerName: string | null;
  autoDetected: boolean;
}

export interface Config {
  totalPot: number;
  organizerCutPercent: number;
  bonusPoolPercent: number;
  playerCount: number;
}

export interface Deduction {
  id: string;
  playerId: number;
  playerName: string;
  percentage: number;
  reason: string;
}

export interface PlayerCut {
  id: number;
  name: string;
  baseCut: number;
  bonuses: { bonusId: string; bonusName: string; amount: number }[];
  deduction: number;
  redistributedGain: number;
  totalCut: number;
}

export interface ReportData {
  code: string;
  zone: { id: number; name: string };
  fights: Fight[];
  players: Player[];
  damageDone: RankingEntry[];
  healingDone: RankingEntry[];
  damageTaken: RankingEntry[];
  buffs: BuffDebuffEntry[];
  debuffs: BuffDebuffEntry[];
  dispels: DispelEntry[];
  // Cast data by ability
  castsMindControl: CastEntry[];
  castsKings: CastEntry[];
  castsMight: CastEntry[];
  castsWisdom: CastEntry[];
  castsMightWisdom: CastEntry[]; // Combined Might + Wisdom
  castsSalvation: CastEntry[];
  castsExposeArmor: CastEntry[];
  castsFaerieFire: CastEntry[];
  castsCurseRecklessness: CastEntry[];
  castsCurseElements: CastEntry[];
  castsDecurse: CastEntry[]; // Remove Lesser Curse + Remove Curse
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

// Spell IDs for cast detection
export const SPELL_IDS = {
  // Blessings (regular)
  BLESSING_OF_KINGS: 20217,
  BLESSING_OF_MIGHT: 25291,
  BLESSING_OF_WISDOM: 25290,
  BLESSING_OF_SALVATION: 1038,
  // Greater Blessings
  GREATER_BLESSING_OF_KINGS: 25898,
  GREATER_BLESSING_OF_MIGHT: 25916,
  GREATER_BLESSING_OF_WISDOM: 25894,
  GREATER_BLESSING_OF_SALVATION: 25895,
  // Debuffs
  EXPOSE_ARMOR: 11198,
  FAERIE_FIRE: 9907,
  CURSE_OF_RECKLESSNESS: 11717,
  CURSE_OF_ELEMENTS: 11722,
  // Mind Control (all ranks)
  MIND_CONTROL_1: 605,
  MIND_CONTROL_2: 10911,
  MIND_CONTROL_3: 10912,
  // Decurse abilities
  REMOVE_LESSER_CURSE: 475,  // Mage
  REMOVE_CURSE: 2782,        // Druid
};

export const NAXXRAMAS_ZONE_ID = 533;
