import { useEffect, useRef } from "react";
import { RUNNER_VERSION, run } from "play.core/src/run";
import { Settings } from "play.core/src/modules/types";
import { program } from "./program";

const settings: Settings = {
  element: null,
  cols: 0,
  rows: 0,
  once: false,
  fps: 30,
  renderer: "text",
  allowSelect: false,
  restoreState: false,
  backgroundColor: "#000000",
};

function App() {
  const canvas = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (canvas.current) {
      run(program, {
        ...settings,
        element: canvas.current,
      });
    }
  }, []);

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          padding: "10px",
          color: "white",
          backgroundColor: "black",
        }}
      >
        Runner version: {RUNNER_VERSION}
      </div>
      <div
        ref={canvas}
        style={{ width: "100vw", height: "100vh", overflow: "hidden" }}
      ></div>
    </>
  );
}

export default App;
