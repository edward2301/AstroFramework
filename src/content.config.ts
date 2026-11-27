import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { LOCALES } from './i18n/routing';

/**
 * 译文统一放在 `locales` 里，按语言键索引。
 *
 * 不用「每种语言加一个顶层字段」（zh / es / ja …）：那样每加一种语言都要改 schema、
 * 改视图函数、改校验脚本三处，漏一处不会报错，只会让该语言的页面渲染出默认语言的内容。
 * 用 record + 语言枚举后，新增语言只需在 LOCALES 里登记，其余各处自动生效。
 *
 * 译文内部字段逐个可选：`REQUIRED_TRANSLATION` 列出的必填字段缺一即判错，
 * 补充字段（dimensions、interface 等）可缺省并回落源语言，不报错也不告警。
 * 整块缺译同样由构建脚本判错，不允许静默回落。
 *
 * 各集合的 locales 子 schema 单独导出：`lib/content/localize.ts` 的译文视图
 * 类型由 `z.output<S>` 从这里派生，避免 schema 与视图两份手写副本漂移。
 */

/* ---------- 译文子 schema ---------- */

const modelLocales = z.object({
  name: z.string().optional(),
  keyParams: z.array(z.object({ k: z.string(), v: z.string() })).length(5).optional(),
  specGroups: z
    .array(
      z.object({
        title: z.string(),
        rows: z.array(z.object({ k: z.string(), v: z.string() })).min(1),
      })
    )
    .min(1)
    .optional(),
  dimensions: z.string().optional(),
  interface: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

const categoryLocales = z.object({
  name: z.string().optional(),
  intro: z.string().min(150).optional(),
  comparisonParams: z.array(z.string()).min(5).max(7).optional(),
  selectionPoints: z.array(z.string()).optional(),
  purchaseInfo: z
    .object({
      moq: z.string().optional(),
      leadTime: z.string().optional(),
      payment: z.string().optional(),
      certifications: z.array(z.string()).optional(),
    })
    .optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

const applicationLocales = z.object({
  name: z.string().optional(),
  condition: z.string().optional(),
  criteria: z.array(z.string()).optional(),
  cautions: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

const caseLocales = z.object({
  title: z.string().optional(),
  background: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  selection: z.string().optional(),
  results: z.array(z.string()).optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
});

/** 包一层 partialRecord：键只能是 LOCALES 中登记的语言 */
function localized(schema: z.ZodType) {
  return z.partialRecord(z.enum(LOCALES), schema).optional();
}

/* ---------- 集合定义 ---------- */

/**
 * 型号。
 *
 * keyParams 固定 5 项 —— 对应型号页首屏的「决定性参数速览」。
 * replacement 为单向声明，反查由 lib/content/relations 完成。
 */
const models = defineCollection({
  loader: glob({ base: './src/content/models', pattern: '**/*.json' }),
  schema: z.object({
    /** 草稿不进入任何列表、路由或关联解析 */
    draft: z.boolean().default(false),
    code: z.string().min(2),
    name: z.string().min(2),
    category: reference('categories'),
    status: z.enum(['active', 'discontinued']),
    replacement: z.array(reference('models')).default([]),

    /** 首屏速览参数，恰好 5 项 */
    keyParams: z
      .array(z.object({ k: z.string(), v: z.string() }))
      .length(5),

    /** 分组规格，至少一组，每组至少一行 */
    specGroups: z
      .array(
        z.object({
          title: z.string(),
          rows: z.array(z.object({ k: z.string(), v: z.string() })).min(1),
        })
      )
      .min(1),

    dimensions: z.string().optional(),
    interface: z.string().optional(),
    certifications: z.array(z.string()).default([]),
    datasheet: z.string().optional(),
    /**
     * 主图：`public/` 下的公开路径，如 `/images/models/a1.png`。
     *
     * 图片由运营人工维护（自己压好、自己上传），构建只做原样复制，
     * 不转换、不缩放、不生成多尺寸。与 `datasheet` 同一套约定，见 docs/开发框架设计.md §7.5。
     */
    image: z.string().optional(),

    applications: z.array(reference('applications')).default([]),
    relatedCases: z.array(reference('cases')).default([]),

    /** 各语言译文，键为 LOCALES 中的语言代码；缺该语言则不提供 */
    locales: localized(modelLocales),

    /** 型号页自己的标题与描述，由编辑撰写，不自动拼接 */
    seoTitle: z.string(),
    seoDescription: z.string(),
  }),
});

/**
 * 品类。
 * intro 下限 300 字，把「品类页需有一定厚度」写进 schema，而非靠人工检查。
 */
const categories = defineCollection({
  loader: glob({ base: './src/content/categories', pattern: '**/*.json' }),
  schema: z.object({
    draft: z.boolean().default(false),
    name: z.string(),
    intro: z.string().min(300),
    /**
     * 品类封面：`public/` 下的公开路径，如 `/images/categories/category-a.png`。
     * 图片由运营人工维护（构建不处理），与型号 `image` 同一套约定，见 §7.5。
     */
    image: z.string().optional(),
    /**
     * 品类色：该品类页与所属型号页 PageHeader 的底色（深色调 hex，
     * 保证 `--color-on-dark*` 浅色文字的对比度）。
     */
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    /** 对比表横向维度，5–7 项 */
    comparisonParams: z.array(z.string()).min(5).max(7),
    selectionPoints: z.array(z.string()).default([]),
    purchaseInfo: z.object({
      moq: z.string(),
      leadTime: z.string(),
      payment: z.string(),
      certifications: z.array(z.string()).default([]),
    }),
    /** 译文 intro 下限 150 字——非拉丁语言的 150 字符已相当于英文 300 字符的厚度 */
    locales: localized(categoryLocales),

    order: z.number().default(100),
    seoTitle: z.string(),
    seoDescription: z.string(),
  }),
});

/** 应用方向。推荐型号 2–5 个。 */
const applications = defineCollection({
  loader: glob({ base: './src/content/applications', pattern: '**/*.json' }),
  schema: z.object({
    draft: z.boolean().default(false),
    name: z.string(),
    condition: z.string(),
    criteria: z.array(z.string()).min(1),
    recommended: z.array(reference('models')).min(2).max(5),
    cautions: z.array(z.string()).default([]),
    seoTitle: z.string(),
    seoDescription: z.string(),
    locales: localized(applicationLocales),
  }),
});

/** 案例。配置清单必填，来自实际交付记录。 */
const cases = defineCollection({
  loader: glob({ base: './src/content/cases', pattern: '**/*.json' }),
  schema: z.object({
    draft: z.boolean().default(false),
    title: z.string(),
    background: z.string(),
    requirements: z.array(z.string()).min(1),
    selection: z.string(),
    config: z.array(reference('models')).min(1),
    results: z.array(z.string()).default([]),
    date: z.coerce.date(),
    seoTitle: z.string(),
    seoDescription: z.string(),
    locales: localized(caseLocales),
  }),
});

/**
 * 指南。正文走 Markdown，结构化字段走 frontmatter。
 *
 * 语言按**目录**区分，而不是 frontmatter 里内嵌 locales：
 *   src/content/guides/fm-100-selection.md      英文（默认语言，无前缀）
 *   src/content/guides/zh/fm-100-selection.md   中文
 *
 * 原因：正文是页面主体，要和结构化字段一起被谷歌当作独立篇章收录。
 * 内嵌 locales 只能容纳短字段，正文塞进 frontmatter 既不可读也无法
 * 做语法高亮与相对图片引用。语言由目录前缀表达（见 routing.ts 的
 * localeOfEntryId），schema 无 locale 字段。
 *
 * 代价与边界：两种语言各有一份 frontmatter，标题/描述必须各自撰写 ——
 * 这正是 SEO 想要的（同一句话翻两遍的 title 会被判重复）。
 */
const guides = defineCollection({
  loader: glob({ base: './src/content/guides', pattern: '**/*.md' }),
  schema: z.object({
    draft: z.boolean().default(false),
    title: z.string(),
    tldr: z.string(),
    updated: z.coerce.date(),
    /** 关联只在默认语言文件里声明一次，其他语言缺省为空、按 slug 回落 */
    relatedModels: z.array(reference('models')).default([]),
    relatedApplications: z.array(reference('applications')).default([]),
    seoTitle: z.string(),
    seoDescription: z.string(),
  }),
});

/** 问答。正文即答案，语言同样按目录区分（faqs/zh/*.md）。 */
const faqs = defineCollection({
  loader: glob({ base: './src/content/faqs', pattern: '**/*.md' }),
  schema: z.object({
    draft: z.boolean().default(false),
    question: z.string(),
    cluster: z.enum(['selection', 'params', 'install', 'troubleshoot']),
    relatedModels: z.array(reference('models')).default([]),
    relatedFaqs: z.array(reference('faqs')).default([]),
    seoTitle: z.string(),
    seoDescription: z.string(),
  }),
});

/**
 * 资料。gated 决定是否需留资获取。
 *
 * 资料文件本身语言中性（图纸、证书、说明书按型号编号全球同一份），
 * 因此不设独立 SEO 字段；只保留可选的 `locales.<lang>.title` 覆盖列表标题，
 * 缺省回落 `title`。字段说明见下方 schema 内注释。
 */
const downloads = defineCollection({
  loader: glob({ base: './src/content/downloads', pattern: '**/*.json' }),
  schema: z.object({
    draft: z.boolean().default(false),
    title: z.string(),
    docType: z.enum(['datasheet', 'manual', 'drawing', 'certificate']),
    version: z.string(),
    updated: z.coerce.date(),
    model: reference('models').optional(),
    gated: z.boolean().default(false),
    /**
     * 可选的本地化标题。资料文件本身语言中性，但标题里的文档类型
     * （declaration of conformity / 合格声明）对中文读者是障碍，
     * 所以允许按语言覆盖标题；缺省时回落到 title。
     */
    locales: z
      .partialRecord(z.enum(LOCALES), z.object({ title: z.string().min(4).optional() }))
      .optional(),
    file: z.string(),
  }),
});

export const collections = {
  models,
  categories,
  applications,
  cases,
  guides,
  faqs,
  downloads,
};

export {
  modelLocales,
  categoryLocales,
  applicationLocales,
  caseLocales,
};
