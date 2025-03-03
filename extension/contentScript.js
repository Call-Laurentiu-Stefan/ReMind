setupMessageListener();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openModal") {
    openModal();
    sendResponse({ status: "Modal should be opening" });
  }
});

function openModal() {
  const images = getAllImages();
  const existingModal = document.getElementById("saveModal");
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  const title = document.title;
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const description = descriptionMeta
    ? descriptionMeta.getAttribute("content")
    : "No description available";

  computeTags(10, null, title, description);

  const modalContainer = document.createElement("div");
  modalContainer.id = "saveModal";
  const shadow = modalContainer.attachShadow({ mode: "open" });
  const modalContent = createModalContent(images, title, description);
  shadow.append(createStyles(), modalContent);
  document.body.appendChild(modalContainer);

  const descriptionTextArea = modalContent.querySelector(
    "#bookmarkDescription"
  );
  const descriptionContainer = descriptionTextArea.parentNode;

  createGenerateButton(descriptionContainer, descriptionTextArea);
  createResetButton(descriptionContainer, descriptionTextArea);
  createOpenDirectorySelectButton(modalContent);
  createGenerateDirectoryNameButton(modalContent);

  setupModalEventListeners(modalContent, modalContainer, images);
}

function createModalContent(images, title, description) {
  const modalContent = document.createElement("div");
  modalContent.classList.add("modal-content");
  modalContent.innerHTML = `
    <div id="createBookmarkModal" style="display: block">
      <div class="modal-body" style="display: flex; flex-direction: column; gap: 10px;">
          <span class="close" id="closeBtn">&times;</span>
          <div class="image-list">
              <button class="arrow" id="prevImage">&lt;</button>
              <img id="carouselImage" alt="Carousel Image" />
              <button class="arrow" id="nextImage">&gt;</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
              <input id="bookmarkTitle" placeholder="Enter title..." value="${title}" />
              <textarea id="bookmarkDescription" placeholder="Enter description...">${description}</textarea>
              <input id="bookmarkPath" placeholder="Enter new directory name" />
              <input id="parentId" hidden/>
          </div>
      </div>
      <div class="modal-footer">
          <button id="saveBookmark" class="save-btn">Save</button>
          <button id="closeModal" class="close close-btn">Close</button>
      </div>
    </div>
    <div id="selectFolderModal" style="display: none;">
      <div class="modal-body" style="display: flex; flex-direction: column; height: 100%;">
          <div id="folderTree"></div>
      </div>
      <div class="modal-footer">
          <button id="selectFolderBtn" class="save-btn">Select</button>
          <button id="closeFolderBtn" class="close close-btn">Cancel</button>
      </div>
    </div>
  `;
  setupCarousel(modalContent, images);
  return modalContent;
}

function createGenerateButton(descriptionContainer, descriptionTextArea) {
  const generateButton = document.createElement("div");
  generateButton.id = "generateDescriptionButton";
  generateButton.innerHTML =
    '<img src="https://static.thenounproject.com/png/6056251-200.png" alt="Generate Description" style="width: 20px; height: 20px;">';
  generateButton.title = "Generate Description";
  descriptionContainer.style.position = "relative";
  descriptionContainer.appendChild(generateButton);
  setupGenerateButtonEventListener(generateButton, descriptionTextArea);

  return generateButton;
}

function createResetButton(descriptionContainer, descriptionTextArea) {
  const resetButton = document.createElement("div");
  resetButton.id = "resetDescriptionButton";
  resetButton.innerHTML =
    '<img src="https://static.thenounproject.com/png/3648091-200.png" alt="Reset Description" style="width: 20px; height: 20px;">';
  resetButton.title = "Reset Description";

  descriptionContainer.appendChild(resetButton);

  resetButton.addEventListener("click", () => {
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const description = descriptionMeta
      ? descriptionMeta.getAttribute("content")
      : "No description available";

    descriptionTextArea.value = description;
  });
}

