const path = require("path");
const { PythonShell } = require("python-shell");
const natural = require("natural");
const { removeStopwords, ron } = require("stopword");
const pos = require("pos");
const languageDetect = require("langdetect");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const { bookmarksConn } = require("../config/dbConnections");
const Bookmark = require("../models/bookmark")(bookmarksConn);

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();
const tagger = new pos.Tagger();

function summarizeWithSumy(url, numSentences, algorithmIndex) {
  const options = {
    mode: "text",
    pythonPath:
      "C:\\Users\\laure\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
    pythonOptions: ["-u"],
    scriptPath: path.resolve(__dirname, "../scripts"),
    args: [url, numSentences.toString(), algorithmIndex.toString()],
  };

  return new Promise((resolve, reject) => {
    console.log("Starting Python script execution...");

    const shell = new PythonShell("summarizer.py", options);

    let output = [];

    shell.on("message", (message) => {
      console.log("Python message:", message);
      output.push(message);
    });

    shell.end((err, code, signal) => {
      if (err) {
        console.error("Error in PythonShell:", err);
        reject(err);
      } else {
        if (output.length > 0) {
          resolve(output.join("\n"));
        } else {
          console.log("No results");
          resolve("No summary generated");
        }
      }
    });
  });
}

const urlRequestTracker = {};

module.exports = (app) => {
  app.post("/processing/description", async (req, res) => {
    try {
      const { url, numSentences } = req.body;

      if (!url || typeof numSentences !== "number" || numSentences < 1) {
        return res
          .status(400)
          .json({ message: "Valid URL and sentence count are required" });
      }

      const algorithmIndex = determineAlgorithmIndex(url);
      const data = await summarizeWithSumy(url, numSentences, algorithmIndex);

      urlRequestTracker[url].count++;
      urlRequestTracker[url].timestamp = Date.now();

      return res.status(200).json({ success: true, summary: data });
    } catch (error) {
      console.error("Error processing request:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to process request" });
    }
  });

  function determineAlgorithmIndex(url) {
    const currentTime = Date.now();

    if (
      urlRequestTracker[url] &&
      currentTime - urlRequestTracker[url].timestamp > 10 * 60 * 1000
    ) {
      console.log("Resetting URL tracker for", url);
      urlRequestTracker[url].count = 0;
    }

    if (!urlRequestTracker[url]) {
      urlRequestTracker[url] = { count: 0, timestamp: currentTime };
    }

    const algorithmIndex = urlRequestTracker[url].count % 6;
    return algorithmIndex;
  }

  app.post("/processing/tags", async (req, res) => {
    try {
      const translateText = async (text, fromLang, toLang) => {
        try {
          const translate = await import("translate");
          translate.engine = "libre";
          return await translate.default(text.slice(0, 6000), {
            from: fromLang,
            to: toLang,
          });
        } catch (error) {
          console.error("Translation error:", error.message || error);
          throw new Error("Translation failed");
        }
      };

      const { url, id, tagsNo } = req.body;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const html = await response.text();

      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      if (!article || !article.textContent) {
        return res.status(500).json({
          success: false,
          message: "Failed to extract main content from URL",
        });
      }

      const text = article.textContent;
      const detectedLang = languageDetect.detectOne(text);
      const translatedText = await translateText(text, detectedLang, "en");

      const cleanedText = translatedText
        .replace(/[^a-zA-Z\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      const tokens = tokenizer.tokenize(cleanedText);
      const wordsWithoutStopwords = removeStopwords(tokens, ron);
      const taggedWords = tagger.tag(wordsWithoutStopwords);

      const nounPhrases = [];
      for (let i = 0; i < taggedWords.length; i++) {
        const [word, tag] = taggedWords[i];

        if (tag.startsWith("NN")) {
          nounPhrases.push(word);
        }

        if (i < taggedWords.length - 1) {
          const [nextWord, nextTag] = taggedWords[i + 1];
          if (
            (tag.startsWith("JJ") && nextTag.startsWith("NN")) ||
            (tag.startsWith("NN") && nextTag.startsWith("NN"))
          ) {
            if (word === nextWord) continue;
            nounPhrases.push(`${word} ${nextWord}`);
          }
        }
      }

      function levenshtein(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
          matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
          matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(
                matrix[i - 1][j - 1] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j] + 1
              );
            }
          }
        }
        return matrix[b.length][a.length];
      }

      function areSimilar(tag1, tag2) {
        if (tag1 === tag2) return true;
        const distance = levenshtein(tag1, tag2);
        const normalizedDistance =
          distance / Math.max(tag1.length, tag2.length);
        return normalizedDistance < 0.3;
      }

      const tfidf = new TfIdf();
      tfidf.addDocument(cleanedText);

      const scoredPhrases = nounPhrases.map((phrase) => ({
        phrase,
        score:
          phrase
            .split(" ")
            .reduce((score, word) => score + tfidf.tfidf(word, 0), 0) *
          (phrase.includes(" ") ? 0.2 : 1),
      }));

      const sortedScoredPhrases = scoredPhrases.sort(
        (a, b) => b.score - a.score
      );

      const uniqueTags = [];
      for (const item of sortedScoredPhrases) {
        const phrase = item.phrase;
        if (uniqueTags.some((existing) => areSimilar(existing, phrase))) {
          continue;
        }
        uniqueTags.push(phrase);
        if (uniqueTags.length === tagsNo) break;
      }
      const topTags = uniqueTags.slice(0, tagsNo);

      const translatedTags = [];
      for (const tag of topTags) {
        const translatedTag = await translateText(tag, "en", detectedLang);
        translatedTags.push(translatedTag);
      }

      console.log("Final tags:", translatedTags);
      if (id) {
        await Bookmark.findByIdAndUpdate(
          id,
          { tags: translatedTags },
          { new: true }
        );
      }

      return res.status(200).json({
        success: true,
        tags: translatedTags,
      });
    } catch (error) {
      console.error("Error processing request:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to process request",
      });
    }
  });
};
