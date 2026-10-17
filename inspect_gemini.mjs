async function inspectGemini() {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await res.json();
  const geminiTab = tabs.find(t => t.url.includes('gemini.google.com'));

  const ws = new WebSocket(geminiTab.webSocketDebuggerUrl);
  
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const id = Math.floor(Math.random() * 100000);
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onopen = async () => {
    // 1. Inspect file inputs
    const fileInputs = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const inputs = Array.from(document.querySelectorAll('input[type="file"]')).map(i => ({
            id: i.id,
            className: i.className,
            accept: i.accept
          }));
          const buttons = Array.from(document.querySelectorAll('button')).map(b => ({
            ariaLabel: b.getAttribute('aria-label'),
            text: b.innerText?.trim()
          })).filter(b => b.ariaLabel || b.text);
          const textbox = document.querySelector('div[contenteditable="true"], rich-textarea, textarea');
          return {
            fileInputs: inputs,
            textboxTag: textbox ? textbox.tagName : null,
            buttons: buttons.slice(0, 15)
          };
        })()
      `,
      returnByValue: true
    });

    console.log('Gemini Elements:', JSON.stringify(fileInputs.result.value, null, 2));
    ws.close();
  };
}

inspectGemini().catch(console.error);
