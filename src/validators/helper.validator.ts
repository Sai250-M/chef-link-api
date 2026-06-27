import { z } from "zod";

export const updateHelperProfileSchema = z.object({
  body: z.object({
    bio: z.string().max(1000).optional(),
    years_experience: z.number().int().min(0).max(60).optional(),
    hourly_rate: z.number().min(0).optional(),
    currency: z.string().max(10).optional(),
    is_available: z.boolean().optional(),
    location: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
  }),
});

export const addSkillsSchema = z.object({
  body: z.object({
    skills: z.array(
      z.object({
        skill_id: z.string().uuid(),
        proficiency_level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]).optional(),
      })
    ).min(1),
  }),
});

export const helperSearchSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    skill_id: z.string().uuid().optional(),
    city: z.string().optional(),
    is_available: z.enum(["true", "false"]).optional(),
    min_rate: z.coerce.number().min(0).optional(),
    max_rate: z.coerce.number().min(0).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
  }),
});

export type UpdateHelperProfileInput = z.infer<typeof updateHelperProfileSchema>["body"];
