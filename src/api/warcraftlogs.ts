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
  GET_BUFFS_BY_ABILITY,
  GET_DAMAGE_EVENTS,
  GET_ALL_FIGHTS,
  GET_COMBATANT_INFO_EVENTS,
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
import frostResistItems from '../data/frostResistItems.json';

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

  // Extract table data
  const damageDone = damageDoneResult.reportData.report.table?.data?.entries || [];
  const healingDone = healingDoneResult.reportData.report.table?.data?.entries || [];
  const damageTaken = damageTakenResult.reportData.report.table?.data?.entries || [];

  // Filter players to only those who participated in boss fights
  // (appear in damage done, healing done, or damage taken tables)
  const participantIds = new Set<number>();
  for (const entry of damageDone) participantIds.add(entry.id);
  for (const entry of healingDone) participantIds.add(entry.id);
  for (const entry of damageTaken) participantIds.add(entry.id);

  const allActors = report.masterData.actors;
  const raidParticipants = allActors.filter((p) => participantIds.has(p.id));

  console.log(`Players: ${allActors.length} in log, ${raidParticipants.length} participated in fights`);

  return {
    code,
    zone: report.zone,
    zones,
    raidType,
    startTime,
    endTime,
    fights: report.fights,
    players: raidParticipants,
    damageDone,
    healingDone,
    damageTaken,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await graphqlRequest<{ reportData: { report: { playerDetails: any } } }>(
    GET_COMBATANT_INFO,
    { code, fightIDs }
  );

  const rawDetails = result.reportData.report.playerDetails;
  if (!rawDetails) {
    console.warn('No playerDetails returned from WCL API');
    return [];
  }

  // Debug: log FULL raw structure to understand what WCL returns
  console.log('=== COMBATANT INFO RAW STRUCTURE ===');
  console.log('Full playerDetails:', JSON.stringify(rawDetails, null, 2).slice(0, 5000));

  // Check for nested data structure
  const details = rawDetails.data?.playerDetails || rawDetails;

  // Get first player and log their COMPLETE structure
  const allRoles = [...(details.tanks || []), ...(details.healers || []), ...(details.dps || [])];
  if (allRoles.length > 0) {
    console.log('First player COMPLETE:', JSON.stringify(allRoles[0], null, 2));
    // Also check if combatantInfo is an array (Classic-specific structure)
    const ci = allRoles[0].combatantInfo;
    if (ci) {
      console.log('combatantInfo keys:', Object.keys(ci));
      console.log('combatantInfo full:', JSON.stringify(ci, null, 2).slice(0, 2000));
    }
  }
  console.log('=== END COMBATANT INFO ===');

  return allRoles.map((p: { id: number; name: string; type: string; specs?: { spec: string; role: string }[]; combatantInfo?: { stats?: { Frost?: { min: number; max: number } } } }) => {
    // Try multiple possible structures for frost resistance
    const ci = p.combatantInfo;
    let frostResistance = 0;

    if (ci) {
      // Try: stats.Frost.min/max
      frostResistance = ci.stats?.Frost?.min ?? ci.stats?.Frost?.max ?? 0;
      // Try: direct frostResistance field
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!frostResistance && (ci as any).frostResistance) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        frostResistance = (ci as any).frostResistance;
      }
    }

    return {
      id: p.id,
      name: p.name,
      type: p.type,
      specs: p.specs || [],
      frostResistance,
    };
  });
}

// FR buff ability IDs
const FR_AURA_IDS = {
  frostResistanceAura: [19888, 19897, 19898], // Paladin FR Aura ranks
  markOfTheWild: [9885, 21850, 9884, 21849], // MotW / GotW ranks
  jujuChill: [16325], // Juju Chill consumable
};

export interface PlayerFRBuffs {
  sourceID: number;
  hasFrostAura: boolean;
  hasMotW: boolean;
  hasJujuChill: boolean;
  gearFrostResist: number; // Exact FR from equipped gear
}

// Frost resistance from gear - itemId -> frostRes
const FROST_RESIST_ITEMS: Record<string, number> = frostResistItems;

