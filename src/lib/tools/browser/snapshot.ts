/**
 * Snapshot tool for capturing accessibility snapshot of the current page
 * This tool captures an accessibility snapshot which is better than screenshot
 * as it provides DOM structure and element references for automation
 * 
 * @returns Promise with success status and snapshot data
 */

import { detectEnvironment } from '@/lib/utils';

export interface SnapshotResponse {
  success: boolean;
  snapshot?: string;
  error?: string;
}

// Types for accessibility tree structure
interface AccessibilityNode {
  role: string;
  name?: string;
  ref?: string;
  cursor?: string;
  level?: number;
  children?: AccessibilityNode[];
  element?: Element;
}

/**
 * Captures an accessibility snapshot of the current page in markdown format
 * matching the playwright-mcp implementation exactly
 */
export async function snapshot(): Promise<SnapshotResponse> {
  const environment = detectEnvironment();
  
  try {
    if (environment.useBackgroundProxy && typeof chrome !== 'undefined' && chrome.runtime) {
      // Use Chrome extension messaging for background script proxy
      return new Promise<SnapshotResponse>((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve({
            success: false,
            error: 'Snapshot request timed out'
          });
        }, 30000);

        try {
          chrome.runtime.sendMessage(
            { type: 'SNAPSHOT' },
            (response) => {
              clearTimeout(timeoutId);
              
              if (chrome.runtime.lastError) {
                resolve({
                  success: false,
                  error: chrome.runtime.lastError.message || 'Error communicating with background script'
                });
                return;
              }
              
              resolve(response);
            }
          );
        } catch (err) {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            error: err instanceof Error ? err.message : String(err)
          });
        }
      });
    } else {
      // Direct implementation for content script and sidepanel
      return await captureDirectSnapshot();
    }
  } catch (error) {
    console.error('Snapshot error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown snapshot error'
    };
  }
}

/**
 * Direct implementation of snapshot capture
 */
async function captureDirectSnapshot(): Promise<SnapshotResponse> {
  try {
    // Check if the extension context is still valid early on
    if (typeof chrome === 'undefined' || typeof chrome.runtime === 'undefined' || typeof chrome.runtime.id === 'undefined') {
      console.warn('[SnapshotTool] Extension context appears to be invalidated. Aborting direct snapshot.');
      return {
        success: false,
        error: 'Extension context invalidated during snapshot capture.'
      };
    }

    // Get page information
    const pageUrl = window.location.href;
    const pageTitle = document.title;
    
    // Generate the accessibility tree
    const accessibilityTree = await generateAccessibilityTree();
    
    // Format as YAML similar to playwright-mcp
    const yamlContent = formatAsYaml(accessibilityTree);
    
    // Create the complete markdown response matching playwright-mcp format
    const snapshot = [
      '- Ran Playwright code:',
      '```js',
      '// <internal code to capture accessibility snapshot>',
      '```',
      '',
      `- Page URL: ${pageUrl}`,
      `- Page Title: ${pageTitle}`,
      '- Page Snapshot',
      '```yaml',
      yamlContent,
      '```'
    ].join('\n');
    
    return {
      success: true,
      snapshot
    };
  } catch (error) {
    console.error('Direct snapshot error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to capture snapshot'
    };
  }
}

/**
 * Generate accessibility tree from the current page
 */
async function generateAccessibilityTree(): Promise<AccessibilityNode[]> {
  const refCounter = { value: 1 };
  const processedElements = new WeakSet<Element>();
  
  // Start from body or documentElement
  const rootElement = document.body || document.documentElement;
  if (!rootElement) {
    throw new Error('No root element found');
  }
  
  return buildAccessibilityTree(rootElement, refCounter, processedElements);
}

/**
 * Build accessibility tree recursively
 */
