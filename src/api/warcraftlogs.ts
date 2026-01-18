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
  detectRaidType,
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
