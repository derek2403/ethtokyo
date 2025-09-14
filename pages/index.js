import { useState } from 'react';
import { useRouter } from 'next/router';
import { usePrivy } from '@privy-io/react-auth';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { ready, authenticated, login } = usePrivy();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
    }
    router.push('/world');
  };

  async function handleGetStarted() {
    try {
      if (!ready) return; // wait until Privy initialized
      if (authenticated) {
        router.push('/world');
        return;
      }
      await login();
      router.push('/world');
    } catch (e) {
      // User may cancel the login modal; do nothing
    }
  }

  return (
    <div className="landingpage-root">
      {/* Background Video */}
      <video
        className="landingpage-video"
        src="/landingpage.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        Your browser does not support the video tag.
      </video>

      {/* Overlay Content */}
      <div className="landingpage-overlay">
        {/* Main Content */}
        <div className="landingpage-content">
          {/* Logo/Title */}
          <div className="landingpage-header">
            <h1 className="landingpage-title">
              Toku Kaigan<span className="trademark">®</span>
            </h1>
          </div>

          {/* Email Subscription Form */}
          <div className="landingpage-form-container">
            <form onSubmit={handleSubmit} className="landingpage-form">
              <div className="input-container">
                <input
                  type="text"
                  placeholder="Enter your message"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="email-input"
                  required
                />
                <button type="submit" className="submit-button">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
            </form>

            {isSubmitted && (
              <div className="success-message">
                Thank you for subscribing! 🎉
              </div>
            )}
          </div>

          {/* Description */}
          <div className="landingpage-description" style={{ marginBottom: '16px' }}>
            <p>
            Trusted AI therapy with built-in privacy
            </p>
          </div>

          {/* Manifesto Button */}
          <div className="manifesto-container">
            <button className="manifesto-button" onClick={handleGetStarted}>
              Get started
            </button>
          </div>
        </div>

        {/* Footer removed as requested */}
        <div className="hidden">
          <div className="hidden">
            <a href="#" className="social-link" aria-label="Instagram">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            
            <a href="#" className="social-link" aria-label="Twitter">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            
            <a href="#" className="social-link" aria-label="GitHub">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.29"/>
              </svg>
            </a>
          </div>
          
          <div className="hidden">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="warning-icon">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
            V0 Newsletter Setup
          </div>
        </div>
      </div>

      <style jsx>{`
        .landingpage-root {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          background: #000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .landingpage-video {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .landingpage-overlay {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          height: 100vh;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(1px);
          padding: 40px 20px;
          text-align: center;
        }

        .landingpage-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          max-width: 800px;
          width: 100%;
        }

        .landingpage-header {
          margin-bottom: 60px;
        }

        .landingpage-title {
          font-size: clamp(3rem, 8vw, 6rem);
          font-weight: 700;
          color: white;
          margin: 0;
          font-style: italic;
          letter-spacing: -2px;
          text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.6);
        }

        .trademark {
          font-size: 0.4em;
          vertical-align: super;
          font-weight: 400;
        }

        .landingpage-form-container {
          margin-bottom: 40px;
          width: 100%;
          max-width: 500px;
        }

        .landingpage-form {
          width: 100%;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 50px;
          padding: 4px;
          transition: all 0.3s ease;
        }

        .input-container:focus-within {
          background: rgba(255, 255, 255, 0.35);
          border-color: rgba(255, 255, 255, 0.7);
          box-shadow: 0 0 24px rgba(255, 255, 255, 0.25);
        }

        .email-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          padding: 16px 24px;
          font-size: 16px;
          color: white;
          placeholder-color: rgba(255, 255, 255, 0.7);
        }

        .email-input::placeholder {
          color: rgba(255, 255, 255, 0.85);
        }

        .submit-button {
          background: rgba(255, 255, 255, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-right: 4px;
        }

        .submit-button:hover {
          background: rgba(255, 255, 255, 0.5);
          border-color: rgba(255, 255, 255, 0.5);
          transform: scale(1.05);
        }

        .success-message {
          margin-top: 20px;
          color: #4ade80;
          font-weight: 500;
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.2);
          border-radius: 25px;
          padding: 12px 24px;
          backdrop-filter: blur(10px);
        }

        .landingpage-description {
          margin-bottom: 50px;
          max-width: 600px;
        }

        .landingpage-description p {
          font-size: 20px;
          line-height: 1.6;
          color: #fff;
          margin: 0;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.6);
        }

        .manifesto-container {
          margin-bottom: 40px;
        }

        .manifesto-button {
          font-weight: 600;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 30px;
          padding: 14px 32px;
          color: white;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .manifesto-button:hover {
          border-color: rgba(255, 255, 255, 0.7);
          background: rgba(255, 255, 255, 0.35);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }

        .landingpage-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 1200px;
        }

        .social-links {
          display: flex;
          gap: 20px;
        }

        .social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          color: white;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .social-link:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }

        .version-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(251, 146, 60, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(251, 146, 60, 0.2);
          border-radius: 20px;
          padding: 8px 16px;
          color: #fbbf24;
          font-size: 14px;
          font-weight: 500;
        }

        .warning-icon {
          width: 16px;
          height: 16px;
        }

        @media (max-width: 768px) {
          .landingpage-overlay {
            padding: 20px 16px;
          }

          .landingpage-description p {
            font-size: 16px;
          }

          .landingpage-footer {
            flex-direction: column;
            gap: 20px;
          }

          .social-links {
            order: 2;
          }

          .version-badge {
            order: 1;
          }
        }

        @media (max-width: 480px) {
          .landingpage-title {
            font-size: 2.5rem;
          }

          .email-input {
            font-size: 14px;
            padding: 14px 20px;
          }

          .submit-button {
            width: 44px;
            height: 44px;
          }
        }
      `}</style>
    </div>
  );
}
