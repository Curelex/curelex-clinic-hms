import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import IMS App (wrapped with its own Router)
import IMSApp from './ims/App';
// Import Clinic App
import ClinicApp from './clinic/App';

function App() {
  return (
    <Router>
      <Routes>
        {/* Redirect root straight into clinic — no more selector page */}
        <Route path="/" element={<Navigate to="/clinic" replace />} />

        {/* IMS System - all routes under /ims */}
        <Route path="/ims/*" element={<IMSApp />} />

        {/* Clinic System - all routes under /clinic */}
        <Route path="/clinic/*" element={<ClinicApp />} />

        {/* Redirect any unknown routes to clinic */}
        <Route path="*" element={<Navigate to="/clinic" replace />} />
      </Routes>
    </Router>
  );
}

export default App;