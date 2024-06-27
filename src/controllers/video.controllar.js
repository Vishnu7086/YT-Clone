import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Video } from "../models/video.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from 'mongoose';

const uploadVideo = asyncHandler( async (req, res) => {
    const { title, description } = req.body
    console.log(title, description)

    const videoLocalPath = req.file?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "video file is required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)
    console.log(videoFile)

    const videoDetails = await Video.create({
        videoFile: videoFile.url,
        thumbnail: videoFile.url,
        title: title,
        description: description,
        duration: videoFile.duration,
        owner: new mongoose.Types.ObjectId(req.user._id)
    })

    if (!videoDetails) {
        throw new ApiError(400, "Error while uploading the video")
    }

    return res
    .status(200)
    .json( new ApiResponse(200, videoDetails,"video Uploaded successfully"))
})

const getAllVideos = asyncHandler( async (req, res) => {
    const videos = await Video.find({}).select("-videoFile -description")

    if (!videos) {
        throw new ApiError(404,"videos not found")
    }

    return res
    .status(200)
    .json( new ApiResponse(200, videos, "videos is featched successfully"))
})

const getVideo = asyncHandler( async (req, res) => {
    const { title, description } = req.body

    if (!title && !description) {
        throw new ApiError(400, "Title or description of video is needed")
    }

    const video = await Video.findOne({title})

    if (!video) {
        throw new ApiError(404,"video not found")
    }

    return res
    .status(200)
    .json( new ApiResponse(200, video, "video is featched successfully"))

})

export {
    uploadVideo,
    getAllVideos,
    getVideo
}