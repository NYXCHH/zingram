// Дополнительные фишки Zingram

// Режим треша - самоуничтожающиеся сообщения
function enableTrashMode(chatId, duration = 24) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        chat.trashMode = true;
        chat.trashDuration = duration;
        alert(`🔥 Режим треша активирован! Сообщения исчезнут через ${duration}ч`);
    }
}

// Кастомные эмодзи и стикеры
const customEmojis = {
    ':fire:': '🔥',
    ':skull:': '💀',
    ':100:': '💯',
    ':rocket:': '🚀',
    ':party:': '🎉'
};

function replaceCustomEmojis(text) {
    let result = text;
    for (let [code, emoji] of Object.entries(customEmojis)) {
        result = result.replace(new RegExp(code, 'g'), emoji);
    }
    return result;
}

// Голосовые статусы
let voiceStatus = null;

function setVoiceStatus(audioBlob) {
    voiceStatus = audioBlob;
    alert('🎤 Голосовой статус установлен!');
}

// Реакции на сообщения
function addReaction(messageId, reaction) {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        const message = chat.messages.find(m => m.id === messageId);
        if (message) {
            if (!message.reactions) message.reactions = [];
            message.reactions.push(reaction);
            renderMessages();
        }
    }
}

// Ускоренное прослушивание голосовых
function playVoiceSpeed(speed = 1.5) {
    // speed: 1.0 (нормально), 1.5 (быстрее), 2.0 (очень быстро)
    console.log(`Воспроизведение со скоростью ${speed}x`);
}

// Инкогнито-чат
function createIncognitoChat(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const secretCode = Math.random().toString(36).substring(7);
    const incognitoChat = {
        id: chats.length + 1,
        userId: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        lastMessage: '',
        messages: [],
        incognito: true,
        secretCode: secretCode
    };
    
    chats.push(incognitoChat);
    alert(`🕵️ Инкогнито-чат создан! Код доступа: ${secretCode}`);
    return incognitoChat;
}

// Редактирование сообщений
function editMessage(messageId, newText) {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        const message = chat.messages.find(m => m.id === messageId);
        if (message && message.type === 'outgoing') {
            message.text = newText;
            message.edited = true;
            renderMessages();
        }
    }
}

// Удаление сообщений для всех
function deleteMessageForAll(messageId) {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        const index = chat.messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            chat.messages.splice(index, 1);
            renderMessages();
        }
    }
}

// Шифрование сообщений (простое демо)
function encryptMessage(text) {
    return btoa(text); // Base64 кодирование для демо
}

function decryptMessage(encrypted) {
    try {
        return atob(encrypted);
    } catch {
        return encrypted;
    }
}

// Групповые чаты
function createGroupChat(name, userIds) {
    const groupChat = {
        id: chats.length + 1,
        name: name,
        isGroup: true,
        members: userIds,
        avatar: 'https://via.placeholder.com/50',
        lastMessage: '',
        messages: []
    };
    
    chats.push(groupChat);
    renderChatList();
    alert(`👥 Группа "${name}" создана!`);
    return groupChat;
}

// Статус онлайн/офлайн
function updateOnlineStatus(userId, isOnline) {
    const user = users.find(u => u.id === userId);
    if (user) {
        user.online = isOnline;
        renderChatList();
    }
}

// Отправка файлов
function sendFile(file) {
    if (!currentChatId) return;
    
    const chat = chats.find(c => c.id === currentChatId);
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    let fileIcon = '📄';
    if (file.type.startsWith('image/')) fileIcon = '🖼️';
    else if (file.type.startsWith('video/')) fileIcon = '🎥';
    else if (file.type.startsWith('audio/')) fileIcon = '🎵';
    
    chat.messages.push({
        text: `${fileIcon} ${file.name}`,
        type: 'outgoing',
        time: time,
        isFile: true,
        fileType: file.type,
        fileName: file.name
    });
    
    chat.lastMessage = `${fileIcon} ${file.name}`;
    renderMessages();
    renderChatList();
}

// Визуализатор звука для голосовых
function createWaveform(container) {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 40;
    const ctx = canvas.getContext('2d');
    
    // Рисуем волну
    ctx.fillStyle = accentColor;
    for (let i = 0; i < 50; i++) {
        const height = Math.random() * 30 + 5;
        ctx.fillRect(i * 4, 20 - height / 2, 2, height);
    }
    
    container.appendChild(canvas);
}

// Экспорт функций
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        enableTrashMode,
        replaceCustomEmojis,
        setVoiceStatus,
        addReaction,
        playVoiceSpeed,
        createIncognitoChat,
        editMessage,
        deleteMessageForAll,
        encryptMessage,
        decryptMessage,
        createGroupChat,
        updateOnlineStatus,
        sendFile,
        createWaveform
    };
}
