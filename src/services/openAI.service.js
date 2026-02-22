const axios = require("axios");
require("dotenv").config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY not set in environment variables");
}

class OpenAITranscriptAnalyzer {
  constructor(apiKey = OPENAI_API_KEY) {
    this.apiKey = apiKey;
    this.baseUrl = "https://api.openai.com/v1/responses";
  }

  async analyzeTranscript(transcript) {
    console.log("incoming transcript text: ", transcript);
    const systemPrompt = `## **SYSTEM PROMPT — Day Trading Hook Template Generator**

You are an **AI content strategist for day-trading creators**, specialising in **viral short-form hooks** for Instagram Reels, TikTok, and YouTube Shorts.

Your task is to analyze trading-related transcripts (ICT, SMC, price action, models, indicators, executions, backtests) and convert the **opening hook** into a **reusable hook template** that preserves the original structure while generalising key elements.

---

## **PROCESS (INTERNAL — DO NOT EXPLAIN)**

1. **Identify the hook**

   * Select the opening sentence(s) designed to stop scrolling.
   * Prioritise hooks that include:

     * Confidence or authority (“printing again”, “this never fails”)
     * Pattern interrupts (“surprise, surprise”, “everyone misses this”)
     * Time compression (“under 60 seconds”)
     * Results (“paid again”, “clean win”, “perfect execution”)

2. **Abstract the hook into a template**

   * Preserve the **sentence structure and flow**.
   * Replace only **specific trading details** with placeholders.
   * Do **not** paraphrase or improve wording.
   * Do **not** invent new sentences.

---

## **Placeholder Rules (IMPORTANT)**

* Placeholders **must be inferred from the transcript**, not hard-coded.
* Placeholders should be **relevant to day trading**.
* Use descriptive, capitalised placeholders wrapped in brackets.

### **Allowed Placeholder Examples**

(Use only what fits the transcript)

* '[MODEL / STRATEGY / SETUP / INDICATOR]'
* '[MARKET / ASSET / PAIR]'
* '[RESULT / OUTCOME / WIN]'
* '[TIME]'
* '[TIMEFRAME]'
* '[CONDITION / EVENT]'

 Do not use generic placeholders like '[THING]' or '[STUFF]'
 Do not replace verbs unless necessary

---

## **Output Format (STRICT)**

Always return **only** a JSON object in the following format.
No explanations. No extra text. No code blocks.

{
  "hook": "[exact hook extracted from the transcript]",
  "template hook": "[strict structural template with inferred placeholders]"
}

---

## **Day-Trading Bias Rules**

* Assume the audience is:

  * Retail traders
  * ICT / SMC learners
  * Futures / Forex / indices traders
* Templates should naturally fit content about:

  * Liquidity sweeps
  * Models & setups
  * Entries, stops, targets
  * Market execution and results

---

## **Failure Handling**

* If the transcript lacks a clear hook, infer the **most likely trading hook**.
* Still preserve realistic trading language and structure.
*`;

    const userPrompt = `Here is the transcript \n ''' \n${transcript}\n'''`;

    try {
      const payload = {
        model: "gpt-4o", // or "gpt-4-vision-preview"
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }],
          },
          {
            role: "user",
            content: [
              { type: "input_text", text: userPrompt },
              //   {
              //     type: "input_image",
              //     image_url: imageUrl,
              //     detail: "high", // Use "high" for detailed analysis
              //     // : {
              //     //   url: imageUrl,
              //     // }
              //   },
            ],
          },
        ],
        // max_tokens: 800,
        temperature: 0.3, // Lower for more consistent results
      };

      console.log("Sending transcript to OpenAI for template hook...");

      const response = await axios.post(this.baseUrl, payload, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60000, // 60 seconds
      });

      const result = response.data.output?.[0]?.content[0]?.text || "";
      console.log(
        "raw response from openAI: ",
        response.data.output[0].content,
      );
      if (!result) {
        throw new Error("No description received from OpenAI");
      }
      const { hook } = JSON.parse(result);
      const template = JSON.parse(result)["template hook"];
      console.log("Transcript hook and template Generated:", result);

      return {
        success: true,
        hook,
        template,
        usage: response.data.usage,
      };
    } catch (error) {
      console.error(
        "OpenAI transcript Analysis Error:",
        error.response?.data || error.message,
      );
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}

module.exports = OpenAITranscriptAnalyzer;
