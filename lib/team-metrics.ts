export type TeamMemberMetricSource = {
  role: string;
  status: string;
};

// The current workspace plan permits ten people. Keeping this in one shared
// module ensures that the invitation rule and the visual utilization stay in sync.
export const TEAM_MEMBER_LIMIT = 10;

export function getTeamMetrics(members: TeamMemberMetricSource[]) {
  const active = members.filter((member) => member.status === 'Ativo').length;
  const pending = members.length - active;
  const roles = new Set(members.map((member) => member.role)).size;
  const occupied = members.length;
  const available = Math.max(0, TEAM_MEMBER_LIMIT - occupied);
  const utilization = Math.min(
    100,
    Math.round((occupied / TEAM_MEMBER_LIMIT) * 100),
  );

  return {
    active,
    pending,
    roles,
    occupied,
    available,
    utilization,
    capacity: TEAM_MEMBER_LIMIT,
  };
}
