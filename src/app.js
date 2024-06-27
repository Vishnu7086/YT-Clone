import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGN,
    Credential: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import
import userRouter from "./routes/user.routes.js";
import subscriptionRouter from "./routes/subscription.route.js"
import videoRouter from "./routes/video.route.js"

// routes declaretion
app.use("/api/v1/users", userRouter, subscriptionRouter)
app.use("/api/v1/video", videoRouter)

export{ app }