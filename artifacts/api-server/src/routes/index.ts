import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dialinRouter from "./dialin";
import userRouter from "./user";
import gearRouter from "./gear";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dialinRouter);
router.use(userRouter);
router.use(gearRouter);
router.use(adminRouter);

export default router;
