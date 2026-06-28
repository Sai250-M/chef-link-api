import { z } from "zod";

// ── Helpers ───────────────────────────────────────────────────

const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;

const isFutureDate = (dateStr: string): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) >= today;
};

// ── Browse Chefs ──────────────────────────────────────────────

export const browseChefSchema = z.object({
  query: z.object({
    search:         z.string().max(100).optional(),
    city:           z.string().max(100).optional(),
    cuisine_id:     z.string().uuid("Invalid cuisine ID").optional(),
    is_available:   z.enum(["true", "false"]).optional(),
    min_rate:       z.coerce.number().min(0).optional(),
    max_rate:       z.coerce.number().min(0).optional(),
    min_experience: z.coerce.number().int().min(0).optional(),
    page:           z.coerce.number().int().min(1).optional(),
    limit:          z.coerce.number().int().min(1).max(50).optional(),
    sortBy:         z.enum(["hourly_rate", "years_experience", "created_at"]).optional(),
    sortDir:        z.enum(["ASC", "DESC"]).optional(),
  }),
});

// ── Browse Helpers ────────────────────────────────────────────

export const browseHelperSchema = z.object({
  query: z.object({
    search:         z.string().max(100).optional(),
    city:           z.string().max(100).optional(),
    is_available:   z.enum(["true", "false"]).optional(),
    min_rate:       z.coerce.number().min(0).optional(),
    max_rate:       z.coerce.number().min(0).optional(),
    min_experience: z.coerce.number().int().min(0).optional(),
    page:           z.coerce.number().int().min(1).optional(),
    limit:          z.coerce.number().int().min(1).max(50).optional(),
    sortBy:         z.enum(["hourly_rate", "years_experience", "created_at"]).optional(),
    sortDir:        z.enum(["ASC", "DESC"]).optional(),
  }),
});

// ── Public Profile Params ─────────────────────────────────────

export const profileParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid profile ID"),
  }),
});

// ── Create Booking Request ────────────────────────────────────

export const createGuestBookingSchema = z.object({
  body: z
    .object({
      booking_type: z.enum(["CHEF", "HELPER"]),
      chef_id:      z.string().uuid("Invalid chef ID").optional(),
      helper_id:    z.string().uuid("Invalid helper ID").optional(),

      guest_name:  z.string().min(2, "Name must be at least 2 characters").max(150),
      guest_email: z.string().email("Invalid email address"),
      guest_phone: z
        .string()
        .min(7, "Phone number too short")
        .max(20, "Phone number too long")
        .regex(/^[+\d\s\-().]+$/, "Invalid phone number format"),

      event_type: z.enum([
        "BIRTHDAY", "WEDDING", "HOUSEWARMING", "ANNIVERSARY",
        "BABY_SHOWER", "CORPORATE_EVENT", "PRIVATE_PARTY",
        "LIVE_COOKING", "FESTIVAL", "OTHER",
      ]),

      event_date: z.string().date("Invalid date format (YYYY-MM-DD required)"),

      start_time: z
        .string()
        .min(1, "start_time is required")
        .regex(timeRegex, "Invalid time format (HH:MM required)"),

      end_time: z
        .string()
        .min(1, "end_time is required")
        .regex(timeRegex, "Invalid time format (HH:MM required)"),

      guest_count: z
        .number()
        .int("guest_count must be an integer")
        .min(1, "At least 1 guest is required"),

      budget: z.number().positive("Budget must be a positive number"),

      currency:             z.string().max(10).optional(),
      location:             z.string().max(255).optional(),
      address:              z.string().max(1000).optional(),
      city:                 z.string().max(100).optional(),
      state:                z.string().max(100).optional(),
      country:              z.string().max(100).optional(),
      special_requirements: z.string().max(2000).optional(),
    })
    .superRefine((data, ctx) => {
      if (data.booking_type === "CHEF" && !data.chef_id) {
        ctx.addIssue({ code: "custom", path: ["chef_id"], message: "chef_id is required when booking_type is CHEF" });
      }
      if (data.booking_type === "HELPER" && !data.helper_id) {
        ctx.addIssue({ code: "custom", path: ["helper_id"], message: "helper_id is required when booking_type is HELPER" });
      }
      if (data.booking_type === "CHEF" && data.helper_id) {
        ctx.addIssue({ code: "custom", path: ["helper_id"], message: "helper_id must not be set when booking_type is CHEF" });
      }
      if (data.booking_type === "HELPER" && data.chef_id) {
        ctx.addIssue({ code: "custom", path: ["chef_id"], message: "chef_id must not be set when booking_type is HELPER" });
      }
      const s = data.start_time.slice(0, 5);
      const e = data.end_time.slice(0, 5);
      if (e <= s) {
        ctx.addIssue({ code: "custom", path: ["end_time"], message: "end_time must be after start_time" });
      }
      if (!isFutureDate(data.event_date)) {
        ctx.addIssue({ code: "custom", path: ["event_date"], message: "event_date must be today or in the future" });
      }
    }),
});

// ── Update Booking Status (Chef / Helper) ─────────────────────

export const updateGuestBookingStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid booking ID"),
  }),
  body: z.object({
    status: z.enum(["ACCEPTED", "REJECTED", "COMPLETED"]),
  }),
});

// ── Admin Update Status ───────────────────────────────────────

export const adminUpdateGuestBookingStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid booking ID"),
  }),
  body: z.object({
    status: z.enum(["PENDING", "ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED"]),
  }),
});

// ── Booking List Filters ──────────────────────────────────────

export const bookingListQuerySchema = z.object({
  query: z.object({
    status: z
      .enum(["PENDING", "ACCEPTED", "REJECTED", "COMPLETED", "CANCELLED"])
      .optional(),
    event_type: z
      .enum([
        "BIRTHDAY", "WEDDING", "HOUSEWARMING", "ANNIVERSARY",
        "BABY_SHOWER", "CORPORATE_EVENT", "PRIVATE_PARTY",
        "LIVE_COOKING", "FESTIVAL", "OTHER",
      ])
      .optional(),
    city:         z.string().max(100).optional(),
    from_date:    z.string().date("Invalid from_date (YYYY-MM-DD)").optional(),
    to_date:      z.string().date("Invalid to_date (YYYY-MM-DD)").optional(),
    booking_type: z.enum(["CHEF", "HELPER"]).optional(),
    page:         z.coerce.number().int().min(1).optional(),
    limit:        z.coerce.number().int().min(1).max(100).optional(),
    sortBy:       z.enum(["event_date", "created_at", "budget", "guest_count"]).optional(),
    sortDir:      z.enum(["ASC", "DESC"]).optional(),
  }),
});

// ── ID Param ──────────────────────────────────────────────────

export const bookingIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid("Invalid booking ID"),
  }),
});

// ── Inferred Types ────────────────────────────────────────────

export type CreateGuestBookingInput       = z.infer<typeof createGuestBookingSchema>["body"];
export type UpdateGuestBookingStatusInput = z.infer<typeof updateGuestBookingStatusSchema>["body"];
export type BrowseChefQuery              = z.infer<typeof browseChefSchema>["query"];
export type BrowseHelperQuery            = z.infer<typeof browseHelperSchema>["query"];
export type BookingListQuery             = z.infer<typeof bookingListQuerySchema>["query"];
