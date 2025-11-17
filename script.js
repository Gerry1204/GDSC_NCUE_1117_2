document.addEventListener('DOMContentLoaded', () => {
    const apiKeyContainer = document.getElementById('api-key-container');
    const chatContainer = document.getElementById('chat-container');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const typingIndicator = document.getElementById('typing-indicator');

    let genAI;
    let chat;

    // Load API key from local storage and initialize
    function initialize() {
        const apiKey = localStorage.getItem('gemini-api-key');
        if (apiKey) {
            try {
                genAI = new google.generativeai.GenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash-latest",
                    generationConfig: {
                        maxOutputTokens: 4000
                    }
                });
                chat = model.startChat();
                showChatInterface();
            } catch (error) {
                console.error("Failed to initialize GenerativeAI:", error);
                alert("Invalid API Key or SDK error. Please check your key and try again.");
                localStorage.removeItem('gemini-api-key');
                showApiKeyScreen();
            }
        } else {
            showApiKeyScreen();
        }
    }

    function showChatInterface() {
        apiKeyContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }

    function showApiKeyScreen() {
        apiKeyContainer.classList.remove('hidden');
        chatContainer.classList.add('hidden');
    }

    // Save API Key
    saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('gemini-api-key', apiKey);
            initialize();
        } else {
            alert('Please enter a valid API key.');
        }
    });

    // Send Message
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        displayMessage(message, 'user-message');
        chatInput.value = '';
        chatHistory.appendChild(typingIndicator);
        typingIndicator.classList.remove('hidden');
        chatHistory.scrollTop = chatHistory.scrollHeight;

        try {
            const result = await chat.sendMessage(message);
            const response = await result.response;
            const text = response.text();

            typingIndicator.classList.add('hidden');
            displayMessage(text, 'ai-message');
        } catch (error) {
            console.error('Error sending message:', error);
            typingIndicator.classList.add('hidden');
            displayMessage('Sorry, something went wrong. Please check the console for details.', 'ai-message');
        }
    }

    function displayMessage(message, className) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', className);
        messageDiv.textContent = message;
        chatHistory.appendChild(messageDiv);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return messageDiv;
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Initial check
    initialize();
});
