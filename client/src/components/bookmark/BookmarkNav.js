import React, { useState, useEffect } from "react";
import "./BookmarkNav.css";
import { fetchWithRefresh } from "../../scripts/fetchWithRefresh";
import { UsersRound, BookMarked, Tag } from "lucide-react";

function BookmarkNav({
  onFolderSelect,
  userId,
  authToken,
  setBookmarks,
  email,
  username,
  isShared,
  setSearchTerm,
}) {
  const [directories, setDirectories] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [editingDir, setEditingDir] = useState(null);
  const [editName, setEditName] = useState("");
  const [newDirName, setNewDirName] = useState("");
  const [addingSubdirTo, setAddingSubdirTo] = useState(null);
  const [newSubdirName, setNewSubdirName] = useState("");
  const [selectedDir, setSelectedDir] = useState(null);
  const [sharedBookmarks, setSharedBookmarks] = useState([]);
  const [selectedView, setSelectedView] = useState("my-bookmarks");
  const [tags, setTags] = useState({});

  useEffect(() => {
    fetchDirectories();
    fetchTags();
    if (email) {
      fetchSharedBookmarks();
    }
  }, [userId, authToken, email]);

  const fetchSharedBookmarks = async () => {
    if (!email || !authToken) return;

    try {
      const response = await fetchWithRefresh(
        `bookmarks/shared?userEmail=${email}`,
        authToken
      );
      if (!response.ok) throw new Error("Failed to fetch shared bookmarks");
      const data = await response.json();
      setSharedBookmarks(data);
    } catch (error) {
      console.error("Error fetching shared bookmarks:", error);
      setSharedBookmarks([]);
    }
  };

  const fetchDirectories = async () => {
    if (!userId || !authToken) return;

    try {
      const query = new URLSearchParams({ userId }).toString();
      const response = await fetchWithRefresh(`paths?${query}`, authToken);
      if (!response.ok) throw new Error("Failed to fetch directories");

      const data = await response.json();
      setDirectories([
        { _id: "all-bookmarks", path: "All Bookmarks", children: [] },
        ...data,
      ]);
    } catch (error) {
      console.error("Error fetching directories:", error);
      setDirectories([]);
    }
  };

  const fetchTags = async () => {
    if (!userId || !authToken) return;

    try {
      const query = new URLSearchParams({ userId }).toString();
      const response = await fetchWithRefresh(`tags?${query}`, authToken);
      if (!response.ok) throw new Error("Failed to fetch tags");

      const data = await response.json();

      setTags(data);
      return data;
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const toggleFolder = (folderId, e) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const getDirectoryDepth = (directoryId) => {
    let depth = 0;
    const findDirectoryById = (id, dirs) => {
      for (const dir of dirs) {
        if (dir._id === id) return dir;
        if (dir.children?.length) {
          const result = findDirectoryById(id, dir.children);
          if (result) return result;
        }
      }
      return null;
    };

    let current = findDirectoryById(directoryId, directories);
    while (current && current.parentId) {
      current = findDirectoryById(current.parentId, directories);
      depth++;
    }
    return depth;
  };

  const handleEditStart = (directory, e) => {
    e.stopPropagation();
    setEditingDir(directory._id);
    setEditName(directory.path);
  };

  const handleEditSave = async (e) => {
    e.stopPropagation();
    if (!editName.trim() || !editingDir || !userId || !authToken) return;

    try {
      const response = await fetchWithRefresh(
        `paths/${editingDir}`,
        authToken,
        "PUT",
        { path: editName }
      );
      if (!response.ok) throw new Error("Failed to rename directory");
      await fetchDirectories();
      setEditingDir(null);
      setEditName("");
    } catch (error) {
      console.error("Error updating directory name:", error);
    }
  };

  const deleteDirectoryWithChildren = async (dirId) => {
    const findDirectoryById = (id, dirs) => {
      for (const dir of dirs) {
        if (dir._id === id) return dir;
        if (dir.children?.length) {
          const result = findDirectoryById(id, dir.children);
          if (result) return result;
        }
      }
      return null;
    };

    const queue = [dirId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      const currentDir = findDirectoryById(currentId, directories);
      if (currentDir && currentDir.children) {
        queue.push(...currentDir.children.map((child) => child._id));
      }
      try {
        await fetchWithRefresh(`paths/${currentId}`, authToken, "DELETE");
      } catch (error) {
        console.error(
          `Failed to delete directory with id ${currentId}:`,
          error
        );
      }
    }
  };

  const handleDeleteDirectory = async (dirId, e) => {
    e.stopPropagation();
    if (!dirId || !userId || !authToken) return;

    try {
      await deleteDirectoryWithChildren(dirId);
      if (selectedDir === dirId) {
        setSelectedDir(null);
        setBookmarks([]);
      }
      await fetchDirectories();
    } catch (error) {
      console.error("Error deleting directory:", error);
    }
  };

  const handleAddRootDirectory = async (e) => {
    e.preventDefault();
    if (!newDirName.trim() || !userId || !authToken) return;

    try {
      const response = await fetchWithRefresh("paths", authToken, "POST", {
        path: newDirName,
        userId,
        parentId: null,
      });
      if (!response.ok) throw new Error("Failed to add directory");
      await fetchDirectories();
      setNewDirName("");
    } catch (error) {
      console.error("Error adding directory:", error);
    }
  };

  const handleAddSubdirectory = async (parentId, e) => {
    e.stopPropagation();
    if (!newSubdirName.trim() || !userId || !authToken) return;

    try {
      const response = await fetchWithRefresh("paths", authToken, "POST", {
        path: newSubdirName,
        userId,
        parentId,
      });
      if (!response.ok) throw new Error("Failed to add subdirectory");
      await fetchDirectories();
      setAddingSubdirTo(null);
      setNewSubdirName("");
    } catch (error) {
      console.error("Error adding subdirectory:", error);
    }
  };

  const handleSelectDirectory = async (directory, e) => {
    e.stopPropagation();
    setSearchTerm("");
    onFolderSelect(directory.path);
    setSelectedDir(directory._id);

    if (directory._id === "all-bookmarks") {
      try {
        const response = await fetchWithRefresh(
          `bookmarks?userId=${userId}`,
          authToken
        );
        if (!response.ok) throw new Error("Failed to fetch bookmarks");
        const bookmarks = await response.json();
        setBookmarks(bookmarks);
      } catch (error) {
        console.error("Error fetching bookmarks:", error);
      }
    } else {
      try {
        const response = await fetchWithRefresh(
          `paths/${directory._id}`,
          authToken
        );
        if (!response.ok) throw new Error("Failed to fetch directory");
        const data = await response.json();
        setBookmarks(data.bookmarks || []);
      } catch (error) {
        console.error("Error fetching directory bookmarks:", error);
        setBookmarks([]);
      }
    }
  };

  const handleRemoveBookmark = async (bookmarkId, directoryId, e) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      const response = await fetchWithRefresh(
        `paths/${directoryId}/bookmarks/${bookmarkId}`,
        authToken,
        "DELETE"
      );

      if (!response.ok)
        throw new Error("Failed to remove bookmark from directory");

      await fetchDirectories();

      if (selectedDir === directoryId) {
        const dirResponse = await fetchWithRefresh(
          `paths/${directoryId}`,
          authToken
        );
        if (dirResponse.ok) {
          const data = await dirResponse.json();
          setBookmarks(data.bookmarks || []);
        }
      }
    } catch (error) {
      console.error("Error removing bookmark:", error);
    }
  };

  const handleRemoveSharedBookmark = async (bookmarkId, email, e) => {
    e.stopPropagation();
    try {
      const response = await fetchWithRefresh(
        `bookmarks/${bookmarkId}/remove-shared-with`,
        authToken,
        "PATCH",
        { email }
      );

      if (!response.ok) throw new Error("Failed to update bookmark sharing");
      setSharedBookmarks((prev) =>
        prev.filter(
          (bookmark) =>
            bookmark._id !== bookmarkId || !bookmark.sharedWith.includes(email)
        )
      );
      setBookmarks((prev) =>
        prev.filter((bookmark) => bookmark._id !== bookmarkId)
      );
    } catch (error) {
      console.error("Error removing email from shared bookmark:", error);
    }
  };

  const renderBookmark = (bookmark, currentDirectory, email) => {
    if (!bookmark) return null;
    let faviconUrl;
    try {
      const url = new URL(bookmark.link);
      faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}`;
    } catch (e) {
      faviconUrl = "";
    }
    const handleRemove = (e) => {
      if (isShared(bookmark)) {
        handleRemoveSharedBookmark(bookmark._id, email, e);
      } else {
        handleRemoveBookmark(bookmark._id, currentDirectory, e);
      }
    };

    return (
      <div
        key={bookmark._id}
        draggable
        onDragStart={(e) => {
          e.currentTarget.classList.add("dragging");
          e.dataTransfer.setData("bookmarkId", bookmark._id);
          e.dataTransfer.setData("sourceDirectoryId", currentDirectory || "");
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={(e) => {
          e.currentTarget.classList.remove("dragging");
        }}
        className="bookmark-item"
      >
        <button
          className="bookmark-remove"
          onClick={handleRemove}
          title={
            isShared(bookmark) ? "Remove from shared" : "Remove from folder"
          }
        >
          ×
        </button>
        <a
          href={bookmark.link}
          className="bookmark-link"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {faviconUrl && (
            <img
              src={faviconUrl}
              alt=""
              className="bookmark-favicon"
              onError={(e) => (e.target.style.display = "none")}
            />
          )}
          <span className="bookmark-name">{bookmark.title || "Untitled"}</span>
        </a>
      </div>
    );
  };

  const renderTagBookmark = (bookmark) => {
    if (!bookmark) return null;
    let faviconUrl;
    try {
      const url = new URL(bookmark.link);
      faviconUrl = `https://www.google.com/s2/favicons?domain=${url.hostname}`;
    } catch (e) {
      faviconUrl = "";
    }
    return (
      <div
        key={bookmark._id}
        className="bookmark-item"
        style={{ paddingLeft: `16px` }}
      >
        <a
          href={bookmark.link}
          className="bookmark-link"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          {faviconUrl && (
            <img
              src={faviconUrl}
              alt=""
              className="bookmark-favicon"
              onError={(e) => (e.target.style.display = "none")}
            />
          )}
          <span className="bookmark-name">{bookmark.title || "Untitled"}</span>
        </a>
      </div>
    );
  };

  const renderDirectory = (directory, depth = 0) => {
    const isExpanded = expandedFolders.has(directory._id);
    const hasChildren =
      directory.children?.length > 0 || directory.bookmarks?.length > 0;
    const directoryDepth = getDirectoryDepth(directory._id);
    const canAddSubdirectory = directoryDepth < 2;

    return (
      <div key={directory._id} className="directory-item">
        <div
          className={`directory-content ${
            selectedDir === directory._id ? "selected" : ""
          }`}
          onClick={(e) => handleSelectDirectory(directory, e)}
          style={{ paddingLeft: `${depth * 16}px` }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, directory._id)}
        >
          {hasChildren && editingDir !== directory._id && (
            <button
              className="collapse-button"
              onClick={(e) => toggleFolder(directory._id, e)}
            >
              {isExpanded ? "−" : "+"}
            </button>
          )}
          {!hasChildren && (
            <span className="collapse-button-placeholder"></span>
          )}

          {editingDir === directory._id ? (
            <div className="edit-form-nav" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleEditSave(e);
                  if (e.key === "Escape") {
                    setEditingDir(null);
                    setEditName("");
                  }
                }}
                autoFocus
              />
              <div className="edit-form-nav-buttons">
                <button onClick={(e) => handleEditSave(e)}>Save</button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDir(null);
                    setEditName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="directory-name">{directory.path}</span>
              <div className="directory-actions">
                {canAddSubdirectory && directory._id !== "all-bookmarks" && (
                  <button
                    className="action-button add-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddingSubdirTo(directory._id);
                    }}
                    title="Add subfolder"
                  >
                    +
                  </button>
                )}
                {directory._id !== "all-bookmarks" && (
                  <>
                    <button
                      className="action-button edit-button"
                      onClick={(e) => handleEditStart(directory, e)}
                      title="Edit folder"
                    >
                      ✎
                    </button>
                    <button
                      className="action-button delete-button"
                      onClick={(e) => handleDeleteDirectory(directory._id, e)}
                      title="Delete folder"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {isExpanded && (
          <div className="directory-children">
            {directory.children?.map((child) =>
              renderDirectory(child, depth + 1)
            )}
            {directory.bookmarks?.map((bookmark) =>
              renderBookmark(bookmark, directory._id)
            )}
          </div>
        )}

        {addingSubdirTo === directory._id && (
          <div className="directory-children">
            <div
              className="add-subdir-form"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={newSubdirName}
                onChange={(e) => setNewSubdirName(e.target.value)}
                placeholder="New subfolder"
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    handleAddSubdirectory(directory._id, e);
                }}
                autoFocus
              />
              <div className="add-subdir-form-buttons">
                <button
                  onClick={(e) => handleAddSubdirectory(directory._id, e)}
                >
                  Add
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddingSubdirTo(null);
                    setNewSubdirName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSelectSharedBookmarks = async (e) => {
    e.stopPropagation();
    onFolderSelect("Shared with me");
    setSelectedDir("shared");
    setBookmarks(sharedBookmarks);
  };

  const handleSelectSharedBookmarksFromUser = async (e, username) => {
    e.stopPropagation();
    const filteredBookmarks = sharedBookmarks.filter(
      (bookmark) => bookmark.username === username
    );
    setBookmarks(filteredBookmarks);
  };

  const sharedBookmarksMap = sharedBookmarks.reduce((map, bookmark) => {
    const { username } = bookmark;
    if (!map[username]) {
      map[username] = [];
    }
    map[username].push(bookmark);
    return map;
  }, {});

  const renderSharedWithMe = () => {
    const isExpanded = expandedFolders.has("shared");

    return (
      <div key="shared" className="directory-item">
        <div
          className="directory-content"
          onClick={handleSelectSharedBookmarks}
          style={{ paddingLeft: "0px" }}
        >
          <button
            className="collapse-button"
            onClick={(e) => toggleFolder("shared", e)}
          >
            {isExpanded ? "−" : "+"}
          </button>
          <span className="directory-name">Shared with me</span>
        </div>

        {isExpanded && (
          <div className="directory-children">
            {Object.entries(sharedBookmarksMap).map(([username, bookmarks]) => {
              return (
                <div key={username}>
                  <div
                    className="directory-content"
                    onClick={(e) => {
                      handleSelectSharedBookmarksFromUser(e, username);
                    }}
                    style={{ paddingLeft: "32px" }}
                  >
                    <button
                      className="collapse-button"
                      onClick={(e) => toggleFolder(username, e)}
                    >
                      {expandedFolders.has(username) ? "−" : "+"}
                    </button>
                    <span className="directory-name">{username}</span>
                  </div>

                  {expandedFolders.has(username) && (
                    <div className="directory-children">
                      {bookmarks?.map((bookmark) =>
                        renderBookmark(bookmark, " ", email)
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderTags = () => {
    return Object.entries(tags)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tag, bookmarks]) => {
        const isExpanded = expandedFolders.has(tag);
        return (
          <div key={tag} className="directory-item">
            <div
              className="directory-content"
              onClick={(e) => {
                e.stopPropagation();
                setBookmarks(bookmarks);
                onFolderSelect(tag);
                setExpandedFolders((prev) => {
                  const newSet = new Set(prev);
                  if (newSet.has(tag)) {
                    newSet.delete(tag);
                  } else {
                    newSet.add(tag);
                  }
                  return newSet;
                });
              }}
              style={{ paddingLeft: "16px" }}
            >
              <button className="collapse-button">
                {isExpanded ? "−" : "+"}
              </button>
              <span className="directory-name">{tag}</span>
            </div>
            {isExpanded && (
              <div className="directory-children">
                {bookmarks.map((bookmark) => renderTagBookmark(bookmark))}
              </div>
            )}
          </div>
        );
      });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    const directoryContent = e.target.closest(".directory-content");
    if (directoryContent && !directoryContent.classList.contains("drag-over")) {
      document.querySelectorAll(".drag-over").forEach((el) => {
        el.classList.remove("drag-over");
      });
      directoryContent.classList.add("drag-over");
    }
  };

  const handleDragLeave = (e) => {
    const directoryContent = e.target.closest(".directory-content");
    if (directoryContent && !directoryContent.contains(e.relatedTarget)) {
      directoryContent.classList.remove("drag-over");
    }
  };

  const handleDrop = async (e, targetDirectoryId) => {
    e.preventDefault();
    const directoryContent = e.target.closest(".directory-content");
    if (directoryContent) {
      directoryContent.classList.remove("drag-over");
    }

    const bookmarkId = e.dataTransfer.getData("bookmarkId");
    const sourceDirectoryId = e.dataTransfer.getData("sourceDirectoryId");

    if (!bookmarkId || targetDirectoryId === sourceDirectoryId) return;

    try {
      const response = await fetchWithRefresh(
        `bookmarks/${bookmarkId}/move`,
        authToken,
        "PATCH",
        {
          targetDirectoryId,
          sourceDirectoryId: sourceDirectoryId || null,
        }
      );

      if (!response.ok) throw new Error("Failed to move bookmark");

      await fetchDirectories();

      if (
        selectedDir === sourceDirectoryId ||
        selectedDir === targetDirectoryId
      ) {
        const dirResponse = await fetchWithRefresh(
          `paths/${selectedDir}`,
          authToken
        );
        if (dirResponse.ok) {
          const data = await dirResponse.json();
          setBookmarks(data.bookmarks || []);
        }
      }
    } catch (error) {
      console.error("Error moving bookmark:", error);
    }
  };

  const handleViewChange = (view) => {
    setSelectedView(view);
    if (view === "shared") {
      setBookmarks(sharedBookmarks);
      onFolderSelect("Shared with me");
    } else {
      handleSelectDirectory(
        {
          path: "All Bookmarks",
          _id: "all-bookmarks",
        },
        { stopPropagation: () => {} }
      );
    }
  };

  return (
    <nav className="bookmark-nav">
      <h3 className="root-title">Welcome {username}!</h3>
      <div className="view-selector">
        <button
          className={`view-button ${
            selectedView === "my-bookmarks" ? "active" : ""
          }`}
          onClick={() => handleViewChange("my-bookmarks")}
        >
          <BookMarked />
        </button>
        <button
          className={`view-button ${selectedView === "tags" ? "active" : ""}`}
          onClick={() => handleViewChange("tags")}
        >
          <Tag />
        </button>
        <button
          className={`view-button ${
            selectedView === "shared" ? "active" : ""
          } shared-button`}
          onClick={() => handleViewChange("shared")}
        >
          <>
            <UsersRound />
          </>
        </button>
      </div>
      {selectedView === "my-bookmarks" && (
        <form onSubmit={handleAddRootDirectory} className="add-root-form">
          <input
            type="text"
            value={newDirName}
            onChange={(e) => setNewDirName(e.target.value)}
            placeholder="New folder name"
            className="root-input"
          />
          <button type="submit" className="styled-add-button">
            Add Folder
          </button>
        </form>
      )}

      <div className="directories-list">
        {selectedView === "my-bookmarks" &&
          directories.map((directory) => renderDirectory(directory))}
        {selectedView === "shared" && renderSharedWithMe()}
        {selectedView === "tags" && renderTags()}
      </div>
    </nav>
  );
}

export default BookmarkNav;
