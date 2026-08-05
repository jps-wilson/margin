import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { checkAuth } from "../api";
import { API_BASE } from "../api";
import PageShell from "./PageShell";
import PageState from "./PageState";

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    async function run() {
      const authCode = searchParams.get("authCode");
      if (authCode) {
        const res = await fetch(`${API_BASE}/auth/finish?code=${authCode}`, {
          credentials: "include",
        });
        searchParams.delete("authCode");
        setSearchParams(searchParams, { replace: true });
        if (res.ok) {
          setStatus("ok");
          return;
        }
      }
      const authenticated = await checkAuth();
      setStatus(authenticated ? "ok" : "unauth");
    }
    run();
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
