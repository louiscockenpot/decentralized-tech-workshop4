import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, BASE_USER_PORT } from '../config';
import axios from 'axios';
import { importPrvKey, rsaDecrypt, symDecrypt } from '../crypto';

async function getNodePrivateKey(nodeId: number): Promise<string> {
  // Your logic here to retrieve the node's private key securely
  // For demonstration, let's pretend we can get it directly
  return "mockPrivateKeyBase64";
}

export async function simpleOnionRouter(nodeId: number) {
  const onionRouter = express();
  onionRouter.use(express.json());
  onionRouter.use(bodyParser.json());

  // Variables to store message states with explicit types
  let lastReceivedEncryptedMessage: string | null = null;
  let lastReceivedDecryptedMessage: string | null = null;
  let lastMessageDestination: string | null = null;

  // Implement the status route
  onionRouter.get("/status", (req, res) => {
    res.send('live');
  });

  onionRouter.get("/getLastReceivedEncryptedMessage", (req, res) => {
    res.json({ result: lastReceivedEncryptedMessage });
  });

  onionRouter.get("/getLastReceivedDecryptedMessage", (req, res) => {
    res.json({ result: lastReceivedDecryptedMessage });
  });

  onionRouter.get("/getLastMessageDestination", (req, res) => {
    res.json({ result: lastMessageDestination });
  });

  onionRouter.post("/message", async (req, res) => {
    const { message } = req.body;
  
    // Retrieve the private key for this node
    const privateKeyBase64 = await getNodePrivateKey(nodeId);
    const privateKey = await importPrvKey(privateKeyBase64);

    // Split the message into the encrypted symmetric key and the rest of the message
    const encryptedSymKey = message.substring(0, 344); // RSA encrypted key length
    const restOfMessage = message.substring(344);
  
    // Decrypt the symmetric key
    const symKeyB64 = await rsaDecrypt(encryptedSymKey, privateKey);
    const decryptedMessage = await symDecrypt(symKeyB64, restOfMessage);
  
    // Extract the next destination from the decrypted message
    const nextDestination = decryptedMessage.substring(0, 10);
    const nextMessage = decryptedMessage.substring(10);
  
    // If the next destination is a user, forward the message to the user
    if (parseInt(nextDestination) >= BASE_USER_PORT) {
      await axios.post(`http://localhost:${nextDestination}/message`, { message: nextMessage });
    } else { // Otherwise, forward to the next onion router
      await axios.post(`http://localhost:${nextDestination}/message`, { message: nextMessage });
    }
  
    res.send('Message forwarded');
  });

  const server = onionRouter.listen(BASE_ONION_ROUTER_PORT + nodeId, () => {
    console.log(
      `Onion router ${nodeId} is listening on port ${BASE_ONION_ROUTER_PORT + nodeId}`
    );
  });

  return server;
}
