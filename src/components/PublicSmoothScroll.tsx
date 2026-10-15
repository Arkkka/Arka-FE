import { cancelFrame, frame, useReducedMotion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ReactLenis, useLenis } from 'lenis/react';
import 'lenis/dist/lenis.css';
import { useEffect, type ReactNode } from 'react';

gsap.registerPlugin(ScrollTrigger);

function PublicScrollRuntime() {
  const lenis = useLenis(() => ScrollTrigger.update());

  useEffect(() => {
    if (!lenis) return;
    const updateFrame = ({ timestamp }: { timestamp: number }) => lenis.raf(timestamp);
    frame.update(updateFrame, true);
    return () => cancelFrame(updateFrame);
  }, [lenis]);

  return null;
}

export function PublicSmoothScroll({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return children;

  return (
    <ReactLenis
      options={{
        anchors: true,
        autoRaf: false,
        duration: 1.05,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.85,
      }}
      root
    >
      <PublicScrollRuntime />
      {children}
    </ReactLenis>
  );
}
