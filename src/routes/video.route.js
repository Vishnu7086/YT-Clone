import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadVideo, getAllVideos, getVideo } from "../controllers/video.controllar.js";

const videoRouter = Router()

//secoured routes
videoRouter.route("/uploadVideo").post(verifyJWT, upload.single("video"), uploadVideo)
videoRouter.route("/getAllVideos").get(getAllVideos)
videoRouter.route("/getVideo").post(getVideo)

export default videoRouter