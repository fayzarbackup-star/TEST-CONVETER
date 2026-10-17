import http from 'http';

async function main() {
  const res = await fetch('http://127.0.0.1:9222/json/list');
  const tabs = await res.json();
  const geminiTab = tabs.find(t => t.url.includes('gemini.google.com'));
  if (!geminiTab) {
    console.log('No Gemini tab found');
    return;
  }
  console.log('Found Gemini Tab:', geminiTab.title, geminiTab.url);

  const ws = new WebSocket(geminiTab.webSocketDebuggerUrl);
  ws.onopen = () => {
    // Check page text / state
    const msg = {
      id: 1,
      method: 'Runtime.evaluate',
      params: {
        expression: 'document.title + " | " + (document.querySelector("div[contenteditable=\'true\'], textarea, [role=\'textbox\']") ? "Input ready" : "Needs sign in or loading")'
      }
    };
    ws.send(JSON.stringify(msg));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id === 1) {
      console.log('Evaluation result:', data.result?.result?.value);
      ws.close();
    }
  };
}

main().catch(console.error);
