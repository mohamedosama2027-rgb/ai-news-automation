require("dotenv").config();

const axios = require("axios");

async function publishToFacebook(message) {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (!pageId) {
        throw new Error("FACEBOOK_PAGE_ID is missing.");
    }

    if (!accessToken) {
        throw new Error("FACEBOOK_PAGE_ACCESS_TOKEN is missing.");
    }

    const url = `https://graph.facebook.com/${pageId}/feed`;

    const response = await axios.post(url, {
        message,
        access_token: accessToken
    });

    return response.data;
}

module.exports = {
    publishToFacebook
};