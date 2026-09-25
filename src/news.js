require("dotenv").config();

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const PUBLISHED_FILE = path.join(__dirname, "..", "data", "published-news.json");

const MAX_TOTAL_CANDIDATES = 60;
const MAX_PER_CATEGORY = 8;
const MIN_PER_CATEGORY = 2;
const configuredMaxPosts = Number(
    process.env.MAX_POSTS_PER_RUN || 4
);
const MAX_POSTS_PER_RUN = Number.isFinite(configuredMaxPosts)
    ? Math.max(1, Math.floor(configuredMaxPosts))
    : 4;

/*
 * These categories get first opportunity during
 * the diversity pass so useful research and agent
 * stories do not disappear behind company/model news.
 */
const CATEGORY_PRIORITY = [
    "AI_RESEARCH",
    "AI_AGENTS",
    "AI_SECURITY",
    "AI_ROBOTICS",
    "AI_HEALTH",
    "AI_SCIENCE",
    "AI_MANUFACTURING",
    "AI_TRANSPORT",
    "AI_AEROSPACE",
    "AI_ENERGY",
    "AI_CLIMATE",
    "AI_AGRICULTURE",
    "AI_FINANCE",
    "AI_EDUCATION",
    "AI_GOVERNMENT",
    "AI_CONSTRUCTION",
    "AI_TRAVEL",
    "AI_CONSUMER",
    "AI_FRONTIER_TECH",
    "AI_MODELS",
    "AI_TOOLS",
    "AI_PROJECTS",
    "AI_BUSINESS",
    "AI_COMPANIES",
    "AI_POLICY"
];

const CATEGORIES = {
    AI_MODELS: "AI model OR LLM OR generative AI model",
    AI_TOOLS: "AI tool OR AI product OR AI software",
    AI_PROJECTS: "AI project OR AI application OR AI startup product",
    AI_AGENTS: "AI agents OR autonomous AI OR AI automation",
    AI_RESEARCH: "AI research OR artificial intelligence breakthrough",
    AI_COMPANIES:
        "OpenAI OR Google AI OR Anthropic OR Meta AI OR Microsoft AI",
    AI_BUSINESS:
        "AI funding OR AI investment OR AI business OR AI startup",
    AI_ROBOTICS:
        "AI robotics OR humanoid robot OR intelligent robot",
    AI_SECURITY:
        "AI cybersecurity OR AI security OR AI hacking",
    AI_POLICY:
        "AI regulation OR AI policy OR AI law OR artificial intelligence government",
    AI_HEALTH:
        "AI healthcare OR medical AI OR AI diagnosis OR medical robotics OR health technology",
    AI_SCIENCE:
        "AI science OR scientific discovery OR laboratory technology OR research technology",
    AI_MANUFACTURING:
        "AI manufacturing OR industrial automation OR factory robotics OR smart factory",
    AI_TRANSPORT:
        "AI transportation OR self-driving OR autonomous vehicle OR mobility technology",
    AI_AEROSPACE:
        "AI aerospace OR aviation technology OR space technology OR aircraft innovation",
    AI_ENERGY:
        "AI energy OR battery technology OR renewable technology OR nuclear technology",
    AI_CLIMATE:
        "AI climate technology OR climate tech OR carbon capture technology OR sustainability technology",
    AI_AGRICULTURE:
        "AI agriculture OR farming technology OR agricultural robotics OR food technology",
    AI_FINANCE:
        "AI finance OR fintech technology OR banking technology OR payments innovation",
    AI_EDUCATION:
        "AI education OR learning technology OR classroom technology OR edtech innovation",
    AI_GOVERNMENT:
        "government technology OR public sector AI OR digital government OR civic technology",
    AI_CONSTRUCTION:
        "AI construction OR construction robotics OR building technology OR smart buildings",
    AI_TRAVEL:
        "AI travel technology OR tourism technology OR hotel technology OR airport innovation",
    AI_CONSUMER:
        "consumer technology OR smart home OR wearable technology OR retail technology",
    AI_FRONTIER_TECH:
        "technology breakthrough OR deep tech OR semiconductor innovation OR quantum technology"
};

const CATEGORY_ORDER = Object.keys(CATEGORIES);

