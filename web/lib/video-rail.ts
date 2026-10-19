export type HumanRole = 'player' | 'coach' | 'guest';

export type HumanSnap = {
  identity: string;
  name?: string;
  isAgent: boolean;
  isLocal: boolean;
  isSpeaking: boolean;
  attributes: Record<string, string>;
  cameraOn: boolean;
};

export type HumanTile = {
  identity: string;
  name: string;
  role: HumanRole;
  speaking: boolean;
  cameraOn: boolean;
  local: boolean;
};

const ROLE_RANK: Record<HumanRole, number> = {
  player: 0,
  coach: 1,
  guest: 2,
};

export function humanRole(snap: Pick<HumanSnap, 'isAgent' | 'attributes'>): HumanRole | null {
  if (snap.isAgent) return null;
  const role = snap.attributes.role;
  if (role === 'player' || role === 'coach') return role;
  return 'guest';
}

function displayName(snap: HumanSnap, role: HumanRole): string {
  const named = snap.name?.trim();
  if (named) return named;
  if (role === 'player') return 'Player';
  if (role === 'coach') return 'Coach';
  return 'Guest';
}

export function listHumanTiles(people: HumanSnap[], localIdentity: string): HumanTile[] {
  const tiles: HumanTile[] = [];
  for (const person of people) {
    const role = humanRole(person);
    if (!role) continue;
    tiles.push({
      identity: person.identity,
      name: displayName(person, role),
      role,
      speaking: person.isSpeaking,
      cameraOn: person.cameraOn,
      local: person.identity === localIdentity,
    });
  }
  tiles.sort((left, right) => {
    if (left.local !== right.local) return left.local ? -1 : 1;
    if (left.role !== right.role) return ROLE_RANK[left.role] - ROLE_RANK[right.role];
    return left.identity.localeCompare(right.identity);
  });
  return tiles;
}
