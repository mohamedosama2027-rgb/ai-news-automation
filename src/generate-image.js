require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
        timeout: 60000
    }
});

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-lite-image";

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

ARTICLE DESCRIPTION:
${article.description || "No description available"}

FACEBOOK POST:
${article.post || "No post provided"}

IMPORTANT:
- Create a visually relevant image based only on the article title and description.
- Use the Facebook post only to understand the intended editorial angle.
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

    let interaction;
    try {
        interaction = await ai.interactions.create({
            model: IMAGE_MODEL,
            input: prompt,
            response_format: {
                type: "image",
                mime_type: "image/png",
                aspect_ratio: "16:9",
                image_size: "1K"
            }
        });
    } catch (error) {
        const errorMessage = error.message || "";
        if (
            error.status === 429 ||
            errorMessage.includes("limit: 0 requests per day") ||
            errorMessage.includes("RESOURCE_EXHAUSTED")
        ) {
            throw new Error(
                `Gemini image generation is not enabled for ${IMAGE_MODEL} on this API key's current quota. Enable billing/pay-as-you-go for the Google AI Studio project, or use IMAGE_PROVIDER=pexels. Original error: ${errorMessage}`
            );
        }
        throw error;
    }

    const imageOutput = interaction.output_image || interaction.outputs?.find(
        output => output.type === "image"
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