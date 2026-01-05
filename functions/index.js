
const { onRequest } = require("firebase-functions/v2/https");
const axios = require("axios");
const cors = require("cors");

// More permissive CORS for MVP to solve "BRIDGE_OFFLINE" errors immediately
const corsHandler = cors({
  origin: true, // Reflect request origin
  methods: ["POST", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-UserType", 
    "X-SourceID", 
    "X-PrivateKey", 
    "X-ClientLocalIP", 
    "X-ClientPublicIP", 
    "X-MACAddress"
  ],
  credentials: true
});

const ANGEL_BASE_URL = "https://apiconnect.angelbroking.com";

/**
 * angelProxy: Gen 2 Cloud Function to securely communicate with Angel One API
 */
exports.angelProxy = onRequest({
  region: "us-west1",
  invoker: "public",
  maxInstances: 10,
  cors: true
}, (req, res) => {
  return corsHandler(req, res, async () => {
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }

    // Support both / path and /angelProxy path
    const { action, data } = req.body;

    if (!action) {
      return res.status(400).json({ status: false, message: "Missing action parameter in request body" });
    }

    let apiPath = "";
    switch (action) {
      case "login":
        apiPath = "/rest/auth/angelbroking/user/v1/loginByPassword";
        break;
      case "ltp":
        apiPath = "/rest/market/data/v1/ltp";
        break;
      case "history":
        apiPath = "/rest/ms/api/v1/data/chart/fetchData";
        break;
      default:
        return res.status(400).json({ status: false, message: `Invalid action: ${action}` });
    }

    const angelHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-UserType": "USER",
      "X-SourceID": "WEB",
      "X-ClientLocalIP": "127.0.0.1",
      "X-ClientPublicIP": "127.0.0.1",
      "X-MACAddress": "02:00:00:00:00:00",
      "X-PrivateKey": req.headers["x-privatekey"] || ""
    };

    if (req.headers["authorization"]) {
      angelHeaders["Authorization"] = req.headers["authorization"];
    }

    try {
      const response = await axios({
        method: "POST",
        url: `${ANGEL_BASE_URL}${apiPath}`,
        data: data || {},
        headers: angelHeaders,
        timeout: 20000
      });

      return res.status(200).json(response.data);
    } catch (error) {
      console.error(`[AngelProxy Error] ${action}: ${error.message}`);
      if (error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return res.status(500).json({ status: false, message: "Internal Proxy Error", details: error.message });
    }
  });
});
