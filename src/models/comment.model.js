import mongoose, {Schema} from "mongoose";

const commentSchema = new Schema({
    commentId: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    comment: {
        type: String,
        required: true
    },
}, {timestamps: true})

export const Comment = mongoose.model("Comment", commentSchema)