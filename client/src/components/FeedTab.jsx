import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8000/api'

const CATEGORY_META = {
  phishing:         { label: 'Phishing',           color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  impersonation:    { label: 'Impersonation',       color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  prize_fraud:      { label: 'Prize Fraud',         color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  tech_support:     { label: 'Tech Support Scam',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  romance_scam:     { label: 'Romance Scam',        color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  investment_fraud: { label: 'Investment Fraud',    color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  medicare_scam:    { label: 'Medicare Scam',       color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
  irs_scam:         { label: 'IRS Scam',            color: 'bg-red-600/20 text-red-300 border-red-600/30' },
  package_delivery: { label: 'Fake Delivery',       color: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/30' },
  suspicious:       { label: 'Suspicious',          color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  legitimate:       { label: 'Legitimate',          color: 'bg-green-500/20 text-green-300 border-green-500/30' },
}

const TYPE_ICONS = {
  email: '📧',
  sms: '💬',
  url: '🔗',
  call_script: '📞',
}

function RiskBadge({ score }) {
  const color =
    score >= 70 ? 'text-red-400'
    : score >= 40 ? 'text-amber-400'
    : 'text-green-400'
  return (
    <span className={`text-xs font-bold font-mono ${color}`}>
      {score > 0 ? `${score}/100` : '—'}
    </span>
  )
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr + 'Z').getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function FeedTab() {
  const [feed, setFeed] = useState([])
  const [loading, setLoading] = useState(true)
  const [upvotedIds, setUpvotedIds] = useState(new Set())

  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitContent, setSubmitContent] = useState('')
  const [submitType, setSubmitType] = useState('sms')
  const [submitRegion, setSubmitRegion] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)

  const loadFeed = async () => {
    try {
      const res = await fetch(`${API_BASE}/feed`)
      setFeed(await res.json())
    } catch {
      // server may not be running; show empty state
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadFeed() }, [])

  const upvote = async (id) => {
    if (upvotedIds.has(id)) return
    try {
      const res = await fetch(`${API_BASE}/feed/${id}/upvote`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setFeed((prev) => prev.map((item) => item.id === id ? { ...item, upvotes: data.upvotes } : item))
        setUpvotedIds((prev) => new Set([...prev, id]))
      }
    } catch {}
  }

  const handleSubmit = async () => {
    if (!submitContent.trim()) return
    setSubmitLoading(true)
    try {
      const res = await fetch(`${API_BASE}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: submitContent, type: submitType, region: submitRegion || 'Unknown' }),
      })
      if (res.ok) {
        const item = await res.json()
        setFeed((prev) => [item, ...prev])
        setSubmitContent('')
        setSubmitRegion('')
        setSubmitOpen(false)
      }
    } catch {}
    finally { setSubmitLoading(false) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">🌐 Community Scam Feed</h2>
          <p className="text-gray-500 text-sm mt-0.5">Crowdsourced scam reports — upvote to warn others</p>
        </div>
        <button
          onClick={() => setSubmitOpen(!submitOpen)}
          className="px-4 py-2 bg-amber-400 text-gray-950 font-bold rounded-xl text-sm hover:bg-amber-300 transition-all"
        >
          + Report Scam
        </button>
      </div>

      {/* Submit form */}
      {submitOpen && (
        <div className="bg-gray-900/60 border border-amber-400/30 rounded-2xl p-5 space-y-3">
          <p className="text-amber-400 text-sm font-semibold">Submit a Scam Report</p>
          <textarea
            value={submitContent}
            onChange={(e) => setSubmitContent(e.target.value)}
            placeholder="Paste the scam content here..."
            rows={4}
            className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/60 resize-none"
          />
          <div className="flex gap-3">
            <select
              value={submitType}
              onChange={(e) => setSubmitType(e.target.value)}
              className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none"
            >
              <option value="email">📧 Email</option>
              <option value="sms">💬 SMS</option>
              <option value="url">🔗 URL</option>
              <option value="call_script">📞 Call Script</option>
            </select>
            <input
              value={submitRegion}
              onChange={(e) => setSubmitRegion(e.target.value)}
              placeholder="Your state/region (optional)"
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-amber-500/60"
            />
            <button
              onClick={handleSubmit}
              disabled={submitLoading || !submitContent.trim()}
              className="px-5 py-2 bg-amber-400 text-gray-950 font-bold rounded-lg text-sm hover:bg-amber-300 disabled:opacity-40 transition-all"
            >
              {submitLoading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Feed */}
      {loading ? (
        <div className="text-center py-16">
          <svg className="animate-spin h-6 w-6 mx-auto text-amber-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-500 text-sm mt-3">Loading community reports...</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🌐</p>
          <p className="text-gray-500 text-sm">No reports yet — be the first to submit!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => {
            const cat = CATEGORY_META[item.category] || CATEGORY_META.suspicious
            return (
              <div
                key={item.id}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Upvote */}
                  <button
                    onClick={() => upvote(item.id)}
                    disabled={upvotedIds.has(item.id)}
                    className={`flex flex-col items-center shrink-0 px-2 py-1.5 rounded-lg transition-all ${
                      upvotedIds.has(item.id)
                        ? 'text-amber-400 bg-amber-400/10 cursor-default'
                        : 'text-gray-500 hover:text-amber-400 hover:bg-amber-400/10'
                    }`}
                  >
                    <span className="text-xs">▲</span>
                    <span className="text-xs font-bold">{item.upvotes}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-sm">{TYPE_ICONS[item.type] || '📄'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${cat.color}`}>
                        {cat.label}
                      </span>
                      <RiskBadge score={item.risk_score} />
                      <span className="text-gray-600 text-xs">•</span>
                      <span className="text-gray-500 text-xs">📍 {item.region}</span>
                      <span className="text-gray-600 text-xs">•</span>
                      <span className="text-gray-600 text-xs">{timeAgo(item.submitted_at)}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">
                      {item.content}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
