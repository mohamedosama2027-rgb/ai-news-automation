const { generatePost } = require("./generate-post");
const { searchImage } = require("./image-search");

async function test() {
    try {
        console.log("=================================");
        console.log("🧪 NEWS IMAGE SEARCH TEST");
        console.log("=================================\n");

        console.log("🤖 Generating news content...\n");

        const result = await generatePost();

        console.log("\n📰 Selected article:");
        console.log(result.article.title);

        console.log("\n🖼️ Image query:");
        console.log(result.imageQuery);

        console.log("\n🔎 Searching Pexels...\n");

        const images = await searchImage(
            result.imageQuery
        );

        if (!images.length) {
            console.log("❌ No images found.");
            return;
        }

        console.log(`\n✅ ${images.length} images found!\n`);

        images.forEach((image, index) => {
            console.log(`========== IMAGE ${index + 1} ==========`);

            console.log(`🖼️ URL: ${image.url}`);
            console.log(`👤 Photographer: ${image.photographer}`);
            console.log(`📝 Description: ${image.alt}`);
            console.log(`🔗 Pexels: ${image.pexelsUrl}`);

            console.log("");
        });

        console.log("=================================");
        console.log("🎉 TEST FINISHED");
        console.log("=================================");

    } catch (error) {
        console.error("\n❌ TEST FAILED");

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