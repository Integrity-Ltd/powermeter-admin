import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import Navigation from './components/Nav';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from "./pages/Home";
import PowerMeter from "./pages/power_meter";
import Channels from "./pages/channels";
import Expert from "./pages/expert";

function App() {
  return (
    <div>
      <Navigation />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/power_meter" element={<PowerMeter />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/expert" element={<Expert />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
