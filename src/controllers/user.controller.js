import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from 'mongoose';
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        // await user.save({ValidityState: false})
        await user.save()
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Acess and Refresh token")
    }
}

const registerUser = asyncHandler( async (req, res) => {

    // get user details from frontend

    const {username, email, fullname, password} = req.body
    
    // validation - not empty
    
    if (
        [username, email, fullname, password].some((field) => !field || field?.trim() == "")
    ) {
        throw new ApiError(400, "All fields are required")
    } 

    // check if user already exist

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // check for images, check for avatar

    // const avatarLocalPath = req.files?.avatar[0]?.path;
    // console.log(req.files);
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    
    // upload them to cloudinary, check for avatar
    
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required    nn")
    }

    // create user object - creare entery in db
    
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullname,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })
    
    // remove passward and refresh token field from response
    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    // check for user creation
    
    if (!createdUser) {
        throw new ApiError(500, "Something went Wrong while registering the user")
    }
    
    // return res

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

const loginUser = asyncHandler( async (req, res) => {
    // req body -> data

    const {username, email, password} = req.body

    // username or email

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }

    // find the user

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    // console.log("password: ", user.password);

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

    // password check

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Pasword is Incorrect")
    }

    // generate access and refresh token

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    const loginUser = await User.findById(user._id).select("-password -refreshToken")

    // send cookie 

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loginUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )


})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                // refreshToken: ""
                // refreshToken: null
                // refreshToken: undefined
                refreshToken: 1 //this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))

})

const refreshAccessToken = asyncHandler( async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies?.refreshToken || req.header("Authorization")?.replace("Bearer ", "") || req.body.refreshToken

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        if (!decodedToken) {
            throw new ApiError(400, "authentication failed")
        }
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Authentication timeout")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refreshToken},
                "access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Something went wrong while refreshing Access and Refresh tokens")
    }

})

const changeCurrentPassword = asyncHandler( async  (req, res) => {
    const {oldPassword, newPassword, confurmPassword} = req.body
    
    if (
        [oldPassword, newPassword, confurmPassword].some((field) => !field || field?.trim() == "")
    ) {
        throw new ApiError(400, "All fields are required")
    } 

    if (newPassword !== confurmPassword) {
        throw new ApiError(401, "Check your confurm password again")
    }

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid Old Password")
    }

    user.password = newPassword
    await user.save()

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Changed Successfully"))
})

const getCurrentUser = asyncHandler( async (req, res) => {

    return res
    .status(200)
    .json( new ApiResponse(200, req.user, "current user fetched successfully"))
})

const updateAcountDetails = asyncHandler( async (req, res) => {
    try {
        const {username, email, fullname} = req.body
    
        if (
            [username, email, fullname].every((field) => !field || field?.trim() == "")
        ) {
            throw new ApiError(400, "One of the above fields are required")
        } 
        
        const updatedData = {
            username: username || req.user.username,
            email: email || req.user.email,
            fullname: fullname || req.user.fullname
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    username,
                    email,
                    fullname
                }
            },
            {new: true}
        ).select("-password -refreshToken")
    
        return res
        .status(200)
        .json(new ApiResponse(200, user,"Acount details are updated successfully"))
    } catch (error) {
        throw new ApiError(401, "Something went wrong while updating user details")
    }
})

const updateUserAvatar = asyncHandler( async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(500, "Error while uploading Avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json( new ApiResponse(200, user,"avatar is updated"))
})

const updateUserCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "CoverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(500, "Error while uploading CoverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            }
        },
        {new: true}
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json( new ApiResponse(200, user,"coverImage is updated"))
})

const getChannelProfile = asyncHandler( async (req, res) => {
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                username: 1,
                fullname: 1,
                email: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                createdAt: 1
            }
        }
    ])

    console.log(channel.length, channel);

    if (!channel?.length) {
        throw new ApiError(400, "channel does not exist")
    }

    return res
    .status(200
    .json(
        new ApiResponse(200, channel[0], "Channel details fetched successfully")
    )
    )
})

const getUserWatchHistory = asyncHandler( async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                // as: "userWatchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "videoOwner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        },
        // {
        //     $addFields: {
        //         watchHistory: "$userWatchHistory"
        //     }
        // },
        // {
        //     $project: {
        //         watchHistory: 1
        //     }
        // }
    ])

    console.log(typeof(user), user);

    return res
    .status(200)
    .json( new ApiResponse(
        200, 
        user[0].watchHistory,
        "User watch history feathed successfully"
    ))
    // .json( new ApiResponse(200, user[0],"User watch history feathed successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAcountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getChannelProfile,
    getUserWatchHistory
}