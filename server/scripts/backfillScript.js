const mongoose = require("mongoose");
const { bookmarksConn } = require("../config/dbConnections");
const Bookmark = require("../models/bookmark")(bookmarksConn);

(async () => {
  try {
    const bookmarks = await Bookmark.find().sort({ _id: 1 });

    let orderValue = 1;
    const currentDate = new Date();

    for (const bookmark of bookmarks) {
      bookmark.order = orderValue++;
      bookmark.createdAt = bookmark.createdAt || currentDate;
      await bookmark.save();
    }

    console.log("All bookmarks updated");
  } catch (error) {
    console.error("Error updating bookmarks:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from the database");
  }
})();
