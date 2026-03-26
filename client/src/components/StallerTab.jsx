import { useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={copy}
      className={`shrink-0 rounded-lg transition-all duration-200 font-medium text-xs px-3 py-1.5 ${
        copied
          ? 'border border-emerald-400/30 text-emerald-200 bg-emerald-500/10'
          : 'border border-[rgba(255,231,194,0.1)] text-[rgba(244,234,215,0.42)] bg-[rgba(255,244,225,0.03)] hover:bg-[rgba(239,186,99,0.08)] hover:text-[var(--honey-bright)] hover:border-[rgba(239,186,99,0.28)]'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

export default function StallerTab({ analysisResult }) {
  const [stallContent, setStallContent] = useState('')
  const [stallCategory, setStallCategory] = useState('phishing')
  const [stallReply, setStallReply] = useState('')
  const [stallPersonaName, setStallPersonaName] = useState('')
  const [stallPersonaGender, setStallPersonaGender] = useState('')
  const [stallTips, setStallTips] = useState([])
  const [stallLoading, setStallLoading] = useState(false)

  const [error, setError] = useState('')

  const generateStall = async () => {
    if (!stallContent.trim()) return
    setStallLoading(true)
    setError('')
    setStallReply('')
    setStallTips([])
    setStallPersonaName('')
    setStallPersonaGender('')
    try {
      const res = await fetch(`${API_BASE}/decoy/stall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_scam: stallContent,
          scam_category: analysisResult?.category || stallCategory,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Generation failed')
      }
      const data = await res.json()
      setStallReply(data.reply)
      setStallPersonaName(data.persona_name)
      setStallPersonaGender(data.persona_gender)
      setStallTips(data.delivery_tips || [])
    } catch (e) {
      setError(e.message || 'Generation failed. Check that Ollama is running.')
    } finally {
      setStallLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="glass rounded-xl px-4 py-3 border border-red-400/20 animate-fade-in-up"
          style={{ boxShadow: 'inset 0 0 24px rgba(224,122,99,0.05)' }}
        >
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      <div className="mb-5">
        <h2 className="text-base font-bold text-[rgba(244,234,215,0.95)] flex items-center gap-2">
          <span>🤖</span> Scam Staller
        </h2>
        <p className="text-[rgba(244,234,215,0.46)] text-sm mt-1 leading-relaxed">
          Generate a long, confused reply that burns the scammer's time without exposing anything real.
        </p>
      </div>

      <div className="space-y-3">
        <textarea
          value={stallContent}
          onChange={(e) => setStallContent(e.target.value)}
          placeholder="Paste the scam message you received here..."
          rows={5}
          className="w-full input-glow rounded-2xl px-4 py-3.5 text-[rgba(244,234,215,0.9)] text-sm placeholder-[rgba(244,234,215,0.24)] resize-none leading-relaxed"
        />

        {!analysisResult ? (
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.25em] shrink-0">Scam Type</label>
            <select
              value={stallCategory}
              onChange={(e) => setStallCategory(e.target.value)}
              className="input-glow rounded-xl px-3 py-2 text-[rgba(244,234,215,0.76)] text-sm bg-transparent"
            >
              <option value="phishing">Phishing</option>
              <option value="irs_scam">IRS Scam</option>
              <option value="prize_fraud">Prize Fraud</option>
              <option value="tech_support">Tech Support</option>
              <option value="impersonation">Impersonation</option>
              <option value="medicare_scam">Medicare Scam</option>
              <option value="romance_scam">Romance Scam</option>
            </select>
          </div>
        ) : (
          <p className="text-xs text-[rgba(244,234,215,0.34)]">
            Using scam type from analysis: <span className="text-[var(--honey-bright)]">{analysisResult.category}</span>
          </p>
        )}

        <button
          onClick={generateStall}
          disabled={stallLoading || !stallContent.trim()}
          className="btn-glow w-full py-3.5 rounded-2xl text-sm"
        >
          {stallLoading
            ? <span className="flex items-center justify-center gap-2"><Spinner /> Crafting confusion...</span>
            : '🤖 Generate Stall Reply'}
        </button>
      </div>

      {stallReply && stallTips.length > 0 && (
        <div
          className="glass rounded-2xl px-5 py-4 border border-[rgba(239,186,99,0.12)] animate-fade-in-up"
          style={{ background: 'rgba(239,186,99,0.04)' }}
        >
          <p className="text-[rgba(244,234,215,0.8)] text-xs font-bold uppercase tracking-[0.2em] mb-2.5 flex items-center gap-2">
            <span>📞</span> Phone Delivery Tips — Playing {stallPersonaName} ({stallPersonaGender})
          </p>
          <ul className="text-[rgba(244,234,215,0.55)] text-sm space-y-1.5 leading-relaxed list-none">
            {stallTips.map((tip, i) => (
              <li key={i}><span className="text-[var(--honey-bright)] mr-1.5">•</span>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {stallReply && (
        <div
          className="glass rounded-2xl overflow-hidden animate-fade-in-up"
          style={{ boxShadow: '0 18px 36px rgba(0,0,0,0.18), 0 0 18px rgba(126,180,137,0.05)' }}
        >
          <div
            className="px-5 py-3 border-b border-[rgba(255,231,194,0.05)] flex items-center justify-between"
            style={{ background: 'rgba(126,180,137,0.05)' }}
          >
            <span className="text-[rgba(244,234,215,0.56)] text-[11px] font-bold uppercase tracking-[0.25em]">
              Generated Stall Reply
            </span>
            <CopyButton value={stallReply} />
          </div>
          <div className="px-5 py-4 max-h-72 overflow-y-auto">
            <p className="text-[rgba(244,234,215,0.68)] text-sm whitespace-pre-wrap leading-relaxed">{stallReply}</p>
          </div>
        </div>
      )}
    </div>
  )
}
