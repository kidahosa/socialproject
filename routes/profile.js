const express = require("express");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");

const User = require("../model/user");
const Cloudinary = require("../utils/cloudinary");
const Uploader = require("../utils/multer");

const router = express.Router();
dotenv.config();

// endpoint to edit profile
router.post("/edit_profile", Uploader.single("image"), async (req, res) => {
  try {
    const { token, fullname, email, phone_no, age, gender } = req.body;

    if (!token) {
      return res.status(400).send({ status: "error", msg: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).send({ status: "error", msg: "User not found" });
    }

    // ==== PROFILE IMAGE HANDLING ====
    let final_img_id = user.img_id;
    let final_img_url = user.img_url;

    // If new file uploaded
    if (req.file) {
      if (user.img_id) {
        await Cloudinary.uploader.destroy(user.img_id);
      }

      const upload = await Cloudinary.uploader.upload(req.file.path, {
        folder: "user-images",
      });

      final_img_id = upload.public_id;
      final_img_url = upload.secure_url;
    }

    // ==== UPDATE USER FIELDS ====
    const userUpdate = {};
    if (fullname) userUpdate.fullname = fullname;
    if (email) userUpdate.email = email;
    if (phone_no) userUpdate.phone_no = phone_no;
    if (age) userUpdate.age = age;
    if (gender) userUpdate.gender = gender;

    // Add profile image fields
    userUpdate.img_id = final_img_id;
    userUpdate.img_url = final_img_url;

    const updatedUser = await User.findByIdAndUpdate(userId, userUpdate, {
      new: true,
    }).lean();

    return res
      .status(200)
      .send({ status: "ok", msg: "Edited successfully", Muser: updatedUser });
  } catch (error) {
    console.log(error);

    if (error.name == "JsonWebTokenError")
      return res.status(400).send({ status: "error", msg: "Invalid token" });

    return res
      .status(500)
      .send({ status: "error", msg: "An error occured", error: error.message });
  }
});

// endpoint to view profile
router.post("/view_profile", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).send({ status: "error", msg: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded._id).lean();
    if (!user)
      return res.status(200).send({ status: "ok", msg: "No user Found" });

    return res.status(200).send({ status: "ok", msg: "Successful", user });
  } catch (error) {
    console.log(error);
    if (error.name == "JsonWebTokenError")
      return res.status(400).send({ status: "error", msg: "Invalid token" });

    return res
      .status(500)
      .send({ status: "error", msg: "An error occured", error: error.message });
  }
});
// endpoint to upload photos
router.post(
  "/upload_photos",
  Uploader.array("images", 10),
  async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).send({ status: "error", msg: "Token required" });
      }

      const user = jwt.verify(token, process.env.JWT_SECRET);
      const userId = user._id;

      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .send({ status: "error", msg: "No files uploaded" });
      }

      let profile = await User.findById(userId);

      if (!profile) {
        return res.status(404).send({ status: "error", msg: "User not found" });
      }

      const uploadedPhotos = [];

      // Upload each selected file to Cloudinary
      for (const file of req.files) {
        const upload = await Cloudinary.uploader.upload(file.path, {
          folder: "media/photos",
        });

        profile.photo_id.push(upload.public_id);
        profile.photo_url.push(upload.secure_url);

        uploadedPhotos.push(upload);
      }

      await profile.save();

      return res
        .status(200)
        .send({ status: "ok", msg: "success", file: uploadedPhotos, profile });
    } catch (error) {
      console.log(error);
      if (error.name == "JsonWebTokenError")
        return res.status(400).send({ status: "error", msg: "Invalid token" });

      return res.status(500).send({ status: "error", msg: error.message });
    }
  },
);
// endpoint to upload videos
router.post(
  "/upload_videos",
  Uploader.array("videos", 1),
  async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).send({ status: "error", msg: "Token required" });
    }

      const user = jwt.verify(token, process.env.JWT_SECRET);
      const userId = user._id;

      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .send({ status: "error", msg: "No files uploaded" });
      }

      let profile = await User.findById(userId);

      if (!profile) {
        return res.status(404).send({ status: "error", msg: "User not found" });
      }

      const uploadedVideos = [];

      // Upload each selected file to Cloudinary
      for (const file of req.files) {
        const upload = await Cloudinary.uploader.upload(file.path, {
          folder: "media/videos",
          resource_type: "video",
        });

        profile.videos.push({
          vid_url: upload.secure_url,
          vid_id: upload.public_id,
        });

        uploadedVideos.push(upload);
      }

      await profile.save();

      return res
        .status(200)
        .send({ status: "ok", msg: "success", file: uploadedVideos, profile });
    } catch (error) {
      console.log(error);
      if (error.name == "JsonWebTokenError")
        return res.status(400).send({ status: "error", msg: "Invalid token" });

      return res.status(500).send({ status: "error", msg: error.message });
    }
  },
);

// endpoint to delete any media files( photos, videos )
router.post("/delete_media", async (req, res) => {
  try {
    const { token, media_ids, type } = req.body;
    // type = "photo" | "video"

    if (!token) {
      return res.status(400).send({ status: "error", msg: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    if (!media_ids || !Array.isArray(media_ids) || media_ids.length === 0) {
      return res
        .status(400)
        .send({ status: "error", msg: "Please provide an array of media_ids" });
    }

    if (media_ids.length > 5) {
      return res
        .status(400)
        .send({
          status: "error",
          msg: "Maximum 5 media files can be deleted at once",
        });
    }

    if (!type || !["photo", "video"].includes(type)) {
      return res
        .status(400)
        .send({
          status: "error",
          msg: "Valid type (photo or video) is required",
        });
    }

    const profile = await User.findById(userId);

    if (!profile) {
      return res.status(404).send({ status: "error", msg: "User not found" });
    }

    const deletedIds = [];
    const failedIds = [];

    for (const file_id of media_ids) {
      let found = false;

      if (type === "photo") {
        const index = profile.photo_id.indexOf(file_id);
        if (index !== -1) {
          found = true;
          // Delete from cloudinary
          await Cloudinary.uploader.destroy(file_id);
          // Remove from arrays
          profile.photo_id.splice(index, 1);
          profile.photo_url.splice(index, 1);
        }
      } else if (type === "video") {
        const index = profile.videos.findIndex((v) => v.vid_id === file_id);
        if (index !== -1) {
          found = true;
          // Delete from cloudinary
          await Cloudinary.uploader.destroy(file_id, {
            resource_type: "video",
          });
          // Remove from array
          profile.videos.splice(index, 1);
        }
      }

      if (found) {
        deletedIds.push(file_id);
      } else {
        failedIds.push(file_id);
      }
    }

    await profile.save();

    const photo_count = profile.photo_id ? profile.photo_id.length : 0;
    const video_count = profile.videos ? profile.videos.length : 0;

    return res.status(200).send({
      status: "ok",
      msg: "Deletion process completed",
      deleted: deletedIds,
      failed: failedIds,
      profile,
      photo_count,
      video_count,
    });
  } catch (error) {
    console.log(error);
    if (error.name == "JsonWebTokenError")
      return res.status(400).send({ status: "error", msg: "Invalid token" });

    return res
      .status(500)
      .send({ status: "error", msg: "Error occurred", error: error.message });
  }
});

module.exports = router;
