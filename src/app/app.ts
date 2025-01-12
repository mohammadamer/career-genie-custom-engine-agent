import fs from 'fs';
import { MemoryStorage } from "botbuilder";
import * as path from "path";
import config from "../config";

// See https://aka.ms/teams-ai-library to learn more about the Teams AI library.
import { Application, ActionPlanner, OpenAIModel, PromptManager } from "@microsoft/teams-ai";

// Create AI components
const model = new OpenAIModel({
  azureApiKey: config.azureOpenAIKey,
  azureDefaultDeployment: config.azureOpenAIDeploymentName,
  azureEndpoint: config.azureOpenAIEndpoint,
  azureApiVersion: '2024-08-01-preview',

  useSystemMessages: true,
  logRequests: true,
});
const prompts = new PromptManager({
  promptsFolder: path.join(__dirname, "../prompts"),
});

const planner = new ActionPlanner({
  model,
  prompts,
  defaultPrompt:
    async () => {
      const template = await prompts.getPrompt('chat');
      const skprompt = fs.readFileSync(path.join(__dirname, '..', 'prompts', 'chat', 'skprompt.txt'));

      const dataSources = (template.config.completion as any)['data_sources'];

      dataSources.forEach((dataSource: any) => {
        if (dataSource.type === 'azure_search') {
          dataSource.parameters.authentication.key = config.azureSearchKey;
          dataSource.parameters.endpoint = config.azureSearchEndpoint;
          dataSource.parameters.index_name = config.indexName;
          dataSource.parameters.embedding_dependency.deployment_name = config.azureOpenAIEmbeddingDeploymentName;
          dataSource.parameters.role_information = `${skprompt.toString('utf-8')}`;
        }
      });
      return template;
    }
});

// Define storage and application
const storage = new MemoryStorage();
const app = new Application({
  storage,
  ai: {
    planner,
    enable_feedback_loop: true,
  },
});

app.feedbackLoop(async (context, state, feedbackLoopData) => {
  //add custom feedback process logic here
  console.log("Your feedback is " + JSON.stringify(context.activity.value));
});

export default app;