import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { checkAuth } from "../api";
import PageShell from "./PageShell";
import PageState from "./PageState";

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    checkAuth().then((authenticated) => {
      setStatus(authenticated ? "ok" : "unauth");
    });
  }, []);

  if (status === "checking") {
    return (
      <PageShell>
        <PageState state='loading' title='Checking connection' />
      </PageShell>
    );
  }

  if (status === "unauth") {
    return <Navigate to='/' replace />;
  }

  return children;
}

export default ProtectedRoute;
