require("dotenv").config();

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v23.0";
const envPath = path.join(__dirname, "..", ".env");

function updateEnvValue(name, value) {
    if (!fs.existsSync(envPath)) {
        return;
    }

    const content = fs.readFileSync(envPath, "utf8");
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    const updated = pattern.test(content)
        ? content.replace(pattern, line)
        : `${content.trimEnd()}\n${line}\n`;

    fs.writeFileSync(envPath, updated, "utf8");
}

function isFacebookTokenError(error) {
    const apiError = error.response?.data?.error;
    return apiError?.code === 190 || apiError?.type === "OAuthException";
}

async function refreshPageAccessToken() {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    const userToken = process.env.FACEBOOK_USER_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;

    if (!appId || !appSecret || !userToken || !pageId) {
        throw new Error(
            "Facebook token expired. Set FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, FACEBOOK_USER_ACCESS_TOKEN, and FACEBOOK_PAGE_ID to enable automatic refresh."
        );
    }

    const userTokenResponse = await axios.get(
        `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token`,
        {
            params: {
                client_id: appId,
                client_secret: appSecret,
                grant_type: "fb_exchange_token",
                fb_exchange_token: userToken
            }
        }
    );

    const longLivedUserToken = userTokenResponse.data.access_token;
    const pagesResponse = await axios.get(
        `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts`,
        {
            params: {
                fields: "id,access_token",
                access_token: longLivedUserToken
            }
        }
    );

    const page = pagesResponse.data.data?.find(
        item => String(item.id) === String(pageId)
    );

    if (!page?.access_token) {
        throw new Error(`No access token was returned for Facebook Page ${pageId}.`);
    }

    process.env.FACEBOOK_USER_ACCESS_TOKEN = longLivedUserToken;
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN = page.access_token;
    updateEnvValue("FACEBOOK_USER_ACCESS_TOKEN", longLivedUserToken);
    updateEnvValue("FACEBOOK_PAGE_ACCESS_TOKEN", page.access_token);

    return page.access_token;
}

module.exports = {
    isFacebookTokenError,
    refreshPageAccessToken
};