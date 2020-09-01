import { Request, Response } from "express";
import { RedisClient } from "redis";

export interface MyContext {
  req: Request & { session: Express.Session},
  res: Response,
  redis: RedisClient
}