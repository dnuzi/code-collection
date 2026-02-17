const axios = require('axios');

async function gemini(
  query,
  options = {}
) {
  
  const { session } = options;

  const superSecretEncodedApiEndpoint = 
    "aHR0cHM6Ly9keHotYWkudmVyY2VsLmFwcC9hcGkvZ2VtaW5p";
  
  const finalApiUrl = Buffer.from(
    superSecretEncodedApiEndpoint, 
    'base64'
  ).toString('utf8');

  const requestParameters = {};
  
  requestParameters.text = query;
  
  if (session) {
    requestParameters.session = session;
  }
  
  const requestHeaders = {
    Accept: "application/json, text/plain, */*",
    
    "User-Agent": "Postify/1.0.0",
  };
  
  try {
    
    const axiosResponse = await axios.get(finalApiUrl, {
      params: requestParameters,
      headers: requestHeaders,
      timeout: 30000,        
    });

    const responseBody = axiosResponse.data;

    const result = {
      ok: responseBody.ok ?? false,
      message: (responseBody.message || "").trim(),
      creator: responseBody.creator || "Unknown",
      session: responseBody.session || undefined,
      raw: responseBody,
    };
    
    return result;
    
  } catch (catastrophicFailure) {
    
    console.error("╔════════════════════════════════════════════╗");
    console.error("║         GEMINI API DECIDED TO DIE         ║");
    console.error("╚════════════════════════════════════════════╝");
    console.error("Error message →", catastrophicFailure.message);
    
    if (catastrophicFailure.response) {
      console.error("→ HTTP Status code:", catastrophicFailure.response.status);
      console.error("→ Server replied with:", catastrophicFailure.response.data);
    }
    
    console.error("Good luck soldier. I can't help you anymore.");
 
    throw catastrophicFailure;
  }
 
}


module.exports = {
  gemini: gemini
};

// ────────────────────────────────────────────────
//                  Test / Example Usage
// ────────────────────────────────────────────────

if (require.main === module) {
  (async () => {
    console.log("┌──────────────────────────────┐");
    console.log("│        Testing gemini()      │");
    console.log("└──────────────────────────────┘\n");

    try {
      // Test 1: Basic call (no session)
      console.log("Test 1: Basic query (no session)");
      const result1 = await gemini("Hello! Just say hi back please.");
      
      console.log("→ OK     :", result1.ok);
      console.log("→ Message:", result1.message);
      console.log("→ Creator:", result1.creator);
      console.log("→ Session:", result1.session ? "[exists]" : "undefined");
      console.log("──────────────────────────────────\n");

      // Test 2: With session (if the first call returned one)
      if (result1.session) {
        console.log("Test 2: Using session from previous call");
        const result2 = await gemini("What was the previous message I sent?", {
          session: result1.session
        });

        console.log("→ OK     :", result2.ok);
        console.log("→ Message:", result2.message);
        console.log("→ Creator:", result2.creator);
        console.log("→ Session:", result2.session ? "[exists]" : "undefined");
        console.log("──────────────────────────────────\n");
      } else {
        console.log("→ No session returned → skipping session test\n");
      }

      // Test 3: Very short / trivial query
      console.log("Test 3: Very short query");
      const result3 = await gemini("2+2");
      console.log("→ OK     :", result3.ok);
      console.log("→ Message:", result3.message);
      console.log("──────────────────────────────────\n");

    } catch (err) {
      console.error("┌──────────────────────────────┐");
      console.error("│         TEST FAILED          │");
      console.error("└──────────────────────────────┘");
      console.error(err);
    }

    console.log("\nTests finished.");
  })();
}
