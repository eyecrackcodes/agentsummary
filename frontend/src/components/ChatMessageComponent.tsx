import React from "react";
import { Box, Typography, Avatar, Paper } from "@mui/material";
import {
  Person as PersonIcon,
  Psychology as PsychologyIcon,
} from "@mui/icons-material";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatMessageComponentProps {
  message: Message;
}

const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({
  message,
}) => {
  const isUser = message.sender === "user";

  // Simple markdown-like formatting
  const formatContent = (content: string) => {
    // Convert **bold** to bold
    content = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Convert *italic* to italic
    content = content.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Convert line breaks
    content = content.replace(/\n/g, "<br />");

    return content;
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: isUser ? "row-reverse" : "row",
        alignItems: "flex-start",
        gap: 1,
        mb: 2,
      }}
    >
      <Avatar
        sx={{
          width: 28,
          height: 28,
          bgcolor: isUser ? "secondary.main" : "primary.main",
        }}
      >
        {isUser ? (
          <PersonIcon sx={{ fontSize: 16 }} />
        ) : (
          <PsychologyIcon sx={{ fontSize: 16 }} />
        )}
      </Avatar>

      <Paper
        sx={{
          p: 1.5,
          maxWidth: "70%",
          bgcolor: isUser ? "primary.50" : "grey.50",
          border: isUser ? "1px solid #e3f2fd" : "1px solid #f5f5f5",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            wordBreak: "break-word",
            "& strong": { fontWeight: 600 },
            "& em": { fontStyle: "italic" },
          }}
          dangerouslySetInnerHTML={{
            __html: formatContent(message.content),
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5, fontSize: "0.7rem" }}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Typography>
      </Paper>
    </Box>
  );
};

export default ChatMessageComponent;
