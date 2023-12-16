const mongoose = require("mongoose")
const {Schema,odel} = mongoose;
const PostSchema = new Schema({
    title: String,
    summary: String,
    content: String,
    conver: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: "user"
    },
}, {
    timestamps: true,
})
const PostModel = model("Post", PostSchema);
module.exports = PostModel