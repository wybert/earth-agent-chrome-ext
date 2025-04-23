
## Aims

We are creating a chrome extension named google earth engine agent. This is a cursor like AI agent assistant that could interact with google earth engine code editor. This is the introduction to google earth engine code editor： https://developers.google.com/earth-engine/guides/playground.

## UI

When we open our extension, a side panel will appear on the right. There is a chatbot UI there and will stream the agent response. At the bottom there is a chat box, in there the user would input the prompt. The agent should give the thinking process in the UI, and also able to response with the ui like inesrt code and run button that request user’s permission to run the generated code in the google earth engine code editor., or debug button. The user can keep the conversation going by asking follow up questions and error messages. It should have a setting to setup user llm api key, and system prompt. It should have chat history. No login needed.


## Features

- Based on the prompt from the user, our AI agent thinking in steps how to answer user questions.
- It will be able to call agents and call tools to interact with Google Earth Engine Code Editor (see https://developers.google.com/earth-engine/guides/playground) to
  - query the Google earth engine dataset catalog
  - generate the Google earth engine code
  - insert code to GEE code editor and run it
  - read message from console and debug the code
  - Inspect the on the map and read information from the map
  - take screenshot of the map and charts and summarize the map and charts with API
  - Run tasks
- it behavior like cursor agent but for google earth Engine
- in one session, the agent should remember the previous conversation and use it to improve the response.
- the agent should be able to refer the document to think of good parameters for the generated Code
- the agent should has memory
- the agent should have knowledge of google Earth engine, remote sensing,  machine learning and geospatial analysis and GIS
- the agent should have two modes: chat modes and agent modes.
- chat modes will ask for user permission to perform actions.
- agent modes will perform actions without asking for permission.
- the agents should return the screenshot of the map or charts so that it keep the history results
- the agents should be able to create javascript files and orgnize it
- the agents should be integrated with MCP tools


## my ideas for tools

The following tools needs to be implemented and the agents will call these tools to accomplish the tasks:
1. Database search: search the google engine catelogue for relevant databases. https://github.com/samapriya/Earth-Engine-Datasets-List/blob/master/gee_catalog.json.
2. Problem assessment: analyze the prompt, check the whether this problem can be fixed using the Google earth engine. RAG for GEE API, access the documentation of the google earth engine API, for the assessment.
3. Code_run: this will paste the generated code to the ACE editor of the google earth engine and run the map in Google earth engine.
4. Inspect: will click the inspector button in the GEE editor, click on the map and retrieve information from google earth engine editor.
5. Console: will click on the console to see the error message from the google earth engine editor.
6. Task: click the task button in the google earth engine editor to access the scripts and the files.
7. script edit: edit the scripts in the google earth engine code editor.


## Framework and Stack

1. It will use Nodejs to build the codes for google chrome extension
2. It uses AI SDK by Vercel (https://sdk.vercel.ai/docs/introduction#ai-sdk) for both agent development and tool development
3. It uses AI SDK by Vercel (https://sdk.vercel.ai/docs/introduction#ai-sdk) and shadcn/ui for UI including chat UI.

## Reference

You can reference the project under the folder worth-the-click-main, becase it use AI SDK for building Chrome extensions, they has some blogs to describe it,

https://dev.to/jolodev/developing-your-own-chrome-extension-in-bun-and-typescript-part-2-50h7
https://dev.to/jolodev/developing-your-own-chrome-extension-with-openai-and-langchain-part-3-4nbl
https://dev.to/jolodev/developing-your-own-chrome-extension-fixing-errors-with-ts-morph-and-using-buns-api-part-4-3hni
https://dev.to/jolodev/developing-your-own-chrome-extension-fetch-with-a-proxy-and-cloudflare-workers-part-5-95j

You can refer this.

## Keep in mind:


Give us some suggestions in terms of our design. Dont finish this in one go, lets develop this through iterations. First create a plan. If we approve, move ahead to develop the minimal viable prototype. If that works, move ahead with the remaining development.
