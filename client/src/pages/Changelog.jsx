import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import "../Changelog.css";

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
    async function fetchDiff() {
      try {
        const res = await fetch(
          `http://localhost:3000/api/diff/${fileKey}?from=${from}&to=${to}`,
        );
        if (!res.ok) throw new Error("Failed to fetch diff");
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (from && to) fetchDiff();
  }, [fileKey, from, to]);

  if (loading) {
    return (
      <main className='changelog-page'>
        <div className='margin-rule' aria-hidden='true' />
        <div className='content'>
          <header className='wordmark-area'>
            <span className='wordmark'>margin</span>
            <span className='microcopy'>← notes for files</span>
          </header>
          <p className='changelog-loading'>Comparing versions...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='changelog-page'>
        <div className='margin-rule' aria-hidden='true' />
        <div className='content'>
          <header className='wordmark-area'>
            <span className='wordmark'>margin</span>
            <span className='microcopy'>← notes for files</span>
          </header>
          <p className='changelog-error'>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className='changelog-page'>
      <div className='margin-rule' aria-hidden='true' />

      <div className='content'>
        <header className='wordmark-area'>
          <span className='wordmark'>margin</span>
          <span className='microcopy'>← notes for files</span>
        </header>

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
      </div>
    </main>
  );
}

export default Changelog;
