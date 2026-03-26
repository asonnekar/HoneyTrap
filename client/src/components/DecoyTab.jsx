import { useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

const IDENTITY_FIELDS = [
  { key: 'name', label: 'Full Name', icon: '👤' },
  { key: 'email', label: 'Email Address', icon: '📧' },
  { key: 'phone', label: 'Phone Number', icon: '📞' },
  { key: 'dob', label: 'Date of Birth', icon: '🎂' },
  { key: 'address', label: 'Address', icon: '🏠' },
  { key: 'ssn_fake', label: 'SSN (FAKE)', icon: '🔒' },
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
        small ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-1.5'
      } ${
        copied
          ? 'border border-emerald-400/30 text-emerald-200 bg-emerald-500/10'
          : 'border border-[rgba(255,231,194,0.1)] text-[rgba(244,234,215,0.42)] bg-[rgba(255,244,225,0.03)] hover:bg-[rgba(239,186,99,0.08)] hover:text-[var(--honey-bright)] hover:border-[rgba(239,186,99,0.28)]'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function SectionHeader({ icon, title, desc }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-bold text-[rgba(244,234,215,0.95)] flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      <p className="text-[rgba(244,234,215,0.46)] text-sm mt-1 leading-relaxed">{desc}</p>
    </div>
  )
}

export default function DecoyTab() {
  const [identity, setIdentity] = useState(null)
  const [identityLoading, setIdentityLoading] = useState(false)

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

  return (
    <div className="space-y-10">
      {error && (
        <div
          className="glass rounded-xl px-4 py-3 border border-red-400/20 animate-fade-in-up"
          style={{ boxShadow: 'inset 0 0 24px rgba(224,122,99,0.05)' }}
        >
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      <section>
        <div className="flex items-start justify-between gap-4 mb-5">
          <SectionHeader
            icon="🎭"
            title="Decoy Identity Generator"
            desc="Generate a completely fake but realistic identity to feed back to scammers and keep real victims safe."
          />
          <button
            onClick={generateIdentity}
            disabled={identityLoading}
            className="btn-glow shrink-0 px-5 py-2.5 rounded-xl text-sm flex items-center gap-2"
          >
            {identityLoading ? <><Spinner /> Generating...</> : identity ? '↻ Regenerate' : '⚡ Generate'}
          </button>
        </div>

        {identity ? (
          <div
            className="glass rounded-2xl overflow-hidden animate-fade-in-up"
            style={{ boxShadow: '0 18px 36px rgba(0,0,0,0.18), 0 0 22px rgba(217,154,54,0.05)' }}
          >
            <div
              className="px-5 py-3 border-b border-[rgba(244,186,99,0.14)] flex items-center justify-between"
              style={{ background: 'rgba(217,154,54,0.06)' }}
            >
              <span
                className="text-[var(--honey-bright)] text-[11px] font-bold uppercase tracking-[0.25em]"
                style={{ textShadow: '0 0 10px rgba(217,154,54,0.24)' }}
              >
                Fake Identity - Anti-Scam Use Only
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(
                  IDENTITY_FIELDS.map((field) => `${field.label}: ${identity[field.key]}`).join('\n'),
                )}
                className="text-[11px] text-[rgba(239,186,99,0.7)] hover:text-[var(--honey-bright)] transition-colors font-medium"
              >
                Copy All
              </button>
            </div>

            <div className="divide-y divide-[rgba(255,231,194,0.04)]">
              {IDENTITY_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[rgba(255,244,225,0.02)] group"
                >
                  <span className="text-base w-7 shrink-0">{field.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.2em] mb-0.5">{field.label}</p>
                    <p className="text-[rgba(244,234,215,0.84)] text-sm font-mono truncate">{identity[field.key]}</p>
                  </div>
                  <CopyButton value={identity[field.key]} small />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="glass rounded-2xl px-6 py-12 text-center border border-dashed border-[rgba(255,231,194,0.1)]"
            style={{ background: 'rgba(255,244,225,0.015)' }}
          >
            <p className="text-4xl mb-3 opacity-45">🎭</p>
            <p className="text-[rgba(244,234,215,0.36)] text-sm">Click Generate to create a fake identity.</p>
            <p className="text-[rgba(244,234,215,0.24)] text-xs mt-1">Includes fake name, address, SSN, and credit card.</p>
          </div>
        )}
      </section>
    </div>
  )
}
