"use client";

interface BarChartProps {
  title: string;
  data: { label: string; value: number }[];
  formatValue?: (value: number) => string;
  barColor?: string;
}

/**
 * A small, dependency-free SVG bar chart. Deliberately hand-rolled instead of
 * pulling in a charting library — the data shape here is simple and this
 * avoids any React 19 compatibility risk from a third-party chart package.
 *
 * The SVG itself is decorative as far as assistive tech is concerned — a
 * per-bar hover <title> isn't reliably exposed outside a mouse — so the real
 * values ship as a visually-hidden table instead, the same information a
 * sighted user gets from the bars plus the axis labels.
 */
export function BarChart({ title, data, formatValue, barColor = "var(--color-primary)" }: BarChartProps) {
  const width = 600;
  const height = 220;
  const padding = { top: 16, right: 12, bottom: 28, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const max = Math.max(1, ...data.map((d) => d.value));
  const barGap = 8;
  const barWidth = data.length > 0 ? chartWidth / data.length - barGap : 0;

  const format = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" aria-hidden="true">
        {data.map((d, i) => {
          const barHeight = max > 0 ? (d.value / max) * chartHeight : 0;
          const x = padding.left + i * (barWidth + barGap);
          const y = padding.top + (chartHeight - barHeight);

          return (
            <g key={d.label}>
              <title>
                {d.label}: {format(d.value)}
              </title>
              <rect
                x={x}
                y={y}
                width={Math.max(barWidth, 1)}
                height={Math.max(barHeight, 1)}
                rx={4}
                fill={barColor}
                opacity={0.85}
              />
              <text
                x={x + barWidth / 2}
                y={height - padding.bottom + 16}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <td>{d.label}</td>
              <td>{format(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
