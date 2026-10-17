const APP_TOKEN = process.env.SLACK_APP_TOKEN;
const SERVER_API_KEY = process.env.SERVER_API_KEY;

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

async function sendEventToServer(event) {
  const body = {type: event.type, payload: event.payload};

  await fetch("https://aio.ltvb.nl/slack/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVER_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
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

  ws.onmessage = ({data}) => {
    const msg = JSON.parse(data);

    // Slack redelivers anything not acknowledged within 3 seconds.
    if (msg.envelope_id) ws.send(JSON.stringify({envelope_id: msg.envelope_id}));

    switch (msg.type) {
      case 'hello':
        break;
      case 'disconnect':
        ws.close();
        break;
      case 'events_api':
        sendEventToServer(msg).catch(console.error);
        break;
      default:
        console.log(`[${msg.type}]`, msg.payload);
    }
  };

  ws.onclose = () => {
    setTimeout(connect, 1000);
  };
}

connect();
