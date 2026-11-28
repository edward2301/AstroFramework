import type { Locale } from './routing';

/**
 * 界面文案字典。
 *
 * 只放「界面骨架」的文案：导航、按钮、栏目标题、字段标签、提示语。
 * 产品自身的文字（品类名、型号名、规格、采购信息）属于内容，存在 content 下的
 * JSON 里，由各条目的 `zh` 字段提供译文 —— 两者边界不能混，否则翻译要么散落在
 * 组件里，要么被塞进字典里变成一坨。
 *
 * 带参数的条目写成函数，避免在模板里拼字符串导致语序无法调整。
 */
export interface Dict {
  /**
   * 通用按钮文案（正文 CTA、页头按钮）。
   *
   * 导航栏目标签、页面标题（h1）都**不在这里** —— 它们属于页面本身，写在
   * `src/data/pages/entries/*.ts`（`nav.label` / `heading`）。
   * 两处都留一份会导致改了一处、另一处不生效。
   */
  nav: {
    products: string;
    quote: string;
  };
  header: {
    menu: string;
    skipToContent: string;
    mainNavAria: string;
    mobileNavAria: string;
    /** 切换到某语言时的无障碍标签，参数为该语言显示名 */
    switchAria: (target: string) => string;
  };
  /** 详情页底部询价横条的标题 */
  cta: {
    title: string;
  };
  home: {
    h1: string;
    lead: (categories: number, models: number) => string;
    browseProducts: string;
    requestQuote: string;
    categories: string;
    selectedModels: string;
    viewModels: string;
    /** 首页信任条：三条可核验事实 + 认证页链接（措辞取自 /certifications/） */
    trust: {
      facts: string[];
      link: string;
    };
  };
  products: {
    h1: string;
    lead: (categories: number, models: number) => string;
    /** 品类行按钮：动作 + 型号数 */
    categoriesUnit: (count: number) => string;
    modelsUnit: (count: number) => string;
    /** 全型号目录：筛选、搜索、表头与空态 */
    filterAll: string;
    filterLabel: string;
    searchLabel: string;
    searchPlaceholder: string;
    resultCount: (count: number) => string;
    /** 目录计数用单数与复数单位（JS 过滤后重算文案） */
    modelUnit: string;
    modelUnitPlural: string;
    empty: string;
    tableHint: string;
    loadMore: string;
    showingCount: (shown: number, total: number) => string;
    allShown: (total: number) => string;
    modelColumn: string;
    keyParamsColumn: string;
    statusColumn: string;
    detailsColumn: string;
    active: string;
  };
  category: {
    discontinued: string;
    discontinuedNote: (count: number) => string;
    howToSelect: string;
    /** 型号卡片网格的标题 */
    modelsTitle: string;
    /** 页面尾部品类说明区块的标题 */
    about: string;
    /** N 项参数（侧栏事实行用） */
    paramsUnit: (count: number) => string;
    /** 型号卡上的详情链接文案 */
    detailLink: string;
    /** 采购信息标签（PurchaseFacts）：起订量 / 交货期 / 付款方式 */
    moq: string;
    leadTime: string;
    payment: string;
  };
  model: {
    discontinuedTitle: string;
    superseded: string;
    support: string;
    quote: string;
    datasheet: string;
    specs: string;
    dimensionsAndCompliance: string;
    dimensions: string;
    interface: string;
    certifications: string;
    replacement: string;
    applications: string;
    relatedCases: string;
    /** 同品类其他型号（型号页横向内链） */
    otherModels: string;
  };
  /** 详情页（应用方向 / 案例 / 指南 / 问答）的字段标签，语言无关的正文来自内容条目 */
  detail: {
    condition: string;
    criteria: string;
    recommendedModels: string;
    cautions: string;
    background: string;
    requirements: string;
    selection: string;
    results: string;
    configuredModels: string;
    date: (date: string) => string;
    updated: (date: string) => string;
    relatedModels: string;
    relatedFaqs: string;
  };
  quote: {
    h1: string;
    lead: string;
    whatToInclude: string;
    items: string[];
    email: string;
    browseFirst: string;
    directContact: string;
    emailLabel: string;
    telLabel: string;
    addressLabel: string;
    subject: string;
    formTitle: string;
    fModel: string;
    fQty: string;
    fConditions: string;
    fCompany: string;
    fName: string;
    fEmail: string;
    fNotes: string;
    submit: string;
    formHint: string;
    /** 询价流程三步（提交 → 回复 → 确认） */
    steps: string[];
    /** 邮件客户端未打开时的兜底提示 */
    fallbackHint: string;
    errRequired: string;
    errEmail: string;
  };
  notFound: {
    h1: string;
    lead: string;
    backHome: string;
    browseProducts: string;
    requestQuote: string;
  };

