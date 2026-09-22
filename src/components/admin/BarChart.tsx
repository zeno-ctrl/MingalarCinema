export function BarChart({ data, height = 120 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barWidth = 100 / data.length;

  return (
    <svg viewBox={`0 0 100 ${height}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const barHeight = (d.value / max) * (height - 10);
        return (
          <rect
            key={i}
            x={i * barWidth + barWidth * 0.15}
            y={height - barHeight}
            width={barWidth * 0.7}
            height={barHeight}
            rx={0.5}
            fill="url(#bar-gradient)"
          >
            <title>
              {d.label}: {d.value.toLocaleString()}
            </title>
          </rect>
        );
      })}
      <defs>
        <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0522A" />
          <stop offset="100%" stopColor="#BE1E2D" />
        </linearGradient>
      </defs>
    </svg>
  );
}
