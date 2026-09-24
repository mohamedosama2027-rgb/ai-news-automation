require("dotenv").config();

const axios = require("axios");

async function searchImage(query) {
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
    searchImage
};