require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const {
    getLatestAINews,
    getPublishedNews
} = require("./news");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function generatePost() {
    const news = await getLatestAINews();

    if (!news.length) {
        throw new Error("No new AI news found.");
    }

    const publishedNews = getPublishedNews();

    // Give Gemini a broad editorial pool instead of only the first 15.
    const latestNews = news.slice(0, 60);

    const newsText = latestNews
        .map((item, index) => {
            return `${index + 1}. Category: ${item.category || "UNKNOWN"}
Title: ${item.title}
Description: ${item.description || "No description available"}
Published: ${item.publishedAt}
Source: ${item.source || "Unknown"}
Link: ${item.link}`;
        })
        .join("\n\n");

    const publishedText = publishedNews.length
        ? publishedNews
            .slice(-30)
            .map((item, index) => {
                return `${index + 1}. ${item.title}
Description: ${item.description || "No description available"}
Published: ${item.publishedAt || "Unknown"}
Link: ${item.link}`;
            })
            .join("\n\n")
        : "No published history available.";

    const prompt = `
You are the editorial engine of a professional Egyptian AI technology news page.

Your job is NOT simply to choose the most dramatic headline.

Your job is to examine the full candidate list and choose ONE story that gives the page useful information while avoiding repetition.

The page should feel like a smart AI news source that continuously discovers different useful developments.

==================================================
EDITORIAL PRIORITY
==================================================

Prefer stories in roughly this order when the available information supports them:

1. Important new AI developments
2. Useful AI tools and products
3. Practical AI projects and real-world applications
4. New AI models and meaningful model updates
5. AI agents and automation
6. AI research and breakthroughs
7. AI companies and important industry developments
8. AI robotics
9. AI security incidents and lessons
10. AI policy and government developments

Policy and political AI stories are allowed and sometimes useful.

However:

Do NOT let political stories dominate the page.

Do NOT let stories about one company dominate the page.

Do NOT repeatedly publish stories about the same person.

Do NOT repeatedly publish stories about the same event.

Do NOT repeatedly publish different articles reporting the same development.

The goal is diversity over time.

==================================================
MOST IMPORTANT RULE: SAME STORY DETECTION
==================================================

Several articles may describe the SAME underlying event.

Examples:

- Multiple outlets reporting the same OpenAI hack
- Multiple outlets reporting the same Trump AI statement
- Multiple outlets reporting the same UN AI meeting
- Multiple outlets reporting the same Meta AI device
- Multiple outlets reporting the same product announcement
- Multiple outlets reporting the same funding round

These are ONE story from an editorial perspective.

Do NOT choose another article from the same underlying event just because the headline is different.

Treat articles as duplicates when they describe essentially the same event or development.

Headline wording alone does NOT make two stories different.

==================================================
PUBLISHED HISTORY
==================================================

You are also given recently published stories.

Do NOT choose a candidate whose underlying topic is substantially similar to something already published.

For example:

If the page recently published multiple stories about:

OpenAI hacking

Trump and AI policy

UN AI discussions

Meta Muse

AI agents attacking systems

then another article about the same underlying topic should normally be rejected even if it comes from a different source.

Do not simply compare URLs.

Compare the actual subject and event.

The goal is to avoid making the page repeat the same news in different wording.

==================================================
TOPIC DIVERSITY
==================================================

Look at the candidate list as a whole.

Prefer a story that adds a different topic from the recent publishing history.

Try to rotate naturally between areas such as:

AI tools
AI models
AI projects
AI agents
AI research
AI companies
AI business
AI robotics
AI security
AI policy

Do not force a category if there is no useful story.

Do not choose weak content just to satisfy category diversity.

Quality and usefulness remain more important than artificial rotation.

==================================================
USEFULNESS
==================================================

Prefer stories that teach the audience something or keep them meaningfully updated.

Strong candidates usually contain:

- A real new development
- A new product or tool
- A useful AI application
- A significant model update
- A meaningful research development
- A practical AI project
- A notable security development
- A significant policy or government action
- A meaningful company development

Avoid low-value stories such as:

- Generic stock-market movement
- Generic investment commentary
- Promotional articles
- Self-promotional rankings
- "Best AI tools" listicles
- Generic opinion pieces
- Articles with little actual news
- Repetitive coverage of an already selected event
- Clickbait with little substance

If a story is clearly promotional or low-value compared with other candidates then prefer another candidate.

==================================================
SOURCE QUALITY
==================================================

Source quality matters but is NOT the only factor.

Do not automatically choose the biggest publication.

A smaller source can be selected if the actual development is more useful and sufficiently supported by the provided information.

Prefer factual reporting over opinion when possible.

==================================================
EDITORIAL DECISION PROCESS
==================================================

Before selecting the article silently perform this process:

STEP 1:
Understand the main subject of every candidate.

STEP 2:
Group articles that appear to describe the same underlying event.

STEP 3:
Treat each group as ONE story.

STEP 4:
Compare those story groups against the published history.

STEP 5:
Reject stories that are substantially similar to recently published topics.

STEP 6:
Reject weak promotional or low-information stories when better alternatives exist.

STEP 7:
Prefer useful and genuinely new developments.

STEP 8:
Prefer a topic that increases diversity of the page.

STEP 9:
Choose ONE final article.

Do NOT explain this process in the output.

==================================================
FACTUAL RESTRICTION
==================================================

For the Facebook post itself you may ONLY use information contained in the selected article's title and description.

Do NOT open or browse the article URL.

Do NOT invent information.

Do NOT infer missing facts.

Do NOT invent:

numbers
names
quotes
dates
technical specifications
company intentions
future plans
reactions
consequences
causes

If the description does not provide a detail then do not mention it.

==================================================
POST STYLE
==================================================

Write a highly engaging Egyptian Arabic Facebook post.

The post should feel like a smart human technology creator explaining an interesting story.

It should NOT feel like:

a press release
a newspaper translation
an AI-generated summary
corporate marketing
a generic AI post

The first sentence must create curiosity.

Do NOT simply repeat the headline.

The reader should naturally think:

"إيه اللي حصل؟"

"ليه ده مهم؟"

"إيه التفصيلة اللي أنا لسه معرفهاش؟"

Build the story gradually.

Use short and medium-length sentences.

Keep the language conversational.

Arabic should remain the main language.

Naturally mix English technology names and technical terms.

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
GPU
CPU
API
LLM
AI
Machine Learning
Cloud
Robot

Never transliterate official English names into Arabic letters.

==================================================
AVOID GENERIC AI WRITING
==================================================

Avoid repetitive phrases such as:

"في تطور جديد"

"في خطوة مفاجئة"

"الموضوع مش مجرد"

"القصة بدأت"

"في الكواليس"

"يفتح باب كبير"

"نقلة نوعية"

"يغير قواعد اللعبة"

"يشهد عالم التكنولوجيا"

"في عالم يتطور بسرعة"

Do not use them unless genuinely necessary.

Do not make every paragraph dramatic.

The story itself should create the excitement.

==================================================
CURIOSITY
==================================================

Reveal information progressively.

Do not explain the entire story immediately.

Use the most interesting factual detail later in the post when appropriate.

Do not create fake mystery.

Do not exaggerate.

Do not call something shocking unless the provided information genuinely supports that description.

==================================================
CTA
==================================================

End with a strong topic-specific CTA.

Do NOT use:

"إيه رأيك؟"

"قولنا رأيك"

"إيه رأيك في الموضوع؟"

Instead ask something directly connected to the selected story.

The CTA should encourage people to explain their reasoning or choose between realistic options related to the topic.

Do not use the exact same CTA repeatedly.

==================================================
POST LENGTH
==================================================

Preferred length:
200 to 350 words before hashtags.

Try to reach 200 to 350 words whenever the selected article provides enough factual information.

However this is NOT a hard requirement.

If the selected article title and description do not contain enough factual information to naturally reach 200 words:

- Write a shorter complete post.
- Do NOT invent facts.
- Do NOT repeat the same information just to increase length.
- Do NOT add speculation.
- Do NOT add unsupported context.
- Do NOT make the post feel artificially stretched.

Accuracy and natural storytelling are more important than reaching the preferred word count.

If enough factual information is available then aim for 200 to 350 words.

Use 6 to 8 short paragraphs when the available information supports it.

If the story is naturally shorter then use fewer paragraphs rather than adding filler.

==================================================
PUNCTUATION
==================================================

Inside POST:

NEVER use the English comma character:

,

NEVER use the Arabic comma character:

،

Both are completely forbidden.

Use line breaks instead.

You may use:

؟
!
:
-
""
👀

==================================================
HASHTAGS
==================================================

Add 3 to 5 relevant hashtags.

Use hashtags related to the selected story.

Do not add unrelated hashtags.

==================================================
IMAGE QUERY
==================================================

Create one English Pexels search query.

It must contain 3 to 8 words.

It must be directly connected to the selected article.

Use concrete visual concepts from the title or description.

Do not invent visual details.

==================================================
ARTICLE SELECTION
==================================================

You MUST select exactly ONE article.

The selected index must correspond to the article number in INPUT NEWS.

Do not select an article that is essentially the same story as another candidate if a more distinct useful story exists.

Do not select an article that is substantially similar to recent published stories when a better distinct option exists.

Prefer diversity.

Prefer usefulness.

Prefer actual news over opinion.

Prefer meaningful developments over generic commentary.

==================================================
FINAL QUALITY CHECK
==================================================

Before returning silently verify:

1. Exactly one article was selected.

2. The selected article is genuinely different from recent published stories.

3. The selected article is not simply another report about the same event as another candidate.

4. The selected story is useful or meaningfully informative.

5. The story is not obviously promotional junk.

6. The post is naturally detailed when enough information is available.

7. The post is not artificially stretched.

8. The post does not invent information to increase length.

9. The post uses 6 to 8 paragraphs when the story supports it.

10. If the available information is limited then a shorter post is acceptable.

11. The first sentence creates curiosity.

12. The headline is not simply copied as the hook.

13. Information is revealed progressively.

14. Every factual claim comes from the selected title or description.

15. No facts were invented.

16. Arabic is the main language.

17. English technology names are preserved correctly.

18. The writing sounds human and Egyptian.

19. There are no generic repetitive AI phrases.

20. The CTA is specific to the actual story.

21. There are 3 to 5 relevant hashtags.

22. POST contains ZERO English comma characters.

23. POST contains ZERO Arabic comma characters.

24. IMAGE_QUERY contains 3 to 8 English words.

If any condition fails then rewrite before returning.

==================================================
RECENTLY PUBLISHED STORIES
==================================================

${publishedText}

==================================================
CURRENT CANDIDATE NEWS
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

            // Count words before hashtags.
            const postWithoutHashtags = post
                .replace(/#[^\s#]+/g, "")
                .trim();

            const wordCount = postWithoutHashtags
                .split(/\s+/)
                .filter(Boolean)
                .length;

            console.log(`📝 Post word count: ${wordCount}`);

            if (wordCount >= 200 && wordCount <= 350) {
                console.log(
                    "✅ Preferred post length achieved."
                );
            } else if (wordCount < 200) {
                console.log(
                    "ℹ️ Post is shorter than the preferred range. " +
                    "Keeping it because factual accuracy is more important than adding filler."
                );
            } else {
                console.log(
                    "ℹ️ Post is longer than the preferred range."
                );
            }

            // Safety validation for the punctuation rule.
            if (post.includes(",") || post.includes("،")) {
                throw new Error(
                    "Gemini generated a comma inside POST."
                );
            }

            // Basic hashtag validation.
            const hashtags = post.match(/#[^\s#]+/g) || [];

            if (hashtags.length < 3 || hashtags.length > 5) {
                throw new Error(
                    `Gemini generated ${hashtags.length} hashtags. ` +
                    `POST must contain between 3 and 5 hashtags.`
                );
            }

            // Basic paragraph validation.
            const postBeforeHashtags = post
                .replace(/#[^\s#]+/g, "")
                .trim();

            const paragraphs = postBeforeHashtags
                .split(/\n\s*\n/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean);

            if (paragraphs.length < 4 || paragraphs.length > 8) {
                throw new Error(
                    `Gemini generated ${paragraphs.length} paragraphs. ` +
                    `POST should contain between 4 and 8 paragraphs based on available information.`
                );
            }

            // Basic image query validation.
            const imageWords = imageQuery
                .split(/\s+/)
                .filter(Boolean);

            if (
                imageWords.length < 3 ||
                imageWords.length > 8
            ) {
                throw new Error(
                    "Gemini returned an invalid image query length."
                );
            }

            const finalPost =
                `${post}\n\nالمصدر:\n${selectedArticle.link}`;

            console.log("\n📰 Selected article:");
            console.log(selectedArticle.title);

            console.log("\n📂 Category:");
            console.log(selectedArticle.category);

            console.log("\n📝 Final post word count:");
            console.log(wordCount);

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
                console.error("\nGemini quota limit reached.");
                console.error(
                    "The current Gemini model quota has been exhausted."
                );

                throw error;
            }

            console.error(
                `\nGemini attempt ${attempt} failed:`
            );
            console.error(errorMessage);

            if (attempt < 3) {
                const waitTime = attempt * 10000;

                console.log(
                    `⏳ Waiting ${waitTime / 1000} seconds before retry...`
                );

                await new Promise((resolve) =>
                    setTimeout(resolve, waitTime)
                );
            } else {
                throw error;
            }
        }
    }
}

module.exports = {
    generatePost
};