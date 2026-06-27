import { z } from "zod";

export const createJobSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(255),
    description: z.string().min(20).max(5000),
    role_type: z.enum(["CHEF", "HELPER", "BOTH"]),
    salary_min: z.number().min(0).optional(),
    salary_max: z.number().min(0).optional(),
    salary_type: z.enum(["HOURLY", "DAILY", "MONTHLY", "FIXED"]).optional(),
    currency: z.string().max(10).optional(),
    location: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    is_remote: z.boolean().optional(),
    experience_required: z.number().int().min(0).optional(),
    openings: z.number().int().min(1).optional(),
    status: z.enum(["DRAFT", "OPEN"]).optional(),
    deadline: z.string().date("Invalid date").optional(),
    cuisine_ids: z.array(z.string().uuid()).optional(),
    skill_ids: z.array(z.string().uuid()).optional(),
  }).refine((data) => {
    if (data.salary_min != null && data.salary_max != null) {
      return data.salary_max >= data.salary_min;
    }
    return true;
  }, { message: "salary_max must be >= salary_min", path: ["salary_max"] }),
});

export const updateJobSchema = z.object({
  body: z.object({
    title: z.string().min(5).max(255).optional(),
    description: z.string().min(20).max(5000).optional(),
    role_type: z.enum(["CHEF", "HELPER", "BOTH"]).optional(),
    salary_min: z.number().min(0).optional(),
    salary_max: z.number().min(0).optional(),
    salary_type: z.enum(["HOURLY", "DAILY", "MONTHLY", "FIXED"]).optional(),
    location: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    is_remote: z.boolean().optional(),
    experience_required: z.number().int().min(0).optional(),
    openings: z.number().int().min(1).optional(),
    status: z.enum(["DRAFT", "OPEN", "CLOSED", "FILLED", "CANCELLED"]).optional(),
    deadline: z.string().date().optional(),
    cuisine_ids: z.array(z.string().uuid()).optional(),
    skill_ids: z.array(z.string().uuid()).optional(),
  }),
});

export const applyJobSchema = z.object({
  body: z.object({
    cover_letter: z.string().max(2000).optional(),
  }),
});

export const updateApplicationStatusSchema = z.object({
  body: z.object({
    status: z.enum(["SHORTLISTED", "REJECTED", "HIRED"]),
  }),
});

export const jobSearchSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role_type: z.enum(["CHEF", "HELPER", "BOTH"]).optional(),
    city: z.string().optional(),
    is_remote: z.enum(["true", "false"]).optional(),
    status: z.enum(["OPEN", "CLOSED", "FILLED"]).optional(),
    cuisine_id: z.string().uuid().optional(),
    skill_id: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    sortBy: z.enum(["created_at", "salary_min", "deadline"]).optional(),
    sortDir: z.enum(["ASC", "DESC"]).optional(),
  }),
});

export type CreateJobInput = z.infer<typeof createJobSchema>["body"];
export type UpdateJobInput = z.infer<typeof updateJobSchema>["body"];
