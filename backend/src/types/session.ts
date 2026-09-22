import { UserData } from "./user";

// https://stackoverflow.com/questions/65108033/property-user-does-not-exist-on-type-session-partialsessiondata
declare module 'express-session' {
  export interface SessionData {
    currentUser: Pick<UserData, "uid" | "username" | "roles"> | null,
    piAuthVersion?: number,
    piAuthenticatedUntil?: number,
  }
}
