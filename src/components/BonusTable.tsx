import { BonusAssignment, getBonusDefinitions, Player, BonusCategory, RaidType } from '../types';
import { formatGold } from '../utils/calculations';

interface Props {
  assignments: BonusAssignment[];
  players: Player[];
  totalPot: number;
  raidType: RaidType;
  onAssignmentChange: (bonusId: string, playerId: number | null, playerName: string | null) => void;
}

const CATEGORY_ORDER: BonusCategory[] = ['tank', 'dps', 'healer', 'debuff', 'utility', 'manual'];
const CATEGORY_LABELS: Record<BonusCategory, string> = {
  tank: 'Tank Bonuses',
  dps: 'DPS Bonuses',
  healer: 'Healer Bonuses',
  debuff: 'Debuff Bonuses',
  utility: 'Utility Bonuses',
  manual: 'Manual Assignment',
};
const CATEGORY_NOTES: Partial<Record<BonusCategory, string>> = {
  tank: 'Auto-calculated via damage taken. May need manual adjustment.',
};
const CATEGORY_COLORS: Record<BonusCategory, string> = {
  tank: 'bg-red-900/30',
  dps: 'bg-orange-900/30',
  healer: 'bg-green-900/30',
  debuff: 'bg-purple-900/30',
  utility: 'bg-blue-900/30',
  manual: 'bg-gray-700/50',
};

export function BonusTable({ assignments, players, totalPot, raidType, onAssignmentChange }: Props) {
  const bonusDefinitions = getBonusDefinitions(raidType);
  const assignmentMap = new Map(assignments.map((a) => [a.bonusId, a]));

  const handlePlayerSelect = (bonusId: string, e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '') {
      onAssignmentChange(bonusId, null, null);
    } else if (value === 'custom') {
      const name = prompt('Enter player name:');
      if (name) {
        onAssignmentChange(bonusId, -1, name);
      }
    } else {
      const playerId = parseInt(value, 10);
      const player = players.find((p) => p.id === playerId);
      onAssignmentChange(bonusId, playerId, player?.name || null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <h2 className="text-lg font-semibold text-white p-4 border-b border-gray-700">
        Bonus Assignments
      </h2>

      <div className="divide-y divide-gray-700">
        {CATEGORY_ORDER.map((category) => {
          const bonuses = bonusDefinitions.filter((b) => b.category === category);
          if (bonuses.length === 0) return null;

          return (
            <div key={category}>
              <div className={`px-4 py-2 ${CATEGORY_COLORS[category]}`}>
                <h3 className="text-sm font-medium text-gray-300">{CATEGORY_LABELS[category]}</h3>
                {CATEGORY_NOTES[category] && (
                  <p className="text-xs text-gray-400 mt-0.5">{CATEGORY_NOTES[category]}</p>
                )}
              </div>
              <table className="w-full">
                <tbody>
                  {bonuses.map((bonus) => {
                    const assignment = assignmentMap.get(bonus.id);
                    const goldAmount = totalPot * (bonus.percentage / 100);

                    return (
                      <tr key={bonus.id} className="hover:bg-gray-700/50">
                        <td className="px-4 py-2 text-sm text-gray-300 w-40">{bonus.name}</td>
                        <td className="px-4 py-2 text-sm text-yellow-400 w-20">
                          {bonus.percentage.toFixed(2)}%
                        </td>
                        <td className="px-4 py-2 text-sm text-yellow-400 w-28">
                          {formatGold(goldAmount)}g
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={assignment?.playerId?.toString() || ''}
                              onChange={(e) => handlePlayerSelect(bonus.id, e)}
                              className="flex-1 rounded-md bg-gray-700 border-gray-600 text-white text-sm px-2 py-1 border focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Select --</option>
                              {[...players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                              <option value="custom">+ Custom name...</option>
                            </select>
                            {assignment?.autoDetected && (
                              <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded">
                                Auto
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}