function buildAccessibilityTree(
  element: Element, 
  refCounter: { value: number }, 
  processedElements: WeakSet<Element>,
  maxDepth: number = 10,
  currentDepth: number = 0
): AccessibilityNode[] {
  if (currentDepth > maxDepth || processedElements.has(element)) {
    return [];
  }
  
  processedElements.add(element);
  const nodes: AccessibilityNode[] = [];
  
  // Process current element if it's meaningful
  const node = createAccessibilityNode(element, refCounter);
  if (node) {
    nodes.push(node);
    
    // Process children for interactive/structural elements
    if (shouldProcessChildren(element)) {
      const children: AccessibilityNode[] = [];
      
      // Process regular DOM children
      for (const child of Array.from(element.children)) {
        const childNodes = buildAccessibilityTree(child, refCounter, processedElements, maxDepth, currentDepth + 1);
        children.push(...childNodes);
      }
      
      // Process shadow DOM children if element has open shadow root
      if (element.shadowRoot && element.shadowRoot.mode === 'open') {
        for (const shadowChild of Array.from(element.shadowRoot.children)) {
          const shadowNodes = buildAccessibilityTree(shadowChild, refCounter, processedElements, maxDepth, currentDepth + 1);
          children.push(...shadowNodes);
        }
      }
      
      if (children.length > 0) {
        node.children = children;
      }
    }
  } else {
    // If current element isn't meaningful, process its children directly
    for (const child of Array.from(element.children)) {
      const childNodes = buildAccessibilityTree(child, refCounter, processedElements, maxDepth, currentDepth);
      nodes.push(...childNodes);
    }
    
    // Also process shadow DOM children if element has open shadow root
    if (element.shadowRoot && element.shadowRoot.mode === 'open') {
      for (const shadowChild of Array.from(element.shadowRoot.children)) {
        const shadowNodes = buildAccessibilityTree(shadowChild, refCounter, processedElements, maxDepth, currentDepth);
        nodes.push(...shadowNodes);
      }
    }
  }
  
  return nodes;
}

/**
 * Create accessibility node from element
 */
function createAccessibilityNode(element: Element, refCounter: { value: number }): AccessibilityNode | null {
  const tagName = element.tagName.toLowerCase();
  const computedStyle = window.getComputedStyle(element);
  
  // Skip hidden elements
  if (computedStyle.display === 'none' || 
      computedStyle.visibility === 'hidden' || 
      computedStyle.opacity === '0') {
    return null;
  }
  
  // Skip very small elements (likely not interactive)
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) {
    return null;
  }
  
  // Determine if this element should be included
  if (!shouldIncludeElement(element)) {
    return null;
  }
  
  // Get role (explicit or implicit)
  const role = getElementRole(element);
  
  // Get accessible name
  const name = getAccessibleName(element);
  
  // Create ref and assign to element
  const ref = `e${refCounter.value++}`;
  element.setAttribute('aria-ref', ref);
  
  // Get cursor style
  const cursor = computedStyle.cursor;
  
  const node: AccessibilityNode = {
    role,
    element
  };
  
  if (name) {
    node.name = name;
  }
  
  node.ref = ref;
  
  if (cursor && cursor !== 'auto' && cursor !== 'default') {
    node.cursor = cursor;
  }
  
  return node;
}

/**
 * Determine if element should be included in accessibility tree
 */
function shouldIncludeElement(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  
  // Always include interactive elements
  const interactiveElements = [
    'a', 'button', 'input', 'textarea', 'select', 'option',
    'details', 'summary', 'label', 'fieldset', 'legend'
  ];
  
  if (interactiveElements.includes(tagName)) {
    return true;
  }
  
  // Include elements with explicit roles
  if (element.hasAttribute('role')) {
    return true;
  }
  
  // Include elements with click handlers
  if (element.hasAttribute('onclick') || element.hasAttribute('ng-click')) {
    return true;
  }
  
  // Include headings
  if (/^h[1-6]$/.test(tagName)) {
    return true;
  }
  
  // Include structural elements with meaningful content
  const structuralElements = ['main', 'nav', 'aside', 'section', 'article', 'header', 'footer'];
  if (structuralElements.includes(tagName)) {
    return true;
  }
  
  // Include generic containers that might be clickable
  if (['div', 'span'].includes(tagName)) {
    const style = window.getComputedStyle(element);
    if (style.cursor === 'pointer' || element.hasAttribute('tabindex')) {
      return true;
    }
  }
  
  // Include images with alt text
  if (tagName === 'img' && element.hasAttribute('alt')) {
    return true;
  }
  
  return false;
}

/**
 * Determine if element's children should be processed
 */
function shouldProcessChildren(element: Element): boolean {
  const tagName = element.tagName.toLowerCase();
  
  // Don't process children of leaf elements
  const leafElements = ['input', 'textarea', 'img', 'br', 'hr'];
  if (leafElements.includes(tagName)) {
    return false;
  }
  
  // Process children of structural elements
  return true;
}

/**
 * Get element's role (explicit or implicit)
 */
function getElementRole(element: Element): string {
  // Check explicit role
  const explicitRole = element.getAttribute('role');
  if (explicitRole) {
    return explicitRole;
  }
  
  // Determine implicit role based on tag
  const tagName = element.tagName.toLowerCase();
  const roleMap: Record<string, string> = {
    'a': 'link',
    'button': 'button',
    'input': getInputRole(element as HTMLInputElement),
    'textarea': 'textbox',
    'select': 'combobox',
    'option': 'option',
    'img': 'img',
    'h1': 'heading',
    'h2': 'heading', 
    'h3': 'heading',
    'h4': 'heading',
    'h5': 'heading',
    'h6': 'heading',
    'main': 'main',
    'nav': 'navigation',
    'aside': 'complementary',
    'section': 'region',
    'article': 'article',
    'header': 'banner',
    'footer': 'contentinfo',
    'fieldset': 'group',
    'legend': 'legend',
    'label': 'label'
  };
  
  return roleMap[tagName] || 'generic';
}

