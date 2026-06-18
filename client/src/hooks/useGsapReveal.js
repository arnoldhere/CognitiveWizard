import { useEffect } from "react";
import { gsap } from "gsap";

export function useGsapReveal(ref, options = {}) {
  useEffect(() => {
    if (!ref.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-reveal]",
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: options.duration ?? 0.65,
          ease: "power3.out",
          stagger: options.stagger ?? 0.08,
          delay: options.delay ?? 0,
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [ref, options.delay, options.duration, options.stagger]);
}
