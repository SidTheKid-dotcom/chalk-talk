import type { Coord, DeckPlayer, TeamId } from '@/lib/deck/types';

type MarkerProps = {
  player: DeckPlayer;
  position: Coord;
  highlighted?: boolean;
  hasBall?: boolean;
  animateHighlight?: boolean;
};

const RADIUS = 3.7;

export function Marker({
  player,
  position,
  highlighted = false,
  hasBall = false,
  animateHighlight = false,
}: MarkerProps) {
  const [x, y] = position;
  const ours = player.team === ('gsw' satisfies TeamId);
  const fill = ours ? '#1d428a' : '#f6f1e4';
  const stroke = ours ? '#1d428a' : '#860038';
  const text = ours ? '#1d428a' : '#860038';
  const label = player.label.toUpperCase();
  const labelY = ours ? RADIUS + 4.1 : -(RADIUS + 2.4);

  return (
    <g transform={`translate(${x} ${y})`}>
      {highlighted ? (
        <ellipse
          cx="0"
          cy="0"
          rx="8.4"
          ry="4.6"
          className={animateHighlight ? 'swipe-in highlighter' : 'highlighter'}
          fill="#ffc72c"
        />
      ) : null}
      <circle cx="0" cy="0" r={RADIUS} fill={fill} stroke={stroke} strokeWidth="1.2" />
      <text
        x="0"
        y={labelY}
        textAnchor="middle"
        fill={text}
        style={{
          fontFamily: 'var(--font-archivo), Arial, sans-serif',
          fontSize: '3.1px',
          letterSpacing: '0.04em',
          fontWeight: 600,
        }}
      >
        {label}
      </text>
      {hasBall ? <circle cx="2.8" cy="-2.6" r="1" fill="#191714" /> : null}
    </g>
  );
}
