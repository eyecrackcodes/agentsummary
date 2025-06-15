# 🚀 John Snow Chatbot - Deployment Guide

## Quick Setup

### 1. Environment Variables

In Vercel dashboard, add:

- **Name**: `ANTHROPIC_API_KEY`
- **Value**: Your Anthropic API key
- **Environment**: All (Production, Preview, Development)

### 2. Deploy

```bash
vercel --prod
```

### 3. Features

- **Optimized responses**: Concise, practical, modern language
- **CORS fixed**: Backend API proxy eliminates browser restrictions
- **Fallback system**: Works even without API key
- **Context-aware**: Tailored responses based on question type

### 4. Expected Responses

- "hello" → Short, friendly greeting
- "find patterns" → Focused pattern detection offer
- "correlations" → Brief correlation analysis explanation

Ready for production! 🎉
