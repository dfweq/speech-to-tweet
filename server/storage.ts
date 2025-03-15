import { users, type User, type InsertUser, type Recording, type InsertRecording } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Recording related methods
  saveRecording(recording: InsertRecording): Promise<Recording>;
  getRecording(id: number): Promise<Recording | undefined>;
  updateRecordingTranscript(id: number, transcript: string): Promise<Recording | undefined>;
  updateRecordingTweetContent(id: number, tweetContent: any): Promise<Recording | undefined>;
  updateRecordingStatus(id: number, status: string): Promise<Recording | undefined>;
  updatePostedTweetId(id: number, tweetId: string): Promise<Recording | undefined>;
  getUserRecordings(userId: number): Promise<Recording[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private recordings: Map<number, Recording>;
  private userIdCounter: number;
  private recordingIdCounter: number;

  constructor() {
    this.users = new Map();
    this.recordings = new Map();
    this.userIdCounter = 1;
    this.recordingIdCounter = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async saveRecording(insertRecording: InsertRecording): Promise<Recording> {
    const id = this.recordingIdCounter++;
    const now = new Date();
    
    const recording: Recording = {
      ...insertRecording,
      id,
      status: "pending",
      transcript: null,
      tweetContent: null,
      postedTweetId: null,
      createdAt: now,
    };
    
    this.recordings.set(id, recording);
    return recording;
  }
  
  async getRecording(id: number): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }
  
  async updateRecordingTranscript(id: number, transcript: string): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updated = { ...recording, transcript, status: "transcribed" };
    this.recordings.set(id, updated);
    return updated;
  }
  
  async updateRecordingTweetContent(id: number, tweetContent: any): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updated = { ...recording, tweetContent, status: "processed" };
    this.recordings.set(id, updated);
    return updated;
  }
  
  async updateRecordingStatus(id: number, status: string): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updated = { ...recording, status };
    this.recordings.set(id, updated);
    return updated;
  }
  
  async updatePostedTweetId(id: number, tweetId: string): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;
    
    const updated = { ...recording, postedTweetId: tweetId, status: "posted" };
    this.recordings.set(id, updated);
    return updated;
  }
  
  async getUserRecordings(userId: number): Promise<Recording[]> {
    return Array.from(this.recordings.values())
      .filter(recording => recording.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const storage = new MemStorage();
