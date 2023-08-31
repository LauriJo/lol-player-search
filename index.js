const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const axios = require('axios');

const riotKey = 'api_key=RGAPI-2bf5aaf1-cffd-4b91-a674-9730738d090d'
const version = '13.16.1'

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));


const championImages = {
    fetchChampionImages
};

const hbs = exphbs.create({
    helpers: {
        championImages: function (championName) {
            const championKey = championName.toLowerCase().replace(" ", "");
            return championImages[championKey];
        },
        masteryLevelLogo: function (masteryLevel) {
            // Map mastery levels to their corresponding logo URLs
            const logos = {
                5: 'https://github.com/RiotAPI/Riot-Games-API-Developer-Assets/blob/master/champion-mastery-icons/mastery-5.png?raw=true',
                6: 'https://github.com/RiotAPI/Riot-Games-API-Developer-Assets/blob/master/champion-mastery-icons/mastery-6.png?raw=true',
                7: 'https://github.com/RiotAPI/Riot-Games-API-Developer-Assets/blob/master/champion-mastery-icons/mastery-7.png?raw=true',
            };
            return logos[masteryLevel] || ''; 
        },
        soloRankedLogo: function (rank) {
            // Map ranked tier's to their corresponding logo URLs
            const tierLogos = {
                iron: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/iron.png',
                bronze: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/bronze.png',
                silver: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/silver.png',
                gold: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/gold.png',
                platinum: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/platinum.png',
                emerald: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/emerald.png',
                diamond: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/diamond.png',
                master: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/master.png',
                grandmaster: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/grandmaster.png',
                challenger: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/challenger.png',
            };
            return tierLogos[rank.toLowerCase()] || ''; 
        },
        formatNumber: function(number) {
            return number.toLocaleString();
        },
        if_eq: function(a, b, opts) {
            if (a === b) {
                return opts.fn(this);
            }
            return opts.inverse(this);
        }
    },
    defaultLayout: 'main'
});

app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');


// Riot API - Get a summoner by summoner name
async function fetchSumByName(name,ch){
    //turns name into link format
    while (name.includes(" ")) {
        let spaceSpot = name.indexOf(" ");
        name = name.substring(0, spaceSpot) + name.substring(spaceSpot + 1);
    }

    // Request to riot api
    const link = `https://eun1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${name}?${riotKey}`
    const response = await fetch(link);

    // Turns return value to json 
    let sumData = await response.json()
    return sumData;


}

// Riot Data Dragon champion data
async function fetchChampionData(version) {
    
    const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`);
    const championData = await response.json();
    return championData.data;
}


// Riot API - Get all champion mastery entries sorted by number of champion points descending,
async function fetchSumMasteries(summonerID, count) {
    const link = `https://eun1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-summoner/${summonerID}?${riotKey}`;
    const response = await fetch(link);
    let masteryData = await response.json();
    masteryData = masteryData.slice(0, count);

    // Fetch champion data
    const championData = await fetchChampionData(version);

// Define the getIdFromKey function outside of the forEach loop
function getIdFromKey(key) {
    for (const championId in championData) {
    if (championData[championId].key === key) {
    return championId;
    }
    }
    return null; // If no match is found
    }

      
    masteryData.forEach(entry => {
        const keyToFind = entry.championId.toString(); // Convert to string if needed
        const championId = getIdFromKey(keyToFind);
      
        if (championId) {
          entry.championName = championId; // Add championId to the entry
          entry.isEzreal = entry.championName === "Ezreal"; // Add this line
          entry.isGangplank = entry.championName === "Gangplank"; // Add this line
          console.log(`Champion ID for key ${keyToFind}: ${championId}`);
        } else {
          console.log(`No champion found with key ${keyToFind}`);
        }
      });
      
    console.log(masteryData);
    return masteryData;
}

async function fetchChampionImages(masteryData, championData) {
    const championImages = {};  // Object to store champion images

    for (const mastery of masteryData) {
        const championId = mastery.championName;  // Get champion ID from masteryData

        if (championId in championData) {
            // Construct the image URL using the champion ID and version
            const imageUrl = `http://ddragon.leagueoflegends.com/cdn/${championData[championId].version}/img/champion/${championData[championId].image.full}`;

            console.log("Fetching image for:", championId);
            console.log(imageUrl);

            try {
                // Fetch the image using Axios with appropriate headers
                const response = await axios.get(imageUrl, { responseType: 'arraybuffer', headers: { 'User-Agent': 'your_app_name' } });
                const base64Image = Buffer.from(response.data, 'binary').toString('base64');
                
                // Create a data URL for the image
                championImages[championId] = `data:image/png;base64,${base64Image}`;
                console.log("Image fetched successfully for:", championId);

                // Add imageURL property to the masteryData object for this champion
                mastery.imageURL = championImages[championId];
            } catch (error) {
                console.error("Error fetching champion image:", error);
            }
        }
    }

    return masteryData;  // Return masteryData with imageURL property added
}


// Riot Data Dragon summoner icon - profile picture
function fetchSummonerIconUrl(profileIconId) {
    return `http://ddragon.leagueoflegends.com/cdn/${version}/img/profileicon/${profileIconId}.png`;
}


//Riot API - Get league entries in all queues for a given summoner ID.
async function fetchSummonerEntries(summonerID){
    const link = `https://eun1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerID}?${riotKey}`
    const response = await fetch(link);
    let SummonerEntries = await response.json();

    console.log(SummonerEntries);

    return SummonerEntries;
}


// Result page Render
app.get('/result', async (req, res) => {
    const name = req.query.SummonerName;

    // Fetch summoner data
    const summonerData = await fetchSumByName(name);

    const summonerID = summonerData.id;

    // Fetch champion mastery data
    const masteryData = await fetchSumMasteries(summonerID, 5);

    // Fetch champion data
    const championData = await fetchChampionData(version);

    // Fetch champion images
    const championImages = await fetchChampionImages(masteryData, championData);

    const SummonerEntries = await fetchSummonerEntries(summonerID);

    console.log(summonerData);

    

    res.render('result', {
        summonerData: summonerData,
        masteryData: masteryData,
        championImages: championImages,
        getSummonerIconUrl: fetchSummonerIconUrl,
        summonerEntries: SummonerEntries
    });
});

// Search page Render

app.get('/search', (req,res) => {

    res.render('search' ,
    {
       
        
    });
  
}); 



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`App listening port ${PORT}`));