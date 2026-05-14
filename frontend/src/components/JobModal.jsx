import { useState, useEffect } from 'react'
import client from '../api/client'

const TABS = [
  { id: 'details', label: 'Description' },
  { id: 'analyze', label: '✨ AI Analysis', aiKey: 'summary' },
  { id: 'match', label: '🎯 Resume Match', aiKey: 'match' },
  { id: 'tweak', label: '✏️ Tweak Resume', aiKey: 'tweak' },
  { id: 'cover', label: '📝 Cover Letter', aiKey: 'cover_letter' },
]

function safeJSON(str) {
  if (!str) return null
  try { return JSON.parse(str) } catch { return null }
}

function FitBar({ score }) {
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  const text = score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`${text} font-bold text-lg w-10 text-right`}>{score}</span>
    </div>
  )
}

export default function JobModal({ job, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('details')
  const [busy, setBusy] = useState({})
  const [resumeText, setResumeText] = useState('')
  const [tweakResume, setTweakResume] = useState('')
  const [background, setBackground] = useState('')
  const [copied, setCopied] = useState({})
  const [aiData, setAiData] = useState({
    summary: safeJSON(job.ai_summary),
    match: safeJSON(job.ai_match),
    tweak: safeJSON(job.ai_resume_tweak),
    cover_letter: job.ai_cover_letter || null,
  })

  useEffect(() => {
    setAiData({
      summary: safeJSON(job.ai_summary),
      match: safeJSON(job.ai_match),
      tweak: safeJSON(job.ai_resume_tweak),
      cover_letter: job.ai_cover_letter || null,
    })
  }, [job.id])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const call = async (key, fn) => {
    setBusy(b => ({ ...b, [key]: true }))
    try {
      const { data } = await fn()
      setAiData({
        summary: safeJSON(data.ai_summary),
        match: safeJSON(data.ai_match),
        tweak: safeJSON(data.ai_resume_tweak),
        cover_letter: data.ai_cover_letter || null,
      })
      onUpdate(data)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(b => ({ ...b, [key]: false }))
    }
  }

  const handleAnalyze = () => call('analyze', () => client.post(`/jobs/${job.id}/analyze`))
  const handleMatch = () => call('match', () => client.post(`/jobs/${job.id}/match`, { resume_text: resumeText }))
  const handleTweak = () => call('tweak', () => client.post(`/jobs/${job.id}/tweak-resume`, { resume_text: tweakResume }))
  const handleCover = () => call('cover', () => client.post(`/jobs/${job.id}/cover-letter`, { background }))

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text)
    setCopied(c => ({ ...c, [key]: true }))
    setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000)
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white leading-tight">{job.title}</h2>
              <p className="text-blue-400 text-sm mt-0.5 font-medium">{job.company}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                {job.location && <span>📍 {job.location}</span>}
                {job.salary && <span className="text-emerald-400 font-medium">💰 {job.salary}</span>}
                {job.posted_at && job.posted_at !== 'None' && <span>🗓 {job.posted_at}</span>}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none shrink-0 transition">×</button>
          </div>
          {job.job_url && (
            <a href={job.job_url} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2">
              View on LinkedIn ↗
            </a>
          )}
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-slate-700 px-5 gap-1 shrink-0">
          {TABS.map(tab => {
            const done = tab.aiKey ? Boolean(aiData[tab.aiKey]) : false
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-3 text-xs sm:text-sm font-medium border-b-2 transition whitespace-nowrap -mb-px ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}>
                {tab.label}{done ? ' ✓' : ''}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── Description ── */}
          {activeTab === 'details' && (
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {job.description || 'No description available.'}
            </p>
          )}

          {/* ── AI Analysis ── */}
          {activeTab === 'analyze' && (
            !aiData.summary ? (
              <div className="text-center py-14">
                <p className="text-slate-400 mb-1">Let GPT-4o-mini dissect this job description</p>
                <p className="text-slate-600 text-xs mb-5">Gets summary, key skills, seniority, salary estimate &amp; red flags</p>
                <button onClick={handleAnalyze} disabled={busy.analyze}
                  className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold rounded-xl transition">
                  {busy.analyze ? 'Analyzing…' : '✨ Analyze This Job'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <InfoBox title="Summary">
                  <p className="text-slate-200 text-sm">{aiData.summary.summary}</p>
                </InfoBox>
                <div className="grid grid-cols-2 gap-3">
                  <InfoBox title="Seniority">
                    <span className="capitalize text-blue-300 font-semibold">{aiData.summary.seniority}</span>
                  </InfoBox>
                  <InfoBox title="Salary Estimate">
                    <span className="text-emerald-400 font-semibold text-sm">{aiData.summary.salary_estimate || '—'}</span>
                  </InfoBox>
                </div>
                {aiData.summary.key_skills?.length > 0 && (
                  <InfoBox title="Key Skills">
                    <div className="flex flex-wrap gap-2">
                      {aiData.summary.key_skills.map((s, i) => (
                        <span key={i} className="px-2.5 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full border border-blue-800/60">{s}</span>
                      ))}
                    </div>
                  </InfoBox>
                )}
                {aiData.summary.why_apply?.length > 0 && (
                  <InfoBox title="Why Apply">
                    <ul className="space-y-1">
                      {aiData.summary.why_apply.map((r, i) => (
                        <li key={i} className="text-sm text-slate-300 flex gap-2">
                          <span className="text-emerald-400 shrink-0">✓</span>{r}
                        </li>
                      ))}
                    </ul>
                  </InfoBox>
                )}
                {aiData.summary.red_flags?.filter(Boolean).length > 0 && (
                  <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
                    <p className="text-red-400 font-semibold text-sm mb-2">⚠ Red Flags</p>
                    <ul className="space-y-1">
                      {aiData.summary.red_flags.map((f, i) => (
                        <li key={i} className="text-sm text-red-300">{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button onClick={handleAnalyze} disabled={busy.analyze} className="text-xs text-slate-600 hover:text-slate-400 transition">
                  {busy.analyze ? 'Re-analyzing…' : '↺ Re-analyze'}
                </button>
              </div>
            )
          )}

          {/* ── Resume Match ── */}
          {activeTab === 'match' && (
            <div>
              <div className="mb-5">
                <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                  Paste your resume or describe your experience
                </label>
                <textarea value={resumeText} onChange={e => setResumeText(e.target.value)}
                  placeholder="e.g. 3 years Python & React, built ML pipelines at Series B startup, led team of 4 engineers..."
                  rows={4}
                  className="w-full px-3 py-2.5 bg-slate-700/80 border border-slate-600 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
                <button onClick={handleMatch} disabled={busy.match || !resumeText.trim()}
                  className="mt-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
                  {busy.match ? 'Matching…' : '🎯 Match My Profile'}
                </button>
              </div>
              {aiData.match && !aiData.match.error && (
                <div className="space-y-4 border-t border-slate-700 pt-4">
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Fit Score</p>
                    <FitBar score={aiData.match.fit_score} />
                    <p className="text-slate-300 text-sm mt-2">{aiData.match.recommendation}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <InfoBox title="Strengths">
                      <ul className="space-y-1">
                        {aiData.match.strengths?.map((s, i) => (
                          <li key={i} className="text-xs text-slate-300">✓ {s}</li>
                        ))}
                      </ul>
                    </InfoBox>
                    <InfoBox title="Gaps">
                      <ul className="space-y-1">
                        {aiData.match.gaps?.map((g, i) => (
                          <li key={i} className="text-xs text-slate-300">⚡ {g}</li>
                        ))}
                      </ul>
                    </InfoBox>
                  </div>
                  {aiData.match.how_to_pitch && (
                    <InfoBox title="How to Pitch Yourself">
                      <p className="text-slate-200 text-sm">{aiData.match.how_to_pitch}</p>
                    </InfoBox>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Tweak Resume ── */}
          {activeTab === 'tweak' && (
            <div>
              <div className="mb-5">
                <p className="text-slate-300 text-sm font-medium mb-1">Paste your resume</p>
                <p className="text-slate-500 text-xs mb-3">
                  GPT-4o-mini will rewrite your bullet points with stronger action verbs, surface ATS keywords from this job, and suggest a tailored summary — without inventing experience you don't have.
                </p>
                <textarea value={tweakResume} onChange={e => setTweakResume(e.target.value)}
                  placeholder="Paste your full resume or relevant bullet points here..."
                  rows={6}
                  className="w-full px-3 py-2.5 bg-slate-700/80 border border-slate-600 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
                <button onClick={handleTweak} disabled={busy.tweak || !tweakResume.trim()}
                  className="mt-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
                  {busy.tweak ? 'Tweaking…' : '✏️ Tweak My Resume'}
                </button>
              </div>

              {aiData.tweak && !aiData.tweak.error && (
                <div className="space-y-4 border-t border-slate-700 pt-4">

                  {/* ATS Keywords */}
                  {aiData.tweak.ats_keywords?.length > 0 && (
                    <InfoBox title="ATS Keywords to Add">
                      <div className="flex flex-wrap gap-2">
                        {aiData.tweak.ats_keywords.map((kw, i) => (
                          <span key={i} className="px-2.5 py-1 bg-emerald-900/50 text-emerald-300 text-xs rounded-full border border-emerald-800/60">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </InfoBox>
                  )}

                  {/* Suggested Summary */}
                  {aiData.tweak.suggested_summary && (
                    <div className="bg-slate-700/40 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-slate-400 text-xs uppercase tracking-wide font-medium">Suggested Professional Summary</p>
                        <button onClick={() => copyText('summary', aiData.tweak.suggested_summary)}
                          className="text-xs text-blue-400 hover:text-blue-300 transition">
                          {copied.summary ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-slate-200 text-sm italic leading-relaxed">"{aiData.tweak.suggested_summary}"</p>
                    </div>
                  )}

                  {/* Bullet Rewrites */}
                  {aiData.tweak.bullet_rewrites?.length > 0 && (
                    <div className="bg-slate-700/40 rounded-xl p-4">
                      <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-3">Bullet Point Rewrites</p>
                      <div className="space-y-4">
                        {aiData.tweak.bullet_rewrites.map((b, i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="flex gap-2 items-start">
                              <span className="text-red-400 text-xs mt-0.5 shrink-0">Before</span>
                              <p className="text-slate-400 text-xs line-through leading-relaxed">{b.original}</p>
                            </div>
                            <div className="flex gap-2 items-start">
                              <span className="text-emerald-400 text-xs mt-0.5 shrink-0">After</span>
                              <p className="text-slate-200 text-xs font-medium leading-relaxed">{b.improved}</p>
                            </div>
                            {i < aiData.tweak.bullet_rewrites.length - 1 && (
                              <div className="border-b border-slate-700 pt-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skills to Highlight */}
                  {aiData.tweak.skills_to_highlight?.length > 0 && (
                    <InfoBox title="Skills to Highlight More">
                      <div className="flex flex-wrap gap-2">
                        {aiData.tweak.skills_to_highlight.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 bg-blue-900/50 text-blue-300 text-xs rounded-full border border-blue-800/60">{s}</span>
                        ))}
                      </div>
                    </InfoBox>
                  )}

                  {/* Tips */}
                  {aiData.tweak.tips?.length > 0 && (
                    <InfoBox title="Actionable Tips">
                      <ul className="space-y-1.5">
                        {aiData.tweak.tips.map((t, i) => (
                          <li key={i} className="text-xs text-slate-300 flex gap-2">
                            <span className="text-violet-400 shrink-0">→</span>{t}
                          </li>
                        ))}
                      </ul>
                    </InfoBox>
                  )}

                  <button onClick={handleTweak} disabled={busy.tweak} className="text-xs text-slate-600 hover:text-slate-400 transition">
                    {busy.tweak ? 'Re-tweaking…' : '↺ Re-tweak'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Cover Letter ── */}
          {activeTab === 'cover' && (
            <div>
              <div className="mb-5">
                <label className="block text-sm text-slate-300 mb-1.5 font-medium">
                  Your background <span className="text-slate-500 font-normal">(optional — personalizes the letter)</span>
                </label>
                <textarea value={background} onChange={e => setBackground(e.target.value)}
                  placeholder="e.g. 5 years in fintech backend, Go & Kubernetes expert, previously at JP Morgan payments team..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-slate-700/80 border border-slate-600 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none" />
                <button onClick={handleCover} disabled={busy.cover}
                  className="mt-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition">
                  {busy.cover ? 'Writing…' : '📝 Generate Cover Letter'}
                </button>
              </div>
              {aiData.cover_letter && (
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-slate-300 font-semibold text-sm">Generated Cover Letter</p>
                    <button onClick={() => copyText('cover', aiData.cover_letter)}
                      className="text-xs text-blue-400 hover:text-blue-300 transition">
                      {copied.cover ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="bg-slate-700/40 rounded-xl p-4">
                    <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed">{aiData.cover_letter}</p>
                  </div>
                  <button onClick={handleCover} disabled={busy.cover} className="mt-2 text-xs text-slate-600 hover:text-slate-400 transition">
                    {busy.cover ? 'Regenerating…' : '↺ Regenerate'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoBox({ title, children }) {
  return (
    <div className="bg-slate-700/40 rounded-xl p-4">
      <p className="text-slate-400 text-xs uppercase tracking-wide font-medium mb-2">{title}</p>
      {children}
    </div>
  )
}
