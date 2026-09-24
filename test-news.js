const { getLatestAINews } = require("./news");

async function test() {
    try {
        const news = await getLatestAINews();

        console.log("\n==============================");
        console.log("TOTAL NEWS:", news.length);
        console.log("==============================\n");

        news.slice(0, 50).forEach((item, index) => {
            console.log(
                `${index + 1}. [${item.category}] ${item.title}`
            );
        });

    } catch (error) {
        console.error("\nTEST FAILED:");
        console.error(error.message);

        process.exit(1);
    }
}

test();