# AI News Automation

أداة Node.js تجمع أخبار الذكاء الاصطناعي والتكنولوجيا والروبوتات من Google News وBing، وتبحث مباشرة عن أدوات AI للمبرمجين وصناع المحتوى عبر GitHub وHacker News. تنقح القصص وتمنع التكرار، ثم يستخدم Gemini لكتابة منشورات Facebook باللهجة المصرية. Pexels هو مصدر الصور الافتراضي؛ ويمكن اختيار توليد الصور عبر Gemini أو مقارنتها مع Pexels بعد تفعيل الفوترة.

## ماذا يفعل المشروع؟

1. يجلب أخبار التطور التقني، وأدوات وworkflows الذكاء الاصطناعي للمبرمجين وصناع المحتوى.
2. يستبعد الأخبار القديمة والمصادر أو العناوين منخفضة الجودة.
3. يمنع تكرار نفس القصة عبر تنظيف الروابط ومقارنة العناوين والكيانات والأحداث وتشابه المحتوى.
4. يقارن الأخبار بسجل النشر السابق في `data/published-news.json`.
5. يختار قصصًا متنوعة بدون تكرار نفس الحدث في نفس التشغيل.
6. يطلب من Gemini كتابة المنشور واختيار المقالات.
7. يبحث في Pexels افتراضيًا ويقيّم الصور عبر Gemini، مع وضع اختياري لتوليد الصور بـGemini أو مقارنتها بـPexels.
8. ينشر صورة أو فيديو مع المنشور على Facebook.
9. يحفظ المقالات المنشورة حتى لا تتكرر في التشغيلات القادمة.

## المتطلبات

- Node.js 20 أو أحدث
- Gemini API key
- Pexels API key عند استخدام `IMAGE_PROVIDER=pexels` أو `compare`
- Facebook Page ID
- Facebook App ID و App Secret
- Facebook User access token طويل المدى بصلاحية إدارة الصفحة والنشر
- صلاحية `pages_read_engagement` اختيارية لقياس تفاعلات المنشورات؛ غيابها لا يوقف النشر

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
| `PEXELS_API_KEY` | حسب مصدر الصور | مطلوب مع `pexels` أو `compare`؛ غير مطلوب مع `gemini` فقط |
| `FACEBOOK_PAGE_ID` | نعم | رقم Facebook Page |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | لا | Page Token الحالي؛ يتم تحديثه تلقائيًا عند انتهاء صلاحيته |
| `FACEBOOK_APP_ID` | نعم للتجديد التلقائي | Facebook App ID |
| `FACEBOOK_APP_SECRET` | نعم للتجديد التلقائي | Facebook App Secret |
| `FACEBOOK_USER_ACCESS_TOKEN` | نعم للتجديد التلقائي | User Token طويل المدى يُستخدم لاستخراج Page Token جديد |
| `MAX_POSTS_PER_RUN` | لا | عدد المنشورات في التشغيل، الافتراضي `1` |
| `PEXELS_PER_PAGE` | لا | عدد الصور التي يبحث عنها Pexels، الافتراضي `12` |
| `AI_WORKFLOW_MAX_AGE_HOURS` | لا | أقصى عمر لأخبار أدوات وسير عمل المبرمجين وصناع المحتوى، الافتراضي `168` ساعة |
| `IMAGE_PROVIDER` | لا | مصدر الصورة: `pexels` (الافتراضي)، `gemini`، أو `compare` |
| `GEMINI_IMAGE_MODEL` | لا | موديل التوليد، الافتراضي `gemini-3.1-flash-lite-image`؛ يتطلب مشروعًا عليه فوترة مفعّلة |
| `POST_DELAY_MS` | لا | التأخير بين المنشورات بالمللي ثانية |
| `NEWS_MAX_AGE_HOURS` | لا | أقصى عمر للخبر بالساعات، الافتراضي `24` |
| `RUN_MAX_ATTEMPTS` | لا | عدد محاولات التشغيل، الافتراضي `3` وبحد أقصى مطلق `10` |
| `RUN_RETRY_BASE_DELAY_MS` | لا | بداية exponential backoff بالمللي ثانية، الافتراضي `5000` |
| `RUN_RETRY_MAX_DELAY_MS` | لا | أقصى تأخير retry بالمللي ثانية، الافتراضي `60000` وبحد أقصى مطلق `150000` |
| `FACEBOOK_REQUEST_TIMEOUT_MS` | لا | مهلة طلب Facebook بالمللي ثانية، الافتراضي `30000` وبحد أقصى `300000` |