const SOURCE_SCORES = {
    "reuters.com": 10,
    "apnews.com": 10,
    "bbc.com": 9,
    "cnn.com": 9,
    "nytimes.com": 9,
    "washingtonpost.com": 9,
    "ft.com": 9,
    "nature.com": 9,
    "science.org": 9,
    "theguardian.com": 8,
    "cnbc.com": 8,
    "techcrunch.com": 8,
    "theverge.com": 8,
    "arstechnica.com": 8,
    "wired.com": 8,
    "technologyreview.com": 8,
    "spectrum.ieee.org": 8,
    "bloomberg.com": 8,
    "abc.net.au": 8,
    "npr.org": 8,
    "pbs.org": 8,
    "axios.com": 7,
    "engadget.com": 7,
    "venturebeat.com": 7,
    "zdnet.com": 7,
    "livescience.com": 7,
    "sciencedaily.com": 7,
    "forbes.com": 6,
    "hpcwire.com": 6,
    "manufacturingdive.com": 6,
    "technology.org": 6,
    "theregister.com": 6,
    "techradar.com": 6,
    "tomshardware.com": 6
};

const LOW_QUALITY_SOURCES = new Set([
    "x.com",
    "twitter.com",
    "hackernoon.com",
    "tradingview.com",
    "dealroom.co",
    "pulse2.com",
    "beebeez.com",
    "beebeez.eu",
    "oodaloop.com",
    "vmblog.com",
    "athletechnews.com",
    "storyboard18.com",
    "shoppeblack.com",
    "nojitter.com",
    "arnnet.com",
    "peoplematters.in",
    "fastcompany.com",
    "finance.biggo.com",
    "breakingthenews.net",
    "qz.com",
    "yahoo.com",
    "yahoo.co.uk"
]);

const PR_SOURCES = new Set([
    "businesswire.com",
    "prnewswire.com",
    "globenewswire.com",
    "newswise.com"
]);

const STOP_WORDS = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "from",
    "by",
    "at",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "into",
    "about",
    "after",
    "before",
    "over",
    "under",
    "new",
    "latest",
    "news",
    "says",
    "said",
    "according",
    "report",
    "reports",
    "could",
    "would",
    "will",
    "more",
    "than",
    "how",
    "what",
    "why",
    "who",
    "their",
    "they",
    "them",
    "you",
    "your",
    "we",
    "our",
    "us",
    "he",
    "she",
    "his",
    "her",
    "world",
    "global",
    "company",
    "companies",
    "technology",
    "tech",
    "artificial",
    "intelligence",
    "ai"
]);

const WORD_ALIASES = {
    openai: ["openai", "chatgpt", "sam altman"],
    anthropic: ["anthropic", "claude", "dario amodei"],
    google: ["google", "gemini", "deepmind"],
    meta: ["meta", "facebook", "instagram", "muse", "charm"],
    microsoft: ["microsoft", "copilot", "azure"],
    apple: ["apple", "siri"],
    nvidia: ["nvidia", "jensen huang"],
    amazon: ["amazon", "aws"],
    xai: ["xai", "grok"],
    alibaba: ["alibaba", "qwen"],
    deepseek: ["deepseek"],
    qualcomm: ["qualcomm"],
    uipath: ["uipath"],
    accenture: ["accenture"],
    toyota: ["toyota"],
    enveda: ["enveda"],
    ema: ["ema"],
    basecamp_research: ["basecamp research"],
    figure: ["figure ai", "figure"],
    unitree: ["unitree"],
    cognex: ["cognex"],
    realsense: ["realsense"],
    modal: ["modal labs", "modal"],
    palo_alto: ["palo alto networks"],
    verizon: ["verizon"],
    fbi: ["fbi", "federal bureau of investigation"],
    australia: ["australia", "australian"],
    ukraine: ["ukraine", "ukrainian"],
    china: ["china", "chinese"],
    trump: ["trump"],
    sanders: ["sanders"],
    united_nations: [
        "united nations",
        "security council",
        "u.n."
    ],
    maryland: ["maryland"],
    japan: ["japan", "japanese"]
};

