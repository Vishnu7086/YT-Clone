import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";

const subscribe = asyncHandler(async (req, res) => {
    const { channelName } = req.body;

    if (typeof channelName !== 'string' || !channelName.trim()) {
        throw new ApiError(400, "Channel name is missing or not a string")
    }

    const normalizedChannelName = channelName.trim().toLowerCase();
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized")
    }

    const channel = await User.findOne({ username: normalizedChannelName }).select('_id');

    if (!channel) {
        throw new ApiError(404, "Channel does not exist")
    }

    const alreadySubscribed = await Subscription.findOne({
        channel: channel._id,
        subscriber: userId
    });

    if (alreadySubscribed) {
        throw new ApiError(400, "Already subscribed")
    }

    const subscription = await Subscription.create({
        channel: channel._id,
        subscriber: userId,
    });

    return res.status(200).json(
        new ApiResponse(200, subscription, "Channel is subscribed successfully")
    );
});

export { subscribe }