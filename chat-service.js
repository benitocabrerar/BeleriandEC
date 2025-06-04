// Chat Service - Sistema de Chat Integrado
// Comunicación en tiempo real con huéspedes

class ChatService {
    constructor() {
        this.currentUserId = null;
        this.currentUserType = null; // 'admin' or 'guest'
        this.activeConversations = new Map();
        this.messageListeners = new Map();
        this.notificationPermission = 'default';
        
        this.init();
    }

    async init() {
        await this.requestNotificationPermission();
        this.setupEventListeners();
    }

    // Request notification permission
    async requestNotificationPermission() {
        if ('Notification' in window) {
            this.notificationPermission = await Notification.requestPermission();
        }
    }

    // Initialize chat for a user
    initializeChat(userId, userType, userInfo = {}) {
        this.currentUserId = userId;
        this.currentUserType = userType;
        this.userInfo = userInfo;

        // Setup presence
        this.updatePresence(true);

        // Setup disconnect handler
        window.addEventListener('beforeunload', () => {
            this.updatePresence(false);
        });
    }

    // Update user presence
    async updatePresence(isOnline) {
        if (!this.currentUserId || !window.dbService) return;

        try {
            await window.dbService.db.ref(`presence/${this.currentUserId}`).set({
                online: isOnline,
                lastSeen: new Date().toISOString(),
                userType: this.currentUserType,
                userInfo: this.userInfo
            });
        } catch (error) {
            console.error('Error updating presence:', error);
        }
    }

    // Create or get conversation
    async getOrCreateConversation(participantId, participantInfo = {}) {
        if (!this.currentUserId || !window.dbService) {
            throw new Error('Chat not initialized');
        }

        try {
            // Create conversation ID (consistent ordering)
            const conversationId = [this.currentUserId, participantId].sort().join('_');
            
            // Check if conversation exists
            const conversationRef = window.dbService.db.ref(`conversations/${conversationId}`);
            const snapshot = await conversationRef.once('value');
            
            if (!snapshot.exists()) {
                // Create new conversation
                const conversationData = {
                    id: conversationId,
                    participants: {
                        [this.currentUserId]: {
                            id: this.currentUserId,
                            type: this.currentUserType,
                            info: this.userInfo,
                            joinedAt: new Date().toISOString()
                        },
                        [participantId]: {
                            id: participantId,
                            type: this.currentUserType === 'admin' ? 'guest' : 'admin',
                            info: participantInfo,
                            joinedAt: new Date().toISOString()
                        }
                    },
                    createdAt: new Date().toISOString(),
                    lastActivity: new Date().toISOString(),
                    status: 'active'
                };
                
                await conversationRef.set(conversationData);
            }

            return conversationId;
        } catch (error) {
            console.error('Error creating conversation:', error);
            throw error;
        }
    }

    // Send message
    async sendMessage(conversationId, messageText, attachments = []) {
        if (!this.currentUserId || !window.dbService) {
            throw new Error('Chat not initialized');
        }

        try {
            const message = {
                id: Date.now().toString(),
                conversationId,
                senderId: this.currentUserId,
                senderType: this.currentUserType,
                text: messageText,
                attachments,
                timestamp: new Date().toISOString(),
                read: false,
                edited: false
            };

            // Add message to database
            const messagesRef = window.dbService.db.ref(`conversations/${conversationId}/messages`);
            const newMessageRef = messagesRef.push();
            message.id = newMessageRef.key;
            
            await newMessageRef.set(message);

            // Update conversation last activity
            await window.dbService.db.ref(`conversations/${conversationId}`).update({
                lastActivity: new Date().toISOString(),
                lastMessage: {
                    text: messageText,
                    senderId: this.currentUserId,
                    timestamp: message.timestamp
                }
            });

            // Send notification to other participants
            await this.sendNotificationToParticipants(conversationId, message);

            // Log analytics
            if (window.dbService.logEvent) {
                await window.dbService.logEvent('message_sent', {
                    conversationId,
                    senderType: this.currentUserType,
                    hasAttachments: attachments.length > 0
                });
            }

            return { success: true, message };
        } catch (error) {
            console.error('Error sending message:', error);
            return { success: false, error: error.message };
        }
    }