function setupGenerateButtonEventListener(generateButton, descriptionTextArea) {
  generateButton.addEventListener("click", async () => {
    generateButton.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center;">
      <div class="spinner" style="
        width: 20px;
        height: 25px;
        border: 2px solid transparent;
        border-top-color: #000;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;">
      </div>
    </div>`;
    generateButton.disabled = true;

    try {
      const data = await fetchDescription();
      descriptionTextArea.value = data.summary || "No description generated.";
    } catch (error) {
      console.error("Error generating description:", error);
      alert("Failed to generate description.");
    } finally {
      generateButton.innerHTML =
        '<img src="https://static.thenounproject.com/png/6056251-200.png" alt="Generate Description" style="width: 20px; height: 20px;">';
      generateButton.disabled = false;
    }
  });
}

function createGenerateDirectoryNameButton(modalContent) {
  const directoryInput = modalContent.querySelector("#bookmarkPath");
  const directoryInputContainer = directoryInput.parentNode;

  const generateDirectoryButton = document.createElement("div");
  generateDirectoryButton.id = "generateDirectoryNameButton";
  generateDirectoryButton.innerHTML =
    '<img src="https://static.thenounproject.com/png/6056251-200.png" alt="Generate Directory Name" style="width: 20px; height: 20px;">';
  generateDirectoryButton.title = "Generate Directory Name";
  directoryInputContainer.style.position = "relative";
  directoryInputContainer.appendChild(generateDirectoryButton);
  setupGenerateDirectoryButtonEventListener(
    generateDirectoryButton,
    directoryInput
  );

  return generateDirectoryButton;
}

function setupGenerateDirectoryButtonEventListener(
  generateDirectoryButton,
  directoryInput
) {
  generateDirectoryButton.addEventListener("click", async () => {
    generateDirectoryButton.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center;">
      <div class="spinner" style="
        width: 20px;
        height: 25px;
        border: 2px solid transparent;
        border-top-color: #000;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;">
      </div>
    </div>`;
    generateDirectoryButton.disabled = true;

    try {
      const data = await computeTags(10, null);
      directoryInput.value = data.tags[0] || "";
    } catch (error) {
      console.error("Error generating directory name:", error);
      alert("Failed to generate directory name.");
    } finally {
      generateDirectoryButton.innerHTML =
        '<img src="https://static.thenounproject.com/png/6056251-200.png" alt="Generate Directory Name" style="width: 20px; height: 20px;">';
      generateDirectoryButton.disabled = false;
    }
  });
}

function createOpenDirectorySelectButton(modalContent) {
  const directoryInput = modalContent.querySelector("#bookmarkPath");
  const directoryInputContainer = directoryInput.parentNode;

  const openDirectoriesButton = document.createElement("div");
  openDirectoriesButton.id = "openDirectoriesButton";
  openDirectoriesButton.innerHTML =
    '<img src="https://cdn.jsdelivr.net/npm/lucide-static@0.321.0/icons/folder.svg" alt="Select directory" style="width: 20px; height: 20px;">';
  openDirectoriesButton.title = "Select directory";

  directoryInputContainer.appendChild(openDirectoriesButton);

  openDirectoriesButton.addEventListener("click", async () => {
    const createBookmarkModal = modalContent.querySelector(
      "#createBookmarkModal"
    );
    const selectFolderModal = modalContent.querySelector("#selectFolderModal");
    createBookmarkModal.style.display = "none";
    selectFolderModal.style.display = "flex";

    await loadFolders();
  });
}