// Frost resistance enchants - enchantId (ItemEnchantment ID from DBC) -> frostRes
const FROST_RESIST_ENCHANTS: Record<number, number> = {
  // Ice Guard (head/legs) - +10 FR
  2543: 10,
  // Frost Mantle of the Dawn (shoulder) - +5 FR
  2484: 5,
  // Enchant Cloak - Greater Resistance - +5 all res (spell 20014)
  1888: 5,
  // Enchant Cloak - Resistance - +3 all res (spell 13794)
  903: 3,
};

// Fetch raw combatant info events and extract FR buffs + gear FR
export async function fetchCombatantInfoEvents(code: string, fightIDs: number[]): Promise<Map<number, PlayerFRBuffs>> {
  interface GearItem {
    id: number;
    permanentEnchant?: number;
    temporaryEnchant?: number;
  }

  interface CombatantInfoEvent {
    sourceID: number;
    auras?: { ability: number; name: string }[];
    gear?: GearItem[];
  }

  const result = await graphqlRequest<{ reportData: { report: { events: { data: CombatantInfoEvent[] } } } }>(
    GET_COMBATANT_INFO_EVENTS,
    { code, fightIDs }
  );

  const events = result.reportData.report.events?.data || [];
  const playerBuffs = new Map<number, PlayerFRBuffs>();

  console.log('=== COMBATANT INFO FR + GEAR DETECTION ===');
  console.log('Total combatant info events:', events.length);

  for (const event of events) {
    const sourceID = event.sourceID;
    const auras = event.auras || [];
    const gear = event.gear || [];

    // Check for FR buffs in the auras array
    let hasFrostAura = false;
    let hasMotW = false;
    let hasJujuChill = false;

    for (const aura of auras) {
      if (FR_AURA_IDS.frostResistanceAura.includes(aura.ability)) {
        hasFrostAura = true;
      }
      if (FR_AURA_IDS.markOfTheWild.includes(aura.ability)) {
        hasMotW = true;
      }
      if (FR_AURA_IDS.jujuChill.includes(aura.ability)) {
        hasJujuChill = true;
      }
    }

    // Calculate frost resistance from gear (items + enchants)
    // Slot order: 0=Head, 1=Neck, 2=Shoulder, 3=Back/Cloak, 4=Chest, ...
    let gearFrostResist = 0;
    const unknownEnchants: number[] = [];
    const enchantsBySlot: { slot: number; enchant: number; fr: number }[] = [];

    for (let slotIdx = 0; slotIdx < gear.length; slotIdx++) {
      const item = gear[slotIdx];
      // Add FR from item itself
      const itemFR = FROST_RESIST_ITEMS[String(item.id)];
      if (itemFR) {
        gearFrostResist += itemFR;
      }
      // Add FR from permanent enchant (e.g., Ice Guard, Greater Resistance)
      if (item.permanentEnchant) {
        const enchantFR = FROST_RESIST_ENCHANTS[item.permanentEnchant];
        if (enchantFR) {
          gearFrostResist += enchantFR;
          enchantsBySlot.push({ slot: slotIdx, enchant: item.permanentEnchant, fr: enchantFR });
        } else if (item.permanentEnchant > 0) {
          // Log unknown enchants for debugging
          unknownEnchants.push(item.permanentEnchant);
        }
      }
      // Special debug for cloak slot (slot 3)
      if (slotIdx === 3) {
        console.log(`  Cloak slot for sourceID ${sourceID}: itemId=${item.id}, enchant=${item.permanentEnchant || 'none'}`);
      }
    }
    if (enchantsBySlot.length > 0) {
      console.log(`  Found FR enchants for sourceID ${sourceID}:`, enchantsBySlot);
    }
    if (unknownEnchants.length > 0) {
      console.log(`  Unknown enchant IDs for sourceID ${sourceID}:`, unknownEnchants);
    }

    // Store the data (if player appears in multiple fights, use highest gear FR)
    const existing = playerBuffs.get(sourceID);
    if (existing) {
      existing.hasFrostAura = existing.hasFrostAura || hasFrostAura;
      existing.hasMotW = existing.hasMotW || hasMotW;
      existing.hasJujuChill = existing.hasJujuChill || hasJujuChill;
      existing.gearFrostResist = Math.max(existing.gearFrostResist, gearFrostResist);
    } else {
      playerBuffs.set(sourceID, { sourceID, hasFrostAura, hasMotW, hasJujuChill, gearFrostResist });
    }
  }

  // Log summary
  let auraCount = 0, motwCount = 0, jujuCount = 0;
  const gearFRValues: number[] = [];
  for (const [, buffs] of playerBuffs) {
    if (buffs.hasFrostAura) auraCount++;
    if (buffs.hasMotW) motwCount++;
    if (buffs.hasJujuChill) jujuCount++;
    gearFRValues.push(buffs.gearFrostResist);
  }
  console.log(`Players with FR buffs at fight start: Aura=${auraCount}, MotW=${motwCount}, Juju=${jujuCount}`);
  console.log(`Gear FR values: min=${Math.min(...gearFRValues)}, max=${Math.max(...gearFRValues)}, avg=${Math.round(gearFRValues.reduce((a, b) => a + b, 0) / gearFRValues.length)}`);
  console.log('=== END COMBATANT INFO FR + GEAR DETECTION ===');

  return playerBuffs;
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

// Calculate frost resistance using partial resist distribution analysis
// In Classic WoW, spell damage can be resisted by 0%, 25%, 50%, 75%, or 100%
// The distribution of these partial resists depends on FR
// By analyzing the distribution, we can back-calculate exact gear FR

// Expected partial resist probabilities based on average resist (AR = FR/315)
// Uses triangular distribution model from Classic WoW mechanics
function getExpectedDistribution(fr: number): number[] {
  const ar = Math.min(fr / 315, 0.75); // Average resist capped at 75%

  // Partial resist buckets: 0%, 25%, 50%, 75%, 100%
  // Distribution follows triangular pattern around AR
  const buckets = [0, 0.25, 0.5, 0.75, 1.0];
  const probs: number[] = [];

  for (const bucket of buckets) {
    // Triangular distribution: probability decreases linearly from AR
    // P(x) = max(0, 0.5 - 2*|x - AR|) for 25% increments
    let prob = Math.max(0, 0.5 - 2 * Math.abs(bucket - ar));

    // 100% resists (full resist) are rare - cap at low probability
    if (bucket === 1.0) {
      prob = Math.min(prob, 0.05);
    }

    probs.push(prob);
  }

  // Normalize to sum to 1
  const sum = probs.reduce((a, b) => a + b, 0);
  return sum > 0 ? probs.map(p => p / sum) : [1, 0, 0, 0, 0];
}

// Calculate FR from observed partial resist distribution
function calculateFrostResistFromDistribution(resistCounts: number[]): number {
  const total = resistCounts.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  // Normalize observed distribution
  const observed = resistCounts.map(c => c / total);

  // Find FR that best matches observed distribution (0 to 315)
  let bestFR = 0;
  let bestError = Infinity;

  for (let fr = 0; fr <= 315; fr++) {
    const expected = getExpectedDistribution(fr);

    // Calculate sum of squared errors
    let error = 0;
    for (let i = 0; i < 5; i++) {
      error += Math.pow(observed[i] - expected[i], 2);
    }

    if (error < bestError) {
      bestError = error;
      bestFR = fr;
    }
  }

  return bestFR;
}


// FR buff values for subtraction from gear FR calculation
// Note: Juju Chill is NOT subtracted - it's a player choice consumable
const FR_BUFF_VALUES = {
  frostResistanceAura: 60,
  markOfTheWild: 20,
};

// Fetch frost aura damage events and calculate resistance per player
export async function fetchFrostAuraDamage(
  code: string,
  fightIDs: number[],
  playerFRBuffs: Map<number, PlayerFRBuffs>
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
    hitType: number;
  }

  interface Actor {
    id: number;
    name: string;
    type: string;
  }

  // Fetch damage events only (buff detection now comes from combatant info)
  const damageResult = await graphqlRequest<{
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
  });

  const allEvents = damageResult.reportData.report.events?.data || [];
  const actors = damageResult.reportData.report.masterData?.actors || [];
  const actorMap = new Map(actors.map((a) => [a.id, a]));

  // Filter to Frost Aura damage events
  // 348191 = Frost Aura in Classic ERA Naxxramas
  const FROST_AURA_SPELL_ID = 348191;
  const events = allEvents.filter((e) => e.abilityGameID === FROST_AURA_SPELL_ID);

  // Aggregate per player - track partial resist distribution
  const playerStats = new Map<number, {
    totalDamage: number;
    totalUnmitigated: number;
    tickCount: number;
    // Partial resist counts: [0%, 25%, 50%, 75%, 100%]
    resistCounts: number[];
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
      resistCounts: [0, 0, 0, 0, 0],
    };

    const damage = event.amount || 0;
    const unmitigated = event.unmitigatedAmount || (damage + (event.resisted || 0));

    existing.totalDamage += damage;
    existing.totalUnmitigated += unmitigated;
    existing.tickCount += 1;

    // Calculate resist percentage for this event and bucket it
    if (unmitigated > 0) {
      const resistPct = (unmitigated - damage) / unmitigated;
      // Round to nearest 25% bucket: 0, 0.25, 0.5, 0.75, 1.0
      const bucketIndex = Math.min(4, Math.max(0, Math.round(resistPct * 4)));
      existing.resistCounts[bucketIndex]++;
    }

    playerStats.set(targetId, existing);
  }

  // Get frost resistance for each player - use exact gear FR from item database
  const results: FrostAuraDamage[] = [];

  for (const [playerId, stats] of playerStats) {
    const actor = actorMap.get(playerId);
    if (!actor || stats.tickCount === 0) continue;

    // Get exact gear FR from combatant info (uses item database lookup)
    const buffs = playerFRBuffs.get(playerId) || {
      sourceID: playerId,
      hasFrostAura: false,
      hasMotW: false,
      hasJujuChill: false,
      gearFrostResist: 0
    };

    // Use exact gear FR from item database
    const gearFR = buffs.gearFrostResist;

    // Also calculate estimated FR from damage for comparison/debugging
    const estimatedEffectiveFR = calculateFrostResistFromDistribution(stats.resistCounts);
    let buffTotal = 0;
    if (buffs.hasFrostAura) buffTotal += FR_BUFF_VALUES.frostResistanceAura;
    if (buffs.hasMotW) buffTotal += FR_BUFF_VALUES.markOfTheWild;
    const estimatedGearFR = Math.max(0, estimatedEffectiveFR - buffTotal);

    const buffList = [
      buffs.hasFrostAura && 'Aura',
      buffs.hasMotW && 'MotW',
    ].filter(Boolean).join('+') || 'none';

    console.log(`${actor.name}: gearFR=${gearFR} (from items), estimated=${estimatedGearFR} (from dmg), buffs=[${buffList}]`);

    results.push({
      playerId,
      playerName: actor.name,
      playerType: actor.type,
      totalDamage: stats.totalDamage,
      totalUnmitigated: stats.totalUnmitigated,
      tickCount: stats.tickCount,
      estimatedFrostResist: gearFR, // Now using exact gear FR from items
    });
  }

  return results;
}

