import { useState, useEffect, useCallback, useRef } from 'react';
import { ReportInput } from './components/ReportInput';
import { ConfigPanel } from './components/ConfigPanel';
import { BonusTable } from './components/BonusTable';
import { DeductionsPanel } from './components/DeductionsPanel';
import { PlayerSummary } from './components/PlayerSummary';
import { ExportPanel } from './components/ExportPanel';
import {
  isAuthenticated,
  initiateLogin,
  handleCallback,
  clearAuth,
} from './api/auth';
import { fetchReportData } from './api/warcraftlogs';
import { autoDetectBonuses } from './utils/parsing';
import { calculateCuts, CalculationResult } from './utils/calculations';
import { ReportData, Config, BonusAssignment, Deduction } from './types';

const DEFAULT_CONFIG: Config = {
  totalPot: 0,
  organizerCutPercent: 14,
  bonusPoolPercent: 21,
  playerCount: 40,
};

interface ShareData {
  r: string; // report code
  c: { t: number; o: number; b: number; p: number }; // config
  a: { b: string; p: number; n: string }[]; // assignments
  d?: { p: number; n: string; pct: number; r: string }[]; // deductions
}

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [assignments, setAssignments] = useState<BonusAssignment[]>([]);
  const [deductions, setDeductions] = useState<Deduction[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const pendingShareData = useRef<ShareData | null>(null);

  // Check auth on mount and handle callback
  useEffect(() => {
    const init = async () => {
      // Check if this is an OAuth callback
      const params = new URLSearchParams(window.location.search);
      if (params.has('code')) {
        const success = await handleCallback();
        setAuthenticated(success);
        return;
      }

      // Check for shared data
      const shareParam = params.get('share');
      if (shareParam) {
        try {
          const decoded = JSON.parse(atob(shareParam)) as ShareData;
          pendingShareData.current = decoded;
        } catch {
          console.error('Failed to parse share data');
        }
      }

      setAuthenticated(isAuthenticated());
    };
    init();
  }, []);

  // Load shared data after authentication
  useEffect(() => {
    if (authenticated && pendingShareData.current && !reportData) {
      const shareData = pendingShareData.current;
      pendingShareData.current = null;

      // Load the report
      handleLoadReport(shareData.r, shareData);

      // Clear the share param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('share');
      window.history.replaceState({}, '', url.toString());
    }
  }, [authenticated, reportData]);

  // Recalculate when config, assignments, or deductions change
  useEffect(() => {
    if (!reportData || config.totalPot <= 0) {
      setResult(null);
      return;
    }

    const calcResult = calculateCuts(config, assignments, reportData.players, deductions);
    setResult(calcResult);
  }, [config, assignments, deductions, reportData]);

  const handleLogin = () => {
    initiateLogin();
  };

  const handleLogout = () => {
    clearAuth();
    setAuthenticated(false);
    setReportData(null);
    setAssignments([]);
    setDeductions([]);
    setResult(null);
  };

  const handleLoadReport = useCallback(async (code: string, shareData?: ShareData) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchReportData(code);

      // Check zone
      if (!data.zone.name.toLowerCase().includes('naxxramas')) {
        setError(`This tool is for Naxxramas only. Report zone: ${data.zone.name}`);
        setLoading(false);
        return;
      }

      setReportData(data);

      // Apply shared config or use defaults
      if (shareData) {
        setConfig({
          totalPot: shareData.c.t,
          organizerCutPercent: shareData.c.o,
          bonusPoolPercent: shareData.c.b,
          playerCount: shareData.c.p,
        });

        // Apply shared assignments over auto-detected
        const detected = autoDetectBonuses(data);
        const assignmentMap = new Map(shareData.a.map(a => [a.b, a]));

        const merged = detected.map(d => {
          const shared = assignmentMap.get(d.bonusId);
          if (shared) {
            return {
              bonusId: d.bonusId,
              playerId: shared.p,
              playerName: shared.n,
              autoDetected: false,
            };
          }
          return d;
        });
        setAssignments(merged);

        // Apply shared deductions
        if (shareData.d) {
          setDeductions(shareData.d.map(d => ({
            id: `${Date.now()}-${d.p}`,
            playerId: d.p,
            playerName: d.n,
            percentage: d.pct,
            reason: d.r,
          })));
        } else {
          setDeductions([]);
        }
      } else {
        setConfig((c) => ({ ...c, playerCount: data.players.length }));
        const detected = autoDetectBonuses(data);
        setAssignments(detected);
        setDeductions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAssignmentChange = (
    bonusId: string,
    playerId: number | null,
    playerName: string | null
  ) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.bonusId === bonusId
          ? { ...a, playerId, playerName, autoDetected: false }
          : a
      )
    );
  };

  const handleAddDeduction = (deduction: Deduction) => {
    setDeductions((prev) => [...prev, deduction]);
  };

  const handleRemoveDeduction = (id: string) => {
    setDeductions((prev) => prev.filter((d) => d.id !== id));
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-white">GDKP Cuts Calculator</h1>
          <p className="text-gray-400">Calculate raid splits from Warcraftlogs reports</p>
          <button
            onClick={handleLogin}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-lg"
          >
            Login with Warcraftlogs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">GDKP Cuts Calculator</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>

        {/* Report Input */}
        <ReportInput onSubmit={handleLoadReport} loading={loading} />

        {/* Error */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Report loaded */}
        {reportData && (
          <>
            <div className="bg-gray-800 rounded-lg p-4">
              <p className="text-gray-300">
                <span className="text-gray-500">Report:</span>{' '}
                <span className="text-white font-medium">{reportData.code}</span>
                <span className="mx-2 text-gray-600">|</span>
                <span className="text-gray-500">Zone:</span>{' '}
                <span className="text-green-400">{reportData.zone.name}</span>
                <span className="mx-2 text-gray-600">|</span>
                <span className="text-gray-500">Players:</span>{' '}
                <span className="text-blue-400">{reportData.players.length}</span>
                <span className="mx-2 text-gray-600">|</span>
                <span className="text-gray-500">Boss Kills:</span>{' '}
                <span className="text-yellow-400">{reportData.fights.length}</span>
              </p>
            </div>

            {/* Config */}
            <ConfigPanel config={config} onChange={setConfig} />

            {/* Bonus Assignments */}
            <BonusTable
              assignments={assignments}
              players={reportData.players}
              totalPot={config.totalPot}
              onAssignmentChange={handleAssignmentChange}
            />

            {/* Deductions */}
            <DeductionsPanel
              deductions={deductions}
              players={reportData.players}
              totalDeducted={result?.totalDeducted || 0}
              onAdd={handleAddDeduction}
              onRemove={handleRemoveDeduction}
            />

            {/* Results */}
            {result && config.totalPot > 0 && (
              <>
                <PlayerSummary result={result} />
                <ExportPanel
                  playerCuts={result.playerCuts}
                  config={config}
                  assignments={assignments}
                  deductions={deductions}
                  reportCode={reportData.code}
                  result={result}
                />
              </>
            )}
          </>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-gray-700 text-center text-sm text-gray-500">
          Created by Sniekin/Enie
        </footer>
      </div>
    </div>
  );
}

export default App;
