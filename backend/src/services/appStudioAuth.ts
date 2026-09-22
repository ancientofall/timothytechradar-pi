import axios from "axios";
export const appStudioAuth = axios.create({
  baseURL: "https://backend.appstudio-u7cm9zhmha0ruwv8.piappengine.com",
  timeout: 15000, maxRedirects: 0,
  headers: { "Content-Type": "application/json" },
});
export async function exchangePiToken(accessToken: string) {
  const { data } = await appStudioAuth.post("/pi/auth/v1/login", { accessToken });
  if (typeof data?.sessionToken !== "string" || !data.sessionToken.trim() ||
      typeof data?.user?.uid !== "string" || !data.user.uid.trim() ||
      typeof data?.user?.username !== "string" || !data.user.username.trim()) {
    throw new Error("Invalid authentication service response");
  }
  // Issue our own session; never expose or persist the upstream credentials.
  return { uid: data.user.uid as string, username: data.user.username as string, roles: [] as string[] };
}