export interface SapphironFightInfo {
  ids: number[];
  fightTimes: { startTime: number; endTime: number }[]; // Individual fight time ranges
  totalFightTime: number; // Sum of individual fight durations (excludes gaps)
}

// Get Sapphiron fight IDs and time range from a report (including wipes)
export async function getSapphironFightIds(code: string): Promise<SapphironFightInfo> {
  interface FightEntry {
    id: number;
    name: string;
    kill: boolean;
    encounterID: number;
    startTime: number;
    endTime: number;
  }

  // Query ALL fights (including wipes)
  const result = await graphqlRequest<{
    reportData: {
      report: {
        fights: FightEntry[];
      };
    };
  }>(GET_ALL_FIGHTS, { code });

  const allFights = result.reportData.report.fights || [];

  // Find Sapphiron fights (kills or wipes)
  const sapphironFights = allFights.filter((f) =>
    f.name.toLowerCase().includes('sapphiron')
  );

  console.log('All fights:', allFights.map(f => ({ id: f.id, name: f.name, kill: f.kill })));
  console.log('Sapphiron fights found:', sapphironFights);

  if (sapphironFights.length === 0) {
    return { ids: [], fightTimes: [], totalFightTime: 0 };
  }

  // Individual fight time ranges
  const fightTimes = sapphironFights.map(f => ({ startTime: f.startTime, endTime: f.endTime }));
  // Actual fight time = sum of individual fight durations (excludes gaps between attempts)
  const totalFightTime = sapphironFights.reduce((sum, f) => sum + (f.endTime - f.startTime), 0);

  console.log('Sapphiron fights:', fightTimes, 'totalFightTime:', totalFightTime);

  return {
    ids: sapphironFights.map((f) => f.id),
    fightTimes,
    totalFightTime,
  };
}
