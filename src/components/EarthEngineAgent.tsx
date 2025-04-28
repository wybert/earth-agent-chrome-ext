import React, { useState } from 'react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card';
import { runCode, editScript } from '../lib/tools/earth-engine';
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
  const [activeTab, setActiveTab] = useState<'resolve' | 'docs' | 'generate' | 'run' | 'edit'>('resolve');

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
                {result}
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
    </div>
  );
};

export default EarthEngineAgent; 