const { ethers } = require("ethers");
const crypto = require("crypto-js");

class WalletService {
  constructor() {
    this.provider = new ethers.providers.InfuraProvider("mainnet", {
      projectId: process.env.INFURA_PROJECT_ID,
      projectSecret: process.env.INFURA_PROJECT_SECRET,
    });
  }

  generateWalletFromTweet(tweetId, authorId) {
    // Create a deterministic seed based on tweet ID, author ID, and server secret
    const hash = crypto
      .SHA256(`${tweetId}-${authorId}-${process.env.SERVER_SECRET}`)
      .toString();

    // Convert the hex string to bytes
    const seedBytes = ethers.utils.arrayify(`0x${hash}`);

    // Create a wallet from the seed bytes
    const wallet = ethers.Wallet.fromMnemonic(
      ethers.utils.entropyToMnemonic(seedBytes.slice(0, 32))
    );

    return {
      address: wallet.address,
      privateKey: wallet.privateKey, // Store securely or encrypt before storing
    };
  }

  async getWalletBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      throw new Error("Failed to get wallet balance");
    }
  }

  async transferFunds(fromPrivateKey, toAddress, amount) {
    try {
      const wallet = new ethers.Wallet(fromPrivateKey, this.provider);
      const tx = await wallet.sendTransaction({
        to: toAddress,
        value: ethers.utils.parseEther(amount.toString()),
      });
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error("Error transferring funds:", error);
      throw new Error("Failed to transfer funds");
    }
  }
}

module.exports = new WalletService();
