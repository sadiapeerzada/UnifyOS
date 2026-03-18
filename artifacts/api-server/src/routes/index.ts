import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devicesRouter from "./devices";
import alertsRouter from "./alerts";
import sensorRouter from "./sensor";
import anomalyStatsRouter from "./anomalyStats";
import triageRouter from "./triage";
import incidentsRouter from "./incidents";
import heatmapRouter from "./heatmap";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devicesRouter);
router.use(alertsRouter);
router.use(sensorRouter);
router.use(anomalyStatsRouter);
router.use(triageRouter);
router.use(incidentsRouter);
router.use(heatmapRouter);

export default router;
