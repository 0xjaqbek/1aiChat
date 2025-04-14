import React, { useState, useEffect, useRef } from 'react';
import './App.css'

const TerminalChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Add user message
    const userMessage = {
      text: inputValue,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Get chat history excluding the latest user message (which we'll send separately)
      const history = messages.map(msg => ({
        role: msg.role,
        text: msg.text
      }));
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          history: history
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      
      const data = await response.json();
      
      // Add AI response to chat
      setMessages(prev => [
        ...prev, 
        {
          text: data.response,
          role: 'model',
          timestamp: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to communicate with the AI. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Terminal prompt character
  const renderPrompt = (role) => {
    return role === 'user' ? '>' : '$';
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Talk with AI</h1>
      </header>
      
      <div className="chat-container">
        {messages.length === 0 && (
          <div className="welcome-message">
            <p>Welcome to Terminal AI Chat. Type a message to begin.</p>
            <p><span className="terminal-prefix">$</span> system initialized...</p>
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-prompt">
              <span className="terminal-prefix">{renderPrompt(message.role)}</span>
              {message.role === 'user' ? 'You' : 'AI'}:
            </div>
            <div className="message-text">{message.text}</div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message bot-message">
            <div className="message-prompt">
              <span className="terminal-prefix">$</span> AI:
            </div>
            <div className="message-text">
              <div className="loading"></div> Processing...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="input-container">
        <span className="terminal-prefix"></span>
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder="Type your message..."
          className="message-input"
          ref={inputRef}
          disabled={isLoading}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={isLoading || !inputValue.trim()}
        >
          SEND
        </button>
      </form>
    </div>
  );
};

export default TerminalChat;