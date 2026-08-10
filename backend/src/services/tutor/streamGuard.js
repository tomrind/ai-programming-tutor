/**
 * Haelt Inhalte innerhalb eines Codeblocks zurueck, bis der Block
 * geschlossen ist. Erst dann entscheidet der Filter, ob er ausgegeben
 * wird. Ohne diese Pufferung waere die Loesung fuer einen Moment
 * sichtbar - und genau das soll der Tutor verhindern.
 */
export function createStreamGuard({ onEmit, onBlock }) {
    let buffer = '';
    let inFence = false;
  
    function process() {
        while (true) {
          if (!inFence) {
            const marker = buffer.indexOf('```');
            if (marker === -1) {
              // Die letzten zwei Zeichen zurueckhalten - koennten der
              // Anfang eines Fence-Markers sein.
              const safe = buffer.slice(0, Math.max(0, buffer.length - 2));
              if (safe) { onEmit(safe); buffer = buffer.slice(safe.length); }
              return;
            }
            const before = buffer.slice(0, marker);
            if (before) onEmit(before);
            buffer = buffer.slice(marker);
            inFence = true;
            continue;
          }
    
          // Im Block: schliessenden Marker erst NACH dem oeffnenden suchen.
          const close = buffer.indexOf('```', 3);
          if (close === -1) return;   // Block noch unvollstaendig, weiter puffern
    
          const end = close + 3;
          onBlock(buffer.slice(0, end));
          buffer = buffer.slice(end);
          inFence = false;
        }
      }
  
    return {
      push(token) { buffer += token; process(); },
      flush() {
        if (!buffer) return;
        if (inFence) onBlock(buffer);   // unvollstaendiger Block
        else onEmit(buffer);
        buffer = '';
      },
    };
  }