require("dotenv").config();

console.log("Environment Variables Check:");
console.log(
  "OPENAI_API_KEY:",
  process.env.OPENAI_API_KEY ? "Present" : "Missing"
);
console.log("NEWS_API_KEY:", process.env.NEWS_API_KEY ? "Present" : "Missing");
console.log(
  "SERVER_SECRET:",
  process.env.SERVER_SECRET ? "Present" : "Missing"
);
