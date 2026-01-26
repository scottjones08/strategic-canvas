import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const apiKey = Deno.env.get('ASSEMBLYAI_API_KEY')
    if (!apiKey) {
      throw new Error('ASSEMBLYAI_API_KEY not configured')
    }

    // Universal-Streaming v3 token endpoint
    // https://www.assemblyai.com/docs/api-reference/streaming-api/generate-streaming-token
    const response = await fetch('https://streaming.assemblyai.com/v3/token?expires_in_seconds=600', {
      method: 'GET',
      headers: {
        'Authorization': apiKey,
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AssemblyAI token error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    return new Response(JSON.stringify({
      token: data.token,
      expires_in_seconds: data.expires_in_seconds,
      streaming_url: 'wss://streaming.assemblyai.com/v3/ws'
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    })
  }
})
