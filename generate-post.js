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
Published: ${item.publishedAt}
Link: ${item.link}`;
        })
        .join("\n\n");

    const prompt = `
You are a strict AI technology news editor.

Here are recent AI news articles from the last 7 days:

${newsText}

Your job is to:

1. Select ONE article.
2. Write a professional Facebook post in Arabic.
3. Use ONLY facts explicitly present in the provided article title, publication date, and URL.
4. NEVER add facts, numbers, names, quotes, causes, consequences, locations, organizations, or details that are not explicitly present in the provided data.
5. Do NOT use your own knowledge.
6. Do NOT browse the internet.
7. Do NOT claim that you read the original article.
8. If the available information is limited, keep the post short rather than guessing.
9. Start with an engaging but factual hook.
10. Briefly explain what the title says without introducing new factual claims.
11. End with a simple question encouraging comments.
12. Add 3-5 relevant hashtags.
13. Put the exact original article URL at the very end.

IMPORTANT:
The Facebook post must contain NO factual information that cannot be directly verified from the provided data.

At the very end of your response, add this exact line:

SELECTED_INDEX: X

Replace X with the number of the article you selected.

Return ONLY the final Facebook post followed by the SELECTED_INDEX line.
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

            const match = text.match(/SELECTED_INDEX:\s*(\d+)/i);

            if (!match) {
                throw new Error(
                    "Gemini did not return SELECTED_INDEX."
                );
            }

            const selectedIndex = Number(match[1]);

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

            const post = text
                .replace(
                    /SELECTED_INDEX:\s*\d+/i,
                    ""
                )
                .trim();

            return {
                post,
                article: selectedArticle
            };

        } catch (error) {
            const errorMessage = error.message || "";

            if (
                errorMessage.includes("GenerateRequestsPerDayPerModel-FreeTier") ||
                errorMessage.includes("generate_content_free_tier_requests") ||
                errorMessage.includes("RESOURCE_EXHAUSTED")
            ) {
                throw new Error(
                    "Gemini daily free quota has been exceeded. " +
                    "Please wait for the quota reset before trying again."
                );
            }

            console.log(`⚠️ Gemini error: ${errorMessage}`);

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