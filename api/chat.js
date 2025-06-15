export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,OPTIONS,PATCH,DELETE,POST,PUT"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
      console.log("No Anthropic API key found, using fallback response");
      return res.status(200).json({
        response: generateFallbackResponse(message),
      });
    }

    // Build context-aware prompt
    const contextPrompt = buildContextPrompt(message, context);

    console.log("Making request to Anthropic API");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: contextPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(
        "Anthropic API error:",
        response.status,
        response.statusText
      );
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received response from Anthropic API");

    return res.status(200).json({
      response: data.content[0].text,
    });
  } catch (error) {
    console.error("Error in chat API:", error);
    return res.status(200).json({
      response: generateFallbackResponse(req.body.message || ""),
    });
  }
}

function buildContextPrompt(message, context) {
  let prompt = `You are Dr. John Snow, the pioneering epidemiologist who mapped cholera outbreaks in 1854 London. You're now a modern data analyst combining your historical epidemiological expertise with contemporary business intelligence.

Communication style:
- Concise and practical (2-3 sentences max for simple questions)
- Reference your cholera mapping work only when directly relevant
- Focus on actionable insights and patterns
- Use modern data analysis terminology
- Be conversational but authoritative
- Avoid overly formal Victorian language

`;

  if (context && context.hasData && context.dataInfo) {
    prompt += `Current dataset context:
- Filename: ${context.dataInfo.filename}
- Rows: ${context.dataInfo.rowCount}
- Columns: ${context.dataInfo.columns.join(", ")}

`;
  }

  if (context && context.previousAnalysis) {
    prompt += `Previous analysis summary:
${context.previousAnalysis.summary}

Key insights found:
${context.previousAnalysis.insights.join("\n")}

`;
  }

  prompt += `User question: ${message}

Respond as a modern Dr. John Snow would - brief, practical, and focused on data insights. For simple greetings, just acknowledge and ask what they'd like to analyze.`;

  return prompt;
}

function generateFallbackResponse(prompt) {
  // Generate contextual responses based on prompt content
  const lowerPrompt = prompt.toLowerCase();

  if (
    lowerPrompt.includes("hello") ||
    lowerPrompt.includes("hi") ||
    lowerPrompt.includes("greet")
  ) {
    return "Hello! I'm Dr. John Snow, ready to help you analyze your data. What patterns or insights are you looking for?";
  } else if (lowerPrompt.includes("correlation")) {
    return "I'll help you find correlations in your data. Strong correlations can reveal important relationships, but remember - correlation doesn't always mean causation. What variables would you like me to examine?";
  } else if (lowerPrompt.includes("pattern")) {
    return "Pattern detection is my specialty. I can help you identify clusters, trends, and distributions in your data. What type of patterns are you most interested in?";
  } else if (
    lowerPrompt.includes("anomal") ||
    lowerPrompt.includes("outlier")
  ) {
    return "Anomalies often reveal the most interesting insights. I can help you identify outliers and determine if they're data errors or meaningful exceptions. Let's investigate what stands out.";
  } else if (lowerPrompt.includes("quality")) {
    return "Data quality is crucial for reliable analysis. I can assess completeness, consistency, and accuracy in your dataset. What quality concerns do you have?";
  } else if (
    lowerPrompt.includes("summary") ||
    lowerPrompt.includes("overview")
  ) {
    return "I can provide a comprehensive data summary including key statistics, distributions, and initial insights. Would you like me to start with an overview?";
  } else {
    return "I'm here to help analyze your data using proven epidemiological methods. What specific questions do you have about your dataset?";
  }
}
