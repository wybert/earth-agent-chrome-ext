use mastra for server side for working with ai sdk. use ai sdk for client side only for the demo and grow. cause we need remember user's data so it make sense that we have momory and all the agents in server side maybe. If we use server side, then langchain and mastra could be used.

But first try AI SDK to see how far it can goes.

I want implement the a agent that using ai sdk, which can call tools, it can call

1. gerarte the earth engine javascript code; tool 1
2. and then insert the code to code editor; tool 2
3. run the code; tool3

how to create agent: https://sdk.vercel.ai/docs/foundations/agents

multistep tool use: https://sdk.vercel.ai/docs/foundations/agents#multi-step-tool-usage

reference:
https://www.anthropic.com/engineering/building-effective-agents
https://www.callstack.com/blog/building-ai-agent-workflows-with-vercels-ai-sdk-a-practical-guide
https://sdk.vercel.ai/docs/foundations/agents

After read this, the should read vercel ai sdk api document

Baicly, the ai call should be (in our current implement, we use streamText, we also gonna use streamObject I guess!):

generateText: Generates text and tool calls. This function is ideal for non-interactive use cases such as automation tasks where you need to write text (e.g. drafting email or summarizing web pages) and for agents that use tools.
streamText: Stream text and tool calls. You can use the streamText function for interactive use cases such as chat bots and content streaming.
generateObject: Generates a typed, structured object that matches a Zod schema. You can use this function to force the language model to return structured data, e.g. for information extraction, synthetic data generation, or classification tasks.
streamObject: Stream a structured object that matches a Zod schema. You can use this function to stream generated UIs.

Learn, where should this call loacated?
It's located in chat.ts and routes.ts;
looks like there are many duclicates functions?

multi-modal support for tools:
https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#multi-modal-tool-results

Multi-modal tool results are experimental and only supported by Anthropic.

It is mentioned here that only Anthropic is supported. In fact, multimodal model support may be possible with gpt4o, but if the tool returns the result in the form of an image, these results are returned to llm in the form of an image, which only supports Anthropic. This is actually difficult to develop.
The latest AI SDK seems to have better multimodal support.

Maybe that's it. Maybe next step should deploy the extension to chrome store.

ai installed as version 4.3.13. create a new branch as the new version of the ai-sdk-core as 5.0.0.

Now, it support the screenshot.
Next step should focus on how to get the more tools. As the tools are the pieses of the agent to become more agentic.

How is the pattern of the agent looks like?

the https://github.com/huggingface/smolagents?tab=readme-ov-file mentioned the classical ReAct agents. Maybe our agent should be like this.