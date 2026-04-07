import { OpenRouter } from '@openrouter/sdk'
import { config, type ModelConfig } from './config.ts'
import { type ChatGenerationParams } from '@openrouter/sdk/models'

export type LLMResponse = {
    model: string;
    content: string;
}

export class OpenRouterService {
    private client: OpenRouter
    private config: ModelConfig
    constructor(configOverride?: ModelConfig) {
        this.config = configOverride ?? config

        this.client = new OpenRouter({
            apiKey: config.apiKey,
            httpReferer: config.httpReferer,
            xTitle: config.xTitle
        })

    }

    private extractContent(message: unknown): string {
        if (!message || typeof message !== 'object') return ''
        const content = (message as { content?: unknown }).content
        if (typeof content === 'string') return content
        if (Array.isArray(content)) {
            // Join text parts (OpenAI-style content array)
            const parts = content
                .map((p) => {
                    if (!p || typeof p !== 'object') return ''
                    const t = (p as { text?: unknown; type?: unknown }).text
                    return typeof t === 'string' ? t : ''
                })
                .filter(Boolean)
            return parts.join('')
        }
        return ''
    }

    private extractFallback(response: unknown): string {
        if (!response || typeof response !== 'object') return ''
        const anyResp = response as Record<string, unknown>

        const choices = anyResp.choices as Array<Record<string, unknown>> | undefined
        const firstChoice = Array.isArray(choices) ? choices[0] : undefined

        const text = firstChoice?.text
        if (typeof text === 'string' && text.trim()) return text

        const message = firstChoice?.message
        const msgContent = this.extractContent(message)
        if (msgContent) return msgContent

        const outputText = anyResp.output_text
        if (typeof outputText === 'string' && outputText.trim()) return outputText

        const output = anyResp.output as Array<Record<string, unknown>> | undefined
        const outputFirst = Array.isArray(output) ? output[0] : undefined
        const outputContent = outputFirst?.content
        if (Array.isArray(outputContent)) {
            const joined = outputContent
                .map((p) => (p && typeof p === 'object' ? (p as { text?: unknown }).text : ''))
                .filter((t) => typeof t === 'string' && t)
                .join('')
            if (joined) return joined
        }

        return ''
    }

    async generate(prompt: string): Promise<LLMResponse> {
        const response = await this.client.chat.send({
            models: this.config.models,
            messages: [
                { role: 'system', content: this.config.systemPrompt },
                { role: 'user', content: prompt}
            ],
            stream: false,
            temperature: this.config.temperature,
            maxTokens: this.config.maxTokens,
            provider: this.config.provider as ChatGenerationParams['provider']
        })

        const message = response.choices.at(0)?.message
        const content = this.extractContent(message) || this.extractFallback(response as unknown)
        return {
            model: response.model,
            content,
        }
    }
}
