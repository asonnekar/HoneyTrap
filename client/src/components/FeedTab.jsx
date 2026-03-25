import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8000/api'

const CATEGORY_META = {
  phishing:         { label: 'Phishing',           color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  impersonation:    { label: 'Impersonation',       color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
  prize_fraud:      { label: 'Prize Fraud',         color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30' },
  tech_support:     { label: 'Tech Support Scam',   color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  romance_scam:     { label: 'Romance Scam',        color: 'bg-pink-500/15 text-pink-300 border-pink-500/30' },
  investment_fraud: { label: 'Investment Fraud',    color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  medicare_scam:    { label: 'Medicare Scam',       color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  irs_scam:         { label: 'IRS Scam',            color: 'bg-red-600/15 text-red-300 border-red-600/30' },
  package_delivery: { label: 'Fake Delivery',       color: 'bg-yellow-600/15 text-yellow-300 border-yellow-600/30' },
  suspicious:       { label: 'Suspicious',          color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  legitimate:       { label: 'Legitimate',          color: 'bg-green-500/15 text-green-300 border-green-500/30' },
}

const TYPE_ICONS = { email: '📧', sms: '💬', url: '🔗', call_script: '📞' }

function RiskBadge({ score }) {
  if (!score) return <span className="text-xs text-white/20 font-mono">—</span>
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#22c55e'
  const glow  = score >= 70 ? 'rgba(239,68,68,0.5)' : score >= 40 ? 'rgba(245,158,11,0.5)' : 'rgba(34,197,94,0.5)'
  return (
    <span
      className="text-xs font-bold font-mono"
      style={{ color, textShadow: `0 0 8px ${glow}` }}
    >
      {score}/100
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
    } catch { /* server offline */ }
    finally { setLoading(false) }
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
          <h2 className="text-base font-bold text-white">🌐 Community Scam Feed</h2>
          <p className="text-white/35 text-sm mt-0.5">Crowdsourced reports — upvote to warn others</p>
        </div>
        <button
          onClick={() => setSubmitOpen(!submitOpen)}
          className="btn-glow px-4 py-2.5 rounded-xl text-sm"
        >
          + Report Scam
        </button>
      </div>

      {/* Submit form */}
      {submitOpen && (
        <div
          className="glass rounded-2xl p-5 space-y-3 animate-fade-in-up border border-amber-400/15"
          style={{ boxShadow: '0 0 32px rgba(245,158,11,0.05)' }}
        >
          <p className="text-amber-400/80 text-sm font-semibold"
            style={{ textShadow: '0 0 12px rgba(245,158,11,0.4)' }}>
            Submit a Scam Report
          </p>
          <textarea
            value={submitContent}
            onChange={(e) => setSubmitContent(e.target.value)}
            placeholder="Paste the scam content here..."
            rows={4}
            className="w-full input-glow rounded-xl px-4 py-3 text-white/80 text-sm placeholder-white/20 resize-none"
          />
          <div className="flex gap-3 flex-wrap">
            <select
              value={submitType}
              onChange={(e) => setSubmitType(e.target.value)}
              className="input-glow rounded-xl px-3 py-2 text-white/70 text-sm bg-transparent"
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
              className="flex-1 input-glow rounded-xl px-3 py-2 text-white/70 text-sm placeholder-white/20"
            />
            <button
              onClick={handleSubmit}
              disabled={submitLoading || !submitContent.trim()}
              className="btn-glow px-5 py-2 rounded-xl text-sm"
            >
              {submitLoading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      )}

      {/* Feed list */}
      {loading ? (
        <div className="text-center py-20">
          <svg className="animate-spin h-6 w-6 mx-auto text-amber-400/60" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-white/25 text-sm mt-3">Loading community reports...</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3 opacity-30">🌐</p>
          <p className="text-white/30 text-sm">No reports yet — be the first to submit!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((item, idx) => {
            const cat = CATEGORY_META[item.category] || CATEGORY_META.suspicious
            const voted = upvotedIds.has(item.id)
            return (
              <div
                key={item.id}
                className="glass glass-hover rounded-2xl p-4 transition-all duration-200 animate-fade-in-up"
                style={{ animationDelay: `${idx * 40}ms`, boxShadow: '0 0 1px rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Upvote */}
                  <button
                    onClick={() => upvote(item.id)}
                    disabled={voted}
                    className={`flex flex-col items-center shrink-0 w-10 py-2 rounded-xl transition-all duration-200 ${
                      voted
                        ? 'cursor-default'
                        : 'hover:scale-105'
                    }`}
                    style={voted ? {
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.25)',
                      boxShadow: '0 0 12px rgba(245,158,11,0.15)',
                    } : {
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <span
                      className="text-[10px] mb-0.5"
                      style={{ color: voted ? '#f59e0b' : 'rgba(255,255,255,0.3)' }}
                    >▲</span>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: voted ? '#f59e0b' : 'rgba(255,255,255,0.5)',
                        textShadow: voted ? '0 0 8px rgba(245,158,11,0.6)' : 'none',
                      }}
                    >
                      {item.upvotes}
                    </span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2.5">
                      <span className="text-sm">{TYPE_ICONS[item.type] || '📄'}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cat.color}`}>
                        {cat.label}
                      </span>
                      <RiskBadge score={item.risk_score} />
                      <span className="text-white/15 text-xs">•</span>
                      <span className="text-white/30 text-xs">📍 {item.region}</span>
                      <span className="text-white/15 text-xs">•</span>
                      <span className="text-white/25 text-xs">{timeAgo(item.submitted_at)}</span>
                    </div>
                    <p className="text-white/55 text-sm leading-relaxed line-clamp-3">
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
