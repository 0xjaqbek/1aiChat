import React, { useState, useEffect, useRef } from 'react';
import './App.css'

const TerminalChat = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Add initial welcome message from JaqBot
  useEffect(() => {
    setMessages([{
      text: "GM! I'm JaqBot, your crypto-native assistant. Ready to dive into Web3, smart contracts, or anything blockchain? WAGMI! 🚀",
      role: 'model',
      timestamp: new Date().toISOString()
    }]);
  }, []);

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
      setError('Connection failed. The blockchain must be congested! Try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced terminal prompt character for crypto theme
  const renderPrompt = (role) => {
    return role === 'user' ? '>' : 'Ξ>';
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>JaqBot <span className="version">v0.1.0</span> <span className="cursor"></span></h1>
        <div className="header-links">
          <a href="https://twitter.com/jaqbek_eth" target="_blank" rel="noopener noreferrer">@jaqbek_eth</a> | 
          <a href="https://github.com/0xjaqbek" target="_blank" rel="noopener noreferrer">0xjaqbek</a> | 
          <a href="https://becomingweb3.dev" target="_blank" rel="noopener noreferrer">becomingweb3.dev</a>
        </div>
      </header>
      
      <div className="chat-container">
        {error && <div className="error-message">{error}</div>}
        
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.role === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-prompt">
              <span className="terminal-prefix">{renderPrompt(message.role)}</span>
              {message.role === 'user' ? 'You' : 'JaqBot'}:
            </div>
            <div className="message-text">{message.text}</div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message bot-message">
            <div className="message-prompt">
              <span className="terminal-prefix"></span> JaqBot:
            </div>
            <div className="message-text">
              <div className="loading"></div> Mining response...
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
          placeholder="Ask about Web3, DeFi, or dev..."
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
      
      <footer className="app-footer">
        <div className="network-status">
          <span className="network-indicator"></span> Connected to Ethereum Mainnet
        </div>
      </footer>
    </div>
  );
};

export default TerminalChat;