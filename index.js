const express = require("express");
const dotenv = require("dotenv");
dotenv.config();
const mongoose = require("mongoose");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// connect database
mongoose.connect(process.env.MONGO_URI);
const con = mongoose.connection;
con.on("open", (error) => {
  if (error) {
    console.log(`Error connecting to database ${error}`);
  } else {
    console.log("Connected to Database");
  }
});

// routes
app.use("/auth", require("./routes/auth"));
app.use("/profile", require("./routes/profile"));

const port = process.env.port;
app.listen(port, () => {
  console.log(`server listening at port ${port}`);
});

module.exports = app;
