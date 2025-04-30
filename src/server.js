require("dotenv").config();
const express = require("express");
const cors = require("cors");
const disasterRoutes = require("./routes/disaster.routes");
const walletRoutes = require("./routes/wallet.routes");
const kycRoutes = require("./routes/kyc.routes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/disaster", disasterRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/kyc", kycRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
