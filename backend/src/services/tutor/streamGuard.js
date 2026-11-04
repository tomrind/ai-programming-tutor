/**
 * Haelt Code zurueck, bis er vollstaendig vorliegt:
 *  - Codebloecke (```) bis zum schliessenden Marker
 *  - Inline-Code (`...`) bis zum schliessenden Backtick
 * Erst dann entscheidet der Filter, ob er ausgegeben wird.
 */
export function createStreamGuard({ onEmit, onBlock, onInline }) {
  let buffer = '';
  let mode = 'text'; // 'text' | 'fence' | 'inline'
  const MAX_INLINE = 200;

  function process() {
    while (true) {
      if (mode === 'text') {
        const i = buffer.indexOf('`');
        if (i === -1) {
          if (buffer) { onEmit(buffer); buffer = ''; }
          return;
        }
        if (i > 0) { onEmit(buffer.slice(0, i)); buffer = buffer.slice(i); }
        // Zu kurz, um ``` von ` zu unterscheiden: weiter warten.
        if (buffer.length < 3 && /^`+$/.test(buffer)) return;
        mode = buffer.startsWith('```') ? 'fence' : 'inline';
        continue;
      }

      if (mode === 'fence') {
        const close = buffer.indexOf('```', 3);
        if (close === -1) return;
        onBlock(buffer.slice(0, close + 3));
        buffer = buffer.slice(close + 3);
        mode = 'text';
        continue;
      }

      // mode === 'inline'
      const close = buffer.indexOf('`', 1);
      const nl = buffer.indexOf('\n');
      if (close !== -1 && (nl === -1 || close < nl)) {
        onInline(buffer.slice(0, close + 1));
        buffer = buffer.slice(close + 1);
        mode = 'text';
        continue;
      }
      if (nl !== -1 || buffer.length > MAX_INLINE) {
        // Nie geschlossen: als normalen Text behandeln.
        const end = nl !== -1 ? nl + 1 : buffer.length;
        onEmit(buffer.slice(0, end));
        buffer = buffer.slice(end);
        mode = 'text';
        continue;
      }
      return;
    }
  }

  return {
    push(token) { buffer += token; process(); },
    flush() {
      if (buffer) {
        if (mode === 'fence') onBlock(buffer);
        else onEmit(buffer);
      }
      buffer = '';
      mode = 'text';
    },
  };
}