import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

interface DisasterCampaign {
  poster_name: string;
  poster_id: string;
  tweet_id: string;
  address: string;
  location: string;
  disaster_type: string;
  verified: boolean;
  created_at: string;
  status: "active" | "closed";
  article_title?: string;
  article_description?: string;
}

export class DisasterStorageTool extends StructuredTool {
  name = "disaster_storage_tool";
  description = "Stores and manages disaster relief campaigns";
  schema = z.object({
    poster_name: z.string(),
    poster_id: z.string(),
    tweet_id: z.string(),
    address: z.string(),
    location: z.string(),
    disaster_type: z.string(),
    article_title: z.string().optional(),
    article_description: z.string().optional(),
  }) as any;

  private readonly storagePath: string;

  constructor() {
    super();
    this.storagePath = path.join(process.cwd(), "data", "disasters.json");
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
          disasters: {},
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
        disasters: {},
      };
      fs.writeFileSync(this.storagePath, JSON.stringify(initialData, null, 2));
    }
  }

  protected async _call({
    poster_name,
    poster_id,
    tweet_id,
    address,
    location,
    disaster_type,
    article_title,
    article_description,
  }: {
    poster_name: string;
    poster_id: string;
    tweet_id: string;
    address: string;
    location: string;
    disaster_type: string;
    article_title?: string;
    article_description?: string;
  }): Promise<string> {
    try {
      const content = fs.readFileSync(this.storagePath, "utf8");
      const data = JSON.parse(content);
      const disasterId = `disaster_${Date.now()}`;

      const campaign: DisasterCampaign = {
        poster_name,
        poster_id,
        tweet_id,
        address,
        location,
        disaster_type,
        verified: true,
        created_at: new Date().toISOString(),
        status: "active",
        article_title,
        article_description,
      };

      data.disasters[disasterId] = campaign;
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));

      return JSON.stringify({
        success: true,
        message: "Disaster campaign stored successfully",
        disaster_id: disasterId,
        campaign,
      });
    } catch (error) {
      console.error("Error storing disaster campaign:", error);
      return JSON.stringify({
        success: false,
        message: "Failed to store disaster campaign",
      });
    }
  }

  public async getCampaign(
    disasterId: string
  ): Promise<DisasterCampaign | null> {
    try {
      const content = fs.readFileSync(this.storagePath, "utf8");
      const data = JSON.parse(content);
      return data.disasters[disasterId] || null;
    } catch (error) {
      console.error("Error getting disaster campaign:", error);
      return null;
    }
  }

  public async updateCampaignStatus(
    disasterId: string,
    status: "active" | "closed"
  ): Promise<boolean> {
    try {
      const content = fs.readFileSync(this.storagePath, "utf8");
      const data = JSON.parse(content);
      if (!data.disasters[disasterId]) {
        return false;
      }

      data.disasters[disasterId].status = status;
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error("Error updating disaster campaign status:", error);
      return false;
    }
  }
}
