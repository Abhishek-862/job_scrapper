import { useState } from 'react'
import client from '../api/client'

export default function SearchBar({ onSearch, loading }) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('Remote')
  const [suggestions, setSuggestions] = useState([])
  const [loadingSugg, setLoadingSugg] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSuggestions([])
    onSearch({ query: query.trim(), location: location.trim() || 'Remote' })
  }

  const getSuggestions = async () => {
    if (!query.trim() || loadingSugg) return
    setLoadingSugg(true)
    try {
      const { data } = await client.post('/search/enhance', { query: query.trim() })
      setSuggestions(data.suggestions || [])
    } catch {
      setSuggestions([])
    } finally {
      setLoadingSugg(false)
    }
  }

  return (
    <div className="mb-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-white mb-1">Find Your Next Job</h1>
      <p className="text-slate-400 mb-6 text-sm sm:text-base">
        Scrapes LinkedIn in real-time · AI-powered analysis, resume matching &amp; cover letters
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 sm:gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='"Software Engineer", "Data Scientist"...'
          className="flex-1 min-w-0 px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition text-sm"
        />
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location"
          className="w-36 px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition text-sm"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition text-sm"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
        <button
          type="button"
          onClick={getSuggestions}
          disabled={loadingSugg || !query.trim()}
          title="Ask GPT-4o-mini to suggest related job titles"
          className="px-4 py-3 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition whitespace-nowrap"
        >
          {loadingSugg ? '✨ …' : '✨ AI Suggest'}
        </button>
      </form>

      {suggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-slate-500 text-xs mb-2 uppercase tracking-wide">GPT suggestions — click to use</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => { setQuery(s); setSuggestions([]) }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-full border border-slate-600 transition"
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => setSuggestions([])}
              className="px-3 py-1.5 text-slate-500 hover:text-slate-300 text-sm rounded-full transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
