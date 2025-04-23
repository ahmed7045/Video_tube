import { Router } from "express";
import { healthcheck } from "../controller/healthcheck.controller.js";
import { upload } from "../middlewares/multer.middlewares.js";

const router = Router()

router.route("/").get(healthcheck)

export default router