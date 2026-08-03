import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
}

export const Route = createFileRoute('/api/public/market/depth/$listingId')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ params }) => {
        try {
          const listingId = params.listingId
          if (!/^[0-9a-f-]{36}$/i.test(listingId)) {
            return new Response(JSON.stringify({ error: 'invalid_listing_id' }), {
              status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
            })
          }
          const sb = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_PUBLISHABLE_KEY!,
            { auth: { persistSession: false, autoRefreshToken: false } },
          )
          const [bids, asks, listing, trades] = await Promise.all([
            sb.from('sm_orders').select('price,remaining').eq('listing_id', listingId).eq('side', 'BUY').in('status', ['OPEN', 'PARTIALLY_FILLED']).order('price', { ascending: false }).limit(20),
            sb.from('sm_orders').select('price,remaining').eq('listing_id', listingId).eq('side', 'SELL').in('status', ['OPEN', 'PARTIALLY_FILLED']).order('price', { ascending: true }).limit(20),
            sb.from('sm_listings').select('symbol,name,reference_price,daily_limit_pct,status').eq('id', listingId).maybeSingle(),
            sb.from('sm_trades').select('price,quantity,executed_at').eq('listing_id', listingId).order('executed_at', { ascending: false }).limit(30),
          ])
          return new Response(JSON.stringify({
            listing: listing.data, bids: bids.data ?? [], asks: asks.data ?? [], trades: trades.data ?? [],
            fetched_at: new Date().toISOString(),
          }), { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=2', ...CORS } })
        } catch (e: any) {
          console.error('[market.depth] error', e?.message ?? e)
          return new Response(JSON.stringify({ error: 'server_error' }), {
            status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
          })
        }
      },
    },
  },
})
