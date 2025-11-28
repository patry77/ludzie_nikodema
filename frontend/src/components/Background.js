import React from 'react';

const Background = () => {
  const backgroundImage = process.env.PUBLIC_URL + '/background.jpg';
  
  return (
    <>
      {/* Blurred background image */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(10px)',
          WebkitFilter: 'blur(10px)',
          transform: 'scale(1.1)', // Scale up to avoid white edges from blur
          zIndex: -2,
        }}
      />
      {/* Overlay for better readability */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.3)',
          zIndex: -1,
        }}
      />
    </>
  );
};

export default Background;

