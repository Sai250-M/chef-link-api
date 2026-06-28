import { Request, Response } from "express";
import * as bookingService from "../services/booking.service";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.createBooking(
    req.user!.userId,
    req.params.eventId as string,
    req.body
  );
  sendCreated(res, "Event booked successfully", booking);
});

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  await bookingService.cancelBooking(req.user!.userId, req.params.id as string);
  sendSuccess(res, "Booking cancelled successfully");
});

export const getMyBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await bookingService.getMyBookings(req.user!.userId);
  sendSuccess(res, "Bookings fetched successfully", bookings);
});

export const getEventBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await bookingService.getEventBookings(
    req.user!.userId,
    req.params.eventId as string
  );
  sendSuccess(res, "Event bookings fetched successfully", bookings);
});

export const updateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.updateBookingStatus(
    req.user!.userId,
    req.params.id as string,
    req.body
  );
  sendSuccess(res, "Booking status updated successfully", booking);
});
