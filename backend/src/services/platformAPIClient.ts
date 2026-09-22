import axios from "axios";
import env from "../environments";

const platformAPIClient = axios.create({
  baseURL: env.platform_api_url,
  timeout: 15000,
  maxRedirects: 0,
  headers: { 'Authorization': `Key ${env.pi_api_key}` }
});

platformAPIClient.interceptors.request.use(config => {
  if (!env.pi_api_key) throw new Error("Pi payment API key is not configured");
  return config;
});
export default platformAPIClient;