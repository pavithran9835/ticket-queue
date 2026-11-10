import { Router } from "express";
import type { Db } from "../db.js";
import { listUsers } from "../repositories/userRepository.js";

export function usersRouter(db: Db): Router {
  const router = Router();
  router.get("/", (_req, res) => {
    res.json({ data: listUsers(db) });
  });
  return router;
}