  aboutPage: {
    contactTitle: string;
    /** 响应承诺指标：数字与单位分开，页面不硬编码 */
    responseValue: string;
    responseLabel: string;
    sections: { t: string; d: string }[];
  };
  footer: {
    rights: string;
    /**
     * 页脚分区标题。分区内的链接文案属于各个页面条目（`nav.footer.label`），
     * 不在这里重复一份。
     */
    columns: {
      products: string;
      applications: string;
      resources: string;
      company: string;
      contact: string;
    };
  };
  /** 栏目页（应用/案例/指南/问答/下载）的空状态与替代入口 */
  section: {
    statusTitle: string;
    quality: string;
    related: string;
    items: string;
    /** 栏目指标的标签 */
    modelsCovered: string;
    /** 合规标准（认证页指标用） */
    standards: string;
    /** 认证页首指标的单位（"7 份合规文件"） */
    files: string;
    docTypes: string;
    clusters: string;
    /** 问答主题标签（枚举值到显示文案的映射） */
    clusterLabels: Record<'selection' | 'params' | 'install' | 'troubleshoot', string>;
  };
  breadcrumb: {
    aria: string;
    home: string;
    /** 产品层级的面包屑文案；其他页面的当前项文案由各自条目提供 */
    products: string;
  };
}

