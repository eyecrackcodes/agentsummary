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
    const { message, dataSummary, hasData } = req.body;

    console.log("=== API CHAT DEBUG ===");
    console.log("Raw request body keys:", Object.keys(req.body));
    console.log("Message:", message);
    console.log("Has data flag:", hasData);
    console.log("Data summary exists:", !!dataSummary);

    if (dataSummary) {
      console.log("Data summary keys:", Object.keys(dataSummary));
      console.log("Data summary structure:", {
        totalRecords: dataSummary.totalRecords,
        uniqueAgents: dataSummary.uniqueAgents,
        fieldNamesCount: dataSummary.fieldNames
          ? dataSummary.fieldNames.length
          : 0,
        sampleRecordsCount: dataSummary.sampleRecords
          ? dataSummary.sampleRecords.length
          : 0,
        summaryKeys: dataSummary.summary
          ? Object.keys(dataSummary.summary)
          : null,
      });

      if (dataSummary.sampleRecords && dataSummary.sampleRecords.length > 0) {
        console.log("First sample record:", dataSummary.sampleRecords[0]);
      }
    } else {
      console.log("No data summary provided");
    }

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    console.log("API Key status:", ANTHROPIC_API_KEY ? "Found" : "Not found");

    if (!ANTHROPIC_API_KEY) {
      console.log("No Anthropic API key found, using fallback response");
      return res.status(200).json({
        response: generateFallbackResponse(message),
      });
    }

    // Build context-aware prompt
    const contextPrompt = buildContextPrompt(message, dataSummary, hasData);
    console.log("Built context prompt length:", contextPrompt.length);
    console.log("First 500 chars of prompt:", contextPrompt.substring(0, 500));
    console.log(
      "Prompt includes data context:",
      contextPrompt.includes("Current dataset context")
    );
    console.log(
      "Prompt includes sample data:",
      contextPrompt.includes("Sample data structure")
    );

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
    console.log("Anthropic API response structure:", {
      hasContent: !!data.content,
      contentLength: data.content ? data.content.length : 0,
      firstContentType:
        data.content && data.content[0] ? data.content[0].type : null,
    });
    console.log(
      "Received response from Anthropic API:",
      data.content[0].text.substring(0, 200) + "..."
    );
    console.log("Full response length:", data.content[0].text.length);
    console.log("=== END API CHAT DEBUG ===");

    return res.status(200).json({
      response: data.content[0].text,
    });
  } catch (error) {
    console.error("=== API ERROR ===");
    console.error("Error in chat API:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    console.error(
      "Using fallback response for message:",
      req.body.message || ""
    );
    console.error("=== END API ERROR ===");
    return res.status(200).json({
      response: generateFallbackResponse(req.body.message || ""),
    });
  }
}

function buildContextPrompt(message, dataSummary, hasData) {
  console.log("=== BUILDING CONTEXT PROMPT ===");
  console.log("buildContextPrompt called with:", {
    messageLength: message ? message.length : 0,
    hasDataFlag: hasData,
    dataSummaryProvided: !!dataSummary,
  });

  let prompt = `You are Dr. John Snow, the pioneering epidemiologist who mapped cholera outbreaks in 1854 London. You're now a modern data analyst combining your historical epidemiological expertise with contemporary business intelligence.

Communication style:
- Concise and practical (2-3 sentences max for simple questions)
- Reference your cholera mapping work only when directly relevant
- Focus on actionable insights and patterns
- Use modern data analysis terminology
- Be conversational but authoritative
- Avoid overly formal Victorian language

`;

  console.log("Base prompt length:", prompt.length);

  if (hasData && dataSummary) {
    console.log("Adding data context to prompt...");
    try {
      // Safely stringify sample data
      let sampleDataStr = "No sample data available";
      if (dataSummary.sampleRecords && dataSummary.sampleRecords.length > 0) {
        const sample = dataSummary.sampleRecords[0];
        // Limit sample to key fields to avoid large JSON
        const limitedSample = {
          agent: sample.agent,
          week: sample.week,
          submitted: sample.submitted,
          giPercent: sample.giPercent,
          ccPercent: sample.ccPercent,
          firstQuotes: sample.firstQuotes,
        };
        sampleDataStr = JSON.stringify(limitedSample, null, 2);
      }

      prompt += `Current dataset context:
- Total Records: ${dataSummary.totalRecords}
- Unique Agents: ${dataSummary.uniqueAgents}
- Available Fields: ${dataSummary.fieldNames.join(", ")}
- Average GI Percent: ${dataSummary.summary.avgGiPercent}%
- Average Credit Card Percent: ${dataSummary.summary.avgCcPercent}%
- Total Submissions: ${dataSummary.summary.totalSubmissions}
- Total First Quotes: ${dataSummary.summary.totalFirstQuotes}

Sample data structure:
${sampleDataStr}

`;
      console.log(
        "Data context added successfully. New prompt length:",
        prompt.length
      );
    } catch (error) {
      console.error("Error building data context:", error);
      prompt += `Dataset available with ${
        dataSummary.totalRecords || "unknown"
      } records.\n\n`;
      console.log("Used fallback data context. Prompt length:", prompt.length);
    }
  } else {
    console.log(
      "No data context added. hasData:",
      hasData,
      "dataSummary:",
      !!dataSummary
    );
  }

  prompt += `User question: ${message}

Respond as a modern Dr. John Snow would - brief, practical, and focused on data insights. For simple greetings, just acknowledge and ask what they'd like to analyze.`;

  console.log("Final prompt length:", prompt.length);
  console.log("=== END BUILDING CONTEXT PROMPT ===");
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
