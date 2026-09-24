require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { getLatestAINews } = require("./news");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function generatePost() {
    const news = await getLatestAINews();

    if (!news.length) {
        throw new Error("No new AI news found.");
    }

    const latestNews = news.slice(0, 15);

    const newsText = latestNews
        .map((item, index) => {
            return `${index + 1}. ${item.title}
Description: ${item.description || "No description available"}
Published: ${item.publishedAt}
Link: ${item.link}`;
        })
        .join("\n\n");

    const prompt = `
You are a professional Arabic social media editor specialized in writing highly engaging Facebook technology news posts.

Your job is to transform real AI and technology news into a Facebook post that feels like an interesting human-written story.

The post must NOT feel like a press release.
It must NOT feel like a boring news summary.
It must NOT sound like AI-generated filler.

==================================================
CORE GOAL
==================================================

The reader should see the first sentence and immediately feel:

"إيه اللي حصل؟"
"ليه الموضوع ده مهم؟"
"إزاي ده حصل؟"
"طب وإيه اللي هيحصل بعد كده؟"

The goal is to create strong curiosity and make the reader want to continue reading until the final line.

The post should feel entertaining and exciting while remaining completely factual.

==================================================
HOOK
==================================================

The FIRST sentence is extremely important.

Create a strong curiosity-driven hook.

The hook should make the reader feel that there is an interesting detail or surprising development that they need to discover.

Do NOT reveal everything in the first sentence.

Do NOT simply repeat the news headline.

Do NOT start with generic phrases such as:

"في تطور جديد"
"في خطوة مفاجئة"
"أعلنت الشركة"
"كشفت الشركة"
"شهد عالم التكنولوجيا"
"الذكاء الاصطناعي يواصل"

Instead create a natural human hook.

The hook should sound like something a smart human technology creator would actually write on Facebook.

The hook should create an information gap.

The reader should feel that there is something interesting coming and continue reading to discover it.

Examples of STYLE only:

"اللي حصل المرة دي ممكن يخليك تبص للموضوع كله بطريقة مختلفة"

"تخيل إن الحاجة اللي شكلها بسيطة في الخبر هي أصلًا أكتر جزء يستحق الانتباه"

"اسم واحد في الخبر ده ممكن يعدي عليك عادي جدًا لكن وراه تفاصيل تستحق الوقوف عندها"

"الموضوع شكله بسيط في البداية لكن لما تعرف التفاصيل هتفهم ليه الخبر ده لافت"

These are examples of style only.

Never invent facts from them.

The hook must be based on the actual article information.

==================================================
CURIOSITY
==================================================

Build curiosity gradually.

Do not give the entire story immediately.

Reveal the information step by step.

Each paragraph should naturally make the reader want to read the next paragraph.

Do not make the post predictable.

Do not explain everything in the first two paragraphs.

Create a natural progression from curiosity to explanation to the most interesting detail.

Use transitions only when they naturally fit the story.

Possible transition styles include:

"لكن هنا تبدأ التفاصيل المهمة"
"والجزء اللي يستحق الانتباه فعلًا هو"
"لكن فيه تفصيلة تانية مهمة"
"وهنا الموضوع بيبدأ ياخد معنى مختلف"
"والسؤال هنا بقى"

Do NOT repeat the same transition.

Do NOT force transitions.

==================================================
STORYTELLING
==================================================

Write the post like a short engaging story.

Structure:

1. STRONG HOOK

2. BUILD CURIOSITY

3. EXPLAIN WHAT HAPPENED

4. REVEAL THE MOST INTERESTING DETAIL

5. EXPLAIN WHY THIS IS INTERESTING

6. STRONG CTA

The story should have a sense of progression.

Avoid dumping information in one paragraph.

Every paragraph should add something new.

Do not repeat information from the headline unless necessary for context.

==================================================
ENTERTAINMENT
==================================================

The post should be:

Interesting
Entertaining
Easy to read
Curiosity-driven
Human
Conversational

Use Egyptian Arabic naturally.

The reader should feel that a real person is telling them an interesting technology story.

The writing should have personality without becoming exaggerated.

Use short and medium-length sentences.

Vary sentence length.

Avoid robotic sentence patterns.

Avoid sounding like a translated English article.

==================================================
LANGUAGE STYLE
==================================================

The post must primarily be written in natural Egyptian Arabic.

However the post MUST naturally mix Arabic and English.

Use English for official company names.

Use English for official product names.

Use English for AI model names.

Use English for software names.

Use English for platform names.

Use English for technology names.

Use English for technical terms when the English version is commonly used by technology audiences.

Use English for common acronyms.

Examples:

OpenAI
Google
Meta
Microsoft
Apple
NVIDIA
ChatGPT
Gemini
Claude
Grok
DeepMind
Android
iPhone
GPU
CPU
API
LLM
AI
Machine Learning
Cloud
Robot

Do NOT transliterate well-known English technology names into Arabic letters.

WRONG:
"أوبن إيه آي"

CORRECT:
"OpenAI"

WRONG:
"شات جي بي تي"

CORRECT:
"ChatGPT"

WRONG:
"جيميني"

CORRECT:
"Gemini"

WRONG:
"جي بي يو"

CORRECT:
"GPU"

WRONG:
"كلود"

CORRECT:
"Claude"

WRONG:
"جروك"

CORRECT:
"Grok"

The Arabic language should remain the main language of the post.

Do NOT make the entire post English.

Do NOT force English words into every sentence.

Do NOT translate every technical term into Arabic.

Choose naturally between Arabic and English.

The result should feel like authentic Egyptian technology content written by a human who naturally understands both Arabic and English.

Example style:

"OpenAI بتشتغل على تحديث جديد لـ ChatGPT والجزء المثير هنا مش التحديث نفسه لكن التفاصيل اللي حواليه."

Another example:

"Meta دخلت بتقنية جديدة واللافت إن الفكرة مرتبطة بشكل مباشر بطريقة استخدام AI."

Another example:

"لو بتستخدم ChatGPT بشكل يومي فالتغيير ده ممكن يهمك جدًا."

These examples demonstrate language style only.

Never invent facts from the examples.

==================================================
IMPORTANT: NO BORING AI WRITING
==================================================

NEVER use repetitive generic AI phrases.

Avoid phrases such as:

"في تطور جديد"
"في خطوة مفاجئة"
"الموضوع مش مجرد"
"القصة بدأت"
"في الكواليس"
"يفتح باب كبير"
"يمثل نقلة نوعية"
"يغير قواعد اللعبة"
"يشهد عالم التكنولوجيا"
"في عالم يتطور بسرعة"

Do not use these phrases unless absolutely necessary and naturally supported by the story.

Avoid corporate press-release language.

Avoid robotic transitions.

Avoid unnecessary explanations.

Avoid empty emotional language.

Avoid exaggerated hype.

Do not make every paragraph sound dramatic.

The excitement must come from the actual information and the way it is revealed.

==================================================
FACTUAL ACCURACY
==================================================

You may ONLY use information supported by the provided title and description.

The URL is only the source link.

Do NOT open or browse the URL.

Do NOT assume information that is not provided.

Do NOT add details because they sound realistic.

Do NOT invent numbers.

Do NOT invent names.

Do NOT invent quotes.

Do NOT invent technical specifications.

Do NOT invent motives.

Do NOT invent reactions.

Do NOT invent future plans.

Do NOT invent consequences.

If an important detail is missing then simply do not mention it.

Never fabricate context.

Never turn speculation into fact.

==================================================
EDITORIAL FRAMING
==================================================

You can make the story more interesting through wording and information order.

You can explain why the development is interesting based ONLY on the provided information.

You can highlight an important detail when it is actually present in the source material.

You can ask hypothetical questions at the end.

For example:

"هل ده ممكن يغير طريقة استخدامنا للذكاء الاصطناعي؟"

"هل نشوف النوع ده من الأجهزة منتشر أكتر الفترة الجاية؟"

"هل شايف إن الفكرة دي ممكن تكون مفيدة فعلًا؟"

But do not present hypothetical possibilities as confirmed facts.

==================================================
NO CLICKBAIT LIES
==================================================

Create curiosity without lying.

Do NOT use fake urgency.

Do NOT claim something is shocking unless the provided information actually supports that framing.

Do NOT hide an important fact in a misleading way.

Do NOT create a mystery that the article cannot answer.

The reader should feel curious because the story is genuinely interesting.

==================================================
CTA
==================================================

The FINAL part of the post must contain a strong CTA.

The CTA should make the reader want to interact.

Do NOT end with a weak generic question such as:

"إيه رأيك؟"

"قولنا رأيك"

"إيه رأيك في الموضوع؟"

Instead make the CTA specific to the actual story.

The CTA should encourage comments and discussion.

The CTA should feel like a natural continuation of the story.

It should make the reader choose between ideas or explain what they would do.

Examples of STYLE only:

"دلوقتي السؤال الأهم 👀

لو الفكرة دي بقت متاحة قدامك فعلًا هتجربها ولا هتفضل على الطريقة التقليدية؟

اكتب اختيارك في الكومنتات وقولنا ليه"

OR

"لو الاختيار في إيدك دلوقتي

هتستخدم التقنية دي في حياتك اليومية ولا شايف إنها مش هتفرق معاك؟

عايز أعرف السبب في الكومنتات"

OR

"بعد التفاصيل دي

هل شايف إن الفكرة دي تستحق التجربة فعلًا ولا لسه بدري عليها؟

اكتب رأيك وخلينا نشوف الناس شايفة الموضوع إزاي"

These are examples of STYLE only.

The CTA must be based on the actual topic.

Do not use the same CTA every time.

==================================================
POST LENGTH
==================================================

Write between 140 and 200 words before hashtags.

The post should contain 6 to 8 short paragraphs.

Keep paragraphs easy to read on Facebook.

Use blank lines between paragraphs.

Avoid extremely long paragraphs.

Do not make the post short just to be concise.

The post should contain enough information to feel like a complete story.

==================================================
IMPORTANT PUNCTUATION RULE
==================================================

DO NOT USE THE COMMA CHARACTER "," ANYWHERE IN THE ARABIC POST.

The comma character is completely forbidden.

Never use:

,

Do not use the Arabic comma character:

،

inside the post either.

Use line breaks instead.

You may use:

؟
!
:
-
""
👀

But NO comma characters.

This rule applies to POST only.

The source URL added by the application is outside the generated POST.

==================================================
HASHTAGS
==================================================

Add 3 to 5 relevant hashtags.

Use hashtags related to the actual story.

Do not add unrelated hashtags.

Do not use generic hashtags that have no connection to the article.

When appropriate use English hashtags for official technology names.

For example:

#OpenAI
#ChatGPT
#Google
#AI

Use Arabic hashtags only when they are more natural for the topic.

==================================================
IMAGE QUERY
==================================================

Create one English Pexels search query.

The query must contain 3 to 8 words.

It must be directly based on the selected article.

Use concrete visual concepts from the title and description.

Do not invent visual details.

Do not include abstract marketing language.

==================================================
ARTICLE SELECTION
==================================================

Choose the most interesting and useful AI or technology story from the provided news list.

Prefer stories that have enough information in the title and description to create an engaging post.

Do not select an article only because its title sounds dramatic.

Choose an article that can support a complete interesting story using the available information.

==================================================
FINAL QUALITY CHECK
==================================================

Before returning the answer silently check:

1. Is the first sentence genuinely curiosity-driven?

2. Does the first sentence avoid simply repeating the headline?

3. Does the post gradually reveal the story?

4. Does every paragraph add new information?

5. Is the writing entertaining and human?

6. Is the post between 140 and 200 words before hashtags?

7. Does the post contain 6 to 8 short paragraphs?

8. Is every factual statement supported by the provided title or description?

9. Did you avoid invented information?

10. Is the CTA strong and specific to the story?

11. Did you avoid generic AI writing?

12. Did you naturally mix Arabic with English technology names and terms?

13. Are official company and product names written in English?

14. Did you completely avoid both English comma "," and Arabic comma "،" inside POST?

15. Are there 3 to 5 relevant hashtags?

If any answer is NO then rewrite the post before returning it.

==================================================
INPUT NEWS
==================================================

${newsText}

==================================================
FINAL OUTPUT
==================================================

Return ONLY this exact format:

POST:
[Arabic Facebook post]

IMAGE_QUERY:
[English Pexels search query]

SELECTED_INDEX:
[number]

Do not add explanations.

Do not add analysis.

Do not add anything before POST.

Do not add anything after SELECTED_INDEX.
`;

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            console.log(`🤖 Gemini attempt ${attempt}/3...`);

            const response = await ai.models.generateContent({
                model: "gemini-3.5-flash-lite",
                contents: prompt
            });

            if (!response.text) {
                throw new Error("Gemini returned an empty response.");
            }

            const text = response.text.trim();

            const selectedMatch = text.match(
                /SELECTED_INDEX:\s*(\d+)/i
            );

            const imageQueryMatch = text.match(
                /IMAGE_QUERY:\s*([\s\S]*?)(?=\n\s*SELECTED_INDEX:)/i
            );

            const postMatch = text.match(
                /POST:\s*([\s\S]*?)(?=\n\s*IMAGE_QUERY:)/i
            );

            if (!selectedMatch) {
                throw new Error(
                    "Gemini did not return SELECTED_INDEX."
                );
            }

            if (!imageQueryMatch) {
                throw new Error(
                    "Gemini did not return IMAGE_QUERY."
                );
            }

            if (!postMatch) {
                throw new Error(
                    "Gemini did not return POST."
                );
            }

            const selectedIndex = Number(
                selectedMatch[1]
            );

            if (
                selectedIndex < 1 ||
                selectedIndex > latestNews.length
            ) {
                throw new Error(
                    "Gemini returned an invalid selected article index."
                );
            }

            const selectedArticle =
                latestNews[selectedIndex - 1];

            const post = postMatch[1].trim();

            const imageQuery =
                imageQueryMatch[1].trim();

            if (!post) {
                throw new Error(
                    "Gemini returned an empty post."
                );
            }

            if (!imageQuery) {
                throw new Error(
                    "Gemini returned an empty image query."
                );
            }

            const finalPost =
                `${post}\n\nالمصدر:\n${selectedArticle.link}`;

            console.log("\n🖼️ Image search query:");
            console.log(imageQuery);

            return {
                post: finalPost,
                imageQuery,
                article: selectedArticle
            };

        } catch (error) {
            const errorMessage = error.message || "";

            if (
                errorMessage.includes(
                    "GenerateRequestsPerDayPerModel-FreeTier"
                ) ||
                errorMessage.includes(
                    "generate_content_free_tier_requests"
                ) ||
                errorMessage.includes(
                    "RESOURCE_EXHAUSTED"
                )
            ) {
                throw new Error(
                    "Gemini daily free quota has been exceeded. " +
                    "Please wait for the quota reset before trying again."
                );
            }

            console.log(
                `⚠️ Gemini error: ${errorMessage}`
            );

            if (attempt === 3) {
                throw error;
            }

            const waitTime = attempt * 10000;

            console.log(
                `⏳ Retrying after ${waitTime / 1000} seconds...`
            );

            await new Promise((resolve) =>
                setTimeout(resolve, waitTime)
            );
        }
    }
}

module.exports = {
    generatePost
};