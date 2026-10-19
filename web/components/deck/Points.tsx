type PointsProps = {
  points: string[];
  variant?: 'checkbox' | 'numeral';
};

export function Points({ points }: PointsProps) {
  return (
    <ol className="rows m-0 list-none p-0">
      {points.slice(0, 3).map((point, index) => (
        <li key={point} className="row">
          <span className="n">{String(index + 1).padStart(2, '0')}</span>
          <p className="row-head">{point}</p>
        </li>
      ))}
    </ol>
  );
}
