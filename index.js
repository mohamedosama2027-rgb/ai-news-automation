require("dotenv").config();

const { generatePost } = require("./generate-post");
const { publishToFacebook } = require("./facebook");
const { markNewsAsPublished } = require("./news");

async function main() {
    try {
        console.log("=================================");
        console.log("🚀 AI NEWS AUTOMATION STARTED");
        console.log("=================================\n");

        console.log("🤖 Step 1: Generating Facebook post...");

        const result = await generatePost();

        console.log("\n📝 Generated post:\n");
        console.log(result.post);

        console.log("\n📰 Selected article:");
        console.log(result.article.title);
        console.log(result.article.link);

        console.log("\n📘 Step 2: Publishing to Facebook...");

        const facebookResult = await publishToFacebook(
            result.post
        );

        console.log("\n✅ Published successfully!");
        console.log("Facebook response:", facebookResult);

        console.log("\n💾 Step 3: Saving published article...");

        markNewsAsPublished(result.article);

        console.log("✅ Article saved.");
        console.log("This article will not be selected again.");

        console.log("\n=================================");
        console.log("🎉 AUTOMATION FINISHED");
        console.log("=================================");

    } catch (error) {
        console.error("\n❌ AUTOMATION FAILED");

        if (error.response?.data) {
            console.error(
                JSON.stringify(error.response.data, null, 2)
            );
        } else {
            console.error(error.message);
        }

        process.exit(1);
    }
}

main();