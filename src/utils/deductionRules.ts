import type { SuggestedDeduction, Player, RaidType } from '../types';
import { PHYSICAL_DPS_TYPES, CASTER_DPS_TYPES } from '../types';
import { FrostAuraDamage } from '../api/warcraftlogs';

export interface DeductionRuleContext {
  players: Player[];
  frostAuraDamage: FrostAuraDamage[]; // Damage taken from Sapphiron's Frost Aura
  flaskBuffs: Map<number, boolean>; // playerId -> hasFlask
  raidType: RaidType;
}

export interface DeductionRule {
  id: string;
  name: string;
  description: string;
  percentage: number;
  raidTypes: RaidType[]; // Which raid types this rule applies to
  check: (ctx: DeductionRuleContext) => SuggestedDeduction[];
}

// Helper: Get player class from players list (class is in subType, not type)
function getPlayerClass(players: Player[], playerId: number): string | null {
  const player = players.find((p) => p.id === playerId);
  return player?.subType || null;
}

// Rule: Physical DPS taking excessive frost aura damage on Sapphiron
const physicalDpsFrostResistRule: DeductionRule = {
  id: 'physical-dps-frost-resist',
  name: 'Frost Aura Damage (Physical DPS)',
  description: 'Physical DPS took unexpectedly high damage from Sapphiron frost aura',
  percentage: 20,
  raidTypes: ['naxxramas'],
  check: (ctx) => {
    const suggestions: SuggestedDeduction[] = [];
    const threshold = 120;

    for (const frData of ctx.frostAuraDamage) {
      const playerClass = getPlayerClass(ctx.players, frData.playerId);
      const isPhysicalDps = playerClass ? PHYSICAL_DPS_TYPES.includes(playerClass) : false;

      if (!isPhysicalDps) continue;

      if (frData.estimatedFrostResist < threshold) {
        suggestions.push({
          ruleId: 'physical-dps-frost-resist',
          playerId: frData.playerId,
          playerName: frData.playerName,
          percentage: 20,
          reason: 'Frost Aura Damage (Physical DPS)',
          details: `~${frData.estimatedFrostResist} FR`,
        });
      }
    }

    return suggestions;
  },
};

// Rule: Caster DPS taking excessive frost aura damage on Sapphiron
const casterDpsFrostResistRule: DeductionRule = {
  id: 'caster-dps-frost-resist',
  name: 'Frost Aura Damage (Caster DPS)',
  description: 'Caster DPS resisted unexpectedly little from Sapphiron frost aura',
  percentage: 20,
  raidTypes: ['naxxramas'],
  check: (ctx) => {
    const suggestions: SuggestedDeduction[] = [];
    const threshold = 160;

    for (const frData of ctx.frostAuraDamage) {
      const playerClass = getPlayerClass(ctx.players, frData.playerId);
      const isCasterDps = playerClass ? CASTER_DPS_TYPES.includes(playerClass) : false;

      if (!isCasterDps) continue;

      if (frData.estimatedFrostResist < threshold) {
        suggestions.push({
          ruleId: 'caster-dps-frost-resist',
          playerId: frData.playerId,
          playerName: frData.playerName,
          percentage: 20,
          reason: 'Frost Aura Damage (Caster DPS)',
          details: `~${frData.estimatedFrostResist} FR`,
        });
      }
    }

    return suggestions;
  },
};

// Rule: Any class without an active flask during the run
const noFlaskRule: DeductionRule = {
  id: 'no-flask',
  name: 'No Flask',
  description: 'Player without an active flask during the run',
  percentage: 50,
  raidTypes: ['naxxramas', 'worldtour'],
  check: (ctx) => {
    const suggestions: SuggestedDeduction[] = [];

    for (const player of ctx.players) {
      // player.type contains class name (Warrior, Mage, etc.) - actors already filtered to players in query
      const hasFlask = ctx.flaskBuffs.get(player.id) || false;

      if (!hasFlask) {
        suggestions.push({
          ruleId: 'no-flask',
          playerId: player.id,
          playerName: player.name,
          percentage: 50,
          reason: 'No Flask',
          details: 'No flask buff detected',
        });
      }
    }

    return suggestions;
  },
};

// Export all rules
export const DEDUCTION_RULES: DeductionRule[] = [
  physicalDpsFrostResistRule,
  casterDpsFrostResistRule,
  noFlaskRule,
];

// Get applicable rules for a raid type
export function getApplicableRules(raidType: RaidType): DeductionRule[] {
  return DEDUCTION_RULES.filter((rule) => rule.raidTypes.includes(raidType));
}

// Run all applicable rules and return suggestions
export function runDeductionRules(ctx: DeductionRuleContext): SuggestedDeduction[] {
  const applicableRules = getApplicableRules(ctx.raidType);
  const allSuggestions: SuggestedDeduction[] = [];

  for (const rule of applicableRules) {
    const suggestions = rule.check(ctx);
    allSuggestions.push(...suggestions);
  }

  return allSuggestions;
}