const EVENT_GROUPS = {
    HACK: [
        "hack",
        "hacked",
        "hacking",
        "breach",
        "breached",
        "cyberattack",
        "cyber attack",
        "infiltrated",
        "stolen data",
        "data breach",
        "security incident",
        "compromised"
    ],

    LAUNCH: [
        "launch",
        "launched",
        "launches",
        "unveil",
        "unveils",
        "unveiled",
        "debut",
        "debuts",
        "introduces",
        "introduced",
        "release",
        "released",
        "rolls out",
        "rolled out"
    ],

    FUNDING: [
        "funding",
        "funded",
        "raises",
        "raised",
        "financing",
        "investment",
        "invests",
        "invested",
        "venture capital",
        "series a",
        "series b",
        "series c"
    ],

    ACQUISITION: [
        "acquire",
        "acquires",
        "acquired",
        "acquisition",
        "buy",
        "bought",
        "takeover"
    ],

    PARTNERSHIP: [
        "partner",
        "partnership",
        "partners",
        "collaboration",
        "collaborate",
        "agreement"
    ],

    POLICY: [
        "bill",
        "law",
        "legislation",
        "regulation",
        "regulate",
        "policy",
        "government",
        "congress",
        "senate",
        "department",
        "executive order",
        "ban",
        "banned"
    ],

    RESEARCH: [
        "research",
        "study",
        "paper",
        "scientists",
        "scientist",
        "breakthrough",
        "discovery",
        "findings",
        "experiment",
        "laboratory",
        "lab",
        "published in",
        "journal"
    ],

    WARNING: [
        "warning",
        "warns",
        "warned",
        "risk",
        "risks",
        "threat",
        "threats",
        "danger",
        "dangerous"
    ],

    MODEL: [
        "model",
        "models",
        "llm",
        "language model",
        "reasoning model",
        "generative model",
        "benchmark"
    ],

    ROBOT: [
        "robot",
        "robotics",
        "humanoid",
        "humanoids",
        "robot arm",
        "industrial robot",
        "physical ai",
        "teleoperation"
    ]
};

const GENERIC_MARKERS = new Set([
    "ai",
    "artificial",
    "intelligence",
    "technology",
    "tech",
    "startup",
    "company",
    "companies",
    "business",
    "future",
    "industry",
    "market",
    "global",
    "world",
    "software",
    "platform",
    "system",
    "systems",
    "solution",
    "solutions"
]);

const BAD_TITLE_PATTERNS = [
    /\bopinion\b/i,
    /\beditorial\b/i,
    /\bcommentary\b/i,
    /\banalysis\b/i,
    /\bcolumn\b/i,
    /\bnewsletter\b/i,
    /\bsubscribe\b/i,
    /\bwhat we know\b/i,
    /\bhere's what\b/i,
    /\bwhy .* matters\b/i,
    /\bhow .* plans to win\b/i,
    /\bworld's best\b/i,
    /\bbest .* ai\b/i,
    /\btop \d+\b/i,
    /\b\d+ best\b/i,
    /\bstock pick\b/i,
    /\bprice target\b/i,
    /\bwall street\b/i,
    /\bmarket watch\b/i,
    /\bagenda\b/i,
    /\bsummit\b/i,
    /\broundup\b/i,
    /\bbiggest news\b/i,
    /\bkey moments\b/i,
    /\bwhat .* means\b/i,
    /\blive blog\b/i,
    /\blive updates\b/i,
    /\blive coverage\b/i,
    /\bshares jump\b/i,
    /\bstock rises\b/i,
    /\bstock falls\b/i,
    /\bstocks to watch\b/i,
    /\bprice target\b/i,
    /\bpredicts\b/i,
    /\bprediction\b/i
];

const BAD_CONTENT_PATTERNS = [
    /\bopinion\b/i,
    /\beditorial\b/i,
    /\bcommentary\b/i,
    /\bnewsletter\b/i,
    /\bstock pick\b/i,
    /\bprice target\b/i,
    /\bshare price\b/i,
    /\bstock market\b/i,
    /\binvestment advice\b/i,
    /\bsponsored\b/i,
    /\bpromoted\b/i,
    /\bregister now\b/i,
    /\bjoin us\b/i,
    /\bconference\b/i,
    /\bsummit\b/i,
    /\bagenda\b/i,
    /\blive blog\b/i,
    /\blive updates\b/i,
    /\blive coverage\b/i
];

