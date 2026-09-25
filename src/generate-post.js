require("dotenv").config();

const axios = require("axios");
const dns = require("dns").promises;
const { isIP } = require("net");
const { GoogleGenAI } = require("@google/genai");
const {
    getLatestAINews,
    getPublishedNews,
    getCategoryPerformanceSummary,
    getMaxPostsPerRun
} = require("./news");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
        timeout: 60000
    }
});

function isPublicAddress(address) {
    const version = isIP(address);

    if (version === 4) {
        const [first, second, third] = address.split(".").map(Number);
        return !(
            first === 0 ||
            first === 10 ||
            first === 127 ||
            (first === 169 && second === 254) ||
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 192 && second === 168) ||
            (first === 100 && second >= 64 && second <= 127) ||
            (first === 198 && (second === 18 || second === 19)) ||
            first >= 224 ||
            (first === 192 && second === 0 && third === 2) ||
            (first === 198 && second === 51 && third === 100) ||
            (first === 203 && second === 0 && third === 113)
        );
    }

    if (version === 6) {
        const normalized = address.toLowerCase();
        if (
            normalized === "::" ||
            normalized === "::1" ||
            /^f[cd]/.test(normalized) ||
            /^fe[89ab]/.test(normalized) ||
            normalized.startsWith("ff")
        ) {
            return false;
        }

        if (normalized.startsWith("::ffff:")) {
            const mapped = normalized.slice(7);
            if (isIP(mapped) === 4) {
                return isPublicAddress(mapped);
            }

            const words = mapped.split(":");
            if (words.length === 2) {
                const high = Number.parseInt(words[0], 16);
                const low = Number.parseInt(words[1], 16);
                const ipv4 = [high >> 8, high & 255, low >> 8, low & 255].join(".");
                return isPublicAddress(ipv4);
            }
        }

        return true;
    }

    return false;
}

async function validateResourceUrl(value, redirectsRemaining = 4) {
    let url;
    try {
        url = new URL(value);
    } catch (_) {
        throw new Error("The tool link is not a valid URL.");
    }

    if (
        !["http:", "https:"].includes(url.protocol) ||
        url.username ||
        url.password ||
        /(^|\.)(localhost|local|internal)$/.test(url.hostname)
    ) {
        throw new Error("The tool link must be a public HTTP or HTTPS URL.");
    }

    const resolvedAddresses = isIP(url.hostname)
        ? [{ address: url.hostname }]
        : await dns.lookup(url.hostname, { all: true, verbatim: true });

    if (!resolvedAddresses.length || resolvedAddresses.some(item => !isPublicAddress(item.address))) {
        throw new Error("The tool link does not resolve to a public address.");
    }

    let checkedResponse = await axios.head(url.toString(), {
        timeout: 8000,
        maxRedirects: 0,
        validateStatus: () => true,
        headers: {
            "User-Agent": "Mozilla/5.0 (compatible; AI-News-Automation/1.0)"
        }
    });

    if ([403, 405, 501].includes(checkedResponse.status)) {
        checkedResponse = await axios.get(url.toString(), {
            timeout: 8000,
            maxRedirects: 0,
            maxContentLength: 1024 * 1024,
            validateStatus: () => true,
            headers: {
                Range: "bytes=0-0",
                "User-Agent": "Mozilla/5.0 (compatible; AI-News-Automation/1.0)"
            }
        });
    }

    if (
        checkedResponse.status >= 300 &&
        checkedResponse.status < 400 &&
        checkedResponse.headers.location
    ) {
        if (redirectsRemaining <= 0) {
            throw new Error("The tool link redirected too many times.");
        }

        return validateResourceUrl(
            new URL(checkedResponse.headers.location, url).toString(),
            redirectsRemaining - 1
        );
    }

    if (checkedResponse.status < 200 || checkedResponse.status >= 300) {
        throw new Error(`The tool link returned HTTP ${checkedResponse.status}.`);
    }

    return url.toString();
}

