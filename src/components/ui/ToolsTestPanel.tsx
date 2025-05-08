import React, { useState } from 'react';

interface ToolsTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ToolsTestPanel: React.FC<ToolsTestPanelProps> = ({ isOpen, onClose }) => {
  // State for API test
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
  const [apiTestResult, setApiTestResult] = useState<string>('');
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleApiTest = async () => {
    setIsTestingApi(true);
    setApiTestResult('Testing API connection...');
    
    try {
      // Get API key from storage
      const result = await chrome.storage.sync.get([
        'earth_engine_llm_api_key', 
        'earth_engine_openai_api_key',
        'earth_engine_anthropic_api_key',
        'earth_engine_llm_provider'
      ]);
      
      const storedProvider = result['earth_engine_llm_provider'] || provider;
      
      let apiKey = '';
      if (storedProvider === 'openai') {
        apiKey = result['earth_engine_openai_api_key'] || result['earth_engine_llm_api_key'] || '';
      } else if (storedProvider === 'anthropic') {
        apiKey = result['earth_engine_anthropic_api_key'] || result['earth_engine_llm_api_key'] || '';
      }
      
      if (!apiKey) {
        setApiTestResult(`No API key found for ${storedProvider}. Please set it in settings.`);
        setIsTestingApi(false);
        return;
      }
      
      if (storedProvider === 'openai') {
        // Test OpenAI API
        const response = await fetch('https://api.openai.com/v1/models', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setApiTestResult(`OpenAI API connection successful! Found ${data.data.length} models.`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          setApiTestResult(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
        }
      } else if (storedProvider === 'anthropic') {
        // Test Anthropic API with a minimal request
        try {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 10,
              messages: [
                { role: 'user', content: 'Hello' }
              ]
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setApiTestResult(`Anthropic API connection successful! Response: ${data.content[0].text}`);
          } else {
            const errorData = await response.json().catch(() => ({}));
            setApiTestResult(`Anthropic API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
          }
        } catch (error) {
          setApiTestResult(`Error testing Anthropic API: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      setApiTestResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">API Test Panel</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4">
          <p className="text-lg font-medium mb-4">Test your API Keys</p>
          
          <div className="mb-4">
            <p className="mb-2">Select provider:</p>
            <div className="flex gap-2">
              <button 
                className={`px-4 py-2 rounded-md ${provider === 'openai' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setProvider('openai')}
                disabled={isTestingApi}
              >
                OpenAI
              </button>
              <button 
                className={`px-4 py-2 rounded-md ${provider === 'anthropic' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                onClick={() => setProvider('anthropic')}
                disabled={isTestingApi}
              >
                Anthropic
              </button>
            </div>
          </div>
          
          <button
            onClick={handleApiTest}
            disabled={isTestingApi}
            className={`w-full py-2 rounded-md text-white font-medium ${
              isTestingApi ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isTestingApi ? 'Testing...' : `Test ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} API Connection`}
          </button>
          
          {apiTestResult && (
            <div className="mt-4 p-3 rounded-md overflow-auto max-h-52 text-sm" 
              style={{ 
                backgroundColor: apiTestResult.includes('successful') ? '#f0fdf4' : '#fef2f2',
                borderColor: apiTestResult.includes('successful') ? '#86efac' : '#fecaca',
                borderWidth: '1px'
              }}>
              <pre className="whitespace-pre-wrap">{apiTestResult}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolsTestPanel; 