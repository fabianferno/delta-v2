import { TwitterToolkit } from "@coinbase/twitter-langchain";
import { TwitterAgentkit } from "@coinbase/cdp-agentkit-core";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import * as dotenv from "dotenv";
import { TwitterApi } from "twitter-api-v2";
import { NewsVerificationTool } from "./disaster-relief/NewsVerificationTool";
import { DisasterTweetGenerator } from "./disaster-relief/DisasterTweetTool";
import { DisasterStorageTool } from "./disaster-relief/DisasterStorageTool";
import { ClaimFundsTool } from "./disaster-relief/ClaimFundsTool";

dotenv.config();

const modifier = `
  You are a helpful disaster relief agent that can interact with the Twitter (X) API using the Coinbase Developer Platform Twitter (X) Agentkit.
  You are empowered to help people in disaster situations by verifying their claims and creating donation campaigns.

  Available tools: 
  1. news_verification_tool: Use this to verify disaster claims using news sources
  2. disaster_tweet_generator: Use this to generate tweet content and donation address for verified disasters
  3. disaster_storage_tool: Use this to store and manage disaster relief campaigns
  4. claim_funds_tool: Use this to process user requests to claim funds collected for a disaster campaign. Users specify a destination address and a disaster reference (location, disaster type, or donation address). This tool marks the campaign as closed and logs the claim.
  5. twitter_tweet_tool: Use this to post tweets to Twitter

  When processing mentions about disasters, follow these steps:   
  1. Use news_verification_tool to verify the disaster claim
  2. If verified:
     a. Use disaster_tweet_generator to generate tweet content and donation address
     b. Use twitter_tweet_tool to post the tweet
     c. Use disaster_storage_tool to store the campaign details 
  3. When a user requests to claim funds for a campaign (e.g., "Hey @deltabot send funds collected for Tripura floods to 0x..."), use claim_funds_tool.

  Always be helpful and provide clear responses to user queries.
`;

/**
 * Initialize the agent with Twitter (X) Agentkit
 *
 * @returns Agent executor and config
 */
export async function initialize() {
  // Initialize LLM
  const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

  // Twitter (X) Agentkit
  const twitterAgentkit = new TwitterAgentkit();

  // Twitter (X) Toolkit
  const twitterToolkit = new TwitterToolkit(twitterAgentkit);

  // Initialize Twitter API client with OAuth 1.0a User Context
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY || "",
    appSecret: process.env.TWITTER_API_SECRET || "",
    accessToken: process.env.TWITTER_ACCESS_TOKEN || "",
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || "",
  });

  // Create disaster relief tools
  const newsVerificationTool = new NewsVerificationTool();
  const disasterTweetGenerator = new DisasterTweetGenerator();
  const disasterStorageTool = new DisasterStorageTool();
  const claimFundsTool = new ClaimFundsTool();

  // Get all tools
  const tools: any[] = [
    ...twitterToolkit.getTools(),
    newsVerificationTool,
    disasterTweetGenerator,
    disasterStorageTool,
    claimFundsTool,
  ];

  // Store buffered conversation history in memory
  const memory = new MemorySaver();

  // React Agent options
  const agentConfig = {
    configurable: { thread_id: "Disaster Relief Twitter Bot" },
  };

  // Create React Agent using the LLM and Twitter (X) tools
  const agent = createReactAgent({
    llm,
    tools,
    checkpointSaver: memory,
    messageModifier: modifier,
  });

  return { agent, config: agentConfig };
}
