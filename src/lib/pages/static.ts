/**
 * 静态页装配（公共层）。
 *
 * 输入是一条页面条目（src/data/pages/entries/*.ts），输出渲染载荷。
 * 这里按 **版式** 分支，不按页面分支 —— 新增一个两段式栏目页只是新增一条条目，
 * 本文件一行都不用改；只有新增一种版式时才需要动这里。
 *
 * 版式分两类：
 *   · 数据版式（home / products）：要读内容集合
 *   · 文案版式（section / about / quote / notFound）：数据来自条目本身或组织数据
 */
import { buildMeta } from '../seo/meta';
import { breadcrumbSchema, collectionSchema } from '../seo/schema';
import { crumb, homeCrumb, productsCrumbs } from '../seo/breadcrumb';
import { crumbLabel, type PageDef } from '../../data/pages';
import { detailPath } from '../../data/routes';
import { getAllCategories } from '../content/categories';
import { getAllModels } from '../content/models';
import { getAllApplications } from '../content/applications';
import { getAllCases } from '../content/cases';
import { getAllGuides } from '../content/guides';
import { getAllFaqs } from '../content/faqs';
import { getAllDownloads } from '../content/downloads';
import { categoryView, modelView, applicationView, caseView } from '../content/localize';
import { bareSlug } from '../../i18n/routing';
import { organizationFor } from '../../data/organization';
import { t } from '../../i18n/ui';
import { localizePath, type Locale } from '../../i18n/routing';
import type { RenderedPage } from './render';

/**
 * @param label 出错时用于定位的标识（页面 id），与内容页的 `model:xx:en` 同风格
 */
