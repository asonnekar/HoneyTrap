import { useState } from 'react'
import RiskMeter from './RiskMeter'

const API_BASE = 'http://localhost:8000/api'

const CONTENT_TYPES = [
  { id: 'email',       label: 'Email',       icon: '📧', placeholder: 'Paste a suspicious email here — subject, headers, body...' },
  { id: 'sms',         label: 'SMS / Text',  icon: '💬', placeholder: 'Paste a suspicious text message here...' },
  { id: 'url',         label: 'URL',         icon: '🔗', placeholder: 'Paste a suspicious link or URL here...' },
  { id: 'call_script', label: 'Call Script', icon: '📞', placeholder: 'Paste a phone call transcript or describe what the caller said...' },
]

const CATEGORY_META = {
  phishing:         { label: 'Phishing',           color: 'bg-red-500/20 text-red-300 border-red-500/40' },
  impersonation:    { label: 'Impersonation',       color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' },
  prize_fraud:      { label: 'Prize Fraud',         color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  tech_support:     { label: 'Tech Support Scam',   color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  romance_scam:     { label: 'Romance Scam',        color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
  investment_fraud: { label: 'Investment Fraud',    color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  medicare_scam:    { label: 'Medicare Scam',       color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
  irs_scam:         { label: 'IRS Scam',            color: 'bg-red-600/20 text-red-300 border-red-600/40' },
  package_delivery: { label: 'Fake Delivery',       color: 'bg-yellow-600/20 text-yellow-300 border-yellow-600/40' },
  legitimate:       { label: 'Legitimate',          color: 'bg-green-600/20 text-green-300 border-green-600/40' },
  suspicious:       { label: 'Suspicious',          color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function HighlightedContent({ content, redFlags }) {
  if (!redFlags || redFlags.length === 0) {
    return <p className="text-white/50 text-sm whitespace-pre-wrap font-mono leading-relaxed">{content}</p>
  }
  const matches = []
  redFlags.forEach((flag) => {
    let idx = 0
    while (true) {
      const pos = content.indexOf(flag.text, idx)
      if (pos === -1) break
      matches.push({ start: pos, end: pos + flag.text.length, reason: flag.reason, text: flag.text })
      idx = pos + flag.text.length
    }
  })
  matches.sort((a, b) => a.start - b.start)
  const parts = []
  let cursor = 0
  matches.forEach((m, i) => {
    if (m.start > cursor) parts.push(<span key={`t${i}`} className="text-white/50">{content.slice(cursor, m.start)}</span>)
    parts.push(
      <span
        key={`h${i}`}
        className="bg-red-500/20 border-b-2 border-red-400/70 text-red-300 cursor-help rounded-sm px-0.5"
        title={`⚠ ${m.reason}`}
        style={{ boxShadow: 'inset 0 0 8px rgba(239,68,68,0.1)' }}
      >
        {m.text}
      </span>
    )
    cursor = m.end
  })
  if (cursor < content.length) parts.push(<span key="tail" className="text-white/50">{content.slice(cursor)}</span>)
  return <p className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{parts}</p>
}

export default function AnalyzeTab({ onResult, onContentChange }) {
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState('email')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const selectedType = CONTENT_TYPES.find((t) => t.id === contentType)

  const handleAnalyze = async () => {
    if (!content.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: contentType }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Analysis failed')
      }
      const data = await res.json()
      setResult(data)
      onResult?.(data)
      onContentChange?.(content)
    } catch (e) {
      setError(e.message || 'Analysis failed. Make sure Ollama and the server are running.')
    } finally {
      setLoading(false)
    }
  }

  const cat = result ? (CATEGORY_META[result.category] || CATEGORY_META.suspicious) : null

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div className="flex gap-2 flex-wrap">
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setContentType(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              contentType === t.id ? 'btn-glow' : 'btn-ghost'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={selectedType.placeholder}
          rows={7}
          className="w-full input-glow rounded-2xl px-4 py-3.5 text-white/80 text-sm placeholder-white/20 resize-none leading-relaxed"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !content.trim()}
          className="btn-glow w-full py-3.5 rounded-2xl text-sm"
        >
          {loading
            ? <span className="flex items-center justify-center gap-2"><Spinner /> Analyzing with local AI...</span>
            : '🔍 Analyze for Scams'}
        </button>
        {error && (
          <div className="glass rounded-xl px-4 py-3 border border-red-500/20"
            style={{ boxShadow: 'inset 0 0 24px rgba(239,68,68,0.05)' }}>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="glass rounded-2xl overflow-hidden animate-fade-in-up"
          style={{ boxShadow: '0 0 40px rgba(245,158,11,0.06), 0 0 1px rgba(255,255,255,0.1)' }}>

          {/* Score row */}
          <div className="flex items-center gap-6 px-6 py-6 border-b border-white/[0.05]">
            <RiskMeter score={result.risk_score} />
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Scam Type</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${cat.color}`}>
                  {cat.label}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Verdict</p>
                <p className="text-white/70 text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>

          {/* Red flags */}
          {result.red_flags.length > 0 && (
            <div className="px-6 py-5 border-b border-white/[0.05]">
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">
                🚩 Red Flags Detected ({result.red_flags.length})
              </p>
              <div className="space-y-2">
                {result.red_flags.map((flag, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-xl px-3.5 py-3 border border-red-500/15"
                    style={{ background: 'rgba(239,68,68,0.06)' }}
                  >
                    <span className="text-red-400/80 text-xs mt-0.5 shrink-0">⚠</span>
                    <div>
                      <p className="text-red-300/90 text-xs font-mono font-medium mb-0.5">"{flag.text}"</p>
                      <p className="text-white/40 text-xs leading-relaxed">{flag.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content preview */}
          <div className="px-6 py-5 border-b border-white/[0.05]">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3">Analyzed Content</p>
            <div
              className="rounded-xl px-4 py-3.5 max-h-48 overflow-y-auto border border-white/[0.04]"
              style={{ background: 'rgba(0,0,0,0.3)' }}
            >
              <HighlightedContent content={content} redFlags={result.red_flags} />
            </div>
            {result.red_flags.length > 0 && (
              <p className="text-[11px] text-white/20 mt-2">Hover highlighted phrases to see why they're flagged</p>
            )}
          </div>

          {/* Fight back CTA */}
          {result.risk_score >= 50 && (
            <div className="px-6 py-5" style={{ background: 'rgba(245,158,11,0.04)' }}>
              <p className="text-amber-400/90 text-sm font-semibold mb-3"
                style={{ textShadow: '0 0 20px rgba(245,158,11,0.4)' }}>
                ⚡ This looks like a scam — fight back with Decoy Mode!
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '🎭', title: 'Decoy Identity', desc: 'Feed fake personal info to the scammer' },
                  { icon: '🤖', title: 'Stall Reply', desc: 'Waste their time with a confusing response' },
                ].map((item) => (
                  <div key={item.title} className="glass rounded-xl px-3.5 py-3 border border-amber-400/10">
                    <p className="text-white/80 text-sm font-semibold mb-0.5">{item.icon} {item.title}</p>
                    <p className="text-white/35 text-xs">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
