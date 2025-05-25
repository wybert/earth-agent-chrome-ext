/**
 * Browser Tools Example
 * 
 * This file demonstrates how to use the browser automation tools
 * in a Chrome extension. These tools can be used to automate common
 * browser tasks like taking screenshots, clicking elements, typing text,
 * and inspecting elements on a page.
 */

import {
  screenshot,
  click,
  typeText,
  getElement
} from '@/lib/tools/browser';

// Example: Take a screenshot of the current tab
async function captureScreenshot(): Promise<void> {
  console.log('Taking screenshot...');
  
  const result = await screenshot();
  
  if (result.success) {
    console.log('Screenshot captured successfully!');
    // You can use the screenshot data as a base64-encoded string
    const dataUrl = result.screenshotData;
    
    // Example: Display the screenshot in an image element
    const img = document.createElement('img');
    img.src = dataUrl as string;
    img.style.maxWidth = '100%';
    img.style.border = '1px solid #ccc';
    
    const container = document.getElementById('screenshot-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(img);
    }
  } else {
    console.error('Screenshot failed:', result.error);
  }
}

// Example: Click a button on the page
async function clickButton(elementDescription: string, ref: string): Promise<void> {
  console.log(`Clicking element: ${elementDescription} with ref: ${ref}`);
  
  const result = await click({ element: elementDescription, ref });
  
  if (result.success) {
    console.log('Element clicked successfully!');
  } else {
    console.error('Click failed:', result.error);
  }
}

// Example: Type text into an input field
async function enterText(selector: string, text: string): Promise<void> {
  console.log(`Typing "${text}" into element with selector: ${selector}`);
  
  const result = await typeText({ 
    selector, 
    text
  });
  
  if (result.success) {
    console.log('Text entered successfully!');
  } else {
    console.error('Type operation failed:', result.error);
  }
}

// Example: Get information about elements on the page
async function inspectElements(selector: string): Promise<void> {
  console.log(`Inspecting elements with selector: ${selector}`);
  
  const result = await getElement({ 
    selector,
    limit: 5 // Get up to 5 matching elements
  });
  
  if (result.success && result.elements) {
    console.log(`Found ${result.count} elements (showing first ${result.elements.length}):`);
    
    for (const element of result.elements) {
      console.log('---');
      console.log(`Tag: ${element.tagName}`);
      console.log(`Text: ${element.textContent || '(no text)'}`);
      console.log(`Visible: ${element.isVisible}`);
      console.log(`Enabled: ${element.isEnabled}`);
      
      // Log all attributes
      console.log('Attributes:');
      for (const [key, value] of Object.entries(element.attributes)) {
        console.log(`  ${key}: ${value}`);
      }
      
      // Log position information
      if (element.boundingRect) {
        console.log('Position:');
        console.log(`  Top: ${element.boundingRect.top}px`);
        console.log(`  Left: ${element.boundingRect.left}px`);
        console.log(`  Width: ${element.boundingRect.width}px`);
        console.log(`  Height: ${element.boundingRect.height}px`);
      }
    }
  } else {
    console.error('Get element operation failed:', result.error);
  }
}

// Example: Simple automation workflow
async function runAutomation(): Promise<void> {
  try {
    // 1. Get information about a search input field
    await inspectElements('input[type="search"], input[name="q"]');
    
    // 2. Type a search query into the field
    await enterText('input[type="search"], input[name="q"]', 'Earth Engine satellite imagery');
    
    // 3. Click the search button
    await clickButton('Submit button', 'submit-button-ref');
    
    // 4. Wait for the results page to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Take a screenshot of the results
    await captureScreenshot();
    
    console.log('Automation workflow completed successfully!');
  } catch (error) {
    console.error('Automation workflow failed:', error);
  }
}

// Export functions for use in a UI
export {
  captureScreenshot,
  clickButton,
  enterText,
  inspectElements,
  runAutomation
};