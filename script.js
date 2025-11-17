import { GoogleGenerativeAI } from "@google/generative-ai";

document.addEventListener('DOMContentLoaded', () => {
    const apiKeyContainer = document.getElementById('api-key-container');
    const personalityContainer = document.getElementById('personality-container');
    const chatContainer = document.getElementById('chat-container');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');
    const chatHistory = document.getElementById('chat-history');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const typingIndicator = document.getElementById('typing-indicator');
    const personalityBtns = document.querySelectorAll('.personality-btn');

    let genAI;
    let chat;
    let currentPersonality = '可愛陪伴型';
    let isProcessing = false;

    // Personality system prompts
    const personalityPrompts = {
        '知識型': '你是一個專業的知識型助手，擅長提供詳細、準確的資訊和解釋。回答要有條理、客觀，並提供相關的背景知識。',
        '情感支持型': '你是一個溫暖、善解人意的朋友，善於傾聽和提供情感支持。用同理心回應，給予鼓勵和安慰。',
        '激勵型': '你是一個充滿活力的激勵教練，擅長鼓舞人心和激發潛能。用積極正面的語氣，幫助用戶克服挑戰。',
        '可愛陪伴型': '你是一個可愛、活潑的陪伴者，說話輕鬆愉快，喜歡用可愛的表達方式。讓對話充滿趣味和溫馨。'
    };

    // Load API key from local storage and initialize
    function initialize() {
        const apiKey = localStorage.getItem('gemini-api-key');
        if (apiKey) {
            try {
                genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({
                    model: "gemini-2.5-flash",
                    generationConfig: {
                        temperature: 0.9,
                    }
                });
                
                // 儲存當前人格設定
                const savedPersonality = localStorage.getItem('personality') || '可愛陪伴型';
                currentPersonality = savedPersonality;
                updatePersonalityButtons();
                
                // 使用人格系統提示初始化聊天
                const systemPrompt = personalityPrompts[currentPersonality];
                chat = model.startChat({
                    history: [
                        {
                            role: "user",
                            parts: [{ text: systemPrompt }],
                        },
                        {
                            role: "model",
                            parts: [{ text: "好的，我明白了！我會以這個角色來回應你。" }],
                        },
                    ],
                });
                
                showChatInterface();
            } catch (error) {
                console.error("Failed to initialize GenerativeAI:", error);
                alert("API Key 可能無效或 SDK 載入失敗。請檢查您的 API Key 並重試。\n錯誤詳情：" + error.message);
                localStorage.removeItem('gemini-api-key');
                showApiKeyScreen();
            }
        } else {
            showApiKeyScreen();
        }
    }

    function showChatInterface() {
        apiKeyContainer.classList.add('hidden');
        personalityContainer.classList.remove('hidden');
        chatContainer.classList.remove('hidden');
    }

    function showApiKeyScreen() {
        apiKeyContainer.classList.remove('hidden');
        personalityContainer.classList.add('hidden');
        chatContainer.classList.add('hidden');
    }

    // Update personality button active state
    function updatePersonalityButtons() {
        personalityBtns.forEach(btn => {
            if (btn.dataset.personality === currentPersonality) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Handle personality change
    personalityBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const newPersonality = btn.dataset.personality;
            if (newPersonality !== currentPersonality && !isProcessing) {
                currentPersonality = newPersonality;
                localStorage.setItem('personality', currentPersonality);
                updatePersonalityButtons();
                
                // 重新初始化聊天以應用新人格
                try {
                    const model = genAI.getGenerativeModel({
                        model: "gemini-1.5-flash",
                        generationConfig: {
                            maxOutputTokens: 4000,
                            temperature: 0.9,
                        }
                    });
                    
                    const systemPrompt = personalityPrompts[currentPersonality];
                    chat = model.startChat({
                        history: [
                            {
                                role: "user",
                                parts: [{ text: systemPrompt }],
                            },
                            {
                                role: "model",
                                parts: [{ text: "好的，我明白了！我會以這個角色來回應你。" }],
                            },
                        ],
                    });
                    
                    // 顯示切換訊息
                    const notificationDiv = document.createElement('div');
                    notificationDiv.classList.add('message', 'system-message');
                    notificationDiv.textContent = `已切換至 ${currentPersonality} 模式`;
                    chatHistory.appendChild(notificationDiv);
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                } catch (error) {
                    console.error("Failed to switch personality:", error);
                    alert("切換人格失敗，請重新載入頁面。");
                }
            }
        });
    });

    // Save API Key
    saveApiKeyBtn.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            // 基本驗證 API key 格式
            if (apiKey.length < 20) {
                alert('API Key 格式不正確，請輸入有效的 Gemini API Key。');
                return;
            }
            
            try {
                localStorage.setItem('gemini-api-key', apiKey);
                initialize();
            } catch (error) {
                console.error("Failed to save API key:", error);
                alert("無法儲存 API Key。請確認瀏覽器允許使用 localStorage。");
            }
        } else {
            alert('請輸入有效的 API key。');
        }
    });

    // 允許在 API key 輸入框按 Enter 儲存
    apiKeyInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveApiKeyBtn.click();
        }
    });

    // Send Message
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message || isProcessing) return;

        // 設定處理中狀態
        isProcessing = true;
        setInputState(false);

        displayMessage(message, 'user-message');
        chatInput.value = '';
        
        // 顯示 typing indicator
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
            
            let errorMessage = '抱歉，發生錯誤。';
            if (error.message.includes('API key')) {
                errorMessage = 'API Key 無效或已過期，請重新設定。';
                localStorage.removeItem('gemini-api-key');
                setTimeout(() => {
                    showApiKeyScreen();
                }, 2000);
            } else if (error.message.includes('quota')) {
                errorMessage = 'API 配額已用完，請稍後再試或檢查您的 Google Cloud 帳戶。';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage = '網路連線失敗，請檢查您的網路連線。';
            } else {
                errorMessage = `發生錯誤：${error.message}`;
            }
            
            displayMessage(errorMessage, 'ai-message error-message');
        } finally {
            // 恢復輸入狀態
            isProcessing = false;
            setInputState(true);
        }
    }

    // 控制輸入框和按鈕的啟用/禁用狀態
    function setInputState(enabled) {
        chatInput.disabled = !enabled;
        sendBtn.disabled = !enabled;
        if (enabled) {
            chatInput.focus();
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
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Initial check
    initialize();
});
