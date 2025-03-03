if (!firebase.apps.length) {
  firebase.initializeApp(config);
} else {
  firebase.app();
}

console.log("Firebase initialized in background.js");

firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    console.log("User signed in:", user.uid);
    refreshIdToken(user);
  } else {
    console.log("User signed out.");
    chrome.storage.local.remove(["authToken", "userId", "email", "username"]);
  }
});

function refreshIdToken(user) {
  user
    .getIdToken(true)
    .then((idToken) => {
      chrome.storage.local.set({
        authToken: idToken,
        userId: user.uid,
        email: user.email,
        username: user.displayName,
      });
      console.log("Token refreshed successfully:", idToken);
    })
    .catch((error) => {
      console.error("Error refreshing ID token:", error);
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getAuthData") {
    chrome.storage.local.get(
      ["authToken", "userId", "email", "username"],
      (data) => {
        sendResponse({
          authToken: data.authToken || null,
          userId: data.userId || null,
          email: data.email || null,
          username: data.username || null,
        });
      }
    );
    return true;
  }

  if (request.action === "startSignIn") {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting auth token:", chrome.runtime.lastError);
        return;
      }
      const credential = firebase.auth.GoogleAuthProvider.credential(
        null,
        token
      );
      firebase
        .auth()
        .signInWithCredential(credential)
        .catch((error) => {
          console.error("Sign-in error:", error);
        });
    });
  }

  if (request.action === "signOut") {
    firebase
      .auth()
      .signOut()
      .then(() => {
        console.log("User signed out");
        chrome.storage.local.remove([
          "authToken",
          "userId",
          "email",
          "username",
        ]);
      })
      .catch((error) => {
        console.error("Sign-out error:", error);
      });
  }

  if (request.action === "refreshIdToken") {
    const user = firebase.auth().currentUser;
    if (user) {
      refreshIdToken(user);
    }
  }
});

// Refresh token every 30 minutes
setInterval(() => {
  const user = firebase.auth().currentUser;
  if (user) {
    refreshIdToken(user);
  }
}, 30 * 60 * 1000);
