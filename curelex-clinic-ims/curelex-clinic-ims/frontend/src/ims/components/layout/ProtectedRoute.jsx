import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    // Save redirect path only for real protected routes
    const loginPath = "/dashboard/pharmacy/login";
    if (!location.pathname.includes(loginPath)) {
      sessionStorage.setItem("ims_redirectPath", location.pathname);
    }
    // Pass current location as state — don't use window.location
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  return children;
};

export default ProtectedRoute;