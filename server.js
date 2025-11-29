const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zingram_secret_key_2024';
const CLIENT_URL = process.env.CLIENT_URL || '*';

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// База данных в памяти (для продакшена используй MongoDB/PostgreSQL)
let users = [];
let messages = [];
let onlineUsers = new Map();

// Регистрация
app.post('/api/register', async (req, res) => {
    try {
        const { name, username, phone, password } = req.body;
        
        if (users.find(u => u.username === username)) {
            return res.status(400).json({ error: 'Username уже занят' });
        }
        
        if (users.find(u => u.phone === phone)) {
            return res.status(400).json({ error: 'Номер уже зарегистрирован' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = {
            id: Date.now().toString(),
            name,
            username,
            phone,
            password: hashedPassword,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
            createdAt: new Date()
        };
        
        users.push(user);
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                phone: user.phone,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка регистрации' });
    }
});

// Вход
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        
        const user = users.find(u => u.phone === phone);
        
        if (!user) {
            return res.status(400).json({ error: 'Пользователь не найден' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(400).json({ error: 'Неверный пароль' });
        }
        
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);
        
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                phone: user.phone,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка входа' });
    }
});

// Поиск пользователей
app.get('/api/users/search', (req, res) => {
    const { query } = req.query;
    
    const results = users
        .filter(u => 
            u.username.toLowerCase().includes(query.toLowerCase()) ||
            u.phone.includes(query) ||
            u.name.toLowerCase().includes(query.toLowerCase())
        )
        .map(u => ({
            id: u.id,
            name: u.name,
            username: u.username,
            phone: u.phone,
            avatar: u.avatar,
            online: onlineUsers.has(u.id)
        }));
    
    res.json(results);
});

// WebSocket соединения
io.on('connection', (socket) => {
    console.log('🟢 Пользователь подключился:', socket.id);
    
    // Авторизация через токен
    socket.on('authenticate', (token) => {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.userId = decoded.userId;
            onlineUsers.set(decoded.userId, socket.id);
            
            // Уведомляем всех об онлайн статусе
            io.emit('user_online', { userId: decoded.userId });
            
            console.log('✅ Пользователь авторизован:', decoded.userId);
        } catch (error) {
            console.log('❌ Ошибка авторизации');
        }
    });
    
    // Отправка сообщения
    socket.on('send_message', (data) => {
        const message = {
            id: Date.now().toString(),
            from: socket.userId,
            to: data.to,
            text: data.text,
            type: data.type || 'text',
            timestamp: new Date(),
            read: false
        };
        
        messages.push(message);
        
        // Отправляем получателю
        const recipientSocketId = onlineUsers.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('new_message', message);
        }
        
        // Подтверждаем отправителю
        socket.emit('message_sent', message);
    });
    
    // Голосовой/видео звонок
    socket.on('call_user', (data) => {
        const recipientSocketId = onlineUsers.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('incoming_call', {
                from: socket.userId,
                callType: data.callType,
                offer: data.offer
            });
        }
    });
    
    socket.on('call_answer', (data) => {
        const callerSocketId = onlineUsers.get(data.to);
        if (callerSocketId) {
            io.to(callerSocketId).emit('call_answered', {
                from: socket.userId,
                answer: data.answer
            });
        }
    });
    
    socket.on('ice_candidate', (data) => {
        const recipientSocketId = onlineUsers.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('ice_candidate', {
                from: socket.userId,
                candidate: data.candidate
            });
        }
    });
    
    socket.on('end_call', (data) => {
        const recipientSocketId = onlineUsers.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call_ended', {
                from: socket.userId
            });
        }
    });
    
    // Печатает...
    socket.on('typing', (data) => {
        const recipientSocketId = onlineUsers.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('user_typing', {
                from: socket.userId
            });
        }
    });
    
    // Отключение
    socket.on('disconnect', () => {
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            io.emit('user_offline', { userId: socket.userId });
            console.log('🔴 Пользователь отключился:', socket.userId);
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Zingram сервер запущен на порту ${PORT}`);
    console.log(`📱 Открой http://localhost:${PORT} в браузере`);
});
