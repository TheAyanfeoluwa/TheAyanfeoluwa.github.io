import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Hash, 
  Send, 
  Users, 
  Menu, 
  X, 
  LogOut, 
  Smile,
  Settings,
  Bell,
  Search,
  MoreVertical,
  Circle,
  MessageCircle,
  ArrowLeft,
  Phone,
  Video,
  UserPlus
} from 'lucide-react';

// Mock data for channels
const mockChannels = [
  { id: 'general', name: 'general', description: 'General discussion' },
  { id: 'study-help', name: 'study-help', description: 'Get help with your studies' },
  { id: 'announcements', name: 'announcements', description: 'Important updates' },
  { id: 'random', name: 'random', description: 'Random conversations' },
  { id: 'projects', name: 'projects', description: 'Share your projects' },
];

// Mock WebSocket class for demo purposes
class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 100);
  }

  send(data) {
    // Echo back the message with a slight delay to simulate server response
    setTimeout(() => {
      if (this.onmessage) {
        const parsedData = JSON.parse(data);
        if (parsedData.type === 'message') {
          // Simulate receiving the sent message
          this.onmessage({
            data: JSON.stringify({
              type: 'message',
              data: {
                id: Date.now(),
                ...parsedData.data,
                timestamp: new Date().toISOString()
              }
            })
          });
        }
      }
    }, 100);
  }

  close() {
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }
}

