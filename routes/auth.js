const express = require("express");
const router = express.Router();
const User = require("../model/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//endpoint to signup
router.post("/signup", async (req, res) => {
  const { fullname, email, password, phone_no } = req.body;

  //crosscheck whats gotten from the req.body
  if (!fullname || !email || !password || !phone_no) {
    return res
      .status(400)
      .send({ status: "error", msg: "All fields must be filled" });
  }

  try {
    const check = await User.findOne({ email: email });
    if (check)
      return res.status(200).send({
        status: "ok",
        msg: "An account with this email already exists",
      });

    const timestamp = Date.now();
    const hashedpassword = await bcrypt.hash(password, 10);

    //create user document
    const user = new User();
    user.fullname = fullname;
    user.email = email;
    user.password = hashedpassword;
    user.phone_no = phone_no;
    user.gender = "";
    user.timestamp = timestamp;
    user.age = await user.save();
    return res
      .status(200)
      .send({ status: "ok", msg: "Account created successfully", user });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: "error", msg: "An error occured" });
  }
});

//endpoint to login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .send({ status: "error", msg: "All field must be filled" });

  try {
    // get user from database
    let user = await User.findOne({ email }).lean();
    if (!user)
      return res
        .status(200)
        .send({ status: "ok", msg: "No user with the email found" });

    //compare password
    const correct_password = await bcrypt.compare(password, user.password);
    if (!correct_password)
      return res
        .status(200)
        .send({ status: "ok", msg: "Password is incorrect" });

    // create token
    const token = jwt.sign(
      {
        _id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
    );

    //update user document to online
    user = await User.findOneAndUpdate(
      { email },
      { is_online: true },
      { new: true },
    ).lean();

    //send response
    res
      .status(200)
      .send({ status: "ok", msg: "Login Successful", user, token });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: "error", msg: "An error occured" });
  }
});

//endpoint to logout
router.post("/logout", async (req, res) => {
  const { token } = req.body;
  if (!token)
    return res.status(400).send({ status: "error", msg: "Token is required" });

  try {
    //verify token
    const user = jwt.verify(token, process.env.JWT_SECRET);

    await User.updateOne({ _id: user._id }, { is_online: false });
    return res.status(200).send({ status: "ok", msg: "Logout Successful" });
  } catch (error) {
    console.log(error);
    if (error == "JsonWebTokenError")
      return res.status(400).send({ status: "error", msg: "Invalid token" });

    return res.status(500).send({ status: "error", msg: "An error occured" });
  }
});

//endpoint to delete account
router.post("/delete_account", async (req, res) => {
  const { token } = req.body;
  if (!token)
    return res.status(400).send({ status: "error", msg: "Token is required" });

  try {
    //verify token
    const user = jwt.verify(token, process.env.JWT_SECRET);

    //Find the user and delete the account
    const Duser = await User.findByIdAndDelete(user._id);

    //Check if the user exists and was deleted
    if (!Duser)
      return res.status(400).send({ status: "error", msg: "No user Found" });

    return res
      .status(200)
      .send({ status: "ok", msg: "Account Successfully deleted" });
  } catch (error) {
    console.log(error);

    if (error == "JsonWebTokenError")
      return res.status(400).send({ status: "error", msg: "Invalid token" });

    return res.status(500).send({ status: "error", msg: "An error occured" });
  }
});

module.exports = router;