function createFolderElement(folder, parentElement) {
  if (!parentElement) {
    console.error("Parent element is null. Cannot append child elements.");
    return;
  }

  const folderDiv = document.createElement("div");
  folderDiv.classList.add("folder");

  const folderHeader = document.createElement("div");
  folderHeader.classList.add("folder-header");

  const toggleCollapseBtn = document.createElement("span");
  toggleCollapseBtn.classList.add("toggle-collapse");
  toggleCollapseBtn.textContent = folder.children.length > 0 ? "▶" : "";

  const folderName = document.createElement("span");
  folderName.classList.add("folder-name");
  folderName.textContent = folder.path.split("/").pop();
  folderName.setAttribute("data-path", folder.path);
  folderName.setAttribute("parent-id", folder.parentId);

  const addFolderBtn = document.createElement("span");
  addFolderBtn.classList.add("add-folder");
  addFolderBtn.textContent = "+";
  addFolderBtn.title = "Add new folder";

  folderHeader.appendChild(toggleCollapseBtn);
  folderHeader.appendChild(folderName);
  folderHeader.appendChild(addFolderBtn);
  folderDiv.appendChild(folderHeader);

  folderName.addEventListener("click", (event) => {
    event.stopPropagation();

    deselectAllFolders();

    folderName.classList.add("selected");

    const bookmarkPathInput = document.querySelector("#bookmarkPath");
    if (bookmarkPathInput) {
      bookmarkPathInput.value = folder.path;
    }
  });

  addFolderBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    const newFolderInput = document.createElement("input");
    newFolderInput.type = "text";
    newFolderInput.placeholder = "New folder name";
    newFolderInput.classList.add("new-folder-input");

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "✓";
    confirmBtn.classList.add("confirm-new-folder");

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "✕";
    cancelBtn.classList.add("cancel-new-folder");

    const inputWrapper = document.createElement("div");
    inputWrapper.classList.add("new-folder-wrapper");
    inputWrapper.appendChild(newFolderInput);
    inputWrapper.appendChild(confirmBtn);
    inputWrapper.appendChild(cancelBtn);

    const childrenDiv =
      folderDiv.querySelector(".children") || document.createElement("div");
    if (!folderDiv.contains(childrenDiv)) {
      childrenDiv.classList.add("children");
      folderDiv.appendChild(childrenDiv);
    }
    childrenDiv.classList.remove("collapsed");
    childrenDiv.insertBefore(inputWrapper, childrenDiv.firstChild);
    newFolderInput.focus();

    const handleConfirm = async () => {
      const newFolderName = newFolderInput.value.trim();
      if (newFolderName) {
        const newFolder = {
          path: newFolderName,
          children: [],
          parentId: folder._id,
        };
        folder.children.push(newFolder);
        await createFolder(newFolderName, folder._id);
        createFolderElement(newFolder, childrenDiv);
      }
      inputWrapper.remove();
    };

    confirmBtn.addEventListener("click", handleConfirm);
    cancelBtn.addEventListener("click", () => inputWrapper.remove());
    newFolderInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") handleConfirm();
      if (e.key === "Escape") inputWrapper.remove();
    });
  });

  if (folder.children && folder.children.length > 0) {
    const childrenDiv = document.createElement("div");
    childrenDiv.classList.add("children", "collapsed");
    folderDiv.appendChild(childrenDiv);

    toggleCollapseBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      childrenDiv.classList.toggle("collapsed");
      toggleCollapseBtn.textContent = childrenDiv.classList.contains(
        "collapsed"
      )
        ? "▶"
        : "▼";
    });

    folder.children.forEach((child) => createFolderElement(child, childrenDiv));
  } else {
    toggleCollapseBtn.style.visibility = "hidden";
  }

  parentElement.appendChild(folderDiv);
}

function deselectAllFolders() {
  const modalHost = document.querySelector("#saveModal");
  const shadowRoot = modalHost.shadowRoot;
  const modalContent = shadowRoot.querySelector("#selectFolderModal");

  const allFolderNames = modalContent.querySelectorAll(".folder-name");
  allFolderNames.forEach((f) => f.classList.remove("selected"));
  const bookmarkPathInput = document.querySelector("#bookmarkPath");
  if (bookmarkPathInput) {
    bookmarkPathInput.value = "";
  }
}

