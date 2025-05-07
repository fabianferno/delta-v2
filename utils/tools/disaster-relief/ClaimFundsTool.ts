import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { generateAddress } from "@neardefi/shade-agent-js";
import { evm } from "../../../utils/evm";

// Redefine DisasterCampaign for local use (not exported from DisasterStorageTool)
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
  claim_log?: Array<{
    claimed_by: string;
    destination_address: string;
    claimed_at: string;
  }>;
}

export class ClaimFundsTool extends StructuredTool {
  name = "claim_funds_tool";
  description =
    "Lets users claim funds for a disaster campaign by specifying a destination address and disaster reference (location, disaster type, or donation address). Marks the campaign as closed and logs the claim.";
  schema = z.object({
    destination_address: z.string(),
    disaster_reference: z
      .string()
      .describe(
        "Location, disaster type, or donation address to identify the campaign"
      ),
    claimed_by: z
      .string()
      .describe("Twitter handle or user ID of the claimant"),
  }) as any;

  private readonly storagePath: string;

  constructor() {
    super();
    this.storagePath = path.join(process.cwd(), "data", "disasters.json");
  }

  protected async _call({
    destination_address,
    disaster_reference,
    claimed_by,
  }: {
    destination_address: string;
    disaster_reference: string;
    claimed_by: string;
  }): Promise<string> {
    try {
      const content = fs.readFileSync(this.storagePath, "utf8");
      const data = JSON.parse(content);
      const campaigns: { [id: string]: DisasterCampaign } = data.disasters;
      // Find campaign by address, location, or disaster type
      const campaignId = Object.keys(campaigns).find((id) => {
        const c = campaigns[id];
        return (
          c.address.toLowerCase() === disaster_reference.toLowerCase() ||
          c.location.toLowerCase() === disaster_reference.toLowerCase() ||
          c.disaster_type.toLowerCase() === disaster_reference.toLowerCase()
        );
      });
      if (!campaignId) {
        return JSON.stringify({
          success: false,
          message: "No matching disaster campaign found for reference",
        });
      }
      const campaign = campaigns[campaignId];
      if (campaign.status === "closed") {
        return JSON.stringify({
          success: false,
          message: "Funds for this campaign have already been claimed.",
        });
      }
      // Regenerate the donation address from tweet_id
      const { address: regenerated_wallet } = await generateAddress({
        publicKey: process.env.PUBLIC_KEY,
        accountId: process.env.NEXT_PUBLIC_contractId,
        path: campaign.tweet_id,
        chain: "evm",
      });

      // Send funds from regenerated_wallet to destination_address
      // TODO: Implement this
      await evm.send({
        path: campaign.tweet_id,
        to: destination_address,
        from: regenerated_wallet,
        amount: "1000000000000000000",
      });

      // Mark as closed and log the claim
      campaign.status = "closed";
      if (!campaign.claim_log) campaign.claim_log = [];
      campaign.claim_log.push({
        claimed_by,
        destination_address,
        claimed_at: new Date().toISOString(),
      });
      data.disasters[campaignId] = campaign;
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
      // (In a real system, trigger funds transfer here)
      return JSON.stringify({
        success: true,
        message: "Funds claim recorded. Campaign marked as closed.",
        campaign_id: campaignId,
        claimed_by,
        destination_address,
        regenerated_wallet,
      });
    } catch (error) {
      console.error("Error processing funds claim:", error);
      return JSON.stringify({
        success: false,
        message: "Failed to process funds claim.",
      });
    }
  }
}