async function generatePost() {
    const news = await getLatestAINews();

    if (!news.length) {
        throw new Error("No new AI news found.");
    }

    const publishedNews = getPublishedNews();
    const categoryPerformance = getCategoryPerformanceSummary();

    // Give Gemini a broad editorial pool instead of only the first 15.
    const latestNews = news.slice(0, 80);
    const requestedPosts = getMaxPostsPerRun();
    const workflowCategories = ["AI_DEV_TOOLS", "AI_CREATOR_TOOLS"];
    const targetWorkflowPosts = requestedPosts >= 3 && latestNews.some(item =>
        workflowCategories.includes(item.category) && item.resourceLinks?.length
    ) ? 1 : 0;

    if (latestNews.length < requestedPosts) {
        throw new Error(
            `Only ${latestNews.length} candidate news articles are available. ` +
            `${requestedPosts} are required for this run.`
        );
    }

    const newsText = latestNews
        .map((item, index) => {
            return `${index + 1}. Category: ${item.category || "UNKNOWN"}
Title: ${item.title}
Description: ${item.description || "No description available"}
Published: ${item.publishedAt}
Source: ${item.source || "Unknown"}
Link: ${item.link}
Direct tool/resource links found in the feed: ${item.resourceLinks?.join(" | ") || "None"}`;
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
    const performanceText = categoryPerformance.length
        ? categoryPerformance
            .map(item => `${item.category}: ${item.averageInteractions} average interactions across ${item.posts} measured post(s)`)
            .join("\n")
        : "Not enough measured posts yet.";

    const prompt = `
You are the editorial engine of a professional Egyptian AI technology news page.

Your job is NOT simply to choose the most dramatic headline.

Your job is to examine the full candidate list and choose up to ${requestedPosts} stories that give the page useful information while avoiding repetition.

The page should feel like a smart AI news source that continuously discovers different useful developments.

==================================================
EDITORIAL PRIORITY
==================================================

Prefer stories in roughly this order when the available information supports them:

1. Important new AI developments
2. Practical tools and workflows for people who build software or create content with AI
3. Useful AI tools and products
4. Practical AI projects and real-world applications
5. New AI models and meaningful model updates
6. AI agents and automation
7. AI research and breakthroughs
8. AI companies and important industry developments
9. AI robotics
10. AI security incidents and lessons
11. AI policy and government developments

Useful workflow stories are not limited to any vendor. Include programming tools such as plugins, IDE extensions, coding agents, MCP servers, repositories, instruction/rules files, prompts, and context or token-saving workflows. Also include creator workflows such as AI-assisted video, image, audio, editing, captioning, repurposing, and publishing tools. Explain what the resource does, who it helps, and its practical use, using only source-supported facts. Never claim savings, compatibility, pricing, or setup details without evidence.

When a useful, non-repetitive workflow story with a direct resource link is available, include at least ${targetWorkflowPosts} such post(s) in this run. Never include more than one workflow post just to meet this target, and do not select a weak or promotional item.

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
- A practical programming or content-creation plugin, extension, agent skill, MCP server, instruction file, repository, prompt, or workflow

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
Choose exactly ${requestedPosts} final articles. Each selected article MUST have a different CATEGORY value from the candidate list. Prefer the strongest article in each distinct field such as industry, medicine, commerce, policy, software development, research, security, robotics, tools, models, or agents. Do not select multiple articles from the same category or the same underlying event.

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

Write a detailed Egyptian Arabic Facebook post that follows this exact editorial shape:

1. HOOK HEADLINE:
Start with one standalone headline-like sentence. It must be specific to the story and create curiosity. It may include a factual number or a strong contrast when the source supports it. Do not copy the source headline word for word.

2. CONTEXT:
Use one or two substantial paragraphs to explain what happened and why the reader should care. Introduce the people, organization, product, research, or event using only facts in the title and description.

3. FACTUAL BULLETS:
Use one or more lines beginning with ✴️ for the concrete details, numbers, capabilities, sequence of events, or direct outcomes that are supported by the source. Each line must add a different fact. Do not use ✴️ as decoration or repeat the same sentence.

4. ANALYSIS:
Use lines beginning with ⏺️ when the source provides broader context, comparison, trend, limitation, or implication. Explain why the details matter without inventing consequences. For a short story where no supported analysis exists, omit ⏺️ rather than speculate.

5. HUMAN CONCLUSION:
Use a paragraph beginning with 👋 to explain the central lesson or tension in a thoughtful human voice. It must be an evidence-based interpretation of the provided facts and must not become generic motivational writing.

6. PRACTICAL RESULT:
Use a paragraph beginning with ✅ when the source mentions a solution, tool, method, response, next step, or practical consequence. Omit it if the source does not support one.

7. ENDING:
End the editorial text with 3 to 5 relevant hashtags. Do NOT write a source link, "المصدر", or "الرابط في التعليقات" inside POST. The program adds the source link exactly once after the post.
For AI_DEV_TOOLS or AI_CREATOR_TOOLS, explain the practical value. Do not put URLs in POST; the program adds a direct resource link only if that exact URL was supplied with the candidate.

The first line must feel like the examples: a news hook with a clear subject and a memorable detail. The middle must be information-dense rather than a short summary. Preserve the progression from what happened to the details to why it matters.

The post should feel like a smart Egyptian technology creator explaining an important story in depth. It must not feel like a press release, a newspaper translation, an AI summary, corporate marketing, or generic filler.

Use the symbols as editorial labels with the exact visual characters ✴️ ⏺️ ✅ 👋. Do not replace them with bullets, hyphens, or other emoji.

Arabic should remain the main language. Naturally mix official English technology names and technical terms without transliterating them.

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
STYLE FIDELITY EXAMPLE
==================================================

Use this structure as a template, not as text to copy:

[Specific curiosity headline with a factual detail]

[What happened and the essential context in a complete paragraph]

✴️ [Concrete fact or number]
✴️ [Another concrete fact]
✴️ [Another supported detail]

⏺️ [Why the facts matter or what broader context the source supports]

👋 [The human and technical meaning of the story based on the facts]

✅ [The practical response or solution when the source provides one]

#[relevant hashtag]
#[relevant hashtag]

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

You MUST select exactly ${requestedPosts} articles.

Selections must be ranked from most urgent and useful to least urgent. Never select two articles describing the same event. Prefer distinct categories and concepts. The first selection is the one to publish first.

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

1. Exactly ${requestedPosts} articles were selected.

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
25. For AI_DEV_TOOLS and AI_CREATOR_TOOLS, RESOURCE_URL must exactly match one direct resource link supplied with the candidate, not the news article URL. If no direct link is supplied, do not select that candidate.

If any condition fails then rewrite before returning.

==================================================
RECENTLY PUBLISHED STORIES
==================================================

${publishedText}

==================================================
RECENT CATEGORY PERFORMANCE (RAW INTERACTIONS)
==================================================

${performanceText}

Use this only as a light tie-breaker between equally useful stories. Do not select a weak story because of past interaction counts. These are raw reactions/comments/shares, not reach-normalized rates.

==================================================
CURRENT CANDIDATE NEWS
==================================================

${newsText}

==================================================
FINAL OUTPUT
==================================================

Return ONLY this exact format for each selected article. Number blocks consecutively starting at 1:

POST_1:
[Arabic Facebook post]

IMAGE_QUERY_1:
[English Pexels search query]

SELECTED_INDEX_1:
[number]

RESOURCE_URL_1:
[one exact direct resource URL supplied with the selected article, or NONE]

Repeat all four fields for POST_2, POST_3 and so on when selecting more than one article.

Do not add explanations.

Do not add analysis.

Do not add anything before POST.

Do not add anything after the last SELECTED_INDEX_N.
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

            const posts = [];
            const selectedIndexes = new Set();
            const selectedCategories = new Set();

            for (let number = 1; number <= requestedPosts; number++) {
                const postMatch = text.match(
                    new RegExp(`POST_${number}:\\s*([\\s\\S]*?)(?=\\n\\s*IMAGE_QUERY_${number}:)`, "i")
                );
                const imageQueryMatch = text.match(
                    new RegExp(`IMAGE_QUERY_${number}:\\s*([\\s\\S]*?)(?=\\n\\s*SELECTED_INDEX_${number}:)`, "i")
                );
                const selectedMatch = text.match(
                    new RegExp(`SELECTED_INDEX_${number}:\\s*(\\d+)`, "i")
                );
                const resourceUrlMatch = text.match(
                    new RegExp(`RESOURCE_URL_${number}:\\s*(\\S+)`, "i")
                );

                if (!postMatch && !imageQueryMatch && !selectedMatch && !resourceUrlMatch) {
                    continue;
                }

                if (!postMatch || !imageQueryMatch || !selectedMatch || !resourceUrlMatch) {
                    throw new Error(`Gemini returned an incomplete post block ${number}.`);
                }

                const selectedIndex = Number(selectedMatch[1]);
                const post = postMatch[1].trim();
                const imageQuery = imageQueryMatch[1].trim();
                const requestedResourceUrl = resourceUrlMatch[1].trim();

                if (selectedIndex < 1 || selectedIndex > latestNews.length) {
                    throw new Error("Gemini returned an invalid selected article index.");
                }

                if (selectedIndexes.has(selectedIndex)) {
                    throw new Error("Gemini selected the same article more than once.");
                }

                if (!post || !imageQuery) {
                    throw new Error(`Gemini returned an empty value in post block ${number}.`);
                }

                if (post.includes(",") || post.includes("،")) {
                    throw new Error("Gemini generated a comma inside POST.");
                }

                const hashtags = post.match(/#[^\s#]+/g) || [];
                if (hashtags.length < 3 || hashtags.length > 5) {
                    throw new Error(`Gemini generated ${hashtags.length} hashtags in post ${number}.`);
                }

                if (!post.includes("✴️") || !post.includes("👋")) {
                    throw new Error(
                        `Gemini did not follow the required editorial markers in post ${number}.`
                    );
                }

                const postBeforeHashtags = post.replace(/#[^\s#]+/g, "").trim();
                const paragraphs = postBeforeHashtags
                    .split(/\n\s*\n/)
                    .map(paragraph => paragraph.trim())
                    .filter(Boolean);

                if (paragraphs.length < 4 || paragraphs.length > 8) {
                    throw new Error(`Gemini generated ${paragraphs.length} paragraphs in post ${number}.`);
                }

                const imageWords = imageQuery.split(/\s+/).filter(Boolean);
                if (imageWords.length < 3 || imageWords.length > 8) {
                    throw new Error(`Gemini returned an invalid image query for post ${number}.`);
                }

                const article = latestNews[selectedIndex - 1];
                let resourceUrl = requestedResourceUrl.toUpperCase() === "NONE"
                    ? null
                    : requestedResourceUrl;

                if (
                    resourceUrl &&
                    !article.resourceLinks?.includes(resourceUrl)
                ) {
                    throw new Error(
                        `Gemini returned a resource URL not supplied for post ${number}.`
                    );
                }

                if (
                    ["AI_DEV_TOOLS", "AI_CREATOR_TOOLS"].includes(article.category) &&
                    !resourceUrl
                ) {
                    throw new Error(
                        `Workflow-tool post ${number} has no verified direct resource URL.`
                    );
                }

                if (resourceUrl) {
                    resourceUrl = await validateResourceUrl(resourceUrl);
                }

                if (selectedCategories.has(article.category)) {
                    throw new Error(
                        `Gemini selected more than one article from category ${article.category}.`
                    );
                }

                const postWithoutSourceLine = post
                    .split(/\r?\n/)
                    .filter(line => {
                        return !/^\s*(المصدر|الرابط في التعليقات)\s*:?.*$/i.test(
                            line.trim()
                        );
                    })
                    .join("\n")
                    .trim();
                const postBody = postWithoutSourceLine
                    .replace(/#[^\s#]+/g, "")
                    .trim();
                const resourceLinkBlock = resourceUrl
                    ? `\n\n🔗 لينك الأداة:\n${resourceUrl}`
                    : "";
                const finalPost = `${postBody}${resourceLinkBlock}\n\nالمصدر:\n${article.link}\n\n${hashtags.join(" ")}`;

                selectedIndexes.add(selectedIndex);
                selectedCategories.add(article.category);
                posts.push({
                    post: finalPost,
                    imageQuery,
                    article,
                    resourceUrl,
                    rank: number
                });
            }

            if (posts.length !== requestedPosts) {
                throw new Error(
                    `Gemini returned ${posts.length} post(s); exactly ${requestedPosts} are required.`
                );
            }

            const selectedWorkflowPosts = posts.filter(post =>
                workflowCategories.includes(post.article.category) && post.resourceUrl
            ).length;
            if (selectedWorkflowPosts < targetWorkflowPosts) {
                throw new Error(
                    `Gemini selected ${selectedWorkflowPosts} workflow post(s); ${targetWorkflowPosts} are required when verified candidates are available.`
                );
            }

            console.log(`✅ Gemini selected ${posts.length} diverse post(s).`);

            return {
                ...posts[0],
                posts
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