function normalizeText(text = "") {
    return text
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/[^\p{L}\p{N}\s-]/gu, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getWords(text = "") {
    return new Set(
        normalizeText(text)
            .split(/\s+/)
            .filter(
                word =>
                    word.length >= 3 &&
                    !STOP_WORDS.has(word)
            )
    );
}

function getHostname(link = "") {
    try {
        return new URL(link)
            .hostname
            .replace(/^www\./, "")
            .toLowerCase();
    } catch (_) {
        return "";
    }
}

function getSourceHostname(article) {
    return (
        getHostname(article.sourceUrl) ||
        getHostname(article.link)
    );
}

function canonicalizeUrl(link = "") {
    try {
        const url = new URL(link.trim());
        const removableParams = [
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_content",
            "utm_term",
            "gclid",
            "fbclid",
            "ocid",
            "ved"
        ];

        for (const parameter of removableParams) {
            url.searchParams.delete(parameter);
        }

        url.hash = "";
        return url.toString().replace(/\/$/, "");
    } catch (_) {
        return link.trim().replace(/\/$/, "");
    }
}

function getSourceScore(article) {
    const hostname = getSourceHostname(article);

    for (const [domain, score] of Object.entries(SOURCE_SCORES)) {
        if (
            hostname === domain ||
            hostname.endsWith(`.${domain}`)
        ) {
            return score;
        }
    }

    if (PR_SOURCES.has(hostname)) {
        return 5;
    }

    if (LOW_QUALITY_SOURCES.has(hostname)) {
        return 1;
    }

    return 4;
}

function getCanonicalEntities(text = "") {
    const normalized = normalizeText(text);
    const entities = new Set();

    for (const [canonical, aliases] of Object.entries(WORD_ALIASES)) {
        if (
            aliases.some(alias =>
                normalized.includes(
                    normalizeText(alias)
                )
            )
        ) {
            entities.add(canonical);
        }
    }

    return entities;
}

function getEventTypes(text = "") {
    const normalized = normalizeText(text);
    const events = new Set();

    for (const [event, keywords] of Object.entries(EVENT_GROUPS)) {
        if (
            keywords.some(keyword =>
                normalized.includes(
                    normalizeText(keyword)
                )
            )
        ) {
            events.add(event);
        }
    }

    return events;
}

function getSpecificTopicWords(text = "") {
    return new Set(
        [...getWords(text)].filter(word => {
            if (GENERIC_MARKERS.has(word)) {
                return false;
            }

            return word.length >= 5 || /\d/.test(word);
        })
    );
}

function intersectionSize(setA, setB) {
    let count = 0;

    for (const value of setA) {
        if (setB.has(value)) {
            count++;
        }
    }

    return count;
}

function overlap(setA, setB) {
    if (!setA.size || !setB.size) {
        return 0;
    }

    return (
        intersectionSize(setA, setB) /
        Math.min(setA.size, setB.size)
    );
}

function calculateStorySimilarity(articleA, articleB) {
    const textA =
        `${articleA.title || ""} ${articleA.description || ""}`;

    const textB =
        `${articleB.title || ""} ${articleB.description || ""}`;

    const titleA = getWords(articleA.title || "");
    const titleB = getWords(articleB.title || "");

    const specificA = getSpecificTopicWords(textA);
    const specificB = getSpecificTopicWords(textB);

    const entitiesA = getCanonicalEntities(textA);
    const entitiesB = getCanonicalEntities(textB);

    const eventsA = getEventTypes(textA);
    const eventsB = getEventTypes(textB);

    const titleOverlap = overlap(titleA, titleB);
    const specificOverlap = overlap(specificA, specificB);
    const entityOverlap = overlap(entitiesA, entitiesB);
    const eventOverlap = overlap(eventsA, eventsB);

    if (titleOverlap >= 0.78) {
        return 0.95;
    }

    if (
        entityOverlap >= 0.5 &&
        eventOverlap >= 0.5 &&
        specificOverlap >= 0.55
    ) {
        return 0.90;
    }

    if (
        entityOverlap >= 0.5 &&
        specificOverlap >= 0.72 &&
        titleOverlap >= 0.35
    ) {
        return 0.87;
    }

    if (
        specificOverlap >= 0.80 &&
        titleOverlap >= 0.45
    ) {
        return 0.88;
    }

    if (
        eventOverlap >= 0.5 &&
        specificOverlap >= 0.75 &&
        titleOverlap >= 0.40
    ) {
        return 0.85;
    }

    return 0;
}

/*
 * Same entity + same event is NOT automatically a duplicate.
 * We also require meaningful specific-topic overlap.
 */
function isSameEntityAndEvent(articleA, articleB) {
    const textA =
        `${articleA.title || ""} ${articleA.description || ""}`;

    const textB =
        `${articleB.title || ""} ${articleB.description || ""}`;

    const entitiesA = getCanonicalEntities(textA);
    const entitiesB = getCanonicalEntities(textB);

    const eventsA = getEventTypes(textA);
    const eventsB = getEventTypes(textB);

    if (
        intersectionSize(entitiesA, entitiesB) < 1 ||
        intersectionSize(eventsA, eventsB) < 1
    ) {
        return false;
    }

    const specificA = getSpecificTopicWords(textA);
    const specificB = getSpecificTopicWords(textB);

    return overlap(specificA, specificB) >= 0.55;
}

function isSameHeadline(articleA, articleB) {
    const titleA = getWords(articleA.title || "");
    const titleB = getWords(articleB.title || "");

    if (titleA.size < 4 || titleB.size < 4) {
        return false;
    }

    const meaningfulA = new Set(
        [...titleA].filter(word => !GENERIC_MARKERS.has(word))
    );
    const meaningfulB = new Set(
        [...titleB].filter(word => !GENERIC_MARKERS.has(word))
    );

    return (
        meaningfulA.size >= 3 &&
        meaningfulB.size >= 3 &&
        overlap(meaningfulA, meaningfulB) >= 0.72
    );
}

function isDuplicateStory(articleA, articleB) {
    if (
        canonicalizeUrl(articleA.link) &&
        canonicalizeUrl(articleA.link) ===
            canonicalizeUrl(articleB.link)
    ) {
        return true;
    }

    if (isSameHeadline(articleA, articleB)) {
        return true;
    }

    return (
        isSameEntityAndEvent(articleA, articleB) ||
        calculateStorySimilarity(articleA, articleB) >= 0.80
    );
}

function createTopicFingerprint(article) {
    const text =
        `${article.title || ""} ${article.description || ""}`;

    return {
        entities: [
            ...getCanonicalEntities(text)
        ].sort(),

        events: [
            ...getEventTypes(text)
        ].sort(),

        specificWords: [
            ...getSpecificTopicWords(text)
        ]
            .sort()
            .slice(0, 12)
    };
}

function isLowQualityArticle(article) {
    const title = article.title || "";
    const description = article.description || "";

    if (!title.trim()) {
        return true;
    }

    for (const pattern of BAD_TITLE_PATTERNS) {
        if (pattern.test(title)) {
            return true;
        }
    }

    const combined =
        `${title} ${description}`;

    for (const pattern of BAD_CONTENT_PATTERNS) {
        if (pattern.test(combined)) {
            return true;
        }
    }

    const hostname =
        getSourceHostname(article);

    if (LOW_QUALITY_SOURCES.has(hostname)) {
        return true;
    }

    const normalized =
        normalizeText(combined);

    const events =
        getEventTypes(combined);

    const concreteBusinessEvent =
        events.has("FUNDING") ||
        events.has("ACQUISITION") ||
        events.has("PARTNERSHIP");

    const financialWords = [
        "stock",
        "stocks",
        "shares",
        "valuation",
        "price target",
        "wall street",
        "market cap",
        "share price"
    ];

    const financialWordCount =
        financialWords.filter(word =>
            normalized.includes(word)
        ).length;

    if (
        financialWordCount >= 2 &&
        !concreteBusinessEvent
    ) {
        return true;
    }

    /*
     * PR material must contain a concrete development.
     */
    if (PR_SOURCES.has(hostname)) {
        const concreteEvent =
            events.has("LAUNCH") ||
            events.has("FUNDING") ||
            events.has("ACQUISITION") ||
            events.has("PARTNERSHIP") ||
            events.has("MODEL") ||
            events.has("ROBOT") ||
            events.has("RESEARCH");

        if (!concreteEvent) {
            return true;
        }
    }

    /*
     * Reject very thin articles unless the title itself
     * clearly describes a concrete event.
     */
    if (
        description.trim().length < 70 &&
        !events.has("HACK") &&
        !events.has("FUNDING") &&
        !events.has("ACQUISITION") &&
        !events.has("LAUNCH") &&
        !events.has("MODEL") &&
        !events.has("RESEARCH") &&
        !events.has("ROBOT")
    ) {
        return true;
    }

    return false;
}

function readPublishedNews() {
    if (!fs.existsSync(PUBLISHED_FILE)) {
        return [];
    }

    try {
        const data = JSON.parse(
            fs.readFileSync(
                PUBLISHED_FILE,
                "utf8"
            )
        );

        return Array.isArray(data)
            ? data
            : [];
    } catch (error) {
        console.error(
            "Could not read published-news.json:",
            error.message
        );

        return [];
    }
}

function getPublishedNews() {
    return readPublishedNews();
}

function isSameUrl(article, published) {
    return (
        article.link &&
        published.link &&
        canonicalizeUrl(article.link) ===
            canonicalizeUrl(published.link)
    );
}

function removePreviouslyPublishedTopics(
    articles,
    publishedNews
) {
    let removed = 0;

    const remaining =
        articles.filter(article => {
            const duplicate =
                publishedNews.some(published => {
                    if (
                        isSameUrl(
                            article,
                            published
                        )
                    ) {
                        return true;
                    }

                    return isDuplicateStory(article, published);
                });

            if (duplicate) {
                removed++;
                return false;
            }

            return true;
        });

    console.log(
        `Previously published topic filtering removed ${removed} article(s).`
    );

    return remaining;
}

function removeObviousStoryDuplicates(articles) {
    const kept = [];

    let duplicateRemoved = 0;

    for (const article of articles) {
        let duplicate = false;

        for (const existing of kept) {
            if (isDuplicateStory(article, existing)) {
                duplicate = true;
                duplicateRemoved++;
                break;
            }
        }

        if (!duplicate) {
            kept.push(article);
        }
    }

    console.log(
        `Story duplicate removals: ${duplicateRemoved}`
    );

    return kept;
}

function scoreArticle(article) {
    const sourceScore =
        getSourceScore(article);

    const title =
        normalizeText(article.title || "");

    const description =
        normalizeText(article.description || "");

    const text =
        `${title} ${description}`;

    const events =
        getEventTypes(text);

    let score = sourceScore;

    if (events.has("HACK")) score += 6;
    if (events.has("RESEARCH")) score += 7;
    if (events.has("MODEL")) score += 5;
    if (events.has("LAUNCH")) score += 4;
    if (events.has("ACQUISITION")) score += 4;
    if (events.has("FUNDING")) score += 3;
    if (events.has("PARTNERSHIP")) score += 3;
    if (events.has("ROBOT")) score += 3;
    if (events.has("POLICY")) score += 3;
    if (events.has("WARNING")) score += 2;

    /*
     * Extra value for research articles that contain
     * actual scientific signals.
     */
    if (
        article.category === "AI_RESEARCH"
    ) {
        if (events.has("RESEARCH")) {
            score += 4;
        }

        if (
            /\bpaper\b|\bstudy\b|\bscientists?\b|\bjournal\b|\bexperiment\b/i.test(
                text
            )
        ) {
            score += 3;
        }
    }

    /*
     * Extra value for genuine agent/automation stories.
     */
    if (
        article.category === "AI_AGENTS"
    ) {
        if (
            /\bagent\b|\bagents\b|\bautomation\b|\bautonomous\b/i.test(
                text
            )
        ) {
            score += 3;
        }
    }

    if (description.length >= 180) {
        score += 2;
    }

    if (description.length >= 350) {
        score += 1;
    }

    const financialWords = [
        "stock",
        "shares",
        "valuation",
        "market cap",
        "share price"
    ];

    const financialCount =
        financialWords.filter(word =>
            text.includes(word)
        ).length;

    if (
        financialCount >= 2 &&
        !events.has("FUNDING") &&
        !events.has("ACQUISITION")
    ) {
        score -= 5;
    }

    return score;
}

function sortArticles(articles) {
    return [...articles].sort(
        (a, b) =>
            scoreArticle(b) -
            scoreArticle(a)
    );
}

function conflictsWithSelected(article, selected) {
    return selected.some(existing => {
        return isDuplicateStory(article, existing);
    });
}

function selectCategoryMinimums(
    ranked,
    selected,
    usedUrls,
    categoryCounts,
    sourceCounts,
    entityCounts
) {
    /*
     * Research and agents come first.
     * Other categories follow after them.
     */
    for (const category of CATEGORY_PRIORITY) {
        if (
            selected.length >=
            MAX_TOTAL_CANDIDATES
        ) {
            break;
        }

        /*
         * Research gets up to 3 opportunities.
         * Agents gets 2.
         * Other categories get 2.
         */
        const target =
            category === "AI_RESEARCH"
                ? 3
                : category === "AI_AGENTS"
                    ? 2
                    : MIN_PER_CATEGORY;

        if (
            categoryCounts[category] >=
            target
        ) {
            continue;
        }

        const candidates =
            ranked.filter(
                article =>
                    article.category === category &&
                    !usedUrls.has(article.link)
            );

        for (const article of candidates) {
            if (
                selected.length >=
                MAX_TOTAL_CANDIDATES
            ) {
                break;
            }

            if (
                categoryCounts[category] >=
                target
            ) {
                break;
            }

            const source =
                getSourceHostname(article);

            const text =
                `${article.title || ""} ${article.description || ""}`;

            const entities =
                getCanonicalEntities(text);

            /*
             * Entity cap is intentionally relaxed during
             * category protection.
             */
            if (
                [...entities].some(
                    entity =>
                        (entityCounts[entity] || 0) >= 4
                )
            ) {
                continue;
            }

            if (
                (sourceCounts[source] || 0) >= 6
            ) {
                continue;
            }

            if (
                conflictsWithSelected(
                    article,
                    selected
                )
            ) {
                continue;
            }

            selected.push(article);
            usedUrls.add(article.link);

            categoryCounts[category]++;

            sourceCounts[source] =
                (sourceCounts[source] || 0) + 1;

            for (const entity of entities) {
                entityCounts[entity] =
                    (entityCounts[entity] || 0) + 1;
            }
        }
    }
}

function selectDiverseCandidates(articles) {
    const selected = [];
    const usedUrls = new Set();

    const categoryCounts = {};
    const entityCounts = {};
    const sourceCounts = {};

    for (const category of CATEGORY_ORDER) {
        categoryCounts[category] = 0;
    }

    const ranked =
        sortArticles(articles);

    /*
     * PASS 1
     *
     * Protect category diversity.
     */
    selectCategoryMinimums(
        ranked,
        selected,
        usedUrls,
        categoryCounts,
        sourceCounts,
        entityCounts
    );

    /*
     * PASS 2
     *
     * Fill the rest using quality ranking.
     */
    for (const article of ranked) {
        if (
            selected.length >=
            MAX_TOTAL_CANDIDATES
        ) {
            break;
        }

        if (usedUrls.has(article.link)) {
            continue;
        }

        const category =
            article.category;

        if (
            (categoryCounts[category] || 0) >=
            MAX_PER_CATEGORY
        ) {
            continue;
        }

        const source =
            getSourceHostname(article);

        if (
            (sourceCounts[source] || 0) >= 6
        ) {
            continue;
        }

        const text =
            `${article.title || ""} ${article.description || ""}`;

        const entities =
            getCanonicalEntities(text);

        if (
            [...entities].some(
                entity =>
                    (entityCounts[entity] || 0) >= 4
            )
        ) {
            continue;
        }

        if (
            conflictsWithSelected(
                article,
                selected
            )
        ) {
            continue;
        }

        selected.push(article);
        usedUrls.add(article.link);

        categoryCounts[category]++;

        sourceCounts[source] =
            (sourceCounts[source] || 0) + 1;

        for (const entity of entities) {
            entityCounts[entity] =
                (entityCounts[entity] || 0) + 1;
        }
    }

    /*
     * PASS 3
     *
     * Fill remaining positions if necessary.
     * Duplicate-story protection remains active.
     */
    if (
        selected.length <
        MAX_TOTAL_CANDIDATES
    ) {
        for (const article of ranked) {
            if (
                selected.length >=
                MAX_TOTAL_CANDIDATES
            ) {
                break;
            }

            if (usedUrls.has(article.link)) {
                continue;
            }

            if (
                conflictsWithSelected(
                    article,
                    selected
                )
            ) {
                continue;
            }

            selected.push(article);
            usedUrls.add(article.link);
        }
    }

    return selected;
}

function decodeXml(value = "") {
    return value
        .replace(/<!\[CDATA\[/g, "")
        .replace(/\]\]>/g, "")
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
}

async function fetchGoogleNews(query) {
    const googleUrl =
        `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
        `&hl=en-US&gl=US&ceid=US:en`;

    let response;

    try {
        response = await axios.get(googleUrl, {
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; AI-News-Automation/1.0)"
            }
        });
    } catch (error) {
        const status = error.response?.status;

        if (status !== 429 && status !== 503) {
            throw error;
        }

        const bingUrl =
            `https://www.bing.com/news/search?q=${encodeURIComponent(query)}` +
            "&format=rss&setlang=en-us";

        response = await axios.get(bingUrl, {
            timeout: 15000,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; AI-News-Automation/1.0)"
            }
        });
    }

    const xml = response.data;

    const items = [];

    const itemMatches =
        xml.match(
            /<item>[\s\S]*?<\/item>/g
        ) || [];

    for (const item of itemMatches) {
        const title =
            item.match(
                /<title>([\s\S]*?)<\/title>/
            )?.[1] || "";

        const link =
            item.match(
                /<link>([\s\S]*?)<\/link>/
            )?.[1] || "";

        const pubDate =
            item.match(
                /<pubDate>([\s\S]*?)<\/pubDate>/
            )?.[1] || "";

        const description =
            item.match(
                /<description>([\s\S]*?)<\/description>/
            )?.[1] || "";

        const mediaUrl =
            item.match(
                /<(?:media:content|enclosure)[^>]+url=["']([^"']+)["'][^>]*type=["']video\//i
            )?.[1] ||
            item.match(
                /<(?:media:content|enclosure)[^>]+type=["']video\/[^"']*["'][^>]+url=["']([^"']+)["']/i
            )?.[1] || "";

        const sourceMatch =
            item.match(
                /<source[^>]*url=["']([^"']+)["'][^>]*>([\s\S]*?)<\/source>/i
            );

        const sourceUrl =
            sourceMatch?.[1] || "";

        const sourceName =
            sourceMatch?.[2] || "";

        items.push({
            title: decodeXml(title),
            link: decodeXml(link),
            publishedAt: decodeXml(pubDate),
            description: decodeXml(description),
            videoUrl: decodeXml(mediaUrl),
            sourceUrl: decodeXml(sourceUrl),
            sourceName: decodeXml(sourceName)
        });
    }

    return items;
}

