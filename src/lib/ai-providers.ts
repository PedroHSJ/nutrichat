export interface AIProvider {
  name: string;
  sendMessage: (message: string, systemPrompt: string) => Promise<string>;
}

export interface APIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  
  async sendMessage(message: string, systemPrompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API Key não configurada');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo', // Modelo configurável
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 200, // Limitado a 200 tokens para respostas mais concisas
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: APIResponse = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('Resposta inválida da OpenAI API');
    }

    return assistantMessage;
  }
}

export class GitHubModelsProvider implements AIProvider {
  name = 'GitHub Models';
  
  async sendMessage(message: string, systemPrompt: string): Promise<string> {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GitHub Token não configurado');
    }

    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GITHUB_MODEL || 'gpt-4o-mini', // Modelo configurável
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 200, // Limitado a 200 tokens para respostas mais concisas
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`GitHub Models API Error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data: APIResponse = await response.json();
    const assistantMessage = data.choices[0]?.message?.content;

    if (!assistantMessage) {
      throw new Error('Resposta inválida da GitHub Models API');
    }

    return assistantMessage;
  }
}

// Factory para criar o provider correto
export function createAIProvider(): AIProvider {
  const providerType = process.env.AI_PROVIDER?.toLowerCase() || 'openai';
  
  switch (providerType) {
    case 'github':
    case 'copilot':
      return new GitHubModelsProvider();
    case 'openai':
    case 'chatgpt':
    default:
      return new OpenAIProvider();
  }
}