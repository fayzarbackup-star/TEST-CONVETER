async function testUploadTrigger() {
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
    // Click upload button
    const clickRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const btn = document.querySelector('button[aria-label*="Upload"], button[aria-label*="আপলোড"]');
          if (btn) {
            btn.click();
            return "Clicked upload button";
          }
          return "Upload button not found";
        })()
      `,
      returnByValue: true
    });
    console.log(clickRes);

    await new Promise(r => setTimeout(r, 1000));

    // Check if input[type=file] appeared
    const inputsRes = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return Array.from(document.querySelectorAll('input[type="file"]')).map(i => ({
            id: i.id,
            className: i.className,
            accept: i.accept
          }));
        })()
      `,
      returnByValue: true
    });
    console.log('File inputs after click:', inputsRes);
    ws.close();
  };
}

testUploadTrigger().catch(console.error);
