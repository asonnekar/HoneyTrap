import { useState } from 'react'
import AnalyzeTab from './components/AnalyzeTab'
import DecoyTab from './components/DecoyTab'
import FeedTab from './components/FeedTab'

const TABS = [
  { label: 'Analyze',        icon: '🔍' },
  { label: 'Decoy Mode',     icon: '🎭' },
  { label: 'Community Feed', icon: '🌐' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState(0)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [scamContent, setScamContent] = useState('')

  return (
    <div className="relative min-h-screen bg-[#030712] text-white overflow-x-hidden">

      {/* ── Ambient background ─────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="orb orb-amber" />
        <div className="orb orb-violet" />
        <div className="orb orb-rose" />
        <div className="orb orb-cyan" />
      </div>

      {/* ── Header ─────────────────────────────────────── */}
      <header className="relative z-10 border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-4">
          <div className="relative">
            <span className="text-3xl drop-shadow-lg">🍯</span>
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#030712]"
              style={{ boxShadow: '0 0 6px rgba(74,222,128,0.8)' }}
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gradient leading-none">HoneyTrap</h1>
            <p className="text-[11px] text-white/30 mt-0.5 tracking-wide">SCAM DETECTION & DISRUPTION</p>
          </div>
          <div className="ml-auto flex items-center gap-2.5 px-3 py-1.5 rounded-full glass">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 5px #4ade80' }} />
            <span className="text-xs text-white/40 font-medium">Live</span>
          </div>
        </div>
      </header>

      {/* ── Tabs ───────────────────────────────────────── */}
      <nav className="relative z-10 border-b border-white/[0.05] bg-[#030712]/60 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-5 flex gap-1">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`relative px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === i
                  ? 'text-amber-400'
                  : 'text-white/35 hover:text-white/60'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
              {activeTab === i && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #f59e0b, #fde68a, #f59e0b)',
                    boxShadow: '0 0 8px rgba(245,158,11,0.8)',
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ────────────────────────────────────── */}
      <main className="relative z-10 max-w-3xl mx-auto px-5 py-8">
        {activeTab === 0 && (
          <AnalyzeTab onResult={setAnalysisResult} onContentChange={setScamContent} />
        )}
        {activeTab === 1 && (
          <DecoyTab analysisResult={analysisResult} initialContent={scamContent} />
        )}
        {activeTab === 2 && <FeedTab />}
      </main>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.05] mt-16">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <p className="text-xs text-white/20">🍯 HoneyTrap — Buckeye Black Box Hackathon 2026</p>
          <p className="text-xs text-white/20">Fighting back, one decoy at a time.</p>
        </div>
      </footer>
    </div>
  )
}
