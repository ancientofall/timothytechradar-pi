import { useState } from "react";

export default function RadarBackground() {
  const [paused, setPaused] = useState(false);
  return <>
    <div className={`radar-background${paused ? " radar-paused" : ""}`} aria-hidden="true">
      <div className="radar-grid" />
      <div className="radar-scope">
        <div className="radar-rings" />
        <div className="radar-sweep" />
        <i className="radar-blip radar-blip-one" />
        <i className="radar-blip radar-blip-two" />
        <i className="radar-blip radar-blip-three" />
        <span className="radar-center" />
      </div>
    </div>
    <button className="radar-motion-control" type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>
      <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span> {paused ? "Resume radar" : "Pause radar"}
    </button>
  </>;
}
