# Instagram Scraper Server

A scalable Instagram scraper server built with **Apify SDK**, **Express.js**, and **MongoDB**. This application provides a RESTful API to scrape Instagram data (profiles, posts, comments, hashtags) and store them in MongoDB for easy retrieval and analysis.

## Features

✨ **Comprehensive Scraping**

- Profile information (followers, following, bio, etc.)
- Posts from profiles
- Posts by hashtags
- Comments from posts

🚀 **Production-Ready**

- Asynchronous job-based scraping
- Job status tracking and monitoring
- Rate limiting and API protection
- Caching for improved performance
- Structured logging with Winston
- Error handling and retry logic

📊 **Data Management**

- MongoDB storage with Mongoose ODM
- Pagination and filtering
- Data normalization and validation
- Automatic deduplication

## Prerequisites

- **Node.js** v14 or higher
- **MongoDB** (local or MongoDB Atlas)
- **Apify Account** - [Sign up here](https://apify.com)

## Installation

1. **Clone the repository** (or navigate to the project directory)

```bash
cd Instagram-scrapper
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/instagram-scraper
# For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/instagram-scraper

# Apify Configuration
APIFY_TOKEN=your_apify_token_here
# Get your token from: https://console.apify.com/account/integrations

# Instagram Scraper Actor ID
INSTAGRAM_SCRAPER_ACTOR_ID=apify/instagram-scraper
```

4. **Get your Apify API token**

- Sign up at [Apify.com](https://apify.com)
- Go to [Account Integrations](https://console.apify.com/account/integrations)
- Copy your API token and add it to `.env`

## Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Endpoints Overview

| Category    | Method | Endpoint                       | Description                 |
| ----------- | ------ | ------------------------------ | --------------------------- |
| **Health**  | GET    | `/api/health`                  | Check API status            |
| **Scraper** | POST   | `/api/scraper/profile`         | Scrape a profile            |
| **Scraper** | POST   | `/api/scraper/posts`           | Scrape posts from a profile |
| **Scraper** | POST   | `/api/scraper/hashtag`         | Scrape posts by hashtag     |
| **Scraper** | POST   | `/api/scraper/comments`        | Scrape comments from a post |
| **Data**    | GET    | `/api/data/profiles`           | Get all profiles            |
| **Data**    | GET    | `/api/data/profiles/:username` | Get specific profile        |
| **Data**    | GET    | `/api/data/posts`              | Get all posts               |
| **Data**    | GET    | `/api/data/posts/:id`          | Get specific post           |
| **Data**    | GET    | `/api/data/comments/:postId`   | Get comments for a post     |
| **Jobs**    | GET    | `/api/jobs`                    | Get all scraping jobs       |
| **Jobs**    | GET    | `/api/jobs/:id`                | Get job status              |
| **Jobs**    | DELETE | `/api/jobs/:id`                | Cancel a job                |

### Scraping Endpoints

#### Scrape Profile

```http
POST /api/scraper/profile
Content-Type: application/json

{
  "username": "instagram"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Profile scraping job started",
  "data": {
    "jobId": "uuid-here",
    "_id": "mongodb-id",
    "status": "pending",
    "type": "profile",
    "target": "instagram"
  }
}
```

#### Scrape Posts

```http
POST /api/scraper/posts
Content-Type: application/json

{
  "username": "instagram",
  "limit": 50
}
```

#### Scrape Hashtag

```http
POST /api/scraper/hashtag
Content-Type: application/json

{
  "hashtag": "travel",
  "limit": 50
}
```

#### Scrape Comments

```http
POST /api/scraper/comments
Content-Type: application/json

{
  "postUrl": "https://www.instagram.com/p/ABC123/",
  "limit": 50
}
```

### Data Retrieval Endpoints

#### Get All Profiles

```http
GET /api/data/profiles?page=1&limit=20
```

**Response:**

```json
{
  "success": true,
  "data": [...profiles...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### Get Profile by Username

```http
GET /api/data/profiles/instagram
```

#### Get Posts with Filters

```http
GET /api/data/posts?username=instagram&page=1&limit=20
GET /api/data/posts?hashtag=travel&page=1&limit=20
GET /api/data/posts?type=Video&page=1&limit=20
```

### Job Management Endpoints

#### Get All Jobs

```http
GET /api/jobs?status=running&page=1&limit=20
```

Query parameters:

- `status`: Filter by status (pending, running, completed, failed, cancelled)
- `type`: Filter by type (profile, posts, hashtag, comments)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

#### Get Job Status

```http
GET /api/jobs/:id
```

**Response:**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid-here",
    "type": "profile",
    "target": "instagram",
    "status": "completed",
    "progress": 100,
    "results": {
      "itemsScraped": 1,
      "itemsSaved": 1
    },
    "startedAt": "2026-02-14T22:00:00.000Z",
    "completedAt": "2026-02-14T22:01:30.000Z",
    "duration": 90000
  }
}
```

#### Cancel Job

```http
DELETE /api/jobs/:id
```

## Architecture

```
src/
├── config/           # Configuration and environment variables
├── controllers/      # Request handlers
│   ├── scraper.controller.js
│   ├── data.controller.js
│   └── jobs.controller.js
├── database/         # Database connection
├── middleware/       # Express middleware
│   ├── errorHandler.js
│   ├── rateLimiter.js
│   └── validation.js
├── models/          # Mongoose schemas
│   ├── Profile.js
│   ├── Post.js
│   ├── Comment.js
│   └── ScrapingJob.js
├── routes/          # API routes
│   ├── scraper.routes.js
│   ├── data.routes.js
│   ├── jobs.routes.js
│   └── index.js
├── services/        # Business logic
│   └── apify.service.js
├── utils/           # Helper utilities
│   ├── logger.js
│   ├── cache.js
│   └── scraper.utils.js
└── server.js        # Express app entry point
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 100 requests per 15 minutes
- **Scraping endpoints**: 20 requests per 15 minutes

## Caching

Frequently accessed data is cached in memory with configurable TTL:

- Profile data: 10 minutes
- Profile listings: 5 minutes

## Logging

All logs are stored in the `logs/` directory:

- `error.log` - Error-level logs only
- `combined.log` - All logs

Log level can be configured via `LOG_LEVEL` environment variable (default: `info`).

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Error description"
  },
  "timestamp": "2026-02-14T22:00:00.000Z"
}
```

## Best Practices

1. **Respect Instagram's Terms**: Use responsibly and respect rate limits
2. **Monitor Jobs**: Check job status before starting new ones
3. **Use Pagination**: Always use pagination for large datasets
4. **Handle Errors**: Implement proper error handling in your client
5. **Cache Wisely**: Leverage caching to reduce database load

## Troubleshooting

### Apify Token Error

If you see "Apify is not configured", make sure:

1. You have set `APIFY_TOKEN` in your `.env` file
2. The token is valid and active
3. You've restarted the server after adding the token

### MongoDB Connection Error

If MongoDB connection fails:

1. Ensure MongoDB is running
2. Check your `MONGODB_URI` in `.env`
3. Verify network connectivity
4. For Atlas, whitelist your IP address

### Rate Limit Errors

If you're hitting rate limits:

1. Wait before making more requests
2. Adjust `RATE_LIMIT_MAX_REQUESTS` in `.env`
3. Consider implementing request queuing in your client

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please open an issue on the repository.
