const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    fullname: String,
    email: String,
    phone_no: String,
    password: String,
    is_online: { type: Boolean, default: false },
    age: Number,
    gender: String,
    photo_id: [String],
    photo_url: [String],
    videos:[{
        vid_id: String,
        vid_url: String
    }],
    timestamp: Number,
  },
  { collection: "User" },
);

const model = mongoose.model("user", userSchema);
module.exports = model;
