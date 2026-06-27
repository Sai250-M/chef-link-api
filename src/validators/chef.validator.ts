import { z } from "zod";

export const updateChefProfileSchema = z.object({
  body: z.object({
    bio: z.string().max(1000).optional(),
    years_experience: z.number().int().min(0).max(60).optional(),
    specialization: z.string().max(255).optional(),
    hourly_rate: z.number().min(0).optional(),
    currency: z.string().max(10).optional(),
    is_available: z.boolean().optional(),
    location: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
  }),
});

export const addCuisinesSchema = z.object({
  body: z.object({
    cuisine_ids: z.array(z.string().uuid()).min(1, "At least one cuisine required"),
  }),
});

export const uploadCertificateSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(255),
    issuer: z.string().max(255).optional(),
    issued_year: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional(),
  }),
});

export const chefSearchSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    cuisine_id: z.string().uuid().optional(),
    city: z.string().optional(),
    is_available: z.enum(["true", "false"]).optional(),
    min_rate: z.coerce.number().min(0).optional(),
    max_rate: z.coerce.number().min(0).optional(),
    min_experience: z.coerce.number().int().min(0).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    sortBy: z.enum(["hourly_rate", "years_experience", "created_at"]).optional(),
    sortDir: z.enum(["ASC", "DESC"]).optional(),
  }),
});

export type UpdateChefProfileInput = z.infer<typeof updateChefProfileSchema>["body"];
