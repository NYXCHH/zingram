// База данных пользователей (имитация)
let users = [
    { id: 1, name: 'Иван', username: 'ivan123', phone: '+79991234567', avatar: 'https://via.placeholder.com/50', online: true },
    { id: 2, name: 'Maria', username: 'maria_cool', phone: '+79997654321', avatar: 'https://via.placeholder.com/50', online: false },
    { id: 3, name: 'Alex', username: 'alex_dev', phone: '+79995551234', avatar: 'https://via.placeholder.com/50', online: true }
];

let currentUser = null;
let currentChatId = null;
let chats = [];
let currentLanguage = 'ru';
let accentColor = '#e53935';
let inCall = false;
let callTimer = null;
let callSeconds = 0;

// Инициализация
function init() {
    setupAuthListeners();
    setupLanguageSelector();
}

// Настройка переключателя языка
function setupLanguageSelector() {
    const select = document.getElementById('languageSelect');
    select.value = currentLanguage;
    select.onchange = (e) => {
        currentLanguage = e.target.value;
        updateLanguage();
    };
}

// Обновление текстов на странице
function updateLanguage() {
    const lang = translations[currentLanguage];
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (lang[key]) {
            el.textContent = lang[key];
        }
    });
    
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (lang[key]) {
            el.placeholder = lang[key];
        }
    });
}

// Обработчики авторизации
function setupAuthListeners() {
    document.getElementById('showRegister').onclick = () => {
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('registerForm').classList.remove('hidden');
    };
    
    document.getElementById('showLogin').onclick = () => {
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
    };
    
    document.getElementById('loginBtn').onclick = login;
    document.getElementById('registerBtn').onclick = register;
    
    document.getElementById('loginPhone').onkeypress = (e) => {
        if (e.key === 'Enter') login();
    };
}

// Вход
function login() {
    const phone = document.getElementById('loginPhone').value.trim();
    
    if (!phone) {
        alert('Введите номер телефона');
        return;
    }
    
    const user = users.find(u => u.phone === phone);
    
    if (user) {
        currentUser = user;
        // Предзагружаем звук
        preloadLoginSound();
        showMessenger();
    } else {
        alert('Пользователь не найден. Зарегистрируйтесь!');
    }
}

// Предзагрузка звука
let loginAudio = null;
function preloadLoginSound() {
    if (!loginAudio) {
        loginAudio = new Audio('on-screen-prompt.mp3');
        loginAudio.volume = 0.5;
        loginAudio.load();
    }
}

// Регистрация
function register() {
    const name = document.getElementById('registerName').value.trim();
    const username = document.getElementById('registerUsername').value.trim().replace('@', '');
    const phone = document.getElementById('registerPhone').value.trim();
    
    if (!name || !username || !phone) {
        alert('Заполните все поля');
        return;
    }
    
    if (users.find(u => u.username === username)) {
        alert('Этот username уже занят');
        return;
    }
    
    if (users.find(u => u.phone === phone)) {
        alert('Этот номер уже зарегистрирован');
        return;
    }
    
    const newUser = {
        id: users.length + 1,
        name: name,
        username: username,
        phone: phone,
        avatar: 'https://via.placeholder.com/50',
        online: true
    };
    
    users.push(newUser);
    currentUser = newUser;
    // Предзагружаем звук
    preloadLoginSound();
    showMessenger();
}

// Показать мессенджер
function showMessenger() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('messengerScreen').classList.remove('hidden');
    
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userUsername').textContent = '@' + currentUser.username;
    document.getElementById('userAvatar').src = currentUser.avatar;
    
    // Проигрываем звук входа
    playLoginSound();
    
    setupMessengerListeners();
    renderChatList();
    updateLanguage();
}

// Проигрывание звука при входе
function playLoginSound() {
    try {
        if (loginAudio) {
            loginAudio.currentTime = 0;
            const playPromise = loginAudio.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log('🔊 Звук входа проигран успешно!');
                }).catch(err => {
                    console.log('⚠️ Браузер заблокировал автовоспроизведение:', err.message);
                    // Это нормально - браузеры блокируют автовоспроизведение для безопасности
                });
            }
        } else {
            // Если не предзагружен, создаем новый
            const audio = new Audio('on-screen-prompt.mp3');
            audio.volume = 0.5;
            audio.play().catch(err => {
                console.log('⚠️ Не удалось воспроизвести:', err.message);
            });
        }
    } catch (err) {
        console.log('❌ Ошибка:', err.message);
    }
}

