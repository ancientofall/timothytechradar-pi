import { createBrowserRouter } from "react-router-dom";
import Shop from "./pages/Shop";
import PolicyPage from "./pages/PolicyPage";
import EngagementTasksPage from "./pages/EngagementTasksPage.tsx";

export const router = createBrowserRouter([
  { path: "/help", element: <PolicyPage kind="help" /> },
  { path: "/refunds", element: <PolicyPage kind="refunds" /> },
  { path: "/privacy", element: <PolicyPage kind="privacy" /> },
  { path: "/terms", element: <PolicyPage kind="terms" /> },
  {
    path: "/",
    element: <Shop />,
  },
  {
    path: "/engagement-tasks",
    element: <EngagementTasksPage />,
  },
]);

export default router;
