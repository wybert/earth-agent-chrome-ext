# Earth Engine Agent Documentation

## Features

### Expanded Model Selection

The Earth Engine Agent now supports a comprehensive range of AI models, with over 15 OpenAI models and 5 Anthropic models available. This extensive selection gives you precise control over which models power your Earth Engine assistant, allowing you to balance capabilities, speed, and cost based on your specific needs.

[Learn more about model selection](./model-selection.md) | [View model comparison](./model-comparison.md)

## Settings

### API Configuration

The Earth Engine Agent requires an API key from either OpenAI or Anthropic to function. You can configure your preferred provider and API key in the settings panel.

Key features:
- Switch between OpenAI and Anthropic providers
- Select from a wide range of models for each provider, including GPT-4o, GPT-4.5-preview, GPT-4.1, Claude 3.7, and more
- Securely store API keys in Chrome's synced storage
- Test API connection to verify configuration
- Choose models based on your performance or cost requirements

## Developer Resources

### Building the Extension

To build the extension after making changes:

```bash
npm run build
```

This generates the extension files in the project's root directory, which can then be loaded as an unpacked extension in Chrome.

### Testing

After building, you can test the extension by:

1. Opening Chrome and navigating to `chrome://extensions`
2. Enabling "Developer mode" in the top-right corner
3. Clicking "Load unpacked" and selecting the extension directory
4. Opening Google Earth Engine at `https://code.earthengine.google.com/`
5. Clicking the extension icon to open the side panel

## Troubleshooting

If you encounter issues with the extension:

- Verify your API key is correctly entered and valid
- Ensure you've selected a model that's available with your API key and usage tier
- If a model isn't working well, try switching to a different model version
- Check that you're on the Google Earth Engine Code Editor page
- Try refreshing the page if the extension isn't responding
- Review browser console logs for error messages
- See the model comparison guide for selecting the best model for your needs

For more detailed information, visit the respective documentation pages.