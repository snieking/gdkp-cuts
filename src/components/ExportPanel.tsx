import { useState } from 'react';
import { PlayerCut, Config, BonusAssignment, BONUS_DEFINITIONS } from '../types';
import { generateGargulExport, formatGold, CalculationResult } from '../utils/calculations';

interface Props {
  playerCuts: PlayerCut[];
  config: Config;
  assignments: BonusAssignment[];
  reportCode: string;
  result: CalculationResult;
}

export function ExportPanel({ playerCuts, config, assignments, reportCode, result }: Props) {
  const [copiedGargul, setCopiedGargul] = useState(false);
  const [copiedSheet, setCopiedSheet] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const gargulExport = generateGargulExport(playerCuts);

  const handleCopyGargul = async () => {
    await navigator.clipboard.writeText(gargulExport);
    setCopiedGargul(true);
    setTimeout(() => setCopiedGargul(false), 2000);
  };

  // Generate Google Sheets compatible TSV
  const generateSheetExport = () => {
    const lines: string[] = [];

    // Summary section
    lines.push(`Total Pot\t${config.totalPot}`);
    lines.push(`Organizer Cut\t${config.organizerCutPercent}%\t${formatGold(config.totalPot * config.organizerCutPercent / 100)}`);
    lines.push(`Gold to Distribute\t${100 - config.organizerCutPercent}%\t${formatGold(result.goldToDistribute)}`);
    lines.push(`Bonuses\t${config.bonusPoolPercent}%\t${formatGold(result.bonusPool)}`);
    lines.push(`Even Split\t${100 - config.organizerCutPercent - config.bonusPoolPercent}%\t${formatGold(result.evenSplitPool)}`);
    lines.push(`Players\t${config.playerCount}`);
    lines.push(`Base Cut\t${formatGold(result.baseCut)}`);
    lines.push('');

    // Bonus assignments
    lines.push('Bonus\tPlayer\t%\tAmount');
    for (const assignment of assignments) {
      if (assignment.playerId !== null) {
        const bonus = BONUS_DEFINITIONS.find(b => b.id === assignment.bonusId);
        if (bonus) {
          const amount = config.totalPot * (bonus.percentage / 100);
          lines.push(`${bonus.name}\t${assignment.playerName}\t${bonus.percentage}%\t${formatGold(amount)}`);
        }
      }
    }
    lines.push('');

    // Player totals
    lines.push('Player\tTotal Cut');
    for (const cut of playerCuts) {
      lines.push(`${cut.name}\t${formatGold(cut.totalCut)}`);
    }

    return lines.join('\n');
  };

  const handleCopySheet = async () => {
    await navigator.clipboard.writeText(generateSheetExport());
    setCopiedSheet(true);
    setTimeout(() => setCopiedSheet(false), 2000);
  };

  // Generate shareable URL
  const generateShareUrl = () => {
    const shareData = {
      r: reportCode,
      c: {
        t: config.totalPot,
        o: config.organizerCutPercent,
        b: config.bonusPoolPercent,
        p: config.playerCount,
      },
      a: assignments
        .filter(a => a.playerId !== null)
        .map(a => ({
          b: a.bonusId,
          p: a.playerId,
          n: a.playerName,
        })),
    };

    const encoded = btoa(JSON.stringify(shareData));
    const url = new URL(window.location.href.split('?')[0]);
    url.searchParams.set('share', encoded);
    return url.toString();
  };

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(generateShareUrl());
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Share URL */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-white">Share</h2>
          <button
            onClick={handleCopyUrl}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            {copiedUrl ? 'Copied!' : 'Copy Share URL'}
          </button>
        </div>
        <p className="text-sm text-gray-400">
          Share this URL with others to show them the same configuration and assignments.
        </p>
      </div>

      {/* Google Sheets Export */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold text-white">Export to Google Sheets</h2>
          <button
            onClick={handleCopySheet}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            {copiedSheet ? 'Copied!' : 'Copy for Sheets'}
          </button>
        </div>
        <p className="text-sm text-gray-400">
          Paste into Google Sheets (Ctrl+V). Data is tab-separated.
        </p>
      </div>

      {/* Gargul Export */}
      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Export (Gargul Format)</h2>
          <button
            onClick={handleCopyGargul}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            {copiedGargul ? 'Copied!' : 'Copy to Clipboard'}
          </button>
        </div>
        <textarea
          readOnly
          value={gargulExport}
          className="w-full h-48 rounded-md bg-gray-900 border-gray-700 text-gray-300 text-sm font-mono px-3 py-2 border"
        />
      </div>
    </div>
  );
}
