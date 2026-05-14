import { useState, useEffect, useRef } from 'react'
import SearchBar from './components/SearchBar'
import JobList from './components/JobList'
import JobModal from './components/JobModal'
import Loader from './components/Loader'
import client from './api/client'

export default function App() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)
  const [taskStatus, setTaskStatus] = useState(null)
  const pollRef = useRef(null)

  const startSearch = async ({ query: q, location }) => {
    setLoading(true)
    setError(null)
    setJobs([])
    setTaskStatus('pending')
    setQuery(q)

    try {
      const { data } = await client.post('/search', { query: q, location, results_wanted: 15 })
      pollTask(data.task_id, q)
    } catch (e) {
      setError(e.response?.data?.detail || 'Search failed. Is the backend running?')
      setLoading(false)
      setTaskStatus(null)
    }
  }

  const pollTask = (taskId, q) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await client.get(`/tasks/${taskId}`)
        if (data.status === 'SUCCESS') {
          clearInterval(pollRef.current)
          setTaskStatus('done')
          await loadJobs(q)
          setLoading(false)
        } else if (['FAILURE', 'REVOKED'].includes(data.status)) {
          clearInterval(pollRef.current)
          setError('Scraping failed — LinkedIn may be rate-limiting. Try again in a minute.')
          setLoading(false)
          setTaskStatus('failed')
        }
      } catch {
        clearInterval(pollRef.current)
        setError('Lost connection to server.')
        setLoading(false)
      }
    }, 2500)
  }

  const loadJobs = async (q) => {
    const { data } = await client.get(`/jobs?query=${encodeURIComponent(q)}`)
    setJobs(data)
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const updateJob = (updated) => {
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
    if (selectedJob?.id === updated.id) setSelectedJob(updated)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700/60 bg-slate-800/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <span className="text-xl font-bold text-blue-400 tracking-tight">⚡ JobScrapper</span>
          <span className="hidden sm:block text-slate-500 text-sm">LinkedIn jobs · GPT-4o-mini analysis</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <SearchBar onSearch={startSearch} loading={loading} />

        {error && (
          <div className="mt-4 p-4 bg-red-900/40 border border-red-600/50 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && <Loader query={query} />}

        {!loading && jobs.length > 0 && (
          <p className="mt-1 text-slate-500 text-sm">
            {jobs.length} jobs found for <span className="text-blue-400 font-medium">"{query}"</span>
            {' '}· click any card to open AI features
          </p>
        )}

        {!loading && !error && taskStatus === 'done' && jobs.length === 0 && (
          <p className="mt-10 text-center text-slate-500">
            No results found. LinkedIn may have blocked the request — try a different query.
          </p>
        )}

        <JobList jobs={jobs} onSelect={setSelectedJob} />
      </main>

      {selectedJob && (
        <JobModal job={selectedJob} onClose={() => setSelectedJob(null)} onUpdate={updateJob} />
      )}
    </div>
  )
}
