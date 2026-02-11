import React, { useState, useEffect } from 'react';
import { useAuth } from '../utils/AuthContext';
import { authAPI } from '../services/api';

const AVATAR_EMOJIS = ['🎨', '🚀', '💻', '🎮', '🎯', '⚡', '🌟', '🔥', '💡', '🎵', '🎸', '🎪', '🎭', '🎬', '📱', '⚙️', '🛠️', '🔮', '🌈', '🦄'];

const Profile: React.FC = () => {
  const { user: contextUser, login } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(contextUser?.name || '');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [billableRate, setBillableRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profileData, setProfileData] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const user = response.data.data.user;
      setProfileData(user);
      setName(user.name);
      setAvatarUrl(user.avatarUrl || '');
      setHireDate(user.hireDate ? new Date(user.hireDate).toISOString().split('T')[0] : '');
      setBillableRate(user.billableRate ? user.billableRate.toString() : '');
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await authAPI.updateProfile({ 
        name, 
        avatarUrl: avatarUrl || undefined,
        hireDate: hireDate || undefined,
        billableRate: billableRate ? parseFloat(billableRate) : undefined 
      });
      const updatedUser = response.data.data.user;
      
      // Update local storage and context
      const token = localStorage.getItem('token');
      if (token) {
        login(token, updatedUser);
      }
      
      setProfileData(updatedUser);
      setSuccess('Profile updated successfully! 🎉');
      setIsEditing(false);
      setShowEmojiPicker(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(profileData?.name || contextUser?.name || '');
    setAvatarUrl(profileData?.avatarUrl || '');
    setHireDate(profileData?.hireDate ? new Date(profileData.hireDate).toISOString().split('T')[0] : '');
    setBillableRate(profileData?.billableRate ? profileData.billableRate.toString() : '');
    setIsEditing(false);
    setShowEmojiPicker(false);
    setError('');
    setSuccess('');
  };

  const getDisplayAvatar = () => {
    const avatar = profileData?.avatarUrl || avatarUrl;
    if (!avatar) return contextUser?.name?.charAt(0).toUpperCase() || '👤';
    return avatar;
  };

  const getTimeWithCompany = () => {
    if (!profileData?.hireDate) return null;
    const hire = new Date(profileData.hireDate);
    const now = new Date();
    const years = now.getFullYear() - hire.getFullYear();
    const months = now.getMonth() - hire.getMonth() + (years * 12);
    
    if (months < 1) return 'Just started!';
    if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`;
    
    const displayYears = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (remainingMonths === 0) return `${displayYears} year${displayYears !== 1 ? 's' : ''}`;
    return `${displayYears}y ${remainingMonths}m`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB for original)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setError('');

    try {
      // Create an image element to resize
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      
      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setError('Failed to process image');
          setUploadingImage(false);
          return;
        }
        
        // Set target size (200x200 for avatars)
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions (maintain aspect ratio, crop to square)
        const size = Math.min(width, height);
        const x = (width - size) / 2;
        const y = (height - size) / 2;
        
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        
        // Draw cropped and resized image
        ctx.drawImage(
          img,
          x, y, size, size,  // Source coordinates
          0, 0, MAX_SIZE, MAX_SIZE  // Destination coordinates
        );
        
        // Convert to base64 with compression (JPEG at 85% quality)
        const base64String = canvas.toDataURL('image/jpeg', 0.85);
        
        // Check if resulting base64 is too large (SQLite limit ~1MB for TEXT)
        if (base64String.length > 500000) {
          // Try with lower quality
          const smallerBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setAvatarUrl(smallerBase64);
        } else {
          setAvatarUrl(base64String);
        }
        
        setUploadingImage(false);
        setShowEmojiPicker(false);
      };
      
      img.onerror = () => {
        setError('Failed to process image');
        setUploadingImage(false);
      };
      
      reader.onerror = () => {
        setError('Failed to read image file');
        setUploadingImage(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to upload image');
      setUploadingImage(false);
    }
  };

  const isImageUrl = (url: string) => {
    return url && (url.startsWith('data:image/') || url.startsWith('http'));
  };

  const user = profileData || contextUser;
  const timeWithCompany = getTimeWithCompany();

  return (
    <div className="bg-slate-800/90 backdrop-blur p-8 rounded-xl shadow-lg border border-slate-600">
      {error && (
        <div className="mb-4 text-sm text-red-300 bg-red-900/30 p-3 rounded-lg border border-red-500/30">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 text-sm text-emerald-300 bg-emerald-900/30 p-3 rounded-lg border border-emerald-500/30">
          {success}
        </div>
      )}

      <div className="flex items-start gap-6 mb-8">
        {/* Avatar Section */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-4xl text-white shadow-lg overflow-hidden">
            {isImageUrl(getDisplayAvatar()) ? (
              <img 
                src={getDisplayAvatar()} 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{getDisplayAvatar()}</span>
            )}
          </div>
          {isEditing && (
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute -bottom-2 -right-2 bg-slate-700 rounded-full p-2 shadow-md hover:shadow-lg transition-shadow border-2 border-slate-600"
              disabled={uploadingImage}
            >
              {uploadingImage ? '⏳' : '✏️'}
            </button>
          )}
          {showEmojiPicker && (
            <div className="absolute top-0 left-28 bg-slate-800 rounded-lg shadow-xl p-4 border border-slate-600 z-10 w-64">
              <p className="text-xs text-gray-300 mb-3 font-medium">Choose your avatar:</p>
              
              {/* Upload Image Button */}
              <label className="block mb-3">
                <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg cursor-pointer hover:shadow-md transition-all text-sm font-medium">
                  📸 Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">Auto-resized to 200x200px</p>
              </label>

              <div className="border-t border-slate-600 pt-3 mb-2">
                <p className="text-xs text-gray-300 mb-2">Or pick an emoji:</p>
              </div>
              
              {/* Emoji Grid */}
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => { setAvatarUrl(emoji); setShowEmojiPicker(false); }}
                    className="text-2xl hover:scale-125 transition-transform p-1 hover:bg-slate-700 rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Name and Role */}
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-3xl font-bold text-white bg-transparent border-b-2 border-indigo-500 focus:outline-none w-full mb-2"
              disabled={loading}
              placeholder="Your name"
            />
          ) : (
            <h2 className="text-3xl font-bold text-white mb-2">{user?.name}</h2>
          )}
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${
              user?.role === 'ADMIN' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
            }`}>
              {user?.role === 'ADMIN' ? '👑 Admin' : '✨ Employee'}
            </span>
            {timeWithCompany && (
              <span className="text-sm text-gray-300">
                📅 {timeWithCompany} with us
              </span>
            )}
          </div>
          <p className="text-gray-300 flex items-center gap-1">
            📧 {user?.email}
          </p>
        </div>
      </div>

      {/* Edit Fields */}
      {isEditing && (
        <div className="space-y-4 mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              📆 Hire Date (optional)
            </label>
            <input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">When did you join the company?</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              💰 Billable Rate (optional)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={billableRate}
                onChange={(e) => setBillableRate(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={loading || user?.role !== 'ADMIN'}
                placeholder="75.00"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {user?.role === 'ADMIN' 
                ? 'Your hourly consulting rate (used for financial reports)'
                : 'Your hourly consulting rate - contact an admin to update'}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-600">
        {isEditing ? (
          <>
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '🔄 Saving...' : '✔️ Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="px-6 py-2.5 bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors disabled:opacity-50 font-medium"
            >
              ❌ Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-medium"
          >
            ✏️ Edit Profile
          </button>
        )}
      </div>
    </div>
  );
};

export default Profile;
