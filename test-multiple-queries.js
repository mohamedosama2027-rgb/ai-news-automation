require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");
const { generatePost } = require("./generate-post");
const { searchImage } = require("./image-search");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function generateImageQueries(article) {

    console.log("\n🤖 Gemini is generating multiple image queries...");

    const prompt =
        "You are an editorial image search assistant.\n" +
        "\n" +
        "ARTICLE TITLE:\n" +
        article.title +
        "\n" +
        "\n" +
        "Create exactly 5 different English image search queries for Pexels.\n" +
        "\n" +
        "RULES:\n" +
        "1. Every query must be directly related to the article title.\n" +
        "2. Each query should approach the subject from a different visual angle.\n" +
        "3. Use specific entities, technologies, organizations, people, or places mentioned in the title when useful.\n" +
        "4. Do not invent entities, events, locations, people, or details.\n" +
        "5. Avoid overly generic queries such as 'AI technology' or 'technology'.\n" +
        "6. Queries must be suitable for finding editorial or conceptual stock photography.\n" +
        "7. Keep each query between 3 and 8 words.\n" +
        "\n" +
        "Return ONLY this format:\n" +
        "QUERY 1: [query]\n" +
        "QUERY 2: [query]\n" +
        "QUERY 3: [query]\n" +
        "QUERY 4: [query]\n" +
        "QUERY 5: [query]\n";

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: prompt
    });

    if (!response.text) {
        throw new Error("Gemini returned an empty response.");
    }

    const text = response.text.trim();

    console.log("\nGemini queries:");
    console.log(text);

    const queries = [];

    const regex =
        /QUERY\s+(\d+):\s*(.+)/gi;

    let match;

    while ((match = regex.exec(text)) !== null) {

        const queryNumber = Number(match[1]);
        const query = match[2].trim();

        if (
            queryNumber >= 1 &&
            queryNumber <= 5 &&
            query
        ) {
            queries.push({
                number: queryNumber,
                query
            });
        }
    }

    if (queries.length !== 5) {
        throw new Error(
            "Gemini did not return exactly 5 valid queries."
        );
    }

    return queries;
}

async function test() {

    try {

        console.log("=================================");
        console.log("MULTIPLE PEXELS QUERY TEST");
        console.log("=================================");

        console.log("Generating article...");

        const result = await generatePost();

        console.log("\nArticle:");
        console.log(result.article.title);

        console.log("\nOriginal query:");
        console.log(result.imageQuery);

        const queries =
            await generateImageQueries(
                result.article
            );

        console.log("\n=================================");
        console.log("SEARCHING ALL 5 QUERIES");
        console.log("=================================");

        for (const item of queries) {

            console.log(
                "\n🔎 Query " +
                item.number +
                ": " +
                item.query
            );

            const images =
                await searchImage(item.query);

            console.log(
                "📸 Images found: " +
                images.length
            );
        }

        console.log("\n=================================");
        console.log("TEST FINISHED");
        console.log("=================================");

    } catch (error) {

        console.error("\n❌ TEST FAILED");

        if (
            error.response &&
            error.response.data
        ) {
            console.error(
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );
        } else {
            console.error(error.message);
        }
    }
}

test();