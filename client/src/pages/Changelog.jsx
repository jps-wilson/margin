import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell";
import Scrubber from "../components/Scrubber";
import Overlay from "../components/Overlay";
import { fetchDiff } from "../api";
import "./Changelog.css";

const BADGE_LABELS = {
  added: "added",
  removed: "removed",
  moved: "moved",
  resized: "resized",
  text: "text",
};

function Changelog() {
  const [expandedSections, setExpandedSections] = useState({});
  const { fileKey } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("changelog");

  const stats = data
    ? data.sections
        .flatMap((section) => section.changes)
        .reduce((acc, change) => {
          acc[change.type] = (acc[change.type] || 0) + 1;
          return acc;
        }, {})
    : {};

  function toggleSection(name) {
    setExpandedSections((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  }

  const missingParams = !from || !to;

  useEffect(() => {
    if (missingParams) return;

    let cancelled = false;

    async function loadDiff() {
      setLoading(true);
      setError("");
      try {
        const result = await fetchDiff(fileKey, from, to);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load diff.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDiff();

    return () => {
      cancelled = true;
    };
  }, [fileKey, from, to, missingParams]);

  if (missingParams) {
    return (
      <PageShell className='changelog-page'>
        <p className='changelog-error'>Missing version parameters.</p>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell className='changelog-page'>
        <p className='changelog-loading loading-text'>Comparing versions</p>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell className='changelog-page'>
        <p className='changelog-error'>{error}</p>
      </PageShell>
    );
  }

  const sortedSections = data
    ? [...data.sections].sort((a, b) => b.changes.length - a.changes.length)
    : [];

  return (
    <PageShell
      className='changelog-page'
      backTo={`/versions/${fileKey}`}
      backLabel='versions'
    >
      <section className='changelog-section'>
        <h1 className='changelog-title'>{data.fileName}</h1>
        <p className='changelog-meta'>
          {data.fromDate && data.toDate
            ? `${new Date(data.fromDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → ${new Date(data.toDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · `
            : ""}
          {data.totalChanges} change{data.totalChanges !== 1 ? "s" : ""}
        </p>

        {/* Summary Panel */}
        <div className='summary-panel'>
          <div className='summary-stat'>
            <strong>{data.totalChanges}</strong>
            <span>Total Changes</span>
          </div>

          <div className='summary-stat'>
            <strong>{data.sections.length}</strong>
            <span>Sections Changed</span>
          </div>
        </div>

        <div className='change-stats'>
          <div className='change-stat'>
            <span className='change-stat-label'>Added</span>
            <strong>{stats.added || 0}</strong>
          </div>

          <div className='change-stat'>
            <span className='change-stat-label'>Removed</span>
            <strong>{stats.removed || 0}</strong>
          </div>

          <div className='change-stat'>
            <span className='change-stat-label'>Moved</span>
            <strong>{stats.moved || 0}</strong>
          </div>

          <div className='change-stat'>
            <span className='change-stat-label'>Resized</span>
            <strong>{stats.resized || 0}</strong>
          </div>

          <div className='change-stat'>
            <span className='change-stat-label'>Text</span>
            <strong>{stats.text || 0}</strong>
          </div>
        </div>

        <div className='tab-row'>
          <button
            type='button'
            className={`tab ${activeTab === "changelog" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("changelog")}
          >
            Changelog
          </button>
          <button
            type='button'
            className={`tab ${activeTab === "scrubber" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("scrubber")}
          >
            Scrubber
          </button>
          <button
            type='button'
            className={`tab ${activeTab === "overlay" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("overlay")}
          >
            Overlay
          </button>
        </div>

        {activeTab === "changelog" && (
          <div className='changelog-list'>
            {sortedSections.map((section) => (
              <div className='changelog-group' key={section.name}>
                <button
                  type='button'
                  className='section-header'
                  onClick={() => toggleSection(section.name)}
                >
                  <div className='section-header-left'>
                    <h2 className='section-title'>{section.name}</h2>

                    <span className='section-meta'>
                      {section.changes.length} changes
                    </span>
                  </div>

                  <span
                    className={`section-arrow ${
                      expandedSections[section.name]
                        ? "section-arrow--expanded"
                        : ""
                    }`}
                    aria-hidden='true'
                  >
                    ▶
                  </span>
                </button>

                {expandedSections[section.name] && (
                  <div className='change-rows'>
                    {section.changes.map((change, i) => (
                      <div className='change-row' key={i}>
                        <span
                          className={`change-badge change-badge--${change.type}`}
                        >
                          {BADGE_LABELS[change.type]}
                        </span>
                        <div className='change-info'>
                          <span className='change-name'>{change.name}</span>
                          <span className='change-delta'>{change.delta}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "scrubber" && (
          <Scrubber
            fileKey={fileKey}
            from={from}
            to={to}
            sections={data.sections}
          />
        )}

        {activeTab === "overlay" && (
          <Overlay
            fileKey={fileKey}
            from={from}
            to={to}
            sections={data.sections}
          />
        )}
      </section>
    </PageShell>
  );
}

export default Changelog;
