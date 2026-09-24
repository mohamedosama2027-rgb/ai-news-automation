require("dotenv").config();

const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

async function publishToFacebook(message, imagePath) {

    const pageId = process.env.FACEBOOK_PAGE_ID;
    const accessToken =
        process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (!pageId) {
        throw new Error(
            "FACEBOOK_PAGE_ID is missing."
        );
    }

    if (!accessToken) {
        throw new Error(
            "FACEBOOK_PAGE_ACCESS_TOKEN is missing."
        );
    }

    if (!imagePath) {
        throw new Error(
            "Image path is missing."
        );
    }

    if (!fs.existsSync(imagePath)) {
        throw new Error(
            `Image file not found: ${imagePath}`
        );
    }

    const form = new FormData();

    form.append(
        "source",
        fs.createReadStream(imagePath)
    );

    form.append(
        "message",
        message
    );

    form.append(
        "access_token",
        accessToken
    );

    const url =
        `https://graph.facebook.com/v23.0/${pageId}/photos`;

    try {

        const response = await axios.post(
            url,
            form,
            {
                headers: {
                    ...form.getHeaders()
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        return response.data;

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