import { useState, useMemo } from 'react';
import { SuggestedDeduction, Deduction } from '../types';
import { DEDUCTION_RULES } from '../utils/deductionRules';

interface Props {
  suggestions: SuggestedDeduction[];
  existingDeductions: Deduction[];
  onApply: (deduction: Deduction) => void;
  loading?: boolean;
}

interface PendingDeduction {
  suggestion: SuggestedDeduction;
  percentage: number;
}

export function SuggestedDeductionsPanel({ suggestions, existingDeductions, onApply, loading }: Props) {
  const [pendingDeductions, setPendingDeductions] = useState<Map<string, PendingDeduction>>(new Map());

  // Group suggestions by rule
  const groupedSuggestions = useMemo(() => {
    const groups = new Map<string, SuggestedDeduction[]>();
    for (const s of suggestions) {
      const existing = groups.get(s.ruleId) || [];
      existing.push(s);
      groups.set(s.ruleId, existing);
    }
    return groups;
  }, [suggestions]);

  // Check if a suggestion is already applied as a deduction
  const isAlreadyApplied = (s: SuggestedDeduction) => {
    return existingDeductions.some(
      (d) => d.playerId === s.playerId && d.ruleId === s.ruleId
    );
  };

  const getKey = (s: SuggestedDeduction) => `${s.ruleId}-${s.playerId}`;

  const handlePercentageChange = (s: SuggestedDeduction, value: string) => {
    const key = getKey(s);
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      // Remove from pending if invalid
      const newPending = new Map(pendingDeductions);
      newPending.delete(key);
      setPendingDeductions(newPending);
      return;
    }
    const newPending = new Map(pendingDeductions);
    newPending.set(key, { suggestion: s, percentage: numValue });
    setPendingDeductions(newPending);
  };

  const handleApply = (s: SuggestedDeduction) => {
    const key = getKey(s);
    const pending = pendingDeductions.get(key);
    const percentage = pending?.percentage ?? s.percentage;

    if (percentage <= 0) return;

    const deduction: Deduction = {
      id: `issue-${key}-${Date.now()}`,
      playerId: s.playerId,
      playerName: s.playerName,
      percentage,
      reason: s.reason,
      ruleId: s.ruleId,
    };
    onApply(deduction);

    // Clear from pending
    const newPending = new Map(pendingDeductions);
    newPending.delete(key);
    setPendingDeductions(newPending);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Potential Issues</h2>
        <p className="text-sm text-gray-400">Analyzing report data...</p>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-white mb-2">Potential Issues</h2>
        <p className="text-sm text-gray-500">No issues detected.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">Potential Issues</h2>

      <div className="space-y-4">
        {Array.from(groupedSuggestions.entries()).map(([ruleId, ruleSuggestions]) => {
          const rule = DEDUCTION_RULES.find((r) => r.id === ruleId);
          if (!rule) return null;

          return (
            <div key={ruleId} className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-700/50 px-3 py-2">
                <h3 className="text-sm font-medium text-gray-300">{rule.name}</h3>
                <p className="text-xs text-gray-400">{rule.description}</p>
              </div>
              <div className="divide-y divide-gray-700/50">
                {ruleSuggestions.map((s) => {
                  const key = getKey(s);
                  const alreadyApplied = isAlreadyApplied(s);
                  const pending = pendingDeductions.get(key);
                  const currentPct = pending?.percentage ?? s.percentage;

                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 px-3 py-2 ${
                        alreadyApplied ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <span className="text-white">{s.playerName}</span>
                        {s.details && (
                          <span className="text-gray-400 text-xs ml-2">({s.details})</span>
                        )}
                      </div>
                      {alreadyApplied ? (
                        <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded">
                          Applied
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 text-sm">-</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              defaultValue={s.percentage}
                              onChange={(e) => handlePercentageChange(s, e.target.value)}
                              className="w-14 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white text-center"
                            />
                            <span className="text-gray-400 text-sm">%</span>
                          </div>
                          <button
                            onClick={() => handleApply(s)}
                            disabled={currentPct <= 0}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Apply
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Set deduction percentage and apply to add as a deduction.
      </p>
    </div>
  );
}