export async function loadStaticPage(
  def: PageDef,
  locale: Locale,
  label: string
): Promise<RenderedPage> {
  const seo = def.seo[locale];
  const meta = buildMeta(seo.title, seo.description, `${label}:${locale}`);
  const path = def.path;

  switch (def.layout) {
    case 'home': {
      const categories = await getAllCategories();
      const applications = await getAllApplications();
      // 导语声明的是「目录内型号总数」：按目录口径统计（含停产），
      // 与 /products/ 的计数同源；不能按应用推荐累加（会重复/漏计）
      const catalogModels = await getAllModels(true);

      const categoryCards = categories.map((c) => {
        const v = categoryView(c, locale);
        return { id: c.id, name: v.name, intro: v.intro, image: c.data.image };
      });

      /** 按应用选型卡：工况名 + 条件摘要 + 推荐型号数 */
      const applicationCards = applications.map((a) => {
        const v = applicationView(a, locale);
        return {
          id: a.id,
          name: v.name,
          condition: v.condition,
          modelCount: a.data.recommended.length,
        };
      });

      return {
        locale,
        path,
        ...meta,
        image: '/og-home.png',
        schemas: [
          collectionSchema({
            locale,
            name: meta.title,
            description: meta.description,
            path,
            items: applicationCards.map((a) => ({
              name: a.name,
              path: detailPath.application(a.id),
            })),
          }),
        ],
        body: 'home',
        bodyProps: {
          locale,
          categories: categoryCards,
          applications: applicationCards,
          totalModels: catalogModels.length,
        },
      };
    }

    case 'products': {
      const categories = await getAllCategories();
      // 含停产型号：目录页要保留入口，停产状态在表格里标注
      const models = await getAllModels(true);

      const countByCategory = new Map<string, number>();
      for (const m of models) {
        const key = m.data.category.id;
        countByCategory.set(key, (countByCategory.get(key) ?? 0) + 1);
      }

      const crumbs = productsCrumbs(locale);

      const categoryCards = categories.map((c) => {
        const v = categoryView(c, locale);
        return {
          id: c.id,
          name: v.name,
          intro: v.intro,
          modelCount: countByCategory.get(c.id) ?? 0,
          image: c.data.image,
        };
      });

      // 全型号目录：参数键在不同品类间不一致，表格用统一的 keyParams 单元格
      const categoryNames = new Map(categories.map((c) => [c.id, categoryView(c, locale).name]));
      const modelRows = models.map((m) => {
        const v = modelView(m, locale);
        return {
          id: m.id,
          categoryId: m.data.category.id,
          categoryName: categoryNames.get(m.data.category.id) ?? m.data.category.id,
          code: v.code,
          name: v.name,
          status: v.status,
          keyParams: v.keyParams,
          image: v.image,
        };
      });

      const schemas = [
        collectionSchema({
          locale,
          name: meta.title,
          description: meta.description,
          path,
          items: modelRows.map((m) => ({
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
        body: 'products',
        bodyProps: { locale, crumbs, categories: categoryCards, models: modelRows, totalModels: modelRows.length },
      };
    }

    case 'about': {
      // 指标数字由内容集合统计，组件只负责渲染（组件不取数）
      const dict = t(locale);
      const [categories, models] = await Promise.all([getAllCategories(), getAllModels()]);
      const metrics = [
        { value: String(categories.length), label: dict.home.categories },
        { value: String(models.length), label: dict.category.modelsTitle },
        { value: dict.aboutPage.responseValue, label: dict.aboutPage.responseLabel },
      ];
      const crumbs = [
        homeCrumb(locale),
        crumb(crumbLabel(def, locale), localizePath(locale, path)),
      ];

      return {
        locale,
        path,
        ...meta,
        schemas: [breadcrumbSchema(crumbs)],
        body: 'about',
        // 标题来自条目（heading），改标题只需改条目
        bodyProps: { locale, crumbs, heading: def.heading?.[locale] ?? seo.title, metrics },
      };
    }

    case 'quote': {
      const dict = t(locale);
      const org = organizationFor(locale);

      const crumbs = [
        homeCrumb(locale),
        crumb(crumbLabel(def, locale), localizePath(locale, path)),
      ];

      const mailto = `mailto:${org.contactPoint.email}?subject=${encodeURIComponent(
        dict.quote.subject
      )}`;

      return {
        locale,
        path,
        ...meta,
        schemas: [breadcrumbSchema(crumbs)],
        body: 'quote',
        bodyProps: {
          locale,
          crumbs,
          mailto,
          org: {
            email: org.contactPoint.email,
            telephone: org.contactPoint.telephone,
            address: org.address,
          },
        },
      };
    }

    case 'section': {
      const content = def.content[locale];
      // 面包屑当前项走 crumbLabel，条目里显式写的 crumb 才生效；
      // 标题本体（h1）仍取 content.heading，两者可以不同（如「资源」栏目下的具体页）
      const crumbs = [homeCrumb(locale), crumb(crumbLabel(def, locale), localizePath(locale, path))];

      return {
        locale,
        path,
        ...meta,
        schemas: [breadcrumbSchema(crumbs)],
        body: 'section',
        bodyProps: {
          locale,
          crumbs,
          heading: content.heading,
          body: { intro: content.intro, current: content.current },
          ...(await sectionContent(path, locale, content.heading)),
        },
      };
    }

    case 'notFound': {
      return {
        locale,
        path,
        ...meta,
        noindex: true,
        switchPath: '/',
        schemas: [],
        body: 'notFound',
        bodyProps: { locale },
      };
    }
  }
}

/**
 * 栏目页列表项：按页面路径取对应集合。
 *
 * 路径与集合一一对应，新增栏目只需在 entries 里加条目并在此登记一行；
 * 集合为空时返回空数组，由组件渲染空状态（不会出现空白页）。
 */
async function sectionContent(
  path: string,
  locale: Locale,
  heading: string
): Promise<{
  items: { title: string; meta?: string; href: string; badge?: string }[];
  metrics: { value: string; label: string }[];
}> {
  const dict = t(locale);
  if (path === '/applications/') {
    const all = await getAllApplications();
    return {
      items: all.map((e) => {
        const v = applicationView(e, locale);
        return { title: v.name, meta: v.condition, href: localizePath(locale, detailPath.application(e.id)) };
      }),
      metrics: [
        { value: String(all.length), label: heading },
        { value: String(new Set(all.flatMap((e) => e.data.recommended.map((r) => r.id))).size), label: dict.section.modelsCovered },
      ],
    };
  }
  if (path === '/case-studies/') {
    const all = await getAllCases();
    return {
      items: all.map((e) => {
        const v = caseView(e, locale);
        return { title: v.title, meta: v.background, href: localizePath(locale, detailPath.caseStudy(e.id)) };
      }),
      metrics: [
        { value: String(all.length), label: heading },
        { value: String(new Set(all.flatMap((e) => e.data.config.map((c) => c.id))).size), label: dict.section.modelsCovered },
      ],
    };
  }
  if (path === '/resources/guides/') {
    const all = await getAllGuides(locale);
    return {
      items: all.map((e) => ({
        title: e.data.title,
        meta: e.data.tldr,
        href: localizePath(locale, detailPath.guide(bareSlug(e.id))),
      })),
      metrics: [
        { value: String(all.length), label: heading },
        { value: String(new Set(all.flatMap((e) => e.data.relatedModels.map((m) => m.id))).size), label: dict.section.modelsCovered },
      ],
    };
  }
  if (path === '/resources/faq/') {
    const all = await getAllFaqs(locale);
    return {
      items: all.map((e) => ({
        title: e.data.question,
        meta: dict.section.clusterLabels[e.data.cluster],
        href: localizePath(locale, detailPath.faq(bareSlug(e.id))),
      })),
      metrics: [
        { value: String(all.length), label: heading },
        { value: String(new Set(all.map((e) => e.data.cluster)).size), label: dict.section.clusters },
      ],
    };
  }
  if (path === '/certifications/') {
    // 认证页只列证书类文件：与页面正文（体系、检验、文件发放）互为补充
    const all = (await getAllDownloads()).filter((e) => e.data.docType === 'certificate');
    return {
      items: all.map((e) => ({
        title: e.data.locales?.[locale]?.title ?? e.data.title,
        meta: e.data.version,
        href: e.data.file,
        badge: e.data.docType,
      })),
      metrics: [
        { value: String(all.length), label: dict.section.files },
        { value: 'CE / RoHS', label: dict.section.standards },
      ],
    };
  }
  if (path === '/resources/downloads/') {
    const all = await getAllDownloads();
    return {
      items: all.map((e) => ({
        title: e.data.locales?.[locale]?.title ?? e.data.title,
        meta: e.data.version,
        href: e.data.file,
        badge: e.data.docType,
      })),
      metrics: [
        { value: String(all.length), label: heading },
        { value: String(new Set(all.map((e) => e.data.docType)).size), label: dict.section.docTypes },
      ],
    };
  }
  return { items: [], metrics: [] };
}
