"use client";

import { usePageTracking } from "@/hooks/usePageTracking";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, useRef } from "react";

// Constants
const TOGGLE_MAP = {
  1: [0, 1, 3],
  2: [0, 1, 2, 4],
  3: [1, 2, 5],
  4: [0, 3, 4, 6],
  5: [1, 3, 4, 5, 7],
  6: [2, 4, 5, 8],
  7: [3, 6, 7],
  8: [4, 6, 7, 8],
  9: [5, 7, 8],
};

const ANIMATION_DELAY = 300;
const GRID_SIZE = 9;

export default function CodeLockSolverPage() {
  usePageTracking();
  const { hasAccess, loading, user } = useAuth();

  // State
  const [cells, setCells] = useState<boolean[]>(Array(GRID_SIZE).fill(true));
  const [solution, setSolution] = useState<number[]>([]);
  const [solutionTitle, setSolutionTitle] = useState<string>("");
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [autoSolveThreshold, setAutoSolveThreshold] = useState<number>(0);
  const [highlightSolution, setHighlightSolution] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Refs
  const cellRefs = useRef<(HTMLDivElement | null)[]>(
    Array(GRID_SIZE).fill(null)
  );

  // Load settings from localStorage
  useEffect(() => {
    const savedThreshold = localStorage.getItem("autoSolveThreshold");
    if (savedThreshold !== null) {
      setAutoSolveThreshold(parseInt(savedThreshold));
    }

    const savedHighlight = localStorage.getItem("highlightSolution");
    if (savedHighlight !== null) {
      setHighlightSolution(savedHighlight === "true");
    }
  }, []);

  // Redirect if no access
  useEffect(() => {
    if (!loading && !hasAccess) {
      window.location.href = "/";
    }
  }, [hasAccess, loading]);

  // Utility functions
  const arraysEqual = (a: number[], b: number[]) => {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  };

  const combinations = (arr: number[], k: number): number[][] => {
    const result: number[][] = [];

    function helper(start: number, currentCombination: number[]) {
      if (currentCombination.length === k) {
        result.push([...currentCombination]);
        return;
      }

      for (let i = start; i < arr.length; i++) {
        currentCombination.push(arr[i]);
        helper(i + 1, currentCombination);
        currentCombination.pop();
      }
    }

    helper(0, []);
    return result;
  };

  const applyPress = (grid: number[], presses: number[]): number[] => {
    const newGrid = [...grid];
    for (const press of presses) {
      const toggleIndices = TOGGLE_MAP[press as keyof typeof TOGGLE_MAP];
      for (const idx of toggleIndices) {
        newGrid[idx] ^= 1;
      }
    }
    return newGrid;
  };

  const getTargetState = (): number[] => {
    return cells.map((cell) => (cell ? 1 : 0));
  };

  // Event handlers
  const handleCellClick = (index: number) => {
    const newCells = [...cells];
    newCells[index] = !newCells[index];
    setCells(newCells);

    // Check auto-solve threshold
    if (autoSolveThreshold > 0) {
      const offCount = newCells.filter((cell) => !cell).length;
      if (offCount >= autoSolveThreshold) {
        // Use requestAnimationFrame to ensure the state is updated before solving
        requestAnimationFrame(() => {
          solve(newCells);
        });
      }
    }
  };

  const solve = (cellsToSolve = cells) => {
    if (isAnimating) return;

    const target = cellsToSolve.map((cell) => (cell ? 1 : 0));
    const allButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    // Try solutions from 0 to 9 button presses
    for (let numPresses = 0; numPresses <= GRID_SIZE; numPresses++) {
      const combos = combinations(allButtons, numPresses);

      for (const combo of combos) {
        const result = applyPress(new Array(GRID_SIZE).fill(1), combo);
        if (arraysEqual(result, target)) {
          setSolution(combo);
          setSolutionTitle("Solution:");

          // Animate solution if enabled
          if (highlightSolution) {
            animatePresses(combo);
          }
          return;
        }
      }
    }

    // No solution found
    setSolution([]);
    setSolutionTitle("No solution found.");
  };

  const animatePresses = async (steps: number[]) => {
    setIsAnimating(true);

    for (const step of steps) {
      const index = step - 1;
      const cell = cellRefs.current[index];

      if (cell) {
        cell.classList.add("highlight");
        await new Promise((resolve) => setTimeout(resolve, ANIMATION_DELAY));
        cell.classList.remove("highlight");
      }
    }

    setIsAnimating(false);
  };

  const resetGrid = () => {
    setCells(Array(GRID_SIZE).fill(true));
    setSolution([]);
    setSolutionTitle("");
  };

  const toggleHelp = () => {
    setShowHelp(!showHelp);
    setShowSettings(false);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
    setShowHelp(false);
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    setAutoSolveThreshold(value);
    localStorage.setItem("autoSolveThreshold", value.toString());
  };

  const handleHighlightToggleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setHighlightSolution(e.target.checked);
    localStorage.setItem("highlightSolution", e.target.checked.toString());
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00c6ff]"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] to-[#1a1a1a] text-[#e0e0e0] flex flex-col items-center px-4 py-8">
      <h1 className="text-4xl md:text-5xl font-bold my-4 text-white drop-shadow-md">
        Code Lock Solver
      </h1>

      {/* Help & Settings Buttons */}
      <button
        className="absolute right-20 top-20 md:top-24 text-2xl text-[#e0e0e0] hover:text-[gold] hover:scale-110 transition-all z-50"
        onClick={toggleHelp}
        aria-label="Help"
      >
        ❓
      </button>

      <button
        className="absolute right-8 top-20 md:top-24 text-2xl text-[#e0e0e0] hover:text-[gold] hover:scale-110 transition-all z-50"
        onClick={toggleSettings}
        aria-label="Settings"
      >
        ⚙️
      </button>

      {/* Help Popup */}
      {showHelp && (
        <div className="fixed top-20 right-4 md:right-16 bg-[rgba(20,20,20,0.75)] backdrop-blur-xl border border-white/15 text-[#e0e0e0] p-5 rounded-2xl max-w-xs md:max-w-sm max-h-[70vh] overflow-y-auto z-50 shadow-xl">
          <strong>How to Use:</strong>
          <br />
          <br />
          This Code Lock Solver is used for the{" "}
          <span className="text-[gold]">ELAN Life ARMA Server</span> during
          <span className="text-[gold]"> fuel station robberies.</span>
          <br />
          <br />
          When robbing, you'll see a "Lights Out" puzzle on crates. You have{" "}
          <strong>3 seconds</strong> to view it before it resets.
          <br />
          <br />
          <span className="text-[gold]">
            Use this tool on a second device
          </span>{" "}
          (like a phone or tablet). Tap the boxes on this grid to match the{" "}
          <span className="text-[gold]">[OFF]</span> lights you see in-game.
          <br />
          <br />
          Tap "Solve" to view the solution. Then quickly tap the correct boxes
          in-game in the shown order to complete the puzzle.
          <br />
          <br />
          <hr className="border-t border-white/20 my-3" />
          <strong>Settings Explained:</strong>
          <br />
          <br />
          <span className="text-[gold]">Auto Solve Threshold:</span>
          <br />
          If enabled, this{" "}
          <span className="text-[gold]">
            automatically triggers the solver
          </span>{" "}
          when the selected number of lights are toggled{" "}
          <span className="text-[gold]">OFF</span>. Set to
          <span className="text-[gold]"> OFF</span> to disable auto-solving
          entirely.
          <br />
          <br />
          <span className="text-[gold]">Highlight Solution:</span>
          <br />
          When enabled, the solver will{" "}
          <span className="text-[gold]">
            highlight the correct grid squares in order
          </span>{" "}
          after solving to help you follow the solution visually. Turn this OFF
          for a quicker, distraction-free solution.
          <br />
          <br />
          <div
            className="text-right mt-3 text-[#bbb] cursor-pointer hover:text-white"
            onClick={toggleHelp}
          >
            ✖ Close
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed top-20 right-4 md:right-16 bg-[rgba(20,20,20,0.75)] backdrop-blur-xl border border-white/15 text-[#e0e0e0] p-5 rounded-2xl max-w-xs md:max-w-sm z-50 shadow-xl">
          <strong>Customizations:</strong>
          <br />
          <br />
          <div className="mb-4">
            Auto Solve Threshold:
            <br />
            <select
              id="thresholdSelect"
              value={autoSolveThreshold}
              onChange={handleThresholdChange}
              className="w-full mt-2 p-2.5 bg-[#2a2a2a] text-[#e0e0e0] border border-white/10 rounded-lg focus:outline-none focus:border-[gold] focus:ring-1 focus:ring-[gold]/30"
            >
              <option value="0">OFF</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                id="highlightToggle"
                checked={highlightSolution}
                onChange={handleHighlightToggleChange}
                className="accent-[gold]"
              />
              Highlight Solution
            </label>
          </div>

          <div
            className="text-right mt-3 text-[#bbb] cursor-pointer hover:text-white"
            onClick={toggleSettings}
          >
            ✖ Close
          </div>
        </div>
      )}

      {/* Puzzle Grid */}
      <div className="w-full max-w-[320px] mb-6 sticky top-0 z-10">
        <div className="grid grid-cols-3 gap-2.5 p-3 bg-[rgba(20,20,20,0.75)] backdrop-blur-xl border border-white/15 rounded-2xl">
          {cells.map((isOn, index) => (
            <div
              key={index}
              ref={(el) => {
                cellRefs.current[index] = el;
              }}
              className={`aspect-square ${
                isOn ? "bg-[gold] text-black" : "bg-[#2a2a2a] text-[#e0e0e0]"
              } 
                flex items-center justify-center text-xl md:text-2xl font-semibold 
                border-2 ${isOn ? "border-white/20" : "border-white/10"} 
                rounded-xl cursor-pointer shadow-md transition-all duration-100
                hover:shadow-lg`}
              onClick={() => handleCellClick(index)}
              role="button"
              tabIndex={0}
              aria-label={`Cell ${index + 1}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleCellClick(index);
                }
              }}
            >
              {index + 1}
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-4 mb-6 flex-wrap">
        <button
          onClick={() => solve()}
          disabled={isAnimating}
          className="px-6 py-3 text-base md:text-lg font-semibold bg-[rgba(20,20,20,0.75)] backdrop-blur-xl border border-white/15 text-[#e0e0e0] rounded-xl shadow-md hover:bg-white/10 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Solve
        </button>
        <button
          onClick={resetGrid}
          className="px-6 py-3 text-base md:text-lg font-semibold bg-[rgba(20,20,20,0.75)] backdrop-blur-xl border border-white/15 text-[#e0e0e0] rounded-xl shadow-md hover:bg-white/10 hover:shadow-lg transition-all"
        >
          Reset
        </button>
      </div>

      {/* Solution Display */}
      {solutionTitle && (
        <div className="text-lg md:text-xl font-semibold mb-3">
          {solutionTitle}
        </div>
      )}

      {solution.length > 0 && (
        <div className="flex gap-2.5 p-3 bg-[rgba(20,20,20,0.75)] backdrop-blur-xl border border-white/15 rounded-2xl overflow-x-auto max-w-full">
          {solution.map((step, index) => (
            <div
              key={index}
              className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-[#2a2a2a] text-[#e0e0e0] flex items-center justify-center text-lg md:text-xl font-semibold border-2 border-white/10 rounded-xl shadow-md"
            >
              {step}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        /* Custom highlight animation */
        .highlight {
          box-shadow: 0 0 20px 5px rgba(255, 255, 255, 0.7);
          transform: scale(1.05);
        }

        /* Custom scrollbar for solution grid */
        div::-webkit-scrollbar {
          height: 8px;
        }

        div::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }

        div::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 4px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}