"use client";
import { cn } from "../../lib/utils";
import React, { useRef, useState, useEffect } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  animate,
  useVelocity,
  useAnimationControls,
} from "motion/react";

export const DraggableCardBody = ({
  className,
  children,
  onPositionChange,
  initialX = 0,
  initialY = 0,
  style = {},
}) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const dragX = useMotionValue(initialX);
  const dragY = useMotionValue(initialY);
  const cardRef = useRef(null);
  const controls = useAnimationControls();
  const isMountedRef = useRef(false);
  const [constraints, setConstraints] = useState({
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });

  // Physics configuration for smooth dragging and bouncing
  const velocityX = useVelocity(mouseX);
  const velocityY = useVelocity(mouseY);

  const springConfig = {
    stiffness: 100,
    damping: 20,
    mass: 0.5,
  };

  // Tilt effects based on mouse position
  const rotateX = useSpring(
    useTransform(mouseY, [-300, 300], [25, -25]),
    springConfig,
  );
  const rotateY = useSpring(
    useTransform(mouseX, [-300, 300], [-25, 25]),
    springConfig,
  );

  // Opacity and glare effects for depth
  const opacity = useSpring(
    useTransform(mouseX, [-300, 0, 300], [0.8, 1, 0.8]),
    springConfig,
  );

  const glareOpacity = useSpring(
    useTransform(mouseX, [-300, 0, 300], [0.2, 0, 0.2]),
    springConfig,
  );

  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;

    // Set initial position for drag motion values
    dragX.set(initialX);
    dragY.set(initialY);

    // Update drag constraints when component mounts or window resizes
    const updateConstraints = () => {
      if (typeof window !== "undefined") {
        setConstraints({
          top: -window.innerHeight / 2,
          left: -window.innerWidth / 2,
          right: window.innerWidth / 2,
          bottom: window.innerHeight / 2,
        });
      }
    };

    updateConstraints();

    // Add resize listener for responsive constraints
    window.addEventListener("resize", updateConstraints);

    // Cleanup event listener and mark as unmounted
    return () => {
      isMountedRef.current = false;
      window.removeEventListener("resize", updateConstraints);
    };
  }, [initialX, initialY]);

  // Handle mouse movement for tilt effect
  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { width, height, left, top } =
      cardRef.current?.getBoundingClientRect() ?? {
        width: 0,
        height: 0,
        left: 0,
        top: 0,
      };
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    mouseX.set(deltaX);
    mouseY.set(deltaY);
  };

  // Reset tilt when mouse leaves
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      drag
      dragConstraints={constraints}
      x={dragX}
      y={dragY}
      onDragStart={() => {
        document.body.style.cursor = "grabbing";
      }}
      onDragEnd={(event, info) => {
        document.body.style.cursor = "default";

        // Update motion values to maintain position
        dragX.set(info.point.x);
        dragY.set(info.point.y);

        // Notify parent of position change
        if (onPositionChange) {
          onPositionChange(info.point.x, info.point.y);
        }

        // Reset rotation after drag (only if component is still mounted)
        if (isMountedRef.current) {
          controls.start({
            rotateX: 0,
            rotateY: 0,
            transition: {
              type: "spring",
              ...springConfig,
            },
          });
        }

        // Calculate velocity for bounce effect
        const currentVelocityX = velocityX.get();
        const currentVelocityY = velocityY.get();

        const velocityMagnitude = Math.sqrt(
          currentVelocityX * currentVelocityX +
            currentVelocityY * currentVelocityY,
        );
        const bounce = Math.min(0.8, velocityMagnitude / 1000);

        // Animate bounce effect
        animate(info.point.x, info.point.x + currentVelocityX * 0.3, {
          duration: 0.8,
          ease: [0.2, 0, 0, 1],
          bounce,
          type: "spring",
          stiffness: 50,
          damping: 15,
          mass: 0.8,
        });

        animate(info.point.y, info.point.y + currentVelocityY * 0.3, {
          duration: 0.8,
          ease: [0.2, 0, 0, 1],
          bounce,
          type: "spring",
          stiffness: 50,
          damping: 15,
          mass: 0.8,
        });
      }}
      style={{
        rotateX,
        rotateY,
        opacity,
        willChange: "transform",
        ...style,
      }}
      animate={controls}
      whileHover={{ scale: 1.02 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative min-h-96 w-80 overflow-hidden rounded-md bg-neutral-100 p-6 shadow-2xl transform-3d dark:bg-neutral-900",
        className,
      )}
    >
      {children}
      <motion.div
        style={{
          opacity: glareOpacity,
        }}
        className="pointer-events-none absolute inset-0 bg-white select-none"
      />
    </motion.div>
  );
};

export const DraggableCardContainer = ({
  className,
  children,
}) => {
  return (
    <div className={cn("[perspective:3000px]", className)}>{children}</div>
  );
};