// Обработчики мессенджера
function setupMessengerListeners() {
    document.getElementById('logoutBtn').onclick = logout;
    document.getElementById('searchInput').oninput = searchUsers;
    document.getElementById('addContactBtn').onclick = () => {
        document.getElementById('searchInput').focus();
    };
    document.getElementById('sendButton').onclick = sendMessage;
    document.getElementById('messageInput').onkeypress = (e) => {
        if (e.key === 'Enter') sendMessage();
    };
    
    // Новые обработчики
    document.getElementById('settingsBtn').onclick = openSettings;
    document.getElementById('closeSettings').onclick = closeSettings;
    document.getElementById('voiceCallBtn').onclick = startCall;
    document.getElementById('videoCallBtn').onclick = startCall;
    document.getElementById('endCallBtn').onclick = endCall;
    document.getElementById('attachBtn').onclick = openFileModal;
    document.getElementById('closeFile').onclick = closeFileModal;
    document.getElementById('voiceRecordBtn').onclick = recordVoice;
    
    // Настройки цвета
    document.querySelectorAll('.color-option').forEach(option => {
        option.onclick = () => changeAccentColor(option.dataset.color);
    });
    
    // Игры
    document.querySelectorAll('.game-btn').forEach(btn => {
        btn.onclick = () => startGame(btn.dataset.game);
    });
}

// Выход
function logout() {
    currentUser = null;
    currentChatId = null;
    chats = [];
    document.getElementById('messengerScreen').classList.add('hidden');
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('loginPhone').value = '';
    document.getElementById('registerName').value = '';
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPhone').value = '';
}

// Поиск пользователей
function searchUsers(e) {
    const query = e.target.value.trim().toLowerCase();
    const resultsDiv = document.getElementById('searchResults');
    
    if (!query) {
        resultsDiv.classList.add('hidden');
        return;
    }
    
    const results = users.filter(u => 
        u.id !== currentUser.id &&
        (u.username.toLowerCase().includes(query) || 
         u.phone.includes(query) ||
         u.name.toLowerCase().includes(query))
    );
    
    if (results.length === 0) {
        resultsDiv.innerHTML = `<p style="color: #666; text-align: center;">${translations[currentLanguage].userNotFound}</p>`;
        resultsDiv.classList.remove('hidden');
        return;
    }
    
    resultsDiv.innerHTML = '';
    results.forEach(user => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <img src="${user.avatar}" alt="${user.name}" class="avatar">
            <div>
                <div class="chat-name">${user.name}</div>
                <div class="chat-username">@${user.username}</div>
            </div>
        `;
        item.onclick = () => addContact(user);
        resultsDiv.appendChild(item);
    });
    
    resultsDiv.classList.remove('hidden');
}

// Добавить контакт
function addContact(user) {
    if (chats.find(c => c.userId === user.id)) {
        openChat(chats.find(c => c.userId === user.id).id);
        document.getElementById('searchInput').value = '';
        document.getElementById('searchResults').classList.add('hidden');
        return;
    }
    
    const newChat = {
        id: chats.length + 1,
        userId: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        lastMessage: '',
        messages: []
    };
    
    chats.push(newChat);
    renderChatList();
    openChat(newChat.id);
    
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').classList.add('hidden');
}

// Отрисовка списка чатов
function renderChatList() {
    const chatList = document.getElementById('chatList');
    
    if (chats.length === 0) {
        chatList.innerHTML = `<p class="empty-state" data-i18n="noChats">${translations[currentLanguage].noChats}</p>`;
        return;
    }
    
    chatList.innerHTML = '';
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (chat.id === currentChatId) {
            chatItem.classList.add('active');
        }
        chatItem.innerHTML = `
            <img src="${chat.avatar}" alt="${chat.name}" class="avatar">
            <div class="chat-info">
                <div class="chat-name">${chat.name}</div>
                <div class="chat-username">@${chat.username}</div>
                ${chat.lastMessage ? `<div class="last-message">${chat.lastMessage}</div>` : ''}
            </div>
        `;
        chatItem.onclick = () => openChat(chat.id);
        chatList.appendChild(chatItem);
    });
}

// Открыть чат
function openChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    
    document.getElementById('chatTitle').textContent = chat.name;
    renderMessages();
    renderChatList();
}

// Отрисовка сообщений
function renderMessages() {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.innerHTML = '';
    
    if (!currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    chat.messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.type}`;
        messageDiv.innerHTML = `
            <div>${msg.text}</div>
            <div class="message-time">${msg.time}</div>
        `;
        messageContainer.appendChild(messageDiv);
    });
    
    messageContainer.scrollTop = messageContainer.scrollHeight;
}

// Отправка сообщения
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    
    if (!text || !currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    chat.messages.push({
        text: text,
        type: 'outgoing',
        time: time
    });
    
    chat.lastMessage = text;
    
    input.value = '';
    renderMessages();
    renderChatList();
}

// Запуск
init();

// Настройки
function openSettings() {
    document.getElementById('settingsModal').classList.remove('hidden');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.add('hidden');
}

