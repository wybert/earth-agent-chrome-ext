import React, { useState } from "react";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { checkForErrorsDuringMapGeneration } from "@/lib/Console log";

// Dummy map generation function for demonstration
async function dummyGenerateMap() {
  // Simulate async work and possible error
  await new Promise((resolve) => setTimeout(resolve, 500));
  // Uncomment to simulate an error:
  // console.error("Map generation failed!");
}

export function ConsoleLogButton() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const output = await checkForErrorsDuringMapGeneration();
    setResult(output);
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Checking..." : "Check Map Generation Errors"}
      </Button>
      <Textarea value={result} readOnly placeholder="Result will appear here..." />
    </div>
  );
} 