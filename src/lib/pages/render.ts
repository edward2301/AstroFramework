/**
 * 内容页载荷装配。
 *
 * 只负责**由内容集合产出的详情页**（品类 / 型号 / 应用 / 案例 / 指南 / 问答）：
 * 取数、面包屑、结构化数据、Body 标识与 body props。
 * 静态页（首页、总览、关于、询价、各栏目、404）由 `static.ts` 按版式装配 ——
 * 它们的数据来自页面条目（src/data/pages/entries/*.ts），不经过本文件的 switch。
 *
 * `src/pages/` 只有一个 `[...slug].astro` 分发器：getStaticPaths 枚举
 * 全部「语言 × 路由」组合，props 交给 `loadPage`（静态页按 pageId 分发，
 * 详情页按 kind 分发）。语言维度由 `LOCALES` 驱动。
 *
 * 本模块不做渲染，只做取数与 SEO 装配 —— 渲染统一由各 *Body 组件承担。
 */
import { existsSync } from 'node:fs';
import type { CollectionEntry } from 'astro:content';
import type { RenderedContent } from '../content/guides';
import { buildMeta } from '../seo/meta';
import {
  articleSchema,
  breadcrumbSchema,
  collectionSchema,
  faqSchema,
  productSchema,
} from '../seo/schema';
import {
  categoryCrumbs,
  modelCrumbs,
  sectionCrumbs,
  type Crumb,
} from '../seo/breadcrumb';
import { crumbLabel, pageDef, type PageId } from '../../data/pages';
import { ROUTES, detailPath } from '../../data/routes';
import { entryIdFor, localizePath, type Locale } from '../../i18n/routing';
import { getCategory } from '../content/categories';
import { getModelDetail, getModelsByCategory } from '../content/models';
import { getApplication } from '../content/applications';
import { getCaseDetail } from '../content/cases';
import { getGuideDetail } from '../content/guides';
import { getFaqDetail } from '../content/faqs';
import {
  categoryView,
  modelView,
  applicationView,
  caseView,
} from '../content/localize';
import { getModelBacklinks } from '../content/relations';
import { SITE } from '../../data/site';
import type { organizationFor } from '../../data/organization';
import { mergeById } from '../utils/mergeById';
import { loadStaticPage } from './static';

/**
 * 问答正文 → 结构化数据里的纯文本答案。
 *
 * FAQPage 的 acceptedAnswer 必须与页面可见文本一致：这里只做空白归一
 * （统一换行、去掉段落首尾空白、丢弃空段），不改写任何字句。
 * 问答正文只有段落，没有列表与强调语法。
 */
function faqAnswerText(body: string | undefined): string {
  return (body ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0)
    .join('\n\n');
}

/**
 * 详情页「相关型号」列表共用的引用映射（应用 / 案例 / 指南 / 问答四处同构）。
 * 编码与名称按当前语言本地化，categoryId 供类型层对齐（链接统一走扁平路径）。
 */
function modelRef(entry: CollectionEntry<'models'>, locale: Locale) {
  const mv = modelView(entry, locale);
  return {
    id: entry.id,
    categoryId: entry.data.category.id,
    code: mv.code,
    name: mv.name,
  };
}

/**
 * getStaticPaths 传给分发器、再转交 loadPage 的路由参数。
 *
 * 分两类：
 *   · static —— 静态页条目自带路径与文案，只传条目 id
 *   · 其余 —— 内容集合产出的详情页，传集合 id
 *
 * 用 type alias 而非 interface：Astro 的 GetStaticPaths 要求 props 可赋值给
 * Record<string, any>，只有 type alias 才有隐式索引签名。
 */
export type PageInput =
  | { kind: 'static'; pageId: PageId; locale: Locale }
  | { kind: 'category'; locale: Locale; categoryId: string }
  | { kind: 'model'; locale: Locale; modelId: string }
  | { kind: 'application'; locale: Locale; entryId: string }
  | { kind: 'caseStudy'; locale: Locale; entryId: string }
  | { kind: 'guide'; locale: Locale; entryId: string }
  | { kind: 'faqDetail'; locale: Locale; entryId: string };

