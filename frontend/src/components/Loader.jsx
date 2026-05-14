export default function Loader({ query }) {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-5" />
      <p className="text-slate-300 font-medium">Scraping LinkedIn for "{query}"</p>
      <p className="text-slate-500 text-sm mt-1">Usually takes 20–60 seconds…</p>
    </div>
  )
}
