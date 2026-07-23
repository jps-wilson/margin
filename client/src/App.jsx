import ProtectedRoute from "./components/ProtectedRoute";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Paste from "./pages/Paste";
import Versions from "./pages/Versions";
import Changelog from "./pages/Changelog";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Landing />} />
        <Route
          path='/paste'
          element={
            <ProtectedRoute>
              <Paste />
            </ProtectedRoute>
          }
        />
        <Route
          path='/versions/:fileKey'
          element={
            <ProtectedRoute>
              <Versions />
            </ProtectedRoute>
          }
        />
        <Route
          path='/changelog/:fileKey'
          element={
            <ProtectedRoute>
              <Changelog />
            </ProtectedRoute>
          }
        />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
