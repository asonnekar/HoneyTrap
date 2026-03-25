import { useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

const IDENTITY_FIELDS = [
  { key: 'name',             label: 'Full Name',         icon: '👤' },
  { key: 'email',            label: 'Email Address',     icon: '📧' },
  { key: 'phone',            label: 'Phone Number',      icon: '📞' },
  { key: 'dob',              label: 'Date of Birth',     icon: '🎂' },
  { key: 'address',          label: 'Address',           icon: '🏠' },
  { key: 'ssn_fake',         label: 'SSN (FAKE)',        icon: '🔒' },
  { key: 'credit_card_fake', label: 'Credit Card (FAKE)',icon: '💳' },
]

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
      className="text-xs text-gray-500 hover:text-amber-400 transition-colors ml-2 shrink-0"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
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
      const data = await res.json()
      setStallReply(data.reply)
    } catch (e) {
      setError(e.message || 'Generation failed. Check your API key.')
    } finally {
      setStallLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Section 1: Fake Identity */}
      <section>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">🎭 Decoy Identity Generator</h2>
            <p className="text-gray-500 text-sm mt-1">
              Generate a fake but realistic identity to feed back to scammers — wastes their time and protects real victims.
            </p>
          </div>
          <button
            onClick={generateIdentity}
            disabled={identityLoading}
            className="shrink-0 ml-4 px-5 py-2.5 bg-amber-400 text-gray-950 font-bold rounded-xl hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm shadow-lg shadow-amber-400/10"
          >
            {identityLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            ) : identity ? '🔄 Regenerate' : '⚡ Generate'}
          </button>
        </div>

        {identity ? (
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-amber-400/10 border-b border-amber-400/20 flex items-center justify-between">
              <span className="text-amber-400 text-xs font-bold uppercase tracking-widest">
                ⚠ Fake Identity — For Anti-Scam Use Only
              </span>
              <button
                onClick={() => {
                  const text = IDENTITY_FIELDS.map(f => `${f.label}: ${identity[f.key]}`).join('\n')
                  navigator.clipboard.writeText(text)
                }}
                className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
              >
                Copy All
              </button>
            </div>
            <div className="divide-y divide-gray-800">
              {IDENTITY_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center px-4 py-3 hover:bg-gray-800/30 transition-colors">
                  <span className="w-7 text-base">{field.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 uppercase tracking-wider">{field.label}</p>
                    <p className="text-gray-200 text-sm font-mono mt-0.5">{identity[field.key]}</p>
                  </div>
                  <CopyButton value={identity[field.key]} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-gray-700 rounded-2xl px-6 py-10 text-center">
            <p className="text-4xl mb-3">🎭</p>
            <p className="text-gray-500 text-sm">Click Generate to create a fake identity</p>
            <p className="text-gray-600 text-xs mt-1">Includes fake name, address, SSN, and credit card</p>
          </div>
        )}
      </section>

      <div className="border-t border-gray-800" />

      {/* Section 2: Stall Reply */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">🤖 Scam Staller</h2>
          <p className="text-gray-500 text-sm mt-1">
            Generate a lengthy, confusing reply that wastes the scammer's time — inspired by anti-spam trolling techniques.
          </p>
        </div>

        <div className="space-y-3">
          <textarea
            value={stallContent}
            onChange={(e) => setStallContent(e.target.value)}
            placeholder="Paste the scam message you received here..."
            rows={5}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/60 resize-none transition-colors"
          />

          {!analysisResult && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 uppercase tracking-wider shrink-0">Scam Type:</label>
              <select
                value={stallCategory}
                onChange={(e) => setStallCategory(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 text-sm focus:outline-none focus:border-amber-500/60"
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
          )}
          {analysisResult && (
            <p className="text-xs text-gray-500">
              Using scam type from analysis: <span className="text-amber-400">{analysisResult.category}</span>
            </p>
          )}

          <button
            onClick={generateStall}
            disabled={stallLoading || !stallContent.trim()}
            className="w-full py-3 bg-amber-400 text-gray-950 font-bold rounded-xl hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm shadow-lg shadow-amber-400/10"
          >
            {stallLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Crafting confusion...
              </span>
            ) : '🤖 Generate Stall Reply'}
          </button>
        </div>

        {stallReply && (
          <div className="mt-4 bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between">
              <span className="text-gray-300 text-xs font-semibold uppercase tracking-widest">Generated Stall Reply</span>
              <button
                onClick={() => navigator.clipboard.writeText(stallReply)}
                className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
              >
                Copy
              </button>
            </div>
            <div className="px-4 py-4 max-h-72 overflow-y-auto">
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{stallReply}</p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
