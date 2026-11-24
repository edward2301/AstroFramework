import type { Locale } from '../i18n/routing';

/**
 * 组织实体字段。
 * 结构化数据的 Organization 节点由此生成；字段缺一不可，缺失会导致实
 * 体识别失败，进而使产品、案例、文章的归属悬空。
 *
 * 顶层字段是源语言（英文）。`locales` 放各语言版本 —— 只有**需要给读者看**的部分
 * 才需要翻译：公司简介、注册地址。品牌名（name / legalName）不译：
 * 品牌名在两种语言下应当一致，翻译成中文反而会让实体识别对不上。
 *
 * 电话、邮箱、社交账号都是语言无关的值，不进 locales。
 */

export const ORGANIZATION = {
  name: 'Example Industrial Co., Ltd.',
  legalName: 'Example Industrial Co., Ltd.',
  logo: '/logo.png',
  foundingDate: '2008',
  description:
    'Manufacturer of standard-model industrial components for OEM and distributor sourcing worldwide.',
  address: {
    street: '88 Industrial Road',
    city: 'Ningbo',
    region: 'Zhejiang',
    postalCode: '315000',
    country: 'CN',
  },
  contactPoint: {
    telephone: '+86-000-0000-0000',
    contactType: 'sales',
    email: 'sales@example.com',
    availableLanguage: ['en', 'zh'],
  },
  /**
   * 外部可验证身份。真实账号由运营补齐（企业账号优先于产品账号）。
   * 留空时 Organization 节点不输出 sameAs —— 宁可缺字段，也不能声明
   * 指向示例账号的实体关系。
   */
  sameAs: [],

  /** 各语言版本的公司简介与地址；缺失则回落上面的英文 */
  locales: {
    zh: {
      description:
        '专业生产标准型号工业部件，面向全球 OEM 与经销商供货，提供完整规格、安装尺寸与替代型号指引。',
      address: {
        street: '工业路 88 号',
        city: '宁波市',
        region: '浙江省',
        postalCode: '315000',
        // schema.org 的 country 要求 ISO 3166-1 代码，不随界面语言翻译
        country: 'CN',
      },
    },
  },
} as const;

/** 取某语言下的组织信息，用于页面显示与结构化数据 */
export function organizationFor(locale: Locale) {
  const tr = (ORGANIZATION.locales as Partial<Record<Locale, (typeof ORGANIZATION.locales)['zh']>>)[
    locale
  ];

  return {
    name: ORGANIZATION.name,
    legalName: ORGANIZATION.legalName,
    logo: ORGANIZATION.logo,
    foundingDate: ORGANIZATION.foundingDate,
    description: tr?.description ?? ORGANIZATION.description,
    address: tr?.address ?? ORGANIZATION.address,
    contactPoint: ORGANIZATION.contactPoint,
    sameAs: ORGANIZATION.sameAs,
  };
}
