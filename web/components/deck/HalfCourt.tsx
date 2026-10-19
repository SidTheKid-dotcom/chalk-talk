import { Marker } from '@/components/deck/Marker';
import { type DrawnArrow, PlayArrows } from '@/components/deck/PlayArrows';
import type { Coord, Deck, PlayerId, SlideDiagram, TargetId, ZoneId } from '@/lib/deck/types';
import { toSvgPoint, zoneToSvg } from '@/lib/sketch/court';
import { layoutMarkers, separateGhostsFromLive } from '@/lib/sketch/markers';

type HalfCourtProps = {
  deck: Deck;
  diagram: SlideDiagram;
  highlights?: TargetId[];
  arrows?: DrawnArrow[];
  markerOverrides?: Partial<Record<PlayerId, Coord>>;
  ghosts?: Partial<Record<PlayerId, Coord>>;
  ball?: PlayerId;
  animate?: boolean;
  showZoneLabels?: boolean;
  focusIds?: PlayerId[];
};

function CourtInk() {
  return (
    <g>
      <rect x="62" y="34" width="37" height="32" fill="#1D428A" fillOpacity="0.88" />
      <g
        fill="none"
        stroke="#FFFFFF"
        strokeOpacity="0.95"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1.2" y="1.2" width="97.6" height="97.6" strokeWidth="1.15" />
        <line x1="99" y1="1.2" x2="99" y2="98.8" strokeWidth="1.5" />
        <rect x="62" y="34" width="37" height="32" strokeWidth="1.15" />
        <path d="M 78.6 6 A 47 47 0 0 0 78.6 94" strokeWidth="1.15" />
        <line x1="78.6" y1="6" x2="99" y2="6" strokeWidth="1.15" />
        <line x1="78.6" y1="94" x2="99" y2="94" strokeWidth="1.15" />
        <circle cx="62" cy="50" r="12" strokeWidth="1.05" />
        <path d="M 94.8 42.6 A 7.4 7.4 0 0 0 94.8 57.4" strokeWidth="1" />
        <line x1="97.6" y1="44.6" x2="97.6" y2="55.4" strokeWidth="2" />
        <circle cx="94.8" cy="50" r="1.6" strokeWidth="1.1" />
        <line x1="86" y1="31.2" x2="86" y2="34" strokeWidth="1" />
        <line x1="86" y1="66" x2="86" y2="68.8" strokeWidth="1" />
      </g>
      <path d="M 8 38 A 12 12 0 0 1 8 62" fill="none" stroke="#FFC72C" strokeWidth="1.15" />
      <circle cx="1.6" cy="50" r="4.2" fill="none" stroke="#FFC72C" strokeWidth="1.05" />
    </g>
  );
}

function Legend() {
  return (
    <div className="legend" data-court-legend>
      <span>
        <svg width="44" height="10" aria-hidden>
          <path d="M2 5H34" stroke="#FFC72C" strokeWidth="3" strokeDasharray="8 5" />
          <path d="M34 0L44 5L34 10z" fill="#FFC72C" />
        </svg>
        Cut
      </span>
      <span>
        <svg width="44" height="10" aria-hidden>
          <path
            d="M2 5H34"
            stroke="#fff"
            strokeWidth="2.4"
            strokeDasharray="1 5"
            strokeLinecap="round"
          />
          <path d="M34 0L44 5L34 10z" fill="#fff" />
        </svg>
        Pass
      </span>
      <span>
        <svg width="10" height="20" aria-hidden>
          <path d="M5 1V19" stroke="#fff" strokeWidth="5" />
        </svg>
        Screen
      </span>
      <span>
        <svg width="20" height="20" aria-hidden>
          <circle cx="10" cy="10" r="8" fill="#1D428A" stroke="#fff" strokeWidth="1.5" />
        </svg>
        GSW
      </span>
      <span>
        <svg width="20" height="20" aria-hidden>
          <circle cx="10" cy="10" r="7.5" fill="#0B0B0C" stroke="#C2185B" strokeWidth="4" />
        </svg>
        CLE
      </span>
      <span>
        <svg width="22" height="22" aria-hidden>
          <circle cx="11" cy="11" r="9.5" fill="none" stroke="#FF7A1A" strokeWidth="2.4" />
        </svg>
        Ball
      </span>
    </div>
  );
}

