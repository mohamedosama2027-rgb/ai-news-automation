require("dotenv").config();

const axios = require("axios");

function decodeHtml(value = "") {
    return value
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
}

async function searchArticleImage(articleUrl) {
    if (!articleUrl) {
        return null;
    }

    try {
        const response = await axios.get(articleUrl, {
            timeout: 12000,
            maxRedirects: 5,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; AI-News-Automation/1.0)"
            }
        });

        const html = response.data;
        const imageUrl =
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

        if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) {
            return null;
        }

        return {
            id: `article:${imageUrl}`,
            url: decodeHtml(imageUrl),
            photographer: "Article source",
            photographerUrl: response.request?.res?.responseUrl || articleUrl,
            pexelsUrl: null,
            alt: "Original article image",
            width: null,
            height: null,
            isArticleImage: true
        };
    } catch (error) {
        console.log("⚠️ Could not fetch the article image. Falling back to Pexels.");
        return null;
    }
}

async function searchImage(query, page = 1) {
    const apiKey = process.env.PEXELS_API_KEY;

    if (!apiKey) {
        throw new Error("PEXELS_API_KEY is missing.");
    }

    if (!query || !query.trim()) {
        throw new Error("Image search query is missing.");
    }

    const configuredPerPage = Number(
        process.env.PEXELS_PER_PAGE || 12
    );
    const perPage = Number.isFinite(configuredPerPage)
        ? Math.min(24, Math.max(6, Math.floor(configuredPerPage)))
        : 12;

    console.log(`🔎 Searching Pexels for: ${query}`);

    const response = await axios.get(
        "https://api.pexels.com/v1/search",
        {
            headers: {
                Authorization: apiKey
            },
            params: {
                query: query.trim(),
                per_page: perPage,
                page,
                orientation: "landscape"
            }
        }
    );

    const photos = response.data.photos || [];

    if (!photos.length) {
        console.log("⚠️ No images found.");
        return [];
    }

    console.log(`📸 Found ${photos.length} images.`);

    const images = photos.map((photo) => ({
        id: photo.id,
        url: photo.src.large2x || photo.src.large,
        photographer: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsUrl: photo.url,
        alt: photo.alt || query,
        width: photo.width,
        height: photo.height
    }));

    return images;
}

module.exports = {
    searchImage,
    searchArticleImage
};