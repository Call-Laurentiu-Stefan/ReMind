const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: false,
  },
  tags: [
    {
      type: String,
      required: true,
    },
  ],
  pdfLink: {
    type: String,
    required: false,
  },
  imagesLinks: [
    {
      type: String,
      required: true,
    },
  ],
  order: {
    type: Number,
    required: true,
    unique: true,
  },
  sharedWith: [
    {
      type: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

bookmarkSchema.index({
  title: "text",
  tags: "text",
  link: "text",
  description: "text",
});

bookmarkSchema.index({ order: 1 });

module.exports = (connection) => connection.model("Bookmark", bookmarkSchema);
