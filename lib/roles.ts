export function formatRosterRole(roleStr: string) {
  const isCap = roleStr ? roleStr.toUpperCase().includes("CAPTAIN") : false;
  const isOwner = roleStr ? roleStr.toUpperCase().includes("OWNER") : false;
  let baseRole = "CORE";

  if (roleStr && roleStr.toUpperCase().includes("COACH")) {
    baseRole = "COACH";
  } else if (roleStr && roleStr.toUpperCase().includes("SUB")) {
    baseRole = "SUBSTITUTE";
  } else if (roleStr && roleStr.toUpperCase() === "OWNER") {
    baseRole = "OWNER";
  }

  return {
    isCaptain: isCap,
    isOwner: isOwner,
    baseRole,
    label: baseRole === "OWNER" ? "ВЛАДЕЛЕЦ" : baseRole === "COACH" ? "ТРЕНЕР" : baseRole === "SUBSTITUTE" ? "ЗАМЕНА" : "ОСНОВА",
  };
}
