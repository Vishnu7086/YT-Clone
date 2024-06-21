import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        // user.save({ValidityState: false})
        await user.save({validateBeforeSave: false})
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
                refreshToken: ""
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
    
        const options ={
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

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}