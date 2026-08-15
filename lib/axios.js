import axios from "axios";

export default axios.create({
  baseURL: "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  // Set to true if you plan to use Laravel Sanctum for cookie-based authentication later
  withCredentials: true, 
});