async function loadFolders() {
  const modalHost = document.querySelector("#saveModal");
  const shadowRoot = modalHost.shadowRoot;
  const modalContent = shadowRoot.querySelector("#selectFolderModal");
  const folderTree = modalContent.querySelector("#folderTree");

  folderTree.innerHTML = "";

  const folders = await fetchFolderData();

  folders.forEach((folder) => createFolderElement(folder, folderTree));
}

function setupModalEventListeners(modalContent, modalContainer, images) {
  modalContent
    .querySelector("#folderTree")
    .addEventListener("click", (event) => {
      if (event.target === event.currentTarget) {
        deselectAllFolders();
      }
    });

  modalContent.querySelectorAll("#closeBtn").forEach((button) => {
    button.addEventListener("click", () => {
      document.body.removeChild(modalContainer);
    });
  });

  modalContent.querySelectorAll("#closeModal").forEach((button) => {
    button.addEventListener("click", () => {
      document.body.removeChild(modalContainer);
    });
  });

  modalContainer.addEventListener("click", (event) => {
    if (event.target === modalContainer) {
      document.body.removeChild(modalContainer);
    }
  });

  modalContent.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  modalContent
    .querySelector("#saveBookmark")
    .addEventListener("click", async () => {
      const bookmarkTitle = modalContent.querySelector("#bookmarkTitle").value;
      const bookmarkDescription = modalContent.querySelector(
        "#bookmarkDescription"
      ).value;
      const bookmarkPath = modalContent.querySelector("#bookmarkPath").value;
      const parentId = modalContent.querySelector("#parentId").value;
      const currentImage = modalContent.querySelector("#carouselImage").src;

      if (!bookmarkTitle || !bookmarkDescription) {
        alert("Please fill in both the title and description.");
        return;
      }

      chrome.storage.local.get(
        ["userId", "authToken", "username", "email"],
        async function (result) {
          const { userId, authToken, username, email } = result;

          if (!userId || !authToken) {
            alert("Please sign in first!");
            return;
          }
          try {
            const body = {
              bookmark: {
                link: window.location.href,
                title: bookmarkTitle,
                description: bookmarkDescription,
                path: bookmarkPath,
                userId: userId,
                imagesLinks: [currentImage],
                username: username,
                email: email,
                tags: [],
              },
            };
            if (parentId && parentId != "null") {
              body.bookmark.parentId = parentId;
            }
            const data = await createBookmark(authToken, body);
            console.log("Bookmark saved:", data);
            alert("Bookmark saved successfully!");
            document.body.removeChild(modalContainer);
          } catch (error) {
            console.error("Error saving bookmark:", error);
            alert("An error occurred while saving the bookmark.");
          }
        }
      );
    });

  modalContent
    .querySelector("#selectFolderBtn")
    .addEventListener("click", () => {
      const selectedFolder = modalContent.querySelector(
        ".folder-name.selected"
      );
      if (selectedFolder) {
        modalContent.querySelector("#bookmarkPath").value =
          selectedFolder.getAttribute("data-path");
        modalContent.querySelector("#parentId").value =
          selectedFolder.getAttribute("parent-id");
      }
      modalContent.querySelector("#selectFolderModal").style.display = "none";
      modalContent.querySelector("#createBookmarkModal").style.display =
        "block";
    });

  modalContent
    .querySelector("#selectFolderModal .close-btn")
    .addEventListener("click", () => {
      modalContent.querySelector("#selectFolderModal").style.display = "none";
      modalContent.querySelector("#createBookmarkModal").style.display =
        "block";
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageDetails") {
    const description =
      document.querySelector('meta[name="description"]')?.content || null;
    const favicon = getFavicon();
    sendResponse({ description, favicon });
  }
});

