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

    // Universal-Streaming v3 uses /v2/streaming/token endpoint
    // https://www.assemblyai.com/docs/speech-to-text/universal-streaming
    const response = await fetch('https://api.assemblyai.com/v2/streaming/token', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expires_in: 3600 })
    })

    if (!response.ok) {
      // Try alternate endpoint for temporary token
      const altResponse = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ expires_in: 3600 })
      })

      if (!altResponse.ok) {
        const errorText = await altResponse.text()
        // If token endpoints are deprecated, use the API key with server-side proxy approach
        // Return info so frontend knows to use fallback
        return new Response(JSON.stringify({
          error: 'Token endpoint deprecated',
          fallback: 'use_file_upload',
          message: errorText
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        })
      }

      const altData = await altResponse.json()
      return new Response(JSON.stringify({
        token: altData.token,
        streaming_url: 'wss://streaming.assemblyai.com/v3/ws'
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      })
    }

    const data = await response.json()

    return new Response(JSON.stringify({
      token: data.token,
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
