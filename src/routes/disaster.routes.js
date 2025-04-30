const express = require("express");
const router = express.Router();
const newsService = require("../services/news.service");
const walletService = require("../services/wallet.service");

// Mock tweet data store
const disasterRequests = new Map();

// Helper function to generate a unique tweet ID
const generateTweetId = () => {
  return `tweet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Submit a new disaster relief request
router.post("/request", async (req, res) => {
  try {
    console.log("Received disaster relief request:", req.body);
    const { text } = req.body;

    if (!text) {
      console.log("Request rejected: Missing tweet text");
      return res.status(400).json({ error: "Tweet text is required" });
    }

    // Parse disaster information from tweet text
    console.log("Parsing tweet text...");
    const parsedInfo = await newsService.parseTweetText(text);
    console.log("Parsed disaster information:", parsedInfo);

    if (!parsedInfo.location || !parsedInfo.disasterType) {
      console.log(
        "Request rejected: Could not extract required information",
        parsedInfo
      );
      return res.status(400).json({
        error: "Could not extract required disaster information from tweet",
        parsed: parsedInfo,
      });
    }

    // Generate mock tweet ID and author ID (in production, these would come from Twitter)
    const tweetId = generateTweetId();
    const authorId = `user_${Date.now()}`; // In production, this would be the actual Twitter user ID
    console.log("Generated IDs:", { tweetId, authorId });

    // Verify the disaster through news sources
    console.log("Verifying disaster...");
    const verificationResult = await newsService.verifyDisaster(
      parsedInfo.location,
      parsedInfo.disasterType
    );
    console.log("Verification result:", verificationResult);

    if (!verificationResult.verified) {
      console.log(
        "Request rejected: Disaster verification failed",
        verificationResult
      );
      return res.status(400).json({
        error: "Disaster could not be verified",
        reason: verificationResult.reason,
      });
    }

    // Generate a wallet for the disaster relief
    console.log("Generating wallet...");
    const wallet = walletService.generateWalletFromTweet(tweetId, authorId);
    console.log("Wallet generated:", { address: wallet.address });

    // Store the request details
    const request = {
      tweetId,
      authorId,
      text,
      location: parsedInfo.location,
      disasterType: parsedInfo.disasterType,
      severity: parsedInfo.severity,
      wallet: wallet.address,
      status: "active",
      createdAt: new Date(),
      verificationDetails: verificationResult,
    };

    disasterRequests.set(tweetId, request);
    console.log("Disaster request stored successfully");

    res.status(201).json({
      message: "Disaster relief request created successfully",
      request: {
        ...request,
        wallet: wallet.address, // Only share the public address
      },
    });
  } catch (error) {
    console.error("Error processing disaster request:", error);
    res.status(500).json({
      error: "Failed to process disaster relief request",
      details: error.message,
    });
  }
});

// Get disaster relief request details
router.get("/request/:tweetId", async (req, res) => {
  try {
    const { tweetId } = req.params;
    console.log("Fetching disaster request:", tweetId);

    const request = disasterRequests.get(tweetId);

    if (!request) {
      console.log("Request not found:", tweetId);
      return res
        .status(404)
        .json({ error: "Disaster relief request not found" });
    }

    // Get current wallet balance
    console.log("Fetching wallet balance for:", request.wallet);
    const balance = await walletService.getWalletBalance(request.wallet);
    console.log("Current balance:", balance);

    res.json({
      ...request,
      currentBalance: balance,
    });
  } catch (error) {
    console.error("Error fetching disaster request:", error);
    res.status(500).json({ error: "Failed to fetch disaster relief request" });
  }
});

// List all active disaster relief requests
router.get("/requests", (req, res) => {
  try {
    console.log("Listing all active disaster requests");
    const requests = Array.from(disasterRequests.values())
      .filter((request) => request.status === "active")
      .map((request) => ({
        tweetId: request.tweetId,
        text: request.text,
        location: request.location,
        disasterType: request.disasterType,
        severity: request.severity,
        wallet: request.wallet,
        createdAt: request.createdAt,
      }));

    console.log(`Found ${requests.length} active requests`);
    res.json(requests);
  } catch (error) {
    console.error("Error listing disaster requests:", error);
    res.status(500).json({ error: "Failed to list disaster relief requests" });
  }
});

module.exports = router;
