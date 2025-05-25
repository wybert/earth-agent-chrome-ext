import React, { useState, useEffect } from 'react';
import {
  searchEarthEngineDatasets,
  getEarthEngineDocumentation,
  getEarthEngineDatasetInfo
} from '@/lib/tools/context7/agentTools';
import { resolveLibraryId, getDocumentation } from '@/lib/tools/context7';
import { 
  runCode, 
  inspectMap, 
  checkConsole, 
  getTasks, 
  editScript 
} from '@/lib/tools/earth-engine';
import {
  runEarthEngineCode,
  inspectEarthEngineMap,
  checkEarthEngineConsole,
  getEarthEngineTasks,
  editEarthEngineScript,
  getEarthEngineMapLayers
} from '@/lib/tools/earth-engine/agentTools';
import { detectEnvironment } from '@/lib/utils';
import { click, typeText, getElement, screenshot, clickByRef, getElementByRefId } from '@/lib/tools/browser';
import { hover } from '@/lib/tools/browser/hover';
import { snapshot } from '@/lib/tools/browser/snapshot';

interface ToolsTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ToolsTestPanel: React.FC<ToolsTestPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<string>('resolveLibraryId');
  const [activeSection, setActiveSection] = useState<string>('context7');
  const [query, setQuery] = useState<string>('Earth Engine');
  const [libraryId, setLibraryId] = useState<string>('');
  const [topic, setTopic] = useState<string>('Landsat');
  const [tokens, setTokens] = useState<string>('5000');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [environment, setEnvironment] = useState<any>(null);
  
  // Earth Engine tool state
  const [eeCode, setEeCode] = useState<string>('// Earth Engine code\nvar image = ee.Image(1);\nprint(image);');
  const [eeLatitude, setEeLatitude] = useState<number>(37.7749);
  const [eeLongitude, setEeLongitude] = useState<number>(-122.4194);
  const [eeScriptId, setEeScriptId] = useState<string>('users/example/myScript');
  const [eeScriptContent, setEeScriptContent] = useState<string>('// Earth Engine script\nvar image = ee.Image(1);\nprint(image);');
  
  // Browser tools state
  const [elementSelector, setElementSelector] = useState<string>('button.goog-button.run-button[title="Run script (Ctrl+Enter)"]');
  const [inputText, setInputText] = useState<string>('Test text');
  const [appendText, setAppendText] = useState<boolean>(false);
  const [elementLimit, setElementLimit] = useState<number>(5);
  const [screenshotImage, setScreenshotImage] = useState<string | null>(null);
  const [clickMethod, setClickMethod] = useState<'selector' | 'coordinates' | 'refId'>('selector'); // Added 'refId'
  const [clickX, setClickX] = useState<number>(0);
  const [clickY, setClickY] = useState<number>(0);
  const [clickRefId, setClickRefId] = useState<string>(''); // Added state for clickRefId
  const [elementRefId, setElementRefId] = useState<string>('e1'); // New state for getElementByRefId

  useEffect(() => {
    setEnvironment(detectEnvironment());
  }, []);

  if (!isOpen) return null;

  const runTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      let result;
      
      // Context7 tools
      if (activeSection === 'context7') {
        if (activeTab === 'resolveLibraryId') {
          result = await resolveLibraryId(query);
        } else if (activeTab === 'getDocumentation') {
          result = await getDocumentation(libraryId, topic);
        } else if (activeTab === 'searchEarthEngineDatasets') {
          result = await searchEarthEngineDatasets(query);
        } else if (activeTab === 'getEarthEngineDocumentation') {
          result = await getEarthEngineDocumentation(libraryId, topic);
        } else if (activeTab === 'getEarthEngineDatasetInfo') {
          result = await getEarthEngineDatasetInfo(topic);
        }
      } 
      // Earth Engine tools
      else if (activeSection === 'earthEngine') {
        if (activeTab === 'runCode') {
          result = await runEarthEngineCode(eeCode);
        } else if (activeTab === 'runButton') {
          // Use the browser click function to click the Earth Engine run button
          // Note: This is for testing purposes. In real usage, you would first take a snapshot
          // to get proper element references, then use those references for clicking.
          result = await click({ 
            element: 'Earth Engine Run Button',
            ref: 'ee-run-button-test' // This won't work in practice - just for testing
          });
        } else if (activeTab === 'inspectMap') {
          result = await inspectEarthEngineMap(eeLatitude, eeLongitude);
        } else if (activeTab === 'checkConsole') {
          result = await checkEarthEngineConsole();
        } else if (activeTab === 'getTasks') {
          result = await getEarthEngineTasks();
        } else if (activeTab === 'editScript') {
          result = await editEarthEngineScript(eeScriptId, eeScriptContent);
        } else if (activeTab === 'getMapLayers') {
          result = await getEarthEngineMapLayers();
        }
      }
      // Browser automation tools
      else if (activeSection === 'browser') {
      switch (activeTab) {
          case 'screenshot':
            result = await screenshot();
            if (result.success && result.screenshotData) {
              setScreenshotImage(result.screenshotData);
          }
          break;
          case 'snapshot':
            result = await snapshot();
            break;
          case 'click':
            // Note: This is for testing purposes. In real usage, you would first take a snapshot
            // to get proper element references, then use those references for clicking.
            if (clickMethod === 'coordinates') {
              // For coordinates, we'll create a mock element description and ref
              result = await click({
                element: `Element at coordinates (${clickX}, ${clickY})`,
                ref: 'click-by-coordinates-test-only' // This won't work in practice - just for testing
              });
            } else if (clickMethod === 'selector') {
              if (!elementSelector) {
                throw new Error('Please enter a CSS selector');
              }
              // For selector-based clicking, we'll create a mock element description and ref
              result = await click({
                element: `Element with selector: ${elementSelector}`,
                ref: 'click-by-selector-test-only' // This won't work in practice - just for testing
              });
            } else if (clickMethod === 'refId') {
              if (!clickRefId) {
                throw new Error('Please enter an Element Ref ID');
              }
              result = await clickByRef({ ref: clickRefId });
            }
            break;
          case 'hover':
            if (!elementSelector) {
              throw new Error('Please enter a CSS selector');
            }
            result = await hover({ selector: elementSelector });
            break;
          case 'type':
            result = await typeText({ 
              selector: elementSelector, 
              text: inputText
            });
          break;
          case 'getElement':
            result = await getElement({ 
              selector: elementSelector, 
              limit: elementLimit 
            });
          break;
          case 'getElementByRefId':
            if (!elementRefId) {
              throw new Error('Please enter an Element Ref ID for getElementByRefId');
            }
            result = await getElementByRefId({ 
              refId: elementRefId 
            });
          break;
        default:
            result = { error: 'Unknown browser tool test type' };
        }
      }
      
      setResult(result);
    } catch (err) {
      console.error('Test error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Tools Test Panel</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4">
          {environment && (
            <div className="mb-4 p-3 bg-gray-100 rounded-md text-sm">
              <p><strong>Environment:</strong> {environment.isBackground ? 'Background' : 
                                               environment.isContentScript ? 'Content Script' : 
                                               environment.isSidepanel ? 'Sidepanel' : 
                                               environment.isNodeJs ? 'Node.js' : 'Unknown'}</p>
              <p><strong>Using background proxy:</strong> {environment.useBackgroundProxy ? 'Yes' : 'No'}</p>
              <p className="text-xs text-gray-500 mt-1">
                {environment.useBackgroundProxy 
                  ? "Requests will go through the background script to avoid CORS issues." 
                  : "Direct API calls will be made. Make sure proper permissions are set."}
              </p>
            </div>
          )}
          
          {/* Tool Section Tabs */}
          <div className="flex mb-3 space-x-2 border-b pb-2">
            <SectionTabButton 
              active={activeSection === 'context7'} 
              onClick={() => {
                setActiveSection('context7');
                setActiveTab('resolveLibraryId');
              }}
            >
              Context7 Tools
            </SectionTabButton>
            <SectionTabButton 
              active={activeSection === 'earthEngine'} 
              onClick={() => {
                setActiveSection('earthEngine');
                setActiveTab('runCode');
              }}
            >
              Earth Engine Tools
            </SectionTabButton>
            <SectionTabButton 
              active={activeSection === 'browser'} 
              onClick={() => {
                setActiveSection('browser');
                setActiveTab('screenshot');
              }}
            >
              Browser Tools
            </SectionTabButton>
          </div>
          
          {/* Context7 Tool Tabs */}
          {activeSection === 'context7' && (
          <div className="flex overflow-x-auto mb-4 space-x-2">
            <TabButton 
              active={activeTab === 'resolveLibraryId'} 
              onClick={() => setActiveTab('resolveLibraryId')}
            >
              Resolve Library ID
            </TabButton>
            <TabButton 
              active={activeTab === 'getDocumentation'} 
              onClick={() => setActiveTab('getDocumentation')}
            >
              Get Documentation
            </TabButton>
            <TabButton 
              active={activeTab === 'searchEarthEngineDatasets'} 
              onClick={() => setActiveTab('searchEarthEngineDatasets')}
            >
              Search Datasets
            </TabButton>
            <TabButton 
              active={activeTab === 'getEarthEngineDocumentation'} 
              onClick={() => setActiveTab('getEarthEngineDocumentation')}
            >
              Get EE Documentation
            </TabButton>
            <TabButton 
              active={activeTab === 'getEarthEngineDatasetInfo'} 
              onClick={() => setActiveTab('getEarthEngineDatasetInfo')}
            >
              Get Dataset Info
            </TabButton>
          </div>
          )}
          
          {/* Earth Engine Tool Tabs */}
          {activeSection === 'earthEngine' && (
            <div className="flex overflow-x-auto mb-4 space-x-2">
              <TabButton 
                active={activeTab === 'runCode'} 
                onClick={() => setActiveTab('runCode')}
              >
                Run Code
              </TabButton>
              <TabButton 
                active={activeTab === 'runButton'} 
                onClick={() => setActiveTab('runButton')}
              >
                Run Button Test
              </TabButton>
              <TabButton 
                active={activeTab === 'inspectMap'} 
                onClick={() => setActiveTab('inspectMap')}
              >
                Inspect Map
              </TabButton>
              <TabButton 
                active={activeTab === 'checkConsole'} 
                onClick={() => setActiveTab('checkConsole')}
              >
                Check Console
              </TabButton>
              <TabButton 
                active={activeTab === 'getTasks'} 
                onClick={() => setActiveTab('getTasks')}
              >
                Get Tasks
              </TabButton>
              <TabButton 
                active={activeTab === 'editScript'} 
                onClick={() => setActiveTab('editScript')}
              >
                Edit Script
              </TabButton>
              <TabButton 
                active={activeTab === 'getMapLayers'} 
                onClick={() => setActiveTab('getMapLayers')}
              >
                Map Layers
              </TabButton>
            </div>
          )}
          
          {/* Browser Tools Tabs */}
          {activeSection === 'browser' && (
            <div className="flex overflow-x-auto mb-4 space-x-2">
              <TabButton 
                active={activeTab === 'screenshot'} 
                onClick={() => setActiveTab('screenshot')}
              >
                Screenshot
              </TabButton>
              <TabButton 
                active={activeTab === 'snapshot'} 
                onClick={() => setActiveTab('snapshot')}
              >
                Snapshot
              </TabButton>
              <TabButton 
                active={activeTab === 'click'} 
                onClick={() => setActiveTab('click')}
              >
                Click
              </TabButton>
              <TabButton 
                active={activeTab === 'hover'} 
                onClick={() => setActiveTab('hover')}
              >
                Hover
              </TabButton>
              <TabButton 
                active={activeTab === 'type'} 
                onClick={() => setActiveTab('type')}
              >
                Type
              </TabButton>
              <TabButton 
                active={activeTab === 'getElement'} 
                onClick={() => setActiveTab('getElement')}
              >
                Get Element
              </TabButton>
              <TabButton 
                active={activeTab === 'getElementByRefId'} 
                onClick={() => setActiveTab('getElementByRefId')}
              >
                Get Element By Ref ID
              </TabButton>
            </div>
          )}
          
          {/* Context7 Tools Input Fields */}
          {activeSection === 'context7' && (
            <div className="mb-4">
              {/* Resolve Library ID Inputs */}
              {activeTab === 'resolveLibraryId' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Library Name</span>
                <input
                  type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g., Earth Engine, React"
                />
                  </label>
              </div>
            )}
            
              {/* Get Documentation Inputs */}
              {activeTab === 'getDocumentation' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Library ID</span>
                    <input 
                      type="text" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={libraryId}
                      onChange={(e) => setLibraryId(e.target.value)}
                      placeholder="e.g., earthengine/catalog"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700">Topic (optional)</span>
                    <input 
                      type="text" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Image, FeatureCollection"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700">Max Tokens (optional)</span>
                    <input 
                      type="number" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={tokens}
                      onChange={(e) => setTokens(e.target.value)}
                      placeholder="e.g., 5000"
                      min="1000"
                      max="20000"
                    />
                  </label>
                </div>
              )}
              
              {/* Search Datasets Inputs */}
              {activeTab === 'searchEarthEngineDatasets' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Search Query</span>
                  <input
                    type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="e.g., Landsat, MODIS"
                    />
                  </label>
                </div>
              )}
              
              {/* Get EE Documentation Inputs */}
              {activeTab === 'getEarthEngineDocumentation' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Library ID</span>
                    <input 
                      type="text" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={libraryId}
                      onChange={(e) => setLibraryId(e.target.value)}
                      placeholder="e.g., earthengine/catalog"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700">Topic (optional)</span>
                  <input
                    type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., Image, FeatureCollection"
                  />
                  </label>
                </div>
            )}
            
              {/* Get Dataset Info Inputs */}
            {activeTab === 'getEarthEngineDatasetInfo' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Dataset Name</span>
                <input
                  type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g., LANDSAT/LC08/C02/T1_L2"
                    />
                  </label>
                </div>
              )}
            </div>
          )}
          
          {/* Earth Engine Tools Input Fields */}
          {activeSection === 'earthEngine' && (
            <div className="mb-4">
              {/* Run Code Inputs */}
              {activeTab === 'runCode' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Earth Engine Code</span>
                    <textarea 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={eeCode}
                      onChange={(e) => setEeCode(e.target.value)}
                      rows={6}
                      placeholder="// Enter Earth Engine code here"
                    />
                  </label>
                </div>
              )}
              
              {/* Run Button Test Inputs */}
              {activeTab === 'runButton' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This will click the "Run" button in the Earth Engine Code Editor to execute the current code.
                    <br />
                    <br />
                    <strong>Note:</strong> You must have the Earth Engine Code Editor open in your browser.
                    The extension will click the run button in that tab without modifying the code.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <p className="text-yellow-800 text-sm">
                      The button uses the following CSS selector: <code>button.goog-button.run-button[title="Run script (Ctrl+Enter)"]</code>
                    </p>
                  </div>
                </div>
              )}
              
              {/* Inspect Map Inputs */}
              {activeTab === 'inspectMap' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-gray-700">Latitude</span>
                      <input 
                        type="number" 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        value={eeLatitude}
                        onChange={(e) => setEeLatitude(parseFloat(e.target.value))}
                        step="0.00001"
                      />
                    </label>
                    <label className="block">
                      <span className="text-gray-700">Longitude</span>
                      <input 
                        type="number" 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        value={eeLongitude}
                        onChange={(e) => setEeLongitude(parseFloat(e.target.value))}
                        step="0.00001"
                      />
                    </label>
                  </div>
                </div>
              )}
              
              {/* Edit Script Inputs */}
              {activeTab === 'editScript' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Script ID</span>
                    <input 
                      type="text" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={eeScriptId}
                      onChange={(e) => setEeScriptId(e.target.value)}
                      placeholder="e.g., users/username/scriptname"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700">Script Content</span>
                    <textarea 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={eeScriptContent}
                      onChange={(e) => setEeScriptContent(e.target.value)}
                      rows={6}
                      placeholder="// Enter Earth Engine code here"
                    />
                  </label>
                </div>
              )}
              
              {/* Get Map Layers - No inputs needed */}
              {activeTab === 'getMapLayers' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Retrieves information about the current layers in the Earth Engine map panel.
                    This includes layer names, visibility status, and opacity settings.
                  </p>
                  <p className="text-sm text-gray-500">
                    Note: This tool works best when the layers panel is visible in the Earth Engine interface.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Browser Tools Input Fields */}
          {activeSection === 'browser' && (
            <div className="mb-4">
              {/* Snapshot Inputs */}
              {activeTab === 'snapshot' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Takes a snapshot of the current page state including URL, title, and accessibility tree. No additional parameters needed.
                  </p>
                </div>
              )}

              {/* Hover Inputs */}
              {activeTab === 'hover' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Element Selector</span>
                    <input 
                      type="text" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={elementSelector}
                      onChange={(e) => setElementSelector(e.target.value)}
                      placeholder="e.g., button.run-button, #submit-button"
                    />
                  </label>
                  <p className="text-sm text-gray-600">
                    Enter a CSS selector for the element you want to hover over. This will trigger mouseover and mouseenter events on the element.
                  </p>
                </div>
              )}

              {/* Screenshot Inputs */}
              {activeTab === 'screenshot' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Takes a screenshot of the currently active tab. No additional parameters needed.
                  </p>
                  
                  {screenshotImage && (
                    <div className="mt-4 border rounded p-2">
                      <p className="text-sm font-medium mb-2">Screenshot Preview:</p>
                      <img 
                        src={screenshotImage} 
                        alt="Screenshot preview" 
                        className="max-w-full h-auto border"
                        style={{ maxHeight: '200px' }}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Click Inputs */}
              {activeTab === 'click' && (
                <div className="space-y-3">
                  <div className="mb-4">
                    <label className="block mb-2">
                      <span className="text-gray-700">Click Method</span>
                      <select 
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        value={clickMethod}
                        onChange={(e) => setClickMethod(e.target.value as 'selector' | 'coordinates' | 'refId')}
                      >
                        <option value="selector">By Selector</option>
                        <option value="coordinates">By Coordinates</option>
                        <option value="refId">By Ref ID</option>
                      </select>
                    </label>
                  </div>
                  
                  {clickMethod === 'selector' && (
                    <>
                      <label className="block">
                        <span className="text-gray-700">Element Selector</span>
                        <input 
                          type="text" 
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          value={elementSelector}
                          onChange={(e) => setElementSelector(e.target.value)}
                          placeholder="e.g., button.run-button, #submit-button"
                        />
                      </label>
                      <p className="text-sm text-gray-600">
                        Enter a CSS selector for the element you want to click. For the Earth Engine run button, use: <code>button.goog-button.run-button[title="Run script (Ctrl+Enter)"]</code>
                      </p>
                    </>
                  )}
                  {clickMethod === 'coordinates' && (
                    <div className="grid grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-gray-700">X Coordinate</span>
                        <input 
                          type="number" 
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          value={clickX}
                          onChange={(e) => setClickX(parseFloat(e.target.value))}
                          step="0.01"
                          placeholder="e.g., 442.015625"
                        />
                      </label>
                      <label className="block">
                        <span className="text-gray-700">Y Coordinate</span>
                        <input 
                          type="number" 
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          value={clickY}
                          onChange={(e) => setClickY(parseFloat(e.target.value))}
                          step="0.01"
                          placeholder="e.g., 74.5"
                        />
                      </label>
                    </div>
                  )}
                  {clickMethod === 'refId' && (
                    <>
                      <label className="block">
                        <span className="text-gray-700">Element Ref ID</span>
                        <input 
                          type="text" 
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                          value={clickRefId}
                          onChange={(e) => setClickRefId(e.target.value)}
                          placeholder="e.g., e1, e23 (from snapshot)"
                        />
                      </label>
                      <p className="text-sm text-gray-600">
                        Enter the exact element reference (e.g., <code>e12</code>) obtained from the Snapshot tool.
                      </p>
                    </>
                  )}
                </div>
              )}
              
              {/* Type Inputs */}
              {activeTab === 'type' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Element Selector</span>
                    <input 
                      type="text" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={elementSelector}
                      onChange={(e) => setElementSelector(e.target.value)}
                      placeholder="e.g., input#search, textarea.code-editor"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700">Text to Type</span>
                    <textarea 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      rows={3}
                      placeholder="Enter text to type into the element"
                    />
                  </label>
                  <div className="block">
                    <label className="inline-flex items-center">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        checked={appendText}
                        onChange={(e) => setAppendText(e.target.checked)}
                      />
                      <span className="ml-2 text-gray-700">Append to existing text (instead of replacing)</span>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    For the Earth Engine code editor, use: <code>.ace_text-input</code> or the ace editor instance
                  </p>
                </div>
              )}
              
              {/* Get Element Inputs */}
              {activeTab === 'getElement' && (
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-gray-700">Element Selector</span>
                    <input 
                      type="text" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={elementSelector}
                      onChange={(e) => setElementSelector(e.target.value)}
                      placeholder="e.g., button, .class-name, #element-id"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-700">Result Limit</span>
                    <input 
                      type="number"
                      min="1"
                      max="20" 
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                      value={elementLimit}
                      onChange={(e) => setElementLimit(parseInt(e.target.value))}
                    />
                  </label>
                  <p className="text-sm text-gray-600">
                    This tool will return information about the elements matching the selector, including attributes, visibility status, and position.
                  </p>
                </div>
              )}

              {activeTab === 'getElementByRefId' && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Element Ref ID:</label>
                  <input 
                    type="text" 
                    value={elementRefId} 
                    onChange={(e) => setElementRefId(e.target.value)} 
                    className="w-full p-2 border rounded-md text-sm"
                    placeholder="e.g., e1, e23"
                  />
                </div>
              )}
              </div>
            )}
            
              <button
                onClick={runTest}
                disabled={loading}
            className={`mt-4 px-4 py-2 rounded-md text-white font-medium ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
            }`}
              >
                {loading ? 'Running...' : 'Run Test'}
              </button>
            
            {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-500">{error}</p>
              </div>
            )}
            
            {result && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
              <h3 className="font-medium mb-2">Result:</h3>
              <pre className="bg-gray-800 text-white p-3 rounded text-sm overflow-auto" style={{ maxHeight: '200px' }}>
                {typeof result === 'object' 
                  ? JSON.stringify(result, (key, value) => {
                      // For screenshot responses, truncate the potentially long base64 data
                      if (key === 'screenshotData' && typeof value === 'string' && value.length > 100) {
                        return value.substring(0, 100) + '... [truncated, full length: ' + value.length + ' chars]';
                      }
                      return value;
                    }, 2)
                  : String(result)}
                  </pre>
              {activeTab === 'browser' && activeSection === 'screenshot' && 
               typeof result === 'object' && result.success && result.screenshotData && (
                <div className="mt-3">
                  <h4 className="font-medium mb-2">Screenshot Preview:</h4>
                  <img 
                    src={result.screenshotData} 
                    alt="Captured screenshot" 
                    className="max-w-full border border-gray-300"
                    style={{ maxHeight: '300px' }}
                  />
                </div>
              )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}> = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-md whitespace-nowrap ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

const SectionTabButton: React.FC<{
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}> = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md whitespace-nowrap font-medium ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    }`}
  >
    {children}
  </button>
);

export default ToolsTestPanel;