import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { transcribeAudioSchema, generateTweetSchema, postTweetSchema } from "../shared/schema";
import { transcribeAudio, generateTweetOptions, processTranscription, createTweetThread, processTranscriptionAndCreateTweet } from "./openai";
import { postTweet } from "./twitter";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased from 10MB)
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
  
  // New unified route for the improved workflow
  app.post("/api/process-and-create-tweet", async (req, res) => {
    try {
      const { text } = req.body;
      const validatedData = generateTweetSchema.parse({ text });
      
      // Process transcription and create tweet thread in one call
      const tweets = await processTranscriptionAndCreateTweet(validatedData.text);
      
      res.json({ tweets });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Error in /api/process-and-create-tweet:", error);
        res.status(500).json({ message: "Failed to process transcription and create tweet" });
      }
    }
  });
  
  // Keep these for backward compatibility
  app.post("/api/process-transcription", async (req, res) => {
    try {
      const { text } = req.body;
      const validatedData = generateTweetSchema.parse({ text });
      
      // Process transcription to make it coherent
      const processedText = await processTranscription(validatedData.text);
      
      res.json({ processedText });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Error in /api/process-transcription:", error);
        res.status(500).json({ message: "Failed to process transcription" });
      }
    }
  });

  app.post("/api/create-tweet-thread", async (req, res) => {
    try {
      const { text } = req.body;
      const validatedData = generateTweetSchema.parse({ text });
      
      // Create tweet thread from processed text
      const tweetThread = await createTweetThread(validatedData.text);
      
      res.json({ tweets: tweetThread });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data", errors: error.errors });
      } else {
        console.error("Error in /api/create-tweet-thread:", error);
        res.status(500).json({ message: "Failed to create tweet thread" });
      }
    }
  });
  
  // Keep the original endpoints for backward compatibility
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
  
  // Enhanced post-tweet endpoint for thread support
  app.post("/api/post-tweet", async (req, res) => {
    try {
      // Check if this is a tweet thread or a single tweet
      const { text, tweets } = req.body;
      
      // If tweets array is provided, post as a thread
      if (Array.isArray(tweets) && tweets.length > 0) {
        let previousTweetId = null;
        const tweetIds = [];
        
        for (const tweetText of tweets) {
          const postOptions: any = { text: tweetText };
          
          // Add reply-to parameter for threading if not the first tweet
          if (previousTweetId) {
            postOptions.reply_to = previousTweetId;
          }
          
          // Post the tweet
          const result = await postTweet(postOptions.text);
          previousTweetId = result.id;
          tweetIds.push(result.id);
        }
        
        res.json({ ids: tweetIds, threadId: tweetIds[0] });
      } else {
        // Single tweet case
        const validatedData = postTweetSchema.parse({ text });
        const result = await postTweet(validatedData.text);
        res.json({ id: result.id });
      }
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