const en: Dict = {
  nav: {
    products: 'Products',
    quote: 'Request a Quote',
  },
  header: {
    menu: 'Menu',
    skipToContent: 'Skip to content',
    mainNavAria: 'Main navigation',
    mobileNavAria: 'Mobile navigation',
    switchAria: (target) => `Switch to ${target}`,
  },
  cta: {
    title: 'Not sure which model fits? Send us the operating conditions and we will confirm the suitable model.',
  },
  home: {
    h1: 'Industrial components, specified down to the last parameter',
    lead: (categories, models) =>
      `${categories} product categories, ${models} standard models. Every model page carries full specifications and dimensional data, with datasheets where available.`,
    browseProducts: 'Browse products',
    requestQuote: 'Request a Quote',
    categories: 'Product categories',
    selectedModels: 'Select by application',
    viewModels: 'View models',
    trust: {
      facts: [
        'CE / RoHS status marked on every model',
        'Inspection records issued per batch and shipped with the goods',
        'Declarations of conformity and test reports per model, with version numbers',
      ],
      link: 'Quality and certifications',
    },
  },
  products: {
    h1: 'Product catalog',
    lead: (categories, models) =>
      `${categories} categories and ${models} models, each with full specifications, mounting dimensions and datasheet links. Filter by category or search the full catalog, then open any model for the complete picture.`,
    categoriesUnit: (count) => `${count} categories`,
    modelsUnit: (count) => `${count} models`,
    filterAll: 'All models',
    filterLabel: 'Filter by category',
    searchLabel: 'Search models',
    searchPlaceholder: 'Model code, name or parameter',
    resultCount: (count) => `${count} ${count === 1 ? 'model' : 'models'}`,
    modelUnit: 'model',
    modelUnitPlural: 'models',
    empty: 'No models match this filter.',
    tableHint: 'Swipe horizontally to see all columns.',
    loadMore: 'Load more models',
    showingCount: (shown, total) => `Showing ${shown} of ${total} models`,
    allShown: (total) => `All ${total} models shown`,
    modelColumn: 'Model',
    keyParamsColumn: 'Key parameters',
    statusColumn: 'Status',
    detailsColumn: 'Details',
    active: 'Active',
  },
  category: {
    discontinued: 'Discontinued',
    discontinuedNote: (count) =>
      `Includes ${count} discontinued ${count === 1 ? 'model' : 'models'}, marked for reference. Replacement options are listed on each model page.`,
    howToSelect: 'How to select',
    modelsTitle: 'Models',
    about: 'About this category',
    paramsUnit: (count) => `${count} parameters`,
    detailLink: 'View details →',
    moq: 'MOQ',
    leadTime: 'Lead time',
    payment: 'Payment',
  },
  model: {
    discontinuedTitle: 'This model has been discontinued.',
    superseded: ' It is superseded by the models listed under Replacement below.',
    support: ' Spare parts and service support remain available — contact us for details.',
    quote: 'Request a quote',
    datasheet: 'Download datasheet (PDF)',
    specs: 'Specifications',
    dimensionsAndCompliance: 'Dimensions and compliance',
    dimensions: 'Dimensions',
    interface: 'Interface',
    certifications: 'Certifications',
    replacement: 'Replacement',
    applications: 'Applications',
    relatedCases: 'Related case studies',
    otherModels: 'Other models in this category',
  },
  detail: {
    condition: 'Operating conditions',
    criteria: 'Matching criteria',
    recommendedModels: 'Recommended models',
    cautions: 'Cautions',
    background: 'Background',
    requirements: 'Customer requirements',
    selection: 'Model selection',
    results: 'Field results',
    configuredModels: 'Configured models',
    date: (date) => `Published ${date}`,
    updated: (date) => `Updated ${date}`,
    relatedModels: 'Related models',
    relatedFaqs: 'Related questions',
  },
  quote: {
    h1: 'Request a quote',
    lead: 'Send the model codes and quantities you need. We reply with unit price, lead time and available alternatives, usually within one working day.',
    whatToInclude: 'What to include',
    items: [
      'Model code, for example A1-200 or B1-100',
      'Required quantity and target delivery date',
      'Process medium, range and connection if you need a selection check',
      'Destination country and preferred Incoterm',
    ],
    email: 'Email a quote request',
    browseFirst: 'Browse the catalog first',
    directContact: 'Direct contact',
    emailLabel: 'Email',
    telLabel: 'Telephone',
    addressLabel: 'Address',
    subject: 'Quote request — model, quantity and destination',
    formTitle: 'Send a request',
    fModel: 'Model code',
    fQty: 'Quantity',
    fConditions: 'Operating conditions',
    fCompany: 'Company',
    fName: 'Contact name',
    fEmail: 'Email',
    fNotes: 'Notes',
    submit: 'Open email draft',
    formHint: 'The form opens your mail client with the details filled in. Nothing is sent automatically.',
    fallbackHint:
      'If your mail client did not open, copy the text below and send it to the address on the right.',
    steps: [
      'Send the model, quantity and operating conditions.',
      'We reply within one working day with price, lead time and alternatives.',
      'Confirm the model and lead time; the same team follows the order through.',
    ],
    errRequired: 'Please fill in the required fields.',
    errEmail: 'Please enter a valid email address.',
  },
  notFound: {
    h1: 'This page does not exist',
    lead: 'The address may have changed, or the model may have been retired. The product range and quote form are still one click away.',
    backHome: 'Back to homepage',
    browseProducts: 'Browse products',
    requestQuote: 'Request a quote',
  },
    "aboutPage": {
      "responseValue": "1",
      "responseLabel": "working day reply",
      "contactTitle": "Direct contact",
      "sections": [
        {
          "t": "Production and inspection",
          "d": "Production follows documented work instructions with incoming and outgoing inspection on every batch. Specifications are version-controlled, and each shipment can be matched to its test records."
        },
        {
          "t": "Documentation you can audit",
          "d": "Every model ships with a datasheet, dimensional drawing and compliance certificates. Documents carry version numbers so procurement can audit what was quoted against what was delivered."
        },
        {
          "t": "Response commitments",
          "d": "Quote requests are answered within one working day with unit price, lead time and suitable alternatives. After-sales issues are handled by the same team that handled the original enquiry."
        }
      ]
    },
  footer: {
    rights: 'All rights reserved.',
    columns: {
      products: 'Products',
      applications: 'Applications',
      resources: 'Resources',
      company: 'Company',
      contact: 'Contact',
    },
  },
  section: {
    statusTitle: 'Current status',
    quality: 'Quality and certifications',
    related: 'Related pages',
    items: 'In this section',
    modelsCovered: 'Models covered',
    standards: 'Standards',
    files: 'compliance files',
    docTypes: 'Document types',
    clusters: 'Topics',
    clusterLabels: {
      selection: 'Selection',
      params: 'Parameters',
      install: 'Installation',
      troubleshoot: 'Troubleshooting',
    },
  },
  breadcrumb: {
    aria: 'Breadcrumb',
    home: 'Home',
    products: 'Products',
  },
};

