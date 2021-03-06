const { getUserById } = require("./lib/queries");
// load .env data into process.env
require("dotenv").config();

// Web server config
const PORT = process.env.PORT || 8080;
const ENV = process.env.ENV || "development";
const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const sass = require("node-sass-middleware");
const app = express();
const morgan = require("morgan");

// PG database client/connection setup
const { Pool } = require("pg");
const dbParams = require("./lib/db.js");
const db = new Pool(dbParams);
db.connect();

const { execQuery, ifLoggedIn } = require("./lib/helpers")(db);
module.exports = { execQuery, ifLoggedIn };

app.use(morgan("dev"));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  "/styles",
  sass({
    src: __dirname + "/styles",
    dest: __dirname + "/public/styles",
    debug: true,
    outputStyle: "expanded"
  })
);
app.use(express.static("public"));

app.use("/users", require("./routes/users"));
app.use("/maps", require("./routes/maps"));
app.use("/api", require("./routes/api"));

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/login/:id", async (req, res) => {
  const sql = getUserById(req.params.id);
  const result = await execQuery(sql);
  const user = result[0];
  if (user) {
    res.cookie("user-id", user.id).redirect("/");
  } else {
    res.status(403).send("Invalid credentials");
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("user-id").redirect("/");
});

app.get("/profile", async (req, res) => {
  ifLoggedIn(req, res, async userID => {
    const sql = getUserById(userID);
    const results = await execQuery(sql);
    console.log(results);
    const templateVars = { user: results[0] };
    console.log(templateVars);
    res.render("user-profile", templateVars);
  });
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
