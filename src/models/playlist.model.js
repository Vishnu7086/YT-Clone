import mongoose, {Schema} from "mongoose";

const playlistSchema = new Schema(
    {
        thumbnail: {
            type: String, //cloudnary url
            required: true
        },
        title: {
            type: String, 
            required: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        videoCount: {
            type: Number, //cloudnary url
            default: 0
        },
        views: {
            type: Number, //cloudnary url
            default: 0
        },
        videoFile: {
            type: String, //cloudnary url
            required: true
        },
        description: {
            type: String, 
            required: true
        },
        duration: {
            type: Number, //cloudnary url
            required: true
        },
        isPublished: {
            type: Boolean, 
            default: true
        },
        videos: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ]
    },
    {
        timestamps: true
    }
)

export const Playlist = mongoose.model("Playlist", playlistSchema)