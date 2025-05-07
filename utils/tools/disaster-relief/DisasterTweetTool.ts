import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { ethers } from "ethers";
import { generateAddress } from "@neardefi/shade-agent-js";

export class DisasterTweetGenerator extends StructuredTool {
  name = "disaster_tweet_generator";
  description =
    "Generates tweet content and donation address for verified disasters";
  schema = z.object({
    location: z.string(),
    disaster_type: z.string(),
    article_title: z.string(),
    article_description: z.string(),
    tweet_id: z.string(),
  }) as any;

  private async generateDonationAddress(tweetId: string): Promise<string> {
    const { address } = await generateAddress({
      publicKey: process.env.PUBLIC_KEY,
      accountId: process.env.NEXT_PUBLIC_contractId,
      path: tweetId,
      chain: "evm",
    });
    return address;
  }

  protected async _call({
    location,
    disaster_type,
    article_title,
    article_description,
    tweet_id,
  }: {
    location: string;
    disaster_type: string;
    article_title: string;
    article_description: string;
    tweet_id: string;
  }): Promise<string> {
    try {
      const donationAddress = this.generateDonationAddress(tweet_id);
      const tweetText = `🚨 EMERGENCY ALERT 🚨\n\n${location} is facing a ${disaster_type} disaster.\n\n${article_title}\n\n${article_description}\n\nPlease help by donating to:\n${donationAddress}\n\n#DisasterRelief #${location.replace(
        /\s+/g,
        ""
      )}Relief`;

      return JSON.stringify({
        success: true,
        message: "Disaster relief tweet content generated successfully",
        tweet_text: tweetText,
        donation_address: donationAddress,
      });
    } catch (error) {
      console.error("Error generating disaster tweet:", error);
      return JSON.stringify({
        success: false,
        message: "Failed to generate disaster tweet content",
      });
    }
  }
}
