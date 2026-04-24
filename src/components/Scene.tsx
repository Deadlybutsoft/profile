import '@/lib/types';
import React, { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Stars, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { Hallway } from './Hallway';
// Lazy load Room to prevent downloading all assets at start
const RoomLazy = React.lazy(() => import('./Room').then(module => ({ default: module.Room })));
import { Door } from './Door';
import { Player } from './Player';
import ModernRemote from './ModernRemote';
import { sfx } from '@/lib/sfx';

// Component that signals when the 3D scene has actually rendered
const SceneReady: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const called = React.useRef(false);

  useFrame(() => {
    // Only call once after first frame renders
    if (!called.current) {
      called.current = true;
      // Small delay to ensure everything is painted
      setTimeout(onReady, 100);
    }
  });

  return null;
};

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Canvas error boundary caught an error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000000',
            color: '#ffffff',
            fontFamily: '"Manrope", "Sora", sans-serif',
            letterSpacing: '0.04em'
          }}
        >
          3D scene failed to render. Refreshing the page usually resolves this.
        </div>
      );
    }

    return this.props.children;
  }
}

export const Scene: React.FC = () => {
  const xOffset = -3.3;
  const [isDoorOpen, setIsDoorOpen] = React.useState(false);
  const [enteredRoom, setEnteredRoom] = React.useState(false);

  // Expanded Room States
  const [lightsOn, setLightsOn] = React.useState(true);
  const [lightColor, setLightColor] = React.useState('#ffffff');
  const [lightIntensity, setLightIntensity] = React.useState(1.5);
  const [hexagonLightsOn, setHexagonLightsOn] = React.useState(true);
  const [fanSpeed, setFanSpeed] = React.useState(2); // 0 (off) to 5 (max)
  const [showRemote, setShowRemote] = React.useState(false);
  const [roomMode, setRoomMode] = React.useState<'normal' | 'night' | 'party'>('normal');
  const [isMusicPlaying, setIsMusicPlaying] = React.useState(false);
  const [showAboutPopup, setShowAboutPopup] = React.useState(false);
  const [showWardrobePopup, setShowWardrobePopup] = React.useState(false);
  const [showSkillsPopup, setShowSkillsPopup] = React.useState(false);
  const [showAIPopup, setShowAIPopup] = React.useState(false);
  const [controlScheme, setControlScheme] = React.useState<'arrows' | 'wasd' | 'both'>('both');
  const [activeSkillCategory, setActiveSkillCategory] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Phase-based loading: 
  //  - 'initial': only Hallway + Player + Door assets load (progress shows ~50%)
  //  - 'hallway-done': user has moved past start, Room assets begin loading in background
  //  - 'room-done': Room fully loaded, next trigger is door click
  //  - 'door-click': door popup images start loading
  const [loadingPhase, setLoadingPhase] = React.useState<'initial' | 'hallway-done' | 'room-done'>('initial');
  
  // Lazy Loading States
  const [loadRoom, setLoadRoom] = React.useState(false);  // Room textures load in background
  const [loadDoorPopup, setLoadDoorPopup] = React.useState(false);  // Project images load on door click

  // Door click handler - triggers Room background load + popup image preloading
  const handleDoorClick = React.useCallback(() => {
    sfx.playSwitch();
    // Phase 2: Start loading Room assets in background (user clicked door to enter)
    if (!loadRoom) {
      setLoadRoom(true);
      setLoadingPhase('hallway-done');
    }
    // Phase 3: Preload project images for the popup (load silently, don't block)
    if (!loadDoorPopup) {
      setLoadDoorPopup(true);
    }
  }, [loadRoom, loadDoorPopup]);

  // Track how many door popup images are loaded (for progress estimation)
  const [doorPopupLoaded, setDoorPopupLoaded] = React.useState(0);
  const doorPopupTotal = 8; // number of project images in door popup

  // Preload door popup images when loadDoorPopup becomes true
  React.useEffect(() => {
    if (!loadDoorPopup) return;
    const images = [
      '/locate_that.jpg', '/suvo_store.png', '/portfolio_cover.png',
      '/suvo_writer.png', '/hugo_app.png', '/touzi.jpg',
      '/about-bg.png', '/bg-music.mp3'
    ];
    let loaded = 0;
    images.forEach(src => {
      const img = new Image();
      img.onload = () => {
        loaded++;
        setDoorPopupLoaded(loaded);
      };
      img.onerror = () => {
        loaded++;
        setDoorPopupLoaded(loaded);
      };
      img.src = src;
    });
  }, [loadDoorPopup]);

  // Loading Logic - True asset tracking
  const { progress, active, loaded, total } = useProgress();
  const [hasStarted, setHasStarted] = React.useState(false);
  const [forceLoad, setForceLoad] = React.useState(false);
  const [displayProgress, setDisplayProgress] = React.useState(0);
  const [sceneRendered, setSceneRendered] = React.useState(false);

  // Callback for when scene actually renders its first frame
  const handleSceneReady = React.useCallback(() => {
    setSceneRendered(true);
  }, []);

  // Smooth progress animation - follows real progress
  React.useEffect(() => {
    const targetProgress = Math.min(progress, 100);

    // Faster animation to catch up with real progress
    const animate = () => {
      setDisplayProgress(prev => {
        const diff = targetProgress - prev;
        if (Math.abs(diff) < 1) return targetProgress;
        return prev + diff * 0.15; // 15% of remaining distance per frame
      });
    };

    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [progress, displayProgress]);

  // True loading complete - assets loaded AND scene has rendered
  const assetsLoaded = !active && progress >= 100;
  const isLoaded = (assetsLoaded && sceneRendered) || forceLoad;

  // Use deferred state update to avoid suspending the main UI
  const [, startTransition] = React.useTransition();

  // Phase 2: Start loading Room assets in background right after initial loading screen ends (not on door click)
  React.useEffect(() => {
    if (isLoaded && !loadRoom) {
      startTransition(() => {
        setLoadRoom(true);
        setLoadingPhase('hallway-done');
      });
    }
  }, [isLoaded, loadRoom]);

  // NOTE: Room is NOT auto-loaded. It only starts loading when user clicks the door.
  // This keeps initial loading to just Hallway + Player + Door (~50% of assets).

  // Background Music Logic
  React.useEffect(() => {
    const audio = new Audio('/bg-music.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // Safety fallback - only if something goes wrong (20 seconds)
    const fallbackTimer = setTimeout(() => {
      console.warn('Loading fallback triggered - forcing load');
      setForceLoad(true);
    }, 20000);

    return () => {
      audio.pause();
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Auto-start when truly loaded
  React.useEffect(() => {
    if (isLoaded && !hasStarted) {
      handleStart();
    }
  }, [isLoaded, hasStarted]);

  const handleStart = () => {
    setHasStarted(true);
    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setIsMusicPlaying(true);
      }).catch(e => {
        console.log('Autoplay prevented. Music will start on next interaction.', e);
        setIsMusicPlaying(false);

        // Setup a one-time listener for the first interaction to start the music
        const playOnInteraction = () => {
          if (audioRef.current && !isMusicPlaying) {
            audioRef.current.play().then(() => {
              setIsMusicPlaying(true);
              // Remove all listeners once played
              ['click', 'keydown', 'touchstart', 'pointerdown', 'wheel'].forEach(event =>
                window.removeEventListener(event, playOnInteraction)
              );
            }).catch(() => { });
          }
        };
        // Add listeners for ANY interaction
        ['click', 'keydown', 'touchstart', 'pointerdown', 'wheel'].forEach(event =>
          window.addEventListener(event, playOnInteraction, { once: true, passive: true })
        );
      });
    }
  };


  const toggleMusic = () => {
    sfx.playSwitch();
    if (audioRef.current) {
      if (isMusicPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsMusicPlaying(!isMusicPlaying);
    }
  };

  // Close Popups on Scroll
  React.useEffect(() => {
    if (!showAboutPopup && !showWardrobePopup && !showSkillsPopup) return;

    let scrollAccumulator = 0;
    const threshold = 30; // Threshold to prevent accidental closing

    const handleScroll = (e: WheelEvent | TouchEvent) => {
      if (e instanceof WheelEvent) {
        scrollAccumulator += Math.abs(e.deltaY);
      } else if (e instanceof TouchEvent) {
        scrollAccumulator += 10;
      }

      if (scrollAccumulator > threshold) {
        setShowAboutPopup(false);
        setShowWardrobePopup(false);
        setShowSkillsPopup(false);
      }
    };

    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
    };
  }, [showAboutPopup, showWardrobePopup, showSkillsPopup]);

  // Auto-slide effect for Skills Carousel
  React.useEffect(() => {
    if (!showSkillsPopup) return;
    const interval = setInterval(() => {
      setActiveSkillCategory((prev) => (prev === 4 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [showSkillsPopup]);

  return (
    <div className="w-full h-full relative">
      {/* SIMPLE LOADING SCREEN */}
      <div
        onClick={() => hasStarted && handleStart()}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#000000',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          transition: 'opacity 0.6s ease',
          opacity: hasStarted ? 0 : 1,
          pointerEvents: hasStarted ? 'none' : 'auto',
          visibility: isLoaded && hasStarted ? 'hidden' : 'visible',
        }}>

        <div style={{
          fontFamily: '"Instrument Serif", serif',
          fontSize: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          opacity: 0.8
        }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <span>Loading</span>
            <span>{Math.round(displayProgress)}%</span>
          </div>
          {total > 0 && (
            <div style={{ fontSize: '0.9rem', opacity: 0.5 }}>
              {loaded} / {total} assets
            </div>
          )}
        </div>
      </div>

      <CanvasErrorBoundary>
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ fov: 60, position: [xOffset, 1.7, 0] }}
          className="w-full h-full bg-black"
        >
          <Suspense fallback={null}>
            {/* Signals when scene has actually rendered */}
            <SceneReady onReady={handleSceneReady} />

            <ambientLight intensity={roomMode === 'night' ? 0.02 : (roomMode === 'party' ? 0.05 : 0.4)} color="#ffffff" />
            <Environment
              preset="city"
              environmentIntensity={roomMode === 'night' ? 0.01 : (roomMode === 'party' ? 0.1 : 1)}
            />

            <group position={[xOffset, 0, 0]}>
              <Hallway />
            </group>

            {loadRoom && (
              <Suspense fallback={null}>
                <RoomLazy
                  lightsOn={lightsOn}
                  lightColor={lightColor}
                  lightIntensity={lightIntensity}
                  hexagonLightsOn={hexagonLightsOn}
                  fanSpeed={fanSpeed}
                  roomMode={roomMode}
                  showRemote={showRemote}
                  isDoorOpen={isDoorOpen}
                  onToggleRemote={() => setShowRemote(!showRemote)}
                  onToggleWardrobe={() => setShowWardrobePopup(true)}
                  onToggleSkills={() => setShowSkillsPopup(true)}
                  onToggleAI={() => setShowAIPopup(true)}
                  isPopupOpen={showAboutPopup || showWardrobePopup || showSkillsPopup || showAIPopup}
                />
              </Suspense>
            )}

            <Door position={[xOffset, 0, -4]} isOpen={isDoorOpen} setIsOpen={setIsDoorOpen} enteredRoom={enteredRoom} hideLabel={!hasStarted} onInteract={handleDoorClick} />
            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            <Player
              isDoorOpen={isDoorOpen}
              isAboutOpen={showAboutPopup}
              controlScheme={controlScheme}
              onRoomReached={() => {
                setEnteredRoom(true);
                setShowAboutPopup(true);
                setRoomMode('normal');
                setFanSpeed(2);
                sfx.playPopup();
              }}
            />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>

      {/* ENHANCED 2D REMOTE OVERLAY */}
      {
        showRemote && (
          <div style={{
            position: 'fixed',
            bottom: '40px',
            right: '40px',
            zIndex: 9999,
          }}>
            <ModernRemote
              mode={roomMode === 'normal' ? 'NORM' : roomMode === 'night' ? 'NIGHT' : 'PARTY'}
              setMode={(m) => {
                if (m === 'NORM') {
                  setRoomMode('normal');
                  setLightsOn(true);
                  setHexagonLightsOn(true);
                  setFanSpeed(2);
                  setLightIntensity(1.5);
                } else if (m === 'NIGHT') {
                  setRoomMode('night');
                  setLightsOn(false);
                  setHexagonLightsOn(false);
                  setFanSpeed(1);
                } else {
                  setRoomMode('party');
                  setLightsOn(true);
                  setHexagonLightsOn(true);
                  setFanSpeed(5);
                }
              }}
              fanOn={fanSpeed > 0}
              setFanOn={(on) => setFanSpeed(on ? 2 : 0)}
              controlScheme={controlScheme}
              setControlScheme={setControlScheme}
              onClose={() => setShowRemote(false)}
            />
          </div>
        )
      }

      {/* BLACK OVERLAY TRANSITION - Removed as it is now integrated into the popup */}

      {/* MUSIC TOGGLE BUTTON */}
      <div
        onClick={toggleMusic}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 10000,
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          fontSize: '20px',
          transition: 'all 0.3s ease',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        {isMusicPlaying ? '♪' : '🔇'}
      </div>

      {/* MOBILE CONTROLS (shown via CSS media query + JS) */}
      <div id="mobile-controls" style={{ display: 'none' }}>
        <div className="mobile-joystick" id="mobile-joystick">
          <div className="mobile-joystick-knob" id="joystick-knob" />
        </div>
        <div className="mobile-look-hint">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </div>
      </div>

      {/* ABOUT POPUP - Full Screen with Paper Reveal Effect */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 5, 5, 0.85)',
        backdropFilter: 'blur(30px)',
        opacity: showAboutPopup ? 1 : 0,
        pointerEvents: showAboutPopup ? 'auto' : 'none',
        transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '100vw',
          height: '100vh',
          backgroundImage: 'url(/project_bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative',
          transform: showAboutPopup ? 'scale(1) rotate(0deg)' : 'scale(0.9) rotate(2deg)',
          opacity: showAboutPopup ? 1 : 0,
          filter: showAboutPopup ? 'blur(0px)' : 'blur(10px)',
          transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
          color: '#f6f1e6',
        }}>
          {/* Torn Paper Edge Effect */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '60px',
            overflow: 'hidden',
          }}>
            <svg width="1200" height="60" viewBox="0 0 1200 60" style={{ position: 'absolute', top: 0, left: 0 }}>
              <path
                d="M0,0 
                   L0,20 
                   C20,25 35,15 50,22 
                   C70,30 85,12 100,20 
                   C120,28 140,18 160,25 
                   C180,32 200,15 225,23 
                   C250,31 270,14 295,21 
                   C320,28 345,17 370,24 
                   C395,31 420,16 445,23 
                   C470,30 495,18 520,25 
                   C545,32 570,14 600,22 
                   C630,30 655,19 680,26 
                   C705,33 735,15 760,23 
                   C785,31 815,18 840,25 
                   C865,32 895,16 920,24 
                   C945,32 975,18 1000,25 
                   C1025,32 1055,19 1080,26 
                   C1105,33 1135,17 1160,24 
                   C1180,31 1195,22 1200,20
                   L1200,0 
                   Z"
                fill="#e2dbc8"
              />
              <path
                d="M0,0 
                   L0,15 
                   C20,18 35,28 50,22 
                   C70,15 85,30 100,24 
                   C120,17 140,32 160,26 
                   C180,19 200,35 225,28 
                   C250,21 270,38 295,30 
                   C320,23 345,40 370,32 
                   C395,25 420,42 445,34 
                   C470,27 495,44 520,36 
                   C545,29 570,46 600,38 
                   C630,30 655,48 680,40 
                   C705,32 735,50 760,42 
                   C785,34 815,52 840,44 
                   C865,36 895,64 920,46 
                   C945,38 975,56 1000,48 
                   C1025,40 1055,58 1080,50 
                   C1105,42 1135,55 1160,48 
                   C1180,42 1195,50 1200,45
                   L1200,0 
                   Z"
                fill="#ebe4d4"
              />
            </svg>
          </div>

          {/* Subtle paper logo or text */}
          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: '3rem',
            color: 'rgba(232, 196, 160, 0.25)',
            letterSpacing: '0.5em',
            textTransform: 'uppercase',
            marginBottom: '60px',
          }}>
            Portfolio
          </div>

          {/* Close Button - Hand Drawn Style */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowAboutPopup(false);
              sfx.playClose();
            }}
            className="hand-drawn-close-btn"
            style={{
              position: 'absolute',
              top: '40px',
              right: '60px',
              width: '80px',
              height: '80px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              opacity: showAboutPopup ? 1 : 0,
              transition: 'opacity 0.5s ease 1.3s',
            }}
          >
            <svg width="80" height="80" viewBox="0 0 100 100">
              <path
                d="M50 15c12-1 28 5 33 22 5 17-6 36-23 40-17 4-37-10-38-28-1-18 11-32 28-34"
                fill="none"
                stroke="#f6f1e6"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
              />
              <path
                className="cross-line line-1"
                d="M35 37c8 6 22 19 30 26"
                fill="none"
                stroke="#f6f1e6"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.8"
                style={{ transformOrigin: 'center', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
              <path
                className="cross-line line-2"
                d="M65 37c-7 8-23 20-30 26"
                fill="none"
                stroke="#f6f1e6"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.8"
                style={{ transformOrigin: 'center', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
              />
            </svg>
          </div>

          {/* Content Container */}
          <div style={{
            maxWidth: '1000px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '40px',
            transform: showAboutPopup ? 'translateY(0)' : 'translateY(60px)',
            opacity: showAboutPopup ? 1 : 0,
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.8s',
          }}>
            {/* Hero Name Section with Integrated Profile Image */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '40px',
              position: 'relative',
            }}>
              <div style={{ position: 'relative' }}>
                <h1 style={{
                  margin: 0,
                  fontSize: '8.5rem',
                  fontFamily: '"Instrument Serif", serif',
                  fontWeight: '400',
                  color: '#f6f1e6',
                  lineHeight: '1',
                  letterSpacing: '-2px',
                  whiteSpace: 'nowrap'
                }}>
                  Hey, I am Suvo
                </h1>

                {/* Refined Hand-drawn Underline specifically under 'Suvo' */}
                <svg
                  style={{ position: 'absolute', bottom: '-10px', left: '55%', width: '45%', height: '30px' }}
                  viewBox="0 0 150 30"
                >
                  <path
                    d="M10 15c20-2 80-5 130 2"
                    fill="none"
                    stroke="#8b4513"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: 200,
                      strokeDashoffset: showAboutPopup ? 0 : 200,
                      transition: 'stroke-dashoffset 1s ease 1.2s'
                    }}
                  />
                  <path
                    d="M15 22c30 1 70-2 120-1"
                    fill="none"
                    stroke="#8b4513"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.5"
                    style={{
                      strokeDasharray: 200,
                      strokeDashoffset: showAboutPopup ? 0 : 200,
                      transition: 'stroke-dashoffset 1s ease 1.4s'
                    }}
                  />
                </svg>
              </div>

              {/* Profile Image - Sticker Mode */}
              <div style={{
                position: 'relative',
                width: '150px',
                height: '150px',
                flexShrink: 0,
                transform: showAboutPopup ? 'rotate(-2deg) scale(1)' : 'rotate(-10deg) scale(0.8)',
                opacity: showAboutPopup ? 1 : 0,
                transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1s',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '8px',
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(42, 27, 18, 0.08)',
                  borderRadius: '24px',
                  zIndex: 0
                }} />
                <div style={{
                  position: 'absolute',
                  top: '4px',
                  left: '4px',
                  width: '100%',
                  height: '100%',
                  border: '2.5px solid #d4a574',
                  borderRadius: '24px',
                  zIndex: 1
                }} />
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#ffffff',
                  padding: '7px',
                  borderRadius: '24px',
                  border: '2.5px solid #c9b896',
                  zIndex: 2,
                  boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '17px',
                    overflow: 'hidden',
                  }}>
                    <img
                      src="/profile_new.jpg"
                      alt="Suvo"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '40px',
              fontFamily: '"Bricolage Grotesque", sans-serif',
              fontSize: '1.4rem',
              lineHeight: '1.6',
              color: '#e8dcc8',
              fontWeight: '400',
              padding: '0 60px',
              maxWidth: '850px',
              letterSpacing: '0.01em',
              opacity: showAboutPopup ? 1 : 0,
              transform: showAboutPopup ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.8s ease 1.1s',
              textAlign: 'center'
            }}>
              A <strong style={{ color: '#d4a574', fontWeight: '600' }}>full-stack web developer</strong> focused on building scalable, efficient, and user-centric web applications. I work across both frontend and backend, translating product requirements into reliable, production-ready solutions.
            </div>
          </div>

          {/* Down Arrow Indicator */}
          <div style={{
            position: 'absolute',
            bottom: '50px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: showAboutPopup ? 0.7 : 0,
            transition: 'opacity 0.8s ease 1.5s',
            zIndex: 20
          }} className="animate-bounce">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f6f1e6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          function updateMobileUI() {
            var isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
            var controls = document.getElementById('mobile-controls');
            var joystick = document.getElementById('mobile-joystick');
            var lookHint = document.querySelector('.mobile-look-hint');
            var moveHint = document.querySelector('.mobile-move-hint');
            
            if (controls) controls.style.display = isMobile ? 'block' : 'none';
            if (joystick) joystick.style.display = isMobile ? 'flex' : 'none';
            if (lookHint) lookHint.style.display = isMobile ? 'flex' : 'none';
            if (moveHint) moveHint.style.display = isMobile ? 'block' : 'none';
          }
          
          window.addEventListener('resize', updateMobileUI);
          window.addEventListener('load', updateMobileUI);
          updateMobileUI();
        })();
      `}} />
    </div >
  );
};
