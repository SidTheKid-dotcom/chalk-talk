type LowerThirdProps = {
  name: string;
  team: 'gsw' | 'cle';
  sub?: string;
  number?: number;
  total?: number;
  section?: string;
};

export function LowerThird({ name, team, sub }: LowerThirdProps) {
  return (
    <div className={`lower-third ${team}`}>
      <span className="num">{team === 'gsw' ? 'GSW' : 'CLE'}</span>
      <span className="nm">
        <b>{name}</b>
        {sub ? <s>{sub}</s> : null}
      </span>
    </div>
  );
}
