let userId;

function initApp() {
  const signInButton = document.getElementById("signIn");
  const signOutButton = document.getElementById("signOut");
  const saveButton = document.getElementById("saveButton");
  const quickSaveButton = document.getElementById("quickSaveButton");
  const modalButton = document.getElementById("saveModal");
  const downloadButton = document.getElementById("downloadButton");
  const pageButton = document.getElementById("bookmarksPageButton");

  updateAuthState();

  signInButton.addEventListener("click", startSignIn);
  signOutButton.addEventListener("click", signOut);
  saveButton.addEventListener("click", openModal);
  quickSaveButton.addEventListener("click", saveWebpage);
  downloadButton.addEventListener("click", downloadWebpage);
  pageButton.addEventListener("click", bookmarksPageButton);
}

function updateAuthState() {
  chrome.runtime.sendMessage({ action: "getAuthData" }, (response) => {
    if (response.authToken) {
      userId = response.userId;
      console.log("User authenticated:", response.userId);
      updateUIForSignedInUser();
    } else {
      console.log("No user found.");
      updateUIForSignedOutUser();
    }
  });
}

function updateUIForSignedInUser() {
  document.getElementById("signIn").style.display = "none";
  document.getElementById("signOut").style.display = "flex";
  document.getElementById("saveButton").style.display = "flex";
  document.getElementById("quickSaveButton").style.display = "flex";
  document.getElementById("downloadButton").style.display = "flex";
  document.getElementById("bookmarksPageButton").style.display = "flex";
}

function updateUIForSignedOutUser() {
  document.getElementById("signIn").style.display = "flex";
  document.getElementById("signOut").style.display = "none";
  document.getElementById("saveButton").style.display = "none";
  document.getElementById("quickSaveButton").style.display = "none";
  document.getElementById("downloadButton").style.display = "none";
  document.getElementById("bookmarksPageButton").style.display = "none";
}

function startSignIn() {
  chrome.runtime.sendMessage({ action: "startSignIn" }, () => {
    setTimeout(() => {
      updateAuthState();
    }, 2000);
  });
}

function signOut() {
  chrome.runtime.sendMessage({ action: "signOut" }, () => {
    setTimeout(() => {
      updateAuthState();
    }, 500);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "refreshIdToken") {
    chrome.runtime.sendMessage({ action: "getAuthData" }, (response) => {
      if (response.authToken) {
        console.log("Token refreshed in popup.js");
      }
    });
  }
});

function downloadWebpage() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs[0];
    chrome.downloads.download({ url: tab.url, filename: tab.title + ".html" });
  });
}

function openModal() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.executeScript(tabs[0].id, { file: "contentScript.js" }, () => {
      if (chrome.runtime.lastError) {
        console.error(
          "Error injecting script:",
          JSON.stringify(chrome.runtime.lastError)
        );
        return;
      }

      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "openModal" },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "Error sending message:",
              JSON.stringify(chrome.runtime.lastError)
            );
          }
        }
      );
    });
  });
}

async function saveWebpage() {
  const quickSaveButton = document.getElementById("quickSaveButton");
  const spinner = document.getElementById("spinner");
  const text = document.getElementById("quickSaveText");

  spinner.style.display = "inline-block";
  text.textContent = "";
  quickSaveButton.disabled = true;

  chrome.storage.local.get(
    ["email", "username", "authToken", "userId"],
    async (storedData) => {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        async function (tabs) {
          const tab = tabs[0];

          chrome.tabs.executeScript(
            tab.id,
            { file: "contentScript.js" },
            () => {
              chrome.tabs.sendMessage(
                tab.id,
                { action: "getPageDetails" },
                async (response) => {
                  const description =
                    response.description ||
                    (await fetchDescription(tab.url)).summary;
                  const faviconUrl =
                    response.favicon ||
                    "https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/icons/image.svg";

                  const body = {
                    bookmark: {
                      link: tab.url,
                      title: tab.title,
                      description: description,
                      path: "",
                      userId: storedData.userId,
                      imagesLinks: [faviconUrl],
                      username: storedData.username,
                      email: storedData.email,
                      tags: [],
                    },
                  };

                  const apiResponse = await fetch(
                    "http://localhost:5000/bookmarks",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${storedData.authToken}`,
                      },
                      body: JSON.stringify(body),
                    }
                  );

                  const data = await apiResponse.json();
                  if (!apiResponse.ok) {
                    alert("Failed to save bookmark");
                    quickSaveButton.classList.remove("saved");
                    quickSaveButton.disabled = false;
                    throw new Error(
                      `HTTP error! Status: ${apiResponse.status}`
                    );
                  } else {
                    computeTags(3, data._id, tab.url);

                    quickSaveButton.classList.add("saved");
                    text.textContent = "Saved";
                    spinner.style.display = "none";

                    setTimeout(() => {
                      quickSaveButton.classList.remove("saved");
                      text.textContent = "Quick Save";
                      quickSaveButton.disabled = false;
                    }, 1000);
                  }
                }
              );
            }
          );
        }
      );
    }
  );
}

async function computeTags(tagsNo, id, url) {
  const response = await fetch("http://localhost:5000/processing/tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: url,
      id: id,
      tagsNo: tagsNo,
    }),
  });

  if (!response.ok) {
    console.error(`HTTP error! Status: ${response.status}`);
    return null;
  }
  const data = await response.json();
  return data;
}

async function fetchDescription(url) {
  const response = await fetch("http://localhost:5000/processing/description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url, numSentences: 1 }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

function bookmarksPageButton() {
  window.open("http://localhost:3000/");
}

window.onload = function () {
  initApp();
};
