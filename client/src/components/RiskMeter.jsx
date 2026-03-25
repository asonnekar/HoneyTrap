export default function RiskMeter({ score }) {
  const r = 72
  const circumference = Math.PI * r
  const filled = (score / 100) * circumference

  const color =
    score < 30 ? '#22c55e'
    : score < 60 ? '#f59e0b'
    : '#ef4444'

  const glowColor =
    score < 30 ? 'rgba(34,197,94,0.7)'
    : score < 60 ? 'rgba(245,158,11,0.7)'
    : 'rgba(239,68,68,0.7)'

  const label =
    score < 30 ? 'LOW RISK'
    : score < 60 ? 'MEDIUM'
    : 'HIGH RISK'

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg viewBox="0 0 180 100" className="w-44">
        <defs>
          <filter id="arc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        {/* Track */}
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Glow layer (thicker, blurred) */}
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          opacity="0.25"
          style={{ filter: 'blur(6px)', transition: 'stroke-dasharray 0.65s ease' }}
        />
        {/* Main arc */}
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{
            filter: `drop-shadow(0 0 5px ${glowColor})`,
            transition: 'stroke-dasharray 0.65s ease',
          }}
        />
        {/* Score */}
        <text
          x="90" y="75"
          textAnchor="middle"
          fill={color}
          fontSize="36"
          fontWeight="bold"
          fontFamily="ui-monospace, monospace"
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        >
          {score}
        </text>
      </svg>
      <span
        className="text-[10px] font-black tracking-[0.18em] -mt-1"
        style={{ color, textShadow: `0 0 10px ${glowColor}` }}
      >
        {label}
      </span>
    </div>
  )
}
