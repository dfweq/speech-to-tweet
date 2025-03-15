import { pgTable, text, serial, json, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  twitterToken: text("twitter_token"),
  twitterSecret: text("twitter_secret"),
});

export const recordings = pgTable("recordings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  audioPath: text("audio_path").notNull(),
  transcript: text("transcript"),
  status: text("status").notNull().default("pending"),
  tweetContent: jsonb("tweet_content"),
  postedTweetId: text("posted_tweet_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertRecordingSchema = createInsertSchema(recordings).pick({
  userId: true,
  audioPath: true,
});

export const transcribeAudioSchema = z.object({
  audioData: z.string(),
  format: z.enum(["wav", "mp3", "ogg", "webm"]),
});

export const generateTweetSchema = z.object({
  text: z.string(),
});

export const postTweetSchema = z.object({
  text: z.string().max(280),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;
export type TranscribeAudioRequest = z.infer<typeof transcribeAudioSchema>;
export type GenerateTweetRequest = z.infer<typeof generateTweetSchema>;
export type PostTweetRequest = z.infer<typeof postTweetSchema>;