type CategoryView = ReturnType<typeof categoryView>;
type ModelView = ReturnType<typeof modelView>;

type BodyKey =
  | 'home'
  | 'about'
  | 'section'
  | 'products'
  | 'category'
  | 'model'
  | 'application'
  | 'caseStudy'
  | 'guide'
  | 'faqDetail'
  | 'quote'
  | 'notFound';

interface PageCommon {
  locale: Locale;
  /** 语言无关路径，如 /products/sensor-a/ */
  path: string;
  title: string;
  description: string;
  /** 本页主图的产物路径（/_astro/xxx.webp）；缺省时 og:image 用全站默认图 */
  image?: string;
  ogType?: 'product';
  noindex?: boolean;
  /** 语言切换器在当前语言下的落点，仅 404 需要显式指定 */
  switchPath?: string;
  schemas: unknown[];
  body: BodyKey;
}

export type RenderedPage = PageCommon &
  (
    | {
        body: 'home';
        bodyProps: {
          locale: Locale;
          categories: { id: string; name: string; intro: string; image?: string }[];
          applications: {
            id: string;
            name: string;
            condition: string;
            modelCount: number;
          }[];
          /** 目录内的型号总数 —— 导语引用它，与首页展示的卡片数是两回事 */
          totalModels: number;
        };
      }
    | { body: 'about'; bodyProps: { locale: Locale; crumbs: Crumb[]; heading: string; metrics: { value: string; label: string }[] } }
    | {
        body: 'section';
        bodyProps: {
          locale: Locale;
          crumbs: Crumb[];
          heading: string;
          body: { intro: string; current: string };
          /** 该栏目下的条目（集合为空时为空数组，由组件渲染空状态） */
          items: { title: string; meta?: string; href: string; badge?: string }[];
          /** 栏目指标（条目数、覆盖型号数等），由路由层按栏目给出 */
          metrics: { value: string; label: string }[];
        };
      }
    | {
        body: 'products';
        bodyProps: {
          locale: Locale;
          crumbs: Crumb[];
          categories: {
            id: string;
            name: string;
            intro: string;
            modelCount: number;
            /** 品类封面 = 该品类首个型号的主图（public/ 下路径） */
            image?: string;
          }[];
          models: {
            id: string;
            categoryId: string;
            categoryName: string;
            code: string;
            name: string;
            status: 'active' | 'discontinued';
            keyParams: { k: string; v: string }[];
            image?: string;
          }[];
          totalModels: number;
        };
      }
    | {
        body: 'category';
        bodyProps: {
          locale: Locale;
          crumbs: Crumb[];
          categoryId: string;
          category: CategoryView;
          models: {
            id: string;
            code: string;
            name: string;
            status: 'active' | 'discontinued';
            cells: string[];
            /** 型号主图（public/ 路径）——品类页的卡片网格需要图 */
            image?: string;
          }[];
          discontinuedCount: number;
        };
      }
    | {
        body: 'model';
        bodyProps: {
          locale: Locale;
          crumbs: Crumb[];
          model: ModelView;
          /** 主图公开路径（public/ 下），缺图时 undefined */
          image?: string;
          datasheet?: { path: string; available: boolean };
          replacements: {
            id: string;
            categoryId: string;
            code: string;
            name: string;
          }[];
          applications: { id: string; name: string }[];
          cases: { id: string; title: string }[];
          /** 同品类其他型号（横向内链） */
          siblings: { id: string; categoryId: string; code: string }[];
        };
      }
    | {
        body: 'application';
        bodyProps: {
          locale: Locale;
          crumbs: Crumb[];
          application: {
            name: string;
            condition: string;
            criteria: string[];
            cautions: string[];
          };
          models: { id: string; categoryId: string; code: string; name: string }[];
        };
      }
    | {
        body: 'caseStudy';
        bodyProps: {
          locale: Locale;
          crumbs: Crumb[];
          caseStudy: {
            title: string;
            background: string;
            requirements: string[];
            selection: string;
            results: string[];
            date: string;
          };
          models: { id: string; categoryId: string; code: string; name: string }[];
        };
      }
    | {
        body: 'guide';
        bodyProps: {
          locale: Locale;
          crumbs: Crumb[];
          guide: { title: string; tldr: string; updated: string };
          /** astro:content render() 产出的正文组件 */
          Content: RenderedContent;
          models: { id: string; categoryId: string; code: string; name: string }[];
        };
      }
    | {
        body: 'faqDetail';
        bodyProps: {
          locale: Locale;
          crumbs: Crumb[];
          question: string;
          /** astro:content render() 产出的正文组件 */
          Content: RenderedContent;
          models: { id: string; categoryId: string; code: string; name: string }[];
          related: { id: string; question: string }[];
        };
      }
    | {
        body: 'quote';
        bodyProps: {
          locale: Locale;
          crumbs: Crumb[];
          mailto: string;
          org: {
            email: string;
            telephone: string;
            address: ReturnType<typeof organizationFor>['address'];
          };
        };
      }
    | { body: 'notFound'; bodyProps: { locale: Locale } }
  );

