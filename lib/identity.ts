// 主題討論（及全站）共用的發言身分：存在 localStorage 的 ai-wish-personal-info
export interface Identity {
  name: string;
  deptPath: string[];
}

export function getIdentity(): Identity {
  try {
    const raw = localStorage.getItem("ai-wish-personal-info");
    if (raw) {
      const i = JSON.parse(raw);
      return {
        name: (i.name as string) ?? "",
        deptPath: Array.isArray(i.departmentPath) ? (i.departmentPath as string[]) : [],
      };
    }
  } catch {}
  return { name: "", deptPath: [] };
}

// 只更新姓名與部門，保留 personal-info 內其他欄位
export function saveIdentity(id: Identity): void {
  try {
    const raw = localStorage.getItem("ai-wish-personal-info");
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem("ai-wish-personal-info", JSON.stringify({ ...prev, name: id.name, departmentPath: id.deptPath }));
  } catch {}
}

export function identityIsSet(id: Identity): boolean {
  return !!(id.name.trim() && id.deptPath.length > 0);
}

export function deptLast(dept: string): string {
  return dept ? dept.split(" > ").slice(-1)[0] : "";
}

// 從後台登入狀態判斷是否為負責人員/管理員（數位創新處）
export function getStaffInfo(): { isStaff: boolean; name: string } {
  try {
    const role = sessionStorage.getItem("ai-wish-admin-auth");
    if (role === "editor") return { isStaff: true, name: "管理員" };
    if (role === "team") return { isStaff: true, name: sessionStorage.getItem("ai-wish-admin-assignee") || "負責人員" };
  } catch {}
  return { isStaff: false, name: "" };
}
