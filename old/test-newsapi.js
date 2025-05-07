require("dotenv").config();
const axios = require("axios");

async function testNewsAPI() {
  console.log("Testing NewsAPI connection...");
  console.log("API Key length:", process.env.NEWS_API_KEY?.length || 0);
  console.log(
    "API Key first 4 chars:",
    process.env.NEWS_API_KEY?.substring(0, 4) || "none"
  );

  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: "Dubai AND flood AND disaster",
        language: "en",
        sortBy: "relevancy",
        apiKey: process.env.NEWS_API_KEY,
      },
    });

    console.log("\nAPI Response:");
    console.log("Status:", response.status);
    console.log("Total Results:", response.data.totalResults);

    if (response.data.articles?.length > 0) {
      console.log("\nFirst article:");
      const article = response.data.articles[0];
      console.log("Title:", article.title);
      console.log("Date:", article.publishedAt);
      console.log("Source:", article.source.name);
    }
  } catch (error) {
    console.error("\nError accessing NewsAPI:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
}

testNewsAPI();
