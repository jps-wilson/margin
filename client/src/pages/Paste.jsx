import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import PageState from "../components/PageState";
import "./Paste.css";

function Paste() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

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
            ref={inputRef}
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

        {error && (
          <PageState
            state='error'
            className='page-state--inline'
            title='Invalid file URL'
            message={error}
            actionLabel='Clear'
            onAction={() => {
              setError("");
              setUrl("");
              inputRef.current?.focus();
            }}
          />
        )}

        <button
          type='button'
          className='helper-link helper-link--button'
          onClick={() => setShowHelp((prev) => !prev)}
        >
          how do I find this?
        </button>

        {showHelp && (
          <div className='helper-panel'>
            <p>Open the Figma file in your browser and copy the full URL.</p>
            <p>
              It should look like:{" "}
              <code>https://www.figma.com/design/.../File-Name</code>
            </p>
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default Paste;
