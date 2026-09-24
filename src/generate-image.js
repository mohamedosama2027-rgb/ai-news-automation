require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function generateImage(article) {
    if (!article || !article.title) {
        throw new Error("Article information is missing.");
    }

    console.log("\n🎨 Generating AI image...");
    console.log(`📰 Article: ${article.title}`);

    const prompt = `
Create a professional editorial-style image for an AI technology news article.

ARTICLE TITLE:
${article.title}

IMPORTANT:
- Create a visually relevant image based ONLY on the article title.
- Do not invent specific events, locations, quotes, statistics, or details that are not supported by the title.
- If the article mentions a specific person, visually represent that person only when appropriate.
- If an exact person cannot be reliably represented, create a symbolic editorial illustration instead.
- Do not add random political rallies, protests, flags, logos, or unrelated people.
- Do not include fake screenshots or fake news headlines.
- No text, captions, labels, or watermarks inside the image.
- Professional technology-news editorial style.
- Suitable for a Facebook news post.
- Landscape composition.
`;

    const interaction = await ai.interactions.create({
        model: "gemini-3.1-flash-image",
        input: prompt
    });

    const imageOutput = interaction.outputs?.find(
        (output) => output.type === "image"
    );

    if (!imageOutput || !imageOutput.data) {
        throw new Error(
            "Gemini did not return an image."
        );
    }

    const outputPath = path.join(
        __dirname,
        "..",
        "data",
        "generated-news-image.png"
    );

    fs.writeFileSync(
        outputPath,
        Buffer.from(imageOutput.data, "base64")
    );

    console.log("✅ AI image generated successfully.");
    console.log(`💾 Saved to: ${outputPath}`);

    return outputPath;
}

module.exports = {
    generateImage
};