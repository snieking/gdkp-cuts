import { useState } from 'react';
import { Deduction, Player } from '../types';
import { formatGold } from '../utils/calculations';

interface Props {
  deductions: Deduction[];
  players: Player[];
  totalDeducted: number;
  onAdd: (deduction: Deduction) => void;
  onRemove: (id: string) => void;
}

export function DeductionsPanel({ deductions, players, totalDeducted, onAdd, onRemove }: Props) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [percentage, setPercentage] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  const handleAdd = () => {
    if (!selectedPlayerId || !percentage) return;

    const player = players.find(p => p.id === parseInt(selectedPlayerId, 10));
    if (!player) return;

    const deduction: Deduction = {
      id: `${Date.now()}`,
      playerId: player.id,
      playerName: player.name,
      percentage: parseFloat(percentage),
      reason: reason || 'Manual deduction',
    };

    onAdd(deduction);
    setSelectedPlayerId('');
    setPercentage('');
    setReason('');
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-white">Deductions</h2>
        {totalDeducted > 0 && (
          <span className="text-sm text-red-400">
            Total: -{formatGold(totalDeducted)}g (redistributed)
          </span>
        )}
      </div>

      {/* Add deduction form */}
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[150px]">
          <label className="block text-xs text-gray-400 mb-1">Player</label>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            className="w-full rounded-md bg-gray-700 border-gray-600 text-white text-sm px-2 py-1.5 border"
          >
            <option value="">-- Select --</option>
            {[...players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-20">
          <label className="block text-xs text-gray-400 mb-1">% of cut</label>
          <input
            type="number"
            value={percentage}
            onChange={(e) => setPercentage(e.target.value)}
            placeholder="10"
            min="1"
            max="100"
            className="w-full rounded-md bg-gray-700 border-gray-600 text-white text-sm px-2 py-1.5 border"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs text-gray-400 mb-1">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-md bg-gray-700 border-gray-600 text-white text-sm px-2 py-1.5 border"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!selectedPlayerId || !percentage}
          className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>

      {/* Deductions list */}
      {deductions.length > 0 && (
        <div className="space-y-2">
          {deductions.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between bg-gray-700/50 rounded px-3 py-2"
            >
              <div className="flex items-center gap-3">
                <span className="text-white">{d.playerName}</span>
                <span className="text-red-400">-{d.percentage}%</span>
                {d.reason && <span className="text-gray-400 text-sm">({d.reason})</span>}
              </div>
              <button
                onClick={() => onRemove(d.id)}
                className="text-gray-400 hover:text-red-400 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {deductions.length === 0 && (
        <p className="text-sm text-gray-500">No deductions. Deducted gold is redistributed to all players.</p>
      )}
    </div>
  );
}
