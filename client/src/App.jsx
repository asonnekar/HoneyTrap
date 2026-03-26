import { useState } from 'react'
import AnalyzeTab from './components/AnalyzeTab'
import DecoyTab from './components/DecoyTab'
import FeedTab from './components/FeedTab'

const TABS = [
  { label: 'Analyze', icon: '🔍' },
  { label: 'Decoy Mode', icon: '🎭' },
  { label: 'Community Feed', icon: '🌐' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState(0)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [scamContent, setScamContent] = useState('')

  return (
    <div className="relative min-h-screen text-[#f4ead7] overflow-x-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="orb orb-amber" />
        <div className="orb orb-violet" />
        <div className="orb orb-rose" />
        <div className="orb orb-cyan" />
      </div>

      <header className="relative z-10 sticky top-0 border-b border-[rgba(255,231,194,0.06)] bg-[rgba(18,15,11,0.78)] backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-4">
          <div className="relative">
            <span className="text-3xl drop-shadow-lg">🍯</span>
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#120f0b]"
              style={{ background: '#7eb489', boxShadow: '0 0 10px rgba(126,180,137,0.7)' }}
            />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gradient leading-none">HoneyTrap</h1>
            <p className="mt-0.5 text-[11px] text-[rgba(244,234,215,0.34)] tracking-[0.25em]">
              SCAM DETECTION & DISRUPTION
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2.5 px-3 py-1.5 rounded-full glass">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#7eb489', boxShadow: '0 0 8px rgba(126,180,137,0.75)' }}
            />
            <span className="text-xs text-[rgba(244,234,215,0.48)] font-medium">Live</span>
          </div>
        </div>
      </header>

      <nav className="relative z-10 border-b border-[rgba(255,231,194,0.05)] bg-[rgba(18,15,11,0.56)] backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-5 flex gap-1">
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`relative px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === i
                  ? 'text-[var(--honey-bright)]'
                  : 'text-[rgba(244,234,215,0.42)] hover:text-[rgba(244,234,215,0.72)]'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
              {activeTab === i && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, rgba(217,154,54,0.2), #efba63, rgba(217,154,54,0.2))',
                    boxShadow: '0 0 10px rgba(217,154,54,0.35)',
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto px-5 py-8">
        {activeTab === 0 && (
          <AnalyzeTab onResult={setAnalysisResult} onContentChange={setScamContent} />
        )}
        {activeTab === 1 && (
          <DecoyTab analysisResult={analysisResult} initialContent={scamContent} />
        )}
        {activeTab === 2 && <FeedTab />}
      </main>

      <footer className="relative z-10 mt-16 border-t border-[rgba(255,231,194,0.05)]">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <p className="text-xs text-[rgba(244,234,215,0.22)]">🍯 HoneyTrap - Buckeye Black Box Hackathon 2026</p>
          <p className="text-xs text-[rgba(244,234,215,0.22)]">Fighting back, one decoy at a time.</p>
        </div>
      </footer>
    </div>
  )
}