    // Listen to messages in a conversation
    listenToMessages(conversationId, callback) {
        if (!window.dbService) return;

        const messagesRef = window.dbService.db.ref(`conversations/${conversationId}/messages`);
        
        const listener = messagesRef.on('child_added', (snapshot) => {
            const message = {
                id: snapshot.key,
                ...snapshot.val()
            };
            callback(message);

            // Mark as read if not sent by current user
            if (message.senderId !== this.currentUserId && !message.read) {
                this.markMessageAsRead(conversationId, message.id);
            }

            // Show notification
            if (message.senderId !== this.currentUserId) {
                this.showNotification(message);
            }
        });

        // Store listener for cleanup
        this.messageListeners.set(conversationId, listener);

        return () => {
            messagesRef.off('child_added', listener);
            this.messageListeners.delete(conversationId);
        };
    }

    // Mark message as read
    async markMessageAsRead(conversationId, messageId) {
        if (!window.dbService) return;

        try {
            await window.dbService.db.ref(`conversations/${conversationId}/messages/${messageId}`).update({
                read: true,
                readAt: new Date().toISOString(),
                readBy: this.currentUserId
            });
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    // Get conversation history
    async getConversationHistory(conversationId, limit = 50) {
        if (!window.dbService) {
            throw new Error('Database service not available');
        }

        try {
            const messagesRef = window.dbService.db.ref(`conversations/${conversationId}/messages`)
                .orderByChild('timestamp')
                .limitToLast(limit);
            
            const snapshot = await messagesRef.once('value');
            const messages = [];

            snapshot.forEach((child) => {
                messages.push({
                    id: child.key,
                    ...child.val()
                });
            });

            return { success: true, messages };
        } catch (error) {
            console.error('Error getting conversation history:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user conversations
    async getUserConversations() {
        if (!this.currentUserId || !window.dbService) {
            throw new Error('Chat not initialized');
        }

        try {
            const conversationsRef = window.dbService.db.ref('conversations');
            const snapshot = await conversationsRef.once('value');
            const conversations = [];

            snapshot.forEach((child) => {
                const conversation = child.val();
                if (conversation.participants && conversation.participants[this.currentUserId]) {
                    conversations.push({
                        id: child.key,
                        ...conversation
                    });
                }
            });

            // Sort by last activity
            conversations.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

            return { success: true, conversations };
        } catch (error) {
            console.error('Error getting user conversations:', error);
            return { success: false, error: error.message };
        }
    }

    // Upload attachment
    async uploadAttachment(file, conversationId) {
        if (!window.dbService) {
            throw new Error('Database service not available');
        }

        try {
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `chat-attachments/${conversationId}/${fileName}`;
            
            const uploadResult = await window.dbService.uploadFile(file, filePath);
            
            if (uploadResult.success) {
                return {
                    success: true,
                    attachment: {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        url: uploadResult.url,
                        uploadedAt: new Date().toISOString()
                    }
                };
            }
            
            return uploadResult;
        } catch (error) {
            console.error('Error uploading attachment:', error);
            return { success: false, error: error.message };
        }
    }

    // Send notification to participants
    async sendNotificationToParticipants(conversationId, message) {
        if (!window.dbService) return;

        try {
            // Get conversation participants
            const conversationRef = window.dbService.db.ref(`conversations/${conversationId}`);
            const snapshot = await conversationRef.once('value');
            const conversation = snapshot.val();

            if (!conversation || !conversation.participants) return;

            // Send notification to all participants except sender
            Object.values(conversation.participants).forEach(participant => {
                if (participant.id !== this.currentUserId) {
                    this.sendPushNotification(participant, message);
                }
            });
        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    }

    // Send push notification
    sendPushNotification(recipient, message) {
        if (this.notificationPermission !== 'granted') return;

        try {
            const notification = new Notification(`💬 Mensaje de ${this.userInfo.name || 'Usuario'}`, {
                body: message.text,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: `chat-${message.conversationId}`,
                requireInteraction: false,
                silent: false
            });

            notification.onclick = () => {
                window.focus();
                // Navigate to chat
                this.openChat(message.conversationId);
                notification.close();
            };

            // Auto close after 5 seconds
            setTimeout(() => notification.close(), 5000);
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    // Show in-app notification
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'chat-notification';
        notification.innerHTML = `
            <div class="chat-notification-content">
                <div class="chat-notification-header">
                    <span class="chat-notification-sender">💬 ${this.getSenderName(message)}</span>
                    <button class="chat-notification-close">&times;</button>
                </div>
                <div class="chat-notification-message">${message.text}</div>
            </div>
        `;

        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            padding: 15px;
            max-width: 300px;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            cursor: pointer;
        `;

        // Add to page
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Click to open chat
        notification.addEventListener('click', () => {
            this.openChat(message.conversationId);
            this.removeNotification(notification);
        });

        // Close button
        const closeBtn = notification.querySelector('.chat-notification-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeNotification(notification);
        });

        // Auto remove after 5 seconds
        setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);
    }

    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }

    getSenderName(message) {
        return message.senderType === 'admin' ? 'Villa Vista al Mar' : 'Huésped';
    }

    // Open chat interface
    openChat(conversationId) {
        // This would open the chat UI
        // Implementation depends on your UI framework
        console.log('Opening chat:', conversationId);
        
        // For now, just focus on chat input if it exists
        const chatInput = document.querySelector(`#chat-input-${conversationId}`);
        if (chatInput) {
            chatInput.focus();
        }
    }

    // Typing indicators
    startTyping(conversationId) {
        if (!window.dbService) return;

        const typingRef = window.dbService.db.ref(`conversations/${conversationId}/typing/${this.currentUserId}`);
        typingRef.set({
            userId: this.currentUserId,
            userName: this.userInfo.name || 'Usuario',
            timestamp: new Date().toISOString()
        });

        // Remove typing indicator after 3 seconds
        this.typingTimeout = setTimeout(() => {
            this.stopTyping(conversationId);
        }, 3000);
    }

    stopTyping(conversationId) {
        if (!window.dbService) return;

        if (this.typingTimeout) {
            clearTimeout(this.typingTimeout);
        }

        const typingRef = window.dbService.db.ref(`conversations/${conversationId}/typing/${this.currentUserId}`);
        typingRef.remove();
    }

    // Listen to typing indicators
    listenToTyping(conversationId, callback) {
        if (!window.dbService) return;

        const typingRef = window.dbService.db.ref(`conversations/${conversationId}/typing`);
        
        const listener = typingRef.on('value', (snapshot) => {
            const typingUsers = [];
            
            snapshot.forEach((child) => {
                const typing = child.val();
                if (typing.userId !== this.currentUserId) {
                    typingUsers.push(typing);
                }
            });

            callback(typingUsers);
        });

        return () => typingRef.off('value', listener);
    }

    // Setup event listeners
    setupEventListeners() {
        // Listen for window focus to mark messages as read
        window.addEventListener('focus', () => {
            this.markActiveConversationAsRead();
        });

        // Setup service worker for push notifications
        if ('serviceWorker' in navigator) {
            this.setupServiceWorker();
        }
    }

    // Setup service worker for push notifications
    async setupServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    markActiveConversationAsRead() {
        // Mark messages in active conversation as read
        // Implementation depends on your UI state management
    }

    // Clean up
    destroy() {
        // Remove all listeners
        this.messageListeners.forEach((listener, conversationId) => {
            if (window.dbService) {
                const messagesRef = window.dbService.db.ref(`conversations/${conversationId}/messages`);
                messagesRef.off('child_added', listener);
            }
        });

        this.messageListeners.clear();
        this.activeConversations.clear();
        
        // Update presence
        this.updatePresence(false);
    }
}

// Create global instance
window.chatService = new ChatService();

// Export for module use
export { ChatService };