import { useEffect } from 'react';

/**
 * useIntegrityMonitor
 * Comprehensive exam anti-cheating monitor:
 * 1. Tab switches / window minimizing via Page Visibility API.
 * 2. Blocks text copying (Ctrl+C, Cmd+C, copy event) and logs violation.
 * 3. Blocks cutting (Ctrl+X, Cmd+X, cut event).
 * 4. Blocks pasting external text (Ctrl+V, Cmd+V, paste event).
 * 5. Disables right-click context menu.
 * 6. Blocks developer tools / view-source shortcuts (F12, Ctrl+Shift+I, Ctrl+U).
 */
export function useIntegrityMonitor(isActive, onIntegrityEvent, showToast) {
  useEffect(() => {
    if (!isActive) return;

    // 1. Tab switch / Window minimize detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onIntegrityEvent({
          type: 'tab_switch',
          details: 'Student switched tabs or minimized exam window',
          time: new Date().toLocaleTimeString(),
        });
      }
    };

    // 2. Prevent Copy (Ctrl+C, right-click copy, or copy menu)
    const handleCopy = (e) => {
      e.preventDefault();
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', '');
      }
      if (showToast) {
        showToast('⚠️ Copying exam questions is strictly prohibited and logged!');
      }
      onIntegrityEvent({
        type: 'copy_attempt',
        details: 'Attempted to copy exam content',
        time: new Date().toLocaleTimeString(),
      });
    };

    // 3. Prevent Cut (Ctrl+X)
    const handleCut = (e) => {
      e.preventDefault();
      if (showToast) {
        showToast('⚠️ Cutting exam content is disabled!');
      }
      onIntegrityEvent({
        type: 'cut_attempt',
        details: 'Attempted to cut exam text',
        time: new Date().toLocaleTimeString(),
      });
    };

    // 4. Prevent Paste (Ctrl+V)
    const handlePaste = (e) => {
      e.preventDefault();
      if (showToast) {
        showToast('⚠️ Pasting external text during the exam is strictly prohibited!');
      }
      onIntegrityEvent({
        type: 'paste_attempt',
        details: 'Attempted to paste external content into exam',
        time: new Date().toLocaleTimeString(),
      });
    };

    // 5. Prevent Right-Click Context Menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      if (showToast) {
        showToast('⚠️ Right-click context menu is disabled during the exam.');
      }
    };

    // 6. Prevent Keyboard Shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+U, F12, Ctrl+Shift+I)
    const handleKeyDown = (e) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      // Copy: Ctrl+C / Cmd+C
      if (isCtrlOrCmd && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        if (showToast) {
          showToast('⚠️ Copy shortcut (Ctrl+C) is disabled!');
        }
        onIntegrityEvent({
          type: 'copy_shortcut_attempt',
          details: 'Used keyboard shortcut (Ctrl+C) to copy exam content',
          time: new Date().toLocaleTimeString(),
        });
        return;
      }

      // Paste: Ctrl+V / Cmd+V
      if (isCtrlOrCmd && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        if (showToast) {
          showToast('⚠️ Paste shortcut (Ctrl+V) is disabled!');
        }
        onIntegrityEvent({
          type: 'paste_shortcut_attempt',
          details: 'Used keyboard shortcut (Ctrl+V) to paste content',
          time: new Date().toLocaleTimeString(),
        });
        return;
      }

      // Cut: Ctrl+X / Cmd+X
      if (isCtrlOrCmd && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
        return;
      }

      // View Source: Ctrl+U
      if (isCtrlOrCmd && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        if (showToast) {
          showToast('⚠️ Viewing page source is disabled.');
        }
        return;
      }

      // Print: Ctrl+P
      if (isCtrlOrCmd && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (showToast) {
          showToast('⚠️ Printing exam content is disabled.');
        }
        return;
      }

      // DevTools: F12 or Ctrl+Shift+I / Ctrl+Shift+J
      if (
        e.key === 'F12' ||
        (isCtrlOrCmd && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j'))
      ) {
        e.preventDefault();
        if (showToast) {
          showToast('⚠️ Developer inspection tools are strictly disabled!');
        }
        onIntegrityEvent({
          type: 'devtools_shortcut_attempt',
          details: 'Attempted to open browser developer tools',
          time: new Date().toLocaleTimeString(),
        });
        return;
      }
    };

    // Attach listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onIntegrityEvent, showToast]);
}
