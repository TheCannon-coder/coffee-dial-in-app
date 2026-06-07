import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dialinRouter from "./dialin";
import userRouter from "./user";
import gearRouter from "./gear";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dialinRouter);
router.use(userRouter);
router.use(gearRouter);

export default router;