function getMaxPostsPerRun() {
    return MAX_POSTS_PER_RUN;
}

function isRecent(article) {
    if (!article.publishedAt) {
        return false;
    }

    const date =
        new Date(article.publishedAt);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return false;
    }

    const ageHours =
        (
            Date.now() -
            date.getTime()
        ) /
        (1000 * 60 * 60);

    return (
        ageHours >= -2 &&
        ageHours <= 72
    );
}

async function getLatestAINews() {
    console.log(
        "Fetching latest AI news...\n"
    );

    let allArticles = [];

    for (
        const [category, query]
        of Object.entries(CATEGORIES)
    ) {
        try {
            const articles =
                await fetchGoogleNews(query);

            const tagged =
                articles.map(article => ({
                    ...article,
                    category
                }));

            allArticles.push(...tagged);

            console.log(
                `${category}: ${tagged.length} articles`
            );
        } catch (error) {
            console.error(
                `Failed to fetch ${category}:`,
                error.message
            );
        }
    }

    console.log(
        `\nCollected ${allArticles.length} raw articles.`
    );

    allArticles =
        allArticles.filter(isRecent);

    console.log(
        `After date filtering: ${allArticles.length}`
    );

    const urlSet = new Set();

    allArticles =
        allArticles.filter(article => {
            if (!article.link) {
                return false;
            }

            if (
                urlSet.has(article.link)
            ) {
                return false;
            }

            urlSet.add(article.link);

            return true;
        });

    console.log(
        `After URL deduplication: ${allArticles.length}`
    );

    const beforeQuality =
        allArticles.length;

    allArticles =
        allArticles.filter(
            article =>
                !isLowQualityArticle(
                    article
                )
        );

    console.log(
        `Quality filtering removed ${
            beforeQuality -
            allArticles.length
        } article(s).`
    );

    console.log(
        `After quality filtering: ${allArticles.length}`
    );

    const publishedNews =
        readPublishedNews();

    allArticles =
        removePreviouslyPublishedTopics(
            allArticles,
            publishedNews
        );

    console.log(
        `After previously-published-topic filtering: ${allArticles.length}`
    );

    const beforeStoryDedup =
        allArticles.length;

    allArticles =
        removeObviousStoryDuplicates(
            sortArticles(allArticles)
        );

    console.log(
        `Story deduplication removed ${
            beforeStoryDedup -
            allArticles.length
        } article(s).`
    );

    console.log(
        `After story deduplication: ${allArticles.length}`
    );

    const beforeSelection =
        allArticles.length;

    allArticles =
        selectDiverseCandidates(
            allArticles
        );

    console.log(
        `Editorial diversity selection removed ${
            beforeSelection -
            allArticles.length
        } article(s).`
    );

    console.log(
        `After editorial diversity selection: ${allArticles.length}`
    );

    const distribution = {};

    for (const article of allArticles) {
        distribution[article.category] =
            (distribution[article.category] || 0) + 1;
    }

    console.log(
        "\nCategory distribution:"
    );

    for (
        const category
        of CATEGORY_ORDER
    ) {
        console.log(
            `${category}: ${
                distribution[category] || 0
            }`
        );
    }

    console.log(
        `\nReturning ${allArticles.length} candidate articles.`
    );

    return allArticles;
}

function markNewsAsPublished(article) {
    const publishedNews =
        readPublishedNews();

    const record = {
        title: article.title,
        link: article.link,
        category: article.category,
        publishedAt:
            article.publishedAt ||
            new Date().toISOString(),
        sourceUrl:
            article.sourceUrl || "",
        sourceName:
            article.sourceName || "",
        topicFingerprint:
            createTopicFingerprint(
                article
            )
    };

    const alreadyExists =
        publishedNews.some(
            item =>
                item.link ===
                article.link
        );

    if (!alreadyExists) {
        publishedNews.push(record);
    }

    const trimmed =
        publishedNews.slice(-100);

    fs.writeFileSync(
        PUBLISHED_FILE,
        JSON.stringify(
            trimmed,
            null,
            2
        ),
        "utf8"
    );
}

module.exports = {
    getLatestAINews,
    getPublishedNews,
    markNewsAsPublished,
    getMaxPostsPerRun
};