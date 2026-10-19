import type { Coord, DeckPlayer, TeamId } from '@/lib/deck/types';
import { DEFAULT_MARKER_RADIUS_SVG, markerFontSizePx, markerLines } from '@/lib/sketch/markers';

type MarkerProps = {
  player: DeckPlayer;
  position?: Coord;
  radius?: number;
  fontSize?: number;
  highlighted?: boolean;
  hasBall?: boolean;
  animateHighlight?: boolean;
  ghost?: boolean;
};

export function Marker({
  player,
  position = [0, 0],
  radius = DEFAULT_MARKER_RADIUS_SVG,
  fontSize,
  highlighted = false,
  hasBall = false,
  animateHighlight = false,
  ghost = false,
}: MarkerProps) {
  const [x, y] = position;
  const ours = player.team === ('gsw' satisfies TeamId);
  const fill = ours ? '#1D428A' : '#0B0B0C';
  const stroke = ours ? '#FFFFFF' : '#C2185B';
  const label = player.label.toUpperCase();
  const lines = markerLines(label);
  const size = fontSize ?? markerFontSizePx(label, radius * 9) / 9;
  const startY = lines.length === 1 ? 0 : -((lines.length - 1) * size * 0.55);

  return (
    <g transform={`translate(${x} ${y})`} opacity={ghost ? 0.35 : 1}>
      {highlighted ? (
        <ellipse
          cx="0"
          cy="0"
          rx={radius * 2.05}
          ry={radius * 1.15}
          className={animateHighlight ? 'swipe-in highlighter' : 'highlighter'}
          fill="#FFC72C"
          fillOpacity={0.78}
        />
      ) : null}
      {hasBall ? (
        <circle
          cx="0"
          cy="0"
          r={radius * 1.42}
          fill="none"
          stroke="#FF7A1A"
          strokeWidth={radius * 0.18}
        />
      ) : null}
      <circle
        cx="0"
        cy="0"
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={ours ? 0.35 : 0.7}
        strokeDasharray={ghost ? '0.9 0.7' : undefined}
      />
      <text
        x="0"
        y={startY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#FFFFFF"
        className="marker-label"
        style={{
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
          fontSize: `${size}px`,
          fontWeight: 800,
          letterSpacing: '0.01em',
        }}
      >
        {lines.map((line) => (
          <tspan key={line} x="0" dy={line === lines[0] ? 0 : size * 1.05}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
