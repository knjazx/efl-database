export function formatRosterRole(roleStr: string) {
  const isCap = roleStr ? roleStr.toUpperCase().includes("CAPTAIN") : false;
  let baseRole = "CORE";

  if (roleStr && roleStr.toUpperCase().includes("COACH")) {
    baseRole = "COACH";
  } else if (roleStr && roleStr.toUpperCase().includes("SUB")) {
    baseRole = "SUBSTITUTE";
  }

  return {
    isCaptain: isCap,
    baseRole,
    label: baseRole === "COACH" ? "Тренер" : baseRole === "SUBSTITUTE" ? "Замена" : "Основа",
  };
}
