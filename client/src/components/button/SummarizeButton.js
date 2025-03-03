import { useState } from "react";
import "./SummarizeButton.css";

export default function SummarizeButton({ onSummarize }) {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState("");

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await onSummarize();
      setSummary(result);
    } catch (error) {
      console.error("Failed to summarize:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`summarize-button ${loading ? "loading" : ""}`}
        aria-label="Summarize"
      >
        <div className="button-content">
          {loading ? (
            <div className="spinner" />
          ) : (
            <img
              src="https://static.thenounproject.com/png/6480915-200.png"
              alt="summarize"
              className="button-image"
            />
          )}
          {loading && <div className="shimmer" />}
        </div>
      </button>

      {summary && (
        <div className="summary">
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}
