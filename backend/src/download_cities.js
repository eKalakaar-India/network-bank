const fs = require('fs');
const path = require('path');
const https = require('https');

const URL = 'https://raw.githubusercontent.com/nshntarora/Indian-Cities-JSON/master/cities.json';
const OUTPUT_PATH = path.join(__dirname, 'services', 'cities_to_states.json');

https.get(URL, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const citiesList = JSON.parse(data);
      const cityMap = {};
      
      citiesList.forEach(item => {
        if (item.name && item.state) {
          const cityClean = item.name.trim().toLowerCase();
          cityMap[cityClean] = item.state.trim();
        }
      });
      
      // Add custom ones/abbreviations just in case
      cityMap['vizag'] = 'Andhra Pradesh';
      cityMap['bangalore'] = 'Karnataka';
      cityMap['mysore'] = 'Karnataka';
      cityMap['gurgaon'] = 'Haryana';
      cityMap['greater noida'] = 'Uttar Pradesh';
      
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(cityMap, null, 2), 'utf8');
      console.log(`Successfully mapped and saved ${Object.keys(cityMap).length} cities to ${OUTPUT_PATH}!`);
    } catch (err) {
      console.error('Failed to parse cities JSON:', err);
    }
  });
}).on('error', (err) => {
  console.error('HTTPS request failed:', err);
});
