export type TeamId = 'gsw' | 'cle';

export type SlideId =
  | 's1_tipoff'
  | 's2_lebron'
  | 's3_kyrie'
  | 's4_offense'
  | 's5_xfactors'
  | 's6_last_two';

export type PlayerId =
  | 'gsw_curry'
  | 'gsw_thompson'
  | 'gsw_green'
  | 'gsw_iguodala'
  | 'gsw_barnes'
  | 'cle_james'
  | 'cle_irving'
  | 'cle_love'
  | 'cle_smith'
  | 'cle_tthompson';

export type ZoneId =
  | 'z_paint'
  | 'z_top_key'
  | 'z_left_wing'
  | 'z_right_wing'
  | 'z_left_corner'
  | 'z_right_corner'
  | 'z_left_elbow'
  | 'z_right_elbow'
  | 'z_high_post';

export type CardId = 'k_jr_card';

export type PlayId =
  | 'p_blitz_lebron_pnr'
  | 'p_switch_kyrie'
  | 'p_steph_stagger'
  | 'p_draymond_short_roll';

export type TargetId = PlayerId | ZoneId | CardId;

export type ArrowKind = 'cut' | 'dribble' | 'pass' | 'screen' | 'rotate';

export type Coord = [number, number];

export type ZoneBox = [number, number, number, number];

export type DeckPlayer = {
  label: string;
  team: TeamId;
};

export type DeckZone = {
  label: string;
  shape: 'rect';
  box: ZoneBox;
};

export type SlideCard = {
  id: CardId;
  hidden: boolean;
  caption: string;
};

export type SlideDiagram = {
  kind: 'half_court';
  markers: Partial<Record<PlayerId, Coord>>;
  matchups?: Partial<Record<PlayerId, PlayerId>>;
  zones: ZoneId[];
};

export type DeckSlide = {
  id: SlideId;
  number: number;
  section: string;
  title: string;
  points: string[];
  notes: string;
  fact_ids: string[];
  cutouts: string[];
  diagram: SlideDiagram | null;
  cards: SlideCard[];
};

export type PlayArrow = {
  from: PlayerId;
  to: Coord;
  kind: ArrowKind;
  option?: boolean;
};

export type PlayStep = {
  caption: string;
  duration_ms: number;
  ball: PlayerId;
  action?: 'trap';
  moves: Partial<Record<PlayerId, Coord>>;
  arrows: PlayArrow[];
};

export type PlayStart = {
  ball: PlayerId;
  positions: Partial<Record<PlayerId, Coord>>;
};

export type DeckPlay = {
  id: PlayId;
  slide_id: SlideId;
  title: string;
  start?: PlayStart;
  steps: PlayStep[];
};

export type Deck = {
  players: Record<PlayerId, DeckPlayer>;
  zones: Record<ZoneId, DeckZone>;
  slides: DeckSlide[];
  plays: DeckPlay[];
};

export type Fact = {
  id: string;
  claim: string;
  slide: string;
  source_url: string;
  source_domain: string;
};

export type CutoutCredit = {
  file: string;
  name: string;
  teamAbbrev: 'GSW' | 'CLE';
  teamLine: string;
  license: string;
  source: string;
};

export type AgentState = 'Listening' | 'Thinking' | 'Speaking' | '—';
