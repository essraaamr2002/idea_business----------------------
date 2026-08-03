# خطة: دمج WordPress الهجين مع "حراج المشاريع"

## الفكرة العامة

نجعل **المحتوى التحريري** (مدونة، أخبار، مجتمع، دليل مزودي الخدمات) يُدار من WordPress خارجي، بينما تبقى **العمليات الأساسية** (المزادات، السوق الموازي، المحافظ، KYC، التمويل، مختبر المستقبل) داخل المنصة الحالية كما هي.

فوائد هذا الفصل:
- محرري المحتوى ينشرون من WP دون لمس الكود.
- WordPress قوي جداً في SEO (Yoast/RankMath، Schema، Sitemaps).
- تخفيف الحمل عن قاعدة بياناتنا.
- المستخدم يبقى يرى موقعاً واحداً — الدمج شفاف عبر REST API.

## البنية

```text
حراج المشاريع (TanStack Start)
├── الجزء التشغيلي (كما هو): /market, /auctions, /wallet, /kyc ...
└── الجزء المحتوى (جديد — يستهلك WP REST):
    ├── /blog                  ← WP posts (category: blog)
    ├── /news                  ← WP posts (category: news)
    ├── /community             ← WP posts (category: community) + تعليقات
    └── /providers             ← WP custom post type: service_provider

WordPress خارجي (self-hosted)
├── Yoast SEO / RankMath       ← تحسين السيو التلقائي
├── Application Password       ← يخزّن كـ WORDPRESS_API_KEY
└── يمر عبر Lovable Connector Gateway (لا نكشف كلمة السر للمتصفح)
```

## الأقسام التي ستنتقل إلى WordPress

| القسم | نوع المحتوى في WP | المسار في منصتنا |
|-------|-------------------|-------------------|
| المدونة | posts (category=blog) | `/blog`, `/blog/$slug` |
| الأخبار | posts (category=news) | `/news`, `/news/$slug` |
| المجتمع | posts (category=community) + comments | `/community`, `/community/$slug` |
| مزودو الخدمات | CPT: `service_provider` (ACF: hourly_rate, city, category) | `/providers`, `/providers/$slug` |

الباقي (لوحة الإدارة، المحافظ، المزادات، السوق الموازي، KYC، التمويل، المختبر) **يبقى كما هو**.

## خطوات التنفيذ

### 1. إعداد اتصال WordPress
- ربط connector `wordpress` عبر `standard_connectors--connect`.
- يخزّن `WORDPRESS_API_KEY` تلقائياً في بيئة الخادم.
- المستخدم يزوّدنا بـ: رابط موقع WP + اسم المستخدم + Application Password.

### 2. طبقة الخادم (Server Functions)
ملف واحد: `src/lib/wordpress.functions.ts` يوفر:
- `getPosts({ category, page, perPage })` — قائمة المقالات.
- `getPostBySlug({ slug })` — مقال واحد + `_embed` للصور والتصنيفات.
- `getProviders({ city, category, page })` — مزودو الخدمات (CPT).
- `getProviderBySlug({ slug })` — تفاصيل مزود واحد.
- `submitComment({ postId, content })` — لتعليقات المجتمع (authenticated).

كل الاستدعاءات تمر عبر `connector-gateway.lovable.dev/wordpress/*` بمفاتيح خادم فقط.

### 3. الصفحات الجديدة (TanStack routes)
- `src/routes/blog.index.tsx` + `src/routes/blog.$slug.tsx`
- `src/routes/news.index.tsx` + `src/routes/news.$slug.tsx`
- `src/routes/community.index.tsx` + `src/routes/community.$slug.tsx`
- `src/routes/providers.index.tsx` + `src/routes/providers.$slug.tsx`

كل صفحة تستعمل `ensureQueryData` في الـ loader و `useSuspenseQuery` في المكوّن (النمط المعتمد في المشروع).

### 4. SEO
- `head()` في كل صفحة `$slug` يقرأ من `loaderData`: title, description, og:image (يعتمد على featured image من WP).
- تحديث `src/routes/sitemap[.]xml.ts` ليضيف كل مقالات/مزودي WP ديناميكياً.
- Yoast يوفّر `yoast_head_json` عبر REST — نستخدمه كمصدر meta الحقيقي.

### 5. لوحة الإدارة
صفحة جديدة `src/routes/_authenticated/admin.wordpress.tsx`:
- عرض حالة الاتصال (متصل / غير متصل).
- زر "اختبر الاتصال" (يستدعي `/rest/v1.1/users/me`).
- إحصائيات: عدد المقالات، آخر نشر، عدد مزودي الخدمات.
- زر "افتح لوحة WordPress" (رابط خارجي).
- تفعيل/تعطيل كل قسم (blog/news/community/providers) عبر feature flags في جدول `platform_settings`.

### 6. الملاحة
تحديث الهيدر الرئيسي لإضافة روابط: المدونة، الأخبار، المجتمع، دليل الخدمات.

## ما يبقى في منصتنا (بدون تغيير)

- كل شيء تحت `/admin/*` (ماعدا صفحة WordPress الجديدة).
- المحافظ، المزادات، السوق الموازي، التمويل، KYC.
- مختبر المستقبل (Oracle, Time Machine, Twin, Trust Chain, Voice Trader).
- المصادقة، الأدوار، الإشعارات.

## المتطلبات من المستخدم

قبل أن أبدأ التنفيذ، أحتاج تأكيداً على:

1. **موقع WordPress**: هل لديك موقع WP جاهز (self-hosted) أم تريد اقتراحاً لاستضافته؟
2. **الرابط**: مثلاً `blog.busniss.org` أو `wp.busniss.org` (subdomain مستحسن لعزل).
3. **Application Password**: سأطلبه بعد تجهيز الموقع (Users → Profile → Application Passwords في WP).
4. **CPT مزودي الخدمات**: أوصي بتفعيل ACF Pro أو Meta Box لإضافة الحقول (المدينة، الفئة، السعر). موافق؟
5. **التعليقات**: هل تريد تعليقات المجتمع تُدار من WP (مع Akismet) أم من قاعدة بياناتنا؟

## المخرجات النهائية بعد التنفيذ

- 8 صفحات جديدة (4 قوائم + 4 تفاصيل).
- 1 طبقة server functions للـ WP.
- 1 صفحة إدارة WordPress في `/admin/wordpress`.
- تحديث sitemap ديناميكي.
- روابط في الهيدر.
- توثيق قصير للمحرر (كيف ينشر في WP).

بعد موافقتك على الخطة والإجابة على الأسئلة الخمسة أعلاه، سأبدأ التنفيذ فوراً.
