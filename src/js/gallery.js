// Infinite scroll handler for gallery rows using WAAPI
document.addEventListener('DOMContentLoaded', () => {
  const rows = document.querySelectorAll('.show-row');
  
  rows.forEach((row, rowIndex) => {
    const scrollContainer = row.querySelector('.show-row-scroll');
    const scrollDirection = rowIndex % 2 === 0 ? 1 : -1; // Alternate direction
    
    // Clone images for seamless loop
    const images = Array.from(scrollContainer.children);
    images.forEach(img => {
      scrollContainer.appendChild(img.cloneNode(true));
    });
    
    // Calculate dimensions first
    const updateDimensions = () => {
      const gap = parseFloat(getComputedStyle(scrollContainer).gap) || 0;
      // Calculate total width of one set (original images only)
      let setWidth = 0;
      for (let i = 0; i < images.length; i++) {
        setWidth += scrollContainer.children[i].offsetWidth + gap;
      }
      return { setWidth };
    };
    
    let { setWidth } = updateDimensions();
    
    // Start all rows at 0 offset
    // Right-scrolling rows (positive direction) need to start at -setWidth
    // so there's content to the left when scrolling right
    let currentOffset = 0;
    let isDragging = false;
    let startX = 0;
    let startOffset = 0;
    let velocity = 0;
    let lastX = 0;
    let lastTime = Date.now();
    
    // Update transform
    const updateTransform = () => {
      // Safety check to prevent infinite loops
      if (setWidth <= 0) return;
      
      // Normalize offset to keep it looping seamlessly
      // Right-scrolling (positive direction): keep between -setWidth and 0
      // Left-scrolling (negative direction): keep between 0 and setWidth

      // Scrolling right: normalize to -setWidth to 0 range
      while (currentOffset >= 0) {
        currentOffset -= setWidth;
      }
      while (currentOffset < -setWidth) {
        currentOffset += setWidth;
      }
      
      scrollContainer.style.transform = `translateX(${currentOffset}px)`;
    };
    
    // Start auto-scroll animation - uses same transform method as manual scroll
    let animationFrameId = null;
    let animationStartTime = null;
    let isRampingDown = false;
    let rampDownStartTime = null;
    let rampDownStartSpeed = 0;
    let shouldStartAtFullSpeed = false;
    
    const startAutoScroll = (startImmediately = false) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      shouldStartAtFullSpeed = startImmediately;
      const baseScrollSpeed = 9 * scrollDirection; // 30% of 30px/s, with direction
      const rampUpDuration = 2000; // 2 seconds to reach full speed (in ms)
      const rampDownDuration = 2000; // 2 seconds to slow to stop (in ms)
      let lastTime = performance.now();
      animationStartTime = lastTime;
      isRampingDown = false;
      
      const animate = (currentTime) => {
        const deltaTime = (currentTime - lastTime) / 1000; // convert to seconds
        lastTime = currentTime;
        
        let currentSpeed;
        
        if (isRampingDown) {
          // Ramp down to zero
          const elapsed = currentTime - rampDownStartTime;
          const rampFactor = Math.max(0, 1 - (elapsed / rampDownDuration));
          // Use ease-out for smooth deceleration
          const eased = 1 - Math.pow(1 - rampFactor, 3);
          currentSpeed = rampDownStartSpeed * eased;
          
          if (elapsed >= rampDownDuration) {
            // Stop completely
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
            return;
          }
        } else {
          // Ramp up to full speed or start at full speed
          if (shouldStartAtFullSpeed) {
            currentSpeed = baseScrollSpeed;
          } else {
            const elapsed = currentTime - animationStartTime;
            const easeFactor = Math.min(1, elapsed / rampUpDuration);
            // Use ease-in-out cubic for smooth acceleration
            const eased = easeFactor < 0.5 
              ? 4 * easeFactor * easeFactor * easeFactor 
              : 1 - Math.pow(-2 * easeFactor + 2, 3) / 2;
            
            currentSpeed = baseScrollSpeed * eased;
          }
        }
        
        // Update offset exactly like manual scrolling does
        currentOffset -= currentSpeed * deltaTime;
        
        // Use the same updateTransform that manual scrolling uses
        updateTransform();
        
        animationFrameId = requestAnimationFrame(animate);
      };
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    const stopAutoScroll = () => {
      if (animationFrameId && !isRampingDown) {
        // Start ramping down
        isRampingDown = true;
        rampDownStartTime = performance.now();
        // Calculate current speed based on elapsed time
        if (shouldStartAtFullSpeed) {
          rampDownStartSpeed = 9 * scrollDirection;
        } else {
          const elapsed = rampDownStartTime - animationStartTime;
          const easeFactor = Math.min(1, elapsed / 2000);
          const eased = easeFactor < 0.5 
            ? 4 * easeFactor * easeFactor * easeFactor 
            : 1 - Math.pow(-2 * easeFactor + 2, 3) / 2;
          rampDownStartSpeed = 9 * scrollDirection * eased;
        }
      }
    };
    
    // Mouse/touch events
    const handleStart = (e) => {
      const isTouch = e.type.includes('touch');
      startX = isTouch ? e.touches[0].clientX : e.clientX;
      const startY = isTouch ? e.touches[0].clientY : e.clientY;
      
      // Store start position for direction detection
      row.touchStartX = startX;
      row.touchStartY = startY;
      row.isHorizontalSwipe = null;
      
      isDragging = true;
      lastX = startX;
      lastTime = Date.now();
      velocity = 0;
      
      // Stop auto-scroll with ramp down
      stopAutoScroll();
      
      startOffset = currentOffset;
      row.style.cursor = 'grabbing';
    };
    
    const handleMove = (e) => {
      if (!isDragging) return;
      
      const isTouch = e.type.includes('touch');
      const currentX = isTouch ? e.touches[0].clientX : e.clientX;
      const currentY = isTouch ? e.touches[0].clientY : e.clientY;
      
      // For touch, detect swipe direction on first movement
      if (isTouch && row.isHorizontalSwipe === null) {
        const deltaX = Math.abs(currentX - row.touchStartX);
        const deltaY = Math.abs(currentY - row.touchStartY);
        
        // Need some movement to determine direction
        if (deltaX > 5 || deltaY > 5) {
          row.isHorizontalSwipe = deltaX > deltaY;
        }
      }
      
      // For touch, only handle if horizontal swipe detected
      if (isTouch && row.isHorizontalSwipe === false) {
        return;
      }
      
      const diff = currentX - startX;
      const now = Date.now();
      const timeDiff = now - lastTime;
      
      if (timeDiff > 0) {
        velocity = (currentX - lastX) / timeDiff;
      }
      
      lastX = currentX;
      lastTime = now;
      
      // Apply diff with speed cap
      const maxMove = 50; // Max pixels per frame
      const cappedDiff = Math.max(-maxMove, Math.min(maxMove, diff));
      currentOffset = startOffset + cappedDiff;
      updateTransform();
    };
    
    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      row.style.cursor = '';
      
      // Apply momentum
      if (Math.abs(velocity) > 0.1) {
        const momentum = velocity * 200; // Adjust multiplier for feel
        currentOffset += momentum;
        updateTransform();
      }
      
      // Restart auto-scroll after delay with easing
      setTimeout(() => {
        if (!isDragging) {
          ({ setWidth } = updateDimensions());
          startAutoScroll();
        }
      }, 200); // Start after 0.2 seconds
    };
    
    // Add hover listeners to pause/resume
    row.addEventListener('mouseenter', () => {
      if (!isDragging) {
        stopAutoScroll();
      }
    });
    
    row.addEventListener('mouseleave', () => {
      if (!isDragging) {
        setTimeout(() => {
          if (!isDragging) {
            startAutoScroll();
          }
        }, 200);
      }
    });
    
    // Add event listeners
    row.addEventListener('mousedown', handleStart);
    row.addEventListener('mousemove', handleMove);
    row.addEventListener('mouseup', handleEnd);
    row.addEventListener('mouseleave', handleEnd);
    
    row.addEventListener('touchstart', handleStart, { passive: true });
    row.addEventListener('touchmove', (e) => {
      // Prevent default only if horizontal swipe
      if (row.isHorizontalSwipe === true) {
        e.preventDefault();
      }
      handleMove(e);
    }, { passive: false });
    row.addEventListener('touchend', handleEnd);
    
    // Handle horizontal scroll only
    row.addEventListener('wheel', (e) => {
      // Only handle horizontal scroll (deltaX)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        
        // Stop auto-scroll with ramp down
        stopAutoScroll();
        
        currentOffset -= e.deltaX;
        updateTransform();
        
        // Restart auto-scroll after delay with easing
        clearTimeout(row.wheelTimeout);
        row.wheelTimeout = setTimeout(() => {
          ({ setWidth } = updateDimensions());
          startAutoScroll();
        }, 200); // Start after 0.2 seconds
      }
      // Otherwise allow normal vertical scroll
    }, { passive: false });
    
    // Start initial auto-scroll at full speed (no ramp on page load)
    // Wait for images to load before starting
    const startWhenReady = () => {
      ({ setWidth } = updateDimensions());
      if (setWidth > 0) {
        startAutoScroll(true);
      } else {
        // Retry after a short delay if images aren't loaded yet
        setTimeout(startWhenReady, 100);
      }
    };
    
    // Try to start immediately, but will retry if needed
    startWhenReady();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      ({ setWidth } = updateDimensions());
    });
  });
});
