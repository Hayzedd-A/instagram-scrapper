# Content Creator Instagram Search API

## New Endpoints

### POST /api/instagram/search

Create a search job for content creators to find Instagram posts matching specific criteria.

**Request Body:**

```json
{
  "searchTerm": "webdevelopment",
  "recencyDays": 30,
  "minViews": 1000,
  "minFollowers": 5000,
  "profile": {
    "recencyPost": 7
  }
}
```

**Parameters:**

- `searchTerm` (string, required): Hashtag to search (without #)
- `recencyDays` (number, optional): Only posts from last N days (default: 30, max: 365)
- `minViews` (number, optional): Minimum video views (default: 0)
- `minFollowers` (number, optional): Minimum follower count of post owner (default: 0)
- `profile.recencyPost` (number, optional): Additional recency filter for profile posts

**Response:** (202 Accepted)

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "PROCESSING"
}
```

---

### GET /api/instagram/job/:jobId

Poll for job status and get results when complete.

**Response - Processing:**

```json
{
  "status": "PROCESSING",
  "searchCriteria": {
    "searchTerm": "webdevelopment",
    "recencyDays": 30,
    "minViews": 1000,
    "minFollowers": 5000
  },
  "createdAt": "2026-02-15T00:00:00.000Z"
}
```

**Response - Success:**

```json
{
 "status": "SUCCESS",
  "data": [
    {
      "postId": "3832653235153041570",
      "shortCode": "DUwUc-kjHii",
      "url": "https://www.instagram.com/p/DUwUc-kjHii/",
      "caption": "Full caption here...",
      "ownerUsername": "tesla_development",
      "ownerFullName": "Tesla Development",
      "ownerFollowers": 15000,
      "likesCount": 3,
      "commentsCount": 1,
      "viewsCount": 0,
      "timestamp": "2026-02-14T22:24:50.000Z",
      "type": "Sidecar",
      "displayUrl": "https://...",
      "hashtags": ["WebDevelopment", "CustomWebApp", ...],
      "mentions": ["tesla-development.com"]
    }
  ],
  "metadata": {
    "totalResults": 200,
    "filteredResults": 15,
    "searchCriteria": {...},
    "completedAt": "2026-02-15T00:01:00.000Z"
  }
}
```

**Response - Failed:**

```json
{
  "status": "FAILED",
  "error": {
    "message": "Error description",
    "timestamp": "2026-02-15T00:00:30.000Z"
  },
  "searchCriteria": {...}
}
```

## Usage Flow

1. **Frontend creates search job**

   ```javascript
   const response = await fetch("/api/instagram/search", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({
       searchTerm: "webdevelopment",
       recencyDays: 7,
       minViews: 1000,
       minFollowers: 5000,
     }),
   });
   const { jobId } = await response.json();
   ```

2. **Frontend polls for results**

   ```javascript
   const checkStatus = async () => {
     const response = await fetch(`/api/instagram/job/${jobId}`);
     const data = await response.json();

     if (data.status === "PROCESSING") {
       setTimeout(checkStatus, 3000); // Poll every 3 seconds
     } else if (data.status === "SUCCESS") {
       displayResults(data.data);
     } else {
       showError(data.error);
     }
   };

   checkStatus();
   ```

## Filtering Logic

The backend applies filters in this order:

1. **Scrapes posts** by hashtag (up to 200)
2. **Recency filter**: Keeps only posts from last N days
3. **View count filter**: For videos, keeps only posts with views >= minViews
4. **Follower filter**: Fetches profile data, filters by follower count
5. **Profile recency**: Additional recency check if specified

Final results include all necessary data for content creators to make decisions.

## Example Use Cases

**Find viral videos:**

```json
{
  "searchTerm": "webdevelopment",
  "recencyDays": 7,
  "minViews": 10000,
  "minFollowers": 0
}
```

**Find influencer content:**

```json
{
  "searchTerm": "tech",
  "recencyDays": 30,
  "minViews": 0,
  "minFollowers": 50000
}
```

**Recent trending posts:**

```json
{
  "searchTerm": "ai",
  "recencyDays": 3,
  "minViews": 5000,
  "minFollowers": 10000,
  "profile": {
    "recencyPost": 1
  }
}
```
