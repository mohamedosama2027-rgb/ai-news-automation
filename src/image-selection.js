require("dotenv").config();

const axios = require("axios");
const { GoogleGenAI } = require("@google/genai");
const {
    searchImage,
    searchArticleImage
} = require("./image-search");
const { getPublishedNews } = require("./news");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function downloadImage(url) {
    const response = await axios.get(url, {
        responseType: "arraybuffer"
    });

    return Buffer.from(response.data);
}

async function evaluateImages(article, images) {

    console.log("Gemini is evaluating the images...");

    const prompt =
        "You are an editorial image selection assistant for a technology news page.\n\n" +
        "ARTICLE TITLE:\n" +
        article.title +
        "\n\n" +
        "The image does NOT need to literally show the exact event described in the article.\n" +
        "A conceptual or editorial image is allowed when it clearly represents the topic.\n\n" +

        "Evaluate EVERY image independently using these dimensions:\n\n" +

        "1. RELEVANCE (0-10)\n" +
        "How strongly does the image visually communicate the main topic or idea of the article?\n\n" +

        "2. EDITORIAL (0-10)\n" +
        "How professional and suitable is the image for a technology news Facebook post?\n\n" +

        "3. MISLEADING (0-10)\n" +
        "How likely is the image to falsely suggest that it is an actual photograph of the specific event, person, organization, or location mentioned in the article?\n" +
        "0 = very unlikely to mislead.\n" +
        "10 = very likely to mislead.\n\n" +

        "4. FINAL SCORE (0-10)\n" +
        "Use your overall editorial judgment.\n" +
        "Strong relevance and editorial quality should increase the score.\n" +
        "Misleading risk should decrease the score.\n\n" +

        "IMPORTANT RULES:\n" +
        "1. Judge the actual visual content of the image.\n" +
        "2. Do not rely only on the image description.\n" +
        "3. The image does not need to be an exact representation of the article event.\n" +
        "4. Conceptual AI, cybersecurity, robotics, government, leadership, or technology imagery may be suitable when related to the article.\n" +
        "5. Do not assume a generic image represents a specific real-world event or person.\n" +
        "6. Do not invent information about the image.\n" +
        "7. Avoid images that could make readers believe the image is an actual photograph of the reported event when it is not.\n" +
        "8. Prefer clean, professional, visually strong editorial images.\n\n" +

        "ACCEPTANCE RULES:\n" +
        "An image is ACCEPTABLE only if:\n" +
        "RELEVANCE >= 7\n" +
        "EDITORIAL >= 7\n" +
        "MISLEADING <= 2\n\n" +

        "Return ONLY this format for EVERY image:\n\n" +

        "IMAGE 1: RELEVANCE=7 | EDITORIAL=8 | MISLEADING=1 | FINAL=7.5 | ACCEPT=YES | REASON=Short factual reason\n" +
        "IMAGE 2: RELEVANCE=4 | EDITORIAL=7 | MISLEADING=1 | FINAL=5.0 | ACCEPT=NO | REASON=Short factual reason\n\n" +

        "Continue for EVERY image from 1 to " +
        images.length +
        ".";

    const parts = [
        {
            text: prompt
        }
    ];

    for (let i = 0; i < images.length; i++) {

        const image = images[i];

        console.log(
            "Downloading image " +
            (i + 1) +
            " of " +
            images.length
        );

        const imageBuffer =
            await downloadImage(image.url);

        parts.push({
            text:
                "IMAGE " +
                (i + 1) +
                "\nDescription: " +
                image.alt
        });

        parts.push({
            inlineData: {
                mimeType: "image/jpeg",
                data: imageBuffer.toString("base64")
            }
        });
    }

    console.log("Sending images to Gemini...");

    const response = await ai.models.generateContent({
        model: "gemini-3.5-flash-lite",
        contents: [
            {
                role: "user",
                parts
            }
        ]
    });

    if (!response.text) {
        throw new Error(
            "Gemini returned an empty response."
        );
    }

    const result = response.text.trim();

    console.log("\nGemini evaluation:");
    console.log(result);

    const evaluations = [];

    const regex =
        /IMAGE\s+(\d+):\s*RELEVANCE\s*=\s*([\d.]+)\s*\|\s*EDITORIAL\s*=\s*([\d.]+)\s*\|\s*MISLEADING\s*=\s*([\d.]+)\s*\|\s*FINAL\s*=\s*([\d.]+)\s*\|\s*ACCEPT\s*=\s*(YES|NO)\s*\|\s*REASON\s*=\s*(.+)/gi;

    let match;

    while ((match = regex.exec(result)) !== null) {

        const index = Number(match[1]);
        const relevance = Number(match[2]);
        const editorial = Number(match[3]);
        const misleading = Number(match[4]);
        const finalScore = Number(match[5]);
        const accept =
            match[6].toUpperCase() === "YES";
        const reason = match[7].trim();

        if (
            index >= 1 &&
            index <= images.length &&
            relevance >= 0 &&
            relevance <= 10 &&
            editorial >= 0 &&
            editorial <= 10 &&
            misleading >= 0 &&
            misleading <= 10 &&
            finalScore >= 0 &&
            finalScore <= 10
        ) {
            evaluations.push({
                index,
                relevance,
                editorial,
                misleading,
                finalScore,
                accept,
                reason
            });
        }
    }

    if (!evaluations.length) {
        throw new Error(
            "Gemini did not return valid image evaluations."
        );
    }

    const stronglyRelevantImages = evaluations
        .filter((evaluation) => {
            return (
                evaluation.accept &&
                evaluation.relevance >= 7 &&
                evaluation.editorial >= 7 &&
                evaluation.misleading <= 2
            );
        })
        .sort(
            (a, b) =>
                b.finalScore - a.finalScore
        );

    const acceptedImages = stronglyRelevantImages.length
        ? stronglyRelevantImages
        : evaluations
            .filter((evaluation) => {
                return (
                    evaluation.relevance >= 5 &&
                    evaluation.editorial >= 7 &&
                    evaluation.misleading <= 2
                );
            })
            .sort(
                (a, b) =>
                    b.finalScore - a.finalScore
            );

    if (!acceptedImages.length) {
        return {
            selectedImage: null,
            selectedEvaluation: null,
            evaluations
        };
    }

    const selectedEvaluation =
        acceptedImages[0];

    const selectedImage =
        images[selectedEvaluation.index - 1];

    return {
        selectedImage,
        selectedEvaluation,
        evaluations
    };
}

