/**
 * MCP Tool Definitions for Earth Agent
 *
 * These tools map to the Earth Agent's internal tools and are exposed via MCP
 * for use by Claude Code, Zed, Cursor, and other AI assistants.
 */

export interface ToolDefinition {
  description: string;
  inputSchema: {
    type: 'object';
    properties: { [key: string]: object };
    required?: string[];
  };
}

export const tools: Record<string, ToolDefinition> = {
  // ==========================================
  // Utility Tools
  // ==========================================
  weather: {
    description: `Get current weather for a location.

Returns temperature, conditions, humidity, wind speed, etc.
Useful when the user asks about weather conditions for a study area.`,
    inputSchema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Location name (e.g., "San Francisco", "Tokyo, Japan")',
        },
      },
      required: ['location'],
    },
  },

  date_time: {
    description: `Get current date and time.

Returns the current date and time, optionally in a specific timezone.
Useful for timestamping operations or understanding when data was collected.`,
    inputSchema: {
      type: 'object',
      properties: {
        timezone: {
          type: 'string',
          description: 'Optional timezone (e.g., "America/Los_Angeles", "UTC", "Asia/Tokyo")',
        },
      },
    },
  },

  wait: {
    description: `Wait for a specified number of seconds.

Use this when you need to wait for:
- Code execution to complete
- Map layers to render
- Data to load

Maximum wait time is 60 seconds.`,
    inputSchema: {
      type: 'object',
      properties: {
        seconds: {
          type: 'number',
          description: 'Number of seconds to wait (0.5 to 60)',
        },
      },
      required: ['seconds'],
    },
  },

  // ==========================================
  // Code Manipulation Tools
  // ==========================================
  read_gee_code: {
    description: `Read the current code from the Google Earth Engine Code Editor.

Returns the full content of the code editor, which can be used to understand the current state before making edits.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  edit_gee_code: {
    description: `Edit code in the GEE editor using old_string/new_string replacement.

This tool finds the exact old_string in the editor and replaces it with new_string.
The old_string must match exactly (including whitespace and indentation).

Use this for targeted edits to existing code.`,
    inputSchema: {
      type: 'object',
      properties: {
        old_string: {
          type: 'string',
          description: 'The exact string to find and replace in the editor',
        },
        new_string: {
          type: 'string',
          description: 'The string to replace it with',
        },
      },
      required: ['old_string', 'new_string'],
    },
  },

  write_gee_code: {
    description: `Overwrite the entire Google Earth Engine Code Editor with new code.

This replaces ALL content in the editor. Use this when:
- Starting fresh with new code
- The existing code is not relevant
- Major rewrites are needed

WARNING: This will delete all existing code in the editor!`,
    inputSchema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'The complete code to write to the editor',
        },
      },
      required: ['code'],
    },
  },

  undo_gee_edit: {
    description: `Undo the last code edit in the Google Earth Engine editor.

Use this to revert the most recent change if something went wrong.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // ==========================================
  // Code Execution Tools
  // ==========================================
  run_gee_code: {
    description: `Execute the current code in the Google Earth Engine Code Editor.

This clicks the "Run" button in the GEE editor to execute the code.
After running, you can use gee_console to check for output or errors.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // ==========================================
  // Browser/Visual Tools
  // ==========================================
  gee_screenshot: {
    description: `Take a screenshot of the Google Earth Engine interface.

Returns a screenshot image showing the current state of the GEE Code Editor,
including the map, console, and any visualizations.

Useful for:
- Seeing map layer results
- Checking chart visualizations
- Debugging visual issues`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  gee_snapshot: {
    description: `Get an accessibility snapshot of the Google Earth Engine page.

Returns a YAML representation of the DOM accessibility tree, showing
interactive elements with their reference IDs.

Useful for:
- Understanding page structure
- Finding elements to click
- Debugging UI interactions`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // ==========================================
  // Earth Engine State Tools
  // ==========================================
  gee_console: {
    description: `Read the output from the Google Earth Engine console.

Returns the current console output, including:
- Print statements from code execution
- Error messages
- Task status messages

Use this after running code to check results.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  gee_map_position: {
    description: `Get the current map position and bounds in Google Earth Engine.

Returns:
- Center coordinates (latitude, longitude)
- Zoom level
- Visible bounds`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  gee_inspector: {
    description: `Read the Inspector panel output in Google Earth Engine.

Returns data from the Inspector panel, including:
- Pixel values at clicked locations
- Layer information
- Band values for image layers`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  clear_gee: {
    description: `Clear the Google Earth Engine map, inspector, and console.

Resets the environment by:
- Clearing map layers
- Clearing inspector data
- Clearing console output

Use this to start fresh or clean up between operations.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },

  // ==========================================
  // Documentation Tools
  // ==========================================
  gee_docs: {
    description: `Search Google Earth Engine documentation and datasets.

Search types:
- "datasets": Search official GEE data catalog
- "community": Search community datasets
- "api": Search API documentation

Returns relevant documentation, code examples, and dataset information.`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query (e.g., "Landsat 8", "NDVI calculation", "ee.Image.clip")',
        },
        type: {
          type: 'string',
          enum: ['datasets', 'community', 'api'],
          description: 'Type of documentation to search. Default is "datasets".',
        },
      },
      required: ['query'],
    },
  },

  // ==========================================
  // Utility Tools
  // ==========================================
  click_element: {
    description: `Click an element in the GEE interface by its reference ID.

Use gee_snapshot first to find element reference IDs, then use this tool
to interact with buttons, links, and other clickable elements.`,
    inputSchema: {
      type: 'object',
      properties: {
        ref_id: {
          type: 'string',
          description: 'The reference ID of the element to click (from gee_snapshot)',
        },
      },
      required: ['ref_id'],
    },
  },

  click_position: {
    description: `Click at a specific screen position in the GEE interface.

Useful for clicking on map locations or elements without reference IDs.`,
    inputSchema: {
      type: 'object',
      properties: {
        x: {
          type: 'number',
          description: 'X coordinate (pixels from left)',
        },
        y: {
          type: 'number',
          description: 'Y coordinate (pixels from top)',
        },
      },
      required: ['x', 'y'],
    },
  },
};

export type ToolName = keyof typeof tools;
