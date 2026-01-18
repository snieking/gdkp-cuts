import { formatGold, CalculationResult } from '../utils/calculations';

interface Props {
  result: CalculationResult;
}

export function PlayerSummary({ result }: Props) {
  const { goldToDistribute, bonusPool, evenSplitPool, baseCut, playerCuts, totalDistributed } = result;

  return (
    <div className="space-y-6">
      {/* Summary Section (Green) */}
      <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-green-300 mb-3">Distribution Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Gold to Distribute:</span>
            <p className="text-xl font-bold text-green-400">{formatGold(goldToDistribute)}g</p>
          </div>
          <div>
            <span className="text-gray-400">Bonus Pool:</span>
            <p className="text-xl font-bold text-yellow-400">{formatGold(bonusPool)}g</p>
          </div>
          <div>
            <span className="text-gray-400">Even Split Pool:</span>
            <p className="text-xl font-bold text-blue-400">{formatGold(evenSplitPool)}g</p>
          </div>
          <div>
            <span className="text-gray-400">Base Cut:</span>
            <p className="text-xl font-bold text-white">{formatGold(baseCut)}g</p>
          </div>
        </div>
      </div>

      {/* Player Cuts Table (Blue) */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg overflow-hidden">
        <h2 className="text-lg font-semibold text-blue-300 p-4 border-b border-blue-700/50">
          Player Cuts
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-900/30">
              <tr>
                <th className="px-4 py-2 text-left text-gray-300">#</th>
                <th className="px-4 py-2 text-left text-gray-300">Player</th>
                <th className="px-4 py-2 text-right text-gray-300">Base</th>
                <th className="px-4 py-2 text-left text-gray-300">Bonuses</th>
                <th className="px-4 py-2 text-right text-gray-300">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/30">
              {playerCuts.map((cut, index) => (
                <tr key={cut.id} className="hover:bg-blue-900/20">
                  <td className="px-4 py-2 text-gray-500">{index + 1}</td>
                  <td className="px-4 py-2 text-white font-medium">{cut.name}</td>
                  <td className="px-4 py-2 text-right text-gray-400">{formatGold(cut.baseCut)}g</td>
                  <td className="px-4 py-2">
                    {cut.bonuses.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {cut.bonuses.map((b) => (
                          <span
                            key={b.bonusId}
                            className="text-xs px-1.5 py-0.5 bg-yellow-900/50 text-yellow-400 rounded"
                            title={`${b.bonusName}: ${formatGold(b.amount)}g`}
                          >
                            {b.bonusName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-600">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-green-400 font-bold">
                    {formatGold(cut.totalCut)}g
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-blue-900/30 font-bold">
              <tr>
                <td colSpan={4} className="px-4 py-2 text-right text-gray-300">
                  Total Distributed:
                </td>
                <td className="px-4 py-2 text-right text-green-400">
                  {formatGold(totalDistributed)}g
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
