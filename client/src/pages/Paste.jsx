import { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setSessionId } from "../api";
import PageShell from "../components/PageShell";
import PageState from "../components/PageState";
import "./Paste.css";

function Paste() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [animateDemo, setAnimateDemo] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const pasteTimerRef = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const sessionId = searchParams.get("session");
    if (sessionId) {
      setSessionId(sessionId);
      searchParams.delete("session");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const DEMO_URL = "https://www.figma.com/design/abc123/File-Name";

  function extractFileKey(input) {
    try {
      const parsed = new URL(input);
      const match = parsed.pathname.match(/\/(design|file)\/([a-zA-Z0-9]+)/);
      return match ? match[2] : null;
    } catch {
      return null;
    }
  }

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

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pasteTimerRef.current) {
        clearTimeout(pasteTimerRef.current);
        pasteTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function toggleHelp() {
    setShowHelp((prev) => {
      const opening = !prev;
      if (!opening) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        if (pasteTimerRef.current) {
          clearTimeout(pasteTimerRef.current);
          pasteTimerRef.current = null;
        }
        setAnimateDemo(false);
      } else {
        setAnimateDemo(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setAnimateDemo(false);
          timerRef.current = null;
        }, 1800);
      }
      return opening;
    });
  }

  function handleDemoCopy() {
    // copy demo URL to clipboard (best-effort)
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(DEMO_URL).catch((err) => {
        console.warn("Clipboard write failed", err);
      });
    } else {
      const t = document.createElement("textarea");
      t.value = DEMO_URL;
      document.body.appendChild(t);
      t.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.warn("execCommand copy failed", err);
      }
      document.body.removeChild(t);
    }

    // animate demo and simulate paste into the input mid-way
    setAnimateDemo(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);

    // simulate paste into the real input after animation midpoint
    pasteTimerRef.current = setTimeout(() => {
      setUrl(DEMO_URL);
      inputRef.current?.focus();
      pasteTimerRef.current = null;
    }, 900);

    // stop animation at end
    timerRef.current = setTimeout(() => {
      setAnimateDemo(false);
      timerRef.current = null;
    }, 1800);
  }

  function onCopyChipKey(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleDemoCopy();
    }
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
            aria-describedby={error ? "paste-error" : undefined}
          />
          <button
            type='button'
            className='cta-button'
            onClick={handleSubmit}
            disabled={url.trim() === ""}
          >
            <span>Continue</span>
            <span className='arrow' aria-hidden='true'>
              →
            </span>
          </button>
        </div>

        {error && (
          <PageState
            state='error'
            id='paste-error'
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
          onClick={toggleHelp}
        >
          how do I find this?
        </button>

        {showHelp && (
          <div
            className='helper-panel helper-panel--browser'
            aria-live='polite'
          >
            <div
              className={`browser-mock${animateDemo ? " is-animating" : ""}`}
              aria-hidden='true'
            >
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
                    <span className='address-text'>{DEMO_URL}</span>
                    <span className='address-caret' />
                  </div>

                  <div className='address-actions'>
                    <span
                      className='copy-chip'
                      role='button'
                      tabIndex={0}
                      aria-label='Copy example Figma URL'
                      onClick={handleDemoCopy}
                      onKeyDown={onCopyChipKey}
                    >
                      Copy
                    </span>
                  </div>
                </div>

                <div className='motion-chip'>Copied</div>

                <div className='motion-arrow'>↓</div>

                <div className='paste-target'>
                  <span className='paste-target__label'>Paste here</span>
                  <div className='paste-target__field'>
                    <span className='paste-target__text paste-target__text--ghost'>
                      https://www.figma.com/design/...
                    </span>
                    <span className='paste-target__text paste-target__text--filled'>
                      {DEMO_URL}
                    </span>
                  </div>
                </div>
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
