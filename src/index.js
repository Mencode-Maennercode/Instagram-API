const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function syncInstagram() {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  let accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  
  try {
    // Wenn Code von Callback vorhanden (Instagram Login Flow)
    if (process.env.GITHUB_EVENT_PAYLOAD) {
      const payload = JSON.parse(process.env.GITHUB_EVENT_PAYLOAD);
      if (payload.client_payload?.code) {
        console.log('Exchanging code for short-lived token...');
        
        const formData = new URLSearchParams();
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);
        formData.append('grant_type', 'authorization_code');
        formData.append('redirect_uri', 'https://mencode-maennercode.github.io/Instagram-API/instagram-callback.html');
        formData.append('code', payload.client_payload.code);
        
        const tokenResponse = await axios.post('https://api.instagram.com/oauth/access_token', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });
        
        const shortLivedToken = tokenResponse.data.access_token;
        const userId = tokenResponse.data.user_id;
        console.log('Short-lived token received for user:', userId);
        
        // Long-lived token anfordern (60 Tage gültig)
        console.log('Exchanging for long-lived token...');
        const longLivedResponse = await axios.get('https://graph.instagram.com/access_token', {
          params: {
            grant_type: 'ig_exchange_token',
            client_secret: clientSecret,
            access_token: shortLivedToken
          }
        });
        
        accessToken = longLivedResponse.data.access_token;
        const expiresIn = longLivedResponse.data.expires_in;
        console.log('Long-lived token received!');
        console.log('Token expires in:', expiresIn, 'seconds (~60 days)');
        console.log('='.repeat(60));
        console.log('IMPORTANT: Save this token as INSTAGRAM_ACCESS_TOKEN in GitHub Secrets!');
        console.log('Token:', accessToken);
        console.log('='.repeat(60));
      }
    }
    
    if (!accessToken) {
      throw new Error('No access token available. Please authenticate first.');
    }
    
    // Token prüfen und ggf. erneuern (nur für long-lived tokens)
    console.log('Checking token validity...');
    try {
      // Long-lived Token erneuern (funktioniert nur wenn noch mindestens 24h gültig)
      const refreshResponse = await axios.get('https://graph.instagram.com/refresh_access_token', {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: accessToken
        }
      });
      
      if (refreshResponse.data.access_token) {
        accessToken = refreshResponse.data.access_token;
        console.log('Token refreshed successfully!');
        console.log('New token expires in:', refreshResponse.data.expires_in, 'seconds');
        console.log('='.repeat(60));
        console.log('IMPORTANT: Update INSTAGRAM_ACCESS_TOKEN in GitHub Secrets!');
        console.log('New Token:', accessToken);
        console.log('='.repeat(60));
      }
    } catch (tokenError) {
      console.log('Token refresh not needed or failed:', tokenError.response?.data?.error?.message || 'Token still valid');
    }
    
    // Instagram Daten abrufen
    console.log('Fetching Instagram media...');
    const mediaResponse = await axios.get(`https://graph.instagram.com/me/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,thumbnail_url,username,children{media_url,media_type,thumbnail_url}',
        access_token: accessToken,
        limit: 20
      }
    });
    
    console.log(`Found ${mediaResponse.data.data.length} posts`);
    
    // Daten speichern
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const instagramData = {
      last_updated: new Date().toISOString(),
      media: mediaResponse.data.data,
      total_count: mediaResponse.data.data.length
    };
    
    fs.writeFileSync(path.join(dataDir, 'instagram.json'), JSON.stringify(instagramData, null, 2));
    console.log('Instagram data saved to data/instagram.json');
    console.log('Update successful!');
    
  } catch (error) {
    console.error('Error syncing Instagram:');
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

syncInstagram();
