import JobCard from './JobCard'

export default function JobList({ jobs, onSelect }) {
  if (!jobs.length) return null

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {jobs.map(job => (
        <JobCard key={job.id} job={job} onClick={() => onSelect(job)} />
      ))}
    </div>
  )
}
