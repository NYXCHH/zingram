// Подключение к серверу
const API_URL = window.location.origin; // Автоматически определяет URL
let socket = null;
let token = localStorage.getItem('zingram_token');
let peerConnection = null;
let localStream = null;

// Инициализация WebSocket
function initSocket() {
    socket = io(API_URL);
    
    socket.on('connect', () => {
        console.log('✅ Подключено к серверу');
        if (token) {
            socket.emit('authenticate', token);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Отключено от сервера');
    });
    
    // Новое сообщение
    socket.on('new_message', (message) => {
        handleNewMessage(message);
    });
    
    // Пользователь онлайн
    socket.on('user_online', (data) => {
        updateUserStatus(data.userId, true);
    });
    
    // Пользователь офлайн
    socket.on('user_offline', (data) => {
        updateUserStatus(data.userId, false);
    });
    
    // Входящий звонок
    socket.on('incoming_call', async (data) => {
        await handleIncomingCall(data);
    });
    
    // Звонок принят
    socket.on('call_answered', async (data) => {
        await handleCallAnswered(data);
    });
    
    // ICE кандидат
    socket.on('ice_candidate', async (data) => {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    });
    
    // Звонок завершен
    socket.on('call_ended', () => {
        endCall();
    });
    
    // Печатает
    socket.on('user_typing', (data) => {
        showTypingIndicator(data.from);
    });
}

// Регистрация
async function registerUser(name, username, phone, password) {
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, phone, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            localStorage.setItem('zingram_token', token);
            currentUser = data.user;
            initSocket();
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        return { success: false, error: 'Ошибка подключения к серверу' };
    }
}

// Вход
async function loginUser(phone, password) {
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            token = data.token;
            localStorage.setItem('zingram_token', token);
            currentUser = data.user;
            initSocket();
            return { success: true, user: data.user };
        } else {
            return { success: false, error: data.error };
        }
    } catch (error) {
        return { success: false, error: 'Ошибка подключения к серверу' };
    }
}

// Поиск пользователей
async function searchUsers(query) {
    try {
        const response = await fetch(`${API_URL}/api/users/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка поиска:', error);
        return [];
    }
}

// Отправка сообщения
function sendMessageToServer(to, text, type = 'text') {
    if (socket && socket.connected) {
        socket.emit('send_message', { to, text, type });
    }
}

// Обработка нового сообщения
function handleNewMessage(message) {
    const chat = chats.find(c => c.userId === message.from);
    if (chat) {
        const time = new Date(message.timestamp);
        chat.messages.push({
            id: message.id,
            text: message.text,
            type: 'incoming',
            time: `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`
        });
        chat.lastMessage = message.text;
        
        if (currentChatId === chat.id) {
            renderMessages();
        }
        renderChatList();
        
        // Звук уведомления
        playNotificationSound();
    }
}

// WebRTC - Звонки
async function startRealCall(userId, isVideo = false) {
    try {
        // Получаем доступ к медиа
        localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo
        });
        
        // Создаем peer connection
        peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });
        
        // Добавляем локальный стрим
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Обработка ICE кандидатов
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice_candidate', {
                    to: userId,
                    candidate: event.candidate
                });
            }
        };
        
        // Получение удаленного стрима
        peerConnection.ontrack = (event) => {
            const remoteAudio = document.getElementById('remoteAudio');
            if (remoteAudio) {
                remoteAudio.srcObject = event.streams[0];
            }
        };
        
        // Создаем offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        // Отправляем offer
        socket.emit('call_user', {
            to: userId,
            callType: isVideo ? 'video' : 'audio',
            offer: offer
        });
        
        return true;
    } catch (error) {
        console.error('Ошибка звонка:', error);
        alert('Не удалось получить доступ к микрофону/камере');
        return false;
    }
}

// Обработка входящего звонка
async function handleIncomingCall(data) {
    const user = users.find(u => u.id === data.from);
    const userName = user ? user.name : 'Неизвестный';
    
    const accept = confirm(`Входящий ${data.callType === 'video' ? 'видео' : 'голосовой'} звонок от ${userName}. Принять?`);
    
    if (accept) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: data.callType === 'video'
            });
            
            peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });
            
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
            
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice_candidate', {
                        to: data.from,
                        candidate: event.candidate
                    });
                }
            };
            
            peerConnection.ontrack = (event) => {
                const remoteAudio = document.getElementById('remoteAudio');
                if (remoteAudio) {
                    remoteAudio.srcObject = event.streams[0];
                }
            };
            
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            socket.emit('call_answer', {
                to: data.from,
                answer: answer
            });
            
            // Показываем интерфейс звонка
            showCallUI(data.from, data.callType);
        } catch (error) {
            console.error('Ошибка принятия звонка:', error);
        }
    } else {
        socket.emit('end_call', { to: data.from });
    }
}

// Обработка принятого звонка
async function handleCallAnswered(data) {
    if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
}

// Завершение звонка
function endRealCall() {
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    if (socket && currentChatId) {
        const chat = chats.find(c => c.id === currentChatId);
        if (chat) {
            socket.emit('end_call', { to: chat.userId });
        }
    }
}

// Звук уведомления
function playNotificationSound() {
    const audio = new Audio('notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {});
}

// Инициализация при загрузке
if (token) {
    initSocket();
}
