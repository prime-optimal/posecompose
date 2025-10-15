import { stream } from "@netlify/functions";

export const handler = stream(async event => {
  // Get the request from the request query string, or use a default
  const pie =
    event.queryStringParameters?.pie ??
    "something inspired by a springtime garden";

  // The response body returned from "fetch" is a "ReadableStream",
  // so you can return it directly in your streaming response
  const res = await fetch("https://api.z.ai/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Set this environment variable to your own key
      Authorization: `Bearer ${process.env.Z_API_KEY}`
    },
    body: JSON.stringify({
      model: "glm-4.6",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Use markdown to format your response"
        },
        // Use "slice" to limit the length of the input to 500 characters
        { role: "user", content: "Hello, please introduce yourself." }
      ],
      // Use server-sent events to stream the response
      stream: true
    })
  });

  return {
    headers: {
      // This is the mimetype for server-sent events
      "content-type": "text/event-stream"
    },
    statusCode: 200,
    // Pipe the event stream from OpenAI to the client
    body: res.body
  };
});
