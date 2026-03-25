import { useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

const IDENTITY_FIELDS = [
  { key: 'name',             label: 'Full Name',          icon: '👤' },
  { key: 'email',            label: 'Email Address',      icon: '📧' },
  { key: 'phone',            label: 'Phone Number',       icon: '📞' },
  { key: 'dob',              label: 'Date of Birth',      icon: '🎂' },
  { key: 'address',          label: 'Address',            icon: '🏠' },
  { key: 'ssn_fake',         label: 'SSN (FAKE)',         icon: '🔒' },
  { key: 'credit_card_fake', label: 'Credit Card (FAKE)', icon: '💳' },
]

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function CopyButton({ value, small }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className={`shrink-0 rounded-lg transition-all duration-200 font-medium ${
        small
          ? 'text-[11px] px-2 py-1'
          : 'text-xs px-3 py-1.5'
      } ${
        copied
          ? 'bg-green-500/15 text-green-400 border border-green-500/30'
          : 'bg-white/5 text-white/35 border border-white/10 hover:bg-amber-400/10 hover:text-amber-400 hover:border-amber-400/30'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function SectionHeader({ icon, title, desc }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-white flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      <p className="text-white/35 text-sm mt-1 leading-relaxed">{desc}</p>
    </div>
  )
}

export default function DecoyTab({ analysisResult }) {
  const [identity, setIdentity] = useState(null)
  const [identityLoading, setIdentityLoading] = useState(false)

  const [stallContent, setStallContent] = useState('')
  const [stallCategory, setStallCategory] = useState('phishing')
  const [stallReply, setStallReply] = useState('')
  const [stallLoading, setStallLoading] = useState(false)

  const [error, setError] = useState('')

  const generateIdentity = async () => {
    setIdentityLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/decoy/identity`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to generate identity')
      setIdentity(await res.json())
    } catch (e) {
      setError(e.message)
    } finally {
      setIdentityLoading(false)
    }
  }

  const generateStall = async () => {
    if (!stallContent.trim()) return
    setStallLoading(true)
    setError('')
    setStallReply('')
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
      setStallReply((await res.json()).reply)
    } catch (e) {
      setError(e.message || 'Generation failed. Check Ollama is running.')
    } finally {
      setStallLoading(false)
    }
  }

  return (
    <div className="space-y-10">
      {error && (
        <div className="glass rounded-xl px-4 py-3 border border-red-500/20 animate-fade-in-up"
          style={{ boxShadow: 'inset 0 0 24px rgba(239,68,68,0.05)' }}>
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* ── Section 1: Identity ─────────────────────── */}
      <section>
        <div className="flex items-start justify-between gap-4 mb-5">
          <SectionHeader
            icon="🎭"
            title="Decoy Identity Generator"
            desc="Generate a completely fake but realistic identity to feed back to scammers — wastes their time and keeps real victims safe."
          />
          <button
            onClick={generateIdentity}
            disabled={identityLoading}
            className="btn-glow shrink-0 px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
          >
            {identityLoading ? <><Spinner /> Generating...</> : identity ? '🔄 Regenerate' : '⚡ Generate'}
          </button>
        </div>

        {identity ? (
          <div
            className="glass rounded-2xl overflow-hidden animate-fade-in-up"
            style={{ boxShadow: '0 0 32px rgba(245,158,11,0.06)' }}
          >
            {/* Card header */}
            <div
              className="px-5 py-3 border-b border-amber-400/15 flex items-center justify-between"
              style={{ background: 'rgba(245,158,11,0.06)' }}
            >
              <span className="text-amber-400/80 text-[11px] font-bold uppercase tracking-widest"
                style={{ textShadow: '0 0 12px rgba(245,158,11,0.5)' }}>
                ⚠ Fake Identity — Anti-Scam Use Only
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(
                  IDENTITY_FIELDS.map(f => `${f.label}: ${identity[f.key]}`).join('\n')
                )}
                className="text-[11px] text-amber-400/60 hover:text-amber-400 transition-colors font-medium"
              >
                Copy All
              </button>
            </div>

            {/* Fields */}
            <div className="divide-y divide-white/[0.04]">
              {IDENTITY_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.02] group"
                >
                  <span className="text-base w-7 shrink-0">{field.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">{field.label}</p>
                    <p className="text-white/80 text-sm font-mono truncate">{identity[field.key]}</p>
                  </div>
                  <CopyButton value={identity[field.key]} small />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="glass rounded-2xl px-6 py-12 text-center border border-dashed border-white/10"
            style={{ background: 'rgba(255,255,255,0.01)' }}
          >
            <p className="text-4xl mb-3 opacity-40">🎭</p>
            <p className="text-white/30 text-sm">Click Generate to create a fake identity</p>
            <p className="text-white/20 text-xs mt-1">Includes fake name, address, SSN, and credit card</p>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.05]" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 text-white/20 text-xs" style={{ background: '#030712' }}>OR</span>
        </div>
      </div>

      {/* ── Section 2: Stall Reply ──────────────────── */}
      <section>
        <SectionHeader
          icon="🤖"
          title="Scam Staller"
          desc="Generate a lengthy, confused reply that wastes the scammer's time — inspired by anti-spam trolling techniques."
        />

        <div className="space-y-3">
          <textarea
            value={stallContent}
            onChange={(e) => setStallContent(e.target.value)}
            placeholder="Paste the scam message you received here..."
            rows={5}
            className="w-full input-glow rounded-2xl px-4 py-3.5 text-white/80 text-sm placeholder-white/20 resize-none leading-relaxed"
          />

          {!analysisResult ? (
            <div className="flex items-center gap-3">
              <label className="text-[10px] text-white/30 uppercase tracking-widest shrink-0">Scam Type</label>
              <select
                value={stallCategory}
                onChange={(e) => setStallCategory(e.target.value)}
                className="input-glow rounded-xl px-3 py-2 text-white/70 text-sm bg-transparent"
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
            <p className="text-xs text-white/30">
              Using scam type from analysis:{' '}
              <span className="text-amber-400/80">{analysisResult.category}</span>
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

        {stallReply && (
          <div
            className="mt-4 glass rounded-2xl overflow-hidden animate-fade-in-up"
            style={{ boxShadow: '0 0 32px rgba(139,92,246,0.06)' }}
          >
            <div className="px-5 py-3 border-b border-white/[0.05] flex items-center justify-between"
              style={{ background: 'rgba(139,92,246,0.05)' }}>
              <span className="text-white/50 text-[11px] font-bold uppercase tracking-widest">Generated Stall Reply</span>
              <CopyButton value={stallReply} />
            </div>
            <div className="px-5 py-4 max-h-72 overflow-y-auto">
              <p className="text-white/65 text-sm whitespace-pre-wrap leading-relaxed">{stallReply}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
