# Earth Agent Tool Combinations & Dependencies

This document describes which tools should be used together and why.

## 📊 All Available Tools (15 total)

### 🌍 Earth Engine Tools (8 tools)
1. **earthEngineDataset** - Search Earth Engine datasets
2. **earthEngineScript** - Edit/insert code in the Code Editor
3. **earthEngineRunCode** - Execute code and capture results
4. **clearScript** - Clear the Code Editor
5. **getConsoleOutput** - Read console errors/logs
6. **getScriptTool** - Read current script content
7. **getMapInfo** - Get current map layers and metadata
8. **getInspectorOutput** - Read Inspector panel data at coordinates

### 🖥️ Browser Tools (4 tools)
9. **screenshot** - Capture page screenshot
10. **snapshot** - Get DOM/accessibility tree
11. **clickByRefId** - Click element by reference ID
12. **clickByCoordinates** - Click element by coordinates

### 🔧 Utility Tools (3 tools)
13. **resetMapInspectorConsole** - Reset Map/Inspector/Console state
14. **weather** - Get weather for a location
15. **dateTime** - Get current date/time

---

## 🔗 Tool Combination Patterns

### Pattern 1: Code Development Workflow

**Common Sequence:**
```
1. earthEngineDataset (find datasets)
   ↓
2. earthEngineScript (write code)
   ↓
3. earthEngineRunCode (execute)
   ↓
4. getConsoleOutput (check for errors)
   ↓
5. getMapInfo (verify visualization)
```

**Why these tools work together:**
- Dataset search provides the exact dataset IDs and band names
- Script editing inserts code using those IDs
- Running code executes the visualization
- Console output catches any errors
- Map info verifies the layers were created

**Example use case:**
> "Show me NDVI for California using Landsat 8"

Agent should:
1. Use `earthEngineDataset` to find "LANDSAT/LC08/C02/T1_L2"
2. Use `earthEngineScript` to insert NDVI calculation code
3. Use `earthEngineRunCode` to execute
4. Use `getConsoleOutput` to check for errors
5. Use `getMapInfo` to confirm the NDVI layer is displayed

---

### Pattern 2: Debugging Workflow

**Common Sequence:**
```
1. getConsoleOutput (see the error)
   ↓
2. getScriptTool (read current code)
   ↓
3. earthEngineScript (fix the code)
   ↓
4. earthEngineRunCode (re-execute)
   ↓
5. getConsoleOutput (verify fix)
```

**Why these tools work together:**
- Console shows what went wrong
- Script read shows the problematic code
- Script edit fixes the issue
- Re-run tests the fix
- Console confirms success

**Example use case:**
> "My code is throwing an error, can you fix it?"

Agent should:
1. Use `getConsoleOutput` to see the exact error message
2. Use `getScriptTool` to read the current code
3. Identify the issue and use `earthEngineScript` to fix it
4. Use `earthEngineRunCode` to test
5. Use `getConsoleOutput` to confirm no errors

---

### Pattern 3: Map Inspection Workflow

**Common Sequence:**
```
1. getMapInfo (see what layers exist)
   ↓
2. clickByCoordinates (click a point on the map)
   ↓
3. getInspectorOutput (read pixel values at that point)
```

**Why these tools work together:**
- Map info shows available layers
- Clicking activates the Inspector
- Inspector output retrieves the data

**Example use case:**
> "What's the NDVI value at San Francisco (lat: 37.77, lng: -122.42)?"

Agent should:
1. Use `getMapInfo` to confirm NDVI layer exists
2. Use `clickByCoordinates` at (37.77, -122.42)
3. Use `getInspectorOutput` to read the NDVI value

---

### Pattern 4: Fresh Start Workflow

**Common Sequence:**
```
1. resetMapInspectorConsole (clean slate)
   ↓
2. clearScript (remove old code)
   ↓
3. earthEngineScript (write new code)
   ↓
4. earthEngineRunCode (execute)
```

**Why these tools work together:**
- Reset clears any old visualizations/errors
- Clear removes old code
- Fresh code can be written
- Clean execution without interference

**Example use case:**
> "Let's start fresh and visualize Sentinel-2 imagery"

Agent should:
1. Use `resetMapInspectorConsole` to clear everything
2. Use `clearScript` to remove old code
3. Use `earthEngineScript` to write Sentinel-2 code
4. Use `earthEngineRunCode` to visualize

---

### Pattern 5: Screenshot & Documentation Workflow

**Common Sequence:**
```
1. earthEngineRunCode (create visualization)
   ↓
2. getMapInfo (verify layers)
   ↓
3. screenshot (capture the result)
```

**Why these tools work together:**
- Code creates the visualization
- Map info confirms it worked
- Screenshot documents the result

**Example use case:**
> "Create an NDVI map and take a screenshot"

Agent should:
1. Use `earthEngineRunCode` to visualize NDVI
2. Use `getMapInfo` to confirm layer is visible
3. Use `screenshot` to capture the map

---

## ⚠️ Tool Dependencies (Must Use Together)

### Critical Dependencies:

#### 1. **clickByCoordinates → getInspectorOutput**
- **Must use together** when inspecting pixel values
- Clicking activates the Inspector
- Inspector tool reads the activated data
- **Never use** `getInspectorOutput` alone without clicking first

