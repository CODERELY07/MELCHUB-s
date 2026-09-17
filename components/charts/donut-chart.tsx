"use client";

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
}

/**
 * A small, dependency-free SVG donut chart (see bar-chart.tsx for why this
 * is hand-rolled rather than a library).
 */
export function DonutChart({ data }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const size = 160;
  const radius = 60;
  const strokeWidth = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox={`0 0 ${size} ${size}`} className="size-40 shrink-0" role="img" aria-label="Status breakdown">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--color-muted)" strokeWidth={strokeWidth} />
        {total > 0 &&
          data
            .filter((d) => d.value > 0)
            .map((d) => {
              const fraction = d.value / total;
              const dash = fraction * circumference;
              const dashArray = `${dash} ${circumference - dash}`;
              const dashOffset = -offset;
              offset += dash;

              return (
                <circle
                  key={d.label}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  transform={`rotate(-90 ${center} ${center})`}
                >
                  <title>
                    {d.label}: {d.value}
                  </title>
                </circle>
              );
            })}
        <text x={center} y={center} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-lg font-semibold">
          {total}
        </text>
      </svg>

      <ul className="flex flex-col gap-1.5 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="capitalize text-muted-foreground">{d.label}</span>
            <span className="font-medium">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
