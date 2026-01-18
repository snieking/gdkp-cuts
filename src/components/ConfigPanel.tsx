import { Config } from '../types';

interface Props {
  config: Config;
  onChange: (config: Config) => void;
}

export function ConfigPanel({ config, onChange }: Props) {
  const handleChange = (field: keyof Config, value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({ ...config, [field]: numValue });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white">Configuration</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="totalPot" className="block text-sm font-medium text-gray-300">
            Total Pot (gold)
          </label>
          <input
            type="number"
            id="totalPot"
            value={config.totalPot || ''}
            onChange={(e) => handleChange('totalPot', e.target.value)}
            className="mt-1 w-full rounded-md bg-gray-700 border-gray-600 text-white px-3 py-2 border focus:ring-2 focus:ring-blue-500"
            min="0"
          />
        </div>

        <div>
          <label htmlFor="organizerCut" className="block text-sm font-medium text-gray-300">
            Organizer Cut (%)
          </label>
          <input
            type="number"
            id="organizerCut"
            value={config.organizerCutPercent || ''}
            onChange={(e) => handleChange('organizerCutPercent', e.target.value)}
            className="mt-1 w-full rounded-md bg-gray-700 border-gray-600 text-white px-3 py-2 border focus:ring-2 focus:ring-blue-500"
            min="0"
            max="100"
          />
        </div>

        <div>
          <label htmlFor="bonusPool" className="block text-sm font-medium text-gray-300">
            Bonus Pool (%)
          </label>
          <input
            type="number"
            id="bonusPool"
            value={config.bonusPoolPercent || ''}
            onChange={(e) => handleChange('bonusPoolPercent', e.target.value)}
            className="mt-1 w-full rounded-md bg-gray-700 border-gray-600 text-white px-3 py-2 border focus:ring-2 focus:ring-blue-500"
            min="0"
            max="100"
          />
        </div>

        <div>
          <label htmlFor="playerCount" className="block text-sm font-medium text-gray-300">
            Player Count
          </label>
          <input
            type="number"
            id="playerCount"
            value={config.playerCount || ''}
            onChange={(e) => handleChange('playerCount', e.target.value)}
            className="mt-1 w-full rounded-md bg-gray-700 border-gray-600 text-white px-3 py-2 border focus:ring-2 focus:ring-blue-500"
            min="1"
            max="40"
          />
        </div>
      </div>
    </div>
  );
}
