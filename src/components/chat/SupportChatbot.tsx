import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Send, 
  X, 
  Bot, 
  User, 
  Loader2,
  Minimize2,
  Maximize2,
  RotateCcw,
  Activity
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SupportChatbotProps {
  userId?: string;
  isAdmin?: boolean;
}

const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export default function SupportChatbot({ userId, isAdmin = false }: SupportChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize with welcome message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: Message = {
        id: 'welcome',
        role: 'assistant',
        content: isAdmin 
          ? "Hello! I'm your AI support assistant. I can help you with admin tasks, user management, API key operations, and general questions about the ZETECH MD BOT platform. How can I assist you today?"
          : "Hello! I'm your AI support assistant for ZETECH MD BOT. I can help you with API key management, account questions, troubleshooting, and general guidance. What can I help you with today?",
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, isAdmin]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  const sendMessage = async (retryCount = 0) => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const systemPrompt = isAdmin 
        ? `You are an AI support assistant for the ZETECH MD BOT admin dashboard. You help admins with:
- User management and account operations
- API key creation, management, and troubleshooting
- System administration tasks
- Database operations and maintenance
- Notification system management
- General platform guidance

Be helpful, professional, and provide specific guidance for admin tasks. If you don't know something specific about the system, suggest checking the admin dashboard or contacting the development team.`
        : `You are an AI support assistant for the ZETECH MD BOT platform. You help users with:
- API key management and usage
- Account setup and configuration
- Troubleshooting common issues
- Understanding platform features
- Payment and subscription questions
- General guidance on using the service

Be friendly, helpful, and provide clear step-by-step instructions when possible. If you can't solve a specific technical issue, suggest contacting support or checking the documentation.`;

      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "ZETECH MD BOT Support",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat-v3-0324:free",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            { role: "user", content: userMessage.content }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        console.error('Response Status:', response.status);
        console.error('Response Headers:', Object.fromEntries(response.headers.entries()));
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check the API key configuration.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Retry logic for network errors
      if (retryCount < 2 && error instanceof Error && error.message.includes('fetch')) {
        console.log(`Retrying API call (attempt ${retryCount + 1})`);
        setTimeout(() => {
          sendMessage(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        return;
      }
      
      // Provide helpful fallback responses based on the user's question
      let fallbackResponse = "I'm sorry, I'm having trouble connecting to the AI service right now. ";
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        fallbackResponse = "The AI service is currently being configured. In the meantime, here's how I can help you: ";
      }
      
      const userQuestion = userMessage.content.toLowerCase();
      
      if (userQuestion.includes('api key') || userQuestion.includes('key')) {
        fallbackResponse += "For API key help, you can:\n• Check your API keys in the dashboard\n• Create new keys using the 'Create API Key' button\n• View key status and expiration dates\n• Contact support for key-related issues\n\n💡 Tip: Your API keys are displayed in the dashboard with their status and expiration information.";
      } else if (userQuestion.includes('payment') || userQuestion.includes('billing')) {
        fallbackResponse += "For payment questions, you can:\n• Check your payment history in the dashboard\n• Use the payment dialog to make new payments\n• View your subscription status\n• Contact support for billing issues\n\n💡 Tip: You can make payments using M-Pesa through the payment dialog.";
      } else if (userQuestion.includes('trial') || userQuestion.includes('free')) {
        fallbackResponse += "For trial information:\n• Click 'Claim Free Trial' to get a 7-day trial\n• Check your trial status in the dashboard\n• Each account gets one free trial\n• Contact support if you need help with trials\n\n💡 Tip: Free trials give you full access to all features for 7 days.";
      } else if (userQuestion.includes('admin') || userQuestion.includes('user management')) {
        fallbackResponse += "For admin tasks:\n• Use the admin dashboard for user management\n• Check the 'Advanced Actions' page for more tools\n• Send notifications to users\n• Manage API keys for all users\n• Contact the development team for system issues\n\n💡 Tip: Admins can access advanced features in the 'Advanced Actions' page.";
      } else if (userQuestion.includes('notification') || userQuestion.includes('message')) {
        fallbackResponse += "For notifications:\n• Check the notification center (bell icon) in the dashboard\n• Admins can send notifications to users\n• View notification history and status\n• Mark notifications as read or delete them\n\n💡 Tip: The notification center shows all messages from admins.";
      } else {
        fallbackResponse += "Here are some common solutions:\n• Check the dashboard for your account status\n• Use the notification center for updates\n• Contact support for technical issues\n• Try refreshing the page if something isn't working\n• Check your internet connection\n\n💡 Tip: Most issues can be resolved by checking your dashboard or contacting support.";
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fallbackResponse,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "AI Service Temporarily Unavailable",
        description: "Using fallback responses. The AI service will be back online soon.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast({
      title: "Chat Cleared",
      description: "Chat history has been cleared",
    });
  };

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "ZETECH MD BOT Support",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat-v3-0324:free",
          messages: [
            { role: "user", content: "Hello, this is a connection test." }
          ],
          max_tokens: 50
        })
      });

      if (response.ok) {
        toast({
          title: "Connection Test Successful",
          description: "AI service is working properly!",
        });
      } else {
        throw new Error(`Connection test failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      toast({
        title: "Connection Test Failed",
        description: "Unable to connect to AI service. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        Support Chat
        <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs">
          AI
        </Badge>
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-96 z-50 transition-all duration-300 ${
      isMinimized ? 'h-16' : 'h-[500px]'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Bot className="h-4 w-4 text-primary" />
            AI Support Assistant
            <Badge variant="secondary" className="text-xs">Online</Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-6 w-6 p-0"
            >
              {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[400px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                size="sm"
                className="gap-1"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Chat Actions */}
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearChat}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Clear Chat
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => testConnection()}
                  disabled={isLoading}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Activity className="h-3 w-3 mr-1" />
                  Test Connection
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Powered by DeepSeek AI
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