function setupMessageListener() {
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    if (event.data.action === "getPageDetails") {
      const description =
        document.querySelector('meta[name="description"]')?.content || "";
      const favicon = document.querySelector("link[rel*='icon']")?.href || "";

      chrome.runtime.sendMessage({
        action: "getPageDetailsResponse",
        description: description,
        favicon: favicon,
      });
    }

    if (event.data.action === "refreshTokenRequest") {
      handleRefreshTokenRequest();
    } else if (event.data.action === "requestAuthData") {
      handleAuthDataRequest();
    }
  });
}
function handleRefreshTokenRequest() {
  chrome.runtime.sendMessage({ action: "refreshToken" }, (response) => {
    window.postMessage(
      {
        action: "refreshTokenResponse",
        authToken: response?.authToken || null,
      },
      "*"
    );
  });
}

function handleAuthDataRequest() {
  chrome.runtime.sendMessage({ action: "getAuthData" }, (response) => {
    if (response) {
      window.postMessage(
        {
          action: "authDataResponse",
          authToken: response.authToken,
          userId: response.userId,
          email: response.email,
          username: response.username,
        },
        "*"
      );
    }
  });
}

async function fetchDescription() {
  const response = await fetch("http://localhost:5000/processing/description", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: window.location.href, numSentences: 1 }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function createBookmark(authToken, body) {
  const response = await fetch("http://localhost:5000/bookmarks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });

  if (response.status === 401) {
    chrome.runtime.sendMessage({ action: "refreshToken" }, async (newToken) => {
      if (newToken) {
        const retryResponse = await fetch("http://localhost:5000/bookmarks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${newToken}`,
          },
          body: JSON.stringify(body),
        });

        if (!retryResponse.ok) {
          throw new Error(`HTTP error! status: ${retryResponse.status}`);
        }

        const data = await retryResponse.json();
        console.log("Bookmark saved:", data);
        alert("Bookmark saved successfully!");
        document.body.removeChild(modalContainer);
        return data;
      } else {
        throw new Error("Could not refresh token");
      }
    });
  } else if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  } else {
    const data = await response.json();
    computeTags(3, data._id);
    return data;
  }
}

