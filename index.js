require("dotenv").config();

const { generatePost } = require("./src/generate-post");
const { selectImage } = require("./src/image-selection");
const { publishToFacebook, getPostPerformance } = require("./src/facebook");
const {
    markNewsAsPublished,
    getPostsNeedingPerformanceRefresh,
    updatePostPerformance,
    markPostPerformanceChecked
} = require("./src/news");

function getPositiveInteger(value, fallback) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function refreshPostPerformance() {
    const posts = getPostsNeedingPerformanceRefresh();
    if (!posts.length) {
        return;
    }

    await Promise.all(posts.map(async post => {
        try {
            const metrics = await getPostPerformance(post.facebookPostId);
            updatePostPerformance(post.facebookPostId, metrics);
            console.log(
                `📊 Post engagement updated: ${post.title} ` +
                `(reactions ${metrics.reactions ?? "n/a"}, comments ${metrics.comments ?? "n/a"}, shares ${metrics.shares})`
            );
        } catch (error) {
            markPostPerformanceChecked(post.facebookPostId);
            const message = error.response?.data?.error?.message || "required permission or metric is unavailable";
            console.warn(`⚠️ Skipping optional post metrics: ${message}`);
        }
    }));
}

async function main() {
    const maxAttempts = Math.min(
        10,
        getPositiveInteger(process.env.RUN_MAX_ATTEMPTS, 3)
    );
    const maxDelayMs = Math.min(
        150000,
        getPositiveInteger(process.env.RUN_RETRY_MAX_DELAY_MS, 60000)
    );
    const baseDelayMs = Math.min(
        maxDelayMs,
        getPositiveInteger(process.env.RUN_RETRY_BASE_DELAY_MS, 5000)
    );

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let publicationInProgress = false;

        try {
        console.log("=================================");
        console.log("🚀 AI NEWS AUTOMATION STARTED");
        console.log("=================================\n");

        await refreshPostPerformance();

        // =================================
        // STEP 1: Generate article + post
        // =================================

        console.log("🤖 Step 1: Generating Facebook post...");

        const result = await generatePost();

        console.log("\n📰 Generated post:\n");
        const posts = result.posts || [result];
        let publishedCount = 0;
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
                    current.imageQuery,
                    current.post
                );
            } else {
                console.log("🎥 Related video found. Giving it priority.");
            }

            if (!current.article.videoUrl && !imageSelection.selectedImage) {
                console.log("❌ No acceptable media found. Skipping article.");
                continue;
            }

            publicationInProgress = true;
            const facebookResult = await publishToFacebook(
                current.post,
                imageSelection.imagePath,
                current.article.videoUrl
            );

            console.log("✅ Published successfully!", facebookResult);
            const facebookPostId = facebookResult.post_id || facebookResult.id || null;
            markNewsAsPublished(
                current.article,
                imageSelection.selectedImage,
                facebookPostId
            );
            publishedCount++;
            publicationInProgress = false;

            if (delayMs > 0 && index < posts.length - 1) {
                console.log(`⏳ Waiting ${delayMs / 1000} seconds before next post...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }

        if (publishedCount === 0) {
            throw new Error(
                "No Facebook post was published: no generated post had acceptable media."
            );
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

            return;
        } catch (error) {

            console.error("\n❌ AUTOMATION FAILED");

            if (error.response?.data) {
                console.error(JSON.stringify(error.response.data, null, 2));
            } else {
                console.error(error.message);
            }

            if (publicationInProgress) {
                console.error(
                    "Facebook may have accepted the post; automatic retry is stopped to avoid duplicate publishing."
                );
                process.exitCode = 1;
                return;
            }

            if (attempt === maxAttempts) {
                console.error(`Maximum run attempts (${maxAttempts}) reached.`);
                process.exitCode = 1;
                return;
            }

            const exponentialCap = Math.min(
                maxDelayMs,
                baseDelayMs * (2 ** (attempt - 1))
            );
            const delayMs = Math.floor(Math.random() * (exponentialCap + 1));

            console.log(
                `Retrying automation (${attempt + 1}/${maxAttempts}) in ${(delayMs / 1000).toFixed(1)} seconds...`
            );
            await wait(delayMs);
        }
    }
}

main();
