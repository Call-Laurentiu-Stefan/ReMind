const express = require("express");
const cors = require("cors");
const { bookmarksConn, pathsConn } = require("./config/dbConnections");
let Bookmark, Path;

Bookmark = require("./models/bookmark")(bookmarksConn);
Path = require("./models/path")(pathsConn);

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(cors());

require("./routes/bookmarkRoutes")(app);
require("./routes/pathRoutes")(app);
require("./routes/descriptionProcessingRoutes")(app);

app.listen(5000, () => {
  console.log("Server Started at http://localhost:5000");
});
