import { Router, type IRouter } from "express";
import healthRouter from "./health";
import devicesRouter from "./devices";
import alertsRouter from "./alerts";
import sensorRouter from "./sensor";

const router: IRouter = Router();

router.use(healthRouter);
router.use(devicesRouter);
router.use(alertsRouter);
router.use(sensorRouter);

export default router;
