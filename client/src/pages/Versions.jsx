import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import { fetchVersions } from "../api";
import "./Versions.css";

function groupByWeek(versions) {
  const now = new Date();
  const groups = [];
  const weekMap = new Map();

  versions.forEach((v) => {
    const created = new Date(v.created_at);
    const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    let label;
    if (diffDays < 7) label = "THIS WEEK";
    else if (diffDays < 14) label = "LAST WEEK";
    else if (diffDays < 21) label = "2 WEEKS AGO";
    else if (diffDays < 28) label = "3 WEEKS AGO";
    else label = `${Math.floor(diffDays / 7)} WEEKS AGO`;

    if (!weekMap.has(label)) {
      weekMap.set(label, { label, named: [], autoSaves: [] });
    }

    const group = weekMap.get(label);
    if (v.label) {
      group.named.push(v);
    } else {
      group.autoSaves.push(v);
    }
  });

  weekMap.forEach((group) => groups.push(group));
  return groups;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Versions() {
  const { fileKey } = useParams();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromVersion, setFromVersion] = useState(null);
  const [toVersion, setToVersion] = useState(null);

  useEffect(() => {
    async function loadVersions() {
      try {
        const data = await fetchVersions(fileKey);
        const versionList = data.versions || [];

        setVersions(versionList);

        // Default selection: most recent names as "to", second named as "from"
        const named = versionList.filter((v) => v.label);
        if (named.length >= 2) {
          setToVersion(named[0]);
          setFromVersion(named[1]);
        } else if (named.length === 1) {
          setToVersion(named[0]);
          if (versionList.length >= 2) setFromVersion(versionList[1]);
        } else if (versionList.length >= 2) {
          setToVersion(versionList[0]);
          setFromVersion(versionList[1]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadVersions();
  }, [fileKey]);

  function handleSelect(version, type) {
    if (type === "to") {
      setToVersion(version);
      // if same as from, clear from
      if (fromVersion && fromVersion.id === version.id) setFromVersion(null);
    } else {
      setFromVersion(version);
      // if same to, clear to
      if (toVersion && toVersion.id === version.id) setToVersion(null);
    }
  }

  function handleContinue() {
    if (!fromVersion || !toVersion) return;
    // for now, navigate to a placeholder changelog route
    navigate(`/changelog/${fileKey}?from=${fromVersion.id}&to=${toVersion.id}`);
  }

  const groups = groupByWeek(versions);
  const namedCount = versions.filter((v) => v.label).length;
  const autoSaveCount = versions.length - namedCount;

  if (loading) {
    return (
      <PageShell className='versions-page'>
        <p className='versions-loading'>Loading versions...</p>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell className='versions-page'>
        <p className='versions-error'>{error}</p>
      </PageShell>
    );
  }

  return (
    <PageShell className='versions-page'>
      <section className='versions-section'>
        <h1 className='versions-title'>Version History</h1>
        <p className='versions-meta'>
          {versions.length} versions · {namedCount} named, {autoSaveCount}{" "}
          auto-saved
        </p>
        <div className='versions-list'>
          {groups.map((group) => (
            <div className='version-group' key={group.label}>
              <span className='group-label'>{group.label}</span>

              {(namedCount > 0 ? group.named : group.autoSaves).map((v) => {
                const isTo = toVersion && toVersion.id === v.id;
                const isFrom = fromVersion && fromVersion.id === v.id;
                let cardClass = "version-card";
                if (isTo) cardClass += " version-card--to";
                if (isFrom) cardClass += " version-card--from";

                return (
                  <div className={cardClass} key={v.id}>
                    <div className='version-card-top'>
                      <span className='version-name'>
                        {v.label || formatDate(v.created_at)}
                      </span>
                      {isTo && <span className='badge badge--to'>to</span>}
                      {isFrom && (
                        <span className='badge badge--from'>from</span>
                      )}
                      {!isTo && !isFrom && (
                        <span className='version-actions'>
                          <button
                            className='select-btn'
                            onClick={() => handleSelect(v, "from")}
                          >
                            from
                          </button>
                          <button
                            className='select-btn'
                            onClick={() => handleSelect(v, "to")}
                          >
                            to
                          </button>
                        </span>
                      )}
                    </div>
                    <span className='version-sub'>
                      {formatDate(v.created_at)} · by{" "}
                      {v.user?.handle || "Unknown"}
                    </span>
                  </div>
                );
              })}

              {namedCount > 0 && group.autoSaves.length > 0 && (
                <span className='autosave-count'>
                  + {group.autoSaves.length} auto-save
                  {group.autoSaves.length !== 1 ? "s" : ""}{" "}
                  {group.label.toLowerCase()}
                </span>
              )}
            </div>
          ))}
        </div>

        {fromVersion && toVersion && (
          <div className='versions-footer'>
            <button className='cta-button' onClick={handleContinue}>
              <span>Continue</span>
              <span className='arrow' aria-hidden='true'>
                →
              </span>
            </button>
            <span className='versions-caption'>
              {fromVersion.label || formatDate(fromVersion.created_at)} →{" "}
              {toVersion.label || formatDate(toVersion.created_at)}
            </span>
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default Versions;
