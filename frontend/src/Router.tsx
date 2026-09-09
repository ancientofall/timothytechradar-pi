import { createBrowserRouter } from "react-router-dom";
import Shop from "./pages/Shop";
import Preview from "./pages/Preview";
import StoreLayout from "./pages/StoreLayout";
import Downloads from "./pages/Downloads";
import Contact from "./pages/Contact";
import PolicyPage from "./pages/PolicyPage";
import EngagementTasksPage from "./pages/EngagementTasksPage.tsx";

export const router = createBrowserRouter([
  { path: "/preview/:slug", element: <Preview /> },
  { path: "/help", element: <PolicyPage kind="help" /> },
  { path: "/refunds", element: <PolicyPage kind="refunds" /> },
  { path: "/privacy", element: <PolicyPage kind="privacy" /> },
  { path: "/terms", element: <PolicyPage kind="terms" /> },
  {
    path: "/",
    element: <StoreLayout />,
    children: [
      { index: true, element: <Shop /> },
      { path: "downloads", element: <Downloads /> },
      { path: "contact", element: <Contact /> },
    ],
  },
  {
    path: "/engagement-tasks",
    element: <EngagementTasksPage />,
  },
]);

export default router;
