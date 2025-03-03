import React, { useState, useRef } from "react";
import "./Bookmark.css";
import { fetchWithRefresh } from "../../scripts/fetchWithRefresh";
import SummarizeButton from "../button/SummarizeButton";
import ExpandableMenuButton from "../button/ExpandableMenuButton";
import DownloadButton from "../button/DownloadButton";
import { Download, Share2, Pencil, Trash2 } from "lucide-react";

async function getSummary(url, numSentences, authToken) {
  const response = await fetchWithRefresh(
    `processing/description`,
    authToken,
    "POST",
    { url: url, numSentences: numSentences }
  );
  const data = await response.json();
  return data.summary;
}

function Bookmark({
  _id,
  title,
  description,
  link,
  imagesLinks,
  tags,
  authToken,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onUpdate,
  order,
  isDragging,
  setSearchTerm,
  style,
  isShared,
}) {
  const [summary, setSummary] = useState("");
  const [isSummaryVisible, setIsSummaryVisible] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [shareEmail, setShareEmail] = useState("");
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const bookmarkRef = useRef(null);
  const [editData, setEditData] = useState({
    title: title || "",
    description: description || "",
    tags: tags || [],
  });

  const handleSummarize = async () => {
    try {
      setIsLoading(true);
      const summaryText = await getSummary(link, 4, authToken);
      setSummary(summaryText);
      setIsSummaryVisible(true);
      setError("");
    } catch (err) {
      setError("Failed to generate summary");
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    setIsSharePopupOpen(true);
  };

  const handleShareSubmit = async () => {
    if (!validateEmail(shareEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setError("");
      const response = await fetchWithRefresh(
        `bookmarks/${_id}/share`,
        authToken,
        "PATCH",
        { email: shareEmail }
      );

      if (!response.ok) {
        throw new Error("Failed to share the bookmark.");
      }

      setError("");
      setSuccessMessage("Bookmark shared successfully!");
      setTimeout(() => {
        setSuccessMessage("");
        setIsSharePopupOpen(false);
        setShareEmail("");
      }, 1500);
    } catch (err) {
      setError("Failed to share bookmark.");
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleCollapse = () => {
    setIsSummaryVisible(!isSummaryVisible);
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData("bookmarkId", _id);
    e.dataTransfer.setData("bookmarkOrder", order);
    onDragStart(_id, order);
    bookmarkRef.current.classList.add("dragging");

    if (bookmarkRef.current) {
      const rect = bookmarkRef.current.getBoundingClientRect();
      e.dataTransfer.setDragImage(
        bookmarkRef.current,
        rect.width / 2,
        rect.height / 2
      );
    }
  };

  const handleDragEnd = () => {
    bookmarkRef.current.classList.remove("dragging");
    onDragEnd();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    onDragOver(e);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("bookmarkId");
    const draggedOrder = parseInt(e.dataTransfer.getData("bookmarkOrder"));
    onDrop(draggedId, draggedOrder, _id, order);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    setError("");
    if (!isEditing) {
      setEditData({
        title: title || "",
        description: description || "",
        tags: tags || [],
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    setError("");
  };

  const handleTagsChange = (e) => {
    setEditData((prevData) => ({
      ...prevData,
      tags: e.target.value.split(",").map((tag) => tag.trim()),
    }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editData.title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetchWithRefresh(
        `bookmarks/${_id}`,
        authToken,
        "PATCH",
        editData
      );

      if (!response.ok) {
        throw new Error("Failed to update bookmark");
      }

      const updatedBookmark = await response.json();
      onUpdate(_id, updatedBookmark);
    } catch (error) {
      setError(error.message || "Error updating bookmark");
    } finally {
      setIsEditing(false);
      setError("");
      setIsLoading(false);
    }
  };

  const menuItems = [
    {
      label: "Share",
      icon: <Share2 width="18px" />,
      onClick: handleShare,
    },
    {
      icon: <Download width="18px" />,
      component: (
        <DownloadButton link={link} title={title} authToken={authToken} />
      ),
    },
  ];

  return (
    <div
      ref={bookmarkRef}
      className={`bookmark-card ${isDragging ? "dragging" : ""} ${
        isEditing ? "editing" : ""
      }`}
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        ...style,
        transition: "transform 0.3s ease-in-out, opacity 0.3s ease-in-out",
      }}
    >
      {imagesLinks && imagesLinks.length > 0 && (
        <div className="image-container">
          <img src={imagesLinks[0]} alt={title} className="bookmark-image" />
          <div className="more-options-container">
            <ExpandableMenuButton
              menuItems={menuItems}
              className="bookmark-menu"
            />
          </div>
          {tags && tags.length > 0 && (
            <div className="tags-overlay">
              <div className="bookmark-tags">
                {tags.map((tag, index) => (
                  <span
                    key={index}
                    className="tag"
                    onClick={(e) => setSearchTerm(tag)}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bookmark-content">
        {isSharePopupOpen && (
          <>
            <div
              className="overlay"
              onClick={() => setIsSharePopupOpen(false)}
            />
            <div className="share-popup">
              <h4>Share Bookmark</h4>
              {successMessage ? (
                <p className="success-message">{successMessage}</p>
              ) : (
                <>
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="Enter email"
                  />
                  <button type="button" onClick={handleShareSubmit}>
                    Share
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSharePopupOpen(false)}
                  >
                    Cancel
                  </button>
                  {error && <p className="error-message">{error}</p>}
                </>
              )}
            </div>
          </>
        )}

        {isEditing ? (
          <div className="editing-container">
            <form
              onSubmit={handleEditSubmit}
              className={`edit-form ${isLoading ? "loading" : ""}`}
            >
              <div className="edit-form-field">
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  type="text"
                  name="title"
                  value={editData.title}
                  onChange={handleInputChange}
                  placeholder="Enter title"
                  disabled={isLoading}
                />
              </div>

              <div className="edit-form-field">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={editData.description}
                  onChange={handleInputChange}
                  placeholder="Enter description"
                  disabled={isLoading}
                />
              </div>

              <div className="edit-form-field">
                <label htmlFor="tags">Tags</label>
                <input
                  id="tags"
                  type="text"
                  name="tags"
                  value={editData.tags.join(", ")}
                  onChange={handleTagsChange}
                  placeholder="Enter tags (comma-separated)"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="error-message">
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <div className="edit-form-buttons">
                <button
                  type="button"
                  onClick={handleEditToggle}
                  className="cancel-btn"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="save-btn" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save  "}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="bookmark-url"
              >
                <h3>{title}</h3>
              </a>
            )}
            {description && (
              <p className="bookmark-description">{description}</p>
            )}
            {summary && (
              <div className="bookmark-summary">
                {isSummaryVisible ? <p>{summary}</p> : null}
                <button
                  className={`collapse-btn ${
                    isSummaryVisible ? "expanded" : ""
                  }`}
                  onClick={handleCollapse}
                >
                  {isSummaryVisible ? "▼ Collapse" : ""}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!isEditing && (
        <div className="bookmark-actions">
          {isShared ? (
            <SummarizeButton onSummarize={handleSummarize} />
          ) : (
            <>
              <SummarizeButton onSummarize={handleSummarize} />
              <button onClick={() => onDelete(_id)} className="delete-btn">
                <Trash2 />
              </button>
              <button onClick={handleEditToggle} className="edit-btn">
                <Pencil />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Bookmark;
