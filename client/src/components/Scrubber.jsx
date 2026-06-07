import { useState, useEffect, useRef } from "react";
import { fetchFrameImage } from "../api";
import "./Scrubber.css";

function Scrubber({ fileKey, from, to, sections }) {
  const framesWithIds = sections.filter((s) => s.id);
  const [selectedFrame, setSelectedFrame] = useState(framesWithIds[0] || null);
  const [fromImage, setFromImage] = useState(null);
  const [toImage, setToImage] = useState(null);
  const [sliderPos, setSliderPos] = useState(55);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!selectedFrame) return;

    async function loadImages() {
      setFromImage(null);
      setToImage(null);
      try {
        const [fromUrl, toUrl] = await Promise.all([
          fetchFrameImage(fileKey, selectedFrame.id, from),
          fetchFrameImage(fileKey, selectedFrame.id, to),
        ]);
        setFromImage(fromUrl);
        setToImage(toUrl);
      } catch (err) {
        console.error("Failed to fetch frame images:", err);
      }
    }
    loadImages();
  }, [selectedFrame, fileKey, from, to]);

  function handleMouseDown() {
    setDragging(true);
  }

  useEffect(() => {
    function handleMouseMove(e) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPos(percent);
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
            const frame = framesWithIds.find((f) => f.id === e.target.value);
            setSelectedFrame(frame);
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

      <div className='scrubber-container' ref={containerRef}>
        {!fromImage || !toImage ? (
          <div className='scrubber-loading'>
            <p className='placeholder-text loading text'>
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
                <span>◂ ▸</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Scrubber;
