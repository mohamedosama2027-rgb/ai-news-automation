require("dotenv").config();

const axios = require("axios");

async function testPexels() {
    try {
        const response = await axios.get(
            "https://api.pexels.com/v1/search",
            {
                headers: {
                    Authorization: process.env.PEXELS_API_KEY
                },
                params: {
                    query: "artificial intelligence technology",
                    per_page: 3
                }
            }
        );

        console.log("✅ Pexels API is working!");
        console.log(`Found ${response.data.photos.length} photos.\n`);

        response.data.photos.forEach((photo, index) => {
            console.log(`${index + 1}. ${photo.alt || "No description"}`);
            console.log(`Photographer: ${photo.photographer}`);
            console.log(`Image: ${photo.src.large}`);
            console.log("-----------------------------");
        });

    } catch (error) {
        console.error("❌ Pexels test failed.");

        if (error.response?.data) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

testPexels();