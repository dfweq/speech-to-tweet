import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { transcribeAudioSchema, generateTweetSchema, postTweetSchema } from "../shared/schema";
import { transcribeAudio, generateTweetOptions, processTranscription, createTweetThread, processTranscriptionAndCreateTweet } from "./openai";
import { postTweet, postTweetThread, validateTwitterCredentials, verifyTwitterCredentials } from "./twitter";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (increased from 10MB)
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // API route to check if Twitter API credentials exist (without making API call)
  app.get("/api/check-twitter-credentials", (req, res) => {
    try {
      const credentialStatus = validateTwitterCredentials();
      
      if (credentialStatus.isValid) {
        res.json({ 
          status: "ok", 
          message: credentialStatus.message 
        });
      } else {
        res.status(400).json({ 
          status: "error", 
          message: credentialStatus.message,
          missingCredentials: credentialStatus.missingCredentials 
        });
      }
    } catch (error: any) {
      console.error("Error checking Twitter credentials:", error);
      res.status(500).json({ 
        status: "error", 
        message: error.message || "Unknown error checking Twitter credentials" 
      });
    }
  });
  
  // API route to verify Twitter credentials by making a real API call
  app.get("/api/verify-twitter-credentials", async (req, res) => {
    try {
      console.log("[Twitter] Verifying Twitter credentials with API call");
      
      // This makes an actual API call to verify the credentials
      const verificationResult = await verifyTwitterCredentials();
      
      if (verificationResult.isValid) {
        const userData = verificationResult.userData || {};
        console.log(`[Twitter] Credentials verified successfully for user: ${userData.username || 'unknown'}`);
        
        res.json({
          status: "ok",
          message: verificationResult.message,
          userData: userData
        });
      } else {
        console.error(`[Twitter] Credential verification failed: ${verificationResult.message}`);
        
        res.status(401).json({
          status: "error",
          message: verificationResult.message
        });
      }
    } catch (error: any) {
      console.error("Error verifying Twitter credentials:", error);
      
      res.status(500).json({
        status: "error",
        message: error.message || "Unknown error verifying Twitter credentials"
      });
    }
  });
  
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
        // Use our thread-specific function that properly creates threaded replies
        const result = await postTweetThread(tweets);
        res.json(result);
      } else {
        // Single tweet case
        const validatedData = postTweetSchema.parse({ text });
        const result = await postTweet(validatedData.text);
        res.json({ id: result.id });
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          status: "error",
          message: "Invalid request data", 
          errors: error.errors 
        });
      } else {
        console.error("Tweet posting error:", error);
        
        // Check if this is a Twitter API error
        const isTwitterApiError = error.message && (
          error.message.includes("Twitter") || 
          error.message.includes("Failed to post tweet") ||
          error.message.includes("Authentication failed") ||
          error.message.includes("credentials")
        );
        
        // Get the HTTP status code if it's in the error message
        let statusCode = 500;
        
        if (isTwitterApiError) {
          if (error.message.includes("401")) {
            statusCode = 401; // Unauthorized
          } else if (error.message.includes("403")) {
            statusCode = 403; // Forbidden
          } else if (error.message.includes("429")) {
            statusCode = 429; // Too many requests
          }
        }
        
        // Send a detailed error response
        res.status(statusCode).json({ 
          status: "error",
          message: error.message || "Failed to post tweet",
          type: isTwitterApiError ? "twitter_api_error" : "server_error",
          code: statusCode
        });
      }
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
