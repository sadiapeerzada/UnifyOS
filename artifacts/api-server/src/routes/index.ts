import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devicesRouter from "./devices";
import alertsRouter from "./alerts";
import sensorRouter from "./sensor";
import anomalyStatsRouter from "./anomalyStats";
import incidentsRouter from "./incidents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devicesRouter);
router.use(alertsRouter);
router.use(sensorRouter);
router.use(anomalyStatsRouter);
router.use(incidentsRouter);

export default router;
