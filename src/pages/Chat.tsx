import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../hooks/useChat';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { TaskModal } from '../components/chat/TaskModal';
import { useAuth } from '../contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Chat Page
 */
export default function Chat() {
    const { t } = useTranslation();
    const { user, userName, empresaActiva, role, isDemoMode } = useAuth();
    const [viewerImage, setViewerImage] = useState<string | null>(null);
    const roleName = role || '';
    const {
        usuarios, selectedUser, setSelectedUser, mensajes, newMessage, setNewMessage,
        loadingUsers, loadingMessages, isTaskModalOpen, setIsTaskModalOpen, taskForm, setTaskForm,
        sendingTask, hasMoreMessages, isMobile, messagesEndRef, topRef, scrollContainerRef,
        handleSend, handleSendTask, loadMoreMessages,
        selectedContext, setSelectedContext, smartReplies
    } = useChat();

    const canEdit = !isDemoMode && (roleName === 'admin' || roleName === 'super-admin' || roleName === 'creador');

    const openTaskModal = () => {
        setTaskForm({
            titulo: '',
            descripcion: '',
            fecha_vencimiento: '',
            asignado_a: selectedUser ? [selectedUser.email] : []
        });
        setIsTaskModalOpen(true);
    };

    if (!user) return <div className="p-8 text-center muted">{t('chat.loading_session', { defaultValue: 'Cargando sesión de chat...' })}</div>;

    return (
        <div style={{
            display: 'flex', 
            height: isMobile ? '100dvh' : 'calc(100vh - 40px)', 
            minHeight: 0, 
            width: '100%', 
            overflow: 'hidden',
            padding: isMobile ? 0 : '20px', 
            gap: isMobile ? 0 : '20px', 
            boxSizing: 'border-box',
            maxWidth: '1400px', 
            margin: isMobile ? '-80px 0 0 0' : '0 auto', 
            position: isMobile ? 'relative' : 'static',
            zIndex: isMobile ? 1000 : 'auto'
        }}>
            <ChatSidebar 
                usuarios={usuarios} 
                selectedUser={selectedUser} 
                setSelectedUser={setSelectedUser} 
                loadingUsers={loadingUsers} 
                isMobile={isMobile} 
                openViewer={(url) => setViewerImage(url)}
            />

            <ChatArea 
                selectedUser={selectedUser} 
                setSelectedUser={setSelectedUser} 
                mensajes={mensajes} 
                user={user as any} 
                newMessage={newMessage} 
                setNewMessage={setNewMessage} 
                handleSend={handleSend} 
                openTaskModal={openTaskModal}
                loadingMessages={loadingMessages} 
                hasMoreMessages={hasMoreMessages} 
                isMobile={isMobile} 
                scrollContainerRef={scrollContainerRef} 
                topRef={topRef} 
                messagesEndRef={messagesEndRef} 
                loadMoreMessages={loadMoreMessages}
                selectedContext={selectedContext}
                setSelectedContext={setSelectedContext}
                smartReplies={smartReplies}
                openViewer={(url) => setViewerImage(url)}
            />

            <TaskModal 
                isTaskModalOpen={isTaskModalOpen} 
                setIsTaskModalOpen={setIsTaskModalOpen} 
                taskForm={taskForm} 
                setTaskForm={setTaskForm} 
                usuarios={usuarios} 
                selectedUser={selectedUser} 
                sendingTask={sendingTask} 
                handleSendTask={handleSendTask} 
            />

            <AnimatePresence>
                {viewerImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setViewerImage(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,0.9)',
                            backdropFilter: 'blur(10px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 3000,
                            padding: '20px',
                            cursor: 'zoom-out'
                        }}
                    >
                        <motion.button 
                            className="icon-btn" 
                            onClick={() => setViewerImage(null)}
                            style={{ position: 'absolute', top: '20px', right: '20px', color: '#fff', background: 'rgba(255,255,255,0.1)' }}
                        >
                            <X size={24} />
                        </motion.button>
                        <motion.img 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            src={viewerImage} 
                            alt="Profile" 
                            style={{ 
                                maxWidth: '100%', 
                                maxHeight: '90vh', 
                                borderRadius: '24px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                pointerEvents: 'auto'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
