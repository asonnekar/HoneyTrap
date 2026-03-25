export default function RiskMeter({ score }) {
  const r = 72
  const circumference = Math.PI * r // semicircle arc length ≈ 226.2
  const filled = (score / 100) * circumference

  const color =
    score < 30 ? '#22c55e'
    : score < 60 ? '#f59e0b'
    : '#ef4444'

  const label =
    score < 30 ? 'LOW RISK'
    : score < 60 ? 'MEDIUM'
    : 'HIGH RISK'

  return (
    <div className="flex flex-col items-center shrink-0">
      <svg viewBox="0 0 180 100" className="w-40">
        {/* Background track */}
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke="#1f2937"
          strokeWidth="13"
          strokeLinecap="round"
        />
        {/* Score fill */}
        <path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke={color}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* Score number */}
        <text
          x="90"
          y="76"
          textAnchor="middle"
          fill={color}
          fontSize="34"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {score}
        </text>
      </svg>
      <span className="text-xs font-bold tracking-widest -mt-1" style={{ color }}>
        {label}
      </span>
    </div>
  )
}
