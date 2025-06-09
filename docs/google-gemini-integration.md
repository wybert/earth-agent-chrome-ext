# Google Gemini Integration

## Overview

The Earth Engine Agent extension now supports Google's Gemini models alongside OpenAI and Anthropic providers. This integration provides users with access to Google's advanced generative AI capabilities for Earth Engine tasks.

## Setup

### Getting a Google API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key or use an existing one
3. Copy the API key (usually starts with `AIza`)

### Configuration in Extension

1. Open the Earth Engine Agent extension
2. Click the **Settings** button
3. Select **Google** as your API provider
4. Paste your Google API key
5. Choose your preferred Gemini model
6. Click **Save**

## Available Models

### Gemini 2.5 Series (Latest)
- **gemini-2.5-pro-preview**: Cutting-edge experimental model with 2M token context
- **gemini-2.5-flash-preview**: Fast processing with advanced capabilities, 1M token context
- **gemini-2.5-pro-exp**: Experimental model with enhanced reasoning, 2M token context

### Gemini 2.0 Series
- **gemini-2.0-flash**: Balanced performance and speed with 1M token context

### Gemini 1.5 Series
- **gemini-1.5-pro**: Long context (2M tokens), strong reasoning capabilities
- **gemini-1.5-pro-latest**: Latest improvements to the Pro model
- **gemini-1.5-flash**: Fast processing, cost-effective with 1M token context
- **gemini-1.5-flash-latest**: Latest improvements to the Flash model
- **gemini-1.5-flash-8b**: Lightweight (8B parameters), very fast responses
- **gemini-1.5-flash-8b-latest**: Latest version of the 8B model

## Key Features

### Long Context Support
Gemini models offer exceptional context lengths:
- **2M tokens**: Gemini 1.5 Pro, 2.5 Pro models
- **1M tokens**: Gemini Flash models

This allows for:
- Processing large Earth Engine scripts
- Analyzing extensive datasets documentation
- Maintaining longer conversation histories

### Cost-Effective Options
- Gemini 1.5 Flash 8B: Most economical option
- Gemini 1.5 Flash: Balanced cost and performance
- Competitive pricing compared to other providers

### Multi-Modal Capabilities
All Gemini models support:
- Text generation and analysis
- Image understanding (for screenshots, diagrams)
- Code generation and debugging

## Performance Characteristics

### Best For:
- **Large codebases**: Long context allows analysis of entire projects
- **Budget-conscious users**: Competitive pricing, especially Flash models
- **Multi-modal tasks**: Native image understanding capabilities
- **Experimental workflows**: Access to latest 2.5 preview models

### Speed Rankings:
1. Gemini 1.5 Flash 8B: Fastest
2. Gemini 1.5 Flash: Very Fast
3. Gemini 2.0 Flash: Fast
4. Gemini 1.5 Pro: Moderate
5. Gemini 2.5 models: Slower (due to advanced capabilities)

## Integration Details

### AI SDK Implementation
The integration uses the official `@ai-sdk/google` package, ensuring:
- Type safety and proper error handling
- Consistent API with other providers
- Support for streaming responses
- Future compatibility with new features

### Storage and Settings
- Google API keys are stored separately from OpenAI/Anthropic keys
- Model preferences persist across browser sessions
- Automatic validation of API key format
- Fallback to default models if selection is invalid

### Error Handling
- API key format validation (starts with 'AIza', 39 characters)
- Model availability checking
- Graceful fallbacks for unsupported features
- Clear error messages for debugging

## Best Practices

### Model Selection
- **Start with**: Gemini 1.5 Pro for general use
- **For speed**: Gemini 1.5 Flash 8B
- **For complex analysis**: Gemini 2.5 Pro Preview
- **For large contexts**: Any Pro model (2M tokens)

### Cost Optimization
- Use Flash models for routine tasks
- Reserve Pro models for complex analysis
- Take advantage of long context to reduce API calls

### API Usage
- Monitor usage in Google Cloud Console
- Set up billing alerts if needed
- Consider rate limits for high-volume usage

## Troubleshooting

### Common Issues

1. **Invalid API Key**
   - Ensure key starts with 'AIza' and is 39 characters
   - Verify key is active in Google AI Studio
   - Check billing setup if required

2. **Model Not Available**
   - Some models may require waitlist access
   - Try falling back to stable models like Gemini 1.5 Pro

3. **Rate Limiting**
   - Reduce request frequency
   - Consider upgrading quota in Google Cloud

4. **Context Length Errors**
   - Monitor token usage in long conversations
   - Clear chat history if approaching limits

### Getting Help
- Check Google AI documentation
- Review extension logs in Chrome DevTools
- Try different models to isolate issues

## Future Updates

The extension will be updated to support:
- New Gemini model releases
- Enhanced multi-modal features
- Advanced configuration options
- Performance optimizations

Check for extension updates regularly to access the latest Gemini capabilities. 