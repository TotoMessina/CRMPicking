import { useChat } from '../hooks/useChat';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { TaskModal } from '../components/chat/TaskModal';
import { useAuth } from '../contexts/AuthContext';

/**
 * Chat Page
 */
export default function Chat() {
    const { user, userName, empresaActiva, role, isDemoMode } = useAuth();
    const roleName = role || '';
    const {
        usuarios, selectedUser, setSelectedUser, mensajes, newMessage, setNewMessage,
        loadingUsers, loadingMessages, isTaskModalOpen, setIsTaskModalOpen, taskForm, setTaskForm,
        sendingTask, hasMoreMessages, isMobile, messagesEndRef, topRef, scrollContainerRef,
        handleSend, handleSendTask, loadMoreMessages,
        selectedContext, setSelectedContext
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

    if (!user) return <div className="p-8 text-center muted">Cargando sesión de chat...</div>;

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
        </div>
    );
}
