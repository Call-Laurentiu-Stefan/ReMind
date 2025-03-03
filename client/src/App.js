import Header from "./components/layout/Header";
import BookmarksContainer from "./components/bookmark/BookmarksContainer";
import { useState } from "react";

function App() {
  const [authToken, setAuthToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [email, setUserEmail] = useState(null);
  const [username, setUsername] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="App">
      <Header
        authToken={authToken}
        userId={userId}
        setBookmarks={setBookmarks}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />
      <BookmarksContainer
        authToken={authToken}
        userId={userId}
        bookmarks={bookmarks}
        email={email}
        username={username}
        setBookmarks={setBookmarks}
        setUserId={setUserId}
        setAuthToken={setAuthToken}
        setUserEmail={setUserEmail}
        setUsername={setUsername}
        setSearchTerm={setSearchTerm}
      />
    </div>
  );
}

export default App;
