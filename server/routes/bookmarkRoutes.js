const { bookmarksConn, pathsConn } = require("../config/dbConnections");
const Bookmark = require("../models/bookmark")(bookmarksConn);
const Path = require("../models/path")(pathsConn);
const puppeteer = require("puppeteer");
const PuppeteerHTMLPDF = require("puppeteer-html-pdf");
const verifyAuth = require("../middleware/authMiddleware");
// const wkhtmltopdf = require("wkhtmltopdf");

let browserInstance = null;
async function getBrowserInstance() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    console.log("Launched browser instance.");
  }
  return browserInstance;
}

browserInstance = getBrowserInstance();

module.exports = (app) => {
  app.use("/bookmarks", verifyAuth);

  app.post("/bookmarks", async (req, res) => {
    const { bookmark: newBookmark } = req.body;
    const highestOrderBookmark = await Bookmark.findOne().sort({ order: -1 });
    const nextOrder = highestOrderBookmark ? highestOrderBookmark.order + 1 : 1;

    try {
      let path = null;
      if (newBookmark.userId && newBookmark.path) {
        if (newBookmark.parentId) {
          path = await Path.findOne({
            userId: newBookmark.userId,
            path: newBookmark.path,
            parentId: newBookmark.parentId,
          });
        } else {
          path = await Path.findOne({
            userId: newBookmark.userId,
            path: newBookmark.path,
          });
        }

        if (!path) {
          path = new Path({
            userId: newBookmark.userId,
            path: newBookmark.path,
            bookmarks: [],
          });
          await path.save();
        }
      }

      const bookmark = new Bookmark({
        userId: newBookmark.userId,
        username: newBookmark.username,
        email: newBookmark.email,
        link: newBookmark.link,
        title: newBookmark.title,
        description: newBookmark.description,
        imagesLinks: newBookmark.imagesLinks,
        tags: Array.isArray(newBookmark.tags) ? newBookmark.tags : [],
        order: nextOrder,
      });

      console.log(newBookmark.tags);
      await bookmark.save();

      if (path) {
        path.bookmarks.push(bookmark._id);
        await path.save();
      }

      res.status(201).json(bookmark);
    } catch (err) {
      console.error("Error creating bookmark:", err);
      res.status(500).json({ message: "Error creating the bookmark" });
    }
  });

  app.get("/bookmarks", async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User ID is required" });
    }

    try {
      const bookmarks = await Bookmark.find({ userId });
      res.status(200).json(bookmarks);
    } catch (err) {
      console.error("Error retrieving bookmarks:", err);
      res.status(500).json({ message: "Error retrieving from database" });
    }
  });

  app.get("/bookmarks/search", async (req, res) => {
    const { userId, query } = req.query;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User ID is required" });
    }

    try {
      const regex = new RegExp(query, "i");

      const bookmarks = await Bookmark.find({
        $or: [
          { title: regex },
          { tags: { $in: [regex] } },
          { link: regex },
          { description: regex },
        ],
        userId,
      });

      const scoredResults = bookmarks.map((bookmark) => {
        let score = 0;
        if (regex.test(bookmark.title)) score += 10;
        if (bookmark.tags.some((tag) => regex.test(tag))) score += 5;
        if (regex.test(bookmark.link)) score += 3;
        if (regex.test(bookmark.description)) score += 1;
        return { bookmark, score };
      });

      const scoredBookmarks = scoredResults
        .sort((a, b) => b.score - a.score)
        .map((result) => result.bookmark);
      res.status(200).json(scoredBookmarks);
    } catch (err) {
      console.error("Error retrieving bookmarks:", err);
      res.status(500).json({ message: "Error retrieving from database" });
    }
  });

  app.get("/bookmarks/shared", async (req, res) => {
    const { userEmail } = req.query;

    if (!userEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    try {
      const sharedBookmarks = await Bookmark.find({
        sharedWith: userEmail,
      });

      res.status(200).json(sharedBookmarks);
    } catch (error) {
      console.error("Error fetching shared bookmarks:", error);
      res.status(500).json({ message: "Error fetching shared bookmarks" });
    }
  });

  app.delete("/bookmarks/:id", async (req, res) => {
    try {
      const deletedBookmark = await Bookmark.findByIdAndDelete(req.params.id);

      if (!deletedBookmark) {
        return res.status(404).json({ message: "Bookmark not found" });
      }

      res.status(200).json({ message: "Bookmark deleted successfully" });
    } catch (err) {
      console.error("Error deleting bookmark:", err);
      res.status(500).json({ message: "Error deleting from database" });
    }
  });

  app.patch("/bookmarks/swap", async (req, res) => {
    const { bookmark1Id, bookmark2Id, order1, order2 } = req.body;

    try {
      const [bookmark1, bookmark2] = await Promise.all([
        Bookmark.findByIdAndUpdate(
          bookmark1Id,
          { $set: { order: order2 } },
          { new: true }
        ),
        Bookmark.findByIdAndUpdate(
          bookmark2Id,
          { $set: { order: order1 } },
          { new: true }
        ),
      ]);

      if (!bookmark1 || !bookmark2) {
        throw new Error("One or both bookmarks not found");
      }

      res.json({ bookmark1, bookmark2 });
    } catch (error) {
      console.error("Error swapping bookmarks:", error);
      res.status(500).json({ message: "Error swapping bookmarks" });
    }
  });

  app.patch("/bookmarks/:id", async (req, res) => {
    const { id } = req.params;
    const { title, description, tags } = req.body;

    try {
      const updatedBookmark = await Bookmark.findByIdAndUpdate(
        id,
        { title, description, tags },
        { new: true }
      );

      if (!updatedBookmark) {
        return res.status(404).json({ message: "Bookmark not found" });
      }

      res.json(updatedBookmark);
    } catch (error) {
      console.error("Error updating bookmark:", error);
      res.status(500).json({ message: "Error updating bookmark" });
    }
  });

  app.patch("/bookmarks/:id/share", async (req, res) => {
    const { email } = req.body;
    const bookmarkId = req.params.id;

    try {
      const result = await Bookmark.updateOne(
        { _id: bookmarkId },
        { $push: { sharedWith: email } }
      );

      if (result.nModified === 0) {
        return res.status(404).send("Bookmark or shared email not found.");
      }
      res.status(200).send("Bookmark shared.");
    } catch (error) {
      res.status(500).send("Failed to share bookmark.");
    }
  });

  app.patch("/bookmarks/:id/remove-shared-with", async (req, res) => {
    const { email } = req.body;
    const bookmarkId = req.params.id;

    try {
      const result = await Bookmark.updateOne(
        { _id: bookmarkId },
        { $pull: { sharedWith: email } }
      );

      if (result.nModified === 0) {
        return res.status(404).send("Bookmark or shared email not found.");
      }
      res.status(200).send("Shared email removed.");
    } catch (error) {
      res.status(500).send("Failed to update bookmark.");
    }
  });

  app.get("/bookmarks/download", async (req, res) => {
    const { url } = req.query;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        return res.status(response.status).send("Failed to fetch the URL");
      }

      const html = await response.text();
      res.setHeader("Content-Type", "text/html");
      res.send(html);
    } catch (error) {
      console.error("Error fetching the URL:", error);
      res.status(500).send("Failed to fetch the URL");
    }
  });

  // app.post("/bookmarks/generate-pdf", (req, res) => {
  //   const { url, title } = req.body;
  //   if (!url) {
  //     return res.status(400).json({ error: "URL is required" });
  //   }

  //   console.log(Generating PDF for URL: ${url});

  //   res.setHeader("Content-Type", "application/pdf");
  //   res.setHeader(
  //     "Content-Disposition",
  //     attachment; filename="${title || "document"}.pdf"
  //   );

  //   const options = {
  //     pageSize: "A4",
  //     printMediaType: true,
  //     disableSmartShrinking: true,
  //     marginTop: "20mm",
  //     marginBottom: "20mm",
  //     marginLeft: "10mm",
  //     marginRight: "10mm",
  //   };

  //   wkhtmltopdf(url, options)
  //     .on("error", (err) => {
  //       console.error("PDF generation error:", err);
  //       res.status(500).end();
  //     })
  //     .pipe(res);
  // });

  app.post("/bookmarks/generate-pdf", async (req, res) => {
    try {
      const { url, title } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      console.log("Generating PDF for:", url);

      const browser = await getBrowserInstance();
      const page = await browser.newPage();

      await page.setViewport({ width: 1280, height: 800 });

      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      );

      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const resourceType = req.resourceType();
        if (resourceType === "media") {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 }); // Wait until all network activity is idle

      // Wait for the body element to be loaded to ensure page is fully rendered
      await page.waitForSelector("body", { timeout: 10000 }); // Wait for the 'body' element

      await page.emulateMediaType("print");

      // Inject CSS to hide popups and banners
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.type = "text/css";
        style.innerHTML = `
        #onetrust-banner-sdk,
        .cookie-consent,
        .cookie-popup,
        .cookie-banner,
        [id*='cookie'],
        [class*='cookie'],
        [class*='Cookie'],
        [class*='overlay'],
        [class*='Overlay'],
        .modal,
        .popup {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
      `;
        document.head.appendChild(style);
      });

      // Generate the PDF with additional options for better quality
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
        // scale: 1,
        preferCSSPageSize: true,
        landscape: false,
      });

      await page.close();

      if (!pdfBuffer || pdfBuffer.length < 1000) {
        throw new Error(
          "Generated PDF buffer is too small; likely an error occurred."
        );
      }

      // Sanitize the title to avoid file system issues
      function sanitizeFilename(filename) {
        return filename.replace(/[^a-zA-Z0-9-_ ]/g, "");
      }

      const safeTitle = sanitizeFilename(title || "document");

      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachmentl, filename="${safeTitle}.pdf"`,
        "Content-Length": pdfBuffer.length,
      });
      res.end(pdfBuffer, "binary");
    } catch (error) {
      console.error("PDF Generation Failed:", error);
      res.status(500).json({
        error: "Failed to generate PDF",
        details: error.message,
      });
    }
  });

  app.patch("/bookmarks/:id/move", async (req, res) => {
    try {
      const { sourceDirectoryId, targetDirectoryId } = req.body;
      const bookmarkId = req.params.id;

      const updatedBookmark = await Bookmark.findByIdAndUpdate(
        bookmarkId,
        { directoryId: targetDirectoryId },
        { new: true }
      );

      if (!updatedBookmark) {
        return res.status(404).json({ message: "Bookmark not found" });
      }

      if (sourceDirectoryId) {
        await Path.findByIdAndUpdate(sourceDirectoryId, {
          $pull: { bookmarks: bookmarkId },
        });
      }

      await Path.findByIdAndUpdate(targetDirectoryId, {
        $addToSet: { bookmarks: bookmarkId },
      });

      res.json(updatedBookmark);
    } catch (error) {
      console.error("Error moving bookmark:", error);
      res.status(500).json({ message: "Error updating bookmark directory" });
    }
  });

  app.get("/tags", async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User id is required" });
    }

    try {
      const bookmarks = await Bookmark.find({
        userId,
      });

      res.status(200).json(mapTagsToBookmarks(bookmarks));
    } catch (error) {
      console.error("Error fetching shared bookmarks:", error);
      res.status(500).json({ message: "Error fetching shared bookmarks" });
    }
  });
};

function mapTagsToBookmarks(bookmarks) {
  const tagMap = {};

  bookmarks.forEach((bookmark) => {
    if (bookmark.tags.length > 0) {
      bookmark.tags.forEach((tag) => {
        if (!tagMap[tag]) {
          tagMap[tag] = [];
        }
        tagMap[tag].push(bookmark);
      });
    }
  });

  return tagMap;
}
