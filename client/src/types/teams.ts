export type TeamsSnapshot = {
  gameMode: string;
  teamAName: string;
  teamBName: string;
  teamA: string[];
  teamB: string[];
  unassigned: string[];
  countdownEndsAt: string | null;
};
