import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { sfx } from '@/lib/sfx';

interface PlayerProps {
  isDoorOpen: boolean;
  onRoomReached?: () => void;
  isAboutOpen?: boolean;
  isUiOverlayOpen?: boolean;
  controlScheme?: 'arrows' | 'wasd' | 'both';
}

export const Player: React.FC<PlayerProps> = ({ isDoorOpen, onRoomReached, isAboutOpen, isUiOverlayOpen = false, controlScheme = 'both' }) => {
  const { camera, gl } = useThree();

  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);

  const rotation = useRef({ yaw: 0, pitch: 0 });
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });

  // Touch/joystick state for mobile
  const joystickRef = useRef<{ active: boolean; startX: number; startY: number; currentX: number; currentY: number; touchId: number | null }>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    touchId: null
  });
  const lookTouchRef = useRef<{ active: boolean; touchId: number | null; lastX: number; lastY: number }>({
    active: false,
    touchId: null,
    lastX: 0,
    lastY: 0
  });

  // Shifted position constants - now -3.3 for the far left corner
  const xOffset = -3.3;
  const hallMargin = 0.5;

  useEffect(() => {
    const beginInteraction = () => {
      sfx.prime();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isUiOverlayOpen) return;
      beginInteraction();
      const allowArrows = controlScheme === 'arrows' || controlScheme === 'both';
      const allowWasd = controlScheme === 'wasd' || controlScheme === 'both';
      switch (event.code) {
        case 'ArrowUp': if (allowArrows) moveForward.current = true; break;
        case 'ArrowLeft': if (allowArrows) moveLeft.current = true; break;
        case 'ArrowDown': if (allowArrows) moveBackward.current = true; break;
        case 'ArrowRight': if (allowArrows) moveRight.current = true; break;
        case 'KeyW': if (allowWasd) moveForward.current = true; break;
        case 'KeyA': if (allowWasd) moveLeft.current = true; break;
        case 'KeyS': if (allowWasd) moveBackward.current = true; break;
        case 'KeyD': if (allowWasd) moveRight.current = true; break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowUp': moveForward.current = false; break;
        case 'ArrowLeft': moveLeft.current = false; break;
        case 'ArrowDown': moveBackward.current = false; break;
        case 'ArrowRight': moveRight.current = false; break;
        case 'KeyW': moveForward.current = false; break;
        case 'KeyA': moveLeft.current = false; break;
        case 'KeyS': moveBackward.current = false; break;
        case 'KeyD': moveRight.current = false; break;
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (isUiOverlayOpen) return;
      if (e.button !== 0) return;
      beginInteraction();
      isDragging.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
      gl.domElement.setPointerCapture?.(e.pointerId);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isUiOverlayOpen) return;
      beginInteraction();
      isDragging.current = true;
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;
      const sensitivity = 0.005;
      rotation.current.yaw -= deltaX * sensitivity;
      rotation.current.pitch -= deltaY * sensitivity;
      rotation.current.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotation.current.pitch));
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;
      const sensitivity = 0.005;
      rotation.current.yaw -= deltaX * sensitivity;
      rotation.current.pitch -= deltaY * sensitivity;
      rotation.current.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotation.current.pitch));
      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = () => { isDragging.current = false; };
    const handleMouseUp = () => { isDragging.current = false; };

    // === MOBILE TOUCH CONTROLS ===
    const isMobile = () => window.innerWidth < 768 || 'ontouchstart' in window;

    // Joystick touch handlers (left side of screen)
    const handleJoystickStart = (e: TouchEvent) => {
      if (isUiOverlayOpen) return;
      const touch = e.changedTouches[0];
      // Only respond to touches on left 40% of screen
      if (touch.clientX > window.innerWidth * 0.4) return;
      
      beginInteraction();
      joystickRef.current.active = true;
      joystickRef.current.touchId = touch.identifier;
      joystickRef.current.startX = touch.clientX;
      joystickRef.current.startY = touch.clientY;
      joystickRef.current.currentX = touch.clientX;
      joystickRef.current.currentY = touch.clientY;
    };

    const handleJoystickMove = (e: TouchEvent) => {
      if (!joystickRef.current.active) return;
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickRef.current.touchId) {
          joystickRef.current.currentX = touch.clientX;
          joystickRef.current.currentY = touch.clientY;
        }
      }
    };

    const handleJoystickEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === joystickRef.current.touchId) {
          joystickRef.current.active = false;
          joystickRef.current.touchId = null;
        }
      }
    };

    // Look touch handlers (right side of screen)
    const handleLookStart = (e: TouchEvent) => {
      if (isUiOverlayOpen) return;
      const touch = e.changedTouches[0];
      // Only respond to touches on right 60% of screen
      if (touch.clientX < window.innerWidth * 0.4) return;
      
      beginInteraction();
      lookTouchRef.current.active = true;
      lookTouchRef.current.touchId = touch.identifier;
      lookTouchRef.current.lastX = touch.clientX;
      lookTouchRef.current.lastY = touch.clientY;
    };

    const handleLookMove = (e: TouchEvent) => {
      if (!lookTouchRef.current.active) return;
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchRef.current.touchId) {
          const deltaX = touch.clientX - lookTouchRef.current.lastX;
          const deltaY = touch.clientY - lookTouchRef.current.lastY;
          const sensitivity = 0.008;
          
          rotation.current.yaw -= deltaX * sensitivity;
          rotation.current.pitch -= deltaY * sensitivity;
          rotation.current.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, rotation.current.pitch));
          
          lookTouchRef.current.lastX = touch.clientX;
          lookTouchRef.current.lastY = touch.clientY;
        }
      }
    };

    const handleLookEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === lookTouchRef.current.touchId) {
          lookTouchRef.current.active = false;
          lookTouchRef.current.touchId = null;
        }
      }
    };

    gl.domElement.style.touchAction = 'none';
    gl.domElement.style.cursor = 'grab';

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    gl.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('pointercancel', handlePointerUp);
    
    // Mobile touch events
    gl.domElement.addEventListener('touchstart', handleJoystickStart, { passive: true });
    gl.domElement.addEventListener('touchstart', handleLookStart, { passive: true });
    window.addEventListener('touchmove', handleJoystickMove, { passive: true });
    window.addEventListener('touchmove', handleLookMove, { passive: true });
    window.addEventListener('touchend', handleJoystickEnd, { passive: true });
    window.addEventListener('touchend', handleLookEnd, { passive: true });
    window.addEventListener('touchcancel', handleJoystickEnd, { passive: true });
    window.addEventListener('touchcancel', handleLookEnd, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      gl.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      gl.domElement.style.touchAction = '';
      gl.domElement.style.cursor = '';
      
      // Mobile touch events cleanup
      gl.domElement.removeEventListener('touchstart', handleJoystickStart);
      gl.domElement.removeEventListener('touchstart', handleLookStart);
      window.removeEventListener('touchmove', handleJoystickMove);
      window.removeEventListener('touchmove', handleLookMove);
      window.removeEventListener('touchend', handleJoystickEnd);
      window.removeEventListener('touchend', handleLookEnd);
      window.removeEventListener('touchcancel', handleJoystickEnd);
      window.removeEventListener('touchcancel', handleLookEnd);
    };
  }, [gl, isUiOverlayOpen, controlScheme]);

  const hasTransitioned = useRef(false);
  const isAutoMoving = useRef(false);
  const transitionStage = useRef(0); // 0: through door, 1: to center
  const wasAboutOpen = useRef(false);
  const shouldRotateToDesk = useRef(false);

  useEffect(() => {
    if (wasAboutOpen.current && !isAboutOpen) {
      // About page was just closed
      shouldRotateToDesk.current = true;
      isDragging.current = false;
    }
    wasAboutOpen.current = !!isAboutOpen;
  }, [isAboutOpen]);

  useEffect(() => {
    if (isUiOverlayOpen) {
      isDragging.current = false;
      moveForward.current = false;
      moveBackward.current = false;
      moveLeft.current = false;
      moveRight.current = false;
    }
  }, [isUiOverlayOpen]);

  useFrame((state, delta) => {
    // === CAMERA LOCK REMOVED ===
    // User can now look around freely in the hallway

    // === ROTATION TO 1ST WALL AFTER ABOUT PAGE ===
    if (shouldRotateToDesk.current) {
      const targetYaw = Math.PI / 2; // Face the monitor (left wall)
      const targetPitch = 0;

      rotation.current.yaw = THREE.MathUtils.lerp(rotation.current.yaw, targetYaw, delta * 3);
      rotation.current.pitch = THREE.MathUtils.lerp(rotation.current.pitch, targetPitch, delta * 3);

      // Stop rotating when close enough or if user starts dragging
      if (Math.abs(rotation.current.yaw - targetYaw) < 0.05 && Math.abs(rotation.current.pitch - targetPitch) < 0.05) {
        shouldRotateToDesk.current = false;
        rotation.current.yaw = targetYaw; // Snapping to finish
      }
      if (isDragging.current) {
        shouldRotateToDesk.current = false;
      }
    }

    // === INSTANT TELEPORT TO ROOM CENTER ===
    if (isDoorOpen && !hasTransitioned.current) {
      // Teleport instantly to room center
      camera.position.set(0, 1.7, -7.5);
      rotation.current.yaw = 0;
      rotation.current.pitch = 0;
      hasTransitioned.current = true;
      isAutoMoving.current = false;
      // Trigger callback immediately
      onRoomReached?.();
    }

    // Apply rotation
    const euler = new THREE.Euler(rotation.current.pitch, rotation.current.yaw, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    // Disable manual movement if auto-moving
    if (!isAutoMoving.current) {
      const speed = 4 * delta;
      const frontVector = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.current.yaw);
      const sideVector = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.current.yaw);

      if (moveForward.current) camera.position.addScaledVector(frontVector, speed);
      if (moveBackward.current) camera.position.addScaledVector(frontVector, -speed);
      if (moveLeft.current) camera.position.addScaledVector(sideVector, -speed);
      if (moveRight.current) camera.position.addScaledVector(sideVector, speed);

      // === JOYSTICK MOVEMENT (MOBILE) ===
      if (joystickRef.current.active) {
        const deadzone = 15;
        const maxRange = 60;
        
        const dx = joystickRef.current.currentX - joystickRef.current.startX;
        const dy = joystickRef.current.currentY - joystickRef.current.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > deadzone) {
          // Normalize and apply speed multiplier
          const normalizedX = dx / Math.min(dist, maxRange);
          const normalizedY = dy / Math.min(dist, maxRange);
          const moveSpeed = (Math.min(dist, maxRange) / maxRange) * speed * 1.5;
          
          // Forward/backward based on Y (inverted)
          if (Math.abs(normalizedY) > 0.3) {
            camera.position.addScaledVector(frontVector, -normalizedY * moveSpeed * 1.5);
          }
          // Left/right based on X
          if (Math.abs(normalizedX) > 0.3) {
            camera.position.addScaledVector(sideVector, normalizedX * moveSpeed * 1.5);
          }
        }
      }
    }

    camera.position.y = 1.7;

    // === SUBTLE SHAKE & ZOOM IN HALLWAY ===
    if (camera.position.z > -4.2) {
      const time = state.clock.getElapsedTime();
      // Noticeable but subtle up-down micro-shake
      camera.position.y += Math.sin(time * 12.0) * 0.008;

      // Subtle zoom in/out effect (FOV modulation)
      const fovBase = 60;
      const zoomAmount = Math.sin(time * 0.8) * 1.5; // Very slow and gentle
      (camera as THREE.PerspectiveCamera).fov = fovBase + zoomAmount;
      (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
    } else {
      // Reset FOV when entering the room
      if ((camera as THREE.PerspectiveCamera).fov !== 60) {
        (camera as THREE.PerspectiveCamera).fov = 60;
        (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
      }
    }

    // === COLLISION & BOUNDARY LOGIC ===
    if (!isAutoMoving.current) {
      const isInsideRoom = camera.position.z < -4.2;

      if (isInsideRoom) {
        // Room boundaries (8x8 room centered at z = -8, so x from -4 to 4)
        if (camera.position.x < -3.5) camera.position.x = -3.5;
        if (camera.position.x > 3.5) camera.position.x = 3.5;
        if (camera.position.z < -11.5) camera.position.z = -11.5;

        // Entrance wall collision (z = -4.2 is the threshold for being "inside")
        if (camera.position.z > -4.2) {
          // Allow passage only through the door hole centered at xOffset (-3.3) IF door is open
          if (!isDoorOpen || Math.abs(camera.position.x - xOffset) > 0.4) {
            camera.position.z = -4.2;
          }
        }
      } else {
        // Hallway bounds centered at xOffset (-3.3)
        if (camera.position.x < xOffset - hallMargin) camera.position.x = xOffset - hallMargin;
        if (camera.position.x > xOffset + hallMargin) camera.position.x = xOffset + hallMargin;
        if (camera.position.z > -0.5) camera.position.z = -0.5;

        // Transition back into the room attempt
        if (camera.position.z < -3.6) {
          if (!isDoorOpen || Math.abs(camera.position.x - xOffset) > 0.4) {
            camera.position.z = -3.6;
          }
        }
      }
    }
  });

  return null;
};
