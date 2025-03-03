import React, { useState, useEffect } from "react";
import { fetchWithRefresh } from "../../scripts/fetchWithRefresh";
import Bookmark from "./Bookmark";
import { Resizable } from "re-resizable";
import BookmarkNav from "./BookmarkNav";
import "./BookmarksContainer.css";

function BookmarksContainer({
  setUserId,
  setUserEmail,
  setUsername,
  setAuthToken,
  setBookmarks,
  userId,
  email,
  username,
  authToken,
  bookmarks,
  setSearchTerm,
}) {
  const [draggedBookmark, setDraggedBookmark] = useState(null);
  const [sortedBookmarks, setSortedBookmarks] = useState([]);
  const [sortOrder, setSortOrder] = useState("custom");
  const [isSwapping, setIsSwapping] = useState(false);
  const [currentDirectory, setCurrentDirectory] = useState("All categories");

  useEffect(() => {
    if (sortOrder === "custom") {
      setSortedBookmarks([...bookmarks].sort((a, b) => a.order - b.order));
    } else {
      sortBookmarks(bookmarks, sortOrder);
    }
  }, [bookmarks, sortOrder]);

  const sortBookmarks = (bookmarks, order) => {
    let sorted = [...bookmarks];
    if (order === "alphabetical-asc") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (order === "alphabetical-desc") {
      sorted.sort((a, b) => b.title.localeCompare(a.title));
    } else if (order === "recent") {
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (order === "oldest") {
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    setSortedBookmarks(sorted);
  };

  useEffect(() => {
    const savedSortOrder = localStorage.getItem("bookmarkSortOrder");
    if (savedSortOrder) {
      console.log(savedSortOrder);
      setSortOrder(savedSortOrder);
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.action === "authDataResponse") {
        const { authToken, userId, email, username } = event.data;
        if (authToken && userId) {
          setAuthToken(authToken);
          setUserId(userId);
          setUserEmail(email);
          setUsername(username);
        } else {
          console.log("Auth data is missing or incorrect.");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ action: "requestAuthData" }, "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const fetchBookmarks = async (token, uid) => {
    try {
      console.log("Fetching bookmarks for user:", uid);
      const response = await fetchWithRefresh(`bookmarks?userId=${uid}`, token);
      const data = await response.json();
      console.log("Raw API response:", data);

      if (Array.isArray(data)) {
        setBookmarks(data);
      } else {
        setBookmarks([]);
      }
    } catch (error) {
      console.error("Error fetching bookmarks:", error);
      setBookmarks([]);
    }
  };

  useEffect(() => {
    if (authToken && userId) {
      fetchBookmarks(authToken, userId);
    }
  }, [authToken, userId]);

  const deleteBookmark = async (id) => {
    try {
      await fetchWithRefresh(`bookmarks/${id}`, authToken, "DELETE");
      setBookmarks(bookmarks.filter((bookmark) => bookmark._id !== id));
    } catch (error) {
      console.error("Error deleting bookmark:", error);
    }
  };

  const handleSortChange = (e) => {
    const order = e.target.value;
    setSortOrder(order);
    localStorage.setItem("bookmarkSortOrder", order);
  };

  const handleDragStart = (bookmarkId, order) => {
    if (sortOrder !== "custom") return;
    setDraggedBookmark({ id: bookmarkId, order });
  };

  const handleDragEnd = () => {
    setDraggedBookmark(null);
    setIsSwapping(false);
  };

  const handleDragOver = (e) => {
    const mouseY = e.clientY;
    const viewportHeight = window.innerHeight;

    const scrollThreshold = 550;
    const scrollSpeed = 40;

    if (mouseY < scrollThreshold) {
      window.scrollBy(0, -scrollSpeed);
    }

    if (mouseY > viewportHeight - scrollThreshold) {
      window.scrollBy(0, scrollSpeed);
    }
  };

  const onUpdate = (bookmarkId, updatedBookmark) => {
    const newBookmarks = bookmarks.filter(
      (bookmark) => bookmark._id !== bookmarkId
    );

    newBookmarks.push(updatedBookmark);
    setBookmarks(newBookmarks);
  };

  const handleDrop = async (draggedId, draggedOrder, targetId, targetOrder) => {
    if (sortOrder !== "custom") return;
    if (draggedId === targetId) return;

    const draggedIndex = sortedBookmarks.findIndex((b) => b._id === draggedId);
    const targetIndex = sortedBookmarks.findIndex((b) => b._id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    setIsSwapping(true);

    const updatedBookmarks = [...sortedBookmarks];
    [updatedBookmarks[draggedIndex], updatedBookmarks[targetIndex]] = [
      updatedBookmarks[targetIndex],
      updatedBookmarks[draggedIndex],
    ];
    setSortedBookmarks(updatedBookmarks);

    try {
      await fetchWithRefresh("bookmarks/swap", authToken, "PATCH", {
        bookmark1Id: draggedId,
        bookmark2Id: targetId,
        order1: draggedOrder,
        order2: targetOrder,
      });
    } catch (error) {
      console.error("Error swapping bookmarks:", error);
      setSortedBookmarks([...sortedBookmarks]);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div style={{ display: "flex" }}>
      <Resizable
        defaultSize={{
          width: 300,
          height: "100vh",
        }}
        minWidth={260}
        maxWidth={500}
        enable={{
          right: true,
          left: false,
          top: false,
          bottom: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
        handleStyles={{
          right: {
            width: "10px",
            right: "-5px",
            top: 0,
            bottom: 0,
            background: "#ccc",
            cursor: "col-resize",
          },
        }}
        style={{
          borderRight: "1px solid #ddd",
        }}
        className="resizable-container"
      >
        <BookmarkNav
          onFolderSelect={setCurrentDirectory}
          setBookmarks={setBookmarks}
          currentDirectory={currentDirectory}
          setSearchTerm={setSearchTerm}
          userId={userId}
          authToken={authToken}
          email={email}
          isShared={(bookmark) => bookmark.sharedWith?.includes(email)}
          username={username}
        />
      </Resizable>
      <div className="bookmarks-content">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2>{currentDirectory}</h2>
          <select
            value={sortOrder}
            onChange={handleSortChange}
            className="sort-select"
            aria-label="Sort bookmarks"
          >
            <option value="custom">Custom</option>
            <option value="alphabetical-asc">
              Sort Alphabetically Ascendant
            </option>
            <option value="alphabetical-desc">
              Sort Alphabetically Descendant
            </option>
            <option value="recent">Sort by Most Recent</option>
            <option value="oldest">Sort by Oldest</option>
          </select>
        </div>
        <div className="bookmarks-grid">
          {sortedBookmarks.length > 0 ? (
            sortedBookmarks.map((bookmark) => (
              <Bookmark
                key={bookmark._id}
                {...bookmark}
                authToken={authToken}
                onDelete={deleteBookmark}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onUpdate={onUpdate}
                setSearchTerm={setSearchTerm}
                order={bookmark.order}
                isDragging={draggedBookmark?.id === bookmark._id}
                style={{
                  opacity: draggedBookmark?.id === bookmark._id ? 0.5 : 1,
                }}
                isShared={bookmark.sharedWith?.includes(email)}
              />
            ))
          ) : (
            <p>No bookmarks found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookmarksContainer;
