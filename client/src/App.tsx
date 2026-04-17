import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Landing from "./components/Landing";
import AuthPortal from "./components/AuthPortal";
import RouteLoader from "./components/RouteLoader";
import GameApp from "./GameApp";

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" reverseOrder={false} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/go" element={<RouteLoader />} />
        <Route path="/auth" element={<AuthPortal />} />
        <Route path="/play" element={<GameApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
