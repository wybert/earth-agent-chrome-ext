use mastra for server side for working with ai sdk. use ai sdk for client side only for the demo and grow. cause we need remember user's data so it make sense that we have momory and all the agents in server side maybe. If we use server side, then langchain and mastra could be used.

But first try AI SDK to see how far it can goes.

I want implement the a agent that using ai sdk, which can call tools, it can call

1. gerarte the earth engine javascript code; tool 1
2. and then insert the code to code editor; tool 2
3. run the code; tool3

how to create agent: https://sdk.vercel.ai/docs/foundations/agents

multistep tool use: https://sdk.vercel.ai/docs/foundations/agents#multi-step-tool-usage