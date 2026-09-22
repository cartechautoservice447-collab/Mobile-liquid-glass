import { useCallback, useEffect, useRef } from 'react';

/**
 * Tracks glass cards, panels, bottom dock, and modals in the DOM and produces
 * bounding boxes formatted for the WebGL exact physical liquid glass shader.
 */
export function useGlassBoxTracker(isModalOpen = false) {
  const cachedBoxesRef = useRef([]);
  const isDirtyRef = useRef(true);
  const lastScrollYRef = useRef(-1);

  const measureBoxes = useCallback(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return [];

    const list = [];
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    const pushBox = (id, el, forcedRadius = null, forcedBezel = null) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 10 || rect.height <= 10) return;

      // Filter out boxes completely outside the viewport
      if (rect.bottom < -40 || rect.top > winHeight + 40 || rect.right < -40 || rect.left > winWidth + 40) {
        return;
      }

      // Check if another box already occupies almost the exact same screen area to prevent duplicate overlays
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      const duplicate = list.some(
        (b) => Math.abs(b.x - cx) < 10 && Math.abs(b.y - cy) < 10 && Math.abs(b.w - rect.width) < 16 && Math.abs(b.h - rect.height) < 16
      );
      if (duplicate) return;

      let r = forcedRadius;
      if (r === null) {
        const computed = window.getComputedStyle(el);
        const br = parseFloat(computed.borderRadius) || 20;
        r = Math.min(br, Math.min(rect.width * 0.5, rect.height * 0.5));
      }

      const calculatedBezel = forcedBezel !== null
        ? forcedBezel
        : Math.min(24, Math.min(rect.width * 0.25, rect.height * 0.25));

      list.push({
        id,
        x: cx,
        y: cy,
        w: rect.width,
        h: rect.height,
        r,
        bezel: calculatedBezel,
      });
    };

    // If modal is open, track modal elements with top priority and ignore background items
    const modalEl = document.querySelector('.engine-settings-modal, .glass-modal, .course-create-modal, [role="dialog"]');
    if (modalEl) {
      pushBox('active-modal', modalEl, null, 30);
      cachedBoxesRef.current = list;
      isDirtyRef.current = false;
      lastScrollYRef.current = window.scrollY;
      return list;
    }

    // Fixed bottom dock / navigation bar
    const dockEl = document.getElementById('dock') || document.querySelector('.mobile-dock, .dock-container, .dashboard-bottom-nav, nav[aria-label="Navigation"], footer.app-dock');
    if (dockEl) {
      pushBox('dock', dockEl, null, 28);
    }

    // Header glass (if on dashboard or top header)
    const headerEl = document.querySelector('.dashboard-header, .feature-header');
    if (headerEl) {
      pushBox('header', headerEl, null, 24);
    }

    // Action cards
    const actionCards = document.querySelectorAll('.action-card, .quick-actions > button');
    actionCards.forEach((card, idx) => {
      pushBox(`action-${idx}`, card, null, 22);
    });

    // Progress snapshot & Recent notes cards
    const progressSnapshot = document.querySelector('.dashboard-progress-snapshot');
    if (progressSnapshot) {
      pushBox('progress-snapshot', progressSnapshot, null, 24);
    }

    const recentNotes = document.querySelector('.dashboard-recent-notes');
    if (recentNotes) {
      pushBox('recent-notes', recentNotes, null, 24);
    }

    // Add course trigger
    const addCourseTrigger = document.querySelector('.add-course-trigger');
    if (addCourseTrigger) {
      pushBox('add-course', addCourseTrigger, null, 20);
    }

    // Course dashboard cards (measure the interactive button surface .course-open or the card)
    const courseCards = document.querySelectorAll('.course-dashboard-card .course-open, .course-dashboard-card:not(:has(.course-open))');
    courseCards.forEach((card, idx) => {
      pushBox(`course-card-${idx}`, card, null, 24);
    });

    // Course tools, folder cards, notes, overview cards
    const toolCards = document.querySelectorAll('.course-tool-folder, .course-folder-card, .collection-note-card, .planner-item-card, .overview-stat, .overview-card, .overview-hero');
    toolCards.forEach((card, idx) => {
      pushBox(`tool-card-${idx}`, card, null, 22);
    });

    // Only if no child tool cards / course cards are tracked on the screen, track full panels
    if (toolCards.length === 0 && courseCards.length === 0) {
      const panels = document.querySelectorAll('.full-glass-panel, .course-workspace-panel, .course-folder-panel, .editor-workspace-shell');
      panels.forEach((panel, idx) => {
        pushBox(`panel-${idx}`, panel, null, 26);
      });
    }

    // Any other explicitly tagged elements with data-glass="true"
    const customGlass = document.querySelectorAll('[data-glass="true"], .liquid-glass-surface');
    customGlass.forEach((el, idx) => {
      pushBox(`glass-item-${idx}`, el, null, 22);
    });

    cachedBoxesRef.current = list;
    isDirtyRef.current = false;
    lastScrollYRef.current = window.scrollY;
    return list;
  }, []);

  const getBoxes = useCallback(() => {
    return measureBoxes();
  }, [measureBoxes]);

  useEffect(() => {
    isDirtyRef.current = true;
    measureBoxes();

    const onScroll = () => {
      isDirtyRef.current = true;
    };

    const onResize = () => {
      isDirtyRef.current = true;
      measureBoxes();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    // Mutation observer to detect changes in card list or modals
    const observer = new MutationObserver(() => {
      isDirtyRef.current = true;
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: false });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      observer.disconnect();
    };
  }, [measureBoxes, isModalOpen]);

  return getBoxes;
}
