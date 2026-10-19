import { Marker } from '@/components/deck/Marker';
import { type DrawnArrow, PlayArrows } from '@/components/deck/PlayArrows';
import type { Deck, PlayerId, SlideDiagram, TargetId, ZoneId } from '@/lib/deck/types';
import { toSvgPoint, zoneToSvg } from '@/lib/sketch/court';
import { layoutMarkers } from '@/lib/sketch/markers';
import { hashSeed, roughCircle } from '@/lib/sketch/rough';

type HalfCourtProps = {
  deck: Deck;
  diagram: SlideDiagram;
  highlights?: TargetId[];
  arrows?: DrawnArrow[];
  markerOverrides?: Partial<Record<PlayerId, [number, number]>>;
  ball?: PlayerId;
  animate?: boolean;
};

function CourtInk() {
  const ink = '#1d428a';
  const ft = roughCircle(62, 50, 12, hashSeed('ft'), 0.35);
  const rim = roughCircle(94.8, 50, 1.6, hashSeed('rim'), 0.2);

  return (
    <g fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.2" y="1.2" width="97.6" height="97.6" strokeWidth="1.25" />
      <line x1="99" y1="1.2" x2="99" y2="98.8" strokeWidth="1.6" />
      <rect x="62" y="34" width="37" height="32" strokeWidth="1.25" />
      <line x1="62" y1="34" x2="62" y2="66" strokeWidth="1.25" />
      <path d="M 78.6 6 A 47 47 0 0 0 78.6 94" strokeWidth="1.25" />
      <line x1="78.6" y1="6" x2="99" y2="6" strokeWidth="1.25" />
      <line x1="78.6" y1="94" x2="99" y2="94" strokeWidth="1.25" />
      <path d={ft} strokeWidth="1.1" />
      <path d="M 94.8 42.6 A 7.4 7.4 0 0 0 94.8 57.4" strokeWidth="1" />
      <line x1="97.6" y1="44.6" x2="97.6" y2="55.4" strokeWidth="2" />
      <path d={rim} strokeWidth="1.15" />
      <line x1="86" y1="31.2" x2="86" y2="34" strokeWidth="1" />
      <line x1="86" y1="66" x2="86" y2="68.8" strokeWidth="1" />
    </g>
  );
}

export function HalfCourt({
  deck,
  diagram,
  highlights = [],
  arrows = [],
  markerOverrides,
  ball,
  animate = false,
}: HalfCourtProps) {
  const highlightedZones = new Set(
    highlights.filter((target): target is ZoneId => target in deck.zones)
  );
  const mappedArrows = arrows.map((arrow) => ({
    ...arrow,
    from: toSvgPoint(arrow.from),
    to: toSvgPoint(arrow.to),
  }));
  const resolvedMarkers: Partial<Record<PlayerId, [number, number]>> = {
    ...diagram.markers,
    ...markerOverrides,
  };
  const laid = layoutMarkers({
    markers: resolvedMarkers,
    players: deck.players,
    matchups: diagram.matchups,
  });

  return (
    <svg
      viewBox="-2 -4 104 110"
      className="h-auto w-full overflow-visible"
      role="img"
      aria-label="Half court"
    >
      <CourtInk />
      {diagram.zones.map((zoneId) => {
        if (!highlightedZones.has(zoneId)) return null;
        const [x1, y1, x2, y2] = zoneToSvg(deck.zones[zoneId].box);
        return (
          <rect
            key={zoneId}
            x={x1}
            y={y1}
            width={x2 - x1}
            height={y2 - y1}
            className={animate ? 'highlighter swipe-in' : 'highlighter'}
            fill="#ffc72c"
            opacity="0.85"
          />
        );
      })}
      <PlayArrows arrows={mappedArrows} animate={animate} />
      {laid.map((marker) => {
        const player = deck.players[marker.id];
        if (!player) return null;
        return (
          <Marker
            key={marker.id}
            player={player}
            position={marker.svg}
            radius={marker.radiusSvg}
            fontSize={marker.fontSizeSvg}
            highlighted={highlights.includes(marker.id)}
            hasBall={ball === marker.id}
            animateHighlight={animate}
          />
        );
      })}
    </svg>
  );
}
