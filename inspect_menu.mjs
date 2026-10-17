async function inspectMenu() {
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
    const menuItems = await send('Runtime.evaluate', {
      expression: `
        (() => {
          return Array.from(document.querySelectorAll('[role="menuitem"], [role="option"], mat-list-item, .mat-mdc-menu-item, button')).map(el => ({
            role: el.getAttribute('role'),
            text: el.innerText?.trim(),
            ariaLabel: el.getAttribute('aria-label')
          })).filter(x => x.text && (x.text.toLowerCase().includes('file') || x.text.toLowerCase().includes('upload') || x.text.includes('ফাইল')));
        })()
      `,
      returnByValue: true
    });
    console.log('Menu items:', JSON.stringify(menuItems.result.value, null, 2));
    ws.close();
  };
}

inspectMenu().catch(console.error);
