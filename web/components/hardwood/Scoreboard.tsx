type ScoreboardProps = {
  slideNumber?: number | null;
  total?: number;
};

export function Scoreboard({ slideNumber = null, total = 6 }: ScoreboardProps) {
  const n = slideNumber == null ? '—' : String(slideNumber);
  return (
    <header className="scoreboard" data-scoreboard>
      <div className="brand">
        <i aria-hidden />
        Chalk Talk
      </div>
      <div className="mid">
        <div className="stack">
          <span className="lbl">Series</span>
          <span className="led" style={{ fontSize: 22 }} data-off="8-8">
            3-3
          </span>
        </div>
        <div className="stack">
          <span className="lbl">Tied</span>
          <span className="g7">Game 7</span>
        </div>
      </div>
      <div className="sp" />
      <div className="slideno">
        Slide <span className="g7">{n}</span> / {total}
      </div>
    </header>
  );
}
