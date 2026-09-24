const { getLatestAINews } = require("./news");

async function main() {
    try {
        const news = await getLatestAINews();

        console.log(`Found ${news.length} news articles:\n`);

        news.slice(0, 10).forEach((item, index) => {
            console.log(`${index + 1}. ${item.title}`);
            console.log(`   ${item.publishedAt}`);
            console.log(`   ${item.link}\n`);
        });

    } catch (error) {
        console.error("News Error:", error.message);
    }
}

main();