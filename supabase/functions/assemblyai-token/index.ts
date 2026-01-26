import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Universal-Streaming uses temporary auth tokens
    // https://www.assemblyai.com/docs/speech-to-text/universal-streaming
    const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expires_in: 3600 })
    })

    // If old endpoint fails, return the API key directly for new streaming endpoint
    // The new Universal-Streaming endpoint accepts the API key directly in the URL
    if (!response.ok) {
      // Return a token response that includes the API key for direct use
      return new Response(JSON.stringify({ 
        token: apiKey,
        method: 'direct',
        streaming_url: 'wss://streaming.assemblyai.com'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    const data = await response.json()

    return new Response(JSON.stringify({
      ...data,
      method: 'token',
      streaming_url: 'wss://api.assemblyai.com/v2/realtime/ws'
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
