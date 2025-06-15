import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  TextField,
  Paper,
  Typography,
  Avatar,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Send as SendIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Assessment as AssessmentIcon,
} from "@mui/icons-material";
import { AgentSummary } from "../../../shared/agentSummary";
import ChatMessageComponent from "./ChatMessageComponent";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  isStreaming?: boolean;
}

interface JohnSnowChatbotProps {
  data: AgentSummary[];
}

const JohnSnowChatbot: React.FC<JohnSnowChatbotProps> = ({ data }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your epidemiological data analyst. I can help you explore patterns, correlations, and insights in your agent performance data.",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickActions = [
    {
      label: "Show correlations",
      icon: <TrendingUpIcon />,
      query: "What are the key correlations in this data?",
    },
    {
      label: "Find patterns",
      icon: <PsychologyIcon />,
      query: "What patterns do you see in the performance data?",
    },
    {
      label: "Identify anomalies",
      icon: <WarningIcon />,
      query: "Are there any anomalies or outliers in this data?",
    },
    {
      label: "Data quality",
      icon: <AssessmentIcon />,
      query: "How is the quality of this dataset?",
    },
  ];

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    console.log("Sending message:", content);
    console.log("Available data points:", data.length);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          data: data,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("API response:", result);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          result.response ||
          "I apologize, but I encountered an issue processing your request.",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error calling chat API:", error);

      // Fallback response
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "I'm currently having trouble connecting to my analysis engine. However, I can see you have " +
          data.length +
          " data points loaded. Try asking about specific metrics like conversion rates, call durations, or agent performance patterns.",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleQuickAction = (query: string) => {
    sendMessage(query);
  };

  return (
    <Box
      sx={{ height: "100%", display: "flex", flexDirection: "column", p: 2 }}
    >
      {data.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Upload data first to enable AI analysis capabilities.
        </Alert>
      )}

      {/* Quick Actions */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
          Quick Actions:
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {quickActions.map((action, index) => (
            <Chip
              key={index}
              icon={action.icon}
              label={action.label}
              onClick={() => handleQuickAction(action.query)}
              disabled={data.length === 0 || isLoading}
              sx={{ fontSize: "0.75rem" }}
            />
          ))}
        </Box>
      </Box>

      {/* Messages */}
      <Paper
        sx={{
          flex: 1,
          p: 2,
          mb: 2,
          overflow: "auto",
          maxHeight: "400px",
          bgcolor: "#fafafa",
        }}
      >
        {messages.map((message) => (
          <ChatMessageComponent key={message.id} message={message} />
        ))}
        {isLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main" }}>
              <PsychologyIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Analyzing data...
            </Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Paper>

      {/* Input */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", gap: 1 }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Ask about patterns, correlations, or insights..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
          size="small"
        />
        <IconButton
          type="submit"
          disabled={!inputValue.trim() || isLoading}
          color="primary"
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

export default JohnSnowChatbot;
