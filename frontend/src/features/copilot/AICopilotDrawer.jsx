import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Trash2,
  Settings,
  MapPin,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
  Compass,
} from 'lucide-react';
import { useCopilot } from '../../hooks/useCopilot';
import { formatDate } from '../../utils/dates';
import { FormattedMessage } from '../../components/ui/FormattedMessage';

const STARTER_PROMPTS = [
  'What are the top attractions I should not miss?',
  'Add a 2-hour visit to the most famous museum on the second day',
  'Recommend a scenic sunset viewpoint and add it to my trip',
  'Suggest pacing and duration for my itinerary',
];

export const AICopilotDrawer = ({ isOpen, onClose, trip }) => {
  const {
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
  } = useCopilot(trip, isOpen);

  const [inputPrompt, setInputPrompt] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(apiKey || '');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isProcessing, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputPrompt.trim() || isProcessing) return;
    sendMessage(inputPrompt.trim());
    setInputPrompt('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveKey = () => {
    saveApiKey(tempApiKey);
    setShowSettings(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-sand-950/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col border-l border-sand-200/80">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-sand-200/80 bg-gradient-to-r from-terracotta-50/70 via-sand-50 to-sand-100/50">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-terracotta-600 text-white flex items-center justify-center shadow-warm-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold font-serif text-sand-950">
                      Travel Copilot
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-terracotta-100 text-terracotta-800 border border-terracotta-200">
                      MCP
                    </span>
                  </div>
                  <p className="text-xs text-sand-600 truncate max-w-[220px]">
                    {trip?.title || 'Trip Assistant'}
                  </p>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1 text-sand-500">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  title="Configure Gemini API Key"
                  className={`p-2 rounded-lg hover:bg-sand-200/60 hover:text-sand-900 transition-colors ${
                    showSettings || !apiKey ? 'text-terracotta-600 bg-terracotta-50' : ''
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  title="Clear Chat History"
                  className="p-2 rounded-lg hover:bg-sand-200/60 hover:text-sand-900 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-sand-200/60 hover:text-sand-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* MCP Connection Status Bar */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                {mcpStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    MCP SSE Connected (port 8080)
                  </span>
                )}
                {mcpStatus === 'connecting' && (
                  <span className="inline-flex items-center gap-1.5 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Connecting to MCP...
                  </span>
                )}
                {mcpStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 text-red-700 font-medium bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                    <AlertCircle className="w-3 h-3" />
                    MCP Offline
                  </span>
                )}
                {mcpStatus === 'disconnected' && (
                  <span className="text-sand-500">MCP Idle</span>
                )}
              </div>

              {mcpStatus === 'error' && (
                <button
                  type="button"
                  onClick={connectMcp}
                  className="text-xs text-terracotta-700 hover:text-terracotta-900 font-semibold flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Retry
                </button>
              )}

              {availableTools.length > 0 && (
                <span className="text-[11px] text-sand-500">
                  {availableTools.length} tool(s) available
                </span>
              )}
            </div>
          </div>

          {/* Settings Drawer Pane */}
          {showSettings && (
            <div className="bg-sand-50 border-b border-sand-200 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-sand-800 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-terracotta-600" />
                  Gemini API Key Settings
                </span>
                <span className="text-[11px] text-sand-500">Saved in browser</span>
              </div>
              <p className="text-xs text-sand-600 leading-relaxed">
                Enter your free Gemini API key to enable rich conversational travel planning with
                live MCP tool calling:
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 border border-sand-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-terracotta-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSaveKey}
                  className="px-3 py-2 bg-terracotta-600 text-white rounded-xl text-xs font-semibold hover:bg-terracotta-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-sand-50/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-terracotta-100 to-sand-100 border border-terracotta-200 flex items-center justify-center text-terracotta-700 shadow-warm-xs">
                  <Compass className="w-7 h-7" />
                </div>
                <div className="max-w-xs space-y-1.5">
                  <h3 className="font-serif font-bold text-sand-950 text-base">
                    How can I help with your journey?
                  </h3>
                  <p className="text-xs text-sand-600 leading-relaxed">
                    Ask questions about your trip, get recommendations, or tell me to add stops
                    directly via our MCP protocol server.
                  </p>
                </div>

                {/* Starter Prompts */}
                <div className="w-full space-y-2 pt-2 text-left">
                  <span className="text-[11px] font-semibold text-sand-500 uppercase tracking-wider block text-center">
                    Try asking:
                  </span>
                  {STARTER_PROMPTS.map((starter, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(starter)}
                      className="w-full text-xs text-sand-800 bg-white border border-sand-200/90 hover:border-terracotta-300 hover:bg-terracotta-50/40 p-2.5 rounded-xl text-left transition-all shadow-warm-xs flex items-center gap-2 group"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-terracotta-500 group-hover:scale-110 transition-transform shrink-0" />
                      <span>{starter}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  } space-y-1.5`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-warm-xs ${
                      msg.role === 'user'
                        ? 'bg-terracotta-600 text-white rounded-br-xs'
                        : msg.isError
                        ? 'bg-red-50 text-red-900 border border-red-200 rounded-bl-xs'
                        : 'bg-white text-sand-900 border border-sand-200/90 rounded-bl-xs'
                    }`}
                  >
                    <FormattedMessage
                      content={msg.content}
                      isUser={msg.role === 'user'}
                      isError={Boolean(msg.isError)}
                    />

                    {/* Tool Actions Badge Cards */}
                    {msg.actionsTaken && msg.actionsTaken.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-sand-200 space-y-2">
                        {msg.actionsTaken.map((action, idx) => (
                          <div
                            key={idx}
                            className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 text-emerald-950 text-xs space-y-1"
                          >
                            <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Stop Added via MCP ({action.tool})</span>
                            </div>
                            {action.stop && (
                              <div className="space-y-0.5 text-sand-700 pl-5">
                                <div className="font-medium text-sand-900">
                                  {action.stop.name}
                                </div>
                                <div className="text-[11px] flex items-center gap-1 text-sand-600">
                                  <MapPin className="w-3 h-3 text-terracotta-600" />
                                  <span className="truncate">{action.stop.location}</span>
                                </div>
                                <div className="text-[11px] flex items-center gap-2 text-sand-600">
                                  {action.stop.arrival_date && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {formatDate(action.stop.arrival_date)}
                                    </span>
                                  )}
                                  {action.stop.duration_minutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {action.stop.duration_minutes}m
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-sand-400 px-1">
                    {msg.role === 'user' ? 'You' : 'Copilot (MCP)'}
                  </span>
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {isProcessing && (
              <div className="flex items-start gap-2">
                <div className="bg-white border border-sand-200/90 rounded-2xl rounded-bl-xs p-3 shadow-warm-xs">
                  <div className="flex items-center gap-2 text-xs text-sand-600">
                    <Loader2 className="w-4 h-4 animate-spin text-terracotta-600" />
                    <span>Communicating with Gemini & executing MCP tools...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 sm:p-4 border-t border-sand-200 bg-white">
            <div className="flex items-end gap-2 bg-sand-50 border border-sand-300 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-terracotta-500 focus-within:border-transparent transition-all">
              <textarea
                rows={1}
                placeholder="Ask or say: 'Add Eiffel Tower for 2 hours'..."
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessing}
                className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-sand-950 placeholder-sand-400 resize-none focus:outline-hidden max-h-32 min-h-[36px]"
              />
              <button
                type="submit"
                aria-label="Send message"
                title="Send message"
                disabled={!inputPrompt.trim() || isProcessing}
                className="p-2.5 rounded-xl bg-terracotta-600 text-white hover:bg-terracotta-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-warm-xs"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-sand-400 px-1 pt-1.5">
              <span>Press Enter to send</span>
              <span>Direct MCP stdio/SSE bridge</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
