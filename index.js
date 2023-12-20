import express from 'express';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
const port = 3000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get('/', (req, res) => {
  res.send('Hello World! This is a test');
});


app.post('/whatsapp', async (req, res) => {
  let body = req.body;

    if (body.object === "whatsapp_business_account") {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].field === "messages"
      ) {
        let messageData = body.entry[0].changes[0].value;

        if (
          messageData.messages &&
          messageData.messages.length > 0 &&
          !messageData.messages[0].from_me
        ) {
          console.log("MESSAGE COMING");
          let phone_number_id = messageData.metadata.phone_number_id;
          let from = messageData.messages[0].from;
          let msg_body = messageData.messages[0].text.body;

          try {
            const thread = await openai.beta.threads.create();

             await openai.beta.threads.messages.create(thread.id, {
              role: "user",
              content:
                msg_body,
            });

            const run = await openai.beta.threads.runs.create(thread.id, {
                assistant_id: "asst_04i07msf90Mh3qpyFpUdO2s4",
            });

            await checkRunStatus(thread.id, run.id);
            const messages = await openai.beta.threads.messages.list(thread.id);    
            let messageContent = messages.data[0].content[0];
            let messageText = "";
            if (messageContent.type === "text") {
                messageText = messageContent.text.value;
            }


            const response = await fetch(
              `https://graph.facebook.com/v12.0/${phone_number_id}/messages?access_token=${process.env.WHATSAPP_TOKEN}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  to: from,
                  text: { body: messageText },
                }),
              }
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            res.send("message sent");
          } catch (error) {
            console.log(error);
          }
        }
      } else {
        res.send("error while making request");
      
      }
    } else {
      res.send("account is not found");
      
    }


});

app.get('/whatsapp', (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
  **/
   const verify_token = process.env.VERIFY_TOKEN;
   // Parse params from the webhook verification request
   let mode = req.query["hub.mode"];
   let token = req.query["hub.verify_token"];
   let challenge = req.query["hub.challenge"];
   console.log('GET REQ')
 
   // Check if a token and mode were sent
   if (mode && token) {
     // Check the mode and token sent are correct
     if (mode === "subscribe" && token === verify_token) {
       // Respond with 200 OK and challenge token from the request
       console.log("WEBHOOK_VERIFIED");
       console.log(req.query);
       res.status(200).send(challenge);
       
     } else {
       // Responds with '403 Forbidden' if verify tokens do not match
       res.sendStatus(403);
     }
   }
});

async function checkRunStatus(threadId, runId) {
  let run2;
  do {
    run2 = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log("status : " + run2.status);
    console.log("error : " + run2.last_error);
    console.log("instructions : " + run2.instructions);

    switch (run2.status) {
      case "completed":
        console.log("completed");
        return; // Exit the function

      case "failed":
        console.log("failed");
        return; // Exit the function

      case "cancelled":
        console.log("cancelled");
        return; // Exit the function

      case "expired":
        console.log("expired");
        return; // Exit the function

      case "in_progress":
      case "queued":
      case "requires_action":
      case "cancelling":
        // Wait for 100 milliseconds before checking again
        await new Promise((resolve) => setTimeout(resolve, 1000));
        break;

      default:
        console.log("Unknown status:", run2.status);
        return; // Exit the function in case of an unexpected status
    }
  } while (true);
}

app.listen(port, () => {
  return console.log(`Express is listening at http://localhost:${port}`);
});