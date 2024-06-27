import mongoose, {Schema} from "mongoose";

const tweetSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    tweetMsg: {
        type: String,
        required: true
    },
    tweetImg: {
        type: String,
    },
    comments: [
        {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        }
    ]
}, {timestamps: true})

export const Tweet = mongoose.model("Tweet", tweetSchema)