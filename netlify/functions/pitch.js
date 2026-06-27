// ============================================================
// AI SHARK TANK SIMULATOR — Netlify Serverless Function
// Gemini 1.5 Flash API Bridge
// ============================================================
// 🔑 YOUR API KEY GOES IN NETLIFY:
//    Dashboard → Your Site → Site Configuration → Environment Variables
//    Variable name: GEMINI_API_KEY
//    Value: (paste your key from aistudio.google.com)
// ============================================================

exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  // ============================================================
  // 🔑 API KEY — pulled from Netlify environment variables
  // ============================================================
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "GEMINI_API_KEY is not set. Go to Netlify → Site Configuration → Environment Variables and add it.",
      }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { action, pitch, answers, scores } = body;
  let prompt = "";

  // ============================================================
  // ACTION 1: Generate judge questions based on the pitch
  // ============================================================
  if (action === "generate_questions") {
    prompt = `You are the AI engine powering a Shark Tank investment simulation. A founder just walked into the tank with their startup pitch. Your job is to generate sharp, specific, challenging questions from 4 distinct investor judges.

STARTUP PITCH:
- Startup Name: ${pitch.name}
- Problem Being Solved: ${pitch.problem}
- Their Solution: ${pitch.solution}
- Revenue Model: ${pitch.revenue}
- Target Audience: ${pitch.audience}
- Funding Ask: ${pitch.ask}

Generate exactly 2 questions per judge. Questions must be SPECIFIC to this exact pitch — not generic. Reference details from the pitch. Make them challenging and realistic, the kind real investors ask.

JUDGE PERSONALITIES:
1. Victoria Chen (Venture Capitalist) — Obsessed with market size, scalability, competitive moats, growth trajectory, TAM/SAM/SOM. Thinks in billions. Cold and analytical.
2. Marcus Reid (Serial Founder) — Has built 3 companies. Cares ONLY about execution: traction, team, product-market fit, unfair advantage, what's actually been built. Zero patience for theory.
3. Amara Osei (Customer Advocate) — Represents real users. Asks whether this actually solves a real pain, why users would switch, how simple it is, what the adoption barrier is. Warm but sharp.
4. David Park (Angel Investor) — Invests personal money. Cares about unit economics, profit margins, break-even timeline, ROI, burn rate, path to profitability. Patient but numbers-driven.

Return ONLY valid JSON. No markdown. No explanation. No text before or after. Just the JSON object:
{
  "judges": [
    {
      "id": "vc",
      "name": "Victoria Chen",
      "title": "Venture Capitalist",
      "emoji": "📈",
      "color": "#3B82F6",
      "tagline": "I invest in unicorns, not ponies.",
      "questions": ["specific question 1 referencing their pitch", "specific question 2 referencing their pitch"]
    },
    {
      "id": "founder",
      "name": "Marcus Reid",
      "title": "Serial Founder",
      "emoji": "🚀",
      "color": "#F97316",
      "tagline": "Ideas are worthless. Execution is everything.",
      "questions": ["specific question 1", "specific question 2"]
    },
    {
      "id": "customer",
      "name": "Amara Osei",
      "title": "Customer Advocate",
      "emoji": "👥",
      "color": "#22C55E",
      "tagline": "If real people won't use it, I won't fund it.",
      "questions": ["specific question 1", "specific question 2"]
    },
    {
      "id": "angel",
      "name": "David Park",
      "title": "Angel Investor",
      "emoji": "😇",
      "color": "#A855F7",
      "tagline": "Show me the numbers or show yourself out.",
      "questions": ["specific question 1", "specific question 2"]
    }
  ]
}`;

  // ============================================================
  // ACTION 2: Evaluate answers and produce scores + reactions
  // ============================================================
  } else if (action === "evaluate_answers") {
    const qaText = answers
      .map((a) => `${a.judgeName} (${a.judgeTitle}) asked: "${a.question}"\nFounder answered: "${a.answer || "(No answer given)"}"`)
      .join("\n\n");

    prompt = `You are evaluating a startup pitch in a Shark Tank simulation. Score the founder based on their pitch AND how well they answered the judges' questions.

ORIGINAL PITCH:
- Startup: ${pitch.name}
- Problem: ${pitch.problem}
- Solution: ${pitch.solution}
- Revenue Model: ${pitch.revenue}
- Target Audience: ${pitch.audience}
- Funding Ask: ${pitch.ask}

FULL Q&A SESSION:
${qaText}

SCORING CRITERIA:
- marketPotential (0-20): How large and accessible is the market? Is there real demand?
- innovation (0-20): How original is this? Does it meaningfully improve on existing solutions?
- businessModel (0-20): Does the revenue logic make sense? Is it sustainable and scalable?
- execution (0-20): Does the team/founder show they can actually build and ship this?
- investmentWorthiness (0-20): Would a rational investor put money here based on everything shown?

Be honest and critical. Don't inflate scores. If answers were vague or weak, reflect that in scores.

Return ONLY valid JSON, no markdown, no extra text:
{
  "scores": {
    "marketPotential": <integer 0-20>,
    "innovation": <integer 0-20>,
    "businessModel": <integer 0-20>,
    "execution": <integer 0-20>,
    "investmentWorthiness": <integer 0-20>
  },
  "judgeReactions": [
    {
      "id": "vc",
      "reaction": "One sharp, in-character reaction sentence from Victoria about the overall pitch and answers",
      "sentiment": "positive"
    },
    {
      "id": "founder",
      "reaction": "One sharp, in-character reaction from Marcus",
      "sentiment": "neutral"
    },
    {
      "id": "customer",
      "reaction": "One sharp, in-character reaction from Amara",
      "sentiment": "negative"
    },
    {
      "id": "angel",
      "reaction": "One sharp, in-character reaction from David",
      "sentiment": "positive"
    }
  ]
}

For sentiment: use "positive", "neutral", or "negative" based on how impressed the judge is.`;

  // ============================================================
  // ACTION 3: Generate final investment decisions
  // ============================================================
  } else if (action === "final_decision") {
    const total = Object.values(scores).reduce((a, b) => a + b, 0);

    prompt = `You are delivering final investment verdicts in a Shark Tank simulation.

STARTUP: ${pitch.name}
PITCH: Problem: "${pitch.problem}" | Solution: "${pitch.solution}" | Revenue: "${pitch.revenue}" | Ask: "${pitch.ask}"

SCORES:
- Market Potential: ${scores.marketPotential}/20
- Innovation: ${scores.innovation}/20
- Business Model: ${scores.businessModel}/20
- Execution: ${scores.execution}/20
- Investment Worthiness: ${scores.investmentWorthiness}/20
- TOTAL: ${total}/100

DECISION RULES:
- 85-100 total: At least 3 judges invest. Strong deals.
- 70-84 total: 2 judges invest, 1-2 mixed (come_back_later or one reject).
- 55-69 total: 1 judge invests, rest are come_back_later or reject.
- 40-54 total: No investments. All come_back_later or reject.
- Below 40: All reject.

DECISIONS: Each judge picks ONE: "invest", "reject", "acquire", or "come_back_later"
- "acquire": Only if businessModel score >= 15 AND the startup seems more valuable bought whole
- "come_back_later": Judge sees potential but pitch/traction isn't ready
- "invest": Judge is in with a counter-offer (can be different from what founder asked)
- "reject": Judge sees fatal flaws they can't get past

For invest/acquire: suggest realistic equity and valuation based on the ask of "${pitch.ask}" and the score.

Each judge must stay in character. Victoria thinks big. Marcus is blunt. Amara speaks for users. David focuses on numbers.

Return ONLY valid JSON, no markdown, no extra text:
{
  "decisions": [
    {
      "id": "vc",
      "name": "Victoria Chen",
      "decision": "invest",
      "equityOffered": 15,
      "amountOffered": 200000,
      "valuation": 1333333,
      "reasoning": "Two sentences in Victoria's voice explaining why she made this decision, referencing specifics from the pitch."
    },
    {
      "id": "founder",
      "name": "Marcus Reid",
      "decision": "reject",
      "equityOffered": null,
      "amountOffered": null,
      "valuation": null,
      "reasoning": "Two sentences in Marcus's blunt voice explaining why he's out."
    },
    {
      "id": "customer",
      "name": "Amara Osei",
      "decision": "come_back_later",
      "equityOffered": null,
      "amountOffered": null,
      "valuation": null,
      "reasoning": "Two sentences in Amara's warm but sharp voice."
    },
    {
      "id": "angel",
      "name": "David Park",
      "decision": "invest",
      "equityOffered": 20,
      "amountOffered": 200000,
      "valuation": 1000000,
      "reasoning": "Two sentences in David's numbers-focused voice."
    }
  ],
  "summary": "One powerful, dramatic sentence summarizing what just happened in the tank.",
  "overallVerdict": "funded"
}

overallVerdict: "funded" if 2+ judges invest, "acquired" if anyone acquires, "mixed" if 1 invests, "rejected" if none invest.`;
  } else {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: `Unknown action: ${action}` }),
    };
  }

  // ============================================================
  // CALL GEMINI API — with automatic retry on 429 rate limit
  // ============================================================
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 2048,
      topP: 0.9,
    },
  });

  // Helper: sleep for ms milliseconds
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Retry up to 3 times with exponential backoff: 3s, 6s, 12s
  const MAX_RETRIES = 3;
  const BASE_DELAY_MS = 3000;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const geminiRes = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      // Rate limited — wait and retry
      if (geminiRes.status === 429) {
        const waitMs = BASE_DELAY_MS * attempt; // 3s, 6s, 9s
        console.log(`Rate limited (429). Attempt ${attempt}/${MAX_RETRIES}. Waiting ${waitMs}ms...`);
        if (attempt < MAX_RETRIES) {
          await sleep(waitMs);
          continue;
        } else {
          return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
              error: "The AI is receiving too many requests right now. Please wait 15 seconds and try again.",
            }),
          };
        }
      }

      // Other HTTP errors
      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({
            error: `Gemini API error: ${geminiRes.status}`,
            details: errText,
          }),
        };
      }

      // Success — parse the response
      const geminiData = await geminiRes.json();
      const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: "Empty response from Gemini", raw: geminiData }),
        };
      }

      // Strip any markdown code fences Gemini might add
      const cleanText = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      let parsed;
      try {
        parsed = JSON.parse(cleanText);
      } catch (parseErr) {
        return {
          statusCode: 502,
          headers,
          body: JSON.stringify({ error: "Failed to parse Gemini JSON response", raw: cleanText }),
        };
      }

      return { statusCode: 200, headers, body: JSON.stringify(parsed) };

    } catch (err) {
      lastError = err;
      console.log(`Attempt ${attempt} threw an error: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await sleep(BASE_DELAY_MS * attempt);
      }
    }
  }

  // All retries exhausted
  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({
      error: "Internal server error after multiple retries",
      message: lastError ? lastError.message : "Unknown error",
    }),
  };
};
