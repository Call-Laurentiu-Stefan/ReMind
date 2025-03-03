import React, { useState, useEffect, useRef } from "react";
import icon from "../../resources/loupe.png";
import { fetchWithRefresh } from "../../scripts/fetchWithRefresh";

function SearchBar({ userId, authToken, setBookmarks, query, setQuery }) {
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);

  const searchBookmarks = async (searchQuery) => {
    if (searchQuery && searchQuery.trim()) {
      try {
        setIsSearching(true);
        const response = await fetchWithRefresh(
          `bookmarks/search?userId=${userId}&query=${searchQuery}`,
          authToken,
          "GET"
        );
        const data = await response.json();
        setBookmarks(data);
      } catch (e) {
        console.error(`Error during search: ${e.message}`);
      } finally {
        setIsSearching(false);
      }
    }
  };

  const handleSearchInput = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchBookmarks(newQuery);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    searchBookmarks(query);
  }, [query]);

  return (
    <div className={`search-bar ${isSearching ? "searching" : ""}`}>
      <input
        type="text"
        placeholder="Search bookmarks..."
        value={query}
        onChange={handleSearchInput}
      />
      <img src={icon} alt="Search" className="icon" />
    </div>
  );
}

export default SearchBar;
