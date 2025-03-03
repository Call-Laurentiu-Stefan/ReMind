export const fetchWithRefresh = async (
  path,
  authToken,
  method = "GET",
  body = null
) => {
  try {
    const response = await fetch(`http://localhost:5000/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : null,
    });

    if (response.status === 401) {
      try {
        const newToken = await refreshAuthToken();
        if (!newToken) {
          console.error("No new token received. Stopping retries.");
          throw new Error("Failed to refresh token.");
        }

        console.log("New token received:", newToken);

        return await fetch(`http://localhost:5000/${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${newToken}`,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : null,
        });
      } catch (error) {
        console.error("Token refresh failed:", error);
        throw error; 
      }
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error("Fetch error:", error.message);
    throw error; 
  }
};

const refreshAuthToken = () => {
  return new Promise((resolve, reject) => {
    console.log("Requesting new token...");

    window.parent.postMessage({ action: "requestAuthData" }, "*");

    const handleMessage = (event) => {
      if (event.source !== window || event.data.action !== "authDataResponse")
        return;

      const { authToken } = event.data;
      console.log("Received authDataResponse:", authToken);

      window.removeEventListener("message", handleMessage);

      if (authToken) {
        resolve(authToken);
      } else {
        console.error("Token refresh failed: No valid token.");
        reject("No valid token received.");
      }
    };

    const timeoutId = setTimeout(() => {
      console.error("Token request timed out.");
      window.removeEventListener("message", handleMessage);
      reject(new Error("Token request timed out.")); 
    }, 5000); 

    window.addEventListener("message", (event) => {
      clearTimeout(timeoutId); 
      handleMessage(event);
    });
  });
};
