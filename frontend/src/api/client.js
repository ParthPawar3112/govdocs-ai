// Shared Axios client that attaches the persisted JWT to protected API requests.
import axios from "axios";

const TOKEN_KEY = "govdocs_access_token";

const client = axios.create({
  baseURL: "http://127.0.0.1:8080/api",
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { TOKEN_KEY };
export default client;
