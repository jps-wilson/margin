import { useState, useEffect } from "react";
import { fetchFrameImage } from "../api";
import "./Overlay.css";

function Overlay({ fileKey, from, to, sections }) {
  const framesWithIds = sections.filter((s) => s.id);
  const [selectedFrame, setSelectedFrame] = useState(framesWithIds[0] || null);
  const [fromImage, setFromImage] = useState(null);
  const [toImage, setToImage] = useState(null);
  const [opacity, setOpacity] = useState(50);

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

  if (framesWithIds.length === 0) {
    return (
      <div className='overlay-empty'>
        <p className='placeholder-text'>No frames available to compare.</p>
      </div>
    );
  }

  return (
    <div className='overlay-view'>
      <div className='overlay-controls'>
        <span className='overlay-label'>Viewing:</span>
        <select
          className='overlay-select'
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

      <div className='overlay-badges'>
        <span className='badge badge--from'>from</span>
        <span className='badge badge--to'>to</span>
      </div>

      <div className='overlay-container'>
        {!fromImage || !toImage ? (
          <div className='overlay-loading'>
            <p className='placeholder-text'>Loading frame images...</p>
          </div>
        ) : (
          <>
            <img
              className='overlay-image overlay-image--from'
              src={fromImage}
              alt='From version'
            />
            <img
              className='overlay-image overlay-image--to'
              src={toImage}
              alt='To version'
              style={{ opacity: opacity / 100 }}
            />
          </>
        )}
      </div>

      <div className='overlay-slider-row'>
        <span className='overlay-slider-label'>from</span>
        <input
          className='overlay-slider'
          type='range'
          min='0'
          max='100'
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
        />
        <span className='overlay-slider-label'>to</span>
      </div>
    </div>
  );
}

export default Overlay;
