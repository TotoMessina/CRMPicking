import { useChat } from '../hooks/useChat';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { TaskModal } from '../components/chat/TaskModal';

export default function Chat() {
    const {
        user, usuarios, selectedUser, setSelectedUser, mensajes, newMessage, setNewMessage,
        loadingUsers, loadingMessages, isTaskModalOpen, setIsTaskModalOpen, taskForm, setTaskForm,
        sendingTask, hasMoreMessages, isMobile, messagesEndRef, topRef, scrollContainerRef,
        handleSend, handleSendTask, loadMoreMessages,
        selectedContext, setSelectedContext
    } = useChat();

    const openTaskModal = () => {
        setTaskForm({
            titulo: '',
            descripcion: '',
            fecha_vencimiento: '',
            asignado_a: selectedUser ? [selectedUser.email] : []
        });
        setIsTaskModalOpen(true);
    };

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
            margin: isMobile ? '-80px 0 0 0' : '0 auto', // Offset the AppShell mobile header margin if necessary, but we'll use fixed for ChatArea
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
                user={user} 
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
