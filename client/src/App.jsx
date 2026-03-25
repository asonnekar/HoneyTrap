import { useState } from 'react'
import AnalyzeTab from './components/AnalyzeTab'
import DecoyTab from './components/DecoyTab'
import FeedTab from './components/FeedTab'

const TABS = [
  { label: '🔍 Analyze', short: 'Analyze' },
  { label: '🎭 Decoy Mode', short: 'Decoy Mode' },
  { label: '🌐 Community Feed', short: 'Feed' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState(0)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [scamContent, setScamContent] = useState('')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800/80 bg-gray-950/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <span className="text-3xl">🍯</span>
          <div>
            <h1 className="text-xl font-black tracking-tight text-amber-400">HoneyTrap</h1>
            <p className="text-xs text-gray-600 -mt-0.5">Scam Detection & Disruption</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-gray-800/80 bg-gray-950/80">
        <div className="max-w-3xl mx-auto px-5 flex">
          {TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-5 py-3.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === i
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-5 py-8">
        {activeTab === 0 && (
          <AnalyzeTab
            onResult={setAnalysisResult}
            onContentChange={setScamContent}
          />
        )}
        {activeTab === 1 && (
          <DecoyTab
            analysisResult={analysisResult}
            initialContent={scamContent}
          />
        )}
        {activeTab === 2 && <FeedTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/60 mt-16">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <p className="text-xs text-gray-700">🍯 HoneyTrap — Buckeye Black Box Hackathon 2026</p>
          <p className="text-xs text-gray-700">Fighting back against scammers, one decoy at a time.</p>
        </div>
      </footer>
    </div>
  )
}
