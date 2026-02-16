const axios = require("axios");

async function testSearch() {
  const hashtags = ["nature", "fitness", "travel"];

  for (const tag of hashtags) {
    console.log(`\nTesting hashtag: #${tag}`);
    try {
      const startResponse = await axios.post(
        "http://localhost:3000/api/instagram/search",
        {
          searchTerm: tag,
          limit: 5,
        },
      );

      const jobId = startResponse.data.jobId;
      console.log(`Job started: ${jobId}`);

      // Poll for status
      let status = "PROCESSING";
      let attempts = 0;
      // Poll for up to 60 seconds (20 * 3s)
      while (status === "PROCESSING" && attempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        try {
          const statusResponse = await axios.get(
            `http://localhost:3000/api/instagram/job/${jobId}`,
          );
          status = statusResponse.data.status;

          if (status === "SUCCESS") {
            console.log("Job completed!");
            const results = statusResponse.data.data;
            console.log(`Received ${results.length} results.`);

            // Verify results are reels
            const nonReels = results.filter(
              (r) =>
                r.type !== "Video" && r.type !== "GraphVideo" && !r.isVideo,
            );
            if (nonReels.length > 0) {
              console.error(
                "FAIL: Found non-reel results:",
                nonReels.map((r) => r.type),
              );
            } else {
              console.log("SUCCESS: All results are reels/videos.");
              if (results.length > 0) {
                // console.log("Sample:", JSON.stringify(results[0], null, 2));
              } else {
                console.warn("WARNING: No results returned.");
              }
            }
          } else if (status === "FAILED") {
            console.error("Job failed:", statusResponse.data.error);
          }
        } catch (err) {
          console.error("Error polling job status:", err.message);
        }
        attempts++;
      }
      if (attempts >= 20 && status === "PROCESSING")
        console.error("Timeout polling for job");
    } catch (e) {
      console.error(`Error testing #${tag}:`, e.message);
      if (e.response) console.error(e.response.data);
    }
  }
}

testSearch();
