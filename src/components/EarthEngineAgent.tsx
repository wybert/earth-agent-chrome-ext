import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { runCode, editScript, getMapLayers } from '../lib/tools/earth-engine';
import { resolveLibraryId, getDocumentation } from '../lib/tools/context7';

const EarthEngineAgent = () => {
  const [query, setQuery] = useState('');
  const [libraryId, setLibraryId] = useState('');
  const [docs, setDocs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [result, setResult] = useState('');
  const [scriptId, setScriptId] = useState('');
  const [activeTab, setActiveTab] = useState<'resolve' | 'docs' | 'generate' | 'run' | 'edit' | 'layers'>('resolve');
  const [layers, setLayers] = useState<any[]>([]);

  // ... existing code ...

  const handleEditScript = async () => {
    setLoading(true);
    setError('');
    try {
      // For the current functionality, we're just setting the code in the active editor
      // scriptId is mostly a placeholder for future functionality where we might edit specific scripts
      const response = await editScript(scriptId || 'current', code);
      setResult(JSON.stringify(response, null, 2));
      setActiveTab('run');
    } catch (err) {
      setError(`Error editing script: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRunCurrentScript = async () => {
    setLoading(true);
    setError('');
    try {
      // Run the current script in the Earth Engine editor
      const response = await runCode('');
      setResult(JSON.stringify(response, null, 2));
    } catch (err) {
      setError(`Error running script: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetMapLayers = async () => {
    setLoading(true);
    setError('');
    try {
      // Get information about the current map layers
      const response = await getMapLayers();
      setResult(JSON.stringify(response, null, 2));
      
      if (response.success && response.layers) {
        setLayers(response.layers);
      }
    } catch (err) {
      setError(`Error getting map layers: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col p-4 h-full">
      <h2 className="text-xl font-bold mb-4">Earth Engine Agent</h2>
      
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={activeTab === 'resolve' ? 'default' : 'outline'}
          onClick={() => setActiveTab('resolve')}
        >
          1. Resolve Library
        </Button>
        <Button
          variant={activeTab === 'docs' ? 'default' : 'outline'}
          onClick={() => setActiveTab('docs')}
          disabled={!libraryId}
        >
          2. Get Docs
        </Button>
        <Button
          variant={activeTab === 'generate' ? 'default' : 'outline'}
          onClick={() => setActiveTab('generate')}
          disabled={!docs}
        >
          3. Edit Code
        </Button>
        <Button
          variant={activeTab === 'run' ? 'default' : 'outline'}
          onClick={() => setActiveTab('run')}
        >
          4. Run Code
        </Button>
        <Button
          variant={activeTab === 'edit' ? 'default' : 'outline'}
          onClick={() => setActiveTab('edit')}
        >
          5. Edit Script
        </Button>
        <Button
          variant={activeTab === 'layers' ? 'default' : 'outline'}
          onClick={() => setActiveTab('layers')}
        >
          6. Map Layers
        </Button>
      </div>

      {/* ... existing tabs ... */}

      {activeTab === 'edit' && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Earth Engine Script</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <label className="block mb-1">Script ID (optional):</label>
              <input
                type="text"
                value={scriptId}
                onChange={(e) => setScriptId(e.target.value)}
                placeholder="Leave blank for current script"
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-2">
              <label className="block mb-1">New Code Content:</label>
              <Textarea
                placeholder="// Enter Earth Engine code to replace current script"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mb-2 h-32"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleEditScript} disabled={loading || !code}>
              {loading ? 'Updating...' : 'Update Script'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {activeTab === 'run' && (
        <Card>
          <CardHeader>
            <CardTitle>Run Results</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
                {error}
              </div>
            )}
            {result && (
              <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-96">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            )}
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button variant="outline" onClick={handleRunCurrentScript} disabled={loading}>
              Run Current Script Again
            </Button>
            {code && (
              <Button variant="outline" onClick={handleEditScript} disabled={loading}>
                Update Script Content
              </Button>
            )}
          </CardFooter>
        </Card>
      )}

      {activeTab === 'layers' && (
        <Card>
          <CardHeader>
            <CardTitle>Map Layers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Button onClick={handleGetMapLayers} disabled={loading}>
                {loading ? 'Loading...' : 'Get Map Layers'}
              </Button>
            </div>
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
                {error}
              </div>
            )}
            
            {layers.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Layer Information:</h3>
                <div className="overflow-auto max-h-96 border rounded">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visible</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Opacity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {layers.map((layer, index) => (
                        <tr key={layer.id || index}>
                          <td className="px-6 py-4 whitespace-nowrap">{layer.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{layer.visible ? 'Yes' : 'No'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{Math.round(layer.opacity * 100)}%</td>
                          <td className="px-6 py-4 whitespace-nowrap">{layer.type || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {result && (
              <pre className="p-2 bg-gray-100 rounded overflow-auto max-h-96">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EarthEngineAgent; 