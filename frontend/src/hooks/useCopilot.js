import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { mcpClientService } from '../services/mcpClient';
import { getAccessToken } from '../api/client';
import { stopKeys } from './useStops';
import { tripKeys } from './useTrips';

export function useCopilot(trip, isOpen = false) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mcpStatus, setMcpStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected' | 'error'
  const [mcpError, setMcpError] = useState(null);
  const [availableTools, setAvailableTools] = useState([]);
  const [apiKey, setApiKey] = useState(() => {
    return (
      (typeof window !== 'undefined' && localStorage.getItem('gemini_api_key')) ||
      import.meta.env.VITE_GEMINI_API_KEY ||
      ''
    );
  });

  // Initialize and connect to MCP server
  const connectMcp = useCallback(async () => {
    setMcpStatus('connecting');
    setMcpError(null);
    try {
      await mcpClientService.connect();
      const tools = await mcpClientService.listTools();
      setAvailableTools(tools);
      setMcpStatus('connected');
    } catch (err) {
      setMcpStatus('error');
      setMcpError(err?.message || 'Failed to connect to MCP server on port 8001');
    }
  }, []);

  // Lazily connect when the Copilot drawer is opened
  useEffect(() => {
    if (isOpen && mcpStatus === 'disconnected') {
      connectMcp();
    }
  }, [isOpen, mcpStatus, connectMcp]);

  const saveApiKey = (newKey) => {
    const trimmed = newKey ? newKey.trim() : '';
    setApiKey(trimmed);
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('gemini_api_key', trimmed);
      } else {
        localStorage.removeItem('gemini_api_key');
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const sendMessage = async (userText) => {
    const prompt = userText.trim();
    if (!prompt || isProcessing) return;

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `asst-${Date.now() + 1}`;

    const newMessages = [
      ...messages,
      {
        id: userMessageId,
        role: 'user',
        content: prompt,
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(newMessages);
    setIsProcessing(true);

    try {
      // 1. Ensure MCP connection
      let tools = availableTools;
      if (mcpStatus !== 'connected') {
        try {
          await mcpClientService.connect();
          tools = await mcpClientService.listTools();
          setAvailableTools(tools);
          setMcpStatus('connected');
        } catch (mcpErr) {
          setMcpStatus('error');
          setMcpError(mcpErr.message);
        }
      }

      // 2. Format Gemini tools from MCP schema
      const functionDeclarations = tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      }));

      // 3. Fallback heuristic if no Gemini API key
      if (!apiKey) {
        const result = await handleFallbackAssistant(prompt, trip, tools);
        if (result.actionsTaken && result.actionsTaken.length > 0) {
          queryClient.invalidateQueries({ queryKey: stopKeys.all(trip?.id) });
          queryClient.invalidateQueries({ queryKey: tripKeys.detail(trip?.id) });
        }
        setMessages([
          ...newMessages,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: result.reply,
            actionsTaken: result.actionsTaken,
            timestamp: new Date().toISOString(),
          },
        ]);
        return;
      }

      // 4. Multi-turn LLM loop with Gemini calling MCP tools
      const { reply, actionsTaken } = await executeGeminiMcpLoop({
        apiKey,
        prompt,
        history: newMessages,
        trip,
        functionDeclarations,
      });

      // 5. Invalidate TanStack query cache if tools modified the itinerary
      if (actionsTaken && actionsTaken.length > 0) {
        queryClient.invalidateQueries({ queryKey: stopKeys.all(trip?.id) });
        queryClient.invalidateQueries({ queryKey: tripKeys.detail(trip?.id) });
      }

      setMessages([
        ...newMessages,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: reply,
          actionsTaken,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      const isConnectionIssue =
        err.message?.includes('Non-200') ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError');
      const errorMessage = isConnectionIssue
        ? 'MCP Server is currently offline. Please run `python mcp_server/server.py` in your terminal to start it.'
        : (err.message || 'Error processing request.');

      setMessages([
        ...newMessages,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: `⚠️ Encountered an issue: ${errorMessage}`,
          isError: true,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    messages,
    sendMessage,
    isProcessing,
    mcpStatus,
    mcpError,
    connectMcp,
    clearChat,
    apiKey,
    saveApiKey,
    availableTools,
  };
}

/**
 * Executes a Gemini request with MCP tool execution over SSE.
 */
async function executeGeminiMcpLoop({ apiKey, history, trip, functionDeclarations }) {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
  const actionsTaken = [];

  const systemInstruction = `You are a helpful, expert travel scheduling AI assistant for the trip "${trip?.title || 'Trip'}" (Trip ID: ${trip?.id}).
Trip Dates: ${trip?.start_date || 'N/A'} to ${trip?.end_date || 'N/A'}.
Trip Description: ${trip?.description || 'No description'}.

You have access to the MCP server tool 'add_stop'.
When the user asks to add or schedule any attraction, museum, restaurant, landmark, or activity, ALWAYS invoke the 'add_stop' tool.
Provide realistic locations and ensure arrival_date/departure_date fall within [${trip?.start_date}, ${trip?.end_date}].`;

  // Build Gemini contents array from chat history
  const contents = history.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const requestBody = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    tools: functionDeclarations.length > 0 ? [{ function_declarations: functionDeclarations }] : [],
    tool_config: {
      function_calling_config: { mode: 'AUTO' },
    },
  };

  let responseData = null;
  let usedModel = models[0];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );
      if (res.ok) {
        responseData = await res.json();
        usedModel = model;
        break;
      }
    } catch {
      continue;
    }
  }

  if (!responseData) {
    throw new Error('Failed to reach Gemini API. Please check your API key and connection.');
  }

  const candidate = responseData.candidates?.[0]?.content;
  const functionCalls =
    candidate?.parts?.filter((p) => Boolean(p.functionCall))?.map((p) => p.functionCall) || [];

  // If Gemini decided to call MCP tools:
  if (functionCalls.length > 0) {
    const functionResponseParts = [];

    for (const call of functionCalls) {
      const currentToken =
        getAccessToken() ||
        (typeof window !== 'undefined'
          ? localStorage.getItem('trip_planner_refresh_token')
          : null);

      const callArgs = {
        trip_id: trip.id,
        ...(call.args || {}),
        auth_token: currentToken,
      };

      // Call MCP Server over SSE
      const toolResult = await mcpClientService.callTool(call.name, callArgs);
      actionsTaken.push({
        tool: call.name,
        stop: toolResult.stop,
        status: toolResult.status,
        message: toolResult.message || `Called ${call.name}`,
      });

      functionResponseParts.push({
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      });
    }

    // Second turn to Gemini to summarize the action taken
    const secondTurnContents = [
      ...contents,
      candidate,
      {
        role: 'user',
        parts: functionResponseParts,
      },
    ];

    try {
      const followUpRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${usedModel}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: secondTurnContents,
          }),
        }
      );
      if (followUpRes.ok) {
        const followUpData = await followUpRes.json();
        const textPart = followUpData.candidates?.[0]?.content?.parts?.find((p) => p.text);
        if (textPart && textPart.text) {
          return { reply: textPart.text, actionsTaken };
        }
      }
    } catch {
      // If second turn fails, fallback to standard confirmation
    }

    return {
      reply: `Successfully added ${actionsTaken.length} stop(s) to your journey via the MCP server!`,
      actionsTaken,
    };
  }

  // Normal text response
  const textPart = candidate?.parts?.find((p) => p.text);
  return {
    reply: textPart?.text || 'I am ready to help you plan your itinerary. What would you like to explore?',
    actionsTaken,
  };
}