const Community = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [selectedChannel, setSelectedChannel] = useState('general');
  const [messages, setMessages] = useState({});
  const [directMessages, setDirectMessages] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [activeDirectMessage, setActiveDirectMessage] = useState(null);
  const [viewMode, setViewMode] = useState('channel'); // 'channel' or 'dm'
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const inputRef = useRef(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Mock online users
  useEffect(() => {
    const mockUsers = [
      { id: 1, username: 'alice_dev', status: 'online', avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400' },
      { id: 2, username: 'bob_student', status: 'online', avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400' },
      { id: 3, username: 'charlie_mentor', status: 'away', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400' },
      { id: 4, username: 'diana_researcher', status: 'online', avatar: 'https://images.pexels.com/photos/1181424/pexels-photo-1181424.jpeg?auto=compress&cs=tinysrgb&w=400' },
      { id: 5, username: 'eve_designer', status: 'online', avatar: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400' },
      { id: 6, username: 'frank_coder', status: 'away', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400' },
    ];
    setOnlineUsers(mockUsers);
  }, []);

  // Initialize mock messages
  useEffect(() => {
    const mockMessages = {
      general: [
        {
          id: 1,
          user_id: 1,
          username: 'alice_dev',
          content: 'Hey everyone! Welcome to the community chat 👋',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=400'
        },
        {
          id: 2,
          user_id: 2,
          username: 'bob_student',
          content: 'Thanks Alice! Excited to be here and connect with fellow learners.',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          avatar: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400'
        },
      ],
      'study-help': [
        {
          id: 3,
          user_id: 3,
          username: 'charlie_mentor',
          content: 'Need help with any concepts? Feel free to ask here!',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400'
        },
      ],
      announcements: [],
      random: [],
      projects: [],
    };
    setMessages(mockMessages);
    setIsLoading(false);
  }, []);

  // WebSocket connection simulation
  useEffect(() => {
    if (!user) return;

    const ws = new MockWebSocket(`ws://localhost:8000/ws/community/${selectedChannel}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to WebSocket');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        if (viewMode === 'channel') {
          setMessages(prev => ({
            ...prev,
            [selectedChannel]: [...(prev[selectedChannel] || []), data.data]
          }));
        } else if (viewMode === 'dm' && activeDirectMessage) {
          const dmKey = getDMKey(user.id, activeDirectMessage.id);
          setDirectMessages(prev => ({
            ...prev,
            [dmKey]: [...(prev[dmKey] || []), data.data]
          }));
        }
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [selectedChannel, user, viewMode, activeDirectMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, directMessages, selectedChannel, activeDirectMessage]);

  const getDMKey = (userId1, userId2) => {
    return [userId1, userId2].sort().join('-');
  };

  const handleUserClick = (messageUser) => {
    // Don't allow DM to yourself
    if (messageUser.user_id === user.id) return;
    
    // Find the user in online users or create a user object
    let targetUser = onlineUsers.find(u => u.id === messageUser.user_id);
    if (!targetUser) {
      targetUser = {
        id: messageUser.user_id,
        username: messageUser.username,
        avatar: messageUser.avatar,
        status: 'offline'
      };
    }
    
    startDirectMessage(targetUser);
  };

  const startDirectMessage = (targetUser) => {
    setActiveDirectMessage(targetUser);
    setViewMode('dm');
    setIsSidebarOpen(false);
    setIsUserListOpen(false);
    
    // Initialize DM if it doesn't exist
    const dmKey = getDMKey(user.id, targetUser.id);
    if (!directMessages[dmKey]) {
      setDirectMessages(prev => ({
        ...prev,
        [dmKey]: []
      }));
    }
  };

  const backToChannels = () => {
    setViewMode('channel');
    setActiveDirectMessage(null);
  };

  const sendMessage = useCallback(() => {
    if (!newMessage.trim() || !user) return;

    const messageData = {
      type: 'message',
      data: {
        channel_id: viewMode === 'channel' ? selectedChannel : getDMKey(user.id, activeDirectMessage.id),
        user_id: user.id,
        username: user.username,
        content: newMessage.trim(),
        avatar: user.avatar
      }
    };

    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(messageData));
      setNewMessage('');
    }
  }, [newMessage, selectedChannel, user, viewMode, activeDirectMessage]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getCurrentMessages = () => {
    if (viewMode === 'channel') {
      return messages[selectedChannel] || [];
    } else if (viewMode === 'dm' && activeDirectMessage) {
      const dmKey = getDMKey(user.id, activeDirectMessage.id);
      return directMessages[dmKey] || [];
    }
    return [];
  };

  const currentMessages = getCurrentMessages();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen bg-black flex overflow-hidden">
      {/* Left Sidebar - Channels */}
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-30 w-64 bg-neutral-900 text-white flex flex-col transition-transform duration-300 border-r border-white`}>
        <div className="p-4 border-b border-white bg-black">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Study Community</h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-neutral-900">
          {viewMode === 'dm' && activeDirectMessage ? (
            <div className="p-4">
              <button
                onClick={backToChannels}
                className="flex items-center text-gray-400 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Channels
              </button>
              <div className="flex items-center space-x-3 p-3 bg-black rounded-lg border border-white">
                <img
                  src={activeDirectMessage.avatar}
                  alt={activeDirectMessage.username}
                  className="w-10 h-10 rounded-full border border-white"
                />
                <div>
                  <h3 className="font-medium text-white">{activeDirectMessage.username}</h3>
                  <p className="text-sm text-gray-400 capitalize">{activeDirectMessage.status}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Text Channels
              </h2>
              <div className="space-y-1">
                {mockChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannel(channel.id);
                      setIsSidebarOpen(false);
                      setViewMode('channel');
                    }}
                    className={`w-full flex items-center px-3 py-2 rounded-md text-left transition-colors border ${
                      selectedChannel === channel.id && viewMode === 'channel'
                        ? 'bg-black text-white border-white'
                        : 'text-gray-300 hover:bg-black hover:text-white border-transparent hover:border-white'
                    }`}
                  >
                    <Hash className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{channel.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User info at bottom */}
        <div className="p-4 border-t border-white bg-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <img
                src={user?.avatar}
                alt={user?.username}
                className="w-8 h-8 rounded-full flex-shrink-0 border border-white"
              />
              <div className="ml-2 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.username}
                </p>
                <p className="text-xs text-gray-400">Online</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-white p-1 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-black border-b border-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden mr-3 text-gray-400 hover:text-gray-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            {viewMode === 'dm' && activeDirectMessage ? (
              <>
                <MessageCircle className="w-5 h-5 text-gray-400 mr-2" />
                <h1 className="text-lg font-semibold text-white">
                  {activeDirectMessage.username}
                </h1>
                <div className="ml-3 flex items-center space-x-2">
                  <button className="p-2 text-gray-400 hover:text-gray-300 rounded-md hover:bg-neutral-900 border border-transparent hover:border-white transition-colors">
                    <Phone className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-300 rounded-md hover:bg-neutral-900 border border-transparent hover:border-white transition-colors">
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Hash className="w-5 h-5 text-gray-400 mr-2" />
                <h1 className="text-lg font-semibold text-white">
                  {mockChannels.find(c => c.id === selectedChannel)?.name || selectedChannel}
                </h1>
              </>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-gray-300 rounded-md hover:bg-neutral-900 border border-transparent hover:border-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-300 rounded-md hover:bg-neutral-900 border border-transparent hover:border-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsUserListOpen(!isUserListOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-300 rounded-md hover:bg-neutral-900 border border-transparent hover:border-white transition-colors"
            >
              <Users className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center bg-neutral-900">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-400">Loading messages...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-neutral-900">
                {currentMessages.length === 0 ? (
                  <div className="text-center py-8">
                    {viewMode === 'dm' && activeDirectMessage ? (
                      <>
                        <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">
                          Direct Message with {activeDirectMessage.username}
                        </h3>
                        <p className="text-gray-400">
                          This is the beginning of your direct message history.
                        </p>
                      </>
                    ) : (
                      <>
                        <Hash className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">
                          Welcome to #{selectedChannel}
                        </h3>
                        <p className="text-gray-400">
                          This is the beginning of the #{selectedChannel} channel.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  currentMessages.map((message) => (
                    <div key={message.id} className="flex items-start space-x-3 group hover:bg-black -mx-4 px-4 py-2 rounded-lg transition-colors">
                      <button
                        onClick={() => handleUserClick(message)}
                        className="hover:opacity-80 transition-opacity"
                        title={`Send direct message to ${message.username}`}
                      >
                        <img
                          src={message.avatar}
                          alt={message.username}
                          className="w-8 h-8 rounded-full flex-shrink-0 border border-white"
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline space-x-2">
                          <button
                            onClick={() => handleUserClick(message)}
                            className="font-medium text-white hover:text-gray-300 transition-colors"
                            title={`Send direct message to ${message.username}`}
                          >
                            {message.username}
                          </button>
                          <span className="text-xs text-gray-500">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <p className="text-gray-300 mt-1 break-words">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Message Input */}
            <div className="border-t border-white p-4 bg-black">
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        viewMode === 'dm' && activeDirectMessage
                          ? `Message @${activeDirectMessage.username}`
                          : `Message #${selectedChannel}`
                      }
                      className="w-full px-4 py-3 pr-12 bg-neutral-900 border border-white rounded-lg focus:ring-2 focus:ring-white focus:border-white resize-none text-white placeholder-gray-400 transition-colors"
                    />
                    <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors">
                      <Smile className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="bg-black text-white px-4 py-3 rounded-lg border-2 border-white hover:bg-neutral-900 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Online Users */}
          <div className={`${isUserListOpen ? 'block' : 'hidden'} md:block w-64 bg-neutral-900 border-l border-white flex flex-col`}>
            <div className="p-4 border-b border-white bg-black">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                  Online — {onlineUsers.filter(u => u.status === 'online').length}
                </h2>
                <button
                  onClick={() => setIsUserListOpen(false)}
                  className="md:hidden text-gray-400 hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {onlineUsers.map((onlineUser) => (
                  <div key={onlineUser.id} className="flex items-center space-x-3 group">
                    <div className="relative">
                      <button
                        onClick={() => startDirectMessage(onlineUser)}
                        className="relative hover:opacity-80 transition-opacity"
                        title={`Send direct message to ${onlineUser.username}`}
                      >
                        <img
                          src={onlineUser.avatar}
                          alt={onlineUser.username}
                          className="w-8 h-8 rounded-full border border-white"
                        />
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-neutral-900 ${
                          onlineUser.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => startDirectMessage(onlineUser)}
                        className="text-left w-full hover:text-gray-300 transition-colors"
                      >
                        <p className="text-sm font-medium text-white truncate">
                          {onlineUser.username}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {onlineUser.status}
                        </p>
                      </button>
                    </div>
                    <button
                      onClick={() => startDirectMessage(onlineUser)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-white rounded transition-all"
                      title="Send message"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Community;