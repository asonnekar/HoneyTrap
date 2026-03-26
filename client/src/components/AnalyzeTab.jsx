import { useState } from 'react'
import RiskMeter from './RiskMeter'

const API_BASE = 'http://localhost:8000/api'

const CONTENT_TYPES = [
  { id: 'email', label: 'Email', icon: '📧', placeholder: 'Paste a suspicious email here - subject, headers, and body...' },
  { id: 'sms', label: 'SMS / Text', icon: '💬', placeholder: 'Paste a suspicious text message here...' },
  { id: 'url', label: 'URL', icon: '🔗', placeholder: 'Paste a suspicious link or URL here...' },
  { id: 'call_script', label: 'Call Script', icon: '📞', placeholder: 'Paste a phone call transcript or describe what the caller said...' },
]

const CATEGORY_META = {
  phishing: { label: 'Phishing', color: 'bg-red-500/12 text-red-200 border-red-400/25' },
  impersonation: { label: 'Impersonation', color: 'bg-orange-500/12 text-orange-200 border-orange-400/25' },
  prize_fraud: { label: 'Prize Fraud', color: 'bg-yellow-500/12 text-yellow-100 border-yellow-400/25' },
  tech_support: { label: 'Tech Support Scam', color: 'bg-sky-500/12 text-sky-200 border-sky-400/25' },
  romance_scam: { label: 'Romance Scam', color: 'bg-pink-500/12 text-pink-200 border-pink-400/25' },
  investment_fraud: { label: 'Investment Fraud', color: 'bg-violet-500/12 text-violet-200 border-violet-400/25' },
  medicare_scam: { label: 'Medicare Scam', color: 'bg-teal-500/12 text-teal-100 border-teal-400/25' },
  irs_scam: { label: 'IRS Scam', color: 'bg-red-600/12 text-red-200 border-red-500/25' },
  package_delivery: { label: 'Fake Delivery', color: 'bg-yellow-600/12 text-yellow-100 border-yellow-500/25' },
  legitimate: { label: 'Legitimate', color: 'bg-emerald-500/12 text-emerald-200 border-emerald-400/25' },
  suspicious: { label: 'Suspicious', color: 'bg-amber-500/12 text-amber-100 border-amber-400/25' },
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
    return <p className="warm-muted text-sm whitespace-pre-wrap font-mono leading-relaxed">{content}</p>
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
  matches.forEach((match, i) => {
    if (match.start > cursor) {
      parts.push(
        <span key={`text-${i}`} className="warm-muted">
          {content.slice(cursor, match.start)}
        </span>,
      )
    }
    parts.push(
      <span
        key={`flag-${i}`}
        className="rounded-sm px-0.5 border-b-2 text-red-200 cursor-help"
        title={`Warning: ${match.reason}`}
        style={{
          background: 'rgba(224,122,99,0.12)',
          borderBottomColor: 'rgba(224,122,99,0.65)',
          boxShadow: 'inset 0 0 8px rgba(224,122,99,0.08)',
        }}
      >
        {match.text}
      </span>,
    )
    cursor = match.end
  })

  if (cursor < content.length) {
    parts.push(
      <span key="tail" className="warm-muted">
        {content.slice(cursor)}
      </span>,
    )
  }

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
      <div className="flex gap-2 flex-wrap">
        {CONTENT_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => setContentType(type.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              contentType === type.id
                ? 'btn-glow'
                : 'btn-ghost'
            }`}
          >
            <span>{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={selectedType.placeholder}
          rows={7}
          className="w-full input-glow rounded-2xl px-4 py-3.5 text-[rgba(244,234,215,0.9)] text-sm placeholder-[rgba(244,234,215,0.24)] resize-none leading-relaxed"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !content.trim()}
          className="btn-glow w-full py-3.5 rounded-2xl text-sm"
        >
          {loading
            ? <span className="flex items-center justify-center gap-2"><Spinner /> Analyzing with local AI...</span>
            : '🔎 Analyze for Scams'}
        </button>
        {error && (
          <div
            className="glass rounded-xl px-4 py-3 border border-red-400/20"
            style={{ boxShadow: 'inset 0 0 24px rgba(224,122,99,0.06)' }}
          >
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
      </div>

      {result && (
        <div
          className="glass rounded-2xl overflow-hidden animate-fade-in-up"
          style={{ boxShadow: '0 18px 44px rgba(0,0,0,0.18), 0 0 28px rgba(217,154,54,0.06)' }}
        >
          <div className="flex items-center gap-6 px-6 py-6 border-b border-[rgba(255,231,194,0.05)]">
            <RiskMeter score={result.risk_score} />
            <div className="space-y-3 flex-1 min-w-0">
              <div>
                <p className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.25em] mb-2">Scam Type</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${cat.color}`}>
                  {cat.label}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.25em] mb-2">Verdict</p>
                <p className="warm-muted text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>

          {result.red_flags.length > 0 && (
            <div className="px-6 py-5 border-b border-[rgba(255,231,194,0.05)]">
              <p className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.25em] mb-3">
                🚩 Red Flags Detected ({result.red_flags.length})
              </p>
              <div className="space-y-2">
                {result.red_flags.map((flag, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-xl px-3.5 py-3 border border-red-400/14"
                    style={{ background: 'rgba(224,122,99,0.07)' }}
                  >
                    <span className="text-red-200/80 text-xs mt-0.5 shrink-0">⚠</span>
                    <div>
                      <p className="text-red-100/90 text-xs font-mono font-medium mb-0.5">"{flag.text}"</p>
                      <p className="text-[rgba(244,234,215,0.48)] text-xs leading-relaxed">{flag.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-6 py-5 border-b border-[rgba(255,231,194,0.05)]">
            <p className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.25em] mb-3">Analyzed Content</p>
            <div
              className="rounded-xl px-4 py-3.5 max-h-48 overflow-y-auto border border-[rgba(255,231,194,0.05)]"
              style={{ background: 'linear-gradient(180deg, rgba(15,12,9,0.7), rgba(10,8,6,0.85))' }}
            >
              <HighlightedContent content={content} redFlags={result.red_flags} />
            </div>
            {result.red_flags.length > 0 && (
              <p className="text-[11px] text-[rgba(244,234,215,0.24)] mt-2">Hover highlighted phrases to see why they were flagged.</p>
            )}
          </div>

          {result.risk_score >= 50 && (
            <div className="px-6 py-5" style={{ background: 'rgba(217,154,54,0.05)' }}>
              <p
                className="text-[var(--honey-bright)] text-sm font-semibold mb-3"
                style={{ textShadow: '0 0 16px rgba(217,154,54,0.25)' }}
              >
                ⚡ This looks like a scam - open Decoy Mode and waste their time.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '🎭', title: 'Decoy Identity', desc: 'Feed fake personal info to the scammer' },
                  { icon: '🤖', title: 'Stall Reply', desc: 'Waste their time with a confusing response' },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="glass rounded-xl px-3.5 py-3 border border-[rgba(244,186,99,0.12)]"
                  >
                    <p className="text-[rgba(244,234,215,0.9)] text-sm font-semibold mb-0.5">{item.icon} {item.title}</p>
                    <p className="text-[rgba(244,234,215,0.44)] text-xs">{item.desc}</p>
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
