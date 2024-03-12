import bodyParser from "body-parser";
import express from "express";
import { BASE_ONION_ROUTER_PORT, REGISTRY_PORT, BASE_USER_PORT } from '../config';
import { importPubKey, rsaEncrypt, symEncrypt, createRandomSymmetricKey, exportSymKey } from '../crypto';
import axios from 'axios';

export type SendMessageBody = {
  message: string;
  destinationUserId: number;
};

export async function user(userId: number) {
  const _user = express();
  _user.use(express.json());
  _user.use(bodyParser.json());

  let lastReceivedMessage: string | null = null;
  let lastSentMessage: string | null = null;

  // TODO implement the status route
  _user.get("/status", (req, res) => {
    res.send('live')
  });

  _user.get("/getLastReceivedMessage", (req, res) => {
    res.json({result: lastReceivedMessage});
  })

  _user.get("/getLastSentMessage", (req, res) => {
    res.json({result:  lastSentMessage});
  })

  _user.post("/sendMessage", async (req, res) => {
    const { message, destinationUserId } = req.body;
    const destinationPort = BASE_USER_PORT + destinationUserId;
  
    // Fetch node registry
    const { data: { nodes } } = await axios.get(`http://localhost:${REGISTRY_PORT}/getNodeRegistry`);
  
    // Create a random circuit of 3 distinct nodes
    const circuit = nodes.sort(() => 0.5 - Math.random()).slice(0, 3);
  
    let encryptedMessage = message;
    const layers = [];
  
    for (const node of circuit.reverse()) {
      // Generate a symmetric key for the node
      const symKey = await createRandomSymmetricKey();
      const symKeyB64 = await exportSymKey(symKey);
  
      // Encrypt the message and destination
      const destination = destinationPort.toString().padStart(10, '0');
      encryptedMessage = await symEncrypt(symKey, destination + encryptedMessage);
  
      // Encrypt the symmetric key with the node's public RSA key
      const encryptedSymKey = await rsaEncrypt(symKeyB64, node.pubKey);
  
      // Combine the encrypted message and encrypted symmetric key
      encryptedMessage = encryptedSymKey + encryptedMessage;
      layers.push(encryptedMessage);
    }
  
    // Send the message to the entry node of the circuit
    await axios.post(`http://localhost:${BASE_ONION_ROUTER_PORT + circuit[0].nodeId}/message`, {
      message: encryptedMessage,
    });
  
    res.send('Message sent');
  });
  

  _user.post("/message", (req, res) => {
    const { message } = req.body;
    if (typeof message === 'string') {
      lastReceivedMessage = message;
      res.send('success');
    } else {
      res.status(400).send('Invalid request');
    }
  });

  const server = _user.listen(BASE_USER_PORT + userId, () => {
    console.log(
      `User ${userId} is listening on port ${BASE_USER_PORT + userId}`
    );
  });

  return server;
}
