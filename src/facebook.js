require("dotenv").config();

const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const {
    isFacebookTokenError,
    refreshPageAccessToken
} = require("./facebook-auth");

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || "v23.0";

async function publishWithToken(request) {
    if (!process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
        await refreshPageAccessToken();
    }

    try {
        return await request(process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
    } catch (error) {
        if (!isFacebookTokenError(error)) {
            throw error;
        }

        console.log("Facebook token expired. Refreshing it automatically...");
        await refreshPageAccessToken();
        return request(process.env.FACEBOOK_PAGE_ACCESS_TOKEN);
    }
}

async function publishToFacebook(message, imagePath, videoUrl) {

    const pageId = process.env.FACEBOOK_PAGE_ID;
    if (!pageId) {
        throw new Error(
            "FACEBOOK_PAGE_ID is missing."
        );
    }

    if (!imagePath && !videoUrl) {
        throw new Error(
            "Image path or video URL is missing."
        );
    }

    if (imagePath && !fs.existsSync(imagePath)) {
        throw new Error(
            `Image file not found: ${imagePath}`
        );
    }

    if (videoUrl) {
        return publishWithToken(async token => {
            const response = await axios.post(
                `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/videos`,
                null,
                {
                    params: {
                        file_url: videoUrl,
                        description: message,
                        access_token: token
                    }
                }
            );

            return response.data;
        });
    }

    const url =
        `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`;

    try {
        return await publishWithToken(async token => {
            const uploadForm = new FormData();
            uploadForm.append("source", fs.createReadStream(imagePath));
            uploadForm.append("message", message);
            uploadForm.append("access_token", token);

            const response = await axios.post(
                url,
                uploadForm,
                {
                    headers: {
                        ...uploadForm.getHeaders()
                    },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );

            return response.data;
        });

    } catch (error) {

        console.error(
            "\nFacebook API error:"
        );

        if (error.response?.data) {
            console.error(
                JSON.stringify(
                    error.response.data,
                    null,
                    2
                )
            );
        }

        throw error;
    }
}

module.exports = {
    publishToFacebook
};