const OpenAITranscriptAnalyzer = require("./services/openAI.service");
require("dotenv").config();

async function test() {
  const analyzer = new OpenAITranscriptAnalyzer();
  const transcript =
    "Hey guys, surprise surprise, I just made $5,000 in under 60 seconds using the ICT Silver Bullet model. Everyone misses this entry, but it's printing again today. Clean win, perfect execution.";

  console.log("Testing analyzeTranscript...");
  const result = await analyzer.analyzeTranscript(transcript);

  if (result.success) {
    console.log("✅ Test Passed!");
    console.log("Hook:", result.hook);
    console.log("Template:", result.template);
  } else {
    console.log("❌ Test Failed!");
    console.log("Error:", result.error);
  }
}

test();
