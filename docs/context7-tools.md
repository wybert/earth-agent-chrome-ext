# Context7 Tools for Google Earth Engine Documentation

This document describes the tools implemented for retrieving Google Earth Engine dataset documentation using the Context7 API.

## Overview

The tools provide a way to search for and retrieve documentation about Google Earth Engine datasets. The implementation consists of two main functions:

1. **resolveLibraryId** - Searches for and resolves a library name to a Context7-compatible library ID
2. **getDocumentation** - Retrieves documentation content using a Context7-compatible library ID

Additionally, wrapper functions are provided to make it easier for AI agents to use these tools:

1. **searchEarthEngineDatasets** - Searches specifically for Earth Engine datasets
2. **getEarthEngineDocumentation** - Gets documentation for Earth Engine datasets
3. **getEarthEngineDatasetInfo** - Combined tool that performs a search and retrieves documentation in one step

## Installation

The tools are already integrated into the Earth Engine Agent project and are available in the `src/lib/tools/context7` directory.

## Usage

### Basic Usage

```typescript
import { resolveLibraryId, getDocumentation } from '../lib/tools/context7';

// First, search for a library ID
const libraryResult = await resolveLibraryId('Earth Engine datasets');

if (libraryResult.success && libraryResult.libraryId) {
  // Then use the ID to get documentation
  const docResult = await getDocumentation(libraryResult.libraryId, 'Landsat');
  
  if (docResult.success && docResult.content) {
    console.log(docResult.content);
  }
}
```

### Agent Usage

For AI agent implementation, use the wrapper functions:

```typescript
import { 
  searchEarthEngineDatasets,
  getEarthEngineDocumentation,
  getEarthEngineDatasetInfo 
} from '../lib/tools/context7/agentTools';

// Combined search and retrieve in one step (recommended for agents)
const result = await getEarthEngineDatasetInfo('MODIS');

if (result.success && result.content) {
  // Use the documentation content
  console.log(result.content);
}
```

## API Reference

### resolveLibraryId

```typescript
async function resolveLibraryId(libraryName: string): Promise<ResolveLibraryIdResponse>
```

**Parameters:**
- `libraryName` (string): The library name to search for (e.g., "Earth Engine", "MODIS")

**Returns:**
- `Promise<ResolveLibraryIdResponse>`: Object containing:
  - `success` (boolean): Whether the operation was successful
  - `libraryId` (string | null): The resolved Context7-compatible library ID
  - `message` (string, optional): Error or status message
  - `alternatives` (string[], optional): Alternative library IDs if available

### getDocumentation

```typescript
async function getDocumentation(
  context7CompatibleLibraryID: string,
  topic?: string,
  tokens: number = 5000
): Promise<GetDocumentationResponse>
```

**Parameters:**
- `context7CompatibleLibraryID` (string): The library ID from resolveLibraryId
- `topic` (string, optional): Topic to filter documentation (e.g., "population", "landsat")
- `tokens` (number, optional): Maximum number of tokens to retrieve (default: 5000)

**Returns:**
- `Promise<GetDocumentationResponse>`: Object containing:
  - `success` (boolean): Whether the operation was successful
  - `content` (string | null): The documentation content
  - `message` (string, optional): Error or status message
  - `tokens` (number, optional): Number of tokens in the response

### Agent Helper Functions

#### searchEarthEngineDatasets

```typescript
async function searchEarthEngineDatasets(query: string)
```

**Parameters:**
- `query` (string): Search query or specific dataset name

**Returns:**
- Object containing:
  - `success` (boolean): Whether the operation was successful
  - `libraryId` (string, if successful): The resolved Context7-compatible library ID
  - `message` (string): Status or error message
  - `alternatives` (string[], optional): Alternative library IDs if available

#### getEarthEngineDocumentation

```typescript
async function getEarthEngineDocumentation(
  libraryId: string,
  topic: string,
  maxTokens: number = 5000
)
```

**Parameters:**
- `libraryId` (string): The library ID (from searchEarthEngineDatasets or directly specified)
- `topic` (string): Topic to filter documentation (e.g., "population", "landsat")
- `maxTokens` (number, optional): Maximum tokens to retrieve (default: 5000)

**Returns:**
- Object containing:
  - `success` (boolean): Whether the operation was successful
  - `content` (string, if successful): The documentation content
  - `tokens` (number, optional): Number of tokens in the response
  - `message` (string): Status or error message

#### getEarthEngineDatasetInfo

```typescript
async function getEarthEngineDatasetInfo(topic: string, maxTokens: number = 5000)
```

**Parameters:**
- `topic` (string): The topic or dataset to search for
- `maxTokens` (number, optional): Maximum tokens to retrieve (default: 5000)

**Returns:**
- Object containing:
  - `success` (boolean): Whether the operation was successful
  - `content` (string, if successful): The documentation content
  - `tokens` (number, optional): Number of tokens in the response
  - `message` (string): Status or error message
  - `alternatives` (string[], if search failed): Alternative library IDs

## Examples

See the example file at `src/examples/context7Example.ts` for complete usage examples.

## Error Handling

All functions return a `success` boolean to indicate if the operation was successful. If not successful, a `message` property will provide details about the error. Always check the `success` property before attempting to use the results.

## Testing

Tests are available in the `src/lib/tools/context7/__tests__` directory and can be run with:

```bash
npm test
```

## Context7 API Endpoints

The tools interact with the following Context7 API endpoints:

1. Search for library IDs:  
   `https://context7.com/api/v1/search?query="your query"`

2. Get documentation:  
   `https://context7.com/api/v1/{libraryId}?topic="optional topic"&tokens=5000` 