#### 2. **earthEngineScript → earthEngineRunCode**
- **Should use together** for code development
- Writing code without running it leaves the user without results
- Running without writing assumes code exists

#### 3. **earthEngineRunCode → getConsoleOutput**
- **Should use together** to catch errors
- Many GEE errors only appear in console
- Without console check, silent failures go unnoticed

#### 4. **resetMapInspectorConsole → (earthEngineScript or clearScript)**
- **Should use together** for clean slate
- Reset without follow-up leaves empty editor
- Typically followed by new code

---

## 🚫 Tools That Should NOT Be Used Together

### Anti-Patterns:

#### 1. **clearScript + earthEngineRunCode** (without script edit in between)
- ❌ Clearing then immediately running will execute nothing
- ✅ Should be: `clearScript → earthEngineScript → earthEngineRunCode`

#### 2. **getInspectorOutput** (without prior click)
- ❌ Inspector is empty unless user clicked or agent clicked
- ✅ Should be: `clickByCoordinates → getInspectorOutput`

#### 3. **Multiple resetMapInspectorConsole** (in same workflow)
- ❌ Resetting multiple times wastes tool calls
- ✅ Use once at start if needed

---

## 📋 Tool Combination Checklist

When the AI agent is working on a task, it should consider:

### For Code Tasks:
- [ ] Did I search for datasets first? (`earthEngineDataset`)
- [ ] Did I run the code after editing? (`earthEngineRunCode`)
- [ ] Did I check for errors? (`getConsoleOutput`)
- [ ] Did I verify the visualization? (`getMapInfo`)

### For Debugging Tasks:
- [ ] Did I read the error message? (`getConsoleOutput`)
- [ ] Did I examine the current code? (`getScriptTool`)
- [ ] Did I fix and re-run? (`earthEngineScript` + `earthEngineRunCode`)

### For Inspection Tasks:
- [ ] Did I check what layers exist? (`getMapInfo`)
- [ ] Did I click before inspecting? (`clickByCoordinates`)
- [ ] Did I read the inspector data? (`getInspectorOutput`)

### For Fresh Start Tasks:
- [ ] Did I reset the state? (`resetMapInspectorConsole`)
- [ ] Did I clear old code? (`clearScript`)
- [ ] Did I write new code? (`earthEngineScript`)

---

## 💡 Recommendations for Agent Prompts

The system prompts should include guidance like:

### For Ask Mode (Read-Only):
```
When helping users understand their Earth Engine code:
1. Use getConsoleOutput to check for errors
2. Use getScriptTool to read their code
3. Use getMapInfo to see their visualizations
4. Use getInspectorOutput to examine pixel values (after clicking)
5. Use screenshot to document results
```

### For Do Mode (Full Access):
```
When creating Earth Engine visualizations:
1. Start with earthEngineDataset to find the right data
2. Use earthEngineScript to write code with correct dataset IDs
3. Always follow with earthEngineRunCode to execute
4. Check getConsoleOutput for errors immediately after running
5. Use getMapInfo to verify the visualization appeared
6. For pixel inspection, use clickByCoordinates then getInspectorOutput

When debugging:
1. Use getConsoleOutput to see the error
2. Use getScriptTool to read current code
3. Fix with earthEngineScript
4. Re-run with earthEngineRunCode
5. Verify fix with getConsoleOutput

When starting fresh:
1. Use resetMapInspectorConsole to clear state
2. Use clearScript to remove old code
3. Proceed with normal workflow
```

---

## 📊 Tool Usage Statistics (Recommended)

Based on typical workflows, expected tool usage frequency:

| Tool | Frequency | Common Combos |
|------|-----------|---------------|
| earthEngineScript | Very High | → earthEngineRunCode → getConsoleOutput |
| earthEngineRunCode | Very High | ← earthEngineScript, → getConsoleOutput |
| getConsoleOutput | High | ← earthEngineRunCode |
| getMapInfo | High | ← earthEngineRunCode |
| earthEngineDataset | Medium | → earthEngineScript |
| getScriptTool | Medium | → earthEngineScript |
| clickByCoordinates | Medium | → getInspectorOutput |
| getInspectorOutput | Medium | ← clickByCoordinates |
| screenshot | Low | ← getMapInfo |
| resetMapInspectorConsole | Low | → clearScript |
| clearScript | Low | ← resetMapInspectorConsole |
| snapshot | Very Low | Standalone |
| clickByRefId | Very Low | Standalone |
| weather | Very Low | Standalone |
| dateTime | Very Low | Standalone |

---

## 🎯 Next Steps

1. **Add tool relationship hints to system prompts**
   - Update `GEE_DO_MODE_PROMPT` and `GEE_ASK_MODE_PROMPT`
   - Include common workflows in tool descriptions

2. **Implement tool chaining suggestions**
   - After certain tools, suggest logical next steps
   - E.g., after `earthEngineScript`, suggest `earthEngineRunCode`

3. **Add tool combination validation**
   - Warn if using anti-patterns
   - E.g., `getInspectorOutput` without prior `clickByCoordinates`

4. **Track tool usage patterns**
   - Log which tools are used together
   - Identify missing combinations
   - Optimize prompts based on usage
