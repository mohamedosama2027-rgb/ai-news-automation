require("dotenv").config();

const { generatePost } = require("./generate-post");
const { selectImage } = require("./image-selection");
const { publishToFacebook } = require("./facebook");
const { markNewsAsPublished } = require("./news");

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
        console.log(result.post);

        console.log("\n📌 Selected article:");
        console.log(result.article.title);
        console.log(result.article.link);

        console.log("\n🔎 Image query:");
        console.log(result.imageQuery);

        // =================================
        // STEP 2: Select editorial image
        // =================================

        console.log("\n🖼️ Step 2: Selecting image...");

        const imageSelection = await selectImage(
            result.article,
            result.imageQuery
        );

        if (!imageSelection.selectedImage) {
            console.log(
                "\n❌ No acceptable image found."
            );

            console.log(
                "🚫 Article will NOT be published."
            );

            console.log(
                "🚫 Article will NOT be marked as published."
            );

            return;
        }

        console.log(
            "\n✅ Acceptable image selected."
        );

        console.log(
            "Image path:",
            imageSelection.imagePath
        );

        // =================================
        // STEP 3: Publish to Facebook
        // =================================

        console.log(
            "\n📘 Step 3: Publishing post + image to Facebook..."
        );

        const facebookResult =
            await publishToFacebook(
                result.post,
                imageSelection.imagePath
            );

        console.log(
            "\n✅ Published successfully!"
        );

        console.log(
            "Facebook response:",
            facebookResult
        );

        // =================================
        // STEP 4: Mark article as published
        // =================================

        console.log(
            "\n💾 Step 4: Saving published article..."
        );

        markNewsAsPublished(
            result.article
        );

        console.log(
            "✅ Article saved."
        );

        console.log(
            "This article will not be selected again."
        );

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