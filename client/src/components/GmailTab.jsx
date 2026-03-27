import { useState, useEffect } from 'react'

const API_BASE = 'http://localhost:8000/api'

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function RiskBadge({ score }) {
  const color =
    score >= 66 ? 'bg-[rgba(224,122,99,0.18)] text-[#e07a63] border-[rgba(224,122,99,0.3)]'
    : score >= 41 ? 'bg-[rgba(239,186,99,0.18)] text-[#efba63] border-[rgba(239,186,99,0.3)]'
    : 'bg-[rgba(126,180,137,0.18)] text-[#7eb489] border-[rgba(126,180,137,0.3)]'
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${color}`}>
      {score}
    </span>
  )
}

function CategoryBadge({ category }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-[rgba(255,231,194,0.12)] bg-[rgba(255,244,225,0.04)] text-[rgba(244,234,215,0.55)] text-xs font-medium capitalize">
      {category.replace(/_/g, ' ')}
    </span>
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

function StallResult({ reply, personaName, personaGender, tips }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-xl border border-[rgba(126,180,137,0.2)] bg-[rgba(126,180,137,0.06)] p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-[#7eb489] uppercase tracking-widest">
            Stall Reply — {personaName} ({personaGender})
          </p>
          <CopyButton value={reply} />
        </div>
        <p className="text-sm text-[rgba(244,234,215,0.75)] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
          {reply}
        </p>
      </div>
      {tips.length > 0 && (
        <div className="rounded-xl border border-[rgba(255,231,194,0.08)] bg-[rgba(255,244,225,0.03)] p-4">
          <p className="text-xs font-semibold text-[rgba(244,234,215,0.45)] uppercase tracking-widest mb-3">
            Delivery Tips
          </p>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-sm text-[rgba(244,234,215,0.65)]">
                <span className="text-[#efba63] shrink-0">{i + 1}.</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function EmailCard({ email }) {
  const [expanded, setExpanded] = useState(false)
  const [stallLoading, setStallLoading] = useState(false)
  const [stallResult, setStallResult] = useState(null)
  const [stallError, setStallError] = useState('')

  const generateStall = async () => {
    setStallLoading(true)
    setStallError('')
    try {
      const res = await fetch(`${API_BASE}/decoy/stall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_scam: email.body,
          scam_category: email.category,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setStallResult(data)
    } catch (err) {
      setStallError('Failed to generate response. Is the backend running?')
    } finally {
      setStallLoading(false)
    }
  }

  const riskColor =
    email.risk_score >= 66 ? '#e07a63'
    : email.risk_score >= 41 ? '#efba63'
    : '#7eb489'

  return (
    <div className="rounded-2xl border border-[rgba(255,231,194,0.08)] bg-[rgba(255,244,225,0.03)] backdrop-blur-sm overflow-hidden transition-all duration-200">
      {/* Header row */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-4 flex items-start gap-4 hover:bg-[rgba(255,244,225,0.02)] transition-colors"
      >
        <div className="shrink-0 mt-0.5">
          <RiskBadge score={email.risk_score} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#f4ead7] truncate">{email.subject}</p>
          <p className="text-xs text-[rgba(244,234,215,0.45)] mt-0.5 truncate">{email.from_addr}</p>
          <p className="text-xs text-[rgba(244,234,215,0.35)] mt-0.5">{email.date}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <CategoryBadge category={email.category} />
          <span className="text-[rgba(244,234,215,0.3)] text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-5 border-t border-[rgba(255,231,194,0.06)] pt-4 space-y-4">
          {/* Summary */}
          {email.summary && (
            <div className="rounded-xl border border-[rgba(255,231,194,0.08)] bg-[rgba(255,244,225,0.03)] p-3">
              <p className="text-xs font-semibold text-[rgba(244,234,215,0.4)] uppercase tracking-widest mb-1.5">Summary</p>
              <p className="text-sm text-[rgba(244,234,215,0.75)]">{email.summary}</p>
            </div>
          )}

          {/* Red Flags */}
          {email.red_flags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[rgba(244,234,215,0.4)] uppercase tracking-widest mb-2">Red Flags</p>
              <div className="space-y-2">
                {email.red_flags.map((flag, i) => (
                  <div key={i} className="rounded-lg border border-[rgba(224,122,99,0.2)] bg-[rgba(224,122,99,0.07)] p-3">
                    <p className="text-xs font-mono text-[#e07a63] mb-1">"{flag.text}"</p>
                    <p className="text-xs text-[rgba(244,234,215,0.55)]">{flag.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email body */}
          <div>
            <p className="text-xs font-semibold text-[rgba(244,234,215,0.4)] uppercase tracking-widest mb-2">Email Body</p>
            <div className="rounded-xl border border-[rgba(255,231,194,0.08)] bg-[rgba(0,0,0,0.2)] p-3 max-h-48 overflow-y-auto">
              <p className="text-xs text-[rgba(244,234,215,0.55)] whitespace-pre-wrap leading-relaxed font-mono">
                {email.body || email.snippet}
              </p>
            </div>
          </div>

          {/* Generate stall response */}
          <div>
            {stallError && (
              <p className="text-xs text-[#e07a63] mb-2">{stallError}</p>
            )}
            {!stallResult ? (
              <button
                onClick={generateStall}
                disabled={stallLoading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'linear-gradient(135deg, rgba(126,180,137,0.25), rgba(126,180,137,0.1))',
                  border: '1px solid rgba(126,180,137,0.35)',
                  color: '#7eb489',
                }}
              >
                {stallLoading ? <><Spinner /> Generating Response...</> : 'Generate Stall Response'}
              </button>
            ) : (
              <StallResult
                reply={stallResult.reply}
                personaName={stallResult.persona_name}
                personaGender={stallResult.persona_gender}
                tips={stallResult.delivery_tips}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function GmailTab() {
  const [connected, setConnected] = useState(false)
  const [statusLoading, setStatusLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [emails, setEmails] = useState([])
  const [scanned, setScanned] = useState(null)
  const [scanLimit, setScanLimit] = useState(20)
  const [threshold, setThreshold] = useState(50)
  const [error, setError] = useState('')
  const [hasScanned, setHasScanned] = useState(false)

  // Check connection status on mount; also detect OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('gmail_connected') === 'true') {
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('gmail_connected')
      window.history.replaceState({}, '', url.toString())
      setConnected(true)
      setStatusLoading(false)
      return
    }
    if (params.get('gmail_error')) {
      setError(`Gmail auth failed: ${params.get('gmail_error')}`)
      const url = new URL(window.location.href)
      url.searchParams.delete('gmail_error')
      window.history.replaceState({}, '', url.toString())
    }

    fetch(`${API_BASE}/gmail/status`)
      .then(r => r.json())
      .then(d => setConnected(d.connected))
      .catch(() => setConnected(false))
      .finally(() => setStatusLoading(false))
  }, [])

  const connectGmail = async () => {
    setAuthLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/gmail/auth`)
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Failed to get auth URL')
      }
      const { auth_url } = await res.json()
      window.location.href = auth_url
    } catch (err) {
      setError(err.message)
      setAuthLoading(false)
    }
  }

  const disconnectGmail = async () => {
    await fetch(`${API_BASE}/gmail/disconnect`, { method: 'POST' })
    setConnected(false)
    setEmails([])
    setHasScanned(false)
    setScanned(null)
  }

  const scanInbox = async () => {
    setScanLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/gmail/scan?limit=${scanLimit}&threshold=${threshold}`)
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.detail || 'Scan failed')
      }
      const data = await res.json()
      setEmails(data.emails)
      setScanned(data.scanned)
      setHasScanned(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setScanLoading(false)
    }
  }

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-[rgba(244,234,215,0.4)]">
        <Spinner />
        <span className="ml-3 text-sm">Checking Gmail connection...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gradient">Gmail Scanner</h2>
        <p className="mt-1 text-sm text-[rgba(244,234,215,0.45)]">
          Scan your inbox for suspicious emails and generate stall responses to waste scammers' time.
        </p>
      </div>

      {/* Connection card */}
      <div className="rounded-2xl border border-[rgba(255,231,194,0.08)] bg-[rgba(255,244,225,0.03)] backdrop-blur-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: connected ? '#7eb489' : 'rgba(244,234,215,0.2)',
                boxShadow: connected ? '0 0 10px rgba(126,180,137,0.6)' : 'none',
              }}
            />
            <div>
              <p className="text-sm font-semibold text-[#f4ead7]">
                {connected ? 'Gmail Connected' : 'Gmail Not Connected'}
              </p>
              <p className="text-xs text-[rgba(244,234,215,0.4)]">
                {connected
                  ? 'Your inbox is ready to scan.'
                  : 'Connect your Gmail account to scan for scam emails.'}
              </p>
            </div>
          </div>
          {connected ? (
            <button
              onClick={disconnectGmail}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-[rgba(224,122,99,0.3)] text-[#e07a63] bg-[rgba(224,122,99,0.08)] hover:bg-[rgba(224,122,99,0.15)] transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={connectGmail}
              disabled={authLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(239,186,99,0.25), rgba(217,154,54,0.15))',
                border: '1px solid rgba(239,186,99,0.35)',
                color: '#efba63',
              }}
            >
              {authLoading ? <><Spinner /> Connecting...</> : 'Connect Gmail'}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-[rgba(224,122,99,0.25)] bg-[rgba(224,122,99,0.08)] px-4 py-3">
            <p className="text-sm text-[#e07a63]">{error}</p>
            {error.includes('GOOGLE_CLIENT_ID') && (
              <p className="text-xs text-[rgba(244,234,215,0.45)] mt-1">
                Create OAuth 2.0 credentials at console.cloud.google.com and add them to server/.env
              </p>
            )}
          </div>
        )}
      </div>

      {/* Scan controls */}
      {connected && (
        <div className="rounded-2xl border border-[rgba(255,231,194,0.08)] bg-[rgba(255,244,225,0.03)] backdrop-blur-sm p-5">
          <p className="text-xs font-semibold text-[rgba(244,234,215,0.4)] uppercase tracking-widest mb-4">Scan Settings</p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-[rgba(244,234,215,0.45)] mb-1.5">Emails to scan</label>
              <select
                value={scanLimit}
                onChange={e => setScanLimit(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 text-sm text-[#f4ead7] bg-[rgba(255,244,225,0.05)] border border-[rgba(255,231,194,0.1)] focus:outline-none focus:border-[rgba(239,186,99,0.4)]"
              >
                <option value={10}>10 emails</option>
                <option value={20}>20 emails</option>
                <option value={30}>30 emails</option>
                <option value={50}>50 emails</option>
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-[rgba(244,234,215,0.45)] mb-1.5">Risk threshold</label>
              <select
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2 text-sm text-[#f4ead7] bg-[rgba(255,244,225,0.05)] border border-[rgba(255,231,194,0.1)] focus:outline-none focus:border-[rgba(239,186,99,0.4)]"
              >
                <option value={40}>40+ (Suspicious)</option>
                <option value={50}>50+ (Moderate risk)</option>
                <option value={66}>66+ (High risk only)</option>
                <option value={80}>80+ (Critical only)</option>
              </select>
            </div>
            <button
              onClick={scanInbox}
              disabled={scanLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(239,186,99,0.3), rgba(217,154,54,0.2))',
                border: '1px solid rgba(239,186,99,0.4)',
                color: '#efba63',
                boxShadow: scanLoading ? 'none' : '0 0 20px rgba(217,154,54,0.15)',
              }}
            >
              {scanLoading ? <><Spinner /> Scanning...</> : 'Scan Inbox'}
            </button>
          </div>
          {scanLoading && (
            <p className="mt-3 text-xs text-[rgba(244,234,215,0.4)]">
              Analyzing emails with AI... this may take a minute depending on how many emails are scanned.
            </p>
          )}
        </div>
      )}

      {/* Results */}
      {hasScanned && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-[rgba(244,234,215,0.6)]">
              {emails.length > 0
                ? `${emails.length} suspicious email${emails.length !== 1 ? 's' : ''} found (${scanned} scanned)`
                : `No suspicious emails found in ${scanned} scanned`}
            </p>
            {emails.length > 0 && (
              <span className="text-xs text-[rgba(244,234,215,0.3)]">Sorted by risk score</span>
            )}
          </div>

          {emails.length === 0 ? (
            <div className="rounded-2xl border border-[rgba(126,180,137,0.2)] bg-[rgba(126,180,137,0.06)] p-8 text-center">
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm font-semibold text-[#7eb489]">Your inbox looks clean!</p>
              <p className="text-xs text-[rgba(244,234,215,0.4)] mt-1">
                No emails exceeded the risk threshold of {threshold}.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {emails.map(email => (
                <EmailCard key={email.id} email={email} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Setup instructions when not connected */}
      {!connected && (
        <div className="rounded-2xl border border-[rgba(255,231,194,0.06)] bg-[rgba(255,244,225,0.02)] p-5">
          <p className="text-xs font-semibold text-[rgba(244,234,215,0.4)] uppercase tracking-widest mb-3">Setup Instructions</p>
          <ol className="space-y-2.5">
            {[
              'Go to console.cloud.google.com and create a new project',
              'Enable the Gmail API for your project',
              'Create OAuth 2.0 credentials (Desktop or Web Application)',
              'Set the redirect URI to: http://localhost:8000/api/gmail/callback',
              'Copy your Client ID and Client Secret to server/.env',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-[rgba(244,234,215,0.55)]">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(239,186,99,0.15)', color: '#efba63', border: '1px solid rgba(239,186,99,0.25)' }}
                >
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-xl border border-[rgba(255,231,194,0.08)] bg-[rgba(0,0,0,0.2)] p-3">
            <p className="text-xs font-mono text-[rgba(244,234,215,0.45)]">
              # server/.env<br />
              GOOGLE_CLIENT_ID=your_client_id_here<br />
              GOOGLE_CLIENT_SECRET=your_client_secret_here
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
