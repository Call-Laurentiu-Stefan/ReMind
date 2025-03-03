const { bookmarksConn, pathsConn } = require("../config/dbConnections");
const Bookmark = require("../models/bookmark")(bookmarksConn);
const Path = require("../models/path")(pathsConn);
const verifyAuth = require("../middleware/authMiddleware");

module.exports = (app) => {
  app.use("/paths", verifyAuth);

  app.post("/paths", async (req, res) => {
    const { path, userId, parentId } = req.body;
    try {
      if (!userId || !path) {
        return res
          .status(400)
          .json({ message: "User ID and path are required" });
      }

      const newPath = new Path({
        userId,
        path,
        parentId: parentId || null,
        bookmarks: [],
        children: [],
      });

      await newPath.save();
      res.status(201).json(newPath);
    } catch (err) {
      console.error("Error creating path:", err);
      res.status(500).json({ message: "Error creating the path" });
    }
  });

  app.get("/paths/:id", async (req, res) => {
    try {
      const path = await Path.findById(req.params.id).populate({
        path: "bookmarks",
        model: Bookmark,
      });

      if (!path) {
        return res.status(404).json({ message: "Path not found" });
      }

      res.status(200).json(path);
    } catch (err) {
      console.error("Error retrieving path:", err);
      res.status(500).json({ message: "Error retrieving from database" });
    }
  });

  app.get("/paths", async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    try {
      const directories = await Path.find({ userId }).populate({
        path: "bookmarks",
        model: Bookmark,
        select: "title link",
      });

      const directoryMap = {};
      directories.forEach((dir) => {
        directoryMap[dir._id] = { ...dir.toObject(), children: [] };
      });

      const tree = [];
      directories.forEach((dir) => {
        if (dir.parentId) {
          directoryMap[dir.parentId]?.children.push(directoryMap[dir._id]);
        } else {
          tree.push(directoryMap[dir._id]);
        }
      });
      res.json(tree);
    } catch (error) {
      console.error("Error fetching directories:", error);
      res.status(500).json({ error: "Failed to fetch directories" });
    }
  });

  app.put("/paths/:id", async (req, res) => {
    const { path } = req.body;

    try {
      if (!path) {
        return res.status(400).json({ message: "Path name is required" });
      }

      const updatedPath = await Path.findByIdAndUpdate(
        req.params.id,
        { path },
        { new: true }
      );

      if (!updatedPath) {
        return res.status(404).json({ message: "Path not found" });
      }

      res.status(200).json(updatedPath);
    } catch (err) {
      console.error("Error updating path:", err);
      res.status(500).json({ message: "Error updating from database" });
    }
  });

  app.delete("/paths/:id", async (req, res) => {
    try {
      const deletedPath = await Path.findByIdAndDelete(req.params.id);

      if (!deletedPath) {
        return res.status(404).json({ message: "Path not found" });
      }

      res.status(200).json({ message: "Path deleted successfully" });
    } catch (err) {
      console.error("Error deleting path:", err);
      res.status(500).json({ message: "Error deleting from database" });
    }
  });

  app.delete("/paths/:id/bookmarks/:bookmarkId", async (req, res) => {
    const { id, bookmarkId } = req.params;

    try {
      const updatedPath = await Path.findByIdAndUpdate(
        id,
        { $pull: { bookmarks: bookmarkId } },
        { new: true }
      );

      if (!updatedPath) {
        return res.status(404).json({ message: "Path not found" });
      }

      res
        .status(200)
        .json({ message: "Bookmark removed successfully", path: updatedPath });
    } catch (err) {
      console.error("Error deleting bookmark from path:", err);
      res.status(500).json({ message: "Error updating path" });
    }
  });
};