async function selectImage(article, imageQuery) {

    console.log("\n🔎 Searching Pexels...");
    console.log("Query:", imageQuery);

    let images =
        await searchImage(imageQuery);

    const articleImage =
        await searchArticleImage(article.link);

    if (articleImage) {
        console.log("📰 Original article image found and added for evaluation.");
        images = [articleImage, ...images];
    }

    const publishedImages = getPublishedNews();
    const usedImageIds = new Set(
        publishedImages
            .map(item => String(item.imageId || ""))
            .filter(Boolean)
    );
    const usedImageUrls = new Set(
        publishedImages
            .map(item => item.imagePexelsUrl || "")
            .filter(Boolean)
    );

    const filterUnusedImages = candidates =>
        candidates.filter(image =>
            !usedImageIds.has(String(image.id)) &&
            !usedImageUrls.has(image.pexelsUrl)
        );

    images = filterUnusedImages(images);

    if (!images.length) {
        console.log("⚠️ First Pexels page contains only previously used images. Trying page 2...");
        images = filterUnusedImages(
            await searchImage(imageQuery, 2)
        );
    }

    if (!images.length) {
        return {
            selectedImage: null,
            selectedEvaluation: null,
            evaluations: [],
            imagePath: null
        };
    }

    console.log(
        `\n${images.length} images found.`
    );

    const selection =
        await evaluateImages(
            article,
            images
        );

    if (!selection.selectedImage) {
        return {
            ...selection,
            imagePath: null
        };
    }

    const image =
        selection.selectedImage;

    const evaluation =
        selection.selectedEvaluation;

    console.log("\n=================================");
    console.log("FINAL IMAGE SELECTION");
    console.log("=================================");

    console.log(
        "\n✅ IMAGE SELECTED"
    );

    console.log(
        "Image index:",
        evaluation.index
    );

    console.log(
        "Relevance:",
        evaluation.relevance + "/10"
    );

    console.log(
        "Editorial:",
        evaluation.editorial + "/10"
    );

    console.log(
        "Misleading risk:",
        evaluation.misleading + "/10"
    );

    console.log(
        "Final score:",
        evaluation.finalScore + "/10"
    );

    console.log(
        "Reason:",
        evaluation.reason
    );

    console.log(
        "\nPexels URL:",
        image.pexelsUrl || image.photographerUrl
    );

    console.log(
        "Photographer:",
        image.photographer
    );

    console.log(
        "\nDownloading selected image..."
    );

    const imageBuffer =
        await downloadImage(image.url);

    const path = require("path");
    const fs = require("fs");

    const imagePath =
        path.join(
            __dirname,
            "..",
            "data",
            "selected-news-image.jpg"
        );

    fs.writeFileSync(
        imagePath,
        imageBuffer
    );

    console.log(
        "\n✅ Selected image saved to:"
    );

    console.log(imagePath);

    return {
        ...selection,
        imagePath
    };
}

module.exports = {
    selectImage,
    evaluateImages,
    downloadImage
};