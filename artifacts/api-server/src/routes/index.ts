import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dialinRouter from "./dialin";
import userRouter from "./user";
import gearRouter from "./gear";
import adminRouter from "./admin";
import connectRouter from "./connect";
import complianceRouter from "./compliance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dialinRouter);
router.use(userRouter);
router.use(gearRouter);
router.use(adminRouter);
router.use(connectRouter);
router.use(complianceRouter);

export default router;
