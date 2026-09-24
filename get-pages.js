require('dotenv').config();
const axios = require('axios');

async function getPages() {
    try {
        const response = await axios.get(
            'https://graph.facebook.com/vXX.X/me/accounts',
            {
                params: {
                    access_token: process.env.FACEBOOK_USER_ACCESS_TOKEN
                }
            }
        );

        console.log(JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.error(
            JSON.stringify(
                error.response?.data || error.message,
                null,
                2
            )
        );
    }
}

getPages();