require("dotenv").config();

const { generatePost } = require("./src/generate-post");
const { selectImage } = require("./src/image-selection");
const { publishToFacebook } = require("./src/facebook");
const { markNewsAsPublished } = require("./src/news");

async function main() {
    try {
        console.log("=================================");
        console.log("🚀 AI NEWS AUTOMATION STARTED");
        console.log("=================================\n");

        // =================================
        // STEP 1: Generate article + post
        // =================================

        console.log("🤖 Step 1: Generating Facebook post...");

        const result = await generatePost();

        console.log("\n📰 Generated post:\n");
        const posts = result.posts || [result];
        const delayMs = Math.max(0, Number(process.env.POST_DELAY_MS || 0));

        for (let index = 0; index < posts.length; index++) {
            const current = posts[index];

            console.log(`\n📰 Post ${index + 1}/${posts.length}: ${current.article.title}`);
            console.log("🔎 Image query:", current.imageQuery);

            let imageSelection = { selectedImage: null, imagePath: null };
            if (!current.article.videoUrl) {
                console.log("\n🖼️ Selecting editorial image...");
                imageSelection = await selectImage(
                    current.article,
                    current.imageQuery
                );
            } else {
                console.log("🎥 Related video found. Giving it priority.");
            }

            if (!current.article.videoUrl && !imageSelection.selectedImage) {
                console.log("❌ No acceptable media found. Skipping article.");
                continue;
            }

            const facebookResult = await publishToFacebook(
                current.post,
                imageSelection.imagePath,
                current.article.videoUrl
            );

            console.log("✅ Published successfully!", facebookResult);
            markNewsAsPublished(current.article);

            if (delayMs > 0 && index < posts.length - 1) {
                console.log(`⏳ Waiting ${delayMs / 1000} seconds before next post...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        // =================================
        // FINISHED
        // =================================

        console.log(
            "\n================================="
        );

        console.log(
            "🎉 AUTOMATION FINISHED"
        );

        console.log(
            "================================="
        );

    } catch (error) {

        console.error(
            "\n❌ AUTOMATION FAILED"
        );

        if (error.response?.data) {

            console.error(
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );

        } else {

            console.error(
                error.message
            );
        }

        process.exit(1);
    }
}

main();