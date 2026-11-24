import { definePage } from '../contract.ts';

/**
 * 认证与质量。
 *
 * 只进页脚「公司」栏、不进主导航：主导航已有六项（产品还带宽下拉），
 * 页脚链接覆盖全站每一页，内部链接强度更够。
 */
export default definePage({
  path: '/certifications/',
  layout: 'section',
  nav: {
    /* 信任页进顶级导航：核实型页面（采购/工程查资质）需要在页眉一眼可见。
       order 45 = 技术资源之后、关于我们之前，导航语义为「业务 → 资源 → 资质 → 公司 → 联系」 */
    main: { order: 45, label: { en: 'Quality', zh: '认证与质量' } },
    footer: {
      column: 'company',
      order: 30,
      label: { en: 'Quality & Certifications', zh: '认证与质量' },
    },
  },
  seo: {
    en: {
      title: 'Quality Management and Product Certifications',
      description:
        'Quality management and product certification for industrial components: applicable standards, test reports, declarations of conformity and traceability.',
    },
    zh: {
      title: '质量体系与产品认证 — 适用标准、检验记录与文件索取',
      description:
        '说明工业部件的质量管理与产品认证安排：适用的标准、型式试验与出厂检验记录、合格声明与可追溯信息的发放方式，以及如何按型号索取认证文件与历史版本。',
    },
  },
  content: {
    en: {
      heading: 'Quality and Certifications',
      intro:
        'Quality control runs through the whole order, not only the final inspection. Incoming material is checked against the approved specification, assemblies are inspected in process, and every batch is sample-tested before packing. Each model page states the certifications that actually apply to that model — CE and RoHS across the range, with any further marks listed where a variant carries them. Performance is tested to IEC 61298, ingress protection to IEC 60529 and EMC to EN 61326-1; each report cites the clause used, so a reviewer can check the method rather than only the result.',
      current:
        'Declarations of conformity, test reports and material certificates are issued per model and per batch, and carry a version number so procurement can audit what was quoted against what was delivered. Send the model code and the intended use through the quote form and we will return the documents that apply, including any standard-specific report your market requires.',
    },
    zh: {
      heading: '认证与质量',
      intro:
        '质量控制覆盖整条订单流程，而不只是出厂检验：来料按批准的规格核对，装配过程逐序检验，每批出货前抽样测试。每个型号页标注该型号实际适用的认证——全系满足 CE 与 RoHS，部分变体另有标注项，以型号页信息为准。。性能测试依据 IEC 61298，防护等级依据 IEC 60529，电磁兼容依据 EN 61326-1；报告中标注所引用的条款，审阅者可核对测试方法而不只是结论',
      current:
        '合格声明、检验报告与材质证明按型号、按批次出具，均带版本号，采购可据此核对报价与交付的一致性。把型号编码与目标用途通过询价表单发来，我们回复适用的文件，并可按目标市场的标准要求补充对应报告。',
    },
  },
});
