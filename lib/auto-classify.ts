import type { Category } from "@/types/submission";

const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: "豐譽 GPT",
    keywords: [
      "GPT", "ChatGPT", "豐譽GPT", "企業GPT", "知識庫",
      "SOP查詢", "制度查詢", "問答系統", "內部知識",
      "公司制度", "公司SOP", "公司規定", "查規定",
      "AI客服", "公司政策",
    ],
  },
  {
    category: "AI 應用",
    keywords: [
      "AI工具", "AI應用", "導入AI", "AI導入",
      "AI輔助", "AI協助", "AI生成", "AI幫忙",
      "影像辨識", "語音辨識", "ai算", "AI算",
      "生成式AI", "LLM", "Copilot",
    ],
  },
  {
    category: "BPM",
    keywords: [
      "簽核", "簽呈", "BPM", "審批", "簽核流程",
      "申請流程", "請購", "請款", "報銷",
      "採購流程", "用印", "預約及簽到",
    ],
  },
  {
    category: "自動化作業",
    keywords: [
      "自動化", "自動填", "自動產生", "自動匯出", "自動折",
      "自動轉", "自動統計", "自動彙整",
      "RPA", "腳本", "巨集", "批次",
    ],
  },
  {
    category: "Excel / 報表",
    keywords: [
      "Excel", "EXCEL", "報表", "函數", "公式",
      "樞紐", "Google Sheet", "VLOOKUP", "vlookup",
      "試算表", "彙整表",
    ],
  },
  {
    category: "文件整理",
    keywords: [
      "圖說", "圖面", "圖紙", "施工圖", "CAD",
      "PDF拆", "拆圖", "歸檔", "NAS",
      "施工計劃書", "竣工", "版次",
    ],
  },
  {
    category: "找資料 / 知識查詢",
    keywords: [
      "找不到資料", "常找不到", "不知道去哪找",
      "找不到檔案", "資料庫建置", "資料庫搜尋",
      "歷史單價", "專業知識",
    ],
  },
  {
    category: "會議紀錄",
    keywords: [
      "會議紀錄", "會議記錄", "逐字稿", "會議摘要",
      "聽打", "轉錄",
    ],
  },
  {
    category: "簡報 / 報告",
    keywords: [
      "簡報", "PPT", "PowerPoint", "做簡報",
      "週報", "月報", "進度報告",
    ],
  },
  {
    category: "AI 學習",
    keywords: [
      "Prompt", "AI教育", "教育訓練",
      "不知道怎麼用", "不知道該如何開始",
      "不會用AI", "想學AI", "AI課程",
      "答非所問",
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