const zh: Dict = {
  nav: {
    products: '产品中心',
    quote: '获取报价',
  },
  header: {
    menu: '菜单',
    skipToContent: '跳到正文',
    mainNavAria: '主导航',
    mobileNavAria: '移动端导航',
    switchAria: (target) => `切换到 ${target}`,
  },
  cta: {
    title: '不确定选哪款？把工况发给我们，帮你确认型号与货期',
  },
  home: {
    h1: '工业品选型，参数精确到每一项',
    lead: (categories, models) =>
      `现有 ${categories} 个品类、${models} 个标准型号。每个型号页都提供完整规格与安装尺寸，可下载的资料一并列出。`,
    browseProducts: '浏览产品',
    requestQuote: '获取报价',
    categories: '产品品类',
    selectedModels: '按应用选型',
    viewModels: '查看型号',
    trust: {
      facts: [
        '全系型号标注 CE / RoHS 合规状态',
        '逐批出厂检验，检验记录随货可查',
        '合格声明与检验报告按型号出具，带版本号',
      ],
      link: '查看认证与质量',
    },
  },
  products: {
    h1: '产品目录',
    lead: (categories, models) =>
      `共 ${categories} 个品类、${models} 个型号，每个型号页都提供完整规格、安装尺寸与资料下载。可按品类筛选或搜索全部型号，再进入型号页查看全部细节。`,
    categoriesUnit: (count) => `${count} 个品类`,
    modelsUnit: (count) => `${count} 个型号`,
    filterAll: '全部型号',
    filterLabel: '按品类筛选',
    searchLabel: '搜索型号',
    searchPlaceholder: '型号编码、名称或参数',
    resultCount: (count) => `${count} 个型号`,
    modelUnit: '个型号',
    modelUnitPlural: '个型号',
    empty: '没有符合条件的型号。',
    tableHint: '左右滑动查看完整参数。',
    loadMore: '加载更多型号',
    showingCount: (shown, total) => `已显示 ${shown} / ${total} 个型号`,
    allShown: (total) => `已显示全部 ${total} 个型号`,
    modelColumn: '型号',
    keyParamsColumn: '关键参数',
    statusColumn: '状态',
    detailsColumn: '详情',
    active: '在售',
  },
  category: {
    discontinued: '已停产',
    discontinuedNote: (count) =>
      `其中 ${count} 个型号已停产，保留页面供查阅。替代型号列在各型号页的「替代型号」中。`,
    howToSelect: '选型要点',
    modelsTitle: '型号一览',
    about: '品类说明',
    paramsUnit: (count) => `${count} 项参数`,
    detailLink: '查看详情 →',
    moq: '起订量',
    leadTime: '交货期',
    payment: '付款方式',
  },
  model: {
    discontinuedTitle: '该型号已停产。',
    superseded: ' 替代型号见下方「替代型号」一栏。',
    support: ' 备件与售后支持仍然提供，详情请联系我们。',
    quote: '获取报价',
    datasheet: '下载规格书（PDF）',
    specs: '技术规格',
    dimensionsAndCompliance: '尺寸与合规',
    dimensions: '外形尺寸',
    interface: '接口定义',
    certifications: '认证',
    replacement: '替代型号',
    applications: '适用方向',
    relatedCases: '相关案例',
    otherModels: '同品类其他型号',
  },
  detail: {
    condition: '适用工况',
    criteria: '匹配条件',
    recommendedModels: '适用型号',
    cautions: '注意事项',
    background: '案例背景',
    requirements: '客户需求',
    selection: '选型说明',
    results: '运行效果',
    configuredModels: '配置型号',
    date: (date) => `发布于 ${date}`,
    updated: (date) => `更新于 ${date}`,
    relatedModels: '相关型号',
    relatedFaqs: '相关问题',
  },
  quote: {
    h1: '获取报价',
    lead: '请提供所需型号与数量，我们通常在 1 个工作日内回复单价、交货期与可选替代方案。',
    whatToInclude: '建议提供以下信息',
    items: [
      '型号编码，例如 A1-200 或 B1-100',
      '需求数量与期望交货日期',
      '如需协助选型，请说明介质、量程与接口',
      '目的国与偏好的贸易术语',
    ],
    email: '发送询价邮件',
    browseFirst: '先浏览产品目录',
    directContact: '直接联系',
    emailLabel: '邮箱',
    telLabel: '电话',
    addressLabel: '地址',
    subject: '询价 — 型号、数量与目的国',
    formTitle: '填写询价信息',
    fModel: '型号编码',
    fQty: '数量',
    fConditions: '工况条件',
    fCompany: '公司名称',
    fName: '联系人',
    fEmail: '邮箱',
    fNotes: '备注',
    submit: '生成询价邮件',
    formHint: '提交后会打开你的邮件客户端并预填以上内容，不会自动发送。',
    fallbackHint: '如果邮件客户端没有打开，请复制下面的内容，发送到右侧的邮箱地址。',
    steps: [
      '提交型号、数量与工况条件。',
      '我们在一个工作日内回复价格、交期与可替代型号。',
      '确认型号与交期，后续由同一团队跟进。',
    ],
    errRequired: '请填写必填项。',
    errEmail: '请输入有效的邮箱地址。',
  },
  notFound: {
    h1: '页面不存在',
    lead: '该地址可能已变更，或型号已下线。产品目录与询价入口仍可一键到达。',
    backHome: '返回首页',
    browseProducts: '浏览产品',
    requestQuote: '获取报价',
  },
    "aboutPage": {
      "responseValue": "1",
      "responseLabel": "个工作日回复",
      "contactTitle": "直接联系",
      "sections": [
        {
          "t": "生产与检验",
          "d": "生产按受控作业指导执行，每批次执行来料与出厂检验。规格文档受版本管理，每批出货可对应到相应检验记录，便于追溯。"
        },
        {
          "t": "可审计的文档",
          "d": "每个型号随附规格书、外形尺寸图与合规证书。文档带版本号，采购可据以核对报价与交付的一致性。"
        },
        {
          "t": "响应承诺",
          "d": "询价在一个工作日内回复单价、交货期与可选替代方案。售后问题由接待原询价的同一团队跟进，不转外包。"
        }
      ]
    },
  footer: {
    rights: '保留所有权利。',
    columns: {
      products: '产品中心',
      applications: '应用方向',
      resources: '技术资源',
      company: '公司',
      contact: '联系',
    },
  },
  section: {
    statusTitle: '当前状态',
    quality: '认证与质量',
    related: '相关入口',
    items: '本栏目内容',
    modelsCovered: '推荐型号',
    standards: '合规标准',
    files: '份合规文件',
    docTypes: '文档类型',
    clusters: '主题',
    clusterLabels: {
      selection: '选型',
      params: '参数',
      install: '安装',
      troubleshoot: '故障排查',
    },
  },
  breadcrumb: {
    aria: '面包屑',
    home: '首页',
    products: '产品中心',
  },
};

export const UI: Record<Locale, Dict> = { en, zh };

/** 取某语言的文案表 */
export function t(locale: Locale): Dict {
  return UI[locale];
}
