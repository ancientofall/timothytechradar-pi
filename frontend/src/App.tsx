import { RouterProvider } from "react-router-dom";
import router from "./Router.tsx";
import RadarBackground from "./components/RadarBackground";

function App() {
  return <><RadarBackground /><RouterProvider router={router} /></>;
}

export default App;