/**
 * Get role for input elements based on type
 */
function getInputRole(input: HTMLInputElement): string {
  const type = (input.type || 'text').toLowerCase();
  const inputRoleMap: Record<string, string> = {
    'text': 'textbox',
    'email': 'textbox',
    'password': 'textbox',
    'search': 'searchbox',
    'tel': 'textbox',
    'url': 'textbox',
    'number': 'spinbutton',
    'range': 'slider',
    'checkbox': 'checkbox',
    'radio': 'radio',
    'button': 'button',
    'submit': 'button',
    'reset': 'button',
    'file': 'button'
  };
  
  return inputRoleMap[type] || 'textbox';
}

/**
 * Get accessible name for element
 */
function getAccessibleName(element: Element): string {
  try {
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
        return ariaLabel.trim();
    }

    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        const referencedElement = document.getElementById(labelledBy);
        if (referencedElement) {
            return getTextContent(referencedElement).trim();
        }
    }

    // For form controls, check associated label
    if (element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement) {
        // Check for label element
        const labels = document.querySelectorAll(`label[for="${element.id}"]`);
        if (labels.length > 0) {
            return getTextContent(labels[0]).trim();
        }
        // Check for wrapping label
        const wrappingLabel = element.closest('label');
        if (wrappingLabel) {
            return getTextContent(wrappingLabel).trim();
        }
        // Check placeholder
        const placeholder = element.getAttribute('placeholder');
        if (placeholder) {
            return placeholder.trim();
        }
    }

    // Check title attribute
    const title = element.getAttribute('title');
    if (title) {
        return title.trim();
    }

    // For images, check alt attribute
    if (element instanceof HTMLImageElement) {
        const alt = element.getAttribute('alt');
        if (alt) {
            return alt.trim();
        }
    }

    // Get text content for other elements
    const textContent = getTextContent(element).trim();
    if (textContent && textContent.length < 100) { // Reasonable length limit
        return textContent;
    }

    return '';
  } catch (error) {
    if (error instanceof Error && error.message.includes('Extension context invalidated')) {
      console.warn('[SnapshotTool] Context invalidated while getting accessible name for element:', element, error.message);
    } else {
      console.warn('[SnapshotTool] Error getting accessible name for element:', element, error);
    }
    return ''; // Return empty string on error
  }
}

/**
 * Get text content, excluding text from child interactive elements
 */
function getTextContent(element: Element): string {
  try {
    const clone = element.cloneNode(true) as Element;

    // Remove child interactive elements to avoid nested labels
    const interactiveSelectors = [
        'button', 'a', 'input', 'textarea', 'select',
        '[role="button"]', '[role="link"]', '[role="textbox"]'
    ];

    for (const selector of interactiveSelectors) {
        const interactiveElements = clone.querySelectorAll(selector);
        interactiveElements.forEach(el => {
          try {
            el.remove();
          } catch (removeError) {
            // Log if a specific removal fails, possibly due to context issues with the cloned node
            if (removeError instanceof Error && removeError.message.includes('Extension context invalidated')) {
              console.warn('[SnapshotTool] Context invalidated while removing child from cloned node during getTextContent:', el, removeError.message);
            } else {
              console.warn('[SnapshotTool] Error removing child from cloned node during getTextContent:', el, removeError);
            }
          }
        });
    }
    return clone.textContent || '';
  } catch (error) {
    if (error instanceof Error && error.message.includes('Extension context invalidated')) {
      console.warn('[SnapshotTool] Context invalidated during getTextContent for element:', element, error.message);
    } else {
      console.warn('[SnapshotTool] Error in getTextContent for element:', element, error);
    }
    return ''; // Return empty string on error
  }
}

/**
 * Format accessibility tree as YAML similar to playwright-mcp
 */
function formatAsYaml(nodes: AccessibilityNode[], indent: string = ''): string {
  const lines: string[] = [];
  
  for (const node of nodes) {
    let line = `${indent}- ${node.role}`;
    
    if (node.name) {
      line += ` "${node.name}"`;
    }
    
    if (node.ref) {
      line += ` [ref=${node.ref}]`;
    }
    
    if (node.cursor) {
      line += ` [cursor=${node.cursor}]`;
    }
    
    lines.push(line + ':');
    
    if (node.children && node.children.length > 0) {
      const childYaml = formatAsYaml(node.children, indent + '  ');
      lines.push(childYaml);
    }
  }
  
  return lines.join('\n');
}