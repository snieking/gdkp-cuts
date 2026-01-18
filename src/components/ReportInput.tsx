import { useState } from 'react';
import { parseReportUrl } from '../api/warcraftlogs';

interface Props {
  onSubmit: (code: string) => void;
  loading: boolean;
}

export function ReportInput({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const code = parseReportUrl(url);
    if (!code) {
      setError('Invalid WCL report URL');
      return;
    }

    onSubmit(code);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="report-url" className="block text-sm font-medium text-gray-300">
          Warcraftlogs Report URL
        </label>
        <div className="mt-1 flex gap-2">
          <input
            type="text"
            id="report-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://classic.warcraftlogs.com/reports/ABC123"
            className="flex-1 rounded-md bg-gray-800 border-gray-700 text-white placeholder-gray-500 px-3 py-2 border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    </form>
  );
}
