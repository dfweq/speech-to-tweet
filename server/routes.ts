import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { transcribeAudioSchema, generateTweetSchema, postTweetSchema } from "../shared/schema";
import { transcribeAudio, generateTweetOptions } from "./openai";
import { postTweet } from "./twitter";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  app.post("/api/transcribe", async (req, res) => {
    try {
      const validatedData = transcribeAudioSchema.parse(req.body);
      const { audioData, format } = validatedData;
      
      // Convert base64 to buffer
      const buffer = Buffer.from(audioData, 'base64');
      
      // Call OpenAI Whisper API
      const result = await transcribeAudio(buffer, format);
      
      res.json({ transcript: result.text });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Transcription error:", error);
        res.status(500).json({ message: "Failed to transcribe audio" });
      }
    }
  });
  
  app.post("/api/generate-tweet", async (req, res) => {
    try {
      const { text, alternativesOnly } = req.body;
      const validatedData = generateTweetSchema.parse({ text });
      
      // Generate tweet options using OpenAI
      const tweets = await generateTweetOptions(validatedData.text, alternativesOnly);
      
      res.json({ tweets });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Tweet generation error:", error);
        res.status(500).json({ message: "Failed to generate tweet options" });
      }
    }
  });
  
  app.post("/api/post-tweet", async (req, res) => {
    try {
      const validatedData = postTweetSchema.parse(req.body);
      
      // Post to Twitter
      const result = await postTweet(validatedData.text);
      
      res.json({ id: result.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Tweet posting error:", error);
        res.status(500).json({ message: "Failed to post tweet" });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
