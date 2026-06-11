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
          <div
            className='helper-panel helper-panel--browser'
            aria-live='polite'
          >
            <div className='browser-mock' aria-hidden='true'>
              <div className='browser-chrome'>
                <span className='browser-dot browser-dot--red' />
                <span className='browser-dot browser-dot--yellow' />
                <span className='browser-dot browser-dot--green' />
                <div className='browser-tab'>Figma — File</div>
              </div>

              <div className='browser-content'>
                <div className='address-row'>
                  <span className='address-label'>figma.com</span>
                  <div className='address-bar'>
                    <span className='address-text'>
                      https://www.figma.com/design/abc123/File-Name
                    </span>
                    <span className='address-caret' />
                  </div>
                  <div className='copy-chip'>Copy</div>
                </div>

                <div className='motion-arrow'>↓</div>

                <div className='paste-target'>
                  <span className='paste-target__label'>Paste here</span>
                  <div className='paste-target__field'>
                    <span className='paste-target__text'>
                      https://www.figma.com/design/...
                    </span>
                  </div>
                </div>

                <div className='motion-chip'>Copied</div>
              </div>
            </div>

            <p className='helper-panel__text'>
              Open the Figma file, copy the full URL from the address bar, then
              paste it here.
            </p>
          </div>
        )}
      </section>
    </PageShell>
  );
}

export default Paste;
