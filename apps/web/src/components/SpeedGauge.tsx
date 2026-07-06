const SIZE = 160;
const CENTER = SIZE / 2;
const RADIUS = 68;
const START_ANGLE = -180; // left end of the semicircle
const END_ANGLE = 0; // right end of the semicircle

function polarToCartesian(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CENTER + RADIUS * Math.cos(rad), y: CENTER + RADIUS * Math.sin(rad) };
}

function describeArc(startAngle: number, endAngle: number) {
  const start = polarToCartesian(endAngle);
  const end = polarToCartesian(startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function SpeedGauge({ speed, maxSpeed = 180 }: { speed: number; maxSpeed?: number }) {
  const clamped = Math.min(speed, maxSpeed);
  const valueAngle = START_ANGLE + (clamped / maxSpeed) * (END_ANGLE - START_ANGLE);
  const needle = polarToCartesian(valueAngle);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE / 2 + 12}`} width={SIZE} height={SIZE / 2 + 12}>
      <defs>
        <linearGradient id="speedGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>

      <path
        d={describeArc(START_ANGLE, END_ANGLE)}
        fill="none"
        stroke="#232838"
        strokeWidth={12}
        strokeLinecap="round"
      />
      <path
        d={describeArc(START_ANGLE, valueAngle)}
        fill="none"
        stroke="url(#speedGaugeGradient)"
        strokeWidth={12}
        strokeLinecap="round"
      />
      <line
        x1={CENTER}
        y1={CENTER}
        x2={needle.x}
        y2={needle.y}
        stroke="#e6e9f0"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={CENTER} cy={CENTER} r={4} fill="#e6e9f0" />

      <text x={CENTER} y={CENTER - 14} textAnchor="middle" fontSize={22} fontWeight={700} fill="#e6e9f0">
        {Math.round(speed)}
      </text>
      <text x={CENTER} y={CENTER + 2} textAnchor="middle" fontSize={10} fill="#8b93a7">
        km/h
      </text>
    </svg>
  );
}
