export default function RiskMeter({ score }) {
  const r = 72
  const circumference = Math.PI * r
  const filled = (score / 100) * circumference

  const color =
    score < 30 ? '#7eb489'
    : score < 60 ? '#d99a36'
    : '#e07a63'

  const glowColor =
    score < 30 ? 'rgba(126,180,137,0.55)'
    : score < 60 ? 'rgba(217,154,54,0.55)'
    : 'rgba(224,122,99,0.5)'

  const label =
    score < 30 ? 'LOW RISK'
    : score < 60 ? 'MEDIUM'
    : 'HIGH RISK'

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg viewBox="0 0 180 100" className="w-44">
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke="rgba(255,234,205,0.08)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke={color}
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          opacity="0.22"
          style={{ filter: 'blur(7px)', transition: 'stroke-dasharray 0.65s ease' }}
        />
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{
            filter: `drop-shadow(0 0 6px ${glowColor})`,
            transition: 'stroke-dasharray 0.65s ease',
          }}
        />
        <text
          x="90"
          y="75"
          textAnchor="middle"
          fill={color}
          fontSize="36"
          fontWeight="bold"
          fontFamily="Georgia, serif"
          style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}
        >
          {score}
        </text>
      </svg>
      <span
        className="text-[10px] font-black tracking-[0.18em] -mt-1"
        style={{ color, textShadow: `0 0 8px ${glowColor}` }}
      >
        {label}
      </span>
    </div>
  )
}
