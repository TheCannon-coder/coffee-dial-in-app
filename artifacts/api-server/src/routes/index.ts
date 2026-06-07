import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dialinRouter from "./dialin";
import userRouter from "./user";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dialinRouter);
router.use(userRouter);

export default router;