let tags = [];
let tagsIndex = 0;
async function computeTags(tagsNo, id, title = "", description = "") {
  if (id == null && tags != null && tags.length > 0) {
    if (tagsIndex < tags.length - 1) {
      tagsIndex++;
      return {
        tags: [tags[tagsIndex]],
      };
    } else {
      tagsIndex = 1;
      return {
        tags: [tags[0]],
      };
    }
  }
  const response = await fetch("http://localhost:5000/processing/tags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: window.location.href,
      id: id,
      tagsNo: tagsNo,
      title: title,
      description: description,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
  const data = await response.json();
  tags = data.tags;
  tagsIndex = 0;
  return data;
}

async function fetchFolderData() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["userId", "authToken"], async (result) => {
      const { userId, authToken } = result;

      if (!userId || !authToken) {
        return reject(new Error("Missing userId or authToken"));
      }

      try {
        const query = new URLSearchParams({ userId }).toString();
        const response = await fetch(`http://localhost:5000/paths?${query}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function createFolder(folderName, parentId) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["userId", "authToken"], async (result) => {
      const { userId, authToken } = result;

      if (!userId || !authToken) {
        return reject(new Error("Missing userId or authToken"));
      }

      try {
        const response = await fetch("http://localhost:5000/paths", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            userId: userId,
            path: folderName,
            parentId: parentId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    });
  });
}

function createStyles() {
  const style = document.createElement("style");
  style.textContent = `
      * {
          box-sizing: border-box; 
          margin: 0;
          padding: 0;
      }

      :host {
          display: flex;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.5); 
          justify-content: center;
          align-items: center;
          z-index: 9998; 
      }

      .modal-content {
          background-color: #3a3433;
          color: black; 
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          padding: 20px;
          border-radius: 10px;
          width: 600px;
          height: 450px; 
          max-height: 80vh; 
          overflow-y: auto; 
          font-family: Arial, sans-serif;
          position: relative;
          z-index: 9999; 
          overflow-y: auto; 
          max-height: 80vh;
      }

      .close {
          align-self: flex-end;
          cursor: pointer;
      }

      #carouselImage {
          max-width: 80%;
          height: auto;
          margin-bottom: 10px;
          border-radius: 5px; 
      }

      input, textarea, button {
          padding: 8px;
          font-size: 14px;
          border: 1px solid #ccc;
          border-radius: 4px;
          width: 100%;
          margin-bottom: 10px;
          background-color: rgba(255, 255, 255, 0.09);
          color:rgb(234, 214, 210); 
          overflow-y: auto; 
          scrollbar-color: #db3434 rgba(63, 63, 63, 0.2); 
          scrollbar-width: thin;
      }

      ::-webkit-scrollbar, textarea::-webkit-scrollbar {
          width: 8px;
          height: 8px; 
      }

      ::-webkit-scrollbar-track, textarea::-webkit-scrollbar-track {
          background: rgba(50, 44, 43, 0.2); 
          border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb, textarea::-webkit-scrollbar-thumb {
          background: #6d5e5b; 
          border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover, textarea::-webkit-scrollbar-thumb:hover {
          background: #db3434;
      }


      button {
          cursor: pointer;
      }

      .modal-footer {
          display: flex;
          justify-content: space-around;
          margin-top: 15px;
      }

      .save-btn {
          background-color: #322c2b;
          color: white;
          border: none;
          width: 30%;
      }

      .save-btn:hover{
          background-color:rgb(74, 226, 76);
      }

      .close-btn {
          background-color: #322c2b;
          color: white;
          border: none;
          width: 30%;
      }

      .close-btn:hover{
          background-color: #e24a4a;
      }

      .image-list {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 10px;
          width: 70%;
          height: 50%;
          align-self: center;
      }

      .image-list img {
          max-width: 100%;
          height: auto;
          border-radius: 5px;
          cursor: pointer;
      }

      .arrow {
          cursor: pointer;
          font-size: 24px;
          padding: 10px;
          background-color: transparent;
          border: none;
      }

      #generateDescriptionButton  {
        position: absolute;
        bottom: 62px;
        right: 15px;
        cursor: pointer;
        padding: 5px 10px;
        color: white;
        border-radius: 5px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10;
        opacity: 0.8;
        transition: opacity 0.3s ease, background-color 0.3s ease;
      }

      #generateDirectoryNameButton {
        position: absolute;
        bottom: 10px;
        right: 15px;
        cursor: pointer;
        padding: 5px 10px;
        color: white;
        border-radius: 5px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10;
        opacity: 0.8;
        transition: opacity 0.3s ease, background-color 0.3s ease;
      }

      #generateDirectoryNameButton:hover {
        opacity: 1;
        background-color: #db3434;
        border-radius: 10px;
      }

      #resetDescriptionButton {
        position: absolute;
        bottom: 62px;
        right: 55px;
        cursor: pointer;
        padding: 5px 10px;
        color: white;
        border-radius: 5px;
        font-size: 14px;
        font-weight: bold;
        z-index: 10;
        opacity: 0.8;
        transition: opacity 0.3s ease, background-color 0.3s ease;
      }

      #generateDescriptionButton:hover {
        opacity: 1;
        background-color: #db3434;
        border-radius: 10px;
      }

      #resetDescriptionButton:hover {
        opacity: 1;
        background-color: #db3434;
        border-radius: 10px;
      }

      #openDirectoriesButton {
        position: absolute;
        bottom: 10px;
        right: 55px;
        cursor: pointer;
        padding: 4px 10px;
        color: white;
        border-radius: 5px;
        font-weight: bold;
        z-index: 10;
        opacity: 0.8;
        transition: opacity 0.3s ease, background-color 0.3s ease;
      }

      #openDirectoriesButton:hover {
        opacity: 1;
        background-color: #db3434;
        border-radius: 10px;
      }
      #bookmarkDescription {
        position: relative;
        padding: 10px;
        padding-right: 80px;
        min-height: 100px;
        resize: none;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .folder {
        cursor: pointer;
        padding: 5px 10px;
        border-radius: 4px;
        transition: background-color 0.2s, color 0.2s;
        display: flex;
        flex-direction: column;
        user-select: none;
        font-size: 14px;
      }

      .folder-header {
        display: flex;
        align-items: center;
      }

      .folder-name {
        color:rgb(234, 214, 210);
        flex-grow: 1;
        padding: 2px 5px;
        border-radius: 3px;
      }

      .folder-name:hover {
        background-color: #322c2b;
      }

      .folder-name.selected {
        background-color: #e24a4a;
        font-weight: bold;
      }

      .children {
        margin-left: 20px;
        display: flex;
        flex-direction: column;
      }

      .children.collapsed {
        display: none;
      }

      .toggle-collapse {
        cursor: pointer;
        margin-right: 5px;
        font-size: 12px;
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 2px;
      }

      .add-folder {
        cursor: pointer;
        margin-left: 5px;
        font-size: 16px;
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
      }

      .add-folder:hover {
        background-color: #e0e0e0;
      }

      #folderTree {
        flex-grow: 1;
        overflow-y: auto;
        border: 1px solid #ccc;
        border-radius: 4px;
        padding: 10px;
        display: flex;
        flex-direction: column;
      }

      #selectFolderModal {
        display: none;
        flex-direction: column;
        height: 350px;
      }

      #selectFolderModal .modal-body {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
      }

      .new-folder-wrapper {
        display: flex;
        align-items: center;
        margin-top: 5px;
        margin-bottom: 5px;
      }

      .new-folder-input {
        flex-grow: 1;
        margin-right: 5px;
        padding: 4px 8px;
        font-size: 12px;
        border-radius: 4px;
        outline: none;
      }

      .new-folder-input:focus {
        border-color: #4CAF50;
        box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
      }

      .confirm-new-folder,
      .cancel-new-folder {
        cursor: pointer;
        border: none;
        background: none;
        font-size: 16px;
        padding: 0 3px;
        margin-left: 2px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s;
      }

      .confirm-new-folder {
        color: #4CAF50;
      }

      .cancel-new-folder {
        color: #f44336;
      }

      .confirm-new-folder:hover,
      .cancel-new-folder:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
  `;
  return style;
}

function getFavicon() {
  const faviconLinks = Array.from(
    document.querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    )
  );

  const getSize = (link) => {
    if (!link || !link.sizes || link.sizes.value === "") return 0;
    return Math.max(
      ...Array.from(link.sizes).map((size) => parseInt(size.split("x")[0], 10))
    );
  };

  const favicon = faviconLinks
    .map((link) => ({ link, size: getSize(link) }))
    .sort((a, b) => b.size - a.size)[0]?.link?.href;

  if (favicon) return favicon;

  const images = Array.from(document.querySelectorAll("img"));
  const relevantImages = images.filter((img) => img.closest("article, main"));

  const mostRelevantImage = relevantImages.reduce(
    (largest, img) => {
      const imgSize = img.naturalWidth * img.naturalHeight;
      return imgSize > largest.size ? { img, size: imgSize } : largest;
    },
    { size: 0 }
  ).img;

  return mostRelevantImage ? mostRelevantImage.src : null;
}

function getAllImages() {
  const favicon = getFavicon();
  let images = getImages();

  images = images.map((img) => ({
    src: getImageSrc(img),
    element: img,
    relevance: calculateRelevance(img),
  }));

  if (favicon) {
    images.unshift({
      src: favicon,
      element: null,
      relevance: Number.POSITIVE_INFINITY,
    });
  }

  images.sort((a, b) => b.relevance - a.relevance);

  return images.filter((image) => image.src);
}

function getImages() {
  const seenSrcs = new Set();

  const imgTags = getImagesFromShadowRoots();

  const lazyImages = Array.from(document.querySelectorAll("img")).filter(
    (img) => {
      const lazySrc =
        img.getAttribute("data-src") || img.getAttribute("data-lazy");
      return img.src || lazySrc;
    }
  );

  const bgImages = Array.from(document.querySelectorAll("*"))
    .map((el) => {
      const bgImage = window
        .getComputedStyle(el)
        .getPropertyValue("background-image");
      if (bgImage && bgImage.startsWith("url(")) {
        return el;
      }
      return null;
    })
    .filter(Boolean);

  const allImages = [...imgTags, ...lazyImages, ...bgImages].filter((img) => {
    const src = getImageSrc(img);
    if (!src || seenSrcs.has(src)) return false;
    seenSrcs.add(src);
    return true;
  });

  return filterOutAds(allImages);
}

function filterOutAds(images) {
  return images.filter((img) => {
    const anchor = img.closest("a");

    if (anchor) {
      const anchorClassId = `${anchor.className} ${anchor.id}`.toLowerCase();
      if (/\b(ad|ads|sponsor|promo)\b/.test(anchorClassId)) {
        return false;
      }
    }

    const src = getImageSrc(img);
    if (src) {
      const lowerSrc = src.toLowerCase();
      if (
        /[\-_](ad|ads|promo|banner|sponsor)[\-_]/.test(lowerSrc) ||
        /(doubleclick|adservice|googlesyndication)/.test(lowerSrc)
      ) {
        return false;
      }
    }

    const elementClassId = `${img.className} ${img.id}`.toLowerCase();
    if (/\b(ad|ads|sponsor|promo|banner)\b/.test(elementClassId)) {
      return false;
    }

    const computedStyles = window.getComputedStyle(img);
    if (
      computedStyles.display === "none" ||
      computedStyles.visibility === "hidden" ||
      computedStyles.opacity === "0"
    ) {
      return false;
    }

    if (!isVisible(img)) {
      return false;
    }

    return true;
  });
}

function getImagesFromShadowRoots(root = document) {
  const images = [];
  const traverse = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName === "IMG" && node.src) {
        images.push(node);
      }
      if (node.shadowRoot) {
        images.push(...getImagesFromShadowRoots(node.shadowRoot));
      }
      node.childNodes.forEach(traverse);
    }
  };
  traverse(root);
  return images;
}

function calculateRelevance(img) {
  let relevance = 0;

  const altText = img.alt?.trim();
  if (altText) {
    relevance += altText.length >= 10 ? 15 : 5;
  }

  const area = (img.naturalWidth || 0) * (img.naturalHeight || 0);
  relevance += Math.min(area / 5000, 50);

  const rect = img.getBoundingClientRect();
  if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
    relevance += 20;
  }

  relevance += Math.max(0, 10 - Math.floor(rect.top / 100));

  if (img.tagName === "IMG") relevance += 10;

  return relevance;
}

function getImageSrc(img) {
  if (img.tagName === "IMG") {
    return (
      img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy")
    );
  }
  const bgImage = window
    .getComputedStyle(img)
    .getPropertyValue("background-image");
  return bgImage?.startsWith("url(") ? bgImage.slice(5, -2) : null;
}

function isImageAccessible(img) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = getImageSrc(img);
  });
}

function isVisible(img) {
  const computedStyles = window.getComputedStyle(img);

  if (
    computedStyles.display === "none" ||
    computedStyles.visibility === "hidden" ||
    computedStyles.opacity === "0" ||
    img.offsetWidth === 0 ||
    img.offsetHeight === 0
  ) {
    return false;
  }

  return true;
}

function setupCarousel(modalContent, images) {
  let currentIndex = 0;

  const carouselImage = modalContent.querySelector("#carouselImage");
  carouselImage.src = images[currentIndex].src;

  modalContent.querySelector("#prevImage").addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    updateCarouselImage(carouselImage, images[currentIndex]);
  });

  modalContent.querySelector("#nextImage").addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % images.length;
    updateCarouselImage(carouselImage, images[currentIndex]);
  });
}

function updateCarouselImage(carouselImage, image) {
  carouselImage.src = image.src;
}
