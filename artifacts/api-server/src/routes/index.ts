import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import lostItemsRouter from "./lost-items";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(lostItemsRouter);

export default router;
