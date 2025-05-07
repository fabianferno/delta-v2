class KYCService {
  constructor() {
    this.kycRequests = new Map(); // In production, use a database
  }

  async submitKYC(authorId, kycData) {
    try {
      // Mock KYC submission
      // In production, integrate with a real KYC provider
      const kycRequest = {
        authorId,
        status: "pending",
        data: kycData,
        submittedAt: new Date(),
        updatedAt: new Date(),
      };

      this.kycRequests.set(authorId, kycRequest);
      return kycRequest;
    } catch (error) {
      console.error("Error submitting KYC:", error);
      throw new Error("Failed to submit KYC");
    }
  }

  async getKYCStatus(authorId) {
    const kycRequest = this.kycRequests.get(authorId);
    if (!kycRequest) {
      throw new Error("KYC request not found for this author");
    }
    return kycRequest;
  }

  async approveKYC(authorId) {
    const kycRequest = this.kycRequests.get(authorId);
    if (!kycRequest) {
      throw new Error("KYC request not found for this author");
    }

    kycRequest.status = "approved";
    kycRequest.updatedAt = new Date();
    this.kycRequests.set(authorId, kycRequest);
    return kycRequest;
  }

  async rejectKYC(authorId, reason) {
    const kycRequest = this.kycRequests.get(authorId);
    if (!kycRequest) {
      throw new Error("KYC request not found for this author");
    }

    kycRequest.status = "rejected";
    kycRequest.reason = reason;
    kycRequest.updatedAt = new Date();
    this.kycRequests.set(authorId, kycRequest);
    return kycRequest;
  }
}

module.exports = new KYCService();
