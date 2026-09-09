/** API deployment choice is explicit; Pages builds never probe nonexistent /api routes. */
const configured = (import.meta.env.VITE_CLASSROOM_API_URL ?? "").replace(/\/$/, "");
export const classroomEnabled = !!configured || import.meta.env.VITE_STANDALONE !== "1";
export function classroomApi(path: string) {
  if (!classroomEnabled) throw Error("This deployment is standalone. Classroom requires a separately hosted service.");
  return `${configured}${path}`;
}
