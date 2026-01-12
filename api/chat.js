import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToCoreMessages } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const { messages, context } = await req.json();

        // Determine Provider: Default to Google (Free-ish Tier), allow Anthropic
        const providerName = process.env.AI_PROVIDER || 'google';

        let model;
        if (providerName === 'anthropic') {
            // Check for specific Anthropic key if needed, or rely on default ANTHROPIC_API_KEY
            model = anthropic('claude-3-5-sonnet-20240620');
        } else {
            // Use specific key for this project: JOURNAL_AI_GOOGLE_API_KEY
            // Fallback to standard GOOGLE_GENERATIVE_AI_API_KEY just in case
            const googleKey = process.env.JOURNAL_AI_GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

            // Create a custom google instance if using a specific key
            if (process.env.JOURNAL_AI_GOOGLE_API_KEY) {
                const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
                const customGoogle = createGoogleGenerativeAI({
                    apiKey: googleKey
                });
                model = customGoogle('gemini-1.5-flash');
            } else {
                model = google('gemini-1.5-flash');
            }
        }

        const systemPrompt = `You are a helpful, private journal assistant. 
    Analyze the following journal entries to answer the user's questions. 
    Be empathetic and insightful. 
    Keep answers concise.
    
    Journal Entries Context:
    ${context}`;

        const result = await streamText({
            model: model,
            system: systemPrompt,
            messages: convertToCoreMessages(messages),
        });

        return result.toDataStreamResponse();
    } catch (error) {
        console.error('Chat API Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
