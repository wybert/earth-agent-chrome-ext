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
  editEarthEngineScript
} from '@/lib/tools/earth-engine/agentTools';
import { detectEnvironment } from '@/lib/utils';

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

  useEffect(() => {
    setEnvironment(detectEnvironment());
  }, []);

  if (!isOpen) return null;

  const runTest = async () => {
    setLoading(true);
    setError(null);
    try {
      let testResult;
      
      // Context7 tools
      if (activeSection === 'context7') {
        switch (activeTab) {
          case 'resolveLibraryId':
            testResult = await resolveLibraryId(query);
            // If library ID was found, update the libraryId state
            if (testResult.success && testResult.libraryId) {
              setLibraryId(testResult.libraryId);
            }
            break;
          case 'getDocumentation':
            if (!libraryId) {
              throw new Error('Library ID is required for getDocumentation');
            }
            testResult = await getDocumentation(libraryId, topic);
            break;
          case 'searchEarthEngineDatasets':
            testResult = await searchEarthEngineDatasets(query);
            // If library ID was found, update the libraryId state
            if (testResult.success && testResult.libraryId) {
              setLibraryId(testResult.libraryId);
            }
            break;
          case 'getEarthEngineDocumentation':
            if (!libraryId) {
              throw new Error('Library ID is required for getEarthEngineDocumentation');
            }
            testResult = await getEarthEngineDocumentation(libraryId, topic);
            break;
          case 'getEarthEngineDatasetInfo':
            testResult = await getEarthEngineDatasetInfo(topic);
            break;
          default:
            testResult = { error: 'Unknown test type' };
        }
      } 
      // Earth Engine tools
      else if (activeSection === 'earthEngine') {
        switch (activeTab) {
          case 'runCode':
            testResult = await runCode(eeCode);
            break;
          case 'inspectMap':
            testResult = await inspectMap({ lat: eeLatitude, lng: eeLongitude });
            break;
          case 'checkConsole':
            testResult = await checkConsole();
            break;
          case 'getTasks':
            testResult = await getTasks();
            break;
          case 'editScript':
            testResult = await editScript(eeScriptId, eeScriptContent);
            break;
          default:
            testResult = { error: 'Unknown Earth Engine test type' };
        }
      }
      
      setResult(testResult);
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
            </div>
          )}
          
          <div className="space-y-4">
            {/* Context7 Input fields based on active tab */}
            {activeSection === 'context7' && (
              <>
                {(activeTab === 'resolveLibraryId' || activeTab === 'searchEarthEngineDatasets') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Query
                    </label>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Enter search query"
                    />
                  </div>
                )}
                
                {(activeTab === 'getDocumentation' || activeTab === 'getEarthEngineDocumentation') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Library ID
                      </label>
                      <input
                        type="text"
                        value={libraryId}
                        onChange={(e) => setLibraryId(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter library ID"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Topic
                      </label>
                      <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter topic"
                      />
                    </div>
                  </>
                )}
                
                {activeTab === 'getEarthEngineDatasetInfo' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topic
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="Enter topic"
                    />
                  </div>
                )}
              </>
            )}
            
            {/* Earth Engine Input fields based on active tab */}
            {activeSection === 'earthEngine' && (
              <>
                {activeTab === 'runCode' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Earth Engine Code
                    </label>
                    <textarea
                      value={eeCode}
                      onChange={(e) => setEeCode(e.target.value)}
                      className="w-full p-2 border rounded-md font-mono text-sm"
                      rows={8}
                      placeholder="Enter Earth Engine code"
                    />
                  </div>
                )}
                
                {activeTab === 'inspectMap' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Latitude
                      </label>
                      <input
                        type="number"
                        value={eeLatitude}
                        onChange={(e) => setEeLatitude(parseFloat(e.target.value))}
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter latitude (-90 to 90)"
                        min="-90"
                        max="90"
                        step="0.0001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Longitude
                      </label>
                      <input
                        type="number"
                        value={eeLongitude}
                        onChange={(e) => setEeLongitude(parseFloat(e.target.value))}
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter longitude (-180 to 180)"
                        min="-180"
                        max="180"
                        step="0.0001"
                      />
                    </div>
                  </>
                )}
                
                {activeTab === 'checkConsole' && (
                  <div className="p-3 bg-gray-100 rounded-md">
                    <p className="text-sm">This tool will check the Earth Engine console for errors and warnings.</p>
                    <p className="text-xs text-gray-500 mt-1">Make sure to have the Earth Engine page open in a tab.</p>
                  </div>
                )}
                
                {activeTab === 'getTasks' && (
                  <div className="p-3 bg-gray-100 rounded-md">
                    <p className="text-sm">This tool will retrieve all current tasks from Earth Engine.</p>
                    <p className="text-xs text-gray-500 mt-1">Make sure to have the Earth Engine page open in a tab.</p>
                  </div>
                )}
                
                {activeTab === 'editScript' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Script ID
                      </label>
                      <input
                        type="text"
                        value={eeScriptId}
                        onChange={(e) => setEeScriptId(e.target.value)}
                        className="w-full p-2 border rounded-md"
                        placeholder="Enter script ID (e.g., users/username/scriptname)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Script Content
                      </label>
                      <textarea
                        value={eeScriptContent}
                        onChange={(e) => setEeScriptContent(e.target.value)}
                        className="w-full p-2 border rounded-md font-mono text-sm"
                        rows={8}
                        placeholder="Enter Earth Engine code for the script"
                      />
                    </div>
                  </>
                )}
              </>
            )}
            
            <div>
              <button
                onClick={runTest}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Running...' : 'Run Test'}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-md">
                <p className="font-bold">Error:</p>
                <p>{error}</p>
                {environment?.useBackgroundProxy && (
                  <p className="mt-2 text-sm">
                    <strong>Note:</strong> Requests are being proxied through the background script.
                    Check the background script console for more detailed error information.
                  </p>
                )}
              </div>
            )}
            
            {result && (
              <div className="mt-4">
                <h3 className="font-bold mb-2">Result:</h3>
                <div className="max-h-60 overflow-auto p-3 bg-gray-100 rounded-md">
                  <pre className="text-xs whitespace-pre-wrap">
                    {typeof result === 'object' ? JSON.stringify(result, null, 2) : result}
                  </pre>
                </div>
              </div>
            )}
          </div>
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