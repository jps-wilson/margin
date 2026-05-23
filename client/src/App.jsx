import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Paste from "./pages/Paste";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Landing />} />
        <Route path='/paste' element={<Paste />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
