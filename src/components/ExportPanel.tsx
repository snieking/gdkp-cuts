import { useState } from 'react';
import { PlayerCut, Config, BonusAssignment, Deduction, BONUS_DEFINITIONS } from '../types';
import { generateGargulExport, CalculationResult } from '../utils/calculations';

interface Props {
  playerCuts: PlayerCut[];
  config: Config;
  assignments: BonusAssignment[];
  deductions: Deduction[];
  reportCode: string;
  result: CalculationResult;
}

export function ExportPanel({ playerCuts, config, assignments, deductions, reportCode, result }: Props) {
  const [copiedGargul, setCopiedGargul] = useState(false);
  const [copiedSheet, setCopiedSheet] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const gargulExport = generateGargulExport(playerCuts);

  const handleCopyGargul = async () => {
    await navigator.clipboard.writeText(gargulExport);
    setCopiedGargul(true);
    setTimeout(() => setCopiedGargul(false), 2000);
  };

  // Generate Google Sheets compatible TSV (multi-column layout)
  const generateSheetExport = () => {
    const avgCut = playerCuts.length > 0
      ? playerCuts.reduce((sum, p) => sum + p.totalCut, 0) / playerCuts.length
      : 0;

    // Build summary column (A-C)
    const summaryRows: string[][] = [
      ['Total Pot', '100.00%', String(config.totalPot)],
      ['Organizer Cut', `${config.organizerCutPercent}%`, String(Math.round(config.totalPot * config.organizerCutPercent / 100))],
      ['Gold to distribute', `${100 - config.organizerCutPercent}.00%`, String(Math.round(result.goldToDistribute))],
      ['Bonuses', `${config.bonusPoolPercent}.00%`, String(Math.round(result.bonusPool))],
      ['Even Split', `${100 - config.organizerCutPercent - config.bonusPoolPercent}.00%`, String(Math.round(result.evenSplitPool))],
      ['Amount of players in Raid', '', String(config.playerCount)],
      ['Base cut', '', String(Math.round(result.baseCut))],
      ['Base cut with bonus', '', String(Math.round(result.baseCut))],
      ['Avg cut', '', String(Math.round(avgCut))],
      ['', '', ''],
      ['Deductions', '%', 'Amount', 'Total Cut'],
    ];

    // Add deduction rows to summary
    for (const d of deductions) {
      const playerCut = playerCuts.find(p => p.id === d.playerId);
      const totalCut = playerCut ? Math.round(playerCut.totalCut) : 0;
      summaryRows.push([d.playerName, `${d.percentage}%`, String(Math.round(playerCut?.deduction || 0)), String(totalCut)]);
    }

    // Build bonuses column (E-I)
    const bonusRows: string[][] = [
      ['Bonuses', 'Player Name', '%', 'Amount', 'Total Cut'],
    ];
    for (const assignment of assignments) {
      if (assignment.playerId !== null) {
        const bonus = BONUS_DEFINITIONS.find(b => b.id === assignment.bonusId);
        if (bonus) {
          const amount = Math.round(config.totalPot * (bonus.percentage / 100));
          const playerCut = playerCuts.find(p => p.id === assignment.playerId);
          const totalCut = playerCut ? Math.round(playerCut.totalCut) : 0;
          bonusRows.push([bonus.name, assignment.playerName || '', `${bonus.percentage.toFixed(2)}%`, String(amount), String(totalCut)]);
        }
      }
    }

    // Build player summary column (K-L)
    const playerRows: string[][] = [
      ['Player', 'Gold'],
    ];
    for (const cut of playerCuts) {
      playerRows.push([cut.name, String(Math.round(cut.totalCut))]);
    }

    // Build gargul column (N)
    const gargulRows: string[][] = [
      ['Gargul import'],
      ['Player,Gold'],
    ];
    for (const cut of playerCuts) {
      gargulRows.push([`${cut.name},${Math.round(cut.totalCut)}`]);
    }

    // Determine max rows
    const maxRows = Math.max(summaryRows.length, bonusRows.length, playerRows.length, gargulRows.length);

    // Build combined rows
    const lines: string[] = [];
    for (let i = 0; i < maxRows; i++) {
      const summary = summaryRows[i] || ['', '', '', ''];
      const bonus = bonusRows[i] || ['', '', '', '', ''];
      const player = playerRows[i] || ['', ''];
      const gargul = gargulRows[i] || [''];

      // Pad summary to 4 columns (for deductions header)
      while (summary.length < 4) summary.push('');

      const row = [
        ...summary,           // A-D (4 cols)
        '',                   // E spacer
        ...bonus,             // F-J (5 cols)
        '',                   // K spacer
        ...player,            // L-M (2 cols)
        '',                   // N spacer
        ...gargul,            // O (1 col)
      ];
      lines.push(row.join('\t'));
    }

    // Add footer row
    const sumOfCuts = playerCuts.reduce((sum, p) => sum + p.totalCut, 0);
    lines.push('');
    lines.push(`Change total pot value\t\t\t\t\t\t\t\t\t${Math.round(result.bonusPool)}\tSum of cuts:\t\t${Math.round(sumOfCuts)}`);

    return lines.join('\n');
  };

  const handleCopySheet = async () => {
    await navigator.clipboard.writeText(generateSheetExport());
    setCopiedSheet(true);
    setTimeout(() => setCopiedSheet(false), 2000);
  };

  // Generate shareable URL
  const generateShareUrl = () => {
    const shareData: {
      r: string;
      c: { t: number; o: number; b: number; p: number };
      a: { b: string; p: number | null; n: string | null }[];
      d?: { p: number; n: string; pct: number; r: string }[];
    } = {
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

    if (deductions.length > 0) {
      shareData.d = deductions.map(d => ({
        p: d.playerId,
        n: d.playerName,
        pct: d.percentage,
        r: d.reason,
      }));
    }

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
