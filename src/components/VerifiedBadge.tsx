import React from 'react';

interface VerifiedBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4 sm:w-4.5 sm:h-4.5',
    lg: 'w-5 h-5 sm:w-6 sm:h-6',
  }[size];

  return (
    <img
      src="https://static.vecteezy.com/system/resources/thumbnails/047/309/918/small_2x/verified-badge-profile-icon-png.png"
      alt="Tasdiqlangan"
      title="Tasdiqlangan profil (AniManga Uz VIP)"
      className={`inline-block align-middle shrink-0 object-contain select-none drop-shadow-sm ${sizeClasses} ${className}`}
      referrerPolicy="no-referrer"
    />
  );
};
