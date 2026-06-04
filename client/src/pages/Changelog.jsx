import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import PageShell from "../components/PageShell";
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
  const { fileKey } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("changelog");

  useEffect(() => {
    async function loadDiff() {
      try {
        const result = await fetchDiff(fileKey, from, to);
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (from && to) loadDiff();
  }, [fileKey, from, to]);

  if (loading) {
    return (
      <PageShell className='changelog-page'>
        <p className='changelog-loading'>Comparing versions...</p>
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

  return (
    <PageShell className='changelog-page'>
      <section className='changelog-section'>
        <h1 className='changelog-title'>Changelog</h1>
        <p className='changelog-meta'>
          {data.totalChanges} change{data.totalChanges !== 1 ? "s" : ""}{" "}
          detected
        </p>

        <div className='tab-row'>
          <button
            className={`tab ${activeTab === "changelog" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("changelog")}
          >
            Changelog
          </button>
          <button
            className={`tab ${activeTab === "scrubber" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("scrubber")}
          >
            Scrubber
          </button>
          <button
            className={`tab ${activeTab === "overlay" ? "tab--active" : ""}`}
            onClick={() => setActiveTab("overlay")}
          >
            Overlay
          </button>
        </div>

        {activeTab === "changelog" && (
          <div className='changelog-list'>
            {data.sections.map((section) => (
              <div className='changelog-group' key={section.name}>
                <h2 className='section-title'>{section.name}</h2>
                <span className='section-meta'>
                  {section.changes.length} change
                  {section.changes.length !== 1 ? "s" : ""}
                </span>

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
              </div>
            ))}
          </div>
        )}

        {activeTab === "scrubber" && (
          <div className='tab-placeholder'>
            <p className='placeholder-text'>Scrubber view coming soon.</p>
          </div>
        )}

        {activeTab === "overlay" && (
          <div className='tab-placeholder'>
            <p className='placeholder-text'>Overlay view coming soon.</p>
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default Changelog;
