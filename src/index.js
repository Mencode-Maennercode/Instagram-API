const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function syncInstagram() {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  let accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  try {
    // Wenn Code von Callback vorhanden
    if (process.env.GITHUB_EVENT_PAYLOAD) {
      const payload = JSON.parse(process.env.GITHUB_EVENT_PAYLOAD);
      if (payload.client_payload?.code) {
        console.log('Exchanging code for access token...');
        
        const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', {
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: 'https://mencode-maennercode.github.io/Instagram-API/instagram-callback.html',
          code: payload.client_payload.code
        });
        
        accessToken = tokenResponse.data.access_token;
        console.log('New access token received:', accessToken);
        
        // Long-lived token anfordern (60 Tage gültig)
        const longLivedResponse = await axios.get('https://graph.instagram.com/access_token', {
          params: {
            grant_type: 'ig_exchange_token',
            client_secret: clientSecret,
            access_token: accessToken
          }
        });
        
        const longLivedToken = longLivedResponse.data.access_token;
        console.log('Long-lived token received:', longLivedToken);
        
        // Hinweis: Token muss manuell in GitHub Secrets gespeichert werden
        console.log('IMPORTANT: Save this token as INSTAGRAM_ACCESS_TOKEN in GitHub Secrets!');
        console.log('Token expires in:', longLivedResponse.data.expires_in, 'seconds');
      }
    }
    
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    // Token prüfen und ggf. erneuern
    try {
      const tokenInfo = await axios.get('https://graph.instagram.com/debug_token', {
        params: {
          access_token: accessToken
        }
      });
      
      console.log('Token info:', tokenInfo.data.data);
      
      // Wenn Token bald abläuft (weniger als 1 Woche), erneuern
      const expiresAt = new Date(tokenInfo.data.data.expires_at * 1000);
      const now = new Date();
      const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiry < 7) {
        console.log('Token expires soon, refreshing...');
        const refreshResponse = await axios.get('https://graph.instagram.com/refresh_access_token', {
          params: {
            grant_type: 'ig_refresh_token',
            access_token: accessToken
          }
        });
        
        accessToken = refreshResponse.data.access_token;
        console.log('Token refreshed:', accessToken);
        console.log('IMPORTANT: Update INSTAGRAM_ACCESS_TOKEN in GitHub Secrets with new token!');
      }
    } catch (tokenError) {
      console.log('Token validation failed, may need re-authentication');
    }
    
    // Instagram Daten abrufen
    console.log('Fetching Instagram media...');
    const mediaResponse = await axios.get(`https://graph.instagram.com/me/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,children',
        access_token: accessToken,
        limit: 20
      }
    });
    
    // Kinder für Carousel Posts abrufen
    const mediaWithDetails = await Promise.all(
      mediaResponse.data.data.map(async (post) => {
        if (post.media_type === 'CAROUSEL_ALBUM' && post.children) {
          const childrenResponse = await axios.get(`https://graph.instagram.com/${post.children.data[0].id}`, {
            params: {
              fields: 'media_url,thumbnail_url',
              access_token: accessToken
            }
          });
          return {
            ...post,
            children: childrenResponse.data
          };
        }
        return post;
      })
    );
    
    // Daten speichern
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const instagramData = {
      last_updated: new Date().toISOString(),
      media: mediaWithDetails,
      total_count: mediaWithDetails.length
    };
    
    fs.writeFileSync(path.join(dataDir, 'instagram.json'), JSON.stringify(instagramData, null, 2));
    console.log('Instagram data updated successfully');
    console.log(`Found ${instagramData.total_count} posts`);
    
  } catch (error) {
    console.error('Error syncing Instagram:', error.response?.data || error.message);
    process.exit(1);
  }
}

syncInstagram();
