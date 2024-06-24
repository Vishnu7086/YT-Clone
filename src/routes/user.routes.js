import { Router } from "express";
import {
    getUserWatchHistory,
    getChannelProfile, 
    updateUserCoverImage, 
    updateUserAvatar, 
    updateAcountDetails, 
    getCurrentUser, 
    changeCurrentPassword, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router()

userRouter.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)
userRouter.route("/login").post(loginUser)

//secoured routes
userRouter.route("/logout").post(verifyJWT, logoutUser)
userRouter.route("/refreshAccessToken").post(refreshAccessToken)
userRouter.route("/changeCurrentPassword").post(verifyJWT, changeCurrentPassword)
userRouter.route("/getCurrentUser").get(verifyJWT, getCurrentUser)
userRouter.route("/updateAcountDetails").patch(verifyJWT, updateAcountDetails)
userRouter.route("/updateUserAvatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
userRouter.route("/updateUserCoverImage").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)
userRouter.route("/getChannelProfile/:username").get(verifyJWT, getChannelProfile)
userRouter.route("/getUserWatchHistory").get(verifyJWT, getUserWatchHistory)

export default userRouter