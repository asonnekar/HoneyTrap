import { useState, useRef, useEffect, useCallback } from 'react'

const API_BASE = 'http://localhost:8000/api'

const SCAM_CATEGORIES = [
  { value: 'phishing', label: 'Phishing' },
  { value: 'irs_scam', label: 'IRS Scam' },
  { value: 'prize_fraud', label: 'Prize Fraud' },
  { value: 'tech_support', label: 'Tech Support' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'medicare_scam', label: 'Medicare Scam' },
  { value: 'romance_scam', label: 'Romance Scam' },
]

const VOICE_OPTIONS = [
  { value: 'browser', label: 'Browser Voice (Free)' },
  { value: 'elevenlabs', label: 'ElevenLabs (Realistic)' },
]

const ELEVENLABS_VOICES = [
  { value: 'vFLqXa8bgbofGarf6fZh', label: 'Dorothy — Supportive Grandma', gender: 'grandma' },
  { value: 'JBFqnCBsd6RMkjVDRZzb', label: 'George — Elderly Male', gender: 'grandpa' },
]

function PulseRing({ active }) {
  if (!active) return null
  return (
    <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-red-400" />
  )
}

export default function LiveCallTab() {
  const [status, setStatus] = useState('idle') // idle | listening | thinking | speaking
  const [category, setCategory] = useState('phishing')
  const [voiceEngine, setVoiceEngine] = useState('browser')
  const [elevenlabsVoice, setElevenlabsVoice] = useState(ELEVENLABS_VOICES[0].value)
  const [personaName, setPersonaName] = useState('')
  const [personaGender, setPersonaGender] = useState('')
  const [conversation, setConversation] = useState([])
  const [error, setError] = useState('')
  const [currentTranscript, setCurrentTranscript] = useState('')

  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)
  const audioRef = useRef(null)
  const conversationRef = useRef([])
  const scrollRef = useRef(null)
  const isActiveRef = useRef(false)
  const voiceEngineRef = useRef('browser')
  const elevenlabsVoiceRef = useRef(ELEVENLABS_VOICES[0].value)

  useEffect(() => {
    voiceEngineRef.current = voiceEngine
  }, [voiceEngine])

  useEffect(() => {
    elevenlabsVoiceRef.current = elevenlabsVoice
  }, [elevenlabsVoice])

  // keep ref in sync with state for use inside callbacks
  useEffect(() => {
    conversationRef.current = conversation
  }, [conversation])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [conversation, currentTranscript])

  const pickPersona = () => {
    let gender
    if (voiceEngine === 'elevenlabs') {
      const selectedVoice = ELEVENLABS_VOICES.find((v) => v.value === elevenlabsVoice)
      gender = selectedVoice?.gender || 'grandma'
    } else {
      gender = ['grandma', 'grandpa'][Math.floor(Math.random() * 2)]
    }
    const grandmaNames = ['Dorothy', 'Mildred', 'Edna', 'Gertrude', 'Agnes', 'Beatrice', 'Ethel', 'Mabel']
    const grandpaNames = ['Harold', 'Eugene', 'Clarence', 'Earl', 'Walter', 'Herbert', 'Chester', 'Bernard']
    const names = gender === 'grandma' ? grandmaNames : grandpaNames
    const name = names[Math.floor(Math.random() * names.length)]
    setPersonaGender(gender)
    setPersonaName(name)
    return { name, gender }
  }

  const speakBrowser = useCallback((text) => {
    return new Promise((resolve) => {
      const synth = synthRef.current
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)

      const voices = synth.getVoices()
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')
      ) || voices.find((v) => v.lang.startsWith('en'))
      if (preferred) utterance.voice = preferred

      utterance.rate = 0.82
      utterance.pitch = 0.9
      utterance.onend = resolve
      utterance.onerror = resolve
      synth.speak(utterance)
    })
  }, [])

  const speakElevenLabs = useCallback(async (text) => {
    const res = await fetch(`${API_BASE}/decoy/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: elevenlabsVoiceRef.current }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'TTS failed')
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    return new Promise((resolve) => {
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); resolve() }
      audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
      audio.play()
    })
  }, [])

  const speakReply = useCallback((text) => {
    if (voiceEngineRef.current === 'elevenlabs') {
      return speakElevenLabs(text)
    }
    return speakBrowser(text)
  }, [speakBrowser, speakElevenLabs])

  const fetchReply = useCallback(async (convo, persona) => {
    const res = await fetch(`${API_BASE}/decoy/live-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: convo,
        persona_name: persona.name,
        persona_gender: persona.gender,
        scam_category: category,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Failed to generate reply')
    }
    const data = await res.json()
    return data.reply
  }, [category])

  const startListening = useCallback((persona) => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Your browser does not support speech recognition. Please use Chrome.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    let finalTranscript = ''
    let silenceTimer = null

    recognition.onresult = (event) => {
      let interim = ''
      finalTranscript = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }
      setCurrentTranscript(finalTranscript + interim)

      // reset silence timer on each result
      clearTimeout(silenceTimer)
      if (finalTranscript.trim()) {
        silenceTimer = setTimeout(async () => {
          if (!isActiveRef.current) return
          const scammerText = finalTranscript.trim()
          if (!scammerText) return

          // stop listening while we think & speak
          recognition.stop()
          setCurrentTranscript('')

          const scammerMsg = { role: 'scammer', text: scammerText }
          const updatedConvo = [...conversationRef.current, scammerMsg]
          setConversation(updatedConvo)

          setStatus('thinking')
          try {
            const reply = await fetchReply(updatedConvo, persona)
            const personaMsg = { role: 'persona', text: reply }
            const convoWithReply = [...updatedConvo, personaMsg]
            setConversation(convoWithReply)

            setStatus('speaking')
            await speakReply(reply)
          } catch (e) {
            setError(e.message)
          }

          // resume listening if still active
          if (isActiveRef.current) {
            setStatus('listening')
            try {
              recognition.start()
            } catch {
              // may already be started
            }
          }
        }, 2000) // 2s of silence = scammer done talking
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      setError(`Speech recognition error: ${event.error}`)
    }

    recognition.onend = () => {
      // auto-restart if session is active (browser stops recognition periodically)
      if (isActiveRef.current && status !== 'thinking' && status !== 'speaking') {
        try {
          recognition.start()
        } catch {
          // ignore
        }
      }
    }

    recognition.start()
    setStatus('listening')
  }, [fetchReply, speakReply, status])

  const handleStart = () => {
    setError('')
    setConversation([])
    setCurrentTranscript('')
    const persona = pickPersona()
    isActiveRef.current = true
    startListening(persona)
  }

  const handleStop = () => {
    isActiveRef.current = false
    synthRef.current.cancel()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setStatus('idle')
    setCurrentTranscript('')
  }

  const isActive = status !== 'idle'

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
          <span>📞</span> Live Call Mode
        </h2>
        <p className="text-[rgba(244,234,215,0.46)] text-sm mt-1 leading-relaxed">
          Put the scammer on speaker near your computer. We'll listen, then respond out loud as a confused elderly person.
        </p>
      </div>

      {/* Setup - only show when idle */}
      {!isActive && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.25em] shrink-0">
              Scam Type
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-glow rounded-xl px-3 py-2 text-[rgba(244,234,215,0.76)] text-sm bg-transparent"
            >
              {SCAM_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.25em] shrink-0">
              Voice
            </label>
            <select
              value={voiceEngine}
              onChange={(e) => setVoiceEngine(e.target.value)}
              className="input-glow rounded-xl px-3 py-2 text-[rgba(244,234,215,0.76)] text-sm bg-transparent"
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </div>

          {voiceEngine === 'elevenlabs' && (
            <div className="flex items-center gap-3">
              <label className="text-[10px] text-[rgba(244,234,215,0.34)] uppercase tracking-[0.25em] shrink-0">
                Character
              </label>
              <select
                value={elevenlabsVoice}
                onChange={(e) => setElevenlabsVoice(e.target.value)}
                className="input-glow rounded-xl px-3 py-2 text-[rgba(244,234,215,0.76)] text-sm bg-transparent"
              >
                {ELEVENLABS_VOICES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleStart}
            className="btn-glow w-full py-4 rounded-2xl text-sm font-semibold"
          >
            📞 Start Live Call
          </button>
        </div>
      )}

      {/* Active session */}
      {isActive && (
        <div className="space-y-5 animate-fade-in-up">
          {/* Status indicator */}
          <div className="glass rounded-2xl px-5 py-4 border border-[rgba(239,186,99,0.12)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative w-10 h-10 flex items-center justify-center">
                <PulseRing active={status === 'listening'} />
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors duration-300 ${
                    status === 'listening'
                      ? 'bg-red-500/20 text-red-300'
                      : status === 'thinking'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}
                >
                  {status === 'listening' ? '🎙️' : status === 'thinking' ? '🧠' : '🔊'}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-[rgba(244,234,215,0.9)]">
                  {status === 'listening' && 'Listening to scammer...'}
                  {status === 'thinking' && 'Generating response...'}
                  {status === 'speaking' && `${personaName} is speaking...`}
                </p>
                <p className="text-xs text-[rgba(244,234,215,0.4)] mt-0.5">
                  Playing as {personaName} ({personaGender})
                </p>
              </div>
            </div>

            <button
              onClick={handleStop}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-red-400/30 text-red-200 bg-red-500/10 hover:bg-red-500/20 transition-all"
            >
              Stop
            </button>
          </div>

          {/* Live transcript */}
          {currentTranscript && status === 'listening' && (
            <div
              className="glass rounded-xl px-4 py-3 border border-[rgba(255,231,194,0.08)]"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <p className="text-[10px] text-[rgba(244,234,215,0.3)] uppercase tracking-[0.25em] mb-1.5">
                Hearing...
              </p>
              <p className="text-sm text-[rgba(244,234,215,0.5)] italic">{currentTranscript}</p>
            </div>
          )}

          {/* Conversation log */}
          {conversation.length > 0 && (
            <div
              className="glass rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 18px 36px rgba(0,0,0,0.18)' }}
            >
              <div
                className="px-5 py-3 border-b border-[rgba(255,231,194,0.05)]"
                style={{ background: 'rgba(126,180,137,0.05)' }}
              >
                <span className="text-[rgba(244,234,215,0.56)] text-[11px] font-bold uppercase tracking-[0.25em]">
                  Conversation Log
                </span>
              </div>
              <div ref={scrollRef} className="px-5 py-4 max-h-80 overflow-y-auto space-y-4">
                {conversation.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'persona' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'persona'
                          ? 'bg-[rgba(126,180,137,0.12)] border border-[rgba(126,180,137,0.15)] text-[rgba(244,234,215,0.8)]'
                          : 'bg-[rgba(255,255,255,0.04)] border border-[rgba(255,231,194,0.08)] text-[rgba(244,234,215,0.6)]'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1 opacity-50">
                        {msg.role === 'persona' ? `${personaName}` : 'Scammer'}
                      </p>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
