import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema({
    likeId: {
        type: string,
        required: true
    },
    likeCount: {
        type: Number,
        default: 0
    },
}, {timestamps: true})

export const Like = mongoose.model("Like", likeSchema)