/**
 * 把语言无关路径转成 rest 参数 slug；默认语言根路径为 undefined（匹配 /）。
 * 供分发器的 getStaticPaths 使用 —— getStaticPaths 会被 Astro 提升到独立
 * chunk，只能引用 import 进来的标识符，不能引用页面前置代码里的本地函数。
 */
export function toSlug(locale: Locale, path: string): string | undefined {
  const full = localizePath(locale, path);
  const trimmed = full.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? undefined : trimmed;
}

export async function loadPage(input: PageInput): Promise<RenderedPage> {
  // 静态页：路径、SEO 与正文都在条目里，按版式装配即可
  if (input.kind === 'static') {
    return loadStaticPage(pageDef(input.pageId), input.locale, input.pageId);
  }

  const { locale } = input;

  switch (input.kind) {
    case 'category': {
      const categoryId = input.categoryId!;
      const entry = await getCategory(categoryId);
      if (!entry) {
        throw new Error(`品类 ${categoryId} 在路由分发中解析失败`);
      }

      const view = categoryView(entry, locale);
      // 含停产型号：停产页要保留站内入口，否则只在 sitemap 里存在
      const models = await getModelsByCategory(categoryId, true);

      // 对比表单元格按「品类列名 = 型号 keyParams 的 k」匹配，匹配逻辑只存在这一处；
      // 对不上时输出「—」，由构建期校验脚本负责发现
      const rows = models.map((m) => {
        const mv = modelView(m, locale);
        return {
          id: m.id,
          code: mv.code,
          name: mv.name,
          status: mv.status,
          image: mv.image,
          cells: view.comparisonParams.map(
            (param) => mv.keyParams.find((p) => p.k === param)?.v ?? '—'
          ),
        };
      });

      const discontinuedCount = rows.filter((r) => r.status === 'discontinued').length;

      const meta = buildMeta(
        view.seoTitle,
        view.seoDescription,
        `category:${categoryId}:${locale}`
      );
      const crumbs = categoryCrumbs(locale, view.name, categoryId);

      const schemas = [
        collectionSchema({
          locale,
          name: view.name,
          description: meta.description,
          path: detailPath.category(categoryId),
          items: rows.map((r) => ({
            name: r.code,
            path: detailPath.model(r.id),
          })),
        }),
        breadcrumbSchema(crumbs),
      ];

      return {
        locale,
        path: detailPath.category(categoryId),
        ...meta,
        schemas,
        body: 'category',
        bodyProps: {
          locale,
          crumbs,
          categoryId,
          category: view,
          models: rows,
          discontinuedCount,
        },
      };
    }

    case 'model': {
      const modelId = input.modelId!;

      const detail = await getModelDetail(modelId);
      if (!detail) {
        throw new Error(`型号 ${modelId} 在路由分发中解析失败`);
      }

      // 品类不再进 URL，但面包屑、对比表与同品类内链仍需要它
      const categoryId = detail.data.category.id;
      const categoryEntry = await getCategory(categoryId);
      if (!categoryEntry) {
        throw new Error(`型号 ${modelId} 引用的品类 ${categoryId} 不存在`);
      }

      const view = modelView(detail, locale);
      const category = categoryView(categoryEntry, locale);

      const meta = buildMeta(
        view.seoTitle,
        view.seoDescription,
        `model:${modelId}:${locale}`
      );
      const path = detailPath.model(modelId);

      // 资料文件位于 public/，构建期确认存在再输出链接，避免产物里出现死链
      const hasDatasheet = detail.data.datasheet
        ? existsSync(`public${detail.data.datasheet}`)
        : false;

      // 同品类其他型号：型号页之间的横向内链（排除停产与自身），兼顾 UX 与抓取
      const siblings = (await getModelsByCategory(categoryId, false))
        .filter((m) => m.id !== modelId)
        .map((m) => ({
          id: m.id,
          categoryId,
          code: modelView(m, locale).code,
        }));

      // 正向关联来自型号字段，反向关联来自应用/案例反查，合并去重
      const backlinks = await getModelBacklinks(modelId);
      const applications = mergeById(detail.applications, backlinks.applications);
      const cases = mergeById(detail.cases, backlinks.cases);

      const crumbs = modelCrumbs(locale, category.name, categoryId, view.code, modelId);

      // 主图公开路径：og:image 与 Product.image 都用它（SEO 上必须是绝对 URL，由调用方拼）
      const heroImage = view.image;

      const schemas = [
        productSchema({
          locale,
          code: view.code,
          name: view.name,
          description: meta.description,
          path,
          image: heroImage,
          brand: SITE.name,
          availability: view.status === 'discontinued' ? 'Discontinued' : 'InStock',
        }),
        breadcrumbSchema(crumbs),
      ];

      return {
        locale,
        path,
        ...meta,
        image: heroImage,
        ogType: 'product',
        schemas,
        body: 'model',
        bodyProps: {
          locale,
          crumbs,
          model: view,
          image: view.image,
          datasheet: detail.data.datasheet
            ? { path: detail.data.datasheet, available: hasDatasheet }
            : undefined,
          replacements: detail.replacements.map((r) => {
            const rv = modelView(r, locale);
            return {
              id: r.id,
              categoryId: r.data.category.id,
              code: rv.code,
              name: rv.name,
            };
          }),
          /* 关联区块必须走本地化视图：直接用 data.name 会让中文页出现英文标题 */
          applications: applications.map((a) => ({ id: a.id, name: applicationView(a, locale).name })),
          cases: cases.map((c) => ({ id: c.id, title: caseView(c, locale).title })),
          siblings,
        },
      };
    }

    case 'application': {
      const entryId = input.entryId!;
      const detail = await getApplication(entryId);
      if (!detail) {
        throw new Error(`应用方向 ${entryId} 在路由分发中解析失败`);
      }

      const v = applicationView(detail, locale);
      const meta = buildMeta(v.seoTitle, v.seoDescription, `application:${entryId}:${locale}`);
      const path = detailPath.application(entryId);
      const crumbs = sectionCrumbs(
        locale,
        crumbLabel(pageDef('applications'), locale),
        ROUTES.applications,
        v.name,
        path
      );

      const models = detail.models.map((m) => modelRef(m, locale));

      /*
       * 应用方向页本质是一组推荐型号的集合页：面包屑之外补 CollectionPage + ItemList。
       * items 复用页面可见的同一份型号列表，避免结构化数据与正文不一致。
       */
      const schemas = [
        collectionSchema({
          locale,
          name: v.name,
          description: meta.description,
          path,
          items: models.map((m) => ({
            name: `${m.code} ${m.name}`,
            path: detailPath.model(m.id),
          })),
        }),
        breadcrumbSchema(crumbs),
      ];

      return {
        locale,
        path,
        ...meta,
        schemas,
        body: 'application',
        bodyProps: {
          locale,
          crumbs,
          application: {
            name: v.name,
            condition: v.condition,
            criteria: v.criteria,
            cautions: v.cautions,
          },
          models,
        },
      };
    }

    case 'caseStudy': {
      const entryId = input.entryId!;
      const detail = await getCaseDetail(entryId);
      if (!detail) {
        throw new Error(`案例 ${entryId} 在路由分发中解析失败`);
      }

      const v = caseView(detail, locale);
      const meta = buildMeta(v.seoTitle, v.seoDescription, `case:${entryId}:${locale}`);
      const path = detailPath.caseStudy(entryId);
      const crumbs = sectionCrumbs(
        locale,
        crumbLabel(pageDef('caseStudies'), locale),
        ROUTES.caseStudies,
        v.title,
        path
      );

      // 案例只有 date 一个日期字段，发布日期与修改日期同源，不虚构第二个时间点
      const published = v.date.toISOString().slice(0, 10);

      return {
        locale,
        path,
        ...meta,
        schemas: [
          articleSchema({
            locale,
            headline: v.title,
            description: meta.description,
            path,
            datePublished: published,
            dateModified: published,
          }),
          breadcrumbSchema(crumbs),
        ],
        body: 'caseStudy',
        bodyProps: {
          locale,
          crumbs,
          caseStudy: {
            title: v.title,
            background: v.background,
            requirements: v.requirements,
            selection: v.selection,
            results: v.results,
            date: v.date.toISOString().slice(0, 10),
          },
          models: detail.models.map((m) => modelRef(m, locale)),
        },
      };
    }

    case 'guide': {
      const slug = input.entryId!;
      const detail = await getGuideDetail(locale, slug);
      if (!detail) {
        throw new Error(`指南 ${entryIdFor(locale, slug)} 在路由分发中解析失败`);
      }

      const d = detail.data;
      const meta = buildMeta(d.seoTitle, d.seoDescription, `guide:${slug}:${locale}`);
      const path = detailPath.guide(slug);
      const crumbs = sectionCrumbs(
        locale,
        crumbLabel(pageDef('guides'), locale),
        ROUTES.guides,
        d.title,
        path
      );

      // 指南集合只有 updated（编辑更新日），没有单独的发布日期；
      // 两个日期同源，避免编造一个页面上看不到的时间点
      const published = d.updated.toISOString().slice(0, 10);

      return {
        locale,
        path,
        ...meta,
        schemas: [
          articleSchema({
            locale,
            headline: d.title,
            description: meta.description,
            path,
            datePublished: published,
            dateModified: published,
          }),
          breadcrumbSchema(crumbs),
        ],
        body: 'guide',
        bodyProps: {
          locale,
          crumbs,
          guide: {
            title: d.title,
            tldr: d.tldr,
            updated: d.updated.toISOString().slice(0, 10),
          },
          Content: detail.Content,
          models: detail.models.map((m) => modelRef(m, locale)),
        },
      };
    }

    case 'faqDetail': {
      const slug = input.entryId!;
      const detail = await getFaqDetail(locale, slug);
      if (!detail) {
        throw new Error(`问答 ${entryIdFor(locale, slug)} 在路由分发中解析失败`);
      }

      const d = detail.data;
      const meta = buildMeta(d.seoTitle, d.seoDescription, `faq:${slug}:${locale}`);
      const path = detailPath.faq(slug);
      const crumbs = sectionCrumbs(
        locale,
        crumbLabel(pageDef('faq'), locale),
        ROUTES.faq,
        d.question,
        path
      );

      const answer = faqAnswerText(detail.body);

      return {
        locale,
        path,
        ...meta,
        schemas: [
          faqSchema({ locale, question: d.question, answer, path }),
          breadcrumbSchema(crumbs),
        ],
        body: 'faqDetail',
        bodyProps: {
          locale,
          crumbs,
          question: d.question,
          Content: detail.Content,
          models: detail.models.map((m) => modelRef(m, locale)),
          related: detail.related.map((f) => ({
            id: f.slug,
            question: f.data.question,
          })),
        },
      };
    }

  }
}