function changeAccentColor(color) {
    accentColor = color;
    document.documentElement.style.setProperty('--accent-color', color);
    
    const hoverColor = adjustColor(color, -20);
    document.documentElement.style.setProperty('--accent-hover', hoverColor);
    
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('active');
    });
    document.querySelector(`[data-color="${color}"]`).classList.add('active');
}

function adjustColor(color, amount) {
    const num = parseInt(color.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Звонки
function startCall() {
    if (!currentChatId) {
        alert('Выберите чат для звонка');
        return;
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    document.getElementById('callName').textContent = chat.name;
    document.getElementById('callAvatar').src = chat.avatar;
    document.getElementById('callStatus').textContent = 'Звоним...';
    document.getElementById('callModal').classList.remove('hidden');
    
    inCall = true;
    callSeconds = 0;
    
    setTimeout(() => {
        document.getElementById('callStatus').textContent = 'На связи';
        document.getElementById('callTimer').classList.remove('hidden');
        startCallTimer();
        document.getElementById('callGame').classList.remove('hidden');
    }, 2000);
}

function startCallTimer() {
    callTimer = setInterval(() => {
        callSeconds++;
        const mins = Math.floor(callSeconds / 60);
        const secs = callSeconds % 60;
        document.getElementById('callTimer').textContent = 
            `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }, 1000);
}

function endCall() {
    inCall = false;
    clearInterval(callTimer);
    callSeconds = 0;
    document.getElementById('callModal').classList.add('hidden');
    document.getElementById('callTimer').classList.add('hidden');
    document.getElementById('callGame').classList.add('hidden');
    document.getElementById('gameBoard').classList.add('hidden');
}

// Игры во время звонка
function startGame(gameType) {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.classList.remove('hidden');
    gameBoard.innerHTML = '';
    
    if (gameType === 'tictactoe') {
        createTicTacToe(gameBoard);
    } else if (gameType === 'chess') {
        createChess(gameBoard);
    }
}

function createTicTacToe(container) {
    const grid = document.createElement('div');
    grid.className = 'tictactoe-grid';
    let currentPlayer = 'X';
    let board = Array(9).fill('');
    
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('button');
        cell.className = 'tictactoe-cell';
        cell.onclick = () => {
            if (board[i] === '') {
                board[i] = currentPlayer;
                cell.textContent = currentPlayer;
                currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
                
                if (checkWinner(board)) {
                    setTimeout(() => {
                        alert(`${board[i]} победил!`);
                        container.innerHTML = '';
                        createTicTacToe(container);
                    }, 100);
                }
            }
        };
        grid.appendChild(cell);
    }
    
    container.appendChild(grid);
}

function checkWinner(board) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    
    for (let line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return true;
        }
    }
    return false;
}

function createChess(container) {
    const board = document.createElement('div');
    board.className = 'chess-board';
    
    const pieces = {
        0: ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'],
        1: Array(8).fill('♟'),
        6: Array(8).fill('♙'),
        7: ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖']
    };
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const cell = document.createElement('div');
            cell.className = `chess-cell ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            
            if (pieces[row]) {
                cell.textContent = pieces[row][col];
            }
            
            board.appendChild(cell);
        }
    }
    
    container.appendChild(board);
}

// Файлы
function openFileModal() {
    document.getElementById('fileModal').classList.remove('hidden');
    
    const fileInput = document.getElementById('fileInput');
    const sendFileBtn = document.getElementById('sendFileBtn');
    
    fileInput.onchange = (e) => {
        const preview = document.getElementById('filePreview');
        preview.innerHTML = '';
        
        Array.from(e.target.files).forEach(file => {
            const item = document.createElement('div');
            item.className = 'file-preview-item';
            
            let icon = '📄';
            if (file.type.startsWith('image/')) icon = '🖼️';
            else if (file.type.startsWith('video/')) icon = '🎥';
            else if (file.type.startsWith('audio/')) icon = '🎵';
            
            item.innerHTML = `${icon} ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            preview.appendChild(item);
        });
    };
    
    sendFileBtn.onclick = () => {
        const files = fileInput.files;
        if (files.length > 0) {
            Array.from(files).forEach(file => sendFile(file));
            closeFileModal();
            fileInput.value = '';
            document.getElementById('filePreview').innerHTML = '';
        }
    };
}

function closeFileModal() {
    document.getElementById('fileModal').classList.add('hidden');
}

// Голосовые сообщения
function recordVoice() {
    if (!currentChatId) return;
    
    alert('🎤 Запись голосового сообщения... (демо)');
    
    setTimeout(() => {
        const chat = chats.find(c => c.id === currentChatId);
        const now = new Date();
        const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        chat.messages.push({
            text: '🎤 Голосовое сообщение (0:05)',
            type: 'outgoing',
            time: time,
            isVoice: true
        });
        
        chat.lastMessage = '🎤 Голосовое сообщение';
        renderMessages();
        renderChatList();
    }, 1000);
}
