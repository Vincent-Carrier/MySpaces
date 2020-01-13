const { getUserById } = require("./lib/queries");
// load .env data into process.env
require("dotenv").config();

// Web server config
const PORT = process.env.PORT || 8080;
const ENV = process.env.ENV || "development";
const express = require("express");
const bodyParser = require("body-parser");
const sass = require("node-sass-middleware");
const app = express();
const morgan = require("morgan");

// PG database client/connection setup
const { Pool } = require("pg");
const dbParams = require("./lib/db.js");
const db = new Pool(dbParams);
db.connect();

exports.db = db;

app.use(morgan("dev"));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
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

const getQueryResults = async sql => {
  return db
    .query(sql)
    .then(res => res.rows)
    .catch(err => console.log(err));
};
exports.getQueryResults = getQueryResults;


app.use("/users", require("./routes/users"));
app.use("/maps", require("./routes/maps"));


app.get("/", (req, res) => {
  res.render("index");
});


app.post("/logout", (req, res) => {
  res.clearCookie("user-id").redirect("/");
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
