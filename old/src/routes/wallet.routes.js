const express = require("express");
const router = express.Router();
const walletService = require("../services/wallet.service");
const kycService = require("../services/kyc.service");

// Get wallet balance
router.get("/balance/:address", async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await walletService.getWalletBalance(address);
    res.json({ address, balance });
  } catch (error) {
    console.error("Error getting wallet balance:", error);
    res.status(500).json({ error: "Failed to get wallet balance" });
  }
});

// Request funds withdrawal
router.post("/withdraw", async (req, res) => {
  try {
    const { tweetId, authorId, destinationAddress } = req.body;

    if (!tweetId || !authorId || !destinationAddress) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if KYC is approved
    const kycStatus = await kycService.getKYCStatus(authorId);
    if (kycStatus.status !== "approved") {
      return res.status(403).json({
        error: "KYC not approved",
        kycStatus: kycStatus.status,
      });
    }

    // Generate the wallet to get the private key
    const wallet = walletService.generateWalletFromTweet(tweetId, authorId);

    // Get current balance
    const balance = await walletService.getWalletBalance(wallet.address);

    if (balance <= 0) {
      return res
        .status(400)
        .json({ error: "No funds available for withdrawal" });
    }

    // Transfer funds
    const txHash = await walletService.transferFunds(
      wallet.privateKey,
      destinationAddress,
      balance
    );

    res.json({
      message: "Withdrawal successful",
      transactionHash: txHash,
      amount: balance,
    });
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    res.status(500).json({ error: "Failed to process withdrawal" });
  }
});

module.exports = router;
