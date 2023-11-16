import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "primeflex/primeflex.css";
import Navigation from './components/Nav';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from "./pages/Home";
import Assets from "./pages/assets";
import Channels from "./pages/channels";
import Expert from "./pages/measurements_expert";
import Simple from "./pages/measurements_simple";
import MeasurementsSQLite from "./pages/measurements_sqlite";
import Powermeter from "./pages/powermeter";
import Statistics from "./pages/statistics";

function App() {
  return (
    <div>
      <Navigation />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/statistics" element={<Statistics />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/powermeter" element={<Powermeter />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/measurements_sqlite" element={<MeasurementsSQLite />} />
          <Route path="/measurements_expert" element={<Expert />} />
          <Route path="/measurements_simple" element={<Simple />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
