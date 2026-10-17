const APP_TOKEN = process.env.SLACK_APP_TOKEN;

// Socket Mode URLs are single-use, so every (re)connect asks Slack for a fresh one.
async function openConnection() {
  const res = await fetch('https://slack.com/api/apps.connections.open', {
    method: 'POST',
    headers: {Authorization: `Bearer ${APP_TOKEN}`},
  });
  const body = await res.json();
  if (!body.ok) throw new Error(`apps.connections.open failed: ${body.error}`);
  return body.url;
}

function handleEvent(event) {
  console.log(`[event] ${event.type}`, event);
}

async function connect() {
  let url;
  try {
    url = await openConnection();
  } catch (error) {
    console.error(error.message);
    return;
  }

  const ws = new WebSocket(url);

  ws.onopen = () => {
    console.log('[socket] open');
  }

  ws.onmessage = ({data}) => {
    const msg = JSON.parse(data);

    // Slack redelivers anything not acknowledged within 3 seconds.
    if (msg.envelope_id) ws.send(JSON.stringify({envelope_id: msg.envelope_id}));

    switch (msg.type) {
      case 'hello':
        console.log('[socket] connected');
        break;
      case 'disconnect':
        console.log(`[socket] disconnect requested (${msg.reason})`);
        ws.close();
        break;
      case 'events_api':
        handleEvent(msg.payload.event);
        break;
      default:
        console.log(`[${msg.type}]`, msg.payload);
    }
  };

  ws.onclose = () => {
    console.log('[socket] closed, reconnecting');
    setTimeout(connect, 1000);
  };
}

connect();
