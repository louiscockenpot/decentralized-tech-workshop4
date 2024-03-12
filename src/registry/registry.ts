import bodyParser from "body-parser";
import express, { Request, Response } from "express";
import { REGISTRY_PORT } from "../config";

export type Node = { nodeId: number; pubKey: string };

export type RegisterNodeBody = {
  nodeId: number;
  pubKey: string;
};

export type GetNodeRegistryBody = {
  nodes: Node[];
};

let nodes: Node[] = [];

export async function launchRegistry() {
  const _registry = express();
  _registry.use(express.json());
  _registry.use(bodyParser.json());

  // TODO implement the status route
  _registry.get("/status", (req, res) => {
    res.send('live')
  });

  _registry.post("/registerNode", (req, res) => {
    const { nodeId, pubKey } = req.body as Node;                
    nodes.push({ nodeId, pubKey});
    res.send('ok');      
  });

  _registry.get("/getPrivateKey", (req, res) => {
    const privateKey = "mockPrivateKeyBase64";
    res.json({ result: privateKey })
  });

  _registry.get("/getNodeRegistry", (req, res) => {
    const nodesRegistry = nodes.map(({ nodeId, pubKey }) => ({ nodeId, pubKey }));
    res.json({ nodes: nodesRegistry });
  });

  _registry.post("/clearRegistry", (req, res) => {
    nodes = [];
    res.send('Registry cleared');
  });

  const server = _registry.listen(REGISTRY_PORT, () => {
    console.log(`registry is listening on port ${REGISTRY_PORT}`);
  });

  return server;
}
