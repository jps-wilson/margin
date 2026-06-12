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
        <Route path='/paste' element={<Paste />} />
        <Route path='/versions/:fileKey' element={<Versions />} />
        <Route path='/changelog/:fileKey' element={<Changelog />} />
        <Route path='*' element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
