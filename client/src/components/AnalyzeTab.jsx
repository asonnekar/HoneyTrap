import { useState } from 'react'
import RiskMeter from './RiskMeter'

const API_BASE = 'http://localhost:8000/api'

const CONTENT_TYPES = [
  { id: 'email', label: 'Email', icon: '📧', placeholder: 'Paste a suspicious email here - subject, headers, and body...' },
  { id: 'sms', label: 'SMS / Text', icon: '💬', placeholder: 'Paste a suspicious text message here...' },
  { id: 'url', label: 'URL', icon: '🔗', placeholder: 'Paste a suspicious link or URL here...' },
  { id: 'call_script', label: 'Call Script', icon: '📞', placeholder: 'Paste a phone call transcript or describe what the caller said...' },
]

const IDENTITY_FIELDS = [
  { key: 'name', label: 'Full Name', icon: '👤' },
  { key: 'email', label: 'Email Address', icon: '📧' },
  { key: 'phone', label: 'Phone Number', icon: '📞' },
  { key: 'dob', label: 'Date of Birth', icon: '🎂' },
  { key: 'address', label: 'Address', icon: '🏠' },
  { key: 'ssn_fake', label: 'SSN (FAKE)', icon: '🔒' },
  { key: 'credit_card_fake', label: 'Credit Card (FAKE)', icon: '💳' },
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

const EMPTY_SUPPORT = {
  identity: null,
  identityLoading: false,
  identityError: '',
  stallReply: '',
  stallTips: [],
  stallPersonaName: '',
  stallPersonaGender: '',
  stallLoading: false,
  stallError: '',
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function CopyButton({ value, label = 'Copy', small = false }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`shrink-0 rounded-lg transition-all duration-200 font-medium ${
        small ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-1.5'
      } ${
        copied
          ? 'border border-emerald-400/30 text-emerald-200 bg-emerald-500/10'
          : 'border border-[rgba(255,231,194,0.1)] text-[rgba(244,234,215,0.42)] bg-[rgba(255,244,225,0.03)] hover:bg-[rgba(239,186,99,0.08)] hover:text-[var(--honey-bright)] hover:border-[rgba(239,186,99,0.28)]'
      }`}
    >
      {copied ? '✓ Copied' : label}
    </button>
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
  const [contentType, setContentType] = useState('email')
  const [contentByType, setContentByType] = useState({
    email: '',
    sms: '',
    url: '',
    call_script: '',
  })
  const [resultByType, setResultByType] = useState({
    email: null,
    sms: null,
    url: null,
    call_script: null,
  })
  const [supportByType, setSupportByType] = useState({
    email: { ...EMPTY_SUPPORT },
    sms: { ...EMPTY_SUPPORT },
    url: { ...EMPTY_SUPPORT },
    call_script: { ...EMPTY_SUPPORT },
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedType = CONTENT_TYPES.find((t) => t.id === contentType)
  const content = contentByType[contentType] || ''
  const result = resultByType[contentType]
  const support = supportByType[contentType]

  const updateSupport = (type, patch) => {
    setSupportByType((current) => ({
      ...current,
      [type]: {
        ...current[type],
        ...patch,
      },
    }))
  }

  const resetSupport = (type) => {
    setSupportByType((current) => ({
      ...current,
      [type]: { ...EMPTY_SUPPORT },
    }))
  }

  const handleAnalyze = async () => {
    if (!content.trim()) return

    setLoading(true)
    setError('')
    setResultByType((current) => ({ ...current, [contentType]: null }))
    resetSupport(contentType)

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
      setResultByType((current) => ({ ...current, [contentType]: data }))
      onResult?.(data)
      onContentChange?.(content)
    } catch (e) {
      setError(e.message || 'Analysis failed. Make sure Ollama and the server are running.')
    } finally {
      setLoading(false)
    }
  }

  const generateIdentityInline = async () => {
    updateSupport(contentType, {
      identityLoading: true,
      identityError: '',
    })

    try {
      const res = await fetch(`${API_BASE}/decoy/identity`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate identity')
      const data = await res.json()
      updateSupport(contentType, {
        identity: data,
        identityLoading: false,
      })
    } catch (e) {
      updateSupport(contentType, {
        identityLoading: false,
        identityError: e.message || 'Failed to generate identity.',
      })
    }
  }

  const generateStallInline = async () => {
    if (!content.trim()) return

    updateSupport(contentType, {
      stallLoading: true,
      stallError: '',
      stallReply: '',
      stallTips: [],
      stallPersonaName: '',
      stallPersonaGender: '',
    })

    try {
      const res = await fetch(`${API_BASE}/decoy/stall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_scam: content,
          scam_category: result?.category || 'phishing',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Generation failed')
      }

      const data = await res.json()
      updateSupport(contentType, {
        stallLoading: false,
        stallReply: data.reply,
        stallTips: data.delivery_tips || [],
        stallPersonaName: data.persona_name || '',
        stallPersonaGender: data.persona_gender || '',
      })
    } catch (e) {
      updateSupport(contentType, {
        stallLoading: false,
        stallError: e.message || 'Generation failed. Check that Ollama is running.',
      })
    }
  }

  const cat = result ? (CATEGORY_META[result.category] || CATEGORY_META.suspicious) : null

  return (
    <div className="space-y-5 min-h-[calc(100vh-320px)]">
      <div className="flex gap-2 flex-wrap">
        {CONTENT_TYPES.map((type) => (
          <button
            key={type.id}
            onClick={() => {
              setContentType(type.id)
              setError('')
              onContentChange?.(contentByType[type.id] || '')
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              contentType === type.id ? 'btn-glow' : 'btn-ghost'
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
          onChange={(e) => {
            const nextValue = e.target.value
            setContentByType((current) => ({
              ...current,
              [contentType]: nextValue,
            }))
          }}
          placeholder={selectedType.placeholder}
          rows={10}
          className="w-full min-h-[22rem] input-glow rounded-2xl px-5 py-4 text-[rgba(244,234,215,0.9)] text-sm placeholder-[rgba(244,234,215,0.24)] resize-none leading-relaxed"
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
            <>
              <div className="px-6 py-5 border-b border-[rgba(255,231,194,0.05)]" style={{ background: 'rgba(217,154,54,0.05)' }}>
                <p
                  className="text-[var(--honey-bright)] text-sm font-semibold mb-3"
                  style={{ textShadow: '0 0 16px rgba(217,154,54,0.25)' }}
                >
                  ⚡ This looks like a scam. Launch protection tools right here without leaving Analyze.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={generateIdentityInline}
                    disabled={support.identityLoading}
                    className="glass rounded-xl px-3.5 py-3 border border-[rgba(244,186,99,0.12)] text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(244,186,99,0.22)] hover:bg-[rgba(255,244,225,0.03)]"
                  >
                    <p className="text-[rgba(244,234,215,0.9)] text-sm font-semibold mb-0.5">
                      {support.identityLoading ? '🎭 Generating Identity...' : '🎭 Decoy Identity'}
                    </p>
                    <p className="text-[rgba(244,234,215,0.44)] text-xs">Create fake personal details for this suspicious message.</p>
                  </button>
                  <button
                    type="button"
                    onClick={generateStallInline}
                    disabled={support.stallLoading}
                    className="glass rounded-xl px-3.5 py-3 border border-[rgba(244,186,99,0.12)] text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(244,186,99,0.22)] hover:bg-[rgba(255,244,225,0.03)]"
                  >
                    <p className="text-[rgba(244,234,215,0.9)] text-sm font-semibold mb-0.5">
                      {support.stallLoading ? '🤖 Generating Stall Reply...' : '🤖 Stall Reply'}
                    </p>
                    <p className="text-[rgba(244,234,215,0.44)] text-xs">Auto-generate a time-wasting reply for this exact prompt.</p>
                  </button>
                </div>
              </div>

              {(support.identityError || support.identity) && (
                <div className="px-6 py-5 border-b border-[rgba(255,231,194,0.05)]">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[rgba(244,234,215,0.92)] text-sm font-semibold">Inline Decoy Identity</p>
                      <p className="text-[rgba(244,234,215,0.42)] text-xs mt-1">Use this fake profile with the current analyzed prompt.</p>
                    </div>
                    {support.identity && (
                      <CopyButton
                        value={IDENTITY_FIELDS.map((field) => `${field.label}: ${support.identity[field.key]}`).join('\n')}
                        label="Copy All"
                      />
                    )}
                  </div>

                  {support.identityError && (
                    <div className="glass rounded-xl px-4 py-3 border border-red-400/20 mb-4">
                      <p className="text-red-200 text-sm">{support.identityError}</p>
                    </div>
                  )}

                  {support.identity && (
                    <div className="glass rounded-2xl overflow-hidden">
                      <div className="divide-y divide-[rgba(255,231,194,0.04)]">
                        {IDENTITY_FIELDS.map((field) => (
                          <div key={field.key} className="flex items-center gap-3 px-5 py-3.5">
                            <span className="text-base w-7 shrink-0">{field.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.2em] mb-0.5">{field.label}</p>
                              <p className="text-[rgba(244,234,215,0.84)] text-sm font-mono truncate">{support.identity[field.key]}</p>
                            </div>
                            <CopyButton value={support.identity[field.key]} small />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(support.stallError || support.stallReply) && (
                <div className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[rgba(244,234,215,0.92)] text-sm font-semibold">Inline Scam Staller</p>
                      <p className="text-[rgba(244,234,215,0.42)] text-xs mt-1">Generated automatically from the current risky prompt.</p>
                    </div>
                    {support.stallReply && <CopyButton value={support.stallReply} />}
                  </div>

                  {support.stallError && (
                    <div className="glass rounded-xl px-4 py-3 border border-red-400/20 mb-4">
                      <p className="text-red-200 text-sm">{support.stallError}</p>
                    </div>
                  )}

                  {support.stallTips.length > 0 && (
                    <div
                      className="glass rounded-2xl px-5 py-4 border border-[rgba(239,186,99,0.12)] mb-4"
                      style={{ background: 'rgba(239,186,99,0.04)' }}
                    >
                      <p className="text-[rgba(244,234,215,0.8)] text-xs font-bold uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2">
                        <span>📞</span> Delivery Tips - Playing {support.stallPersonaName} ({support.stallPersonaGender})
                      </p>
                      <ul className="text-[rgba(244,234,215,0.55)] text-sm space-y-1.5 leading-relaxed list-none">
                        {support.stallTips.map((tip, i) => (
                          <li key={i}><span className="text-[var(--honey-bright)] mr-1.5">•</span>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {support.stallReply && (
                    <div className="glass rounded-2xl overflow-hidden">
                      <div
                        className="px-5 py-3 border-b border-[rgba(255,231,194,0.05)] flex items-center justify-between"
                        style={{ background: 'rgba(126,180,137,0.05)' }}
                      >
                        <span className="text-[rgba(244,234,215,0.56)] text-[11px] font-bold uppercase tracking-[0.25em]">
                          Generated Stall Reply
                        </span>
                        <span className="text-[rgba(244,234,215,0.32)] text-xs">Ready to use</span>
                      </div>
                      <div className="px-5 py-4 max-h-72 overflow-y-auto">
                        <p className="text-[rgba(244,234,215,0.68)] text-sm whitespace-pre-wrap leading-relaxed">{support.stallReply}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
