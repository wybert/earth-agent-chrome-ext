#!/usr/bin/env node

/**
 * API Key Validation Tool for Earth Agent AI SDK
 * 
 * This script helps diagnose API connectivity issues by testing 
 * OpenAI and Anthropic API keys. Run it when you're experiencing
 * chat response issues.
 * 
 * Usage:
 *   node scripts/test-api.js
 */

const { existsSync } = require('fs');
const { join } = require('path');
const { homedir } = require('os');
const readline = require('readline');
const util = require('util');
const http = require('http');
const https = require('https');

// For testing: Load API keys from .env if available
let dotenvPath = join(process.cwd(), '.env');
if (existsSync(dotenvPath)) {
  require('dotenv').config({ path: dotenvPath });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = util.promisify(rl.question).bind(rl);

async function testOpenAIKey(apiKey) {
  console.log('\n🔍 Testing OpenAI API key...');
  
  if (!apiKey) {
    console.log('❌ No OpenAI API key provided.');
    return false;
  }
  
  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/models',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log(`✅ OpenAI API key is valid! Found ${result.data.length} available models.`);
            resolve(true);
          } catch (error) {
            console.log('❌ Error parsing OpenAI response:', error.message);
            resolve(false);
          }
        } else {
          try {
            const error = JSON.parse(data);
            console.log(`❌ OpenAI API key validation failed: ${res.statusCode} - ${error.error?.message || 'Unknown error'}`);
          } catch (e) {
            console.log(`❌ OpenAI API key validation failed: ${res.statusCode}`);
          }
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ OpenAI API request failed: ${error.message}`);
      resolve(false);
    });
    
    req.end();
  });
}

async function testAnthropicKey(apiKey) {
  console.log('\n🔍 Testing Anthropic API key...');
  
  if (!apiKey) {
    console.log('❌ No Anthropic API key provided.');
    return false;
  }
  
  // Basic format check
  if (!apiKey.startsWith('sk-ant-')) {
    console.log('❌ Anthropic API key format invalid (should start with sk-ant-)');
    return false;
  }
  
  const requestData = JSON.stringify({
    model: 'claude-3-haiku-20240307',
    max_tokens: 10,
    messages: [
      { role: 'user', content: 'Hello' }
    ]
  });
  
  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData)
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            console.log('✅ Anthropic API key is valid! Response received.');
            resolve(true);
          } catch (error) {
            console.log('❌ Error parsing Anthropic response:', error.message);
            resolve(false);
          }
        } else {
          try {
            const error = JSON.parse(data);
            console.log(`❌ Anthropic API key validation failed: ${res.statusCode} - ${error.error?.message || error.type || 'Unknown error'}`);
          } catch (e) {
            console.log(`❌ Anthropic API key validation failed: ${res.statusCode}`);
          }
          resolve(false);
        }
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Anthropic API request failed: ${error.message}`);
      resolve(false);
    });
    
    req.write(requestData);
    req.end();
  });
}

async function main() {
  console.log('=== Earth Agent AI SDK API Key Test Tool ===');
  console.log('This tool will test your API keys for OpenAI and Anthropic services.\n');
  
  let openaiKey = process.env.OPENAI_API_KEY;
  let anthropicKey = process.env.ANTHROPIC_API_KEY;
  
  if (!openaiKey) {
    openaiKey = await question('Enter your OpenAI API key (or press Enter to skip): ');
  }
  
  if (!anthropicKey) {
    anthropicKey = await question('Enter your Anthropic API key (or press Enter to skip): ');
  }
  
  const openaiResult = await testOpenAIKey(openaiKey);
  const anthropicResult = await testAnthropicKey(anthropicKey);
  
  console.log('\n=== Test Results Summary ===');
  console.log(`OpenAI API:   ${openaiResult ? '✅ WORKING' : '❌ FAILED'}`);
  console.log(`Anthropic API: ${anthropicResult ? '✅ WORKING' : '❌ FAILED'}`);
  
  if (!openaiResult && !anthropicResult) {
    console.log('\n❌ No working API keys found. The chat will not function without at least one valid API key.');
    console.log('\nTroubleshooting steps:');
    console.log('1. Check that you have entered the correct API keys in the extension settings');
    console.log('2. Verify your API keys are valid and have sufficient credits');
    console.log('3. Check that your network allows connections to api.openai.com and api.anthropic.com');
    console.log('4. Make sure you have the latest version of the extension');
    console.log('5. Clear the extension storage and try setting your API keys again');
  } else {
    console.log('\n✅ You have at least one working API key. The chat should function correctly.');
    
    if (!openaiResult && anthropicResult) {
      console.log('Make sure the provider in the extension settings is set to "anthropic" since only your Anthropic key is working.');
    } else if (openaiResult && !anthropicResult) {
      console.log('Make sure the provider in the extension settings is set to "openai" since only your OpenAI key is working.');
    }
  }
  
  rl.close();
}

main().catch(err => {
  console.error('Error running tests:', err);
  rl.close();
  process.exit(1);
}); 