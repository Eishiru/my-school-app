import { API_BASE_URL } from "./config";
export { API_BASE_URL } from "./config";

export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("access");

  if (!token) {
    throw new Error("Access token not found.");
  }

  // Normalize endpoint to prevent double '/api/api/' prefix
  const cleanEndpoint = endpoint.startsWith("/api/")
    ? endpoint.replace(/^\/api/, "")
    : endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  // Only set default Content-Type to JSON if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${cleanEndpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  return response;
}