export default function DashboardLoading() {
  return (
    <div className="p-8 bg-gray-50 min-h-screen animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-7 w-48 bg-gray-200 rounded-lg mb-2" />
        <div className="h-4 w-64 bg-gray-100 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-6 w-16 bg-gray-200 rounded mb-1" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Content rows */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-3 w-32 bg-gray-100 rounded" />
                <div className="h-3 w-56 bg-gray-100 rounded" />
              </div>
              <div className="h-7 w-20 bg-gray-100 rounded-full ml-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}