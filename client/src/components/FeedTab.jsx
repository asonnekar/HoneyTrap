import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8000/api'

const CATEGORY_META = {
  phishing: { label: 'Phishing', color: 'bg-red-500/12 text-red-200 border-red-400/24' },
  impersonation: { label: 'Impersonation', color: 'bg-orange-500/12 text-orange-200 border-orange-400/24' },
  prize_fraud: { label: 'Prize Fraud', color: 'bg-yellow-500/12 text-yellow-100 border-yellow-400/24' },
  tech_support: { label: 'Tech Support Scam', color: 'bg-sky-500/12 text-sky-200 border-sky-400/24' },
  romance_scam: { label: 'Romance Scam', color: 'bg-pink-500/12 text-pink-200 border-pink-400/24' },
  investment_fraud: { label: 'Investment Fraud', color: 'bg-violet-500/12 text-violet-200 border-violet-400/24' },
  medicare_scam: { label: 'Medicare Scam', color: 'bg-teal-500/12 text-teal-100 border-teal-400/24' },
  irs_scam: { label: 'IRS Scam', color: 'bg-red-600/12 text-red-200 border-red-500/24' },
  package_delivery: { label: 'Fake Delivery', color: 'bg-yellow-600/12 text-yellow-100 border-yellow-500/24' },
  suspicious: { label: 'Suspicious', color: 'bg-amber-500/12 text-amber-100 border-amber-400/24' },
  legitimate: { label: 'Legitimate', color: 'bg-emerald-500/12 text-emerald-200 border-emerald-400/24' },
}

const TYPE_ICONS = { email: '📧', sms: '💬', url: '🔗', call_script: '📞' }

function RiskBadge({ score }) {
  if (!score) return <span className="text-xs text-[rgba(244,234,215,0.2)] font-mono">-</span>

  const color = score >= 70 ? '#e07a63' : score >= 40 ? '#d99a36' : '#7eb489'
  const glow = score >= 70 ? 'rgba(224,122,99,0.45)' : score >= 40 ? 'rgba(217,154,54,0.45)' : 'rgba(126,180,137,0.45)'

  return (
    <span className="text-xs font-bold font-mono" style={{ color, textShadow: `0 0 7px ${glow}` }}>
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
    } catch {
      // server offline
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
    finally {
      setSubmitLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[rgba(244,234,215,0.95)]">🌐 Community Scam Feed</h2>
          <p className="text-[rgba(244,234,215,0.42)] text-sm mt-0.5">Crowdsourced reports with softer signals and clearer severity.</p>
        </div>
        <button onClick={() => setSubmitOpen(!submitOpen)} className="btn-glow px-4 py-2.5 rounded-xl text-sm">
          + Report Scam
        </button>
      </div>

      {submitOpen && (
        <div
          className="glass rounded-2xl p-5 space-y-3 animate-fade-in-up border border-[rgba(244,186,99,0.14)]"
          style={{ boxShadow: '0 16px 34px rgba(0,0,0,0.18), 0 0 22px rgba(217,154,54,0.05)' }}
        >
          <p className="text-[var(--honey-bright)] text-sm font-semibold" style={{ textShadow: '0 0 10px rgba(217,154,54,0.22)' }}>
            Submit a Scam Report
          </p>
          <textarea
            value={submitContent}
            onChange={(e) => setSubmitContent(e.target.value)}
            placeholder="Paste the scam content here..."
            rows={4}
            className="w-full input-glow rounded-xl px-4 py-3 text-[rgba(244,234,215,0.86)] text-sm placeholder-[rgba(244,234,215,0.24)] resize-none"
          />
          <div className="flex gap-3 flex-wrap">
            <select
              value={submitType}
              onChange={(e) => setSubmitType(e.target.value)}
              className="input-glow rounded-xl px-3 py-2 text-[rgba(244,234,215,0.76)] text-sm bg-transparent"
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
              className="flex-1 input-glow rounded-xl px-3 py-2 text-[rgba(244,234,215,0.76)] text-sm placeholder-[rgba(244,234,215,0.24)]"
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

      {loading ? (
        <div className="text-center py-20">
          <svg className="animate-spin h-6 w-6 mx-auto text-[var(--honey-bright)]/60" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[rgba(244,234,215,0.26)] text-sm mt-3">Loading community reports...</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3 opacity-30">🌐</p>
          <p className="text-[rgba(244,234,215,0.34)] text-sm">No reports yet - be the first to submit.</p>
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
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => upvote(item.id)}
                    disabled={voted}
                    className={`flex flex-col items-center shrink-0 w-10 py-2 rounded-xl transition-all duration-200 ${
                      voted ? 'cursor-default' : 'hover:scale-105'
                    }`}
                    style={voted ? {
                      background: 'rgba(217,154,54,0.1)',
                      border: '1px solid rgba(217,154,54,0.22)',
                      boxShadow: '0 0 12px rgba(217,154,54,0.12)',
                    } : {
                      background: 'rgba(255,244,225,0.03)',
                      border: '1px solid rgba(255,231,194,0.08)',
                    }}
                  >
                    <span className="text-[10px] mb-0.5" style={{ color: voted ? '#d99a36' : 'rgba(244,234,215,0.34)' }}>▲</span>
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: voted ? '#efba63' : 'rgba(244,234,215,0.54)',
                        textShadow: voted ? '0 0 8px rgba(217,154,54,0.45)' : 'none',
                      }}
                    >
                      {item.upvotes}
                    </span>
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2.5">
                      <span className="text-sm">{TYPE_ICONS[item.type] || '📄'}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cat.color}`}>
                        {cat.label}
                      </span>
                      <RiskBadge score={item.risk_score} />
                      <span className="text-[rgba(244,234,215,0.16)] text-xs">•</span>
                      <span className="text-[rgba(244,234,215,0.34)] text-xs">📍 {item.region}</span>
                      <span className="text-[rgba(244,234,215,0.16)] text-xs">•</span>
                      <span className="text-[rgba(244,234,215,0.28)] text-xs">{timeAgo(item.submitted_at)}</span>
                    </div>
                    <p className="text-[rgba(244,234,215,0.58)] text-sm leading-relaxed line-clamp-3">
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
