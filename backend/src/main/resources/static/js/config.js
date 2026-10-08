// Use Spring Boot directly when the frontend is served separately on localhost.
// Set window.API_BASE before this script to override the API location.
const isLocalFrontend = window.location.protocol === "file:" ||
  (["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "8080");
const API_BASE = window.API_BASE || (isLocalFrontend ? "http://localhost:8080/api" : "/api");