/**
 * Heuristic parser when no Gemini API key is configured.
 */
async function handleFallbackAssistant(prompt, trip) {
  const lower = prompt.toLowerCase();
  const isAddIntent =
    lower.includes('add') ||
    lower.includes('visit') ||
    lower.includes('stop') ||
    lower.includes('go to');

  if (isAddIntent && trip?.id) {
    // Extract place name
    let clean = prompt
      .replace(/(add a stop at|add a stop to|add stop at|add stop|add|visit|go to|take me to)/i, '')
      .replace(/for \d+ (hours|hrs|minutes|mins)/i, '')
      .trim();
    if (!clean) clean = 'Destination Activity';

    const currentToken =
      getAccessToken() ||
      (typeof window !== 'undefined'
        ? localStorage.getItem('trip_planner_refresh_token')
        : null);

    const toolResult = await mcpClientService.callTool('add_stop', {
      trip_id: trip.id,
      name: clean,
      arrival_date: trip.start_date,
      departure_date: trip.start_date,
      description: `Visit ${clean}`,
      duration_minutes: 120,
      auth_token: currentToken,
    });

    return {
      reply: `I have invoked the MCP \`add_stop\` tool over SSE and created **${clean}** on your itinerary timeline! (Note: Configure your Gemini API Key in drawer settings ⚙️ for complete conversational intelligence).`,
      actionsTaken: [
        {
          tool: 'add_stop',
          stop: toolResult.stop,
          status: toolResult.status,
          message: toolResult.message || `Added ${clean}`,
        },
      ],
    };
  }

  return {
    reply: `I am connected to your MCP Server over SSE. You can ask me to add stops to this trip (e.g. "Add Eiffel Tower for 2 hours"), or configure a Gemini API key ⚙️ in the drawer settings for conversational suggestions.`,
    actionsTaken: [],
  };
}
