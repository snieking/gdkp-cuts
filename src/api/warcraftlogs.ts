import { getValidToken } from './auth';
import {
  GET_REPORT_DATA,
  GET_DAMAGE_DONE,
  GET_HEALING_DONE,
  GET_DAMAGE_TAKEN,
  GET_BUFFS,
  GET_DEBUFFS,
  GET_DISPELS,
  GET_CASTS_BY_TIME,
  GET_COMBATANT_INFO,
  GET_ALL_FIGHTS,
  GET_BUFFS_BY_ABILITY,
  GET_DAMAGE_EVENTS,
} from './queries';
import {
  ReportData,
  Player,
  Fight,
  RankingEntry,
  BuffDebuffEntry,
  DispelEntry,
  CastEntry,
  SPELL_IDS,
  FLASK_SPELL_IDS,
  detectRaidType,
  CombatantInfo,
} from '../types';

const API_URL = 'https://www.warcraftlogs.com/api/v2/client';

interface GraphQLResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

async function graphqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = await getValidToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  if (!result.data) {
    throw new Error('No data returned');
  }

  return result.data;
}

export function parseReportUrl(url: string): string | null {
  // Match patterns like:
  // https://classic.warcraftlogs.com/reports/ABC123
  // https://www.warcraftlogs.com/reports/ABC123
  // ABC123
  const match = url.match(/(?:warcraftlogs\.com\/reports\/)?([a-zA-Z0-9]+)(?:[#?]|$)/);
  return match ? match[1] : null;
}

export async function fetchReportData(code: string): Promise<ReportData> {
  // Fetch basic report data first
  const reportResult = await graphqlRequest<{
    reportData: {
      report: {
        startTime: number;
        endTime: number;
        zone: { id: number; name: string };
        fights: Fight[];
        masterData: { actors: Player[] };
      };
    };
  }>(GET_REPORT_DATA, { code });

  const report = reportResult.reportData.report;
  const { startTime, endTime } = report;
  const duration = endTime - startTime;

  // Helper for cast queries
  type CastResult = { reportData: { report: { table: { data: { entries: CastEntry[] } } } } };

  const fetchCastsByTime = (abilityID: number) =>
    graphqlRequest<CastResult>(GET_CASTS_BY_TIME, {
      code,
      startTime: 0,
      endTime: duration,
      abilityID,
    });

  // Fetch all tables in parallel using full report time range (includes trash)
  const [
    damageDoneResult,
    healingDoneResult,
    damageTakenResult,
    buffsResult,
    debuffsResult,
    dispelsResult,
    // Cast queries for each ability
    castsMindControl1Result,
    castsMindControl2Result,
    castsMindControl3Result,
    castsKingsResult,
    castsGreaterKingsResult,
    castsMightResult,
    castsGreaterMightResult,
    castsWisdomResult,
    castsGreaterWisdomResult,
    castsSalvationResult,
    castsGreaterSalvationResult,
    castsExposeArmorResult,
    castsFaerieFireResult,
    castsCurseRecklessnessResult,
    castsCurseElementsResult,
    castsRemoveLesserCurseResult,
    castsRemoveCurseResult,
    // Searing Pain - Warlock tank (all ranks)
    castsSearingPain1Result,
    castsSearingPain2Result,
    castsSearingPain3Result,
    castsSearingPain4Result,
    castsSearingPain5Result,
    castsSearingPain6Result,
  ] = await Promise.all([
    graphqlRequest<{ reportData: { report: { table: { data: { entries: RankingEntry[] } } } } }>(
      GET_DAMAGE_DONE,
      { code, startTime: 0, endTime: duration }
    ),
    graphqlRequest<{ reportData: { report: { table: { data: { entries: RankingEntry[] } } } } }>(
      GET_HEALING_DONE,
      { code, startTime: 0, endTime: duration }
    ),
    graphqlRequest<{ reportData: { report: { table: { data: { entries: RankingEntry[] } } } } }>(
      GET_DAMAGE_TAKEN,
      { code, startTime: 0, endTime: duration }
    ),
    graphqlRequest<{ reportData: { report: { table: { data: { auras: BuffDebuffEntry[] } } } } }>(
      GET_BUFFS,
      { code, startTime: 0, endTime: duration }
    ),
    graphqlRequest<{ reportData: { report: { table: { data: { auras: BuffDebuffEntry[] } } } } }>(
      GET_DEBUFFS,
      { code, startTime: 0, endTime: duration }
    ),
    graphqlRequest<{ reportData: { report: { table: { data: { entries: DispelEntry[] } } } } }>(
      GET_DISPELS,
      { code, startTime: 0, endTime: duration }
    ),
    // Mind Control - all ranks
    fetchCastsByTime(SPELL_IDS.MIND_CONTROL_1),
    fetchCastsByTime(SPELL_IDS.MIND_CONTROL_2),
    fetchCastsByTime(SPELL_IDS.MIND_CONTROL_3),
    // Blessings - full report
    fetchCastsByTime(SPELL_IDS.BLESSING_OF_KINGS),
    fetchCastsByTime(SPELL_IDS.GREATER_BLESSING_OF_KINGS),
    fetchCastsByTime(SPELL_IDS.BLESSING_OF_MIGHT),
    fetchCastsByTime(SPELL_IDS.GREATER_BLESSING_OF_MIGHT),
    fetchCastsByTime(SPELL_IDS.BLESSING_OF_WISDOM),
    fetchCastsByTime(SPELL_IDS.GREATER_BLESSING_OF_WISDOM),
    fetchCastsByTime(SPELL_IDS.BLESSING_OF_SALVATION),
    fetchCastsByTime(SPELL_IDS.GREATER_BLESSING_OF_SALVATION),
    // Debuffs - full report
    fetchCastsByTime(SPELL_IDS.EXPOSE_ARMOR),
    fetchCastsByTime(SPELL_IDS.FAERIE_FIRE),
    fetchCastsByTime(SPELL_IDS.CURSE_OF_RECKLESSNESS),
    fetchCastsByTime(SPELL_IDS.CURSE_OF_ELEMENTS),
    // Decurse abilities
    fetchCastsByTime(SPELL_IDS.REMOVE_LESSER_CURSE),
    fetchCastsByTime(SPELL_IDS.REMOVE_CURSE),
    // Searing Pain - Warlock tank (all ranks)
    fetchCastsByTime(SPELL_IDS.SEARING_PAIN_1),
    fetchCastsByTime(SPELL_IDS.SEARING_PAIN_2),
    fetchCastsByTime(SPELL_IDS.SEARING_PAIN_3),
    fetchCastsByTime(SPELL_IDS.SEARING_PAIN_4),
    fetchCastsByTime(SPELL_IDS.SEARING_PAIN_5),
    fetchCastsByTime(SPELL_IDS.SEARING_PAIN_6),
  ]);

  // Helper to merge cast entries (combine regular + greater blessings)
  const mergeCasts = (...results: CastResult[]): CastEntry[] => {
    const merged = new Map<number, CastEntry>();
    for (const result of results) {
      const entries = result.reportData.report.table?.data?.entries || [];
      for (const entry of entries) {
        const existing = merged.get(entry.id);
        if (existing) {
          existing.total += entry.total;
        } else {
          merged.set(entry.id, { ...entry });
        }
      }
    }
    return Array.from(merged.values());
  };

  const castsMight = mergeCasts(castsMightResult, castsGreaterMightResult);
  const castsWisdom = mergeCasts(castsWisdomResult, castsGreaterWisdomResult);

  // Extract unique zones from fights
  const zoneSet = new Set<string>();
  for (const fight of report.fights) {
    if (fight.gameZone?.name) {
      zoneSet.add(fight.gameZone.name);
    }
  }
  // Add primary zone if not already included
  if (report.zone.name) {
    zoneSet.add(report.zone.name);
  }
  const zones = Array.from(zoneSet);

  // Detect raid type - check all zones for World Tour detection
  let raidType = detectRaidType(report.zone.name);
  if (!raidType) {
    // Check if any fight zone matches
    for (const zoneName of zones) {
      raidType = detectRaidType(zoneName);
      if (raidType) break;
    }
  }
  if (!raidType) {
    throw new Error(`Unsupported zone: ${zones.join(', ')}. Only Naxxramas and World Tour (AQ40/BWL/MC) are supported.`);
  }

  return {
    code,
    zone: report.zone,
    zones,
    raidType,
    startTime,
    endTime,
    fights: report.fights,
    players: report.masterData.actors,
    damageDone: damageDoneResult.reportData.report.table?.data?.entries || [],
    healingDone: healingDoneResult.reportData.report.table?.data?.entries || [],
    damageTaken: damageTakenResult.reportData.report.table?.data?.entries || [],
    buffs: buffsResult.reportData.report.table?.data?.auras || [],
    debuffs: debuffsResult.reportData.report.table?.data?.auras || [],
    dispels: dispelsResult.reportData.report.table?.data?.entries || [],
    castsMindControl: mergeCasts(castsMindControl1Result, castsMindControl2Result, castsMindControl3Result),
    castsKings: mergeCasts(castsKingsResult, castsGreaterKingsResult),
    castsMight,
    castsWisdom,
    castsMightWisdom: mergeCasts(castsMightResult, castsGreaterMightResult, castsWisdomResult, castsGreaterWisdomResult),
    castsSalvation: mergeCasts(castsSalvationResult, castsGreaterSalvationResult),
    castsExposeArmor: castsExposeArmorResult.reportData.report.table?.data?.entries || [],
    castsFaerieFire: castsFaerieFireResult.reportData.report.table?.data?.entries || [],
    castsCurseRecklessness: castsCurseRecklessnessResult.reportData.report.table?.data?.entries || [],
    castsCurseElements: castsCurseElementsResult.reportData.report.table?.data?.entries || [],
    castsDecurse: mergeCasts(castsRemoveLesserCurseResult, castsRemoveCurseResult),
    castsSearingPain: mergeCasts(
      castsSearingPain1Result,
      castsSearingPain2Result,
      castsSearingPain3Result,
      castsSearingPain4Result,
      castsSearingPain5Result,
      castsSearingPain6Result
    ),
  };
}

// Fetch combatant info for specific fights (includes gear stats like frost resistance)
export async function fetchCombatantInfo(code: string, fightIDs: number[]): Promise<CombatantInfo[]> {
  // WCL playerDetails returns JSON directly with structure varying by game version
  // For Classic, combatantInfo contains gear array and stats
  interface PlayerDetailsEntry {
    id: number;
    name: string;
    type: string;
    specs?: { spec: string; role: string }[];
    combatantInfo?: {
      stats?: {
        // Classic WoW resistance stats
        Frost?: { min: number; max: number };
        Fire?: { min: number; max: number };
        Nature?: { min: number; max: number };
        Shadow?: { min: number; max: number };
        Arcane?: { min: number; max: number };
      };
      // Alternative: resistances might be in gear totals
      gear?: { permanentEnchant?: number; id: number }[];
    };
  }

  interface PlayerDetailsResponse {
    data?: {
      playerDetails?: {
        tanks?: PlayerDetailsEntry[];
        healers?: PlayerDetailsEntry[];
        dps?: PlayerDetailsEntry[];
      };
    };
    // Alternative flat structure
    tanks?: PlayerDetailsEntry[];
    healers?: PlayerDetailsEntry[];
    dps?: PlayerDetailsEntry[];
  }

  const result = await graphqlRequest<{
    reportData: {
      report: {
        playerDetails: PlayerDetailsResponse;
      };
    };
  }>(GET_COMBATANT_INFO, { code, fightIDs });

  const rawDetails = result.reportData.report.playerDetails;
  if (!rawDetails) {
    console.warn('No playerDetails returned from WCL API');
    return [];
  }

  // Handle nested data structure: { data: { playerDetails: { tanks, healers, dps } } }
  const details = rawDetails.data?.playerDetails || rawDetails;

  // Debug: log the full structure
  console.log('=== FROST RESISTANCE DEBUG ===');
  console.log('Raw playerDetails:', rawDetails);
  console.log('Parsed details:', details);

  // Log first player from each role with their full combatantInfo
  const firstDps = details.dps?.[0];
  const firstTank = details.tanks?.[0];
  if (firstDps) {
    console.log('First DPS player full data:', JSON.stringify(firstDps, null, 2));
    console.log('combatantInfo type:', typeof firstDps.combatantInfo, Array.isArray(firstDps.combatantInfo) ? 'array' : 'object');
  }
  if (firstTank) {
    console.log('First Tank player full data:', JSON.stringify(firstTank, null, 2));
  }
  console.log('=== END FROST RESISTANCE DEBUG ===');

  const allPlayers = [
    ...(details.tanks || []),
    ...(details.healers || []),
    ...(details.dps || []),
  ];

  return allPlayers.map((p) => {
    // Try to extract frost resistance from stats
    const frostStat = p.combatantInfo?.stats?.Frost;
    const frostResistance = frostStat?.min ?? frostStat?.max ?? 0;

    return {
      id: p.id,
      name: p.name,
      type: p.type,
      specs: p.specs || [],
      frostResistance,
    };
  });
}

// Fetch players who had flask buffs active during the raid
export async function fetchFlaskBuffs(
  code: string,
  startTime: number,
  endTime: number
): Promise<Map<number, boolean>> {
  const duration = endTime - startTime;
  const flaskPlayerIds = new Map<number, boolean>();

  // Query each flask type
  const flaskIds = Object.values(FLASK_SPELL_IDS);

  interface BuffEntry {
    id: number;
    name: string;
    totalUptime: number;
  }

  const results = await Promise.all(
    flaskIds.map((abilityID) =>
      graphqlRequest<{ reportData: { report: { table: { data: { auras: BuffEntry[] } } } } }>(
        GET_BUFFS_BY_ABILITY,
        { code, startTime: 0, endTime: duration, abilityID }
      )
    )
  );

  // Combine all flask buffs - if a player has ANY flask, they pass
  for (const result of results) {
    const auras = result.reportData.report.table?.data?.auras || [];
    for (const aura of auras) {
      if (aura.totalUptime > 0) {
        flaskPlayerIds.set(aura.id, true);
      }
    }
  }

  return flaskPlayerIds;
}

export interface FrostAuraDamage {
  playerId: number;
  playerName: string;
  playerType: string;
  totalDamage: number;
  totalUnmitigated: number; // Base damage before resists
  tickCount: number;
  estimatedFrostResist: number; // Calculated FR
}

// Calculate frost resistance from resist percentage
// Classic ERA formula appears to be: Resist% = FR / 315 (without 0.75 factor)
// Rearranged: FR = Resist% × 315
// This gives EFFECTIVE FR (includes all buffs like aura, MotW, consumables)
const FR_MULTIPLIER = 315;

// FR buff spell IDs and their bonuses (only subtract raid-wide buffs, not consumables)
const FR_BUFFS = {
  // Frost Resistance Aura (Paladin) - all ranks give +60 in Classic
  frostResistanceAura: {
    spellIds: [19888, 19897, 19898],
    bonus: 60,
  },
  // Mark of the Wild / Gift of the Wild - +20 all resistances at max rank
  markOfTheWild: {
    spellIds: [
      9885,  // MotW Rank 7 (+20 res)
      21850, // GotW Rank 2 (+20 res)
      9884,  // MotW Rank 6 (+15 res) - we'll use 20 as approximation
      21849, // GotW Rank 1 (+12 res)
    ],
    bonus: 20,
  },
};

interface PlayerBuffs {
  hadFrostAura: boolean;
  hadMotW: boolean;
}

function calculateFrostResist(resistPercent: number, buffs: PlayerBuffs): number {
  // Floor at 0, cap at 75% resist (theoretical max)
  const cappedResist = Math.max(0, Math.min(resistPercent, 0.75));
  const effectiveFR = Math.round(cappedResist * FR_MULTIPLIER);

  // Subtract raid-wide buff contributions (not consumables like Juju Chill)
  let buffBonus = 0;
  if (buffs.hadFrostAura) buffBonus += FR_BUFFS.frostResistanceAura.bonus;
  if (buffs.hadMotW) buffBonus += FR_BUFFS.markOfTheWild.bonus;

  return Math.max(0, effectiveFR - buffBonus);
}

// Query to get buff events for specific abilities
const GET_BUFF_EVENTS = `
query GetBuffEvents($code: String!, $fightIDs: [Int]!, $startTime: Float!, $endTime: Float!) {
  reportData {
    report(code: $code) {
      events(fightIDs: $fightIDs, dataType: Buffs, hostilityType: Friendlies, startTime: $startTime, endTime: $endTime, limit: 10000) {
        data
        nextPageTimestamp
      }
    }
  }
}
`;

// Fetch frost aura damage events and calculate resistance per player
export async function fetchFrostAuraDamage(
  code: string,
  fightIDs: number[]
): Promise<FrostAuraDamage[]> {
  interface DamageEvent {
    timestamp: number;
    type: string;
    sourceID: number;
    targetID: number;
    abilityGameID: number;
    amount: number;
    unmitigatedAmount?: number;
    resisted?: number;
    hitType: number; // 0 = miss, 1 = normal, etc.
  }

  interface BuffEvent {
    timestamp: number;
    type: string;
    targetID: number;
    abilityGameID: number;
  }

  interface Actor {
    id: number;
    name: string;
    type: string;
  }

  // Fetch damage events and buff events in parallel
  const [damageResult, buffResult] = await Promise.all([
    graphqlRequest<{
      reportData: {
        report: {
          events: {
            data: DamageEvent[];
            nextPageTimestamp: number | null;
          };
          masterData: {
            actors: Actor[];
          };
        };
      };
    }>(GET_DAMAGE_EVENTS, {
      code,
      fightIDs,
      startTime: 0,
      endTime: 999999999,
    }),
    graphqlRequest<{
      reportData: {
        report: {
          events: {
            data: BuffEvent[];
            nextPageTimestamp: number | null;
          };
        };
      };
    }>(GET_BUFF_EVENTS, {
      code,
      fightIDs,
      startTime: 0,
      endTime: 999999999,
    }),
  ]);

  const allEvents = damageResult.reportData.report.events?.data || [];
  const actors = damageResult.reportData.report.masterData?.actors || [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  // Find players who had FR-related buffs at any point
  const buffEvents = buffResult.reportData.report.events?.data || [];
  const playersWithFrostAura = new Set<number>();
  const playersWithMotW = new Set<number>();

  for (const event of buffEvents) {
    const spellId = event.abilityGameID;
    const targetId = event.targetID;

    if (FR_BUFFS.frostResistanceAura.spellIds.includes(spellId)) {
      playersWithFrostAura.add(targetId);
    }
    if (FR_BUFFS.markOfTheWild.spellIds.includes(spellId)) {
      playersWithMotW.add(targetId);
    }
  }

  console.log(`FR Buff detection: ${playersWithFrostAura.size} with Aura, ${playersWithMotW.size} with MotW`);

  // Filter to Frost Aura damage events
  // 348191 = Frost Aura in Classic ERA Naxxramas
  const FROST_AURA_SPELL_ID = 348191;
  const events = allEvents.filter((e) => e.abilityGameID === FROST_AURA_SPELL_ID);

  // Aggregate per player
  const playerStats = new Map<number, {
    totalDamage: number;
    totalUnmitigated: number;
    tickCount: number;
  }>();

  for (const event of events) {
    const targetId = event.targetID;
    const actor = actorMap.get(targetId);

    // Skip non-player targets
    if (!actor) continue;

    const existing = playerStats.get(targetId) || {
      totalDamage: 0,
      totalUnmitigated: 0,
      tickCount: 0,
    };

    const damage = event.amount || 0;
    const unmitigated = event.unmitigatedAmount || (damage + (event.resisted || 0));

    existing.totalDamage += damage;
    existing.totalUnmitigated += unmitigated;
    existing.tickCount += 1;

    playerStats.set(targetId, existing);
  }

  // Calculate frost resistance for each player
  const results: FrostAuraDamage[] = [];

  for (const [playerId, stats] of playerStats) {
    const actor = actorMap.get(playerId);
    if (!actor || stats.tickCount === 0) continue;

    const resistPercent = stats.totalUnmitigated > 0
      ? (stats.totalUnmitigated - stats.totalDamage) / stats.totalUnmitigated
      : 0;

    const buffs: PlayerBuffs = {
      hadFrostAura: playersWithFrostAura.has(playerId),
      hadMotW: playersWithMotW.has(playerId),
    };
    const estimatedFR = calculateFrostResist(resistPercent, buffs);

    const buffList = [
      buffs.hadFrostAura && 'Aura',
      buffs.hadMotW && 'MotW',
    ].filter(Boolean).join('+') || 'none';
    console.log(`${actor.name}: ${(resistPercent * 100).toFixed(1)}% resist, buffs=[${buffList}], ~${estimatedFR} FR`);

    results.push({
      playerId,
      playerName: actor.name,
      playerType: actor.type,
      totalDamage: stats.totalDamage,
      totalUnmitigated: stats.totalUnmitigated,
      tickCount: stats.tickCount,
      estimatedFrostResist: estimatedFR,
    });
  }

  return results;
}

// Get Sapphiron fight IDs from a report (including wipes)
export async function getSapphironFightIds(code: string): Promise<number[]> {
  interface FightEntry {
    id: number;
    name: string;
    kill: boolean;
    encounterID: number;
  }

  const result = await graphqlRequest<{
    reportData: {
      report: {
        fights: FightEntry[];
      };
    };
  }>(GET_ALL_FIGHTS, { code });

  const fights = result.reportData.report.fights || [];

  // Find Sapphiron fights (kills or wipes)
  const sapphironFights = fights.filter((f) =>
    f.name.toLowerCase().includes('sapphiron')
  );

  console.log('All fights from GET_ALL_FIGHTS:', fights.map(f => ({ id: f.id, name: f.name, kill: f.kill })));
  console.log('Sapphiron fights found:', sapphironFights);

  return sapphironFights.map((f) => f.id);
}
