import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { TwitterApi } from "twitter-api-v2";

interface ProcessedMention {
  tweet_id: string;
  processed_at: string;
  status: "verified" | "rejected" | "pending";
  location?: string;
  disaster_type?: string;
}

export class MentionProcessingTool extends StructuredTool {
  name = "mention_processing_tool";
  description = "Processes and tracks Twitter mentions about disasters";
  schema = z.object({
    tweet_id: z.string(),
    location: z.string().optional(),
    disaster_type: z.string().optional(),
  }) as any;

  private readonly storagePath: string;
  private readonly client: TwitterApi;

  constructor(client: TwitterApi) {
    super();
    this.client = client;
    this.storagePath = path.join(
      process.cwd(),
      "data",
      "processed_mentions.json"
    );
    this.initializeStorage();
  }

  private initializeStorage() {
    try {
      const dir = path.dirname(this.storagePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Initialize with proper JSON structure if file doesn't exist or is empty
      if (
        !fs.existsSync(this.storagePath) ||
        fs.readFileSync(this.storagePath, "utf8").trim() === ""
      ) {
        const initialData = {
          processed_mentions: {},
        };
        fs.writeFileSync(
          this.storagePath,
          JSON.stringify(initialData, null, 2)
        );
      } else {
        // Validate existing JSON
        const content = fs.readFileSync(this.storagePath, "utf8");
        JSON.parse(content); // This will throw if JSON is invalid
      }
    } catch (error) {
      console.error("Error initializing storage:", error);
      // If there's any error, create a fresh file
      const initialData = {
        processed_mentions: {},
      };
      fs.writeFileSync(this.storagePath, JSON.stringify(initialData, null, 2));
    }
  }

  private async isProcessed(tweetId: string): Promise<boolean> {
    try {
      const content = fs.readFileSync(this.storagePath, "utf8");
      const data = JSON.parse(content);
      return tweetId in data.processed_mentions;
    } catch (error) {
      console.error("Error checking processed mentions:", error);
      return false;
    }
  }

  protected async _call({
    tweet_id,
    location,
    disaster_type,
  }: {
    tweet_id: string;
    location?: string;
    disaster_type?: string;
  }): Promise<string> {
    try {
      // Check if mention is already processed
      if (await this.isProcessed(tweet_id)) {
        return JSON.stringify({
          success: false,
          message: "Mention already processed",
        });
      }

      // Get tweet details
      const tweet = await this.client.v2.singleTweet(tweet_id, {
        "tweet.fields": ["author_id", "created_at", "text"],
        "user.fields": ["username"],
      });

      if (!tweet.data) {
        return JSON.stringify({
          success: false,
          message: "Tweet not found",
        });
      }

      // Store processed mention
      const content = fs.readFileSync(this.storagePath, "utf8");
      const data = JSON.parse(content);
      const processedMention: ProcessedMention = {
        tweet_id,
        processed_at: new Date().toISOString(),
        status: "pending",
        location,
        disaster_type,
      };

      data.processed_mentions[tweet_id] = processedMention;
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));

      return JSON.stringify({
        success: true,
        message: "Mention processed successfully",
        tweet: tweet.data,
        mention: processedMention,
      });
    } catch (error) {
      console.error("Error processing mention:", error);
      return JSON.stringify({
        success: false,
        message: "Failed to process mention",
      });
    }
  }
}
