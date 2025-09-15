import useAuth from '@/hooks/useAuth';

const DebugHud = () => {
  // Only render in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const { user, profile } = useAuth();

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono border border-gray-600 z-50">
      <div className="space-y-1">
        <div><strong>UID:</strong> {user?.id || 'null'}</div>
        <div><strong>Role:</strong> {profile?.role || 'null'}</div>
        <div><strong>Club ID:</strong> {profile?.club_id || 'null'}</div>
      </div>
    </div>
  );
};

export default DebugHud;