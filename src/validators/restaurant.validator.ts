import { z } from "zod";

export const updateRestaurantProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(255).optional(),
    description: z.string().max(2000).optional(),
    cuisine_type: z.string().max(255).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    pincode: z.string().max(10).optional(),
    website: z.string().url("Invalid URL").optional().or(z.literal("")),
    established_year: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
    seating_capacity: z.number().int().min(1).optional(),
  }),
});

export const saveProfileSchema = z.object({
  body: z.object({
    profile_id: z.string().uuid("Invalid profile ID"),
    profile_role: z.enum(["ROLE_CHEF", "ROLE_HELPER"]),
  }),
});

export type UpdateRestaurantProfileInput = z.infer<typeof updateRestaurantProfileSchema>["body"];
