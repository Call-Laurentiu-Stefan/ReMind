import React from "react";
import SearchBar from "./SearchBar";
import logo from "../../resources/ReMind.png";
import "./Header.css";

function Header({
  userId,
  authToken,
  setBookmarks,
  searchTerm,
  setSearchTerm,
}) {
  return (
    <div className="header">
      <a href="/" className="logo-container">
        <img src={logo} alt="logo" className="logo" />
      </a>
      <SearchBar
        authToken={authToken}
        userId={userId}
        setBookmarks={setBookmarks}
        setQuery={setSearchTerm}
        query={searchTerm}
      />
    </div>
  );
}

export default Header;
