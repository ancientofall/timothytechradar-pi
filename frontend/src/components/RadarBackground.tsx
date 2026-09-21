import { useEffect, useState } from "react";

export default function RadarBackground() {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [motionChoice, setMotionChoice] = useState<boolean | null>(null);
  const paused = motionChoice ?? reducedMotion;
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReducedMotion(preference.matches);
      setMotionChoice(null);
    };
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  return <>
    <div className={`radar-background${paused ? " radar-paused" : ""}${motionChoice === false ? " radar-motion-enabled" : ""}`} aria-hidden="true">
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
    <button className="radar-motion-control" type="button" aria-pressed={paused} onClick={() => setMotionChoice(!paused)}>
      <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span> {paused ? "Resume radar" : "Pause radar"}
    </button>
  </>;
}
