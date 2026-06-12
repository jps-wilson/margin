import { useEffect, useMemo, useRef, useState } from "react";
import { fetchFrameImage } from "../api";
import "./Scrubber.css";

function Scrubber({ fileKey, from, to, sections }) {
  const framesWithIds = useMemo(() => sections.filter((s) => s.id), [sections]);
  const [selectedFrameId, setSelectedFrameId] = useState(
    () => framesWithIds[0]?.id || null,
  );

  // get selectedFrame from id + available frames
  const selectedFrame = useMemo(() => {
    if (!framesWithIds.length) return null;
    return (
      framesWithIds.find((f) => f.id === selectedFrameId) || framesWithIds[0]
    );
  }, [framesWithIds, selectedFrameId]);

  const [fromImage, setFromImage] = useState(null);
  const [toImage, setToImage] = useState(null);
  const [sliderPos, setSliderPos] = useState(55);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!selectedFrame) return;

    let cancelled = false;

    async function loadImages() {
      setFromImage(null);
      setToImage(null);

      try {
        const [fromUrl, toUrl] = await Promise.all([
          fetchFrameImage(fileKey, selectedFrame.id, from),
          fetchFrameImage(fileKey, selectedFrame.id, to),
        ]);

        if (!cancelled) {
          setFromImage(fromUrl);
          setToImage(toUrl);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch frame images:", err);
        }
      }
    }

    loadImages();

    return () => {
      cancelled = true;
    };
  }, [selectedFrame, fileKey, from, to]);

  function updateSliderFromClientX(clientX) {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(percent);
  }

  function handleMouseDown(e) {
    updateSliderFromClientX(e.clientX);
    setDragging(true);
  }

  useEffect(() => {
    function handleMouseMove(e) {
      updateSliderFromClientX(e.clientX);
    }

    function handleMouseUp() {
      setDragging(false);
    }

    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  if (framesWithIds.length === 0) {
    return (
      <div className='scrubber-empty'>
        <p className='placeholder-text'>No frames available to compare</p>
      </div>
    );
  }

  return (
    <div className='scrubber-view'>
      <div className='scrubber-controls'>
        <span className='scrubber-label'>Viewing:</span>
        <select
          className='scrubber-select'
          value={selectedFrame?.id || ""}
          onChange={(e) => {
            setSelectedFrameId(e.target.value || null);
          }}
        >
          {framesWithIds.map((frame) => (
            <option key={frame.id} value={frame.id}>
              {frame.name}
            </option>
          ))}
        </select>
      </div>

      <div className='scrubber-badges'>
        <span className='badge badge--from'>from</span>
        <span className='badge badge--to'>to</span>
      </div>

      <div
        className='scrubber-container'
        ref={containerRef}
        onMouseDown={handleMouseDown}
      >
        {!fromImage || !toImage ? (
          <div className='scrubber-loading'>
            <p className='placeholder-text loading-text'>
              Loading frame images
            </p>
          </div>
        ) : (
          <>
            <img
              className='scrubber-image scrubber-image--to'
              src={toImage}
              alt='To version'
            />
            <img
              className='scrubber-image scrubber-image--from'
              src={fromImage}
              alt='From version'
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            />
            <div
              className='scrubber-divider'
              style={{ left: `${sliderPos}%` }}
              onMouseDown={handleMouseDown}
            >
              <div className='scrubber-handle'>
                <svg
                  width='16'
                  height='16'
                  viewBox='0 0 16 16'
                  fill='none'
                  aria-hidden='true'
                >
                  <path
                    d='M6 4L2 8L6 12'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                  <path
                    d='M10 4L14 8L10 12'
                    stroke='currentColor'
                    strokeWidth='1.5'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Scrubber;
