import { Router, type IRouter } from "express";
import { type Server as SocketServer } from "socket.io";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import updatesRouter from "./updates.js";
import uploadsRouter from "./uploads.js";
import alertsRouter from "./alerts.js";
import { createPetsRouter } from "./pets.js";
import { createSightingsRouter } from "./sightings.js";

export function createRouter(io?: SocketServer): IRouter {
  const router: IRouter = Router();

  router.use(healthRouter);
  router.use(authRouter);
  router.use(updatesRouter);
  router.use(uploadsRouter);
  router.use(alertsRouter);
  router.use(createPetsRouter(io));
  router.use(createSightingsRouter(io));

  return router;
}

export default createRouter();
