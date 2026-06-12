import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import PageState from "../components/PageState";
import { fetchVersions, fetchFileInfo } from "../api";
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
  const [retryCount, setRetryCount] = useState(0);
  const [fromVersion, setFromVersion] = useState(null);
  const [toVersion, setToVersion] = useState(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadVersions() {
      setLoading(true);
      setError("");

      try {
        const fileInfo = await fetchFileInfo(fileKey);
        const data = await fetchVersions(fileKey);
        const versionList = data.versions || [];

        if (cancelled) return;

        setFileName(fileInfo.name);
        setVersions(versionList);

        // Default selection: most recent names as "to", second named as "from"
        const named = versionList.filter((v) => v.label);
        if (named.length >= 2) {
          setToVersion(named[0]);
          setFromVersion(named[1]);
        } else if (named.length === 1) {
          setToVersion(named[0]);
          setFromVersion(versionList[1] || null);
        } else if (versionList.length >= 2) {
          setToVersion(versionList[0]);
          setFromVersion(versionList[1]);
        } else {
          setToVersion(null);
          setFromVersion(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load versions.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadVersions();

    return () => {
      cancelled = true;
    };
  }, [fileKey, retryCount]);

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

  function handleCardClick(version) {
    const isTo = toVersion && toVersion.id === version.id;
    const isFrom = fromVersion && fromVersion.id === version.id;

    if (isTo) {
      setToVersion(null);
    } else if (isFrom) {
      setFromVersion(null);
    } else if (!toVersion) {
      setToVersion(version);
    } else if (!fromVersion) {
      setFromVersion(version);
    } else {
      // Both slots filled - replace "to"
      setToVersion(version);
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
        <PageState state='loading' title='Loading versions' />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell className='versions-page'>
        <PageState
          state='error'
          title='Could not load versions'
          message={error}
          actionLabel='Try again'
          onAction={() => setRetryCount((count) => count + 1)}
        />
      </PageShell>
    );
  }

  if (!versions.length) {
    return (
      <PageShell className='versions-page'>
        <PageState
          state='empty'
          title='No versions found'
          message='This file does not have any versions to compare yet.'
          actionLabel='Back to home'
          actionTo='/'
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      className='versions-page'
      backTo='/paste'
      backLabel='paste a URL'
    >
      <section className='versions-section'>
        <h1 className='versions-title'>{fileName || "Version History"}</h1>
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
                  <div
                    className={cardClass}
                    key={v.id}
                    onClick={() => handleCardClick(v)}
                  >
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(v, "from");
                            }}
                          >
                            from
                          </button>
                          <button
                            className='select-btn'
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(v, "to");
                            }}
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
                  {group.autoSaves.length !== 1 ? "s" : ""}
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
