const axios = require("axios");
const OpenAI = require("openai");

console.log(
  "Initializing OpenAI with key:",
  process.env.OPENAI_API_KEY ? "Present" : "Missing"
);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Mock data for development testing
const MOCK_ARTICLES = {
  Tripura: [
    {
      source: { name: "The Times of India" },
      title: "Over 500 homes damaged as severe storm lashes Tripura",
      description:
        "A severe storm damaged nearly 500 homes across Tripura, India, starting Sunday. The worst damage occurred on Monday when a powerful rainstorm struck the region, damaging at least 445 homes and injuring two people.",
      publishedAt: "2025-04-23T12:00:00Z",
    },
    {
      source: { name: "India Today" },
      title: "Tripura storm: 31 homes destroyed, 157 severely damaged",
      description:
        "Official reports indicate that 31 homes were completely destroyed, 157 severely damaged, and 257 partly damaged across the region. 49 electric poles were damaged, disrupting power supply.",
      publishedAt: "2025-04-23T14:30:00Z",
    },
    {
      source: { name: "NDTV" },
      title: "Heavy rainfall causes widespread damage in Tripura districts",
      description:
        "Several districts recorded above-average rainfall, with West Tripura reporting the highest total at 77.5 mm in 24 hours. Significant damage reported in Sepahijala, West Tripura, Khowai, Gomati, and South Tripura districts.",
      publishedAt: "2025-04-23T15:45:00Z",
    },
  ],
  Santorini: [
    {
      source: { name: "Associated Press" },
      title: "Multiple earthquakes rattle Greece's Santorini island",
      description:
        "Hundreds of quakes with magnitudes between 3 and 4.9 have been registered since Saturday between Santorini and nearby Amorgos. Authorities have deployed emergency crews and closed schools on four islands.",
      publishedAt: "2025-02-03T10:00:00Z",
    },
    {
      source: { name: "Reuters" },
      title: "Greece deploys rescue teams as earthquake swarm hits Santorini",
      description:
        "Emergency crews with tents, sniffer dogs and drones have been dispatched to Santorini as hundreds of earthquakes continue to shake the popular tourist island.",
      publishedAt: "2025-02-03T11:30:00Z",
    },
    {
      source: { name: "BBC News" },
      title: "Santorini residents warned as seismic activity continues",
      description:
        "Residents have been warned to avoid indoor gatherings and stay away from cliffs as the island experiences an unusual series of earthquakes. No major damage reported yet.",
      publishedAt: "2025-02-03T13:15:00Z",
    },
  ],
};

class NewsService {
  constructor() {
    this.newsApiKey = process.env.NEWS_API_KEY;
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  async parseTweetText(text) {
    try {
      console.log("Parsing tweet text:", text);
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant that extracts disaster relief information from tweets. Extract the most specific location mentioned (e.g., city/region rather than just country), type of disaster, and severity (if mentioned). Respond with only valid JSON.",
          },
          {
            role: "user",
            content: `Parse this tweet and respond with JSON containing location (use most specific location mentioned), disasterType, and severity: "${text}"`,
          },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      console.log(
        "OpenAI parsing response:",
        completion.choices[0].message.content
      );
      const parsedResponse = JSON.parse(completion.choices[0].message.content);
      console.log("Parsed tweet data:", parsedResponse);

      return {
        location: parsedResponse.location,
        disasterType: parsedResponse.disasterType,
        severity: parsedResponse.severity || "unknown",
      };
    } catch (error) {
      console.error("Error parsing tweet text:", error.message);
      if (error.response) {
        console.error("OpenAI API error details:", {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw new Error("Failed to parse disaster information from tweet");
    }
  }

  async verifyDisaster(location, disasterType) {
    try {
      console.log("\n=== Starting Disaster Verification ===");
      console.log("Input parameters:", { location, disasterType });
      console.log(
        "Environment:",
        this.isDevelopment ? "Development" : "Production"
      );

      let articles;
      if (this.isDevelopment) {
        // Use mock data in development
        console.log("\n=== Using Mock News Data ===");
        const locationParts = location.split(/[\s,]+/);
        const mainLocation = locationParts[locationParts.length - 1];
        articles = MOCK_ARTICLES[mainLocation];

        if (!articles) {
          console.log("No mock articles found for location:", mainLocation);
          return {
            verified: false,
            reason: "No recent news found about this disaster",
            confidence: "low",
          };
        }
      } else {
        // Use NewsAPI in production
        console.log("\n=== Fetching News from NewsAPI ===");
        if (!this.newsApiKey) {
          throw new Error("NewsAPI key is not configured");
        }

        const searchQuery = `${location} AND (${disasterType.replace(
          /\s+/g,
          " OR "
        )})`;
        console.log("Search query:", searchQuery);

        const response = await axios.get("https://newsapi.org/v2/everything", {
          params: {
            q: searchQuery,
            language: "en",
            sortBy: "relevancy",
            pageSize: 5,
            apiKey: this.newsApiKey,
          },
        });

        articles = response.data.articles;
        console.log(`Found ${articles.length} articles from NewsAPI`);

        if (!articles || articles.length === 0) {
          return {
            verified: false,
            reason: "No recent news found about this disaster",
            confidence: "low",
          };
        }
      }

      return await this.analyzeArticles(articles, location, disasterType);
    } catch (error) {
      console.error("\n=== Verification Error ===");
      console.error("Error message:", error.message);
      if (error.response) {
        console.error("API error details:", {
          status: error.response.status,
          data: error.response.data,
        });
      }
      throw new Error("Failed to verify disaster");
    }
  }

  async analyzeArticles(articles, location, disasterType) {
    // Log article details
    console.log("\n=== First 3 Articles ===");
    articles.slice(0, 3).forEach((article, index) => {
      console.log(`\nArticle ${index + 1}:`);
      console.log("Title:", article.title);
      console.log("Date:", article.publishedAt);
      console.log("Source:", article.source.name);
      console.log("Description:", article.description);
    });

    // Use OpenAI to analyze the news articles
    const articleDetails = articles
      .slice(0, 3)
      .map(
        (a) =>
          `Date: ${a.publishedAt}\nTitle: ${a.title}\nDescription: ${
            a.description || ""
          }`
      )
      .join("\n\n");

    console.log("\n=== OpenAI Verification ===");
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a disaster verification assistant. Analyze the news articles to verify if there is a real ${disasterType} disaster in ${location}. Consider:
1. Are the articles recent and relevant?
2. Do they describe an actual disaster (not just a risk or prediction)?
3. Is this a current or very recent event?
Respond with JSON in the format: {"verified": boolean, "confidence": "high|medium|low", "reason": "detailed explanation"}`,
        },
        {
          role: "user",
          content: `Verify this disaster based on these news articles:\n${articleDetails}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    console.log(
      "OpenAI verification response:",
      completion.choices[0].message.content
    );
    const verificationResult = JSON.parse(
      completion.choices[0].message.content
    );

    console.log("\n=== Verification Result ===");
    console.log("Result:", verificationResult);

    return {
      verified: verificationResult.verified,
      reason: verificationResult.reason,
      confidence: verificationResult.confidence,
      articles: articles.slice(0, 3),
    };
  }
}

module.exports = new NewsService();
