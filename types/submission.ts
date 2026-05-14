export type ShareMode =
  | "願意分享（公開內容、部門、姓名）"
  | "匿名分享（公開內容，但不顯示部門姓名）"
  | "不公開（只給數位創新處後台查看）";

export type Status =
  | "已收到"
  | "整理中"
  | "評估中"
  | "尋找工具中"
  | "測試中"
  | "已導入"
  | "暫不處理";

export type Priority = "高優先" | "中優先" | "低優先" | "待評估";

export type Category =
  | "找資料 / 知識查詢"
  | "會議紀錄"
  | "Excel / 報表"
  | "文件整理"
  | "簡報 / 報告"
  | "自動化作業"
  | "AI 學習"
  | "BPM"
  | "其他"
  | "未分類";

export type Submission = {
  id: string;
  createdAt: string;
  departmentPath: string[];
  departmentFullPath: string;
  name: string;
  problemTitle: string;
  painPoints: string[];
  currentMethods: string[];
  dataSources: string[];
  frequency: string;
  annoyanceLevel: string;
  aiNeeds: string[];
  shareMode: ShareMode;
  status: Status;
  priority: Priority;
  category: Category;
  adminNote: string;
  publicSummary: string;
  isVisible: boolean;
  likeCount: number;
  likers?: { name: string; dept: string }[];
  isExample?: boolean;
  freeText: string;
};
