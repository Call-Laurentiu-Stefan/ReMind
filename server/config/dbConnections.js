const mongoose = require("mongoose");

const BOOKMARKS_DB_URL = "mongodb://127.0.0.1:27017/bookmarks";
const PATHS_DB_URL = "mongodb://127.0.0.1:27017/paths";

const bookmarksConn = mongoose.createConnection(BOOKMARKS_DB_URL);
const pathsConn = mongoose.createConnection(PATHS_DB_URL);

bookmarksConn.on("error", (err) =>
  console.error("Bookmarks DB connection error:", err)
);
pathsConn.on("error", (err) =>
  console.error("Paths DB connection error:", err)
);

bookmarksConn.once("open", () =>
  console.log("Connected to Bookmarks database")
);
pathsConn.once("open", () => console.log("Connected to Paths database"));

module.exports = { bookmarksConn, pathsConn };
