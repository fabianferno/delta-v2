# Disaster Relief Funding Platform

A platform that enables disaster relief funding through blockchain technology, with AI-powered verification of disaster claims.

## Features

- AI-powered disaster verification using news sources
- Automated tweet text parsing for disaster information
- Automated wallet generation for disaster relief funds
- KYC verification system for fund withdrawal
- Real-time wallet balance tracking
- Secure fund transfer system

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   PORT=3000
   OPENAI_API_KEY=your_openai_api_key
   NEWS_API_KEY=your_news_api_key
   SERVER_SECRET=your_server_secret_for_wallet_generation
   INFURA_PROJECT_ID=your_infura_project_id
   INFURA_PROJECT_SECRET=your_infura_project_secret
   ```
4. Start the server:
   ```bash
   npm start
   ```
   For development with auto-reload:
   ```bash
   npm run dev
   ```

## API Documentation

### Important Note About Author ID

The `authorId` is used consistently throughout the API to identify Twitter users. In production:
- This would be the actual Twitter user ID
- It links disaster relief requests, KYC submissions, and fund withdrawals
- It's used to ensure only authorized users can withdraw funds
- It's combined with the tweet ID to generate deterministic wallets

### Disaster Relief Endpoints

#### Create Disaster Relief Request
- **POST** `/api/disaster/request`
- **Body**:
  ```json
  {
    "text": "@deltabot Need funds for forest fire in california. Situation is critical!"
  }
  ```
- **Response**:
  ```json
  {
    "message": "Disaster relief request created successfully",
    "request": {
      "tweetId": "generated_tweet_id",
      "authorId": "twitter_user_id",
      "text": "@deltabot Need funds for forest fire in california. Situation is critical!",
      "location": "California",
      "disasterType": "Forest Fire",
      "severity": "critical",
      "wallet": "0x...",
      "status": "active",
      "createdAt": "2024-01-20T12:00:00.000Z",
      "verificationDetails": {
        "verified": true,
        "reason": "Disaster verified through news sources",
        "articles": [...]
      }
    }
  }
  ```

#### Get Disaster Relief Request
- **GET** `/api/disaster/request/:tweetId`
- **Response includes**: Request details with current wallet balance

#### List Active Disaster Requests
- **GET** `/api/disaster/requests`
- **Response**: List of active disaster relief requests with their details

### Wallet Endpoints

#### Get Wallet Balance
- **GET** `/api/wallet/balance/:address`

#### Withdraw Funds
- **POST** `/api/wallet/withdraw`
- **Body**:
  ```json
  {
    "tweetId": "tweet_id",
    "authorId": "twitter_user_id",
    "destinationAddress": "0x..."
  }
  ```

### KYC Endpoints

#### Submit KYC
- **POST** `/api/kyc/submit`
- **Body**:
  ```json
  {
    "authorId": "twitter_user_id",
    "kycData": {
      "fullName": "John Doe",
      "dateOfBirth": "1990-01-01",
      "address": "123 Main St",
      "idType": "passport",
      "idNumber": "AB123456"
    }
  }
  ```

#### Get KYC Status
- **GET** `/api/kyc/status/:authorId`

#### Admin: Approve KYC
- **POST** `/api/kyc/admin/approve/:authorId`

#### Admin: Reject KYC
- **POST** `/api/kyc/admin/reject/:authorId`
- **Body**:
  ```json
  {
    "reason": "Invalid documentation"
  }
  ```

## Security Considerations

1. The server secret is used to generate deterministic wallets - keep it secure
2. KYC data should be stored securely in production
3. Admin endpoints should be properly secured in production
4. Private keys should be encrypted before storage in production
5. Implement proper authentication to ensure users can only access their own data

## Production Considerations

1. Use a proper database instead of in-memory storage
2. Implement proper authentication and authorization
3. Add rate limiting
4. Add input validation and sanitization
5. Implement proper error logging and monitoring
6. Use a production-grade KYC service
7. Implement proper wallet and private key management
8. Add comprehensive testing
9. Integrate with actual Twitter API for tweet and user verification
10. Implement proper session management to verify authorId claims 