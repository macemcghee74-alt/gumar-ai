import { z } from "zod";

export const memoryTypeSchema = z.enum(["semantic", "episodic", "preference", "relationship", "project"]);

export const createMemorySchema = z.object({
  content: z.string().trim().min(1).max(4_000),
  memoryType: memoryTypeSchema,
  importance: z.number().min(0).max(1).default(0.5),
  confidence: z.number().min(0).max(1).default(0.5)
});

export type CreateMemory = z.infer<typeof createMemorySchema>;
