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
};

export function Marker({
  player,
  position = [0, 0],
  radius = DEFAULT_MARKER_RADIUS_SVG,
  fontSize,
  highlighted = false,
  hasBall = false,
  animateHighlight = false,
}: MarkerProps) {
  const [x, y] = position;
  const ours = player.team === ('gsw' satisfies TeamId);
  const fill = ours ? '#1d428a' : '#f6f1e4';
  const stroke = ours ? '#1d428a' : '#860038';
  const text = ours ? '#f6f1e4' : '#860038';
  const label = player.label.toUpperCase();
  const lines = markerLines(label);
  const size = fontSize ?? markerFontSizePx(label, radius * 9) / 9;
  const startY = lines.length === 1 ? 0 : -((lines.length - 1) * size * 0.55);

  return (
    <g transform={`translate(${x} ${y})`}>
      {highlighted ? (
        <ellipse
          cx="0"
          cy="0"
          rx={radius * 2.05}
          ry={radius * 1.15}
          className={animateHighlight ? 'swipe-in highlighter' : 'highlighter'}
          fill="#ffc72c"
        />
      ) : null}
      <circle
        cx="0"
        cy="0"
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={ours ? 0.9 : 1.35}
      />
      <text
        x="0"
        y={startY}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={text}
        className="marker-label"
        style={{
          fontFamily: 'var(--font-archivo), Arial Narrow, sans-serif',
          fontSize: `${size}px`,
          fontWeight: 700,
          letterSpacing: '0.01em',
        }}
      >
        {lines.map((line) => (
          <tspan key={line} x="0" dy={line === lines[0] ? 0 : size * 1.05}>
            {line}
          </tspan>
        ))}
      </text>
      {hasBall ? (
        <circle cx={radius * 0.72} cy={-radius * 0.62} r={radius * 0.22} fill="#191714" />
      ) : null}
    </g>
  );
}
