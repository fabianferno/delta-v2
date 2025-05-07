const express = require("express");
const router = express.Router();
const kycService = require("../services/kyc.service");

// Submit KYC request
router.post("/submit", async (req, res) => {
  try {
    const { authorId, kycData } = req.body;

    if (!authorId || !kycData) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate KYC data
    const requiredFields = [
      "fullName",
      "dateOfBirth",
      "address",
      "idType",
      "idNumber",
    ];
    const missingFields = requiredFields.filter((field) => !kycData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: "Missing required KYC fields",
        missingFields,
      });
    }

    const kycRequest = await kycService.submitKYC(authorId, kycData);

    res.status(201).json({
      message: "KYC submission successful",
      authorId: kycRequest.authorId,
      status: kycRequest.status,
      submittedAt: kycRequest.submittedAt,
    });
  } catch (error) {
    console.error("Error submitting KYC:", error);
    res.status(500).json({ error: "Failed to submit KYC" });
  }
});

// Get KYC status
router.get("/status/:authorId", async (req, res) => {
  try {
    const { authorId } = req.params;
    const kycStatus = await kycService.getKYCStatus(authorId);

    res.json({
      authorId,
      status: kycStatus.status,
      submittedAt: kycStatus.submittedAt,
      updatedAt: kycStatus.updatedAt,
    });
  } catch (error) {
    console.error("Error getting KYC status:", error);
    res.status(500).json({ error: "Failed to get KYC status" });
  }
});

// Admin routes for KYC approval/rejection
router.post("/admin/approve/:authorId", async (req, res) => {
  try {
    const { authorId } = req.params;
    const kycRequest = await kycService.approveKYC(authorId);

    res.json({
      message: "KYC approved successfully",
      authorId,
      status: kycRequest.status,
      updatedAt: kycRequest.updatedAt,
    });
  } catch (error) {
    console.error("Error approving KYC:", error);
    res.status(500).json({ error: "Failed to approve KYC" });
  }
});

router.post("/admin/reject/:authorId", async (req, res) => {
  try {
    const { authorId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const kycRequest = await kycService.rejectKYC(authorId, reason);

    res.json({
      message: "KYC rejected successfully",
      authorId,
      status: kycRequest.status,
      reason: kycRequest.reason,
      updatedAt: kycRequest.updatedAt,
    });
  } catch (error) {
    console.error("Error rejecting KYC:", error);
    res.status(500).json({ error: "Failed to reject KYC" });
  }
});

module.exports = router;