إعادة المحاولة تستخدم exponential backoff مع full jitter، وتُوقف بعد `RUN_MAX_ATTEMPTS`. مهلة Gemini هي `60000` مللي ثانية، ومهلة Pexels وتنزيل الصور `30000` مللي ثانية. لا يعاد التشغيل تلقائيًا عند انقطاع طلب النشر نفسه، لأن Facebook قد يكون نشر المنشور رغم انقطاع الرد؛ وهذا يمنع تكرار النشر على نحو غير مقصود.

في وضع `IMAGE_PROVIDER=compare` ينشئ Gemini صورة تحريرية لكل منشور ويقارنها بصور Pexels وبصورة المصدر إن توفرت، ثم يطبع أفضل درجة لكل مصدر والمصدر المختار. هذا تقييم آلي من Gemini نفسه، فراجِع الصورة والنتائج بعد التشغيل قبل اعتماد Gemini وحده.

توليد الصور عبر Gemini API يتطلب تفعيل Pay-as-you-go على مشروع Google AI Studio؛ الموديلات لا تملك حصة صور مجانية لحسابك الحالي. الموديل الافتراضي Lite ينتج صورة 1K أفقية، وتكلفته المنشورة حوالي `$0.0336` للصورة. بعد تفعيل الفوترة، استخدم `IMAGE_PROVIDER=gemini` لتوليد الصورة فقط أو `compare` لمقارنتها مع Pexels.

تشمل تغطية الأدوات العملية موارد للمبرمجين وصناع المحتوى من أي شركة: إضافات وIDE وMCP ومستودعات وملفات تعليمات وprompts وسير عمل للفيديو والصور والصوت والتحرير والنشر، إضافة إلى وسائل موثقة لتقليل استهلاك السياق أو التوكنز. نضيف اكتشافًا مباشرًا من GitHub وHacker News بجانب Google/Bing، ونفحص رابط المورد قبل إدراجه. عند وجود مرشح موثوق، يضمن الاختيار منشور workflow واحدًا على الأقل في التشغيلات التي تنشر 3 منشورات أو أكثر. الأخبار العملية يمكن أن تكون بعمر يصل إلى 7 أيام، وتظل خاضعة لمنع تكرار الموضوع.

بعد النشر يُحفظ Facebook post ID. تحاول الأتمتة تحديث reactions/comments/shares لآخر المنشورات مرة كل 24 ساعة، بحد أقصى 3 منشورات في التشغيل. يحتاج ذلك صلاحية `pages_read_engagement`؛ غيابها يتخطى القياس فقط ولا يعطل النشر.

## التشغيل

تشغيل الأوتوميشن كاملًا:

```bash
npm start
```

فحوصات syntax فقط:

```bash
npm run test:syntax
```

توجد اختبارات تكامل اختيارية داخل `tests/`. معظمها يستدعي APIs حقيقية وقد يستهلك quota أو ينشر على Facebook؛ شغّلها فقط بعد التأكد من المتغيرات. `MAX_POSTS_PER_RUN` افتراضيًا `1`، والجدولة اليومية تعمل مرة واحدة الساعة 3:45 صباحًا بتوقيت القاهرة. يحتفظ سجل `data/published-news.json` بكل المنشورات والصور السابقة لمنع إعادة استخدامها.

## GitHub Actions

يوجد workflow يومي داخل `.github/workflows/daily.yml` وآخر يدوي داخل `.github/workflows/automation.yml`. أضف القيم التالية كـ Repository Secrets:

- `GEMINI_API_KEY`
- `PEXELS_API_KEY`
- `FACEBOOK_PAGE_ID`
- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `FACEBOOK_USER_ACCESS_TOKEN`
- `FACEBOOK_PAGE_ACCESS_TOKEN` (اختياري، كقيمة أولية)

بعد نجاح التشغيل يحفظ workflow سجل النشر في `data/published-news.json` ويعمل commit تلقائيًا.

يعمل `daily.yml` يوميًا في الساعة 3:45 صباحًا بتوقيت القاهرة طوال العام (`Africa/Cairo`). أما `automation.yml` فهو للتشغيل اليدوي فقط. الـ workflowين يستخدمان مجموعة concurrency واحدة لمنع تشغيل نشرين بالتوازي، ولكل تشغيل حد أقصى 30 دقيقة.

لقياس تفاعلات Facebook، أصدِر Page access token يتضمن صلاحية `pages_read_engagement`؛ لا تضف اسم الصلاحية كـ secret أو متغير بيئة. تحديث الإحصاءات اختياري ولا يؤثر على النشر عند غياب الصلاحية.

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
│   ├── get-long-lived-token.ps1 # تحويل User Token إلى Long-Lived وحفظه
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
