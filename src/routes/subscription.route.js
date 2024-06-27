import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { subscribe } from "../controllers/sbuscription.controllar.js";

const subscriptionRouter = Router()

//secoured routes
subscriptionRouter.route("/subscribe").post(verifyJWT, subscribe)

export default subscriptionRouter