import type { Category } from "@/types/submission";

const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: "豐譽 GPT",
    keywords: [
      "GPT", "ChatGPT", "豐譽GPT", "企業GPT", "知識庫",
      "SOP", "制度", "問答系統", "內部知識",
      "公司規定", "AI客服", "公司政策", "規章",
      "找不到", "看不到", "不知道在哪", "不知道檔案",
      "標準在哪", "搜尋", "資料庫建置", "資料庫搜尋",
      "專業知識", "歷史單價", "sps",
    ],
  },
  {
    category: "AI 應用",
    keywords: [
      "AI工具", "AI應用", "導入AI", "AI導入",
      "AI輔助", "AI協助", "AI生成", "AI幫忙",
      "影像辨識", "語音辨識", "ai算", "AI算",
      "AI來幫", "使用AI", "AI比對",
    ],
  },
  {
    category: "BPM",
    keywords: [
      "簽核", "簽呈", "BPM", "審批", "簽核流程",
      "申請流程", "請購", "請款", "報銷",
      "採購流程", "用印", "預約及簽到",
      "申請單", "退票", "票據",
    ],
  },
  {
    category: "自動化作業",
    keywords: [
      "自動", "RPA", "腳本", "巨集", "批次",
      "重複", "每次都要", "一直重做", "手動",
      "複製貼上", "瑣碎",
    ],
  },
  {
    category: "Excel / 報表",
    keywords: [
      "Excel", "EXCEL", "報表", "函數", "公式",
      "樞紐", "Google Sheet", "VLOOKUP", "vlookup",
      "試算表", "彙整表", "差異製作表單",
      "進度表", "比對彙總",
    ],
  },
  {
    category: "文件整理",
    keywords: [
      "圖說", "圖面", "圖紙", "施工圖", "CAD",
      "PDF", "拆圖", "歸檔", "NAS",
      "施工計劃書", "竣工", "版次",
      "檔案太多", "文件管理", "資料庫整理",
      "規格", "裝飾圖面", "規範拆",
    ],
  },
  {
    category: "找資料 / 知識查詢",
    keywords: [
      "找不到", "看不到", "不知道在哪",
      "搞不清楚", "資料庫建置", "資料庫搜尋",
      "專業知識", "歷史單價", "sps",
      "搜尋", "版次",
    ],
  },
  {
    category: "會議紀錄",
    keywords: [
      "會議紀錄", "會議記錄", "逐字稿", "會議摘要",
      "聽打", "轉錄", "會議", "開會",
    ],
  },
  {
    category: "簡報 / 報告",
    keywords: [
      "簡報", "PPT", "PowerPoint", "做簡報",
      "週報", "月報", "進度報告", "報告",
      "日報", "日誌",
    ],
  },
  {
    category: "AI 學習",
    keywords: [
      "Prompt", "AI教育", "教育訓練",
      "不知道怎麼用", "不知道該如何開始",
      "不會用", "想學", "AI課程",
      "答非所問", "如何開始",
    ],
  },
];

export function autoClassify(s: Record<string, unknown>): Category[] {
  const text = [
    (s.problemTitle as string) ?? "",
    (s.freeText as string) ?? "",
  ].join(" ");

  const matched: Category[] = [];
  for (const rule of RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      matched.push(rule.category);
    }
  }

  return matched.length > 0 ? matched : ["未分類"];
}
