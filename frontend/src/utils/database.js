/**
 * Database utility functions for connecting to the workshop.db SQLite database
 * This would typically connect to your FastAPI backend endpoints
 */

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-domain.com' 
  : 'http://localhost:8000';

/**
 * Authenticate user with the backend database
 */
export const authenticateUser = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    return {
      success: true,
      token: data.access_token,
      user: data.user
    };
  } catch (error) {
    console.error('Database authentication error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Fetch user profile from database
 */
export const fetchUserProfile = async (userId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Fetch all users for the online users list
 */
export const fetchAllUsers = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

/**
 * Fetch channels from database
 */
export const fetchChannels = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/channels`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch channels');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching channels:', error);
    throw error;
  }
};

/**
 * Fetch messages for a specific channel
 */
export const fetchChannelMessages = async (channelId, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/channels/${channelId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch messages');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
};

/**
 * Send a new message to a channel
 */
export const sendChannelMessage = async (channelId, content, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel_id: channelId,
        content: content
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send message');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Fetch direct messages between two users
 */
export const fetchDirectMessages = async (userId1, userId2, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/direct-messages/${userId1}/${userId2}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch direct messages');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    throw error;
  }
};

/**
 * Send a direct message to another user
 */
export const sendDirectMessage = async (recipientId, content, token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/direct-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: recipientId,
        content: content
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send direct message');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending direct message:', error);
    throw error;
  }
};