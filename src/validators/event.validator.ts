import { z } from "zod";

export const createEventSchema = z.object({
  body: z
    .object({
      title: z.string().min(3).max(255),
      description: z.string().max(5000).optional(),
      event_type: z.string().max(100).optional(),
      event_date: z.string().date("Invalid date format (YYYY-MM-DD required)"),
      start_time: z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:MM required)"),
      end_time: z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format (HH:MM required)"),
      venue: z.string().min(2).max(255),
      address: z.string().max(500).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      max_participants: z.number().int().min(1),
      price: z.number().min(0).optional(),
      currency: z.string().max(10).optional(),
      banner_url: z.string().url("Invalid URL").optional(),
      status: z.enum(["DRAFT", "OPEN"]).optional(),
    })
    .refine(
      (d) => {
        const s = d.start_time.slice(0, 5);
        const e = d.end_time.slice(0, 5);
        return e > s;
      },
      { message: "end_time must be after start_time", path: ["end_time"] }
    )
    .refine(
      (d) => new Date(d.event_date) >= new Date(new Date().toDateString()),
      { message: "event_date must be today or in the future", path: ["event_date"] }
    ),
});

export const updateEventSchema = z.object({
  body: z
    .object({
      title: z.string().min(3).max(255).optional(),
      description: z.string().max(5000).optional(),
      event_type: z.string().max(100).optional(),
      event_date: z.string().date("Invalid date format (YYYY-MM-DD required)").optional(),
      start_time: z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format")
        .optional(),
      end_time: z
        .string()
        .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Invalid time format")
        .optional(),
      venue: z.string().min(2).max(255).optional(),
      address: z.string().max(500).optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      max_participants: z.number().int().min(1).optional(),
      price: z.number().min(0).optional(),
      currency: z.string().max(10).optional(),
      banner_url: z.string().url("Invalid URL").optional(),
      status: z.enum(["DRAFT", "OPEN", "CLOSED", "CANCELLED"]).optional(),
    })
    .refine(
      (d) => {
        if (d.start_time && d.end_time) {
          return d.end_time.slice(0, 5) > d.start_time.slice(0, 5);
        }
        return true;
      },
      { message: "end_time must be after start_time", path: ["end_time"] }
    ),
});

export const eventSearchSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    city: z.string().optional(),
    event_date: z.string().date().optional(),
    event_type: z.string().optional(),
    status: z.enum(["DRAFT", "OPEN", "CLOSED", "CANCELLED"]).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    sortBy: z.enum(["event_date", "price", "created_at"]).optional(),
    sortDir: z.enum(["ASC", "DESC"]).optional(),
  }),
});

// ── Booking schemas ───────────────────────────────────────────

export const createBookingSchema = z.object({
  body: z.object({
    number_of_people: z.number().int().min(1).optional(),
    special_request: z.string().max(1000).optional(),
  }),
});

export const updateBookingStatusSchema = z.object({
  body: z.object({
    booking_status: z.enum(["CONFIRMED", "CANCELLED", "ATTENDED"]),
    payment_status: z.enum(["PENDING", "PAID", "REFUNDED", "FAILED"]).optional(),
  }),
});

// ── Inferred types ────────────────────────────────────────────

export type CreateEventInput   = z.infer<typeof createEventSchema>["body"];
export type UpdateEventInput   = z.infer<typeof updateEventSchema>["body"];
export type CreateBookingInput = z.infer<typeof createBookingSchema>["body"];
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>["body"];
