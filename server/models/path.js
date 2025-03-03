const mongoose = require("mongoose");

const pathSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  bookmarks: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bookmark",
    },
  ],
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Path",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = (connection) => connection.model("Path", pathSchema);
