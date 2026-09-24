const Parser = require("rss-parser");
const fs = require("fs");
const path = require("path");

const parser = new Parser();

const publishedNewsFile = path.join(
    __dirname,
    "published-news.json"
);

function getPublishedNews() {
    if (!fs.existsSync(publishedNewsFile)) {
        return [];
    }

    try {
        return JSON.parse(
            fs.readFileSync(publishedNewsFile, "utf8")
        );
    } catch (error) {
        console.error(
            "⚠️ Could not read published-news.json"
        );

        return [];
    }
}

function savePublishedNews(news) {
    fs.writeFileSync(
        publishedNewsFile,
        JSON.stringify(news, null, 2),
        "utf8"
    );
}

async function getLatestAINews() {
    const feedUrl =
        "https://news.google.com/rss/search?q=Artificial+Intelligence&hl=en-US&gl=US&ceid=US:en";

    const feed = await parser.parseURL(feedUrl);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const publishedNews = getPublishedNews();

    const publishedLinks = new Set(
        publishedNews.map((item) => item.link)
    );

    const news = feed.items
        .filter((item) => {
            if (!item.pubDate) return false;

            const publishedDate = new Date(item.pubDate);

            return publishedDate >= sevenDaysAgo;
        })
        .map((item) => ({
            title: item.title,
            link: item.link,
            publishedAt: item.pubDate
        }))
        .filter((item) => {
            return !publishedLinks.has(item.link);
        });

    return news;
}

function markNewsAsPublished(article) {
    const publishedNews = getPublishedNews();

    const alreadyPublished = publishedNews.some(
        (item) => item.link === article.link
    );

    if (alreadyPublished) {
        return;
    }

    publishedNews.push({
        title: article.title,
        link: article.link,
        publishedAt: article.publishedAt,
        publishedAtSystem: new Date().toISOString()
    });

    savePublishedNews(publishedNews);
}

module.exports = {
    getLatestAINews,
    markNewsAsPublished
};