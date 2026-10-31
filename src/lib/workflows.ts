import type { Activity, User, Workspace } from "./types";
export function homeWorkspace(user: User): Workspace {
  return user.roles.some((r) => r === "admin" || r === "superadmin")
    ? "admin"
    : user.roles.includes("owner")
      ? "owner"
      : "finder";
}
export function canAccess(user: User, workspace: Workspace) {
  return workspace === "admin"
    ? user.roles.some((r) => r === "admin" || r === "superadmin")
    : user.roles.includes(workspace);
}
export function activityActions(
  record: Activity,
  owner: boolean,
  today: string,
): [string, string][] {
  if (record.kind === "bookings") {
    const actions: [string, string][] =
      owner && record.status === "pending"
        ? [
            ["confirmed", "Confirm request"],
            ["rejected", "Reject request"],
          ]
        : [];
    if (
      ["pending", "confirmed"].includes(record.status) &&
      record.starts_on > today
    )
      actions.push(["cancelled", "Cancel booking"]);
    if (
      owner &&
      record.status === "confirmed" &&
      record.ends_on &&
      record.ends_on <= today
    )
      actions.push(["completed", "Mark completed"]);
    return actions;
  }
  if (record.kind === "applications" && record.status === "pending")
    return owner
      ? [
          ["approved", "Approve application"],
          ["rejected", "Reject application"],
        ]
      : [["withdrawn", "Withdraw application"]];
  if (record.kind === "tenancies" && record.status === "offered" && !owner)
    return [
      ["active", "Accept agreement"],
      ["declined", "Decline offer"],
    ];
  if (record.kind === "tenancies" && record.status === "active" && owner)
    return [["ended", "Set tenancy end"]];
  return [];
}
