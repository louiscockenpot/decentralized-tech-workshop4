import axios from 'axios';
import { simpleOnionRouter } from "./simpleOnionRouter";
import * as crypto from '../crypto';
import { REGISTRY_PORT } from '../config';

export async function launchOnionRouters(n: number) {
  // Clear the registry
  await axios.post(`http://localhost:${REGISTRY_PORT}/clearRegistry`);

  const promises = [];

  // launch a n onion routers
  for (let index = 0; index < n; index++) {
    const newPromise = simpleOnionRouter(index).then(async server => {
      // Generate a pair of RSA keys
      const { publicKey, privateKey } = await crypto.generateRsaKeyPair();

      // Export the public key to a base64 string
      let pubKey = await crypto.exportPubKey(publicKey);

      // Convert the public key to a base64 string
      pubKey = Buffer.from(pubKey).toString('base64');

      // Register the node in the registry
      await axios.post(`http://localhost:${REGISTRY_PORT}/registerNode`, {
        nodeId: index,
        pubKey
      });

      return server;
    });

    promises.push(newPromise);
  }

  const servers = await Promise.all(promises);

  return servers;
}