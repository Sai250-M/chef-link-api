import { Request, Response } from "express";
import * as eventService from "../services/event.service";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

export const createEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.createEvent(req.user!.userId, req.body);
  sendCreated(res, "Event created successfully", event);
});

export const updateEvent = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.updateEvent(
    req.user!.userId,
    req.params.id as string,
    req.body
  );
  sendSuccess(res, "Event updated successfully", event);
});

export const deleteEvent = asyncHandler(async (req: Request, res: Response) => {
  await eventService.deleteEvent(req.user!.userId, req.params.id as string);
  sendSuccess(res, "Event deleted successfully");
});

export const getEventById = asyncHandler(async (req: Request, res: Response) => {
  const event = await eventService.getEventById(req.params.id as string);
  sendSuccess(res, "Event fetched successfully", event);
});

export const getMyEvents = asyncHandler(async (req: Request, res: Response) => {
  const events = await eventService.getMyEvents(
    req.user!.userId,
    req.query.status as string | undefined
  );
  sendSuccess(res, "Events fetched successfully", events);
});

export const searchEvents = asyncHandler(async (req: Request, res: Response) => {
  const result = await eventService.searchEvents(req);
  sendSuccess(res, "Events fetched successfully", result.data, 200, result.meta);
});
