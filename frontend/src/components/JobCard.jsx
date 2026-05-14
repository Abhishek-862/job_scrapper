export default function JobCard({ job, onClick }) {
  const hasAI = job.ai_summary || job.ai_match || job.ai_cover_letter
  const aiCount = [job.ai_summary, job.ai_match, job.ai_cover_letter].filter(Boolean).length

  return (
    <div
      onClick={onClick}
      className="bg-slate-800 border border-slate-700 hover:border-blue-500/60 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-0.5 group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-100 group-hover:text-blue-300 transition-colors leading-tight line-clamp-2">
            {job.title}
          </h3>
          <p className="text-blue-400 text-sm mt-1 font-medium truncate">{job.company}</p>
        </div>
        {hasAI && (
          <span className="shrink-0 px-2 py-0.5 bg-violet-900/60 text-violet-300 text-xs rounded-full border border-violet-700/60">
            AI ×{aiCount}
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-sm text-slate-400">
        {job.location && (
          <div className="flex items-center gap-2">
            <span>📍</span>
            <span className="truncate">{job.location}</span>
          </div>
        )}
        {job.salary && (
          <div className="flex items-center gap-2">
            <span>💰</span>
            <span className="text-emerald-400 font-medium">{job.salary}</span>
          </div>
        )}
        {job.posted_at && job.posted_at !== 'None' && (
          <div className="flex items-center gap-2">
            <span>🗓</span>
            <span>{job.posted_at}</span>
          </div>
        )}
      </div>

      {job.description && (
        <p className="mt-3 text-slate-500 text-xs line-clamp-2 leading-relaxed">
          {job.description.slice(0, 160)}
        </p>
      )}

      <div className="mt-3 text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
        Click to view details &amp; AI tools →
      </div>
    </div>
  )
}
