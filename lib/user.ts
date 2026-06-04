import { supabase } from "./supabase";

export type CurrentUserInfo = {
  userId: string;
  name: string;
  email?: string;
  avatarText?: string;
  displayName: string;
  source: "supabase" | "admin" | "localStorage";
};

function getAvatarText(name?: string, email?: string) {
  const trimmed = name?.trim();
  if (trimmed && trimmed !== "?") {
    const chineseChars = Array.from(trimmed).filter(ch => /[\u4e00-\u9fff]/.test(ch));
    if (chineseChars.length > 0) {
      return chineseChars.length >= 2 ? chineseChars.slice(-2).join("") : chineseChars[0];
    }
    const normalized = trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
    const words = normalized.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return normalized.slice(0, 2).toUpperCase();
  }
  if (email?.trim()) {
    return email.trim().charAt(0).toUpperCase();
  }
  return undefined;
}

function normalizeName(name?: string, email?: string) {
  const trimmed = name?.trim();
  if (trimmed && trimmed !== "?") return trimmed;
  if (email?.trim()) return email.trim().split("@")[0];
  return "";
}

function getAdminUserFromSessionStorage(): CurrentUserInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const role = sessionStorage.getItem("ai-wish-admin-auth");
    const assignee = sessionStorage.getItem("ai-wish-admin-assignee");
    if (role === "editor") {
      const name = "管理者";
      return {
        userId: "admin-editor",
        name,
        displayName: name,
        avatarText: getAvatarText(name),
        source: "admin",
      };
    }
    if (role === "team" && assignee) {
      const name = assignee;
      return {
        userId: `admin-team-${name}`,
        name,
        displayName: name,
        avatarText: getAvatarText(name),
        source: "admin",
      };
    }
  } catch (error) {
    console.error("[getAdminUserFromSessionStorage] failed", error);
  }
  return null;
}

function getLocalStoragePersonalInfo(): CurrentUserInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ai-wish-personal-info");
    if (!raw) return null;
    const info = JSON.parse(raw);
    const name = info?.name?.trim();
    if (!name) return null;
    return {
      userId: `local-${name}`,
      name,
      displayName: name,
      avatarText: getAvatarText(name),
      source: "localStorage",
    };
  } catch (error) {
    console.error("[getLocalStoragePersonalInfo] failed", error);
  }
  return null;
}

export async function getCurrentUserDisplayInfo(): Promise<CurrentUserInfo | null> {
  if (typeof window === "undefined") return null;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error("[getCurrentUserDisplayInfo] supabase auth error", error);
    }
    const user = data?.session?.user;
    if (user) {
      const email = user.email ?? undefined;
      const metadata: any = user.user_metadata ?? {};
      const name = (metadata?.display_name || metadata?.full_name || metadata?.name || normalizeName(undefined, email)) as string;
      const displayName = normalizeName(name, email) || "未綁定帳號";
      return {
        userId: user.id || email || "unknown",
        name: name || displayName,
        displayName,
        email,
        avatarText: getAvatarText(name, email),
        source: "supabase",
      };
    }
  } catch (error) {
    console.error("[getCurrentUserDisplayInfo] supabase session fetch failed", error);
  }

  const local = getLocalStoragePersonalInfo();
  if (local) return local;

  const admin = getAdminUserFromSessionStorage();
  if (admin) return admin;

  return null;
}