export function HalfCourt({
  deck,
  diagram,
  highlights = [],
  arrows = [],
  markerOverrides,
  ghosts,
  ball,
  animate = false,
  showZoneLabels = false,
  focusIds = [],
}: HalfCourtProps) {
  const highlightedZones = new Set(
    highlights.filter((target): target is ZoneId => target in deck.zones)
  );
  const attackZones = new Set<ZoneId>();
  for (const target of highlights) {
    const zone = diagram.attack_zones?.[target as PlayerId];
    if (zone) {
      highlightedZones.add(zone);
      attackZones.add(zone);
    }
  }
  const mappedArrows = arrows.map((arrow) => ({
    ...arrow,
    from: toSvgPoint(arrow.from),
    to: toSvgPoint(arrow.to),
  }));
  const resolvedMarkers: Partial<Record<PlayerId, Coord>> = {
    ...diagram.markers,
    ...markerOverrides,
  };
  const laid = layoutMarkers({
    markers: resolvedMarkers,
    players: deck.players,
    matchups: diagram.matchups,
  });
  const focus = new Set(focusIds);
  const ghostLaid = ghosts
    ? separateGhostsFromLive(
        layoutMarkers({
          markers: { ...resolvedMarkers, ...ghosts },
          players: deck.players,
          matchups: diagram.matchups,
        }).filter((marker) => Boolean(ghosts[marker.id])),
        laid
      )
    : [];

  return (
    <div className="relative h-full w-full" data-court-wrap>
      <svg
        viewBox="-2 -4 104 110"
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Half court"
        data-court
      >
        <CourtInk />
        {diagram.zones.map((zoneId) => {
          const [x1, y1, x2, y2] = zoneToSvg(deck.zones[zoneId].box);
          const highlighted = highlightedZones.has(zoneId);
          return (
            <g key={zoneId}>
              {highlighted ? (
                <rect
                  x={x1}
                  y={y1}
                  width={x2 - x1}
                  height={y2 - y1}
                  className={animate ? 'highlighter swipe-in' : 'highlighter'}
                  fill="#FFC72C"
                  opacity="0.35"
                />
              ) : null}
              {attackZones.has(zoneId) ? (
                <text
                  x={(x1 + x2) / 2}
                  y={y1 - 1.6}
                  textAnchor="middle"
                  fill="#FFC72C"
                  data-attack-zone={zoneId}
                  style={{
                    fontFamily: 'var(--font-plex), sans-serif',
                    fontSize: '2.6px',
                    letterSpacing: '0.1em',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {`Attacks from: ${deck.zones[zoneId].label}`}
                </text>
              ) : null}
              {showZoneLabels &&
              [
                'z_paint',
                'z_top_key',
                'z_left_wing',
                'z_right_wing',
                'z_left_corner',
                'z_right_corner',
              ].includes(zoneId) ? (
                <text
                  x={(x1 + x2) / 2}
                  y={(y1 + y2) / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#B9B4AA"
                  style={{
                    fontFamily: 'var(--font-plex), sans-serif',
                    fontSize: '1.7px',
                    letterSpacing: '0.08em',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                  }}
                >
                  {deck.zones[zoneId].label}
                </text>
              ) : null}
            </g>
          );
        })}
        <PlayArrows arrows={mappedArrows} animate={animate} />
        {ghostLaid.map((marker) => {
          const player = deck.players[marker.id];
          if (!player) return null;
          return (
            <Marker
              key={`ghost-${marker.id}`}
              player={player}
              position={marker.svg}
              radius={marker.radiusSvg}
              fontSize={marker.fontSizeSvg}
              ghost
            />
          );
        })}
        {laid.map((marker) => {
          const player = deck.players[marker.id];
          if (!player) return null;
          const faded = focus.size > 0 && !focus.has(marker.id) && !highlights.includes(marker.id);
          return (
            <g key={marker.id} opacity={faded ? 0.22 : 1}>
              <Marker
                player={player}
                position={marker.svg}
                radius={marker.radiusSvg}
                fontSize={marker.fontSizeSvg}
                highlighted={highlights.includes(marker.id)}
                hasBall={ball === marker.id}
                animateHighlight={animate}
              />
            </g>
          );
        })}
      </svg>
      {mappedArrows.length > 0 ? <Legend /> : null}
    </div>
  );
}
