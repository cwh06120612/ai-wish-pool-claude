export type DepartmentOption = {
  label: string;
  children?: DepartmentOption[];
};

// 從公司-部門對照清單.xlsx 轉換
export const departments: DepartmentOption[] = [
  { label: "豐譽聯合工程股份有限公司", children: [
    { label: "中區工程一所" },
    { label: "中區工程二所" },
    { label: "中區工程處", children: [
      { label: "台水辦公園區", children: [
        { label: "品管組" },
        { label: "施工一組" },
        { label: "施工三組" },
        { label: "施工二組" },
        { label: "職安組" },
        { label: "行政組" },
        { label: "規劃組" },
      ] },
      { label: "工務組" },
      { label: "職安組" },
      { label: "行政組" },
    ] },
    { label: "休閒事業處", children: [
      { label: "Wuma渡假村" },
      { label: "農業經營組" },
      { label: "開發行政組" },
    ] },
    { label: "北區工程一所" },
    { label: "北區工程三所" },
    { label: "北區工程二所" },
    { label: "北區工程處", children: [
      { label: "專管中心" },
      { label: "工務中心" },
      { label: "新光人壽南東大樓新建工程", children: [
        { label: "品管組" },
        { label: "安衛組" },
        { label: "施工組" },
        { label: "機電組" },
        { label: "規劃組" },
      ] },
      { label: "新光南港BOT新建大樓", children: [
        { label: "安衛組" },
        { label: "施工組" },
        { label: "機電組" },
        { label: "規劃組" },
      ] },
      { label: "新光友誼大樓", children: [
        { label: "施工組" },
        { label: "規劃組" },
      ] },
      { label: "新光合纖南港總部", children: [
        { label: "品管組" },
        { label: "安衛組" },
        { label: "成控組" },
        { label: "施工組" },
        { label: "機電組" },
        { label: "行政組" },
        { label: "規劃組" },
      ] },
      { label: "新光杭北建築工程", children: [
        { label: "施工組" },
      ] },
      { label: "新光纖維大樓結構工程" },
      { label: "林口國檔館", children: [
        { label: "施工組" },
      ] },
      { label: "行政中心" },
      { label: "食藥署實驗大樓", children: [
        { label: "品管組" },
        { label: "安衛組" },
        { label: "施工組" },
        { label: "行政組" },
        { label: "規劃組" },
      ] },
    ] },
    { label: "台南工程處", children: [
      { label: "世聯倉儲台南廠" },
      { label: "台南家樂福崇明商場" },
      { label: "川湖二廠" },
      { label: "豐泰HQ廠區Z棟大樓" },
    ] },
    { label: "執行長" },
    { label: "宜蘭工程處", children: [
      { label: "立行倉儲物流" },
      { label: "仙豐蘇澳廠" },
      { label: "威獅倉儲物流" },
      { label: "泓創宜科廠" },
    ] },
    { label: "技術暨品保處", children: [
      { label: "BIM中心" },
      { label: "品保中心" },
      { label: "技師室" },
    ] },
    { label: "數位創新處" },
    { label: "機電處", children: [
      { label: "機電工務組" },
      { label: "機電業務組" },
      { label: "機電規劃組" },
    ] },
    { label: "法務室" },
    { label: "競研處", children: [
      { label: "採購中心" },
      { label: "數位部" },
      { label: "標務中心" },
      { label: "預算部" },
    ] },
    { label: "系模工程處" },
    { label: "總工程師室" },
    { label: "總管理處", children: [
      { label: "人資部" },
      { label: "總務部" },
      { label: "財務部" },
    ] },
    { label: "總經理" },
    { label: "總經理室" },
    { label: "職安室" },
    { label: "董事會" },
    { label: "豐譽聯合工程股份有限公司(外籍同仁)" },
    { label: "豐譽聯合工程股份有限公司(非正職)" },
    { label: "開發處", children: [
      { label: "休閒事業專案" },
      { label: "設計組" },
      { label: "開發組" },
      { label: "開發規劃組" },
    ] },
    { label: "高屏工程處", children: [
      { label: "富邦凹子底基樁" },
      { label: "新光前金新建工程", children: [
        { label: "品管組" },
        { label: "工務規劃組" },
        { label: "施工組" },
        { label: "職安組" },
        { label: "行政組" },
      ] },
      { label: "高屏一所" },
      { label: "高雄佛教堂", children: [
        { label: "品管組" },
        { label: "工務組" },
        { label: "施工組" },
        { label: "機電組" },
        { label: "職安組" },
        { label: "行政組" },
        { label: "規劃組" },
      ] },
      { label: "鳳山車站開發大樓", children: [
        { label: "職安組" },
      ] },
    ] }
  ] },
  { label: "豐譽營造股份有限公司", children: [
    { label: "中區工程一所" },
    { label: "中區工程二所" },
    { label: "中區工程處", children: [
      { label: "台中新光三越整修工程" },
      { label: "工務組" },
      { label: "朴子安居社宅", children: [
        { label: "品管組" },
        { label: "施工組" },
        { label: "職安組" },
        { label: "行政組" },
        { label: "規劃組" },
      ] },
      { label: "虎尾社宅", children: [
        { label: "品管組" },
        { label: "施工一組" },
        { label: "施工二組" },
        { label: "機電組" },
        { label: "職安組" },
        { label: "行政組" },
        { label: "規劃組" },
      ] },
    ] },
    { label: "休閒事業處", children: [
      { label: "Wuma員工宿舍" },
      { label: "Wuma渡假村" },
    ] },
    { label: "北區工程一所" },
    { label: "北區工程三所" },
    { label: "北區工程二所" },
    { label: "北區工程處", children: [
      { label: "CDC防疫中心", children: [
        { label: "品管組" },
        { label: "圖管組" },
        { label: "安衛組" },
        { label: "施工組" },
        { label: "行政組" },
        { label: "規劃組" },
      ] },
      { label: "公西聯合檔案庫房", children: [
        { label: "品管組" },
        { label: "安衛組" },
        { label: "施工組" },
        { label: "行政組" },
        { label: "規劃組" },
      ] },
      { label: "專管中心" },
      { label: "工務中心" },
      { label: "新光南港BOT新建大樓", children: [
        { label: "安衛組" },
      ] },
      { label: "林口國檔館", children: [
        { label: "品管組" },
        { label: "施工組" },
      ] },
      { label: "行政中心" },
      { label: "豐譽中壢廠" },
    ] },
    { label: "台南工程處", children: [
      { label: "億載社宅統包工程" },
      { label: "平實安居社宅" },
      { label: "貿聯台南廠機械室工程" },
    ] },
    { label: "執行長" },
    { label: "宜蘭工程處", children: [
      { label: "中科院宜蘭N020" },
      { label: "坤門安居社宅" },
      { label: "普威二期" },
      { label: "欣德芮宜科廠" },
    ] },
    { label: "宜蘭工程處專案" },
    { label: "技術暨品保處", children: [
      { label: "BIM中心" },
      { label: "技師室" },
    ] },
    { label: "機電處", children: [
      { label: "機電工務組" },
    ] },
    { label: "永續科技事業處" },
    { label: "競研處" },
    { label: "總管理處", children: [
      { label: "人資部" },
    ] },
    { label: "總經理" },
    { label: "總經理室" },
    { label: "職安室" },
    { label: "董事會" },
    { label: "豐譽營造股份有限公司(外籍同仁)" },
    { label: "豐譽營造股份有限公司(非正職)" },
    { label: "開發處" },
    { label: "高屏工程處", children: [
      { label: "屏科實驗中學校舍新建工程", children: [
        { label: "內業組" },
        { label: "施工組" },
        { label: "職安組" },
        { label: "行政組" },
      ] },
      { label: "高屏一所" },
      { label: "高雄中油綠能大樓", children: [
        { label: "工務品保組" },
        { label: "施工組" },
        { label: "職安組" },
        { label: "行政組" },
        { label: "規劃組" },
      ] },
      { label: "鳳山車站開發大樓", children: [
        { label: "內業組" },
        { label: "施工組" },
        { label: "機電組" },
        { label: "職安組" },
        { label: "行政組" },
      ] },
    ] }
  ] },
  { label: "晉宇開發股份有限公司", children: [
    { label: "休閒事業專案" },
    { label: "休閒事業處", children: [
      { label: "渡假村經營組" },
      { label: "渡假村經營組1" },
      { label: "渡假村經營組2" },
      { label: "渡假村經營組3" },
      { label: "渡假村經營組4" },
      { label: "農業經營組" },
      { label: "開發行政組" },
    ] },
    { label: "執行長" },
    { label: "營運籌備處" },
    { label: "總經理" },
    { label: "總經理室" },
    { label: "董事會" },
    { label: "開發處" },
    { label: "開發規劃組" }
  ] },
  { label: "德圓開發股份有限公司", children: [
    { label: "執行長" },
    { label: "總經理" },
    { label: "總經理室" },
    { label: "董事會" }
  ] },
  { label: "豐譽智慧動能股份有限公司", children: [
    { label: "執行長" },
    { label: "智慧動能事業處" },
    { label: "總經理" },
    { label: "總經理室" },
    { label: "董事會" }
  ] },
  { label: "豐譽永續科技股份有限公司", children: [
    { label: "執行長" },
    { label: "新應用水處理組" },
    { label: "永續事業處", children: [
      { label: "技術組" },
      { label: "業務組" },
      { label: "行政管理組" },
    ] },
    { label: "永續科技事業處", children: [
      { label: "技術組" },
      { label: "業務組" },
      { label: "行政管理組" },
    ] },
    { label: "總經理" },
    { label: "董事會" }
  ] },
  { label: "豐譽綠色科技股份有限公司", children: [
    { label: "執行長" },
    { label: "綠色科技事業處" },
    { label: "總經理" },
    { label: "董事會" }
  ] },
  { label: "拓璞工程數位科技股份有限公司", children: [
    { label: "拓璞工程", children: [
      { label: "前端軟體組" },
      { label: "後端軟體組" },
      { label: "行政業務組" },
    ] },
    { label: "總經理" }
  ] }
];
