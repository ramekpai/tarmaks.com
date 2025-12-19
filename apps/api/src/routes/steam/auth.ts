import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

export const authRoutes = new Hono();

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

// Steam API response types
interface SteamPlayer {
  steamid: string;
  personaname: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  profileurl: string;
  loccountrycode?: string;
}

interface SteamPlayerSummariesResponse {
  response: {
    players: SteamPlayer[];
  };
}

// Initiate Steam OpenID login
authRoutes.get('/login', (c) => {
  const returnUrl = c.req.query('returnUrl') || '/';
  const apiUrl = process.env.API_URL || 'http://localhost:3000';

  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${apiUrl}/api/steam/auth/callback?returnUrl=${encodeURIComponent(returnUrl)}`,
    'openid.realm': apiUrl,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });

  return c.redirect(`${STEAM_OPENID_URL}?${params.toString()}`);
});

// Steam OpenID callback
authRoutes.get('/callback', async (c) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const returnUrl = c.req.query('returnUrl') || '/';

  try {
    const claimedId = c.req.query('openid.claimed_id');

    if (!claimedId) {
      return c.redirect(`${frontendUrl}${returnUrl}?error=no_claimed_id`);
    }

    // Extract Steam ID from claimed_id
    // Format: https://steamcommunity.com/openid/id/76561198XXXXXXXX
    const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);

    if (!steamIdMatch || !steamIdMatch[1]) {
      return c.redirect(`${frontendUrl}${returnUrl}?error=invalid_steam_id`);
    }

    const steamId = steamIdMatch[1];

    // Redirect back to frontend with Steam ID
    const redirectUrl = new URL(`${frontendUrl}${returnUrl}`);
    redirectUrl.searchParams.set('steamId', steamId);

    return c.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('Steam callback error:', error);
    return c.redirect(`${frontendUrl}${returnUrl}?error=callback_failed`);
  }
});

// Get Steam profile by ID
const profileQuerySchema = z.object({
  steamId: z.string().regex(/^\d{17}$/, 'Invalid Steam ID'),
});

authRoutes.get('/profile', zValidator('query', profileQuerySchema), async (c) => {
  const { steamId } = c.req.valid('query');
  const apiKey = process.env.STEAM_API_KEY;

  if (!apiKey) {
    return c.json({ error: 'Steam API key not configured' }, 500);
  }

  try {
    const response = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey}&steamids=${steamId}`
    );

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch Steam profile' }, 502);
    }

    const data = (await response.json()) as SteamPlayerSummariesResponse;
    const player = data.response?.players?.[0];

    if (!player) {
      return c.json({ error: 'Player not found' }, 404);
    }

    return c.json({
      steamId: player.steamid,
      personaName: player.personaname,
      avatarUrl: player.avatarfull || player.avatarmedium || player.avatar,
      profileUrl: player.profileurl,
      countryCode: player.loccountrycode || null,
    });
  } catch (error) {
    console.error('Error fetching Steam profile:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});
