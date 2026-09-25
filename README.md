# AI News Automation

أداة Node.js لجمع أخبار الذكاء الاصطناعي من Google News RSS ثم تنقية الأخبار ودمج القصص المتكررة واختيار مجموعة متنوعة من المقالات. يستخدم Gemini لكتابة منشورات Facebook باللغة المصرية وإنشاء استعلامات للصور، ثم يستخدم Pexels لاختيار صورة تحريرية مناسبة وينشر النتيجة على Facebook Page.

## ماذا يفعل المشروع؟

1. يجلب الأخبار من عشر فئات للذكاء الاصطناعي.
2. يستبعد الأخبار القديمة والروابط المكررة والمصادر أو العناوين منخفضة الجودة.
3. يقارن الأخبار بسجل النشر السابق في `data/published-news.json`.
4. يختار قصصًا متنوعة بدون تكرار نفس الحدث أو الفئة في نفس التشغيل.
5. يطلب من Gemini كتابة المنشور واختيار المقالات.
6. يبحث في Pexels ويقيّم الصور عبر Gemini.
7. ينشر صورة أو فيديو مع المنشور على Facebook.
8. يحفظ المقالات المنشورة حتى لا تتكرر في التشغيلات القادمة.

## المتطلبات

- Node.js 20 أو أحدث
- Gemini API key
- Pexels API key
- Facebook Page ID
- Facebook App ID و App Secret
- Facebook User access token طويل المدى بصلاحية إدارة الصفحة والنشر

## التثبيت

```bash
npm ci
copy .env.example .env
```

افتح `.env` وضع القيم الحقيقية. لا ترفع `.env` إلى Git.

## المتغيرات

| المتغير | مطلوب | الوصف |
| --- | --- | --- |
| `GEMINI_API_KEY` | نعم | مفتاح Google Gemini |
| `PEXELS_API_KEY` | نعم | مفتاح Pexels للصور |
| `FACEBOOK_PAGE_ID` | نعم | رقم Facebook Page |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | لا | Page Token الحالي؛ يتم تحديثه تلقائيًا عند انتهاء صلاحيته |
| `FACEBOOK_APP_ID` | نعم للتجديد التلقائي | Facebook App ID |
| `FACEBOOK_APP_SECRET` | نعم للتجديد التلقائي | Facebook App Secret |
| `FACEBOOK_USER_ACCESS_TOKEN` | نعم للتجديد التلقائي | User Token طويل المدى يُستخدم لاستخراج Page Token جديد |
| `MAX_POSTS_PER_RUN` | لا | عدد المنشورات في التشغيل، الافتراضي `4` |
| `PEXELS_PER_PAGE` | لا | عدد الصور التي يبحث عنها Pexels، الافتراضي `12` |
| `POST_DELAY_MS` | لا | التأخير بين المنشورات بالمللي ثانية |

## التشغيل

تشغيل الأوتوميشن كاملًا:

```bash
npm start
```

فحوصات syntax فقط:

```bash
npm run test:syntax
```

توجد اختبارات تكامل اختيارية داخل `tests/`. معظمها يستدعي APIs حقيقية وقد يستهلك quota أو ينشر على Facebook؛ شغّلها فقط بعد التأكد من المتغيرات.

## GitHub Actions

يوجد workflow يومي داخل `.github/workflows/daily.yml`، ويمكن تشغيله يدويًا من تبويب **Actions**. أضف نفس المتغيرات كـ Repository Secrets:

- `GEMINI_API_KEY`
- `PEXELS_API_KEY`
- `FACEBOOK_PAGE_ID`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_USER_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ACCESS_TOKEN` (اختياري، كقيمة أولية)

بعد نجاح التشغيل يحفظ workflow سجل النشر في `data/published-news.json` ويعمل commit تلقائيًا.

## هيكل المشروع

```text
.
├── index.js                    # نقطة التشغيل المتوافقة مع node index.js
├── src/
│   ├── news.js                 # جلب الأخبار والتنقية وسجل النشر
│   ├── generate-post.js        # اختيار المقالات وكتابة المنشور عبر Gemini
│   ├── image-search.js         # البحث في Pexels
│   ├── image-selection.js      # تقييم الصور وتنزيل الصورة المختارة
│   ├── generate-image.js       # توليد صورة بديلة عبر Gemini
│   └── facebook.js             # النشر على Facebook Graph API
├── tests/                      # اختبارات وفحوصات API الاختيارية
├── scripts/
│   ├── get-pages.js            # استعراض الصفحات المتاحة عبر Facebook API
│   └── run-automation.bat      # تشغيل محلي على Windows
├── data/                       # ملفات runtime والصور الناتجة
├── .github/workflows/          # التشغيل المجدول واليدوي
└── package.json
```

## ملاحظات مهمة

- لا تضع أي API keys داخل الكود أو Git.
- `data/published-news.json` هو سجل الحالة الوحيد للمحتوى الذي يجب حفظه بين التشغيلات. لا تحتاج عملية تجديد Facebook إلى قاعدة بيانات؛ تحفظ التوكنات الجديدة في `.env` عند التشغيل المحلي.
- يجب أن يظل `FACEBOOK_APP_SECRET` و User Token سريين، وأن تكون صلاحيات ملف `.env` مقيدة.
- فشل Gemini بسبب تكرار فئة أو مخالفة تنسيق المنشور يعيد المحاولة حتى ثلاث مرات.
- التشغيل المحلي قد ينشر فعليًا على الصفحة إذا كانت بيانات Facebook صحيحة.