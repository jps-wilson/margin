import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import "./Paste.css";

function Paste() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // parse the url and pull out the file key using a regex
  function extractFileKey(input) {
    try {
      const parsed = new URL(input);
      // Match figma.com/design/KEY or figma.com/file/KEY
      const match = parsed.pathname.match(/\/(design|file)\/([a-zA-Z0-9]+)/);
      if (match) return match[2];
      return null;
    } catch {
      return null;
    }
  }
  // validates and navigates to /versions/:fileKey
  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const fileKey = extractFileKey(url.trim());

    if (!fileKey) {
      setError("That doesn't look like a Figma file URL.");
      return;
    }

    navigate(`/versions/${fileKey}`);
  }

  return (
    <PageShell className='paste-page' backTo='/' backLabel='home'>
      <section className='paste-section'>
        <h1 className='paste-heading'>
          Paste a <span className='ember'>file URL.</span>
        </h1>

        <p className='paste-subhead'>
          Margin will compare two versions and show what changed.
        </p>

        <div className='paste-row'>
          <input
            className='paste-input'
            type='text'
            placeholder='https://figma.com/design/...'
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit(e);
            }}
          />
          <button className='cta-button' onClick={handleSubmit}>
            <span>Continue</span>
            <span className='arrow' aria-hidden='true'>
              →
            </span>
          </button>
        </div>

        {error && <p className='paste-error'>{error}</p>}

        <a className='helper-link' href='#'>
          how do I find this?
        </a>
      </section>
    </PageShell>
  );
}

export default Paste;
