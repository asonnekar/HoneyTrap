import { useState } from 'react'
import RiskMeter from './RiskMeter'

const API_BASE = 'http://localhost:8000/api'

const CONTENT_TYPES = [
  { id: 'email', label: '📧 Email', placeholder: 'Paste a suspicious email here — subject, headers, body...' },
  { id: 'sms', label: '💬 SMS / Text', placeholder: 'Paste a suspicious text message here...' },
  { id: 'url', label: '🔗 URL', placeholder: 'Paste a suspicious link or URL here...' },
  { id: 'call_script', label: '📞 Call Script', placeholder: 'Paste a phone call transcript or describe what the caller said...' },
]

const CATEGORY_META = {
  phishing:          { label: 'Phishing',           color: 'bg-red-500' },
  impersonation:     { label: 'Impersonation',       color: 'bg-orange-500' },
  prize_fraud:       { label: 'Prize Fraud',         color: 'bg-yellow-500' },
  tech_support:      { label: 'Tech Support Scam',   color: 'bg-blue-500' },
  romance_scam:      { label: 'Romance Scam',        color: 'bg-pink-500' },
  investment_fraud:  { label: 'Investment Fraud',    color: 'bg-purple-500' },
  medicare_scam:     { label: 'Medicare Scam',       color: 'bg-teal-500' },
  irs_scam:          { label: 'IRS Scam',            color: 'bg-red-600' },
  package_delivery:  { label: 'Fake Delivery',       color: 'bg-yellow-600' },
  legitimate:        { label: 'Legitimate',          color: 'bg-green-600' },
  suspicious:        { label: 'Suspicious',          color: 'bg-amber-500' },
}

function HighlightedContent({ content, redFlags }) {
  if (!redFlags || redFlags.length === 0) {
    return <p className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">{content}</p>
  }

  // Find positions of each red flag phrase
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

  // Build JSX segments
  const parts = []
  let cursor = 0
  matches.forEach((m, i) => {
    if (m.start > cursor) {
      parts.push(<span key={`t${i}`}>{content.slice(cursor, m.start)}</span>)
    }
    parts.push(
      <span
        key={`h${i}`}
        className="bg-red-500/25 border-b-2 border-red-400 text-red-200 cursor-help"
        title={`⚠ ${m.reason}`}
      >
        {m.text}
      </span>
    )
    cursor = m.end
  })
  if (cursor < content.length) {
    parts.push(<span key="tail">{content.slice(cursor)}</span>)
  }

  return (
    <p className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">{parts}</p>
  )
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
      setError(e.message || 'Analysis failed. Make sure the server is running and OPENAI_API_KEY is set.')
    } finally {
      setLoading(false)
    }
  }

  const cat = result ? (CATEGORY_META[result.category] || CATEGORY_META.suspicious) : null

  return (
    <div className="space-y-5">
      {/* Type pills */}
      <div className="flex gap-2 flex-wrap">
        {CONTENT_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => setContentType(t.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              contentType === t.id
                ? 'bg-amber-400 text-gray-950 shadow-lg shadow-amber-400/20'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={selectedType.placeholder}
          rows={7}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/60 resize-none transition-colors"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !content.trim()}
          className="w-full py-3 bg-amber-400 text-gray-950 font-bold rounded-xl hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm shadow-lg shadow-amber-400/10"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </span>
          ) : '🔍 Analyze for Scams'}
        </button>
        {error && (
          <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Results panel */}
      {result && (
        <div className="border border-gray-800 rounded-2xl overflow-hidden bg-gray-900/40">
          {/* Score header */}
          <div className="flex items-center gap-6 px-6 py-5 border-b border-gray-800">
            <RiskMeter score={result.risk_score} />
            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Scam Type</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${cat.color}`}>
                  {cat.label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Verdict</p>
                <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
              </div>
            </div>
          </div>

          {/* Red flags */}
          {result.red_flags.length > 0 && (
            <div className="px-6 py-4 border-b border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                🚩 Red Flags Detected ({result.red_flags.length})
              </p>
              <div className="space-y-2">
                {result.red_flags.map((flag, i) => (
                  <div
                    key={i}
                    className="flex gap-3 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2.5"
                  >
                    <span className="text-red-400 text-xs mt-0.5 shrink-0">⚠</span>
                    <div>
                      <p className="text-red-300 text-xs font-mono font-medium mb-0.5">"{flag.text}"</p>
                      <p className="text-gray-400 text-xs">{flag.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlighted content */}
          <div className="px-6 py-4 border-b border-gray-800">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Analyzed Content</p>
            <div className="bg-gray-950/60 rounded-lg px-4 py-3 border border-gray-800/60 max-h-48 overflow-y-auto">
              <HighlightedContent content={content} redFlags={result.red_flags} />
            </div>
            {result.red_flags.length > 0 && (
              <p className="text-xs text-gray-600 mt-2">Hover over highlighted text to see why it's flagged</p>
            )}
          </div>

          {/* Fight back CTA */}
          {result.risk_score >= 50 && (
            <div className="px-6 py-4 bg-amber-950/20">
              <p className="text-amber-400 text-sm font-semibold mb-3">
                ⚡ This looks like a scam — fight back with the Decoy Mode tab!
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-400">
                  🎭 <span className="font-medium text-gray-300">Decoy Identity</span> — feed fake info to the scammer
                </div>
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-400">
                  🤖 <span className="font-medium text-gray-300">Stall Reply</span> — waste their time with a fake response
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
