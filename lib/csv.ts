import type { Submission } from "@/types/submission";

function escapeCsv(value: string | number | boolean | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(submissions: Submission[]): void {
  const headers = [
    "填寫時間",
    "完整單位路徑",
    "部門層級",
    "姓名",
    "問題標題",
    "痛點",
    "現況處理方式",
    "資料來源",
    "頻率",
    "煩人程度",
    "AI / 工具需求",
    "公開程度",
    "狀態",
    "優先級",
    "分類",
    "是否顯示",
    "按讚數",
    "管理者備註",
    "公開摘要",
  ];

  const rows = submissions.map((s) => [
    escapeCsv(new Date(s.createdAt).toLocaleString("zh-TW")),
    escapeCsv(s.departmentFullPath),
    escapeCsv(s.departmentPath.join(" > ")),
    escapeCsv(s.name),
    escapeCsv(s.problemTitle),
    escapeCsv(s.painPoints.join("、")),
    escapeCsv(s.currentMethods.join("、")),
    escapeCsv(s.dataSources.join("、")),
    escapeCsv(s.frequency),
    escapeCsv(s.annoyanceLevel),
    escapeCsv(s.aiNeeds.join("、")),
    escapeCsv(s.shareMode),
    escapeCsv(s.status),
    escapeCsv(s.priority),
    escapeCsv(s.category),
    escapeCsv(s.isVisible ? "是" : "否"),
    escapeCsv(s.likeCount),
    escapeCsv(s.adminNote),
    escapeCsv(s.publicSummary),
  ]);

  const csvContent =
    "\uFEFF" + // BOM for Excel
    [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `AI許願池_${new Date().toISOString().split("T")[0]}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
