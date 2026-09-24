const { searchImage } = require("../src/image-search");

async function test() {
    try {
        console.log("🚀 Starting image search test...\n");

        const searchQuery =
            "OpenAI new artificial intelligence model";

        console.log(`🔎 Query: ${searchQuery}\n`);

        const image = await searchImage(searchQuery);

        if (!image) {
            console.log("❌ No image found.");
            return;
        }

        console.log("=================================");
        console.log("✅ IMAGE FOUND");
        console.log("=================================\n");

        console.log("🖼️ Image URL:");
        console.log(image.url);

        console.log("\n👤 Photographer:");
        console.log(image.photographer);

        console.log("\n🔗 Pexels URL:");
        console.log(image.pexelsUrl);

        console.log("\n📝 Description:");
        console.log(image.alt);

        console.log("\n=================================");
        console.log("🎉 TEST FINISHED");
        console.log("=================================");

    } catch (error) {
        console.error("\n❌ Image search failed.");

        if (error.response?.data) {
            console.error(
                JSON.stringify(error.response.data, null, 2)
            );
        } else {
            console.error(error.message);
        }
    }
}

test();