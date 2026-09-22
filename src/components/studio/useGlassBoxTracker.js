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

    const pushBox = (id, el, forcedRadius = null, forcedBezel = 45) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 10 || rect.height <= 10) return;

      // Filter out boxes completely outside the viewport
      if (rect.bottom < -40 || rect.top > winHeight + 40 || rect.right < -40 || rect.left > winWidth + 40) {
        return;
      }

      let r = forcedRadius;
      if (r === null) {
        const computed = window.getComputedStyle(el);
        const br = parseFloat(computed.borderRadius) || 24;
        r = Math.min(br, Math.min(rect.width * 0.5, rect.height * 0.5));
      }

      list.push({
        id,
        x: rect.left + rect.width * 0.5,
        y: rect.top + rect.height * 0.5,
        w: rect.width,
        h: rect.height,
        r,
        bezel: forcedBezel,
      });
    };

    // If modal is open, track modal elements with top priority
    const modalEl = document.querySelector('.engine-settings-modal, .glass-modal, .course-create-modal, [role="dialog"]');
    if (modalEl) {
      pushBox('active-modal', modalEl, 32, 55);
    }

    // Fixed bottom dock / navigation bar (gets the sheen animation in the WebGL shader)
    const dockEl = document.getElementById('dock') || document.querySelector('.mobile-dock, .dock-container, nav[aria-label="Navigation"], footer.app-dock');
    if (dockEl) {
      pushBox('dock', dockEl, 30, 50);
    }

    // Header glass
    const headerEl = document.querySelector('.dashboard-header, .feature-header, header.glass-card, .course-workspace-header');
    if (headerEl) {
      pushBox('header', headerEl, 24, 45);
    }

    // Action cards
    const actionCards = document.querySelectorAll('.action-card, .quick-actions > button');
    actionCards.forEach((card, idx) => {
      pushBox(`action-${idx}`, card, 22, 40);
    });

    // Add course trigger
    const addCourseTrigger = document.querySelector('.add-course-trigger');
    if (addCourseTrigger) {
      pushBox('add-course', addCourseTrigger, 20, 38);
    }

    // Course dashboard cards (match both wrapper and course-open button)
    const courseCards = document.querySelectorAll('.course-dashboard-card');
    courseCards.forEach((card, idx) => {
      pushBox(`course-card-${idx}`, card, 24, 45);
    });

    // Course tools, folder cards, notes, milestones
    const toolCards = document.querySelectorAll('.course-tool-folder, .course-folder-card, .collection-note-card, .planner-item-card, .overview-stat, .overview-card, .overview-hero');
    toolCards.forEach((card, idx) => {
      pushBox(`tool-card-${idx}`, card, 20, 42);
    });

    // Full glass panels (e.g. Collections, Course Workspace, Daily Planner, Editor)
    const panels = document.querySelectorAll('.full-glass-panel, .feature-screen section, .course-workspace-panel, .course-folder-panel, .editor-workspace-shell');
    panels.forEach((panel, idx) => {
      pushBox(`panel-${idx}`, panel, 26, 45);
    });

    // Any other explicitly tagged elements: [data-glass], .glass-card, .liquid-card
    const customGlass = document.querySelectorAll('[data-glass="true"], .liquid-glass-surface, .glass-card:not(.course-dashboard-card)');
    customGlass.forEach((el, idx) => {
      // Don't duplicate if already tracked
      if (!list.some(b => Math.abs(b.x - (el.getBoundingClientRect().left + el.getBoundingClientRect().width * 0.5)) < 4 && Math.abs(b.y - (el.getBoundingClientRect().top + el.getBoundingClientRect().height * 0.5)) < 4)) {
        pushBox(`glass-item-${idx}`, el, 20, 40);
      }
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
