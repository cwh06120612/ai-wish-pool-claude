import type { Category } from "@/types/submission";

const RULES: { category: Category; keywords: string[] }[] = [
  {
    category: "豐譽 GPT",
    keywords: [
      "GPT", "ChatGPT", "豐譽GPT", "公司GPT", "企業GPT",
      "內部AI", "知識庫", "SOP查詢", "制度查詢", "問答系統",
      "公司內部", "內部知識", "公司規定", "公司制度", "公司SOP",
      "公司政策", "內部規範", "人事規定", "查規定",
      "找資料", "搜尋", "查詢", "找不到", "知識", "資料庫",
      "查找", "法規", "規範", "查資料", "資訊", "找不到資料",
      "找資訊", "外部知識", "文獻", "參考資料", "常找不到",
      "不知道去哪找",
    ],
  },
  {
    category: "AI 應用",
    keywords: [
      "AI工具", "AI應用", "人工智慧", "機器學習", "影像辨識",
      "語音辨識", "自動摘要", "自動翻譯", "智慧分析", "導入AI",
      "AI導入", "想用AI", "AI幫忙", "AI輔助", "AI協助",
      "AI生成", "生成式AI", "大語言模型", "LLM", "Copilot",
    ],
  },
  {
    category: "BPM",
    keywords: [
      "流程", "審核", "簽核", "簽呈", "BPM", "工作流", "審批",
      "表單流程", "跨部門", "核准", "申請流程", "請購", "請款",
      "報銷", "費用申請", "採購流程", "層層審核", "等待審核",
      "跑流程", "走流程",
    ],
  },
  {
    category: "自動化作業",
    keywords: [
      "自動化", "自動填", "RPA", "腳本", "巨集", "排程",
      "自動匯出", "自動產生", "批次", "每次都要", "重複性",
      "一直重做", "每次重做", "手動輸入", "手動填",
      "複製貼上", "一直複製", "重複動作", "重複操作",
    ],
  },
  {
    category: "Excel / 報表",
    keywords: [
      "Excel", "報表", "表格", "樞紐", "函數", "公式",
      "試算表", "Google Sheet", "數據分析", "彙整", "彙總",
      "數字整理", "計算", "加總", "VLOOKUP", "vlookup",
    ],
  },
  {
    category: "文件整理",
    keywords: [
      "文件", "檔案", "整理", "分類", "PDF", "Word",
      "圖說", "圖面", "掃描", "數位化", "NAS", "歸檔",
      "存檔", "找檔案", "找文件", "文件管理", "版本",
      "圖紙", "施工圖", "竣工", "合約", "合同", "資料夾",
    ],
  },
  {
    category: "找資料 / 知識查詢",
    keywords: [
      "找資料", "搜尋", "查詢", "找不到", "知識", "資料庫",
      "查找", "法規", "規範", "查資料", "資訊", "找不到資料",
      "找資訊", "外部知識", "文獻", "參考資料", "常找不到",
      "不知道去哪找",
    ],
  },
  {
    category: "會議紀錄",
    keywords: [
      "會議", "紀錄", "逐字稿", "錄音", "摘要",
      "會議記錄", "開會", "會後", "議程", "決議",
      "會議結論", "整理會議", "會議重點", "轉錄", "轉成文字", "聽打",
    ],
  },
  {
    category: "簡報 / 報告",
    keywords: [
      "簡報", "PPT", "PowerPoint", "提案", "簡介", "投影片",
      "做簡報", "製作簡報", "週報", "月報", "進度報告",
      "成果報告", "對外報告", "呈報", "向上呈報",
    ],
  },
  {
    category: "AI 學習",
    keywords: [
      "學習", "培訓", "教學", "課程", "Prompt", "AI教育",
      "教育訓練", "怎麼用", "不知道怎麼用", "AI使用",
      "不會用", "想學", "學會", "練習", "入門",
    ],
  },
];

export function autoClassify(s: Record<string, unknown>): Category[] {
  const text = [
    (s.problemTitle as string) ?? "",
    (s.freeText as string) ?? "",
    ...((s.painPoints as string[]) ?? []),
    ...((s.aiNeeds as string[]) ?? []),
    ...((s.currentMethods as string[]) ?? []),
  ].join(" ");

  const matched: Category[] = [];
  for (const rule of RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      matched.push(rule.category);
    }
  }

  return matched.length > 0 ? matched : ["未分類"];
}
