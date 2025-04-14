// client/src/App.jsx
import React, { useState, useRef, useEffect } from 'react';
import './App.css'; // Zaimportujemy style

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null); // Referencja do ostatniej wiadomości

  // Funkcja do przewijania na dół
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Przewiń na dół przy każdej zmianie wiadomości
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const handleSend = async () => {
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    const newUserMessage = { role: 'user', text: userMessage };
    const updatedMessages = [...messages, newUserMessage];

    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const historyForApi = updatedMessages.map(({ role, text }) => ({ role, text }));
      const backendUrl = 'http://localhost:3001/api/chat';

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send the entire history
        body: JSON.stringify({ history: historyForApi, message: userMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Błąd HTTP: ${response.status}`);
      }

      const data = await response.json();
      const aiResponseMessage = { role: 'model', text: data.response };
      setMessages(prevMessages => [...prevMessages, aiResponseMessage]);

    } catch (error) {
      console.error("Błąd podczas wysyłania wiadomości:", error);
      setMessages(prevMessages => [...prevMessages, { role: 'model', text: `Wystąpił błąd: ${error.message}. Spróbuj ponownie.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Obsługa wysyłania przez Enter
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) { // Wyślij na Enter, nie wysyłaj na Shift+Enter
      event.preventDefault(); // Zapobiegaj domyślnej akcji (np. nowa linia)
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        {/* Pusty div na końcu do którego będziemy przewijać */}
        <div ref={messagesEndRef} />
        {isLoading && <div className="message model"><p><i>Myślę...</i></p></div>}
      </div>
      <div className="chat-input-area">
        <textarea
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Wpisz wiadomość..."
          rows="3" // Można dostosować wysokość początkową
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? '...' : 'Wyślij'}
        </button>
      </div>
    </div>
  );
}

export default App;