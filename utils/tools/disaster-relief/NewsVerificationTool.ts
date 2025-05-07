import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

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

export class NewsVerificationTool extends StructuredTool {
  name = "news_verification_tool";
  description = "Verifies disaster claims using news API data";
  schema = z.object({
    location: z.string(),
    disaster_type: z.string().optional(),
  }) as any;

  protected async _call({
    location,
    disaster_type,
  }: {
    location: string;
    disaster_type?: string;
  }): Promise<string> {
    try {
      const isDevelopment = process.env.NODE_ENV === "development";
      console.error(
        "[NewsVerificationTool] Environment:",
        isDevelopment ? "Development" : "Production"
      );
      console.error("[NewsVerificationTool] Input:", {
        location,
        disaster_type,
      });

      let articles;
      if (isDevelopment) {
        // Use mock data in development
        const normalizedLocation = location.trim().toLowerCase();
        const matchingLocation = Object.keys(MOCK_ARTICLES).find(
          (key) => key.toLowerCase() === normalizedLocation
        );
        if (!matchingLocation) {
          console.error(
            "[NewsVerificationTool] No mock articles found for location:",
            location
          );
          return JSON.stringify({
            verified: false,
            reason: "No recent news found about this disaster",
            confidence: "low",
            articles: [],
          });
        }
        articles =
          MOCK_ARTICLES[matchingLocation as keyof typeof MOCK_ARTICLES];
      } else {
        // TODO: Implement real NewsAPI integration for production
        return JSON.stringify({
          verified: false,
          reason: "NewsAPI integration not implemented",
          confidence: "low",
          articles: [],
        });
      }

      // Log article details
      console.error("[NewsVerificationTool] First 3 Articles:");
      articles.slice(0, 3).forEach((article, idx) => {
        console.error(
          `Article ${idx + 1}:`,
          article.title,
          "|",
          article.publishedAt,
          "|",
          article.source.name
        );
      });

      // Use OpenAI to analyze the news articles
      const llm = new ChatOpenAI({ model: "gpt-4o-mini" });
      const articleDetails = articles
        .slice(0, 3)
        .map(
          (a) =>
            `Date: ${a.publishedAt}\nTitle: ${a.title}\nDescription: ${
              a.description || ""
            }`
        )
        .join("\n\n");

      const systemPrompt = `You are a disaster verification assistant. Analyze the news articles to verify if there is a real ${
        disaster_type || "disaster"
      } disaster in ${location}. Consider:\n1. Are the articles recent and relevant?\n2. Do they describe an actual disaster (not just a risk or prediction)?\n3. Is this a current or very recent event?\nRespond with JSON in the format: {\"verified\": boolean, \"confidence\": \"high|medium|low\", \"reason\": \"detailed explanation\"}`;

      const userPrompt = `Verify this disaster based on these news articles:\n${articleDetails}`;

      // Use .invoke() with correct message array for ChatOpenAI
      const result = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt),
      ]);
      // result.content or result[0]?.content depending on return type
      let content =
        (result as any).content ||
        (Array.isArray(result) && result[0]?.content) ||
        result;
      let verificationResult;
      try {
        verificationResult = JSON.parse(content);
      } catch (err) {
        console.error(
          "[NewsVerificationTool] Error parsing OpenAI response:",
          content
        );
        return JSON.stringify({
          verified: false,
          reason: "Failed to parse verification result from OpenAI",
          confidence: "low",
          articles: articles.slice(0, 3),
        });
      }

      console.error(
        "[NewsVerificationTool] Verification Result:",
        verificationResult
      );
      return JSON.stringify({
        ...verificationResult,
        articles: articles.slice(0, 3),
      });
    } catch (error) {
      console.error("[NewsVerificationTool] Error verifying disaster:", error);
      return JSON.stringify({
        verified: false,
        reason: "Failed to verify disaster",
        confidence: "low",
        articles: [],
      });
    }
  }
}
