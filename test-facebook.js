require("dotenv").config();

const { publishToFacebook } = require("./facebook");

async function main() {
    try {
        console.log("📘 Testing Facebook image publishing...");

        const result = await publishToFacebook(
            "اختبار نشر صورة من AI News Automation 🤖",
            "E:\\automation\\selected-news-image.jpg"
        );

        console.log("\n✅ Published successfully!");
        console.log(result);

    } catch (error) {
        console.error("\n❌ Facebook publish failed:");

        if (error.response?.data) {
            console.error(
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );
        } else {
            console.error(error.message);
        }

        process.exit(1);
    }
}

main();