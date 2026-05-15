import type { Submission } from "@/types/submission";

export function countByField(
  submissions: Submission[],
  field: keyof Submission
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of submissions) {
    const val = s[field];
    if (Array.isArray(val)) {
      for (const v of val) {
        if (typeof v === "string") {
          counts[v] = (counts[v] || 0) + 1;
        }
      }
    } else if (typeof val === "string") {
      counts[val] = (counts[val] || 0) + 1;
    }
  }
  return counts;
}

export function getTopN(
  counts: Record<string, number>,
  n: number
): { label: string; count: number }[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

export function getThisWeekCount(submissions: Submission[]): number {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  return submissions.filter((s) => new Date(s.createdAt) >= weekAgo).length;
}

export function getHighAnnoyanceCount(submissions: Submission[]): number {
  return submissions.filter(
    (s) =>
      s.annoyanceLevel === "很煩，希望優先處理" ||
      s.annoyanceLevel === "已經麻痺，每天都這樣"
  ).length;
}

export function getHighPriorityCandidates(submissions: Submission[]): Submission[] {
  const highFreq = ["每天", "每週", "每個專案都會遇到"];
  const highAnnoy = ["很煩，希望優先處理", "已經麻痺，每天都這樣"];
  const highPainPoints = ["花時間", "重複性太高", "常找不到資料", "現有系統不好用"];

  return submissions
    .filter(
      (s) =>
        highFreq.includes(s.frequency) &&
        highAnnoy.includes(s.annoyanceLevel) &&
        s.painPoints.some((p) => highPainPoints.includes(p))
    )
    .sort((a, b) => b.likeCount - a.likeCount)
    .slice(0, 10);
}

export function getDepartmentCounts(
  submissions: Submission[]
): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const s of submissions) {
    // 取最末兩層作為部門名稱，例如 "工程處 > 預算部" 而不是完整公司名
    const path = s.departmentPath;
    const dept = path.length >= 2 ? path.slice(-2).join(" > ") : path[path.length - 1] || "未知";
    counts[dept] = (counts[dept] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }));
}
