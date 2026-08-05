import { useEffect, useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { checkAuth } from "../api";
import { API_BASE } from "../api";
import PageShell from "./PageShell";
import PageState from "./PageState";

function ProtectedRoute({ children }) {
  const [status, setStatus] = useState("checking");
  const [searchParams, setSearchParams] = useSearchParams();
  const authCode = searchParams.get("authCode");

  useEffect(() => {
    async function run() {
      if (authCode) {
        const res = await fetch(`${API_BASE}/auth/finish?code=${authCode}`, {
          credentials: "include",
        });

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("authCode");
        setSearchParams(nextParams, { replace: true });

        if (res.ok) {
          setStatus("ok");
          return;
        }
      }

      const authenticated = await checkAuth();
      setStatus(authenticated ? "ok" : "unauth");
    }
    run();
  }, [authCode, searchParams, setSearchParams]);

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
