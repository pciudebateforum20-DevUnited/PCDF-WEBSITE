window.initGeographyGlobe = function() {
    const section = document.getElementById('geography-section');
    const globeContainer = document.getElementById('globe-container');
    if (!section || !globeContainer) return;
    if (globeContainer.querySelector('canvas')) return; // Already initialized
    const traceBtn = document.getElementById('trace-path-btn');
    
    // Story Mode Elements
    const storyOverlay = document.getElementById('story-overlay');
    const fogOverlay = document.getElementById('fog-overlay');
    const storyContent = document.getElementById('story-content');
    const closeStoryBtn = document.getElementById('close-story-btn');
    const storyImageWrapper = document.getElementById('story-image-wrapper');
    const storyImage = document.getElementById('story-image');
    const storyEra = document.getElementById('story-era');
    const storyTitle = document.getElementById('story-title');
    const storyTextContainer = document.getElementById('story-text-container');
    const storyWiki = document.getElementById('story-wiki-link');

    let typingTimeout;

    const storyStatsHud = document.getElementById('story-stats-hud');
    const statCasualties = document.getElementById('stat-casualties');
    const statDuration = document.getElementById('stat-duration');
    const statWeapon = document.getElementById('stat-weapon');
    const storyMiniMapContainer = document.getElementById('story-mini-map-container');
    let activeCountries = [];
    let globalCountriesGeoJson = null;

    const getStandardAltitude = () => (window.innerWidth < 768 ? 2.35 : 2.4);

    const historicalData = {
        "athens": {
            "countries": ["Greece"],
            "stats": { "casualties": "0", "duration": "Generations", "weapon": "Dialectic" },
            "era": "c. 400 BC",
            "title": "Athens: The Birth of Dialectic",
            "content": "The birthplace of democratic discourse. Here, Socrates walked the agora, teaching not by lecturing, but by relentless questioning—the Socratic Method. It was Aristotle who later categorized rhetoric into three core appeals that we still use today: Ethos, Pathos, and Logos.",
            "image": "/static/images/bust_athens.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Socrates"
        },
        "rome": {
            "countries": ["Italy"],
            "stats": { "casualties": "0", "duration": "Centuries", "weapon": "Oratory" },
            "era": "c. 50 BC",
            "title": "Rome: The Art of Oratory",
            "content": "In the Roman Republic, debate was the weapon of statesmen. Cicero mastered the art of public speaking, combining logic with theatrical delivery to sway the Senate. Rome taught us that an argument must not only be sound, but it must be performed with conviction and structure.",
            "image": "/static/images/bust_rome.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Cicero"
        },
        "india": {
            "countries": ["India"],
            "stats": { "casualties": "0", "duration": "Millennia", "weapon": "Tarka-vidya" },
            "era": "c. 500 BC - 500 AD",
            "title": "Nalanda: The Nyaya Tradition",
            "content": "Long before Western debate formalized, ancient India developed Tarka-vidya (the science of debate). At universities like Nalanda, scholars engaged in public, rigorous debates to prove philosophical truths. Their strict rules of evidence laid the groundwork for logical epistemology.",
            "image": "/static/images/bust_india.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Nyaya"
        },
        "uk": {
            "countries": ["United Kingdom"],
            "stats": { "casualties": "0", "duration": "Ongoing", "weapon": "Parliamentary" },
            "era": "19th Century",
            "title": "Oxford: The Parliament Model",
            "content": "In the debating halls of Oxford and Cambridge, the British Parliamentary (BP) style was born. Modeled after the House of Commons, it introduced the concept of two sides (Government vs. Opposition) debating a motion. This dynamic format is what the world uses for championships today.",
            "image": "/static/images/bust_uk.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Oxford_Union"
        },
        "colonial": {
            "countries": ["India", "United Kingdom"],
            "stats": { "casualties": "0", "duration": "190 Years", "weapon": "Protest & Print" },
            "era": "19th Century",
            "title": "Bengal: The Colonial Clash",
            "content": "During the British Raj, Calcutta became a hotbed of intellectual revolution. Reformers engaged in fierce public debates against both orthodox traditions and colonial suppression. Words became the first weapons in the fight for freedom, forging the modern spirit of argument in the subcontinent.",
            "image": "/static/images/bust_colonial.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Bengal_Renaissance"
        },
        "alexandria": {
            "countries": ["Egypt"],
            "stats": { "casualties": "Countless Scrolls", "duration": "700 Years", "weapon": "Knowledge" },
            "era": "c. 300 BC",
            "title": "Alexandria: The Lost Knowledge",
            "content": "The Great Library was the intellectual capital of the ancient world. Scholars debated astronomy, mathematics, and philosophy. The burning of the library symbolizes the tragic loss of dialectic and the fragility of human knowledge in the face of conflict.",
            "image": "/static/images/bust_alexandria.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Library_of_Alexandria"
        },
        "salem": {
            "countries": ["United States of America"],
            "stats": { "casualties": "25", "duration": "1 Year", "weapon": "Mass Hysteria" },
            "era": "1692",
            "title": "Salem: The Danger of Fallacy",
            "content": "The Salem Witch Trials serve as history's most terrifying example of logical fallacies and mass hysteria. Without the rigorous standards of evidence and reasoned debate, fear replaced logic, leading to tragic, irreversible consequences.",
            "image": "/static/images/bust_salem.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Salem_witch_trials"
        },
        "florence": {
            "countries": ["Italy"],
            "stats": { "casualties": "1 (House Arrest)", "duration": "Lifelong", "weapon": "Telescope" },
            "era": "1633",
            "title": "Florence: Science vs. Dogma",
            "content": "Galileo Galilei's trial before the Roman Catholic Inquisition is the ultimate historical debate between empirical science and religious dogma. He was forced to recant his heliocentric theory, proving that sometimes, even when logic is flawless, power dictates the winner.",
            "image": "/static/images/bust_florence.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Galileo_affair"
        },
        "atlantis": {
            "countries": [],
            "stats": { "casualties": "An Entire Civilization", "duration": "1 Day & Night", "weapon": "Hubris" },
            "era": "c. 9000 BC",
            "title": "Atlantis: The Lost Debate",
            "content": "A hidden easter egg! Did the Atlanteans debate their own hubris before the sea swallowed them? Some arguments are lost to the ocean of time. True rhetoric requires preserving knowledge before the tides wash it away.",
            "image": "/static/images/bust_atlantis.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Atlantis"
        },
        "ww2": {
            "countries": ["Germany", "France", "United Kingdom", "United States of America", "Japan", "Russia"],
            "stats": { "casualties": "75,000,000+", "duration": "6 Years", "weapon": "Mechanized Warfare" },
            "era": "1939 - 1945",
            "title": "World War II",
            "content": "The most devastating conflict in human history. It proved that when debate and diplomacy fail, the catastrophic cost is paid in millions of lives. It reshaped global borders and led to the creation of the United Nations to prevent such failure of discourse again.",
            "image": "/static/images/bust_ww2.jpg",
            "wiki": "https://en.wikipedia.org/wiki/World_War_II"
        },
        "crusades": {
            "countries": ["Israel", "Palestine", "Syria", "Turkey"],
            "stats": { "casualties": "1,000,000+", "duration": "196 Years", "weapon": "Swords & Dogma" },
            "era": "1095 - 1291",
            "title": "The Crusades",
            "content": "A series of religious wars initiated, supported, and sometimes directed by the Latin Church in the medieval period. Driven by dogmatic fervor rather than logical discourse, they serve as a stark historical reminder of the violence born from unyielding ideologies.",
            "image": "/static/images/bust_crusader.jpg",
            "wiki": "https://en.wikipedia.org/wiki/Crusades"
        },
        "peloponnesian": {
            "countries": ["Greece"],
            "stats": { "casualties": "100,000+", "duration": "27 Years", "weapon": "Spears & Fleets" },
            "era": "431 - 404 BC",
            "title": "Peloponnesian War",
            "content": "An ancient Greek war fought by the Delian League led by Athens against the Peloponnesian League led by Sparta. It marked the fall of Athens and the end of the golden age of Greek philosophy and rhetoric.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Peloponnesian_War"
        },
        "civilwar": {
            "countries": ["United States of America"],
            "stats": { "casualties": "620,000+", "duration": "4 Years", "weapon": "Rifles & Artillery" },
            "era": "1861 - 1865",
            "title": "American Civil War",
            "content": "A civil war in the United States fought between northern and Pacific states and southern states that voted to secede. The ultimate breakdown of political debate, solved only through immense bloodshed.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/American_Civil_War"
        },
        "waterloo": {
            "countries": ["Belgium", "France"],
            "stats": { "casualties": "65,000+", "duration": "1 Day", "weapon": "Cannons & Cavalry" },
            "era": "1815",
            "title": "Battle of Waterloo",
            "content": "The final defeat of Napoleon Bonaparte, ending decades of war across Europe. It reshaped the balance of power, proving that military conquests eventually hit a breaking point against unified alliances.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Battle_of_Waterloo"
        },
        "taiping": {
            "countries": ["China"],
            "stats": { "casualties": "20,000,000+", "duration": "14 Years", "weapon": "Muskets & Fanaticism" },
            "era": "1850 - 1864",
            "title": "Taiping Rebellion",
            "content": "A massive rebellion or civil war that was waged in China between the Manchu-led Qing dynasty and the Hakka-led Taiping Heavenly Kingdom. One of the deadliest conflicts in history, driven by radical religious visions.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Taiping_Rebellion"
        },
        "thirtyyears": {
            "countries": ["Germany", "Czechia", "Austria", "France", "Sweden"],
            "stats": { "casualties": "8,000,000+", "duration": "30 Years", "weapon": "Pikes & Muskets" },
            "era": "1618 - 1648",
            "title": "Thirty Years' War",
            "content": "One of the most destructive conflicts in human history, fought primarily in Central Europe. It began as a religious war but evolved into a massive political struggle, ending with the Peace of Westphalia and the concept of sovereign states.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Thirty_Years'_War"
        },
        "paris": {
            "countries": ["France"],
            "stats": { "casualties": "40,000+", "duration": "10 Years", "weapon": "Guillotine & Ideas" },
            "era": "1789",
            "title": "The Enlightenment",
            "content": "The French Revolution dismantled absolute monarchy, driven by the intellectual force of the Enlightenment. Liberty, Equality, and Fraternity were forged in fiery debates before spilling into the streets.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/French_Revolution"
        },
        "runnymede": {
            "countries": ["United Kingdom"],
            "stats": { "casualties": "0", "duration": "Centuries", "weapon": "Parchment" },
            "era": "1215",
            "title": "Magna Carta",
            "content": "At Runnymede, English barons forced King John to agree to the Magna Carta. This foundational document established that everyone, even the king, was subject to the law—a triumph of constitutional negotiation.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Magna_Carta"
        },
        "philadelphia": {
            "countries": ["United States of America"],
            "stats": { "casualties": "0", "duration": "Ongoing", "weapon": "Pen & Ink" },
            "era": "1776",
            "title": "Declaration of Independence",
            "content": "In a sweltering room in Philadelphia, representatives passionately debated their sovereignty. The resulting document proved that words could give birth to a nation.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/United_States_Declaration_of_Independence"
        },
        "delhi": {
            "countries": ["India"],
            "stats": { "casualties": "0", "duration": "90 Years", "weapon": "Non-violence & Rhetoric" },
            "era": "1947",
            "title": "Indian Independence",
            "content": "The culmination of a decades-long struggle. Through non-violent resistance, public strikes, and powerful oratory, the subcontinent broke the chains of the British Empire without firing a single shot in war.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Indian_independence_movement"
        },
        "dhaka": {
            "countries": ["Bangladesh"],
            "stats": { "casualties": "3,000,000+", "duration": "9 Months", "weapon": "Courage & Guerrilla Tactics" },
            "era": "1971",
            "title": "Bangladesh Liberation",
            "content": "What began as a profound debate for language rights and political autonomy in 1952 culminated in a devastating but ultimately triumphant war for independence. A powerful testament to the unbreakable spirit of a linguistic identity.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Bangladesh_Liberation_War"
        },
        "washington": {
            "countries": ["United States of America"],
            "stats": { "casualties": "0", "duration": "Decades", "weapon": "Oratory & Marches" },
            "era": "1963",
            "title": "Civil Rights Movement",
            "content": "Standing on the steps of the Lincoln Memorial, Martin Luther King Jr. delivered the 'I Have a Dream' speech. It stands as one of the most powerful uses of rhetoric in human history, shifting the moral conscience of a nation.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Civil_rights_movement"
        },
        "berlin": {
            "countries": ["Germany"],
            "stats": { "casualties": "0", "duration": "1 Night", "weapon": "Public Demand" },
            "era": "1989",
            "title": "Fall of the Berlin Wall",
            "content": "After decades of division, a peaceful revolution tore down the Iron Curtain. It proved that artificial boundaries cannot withstand the unified voice of the people demanding freedom.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Fall_of_the_Berlin_Wall"
        },
        "karakorum": {
            "countries": ["Mongolia", "China", "Russia"],
            "stats": { "casualties": "40,000,000+", "duration": "162 Years", "weapon": "Horse Archers" },
            "era": "1206",
            "title": "Mongol Conquests",
            "content": "The Mongol Empire became the largest contiguous empire in history. Their expansion relied entirely on devastating military force rather than diplomacy, leading to unparalleled bloodshed across Eurasia.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Mongol_Empire"
        },
        "sarajevo": {
            "countries": ["Bosnia and Herzegovina", "Austria", "Serbia", "Germany", "France", "Russia", "United Kingdom"],
            "stats": { "casualties": "20,000,000+", "duration": "4 Years", "weapon": "Trench Warfare" },
            "era": "1914",
            "title": "World War I",
            "content": "The assassination of Archduke Franz Ferdinand in Sarajevo triggered a cascade of failed treaties. When communication broke down entirely, the world plunged into the devastating meat grinder of modern trench warfare.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/World_War_I"
        },
        "moscow": {
            "countries": ["Russia", "United States of America"],
            "stats": { "casualties": "Millions (Proxy)", "duration": "44 Years", "weapon": "Nuclear Threat" },
            "era": "1947 - 1991",
            "title": "The Cold War",
            "content": "A decades-long geopolitical standoff. Diplomacy was maintained only through the terrifying doctrine of Mutually Assured Destruction (MAD). It was an era where words were weapons, and silence meant annihilation.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Cold_War"
        },
        "saigon": {
            "countries": ["Vietnam", "United States of America"],
            "stats": { "casualties": "3,000,000+", "duration": "19 Years", "weapon": "Guerrilla & Napalm" },
            "era": "1955 - 1975",
            "title": "Vietnam War",
            "content": "A catastrophic proxy war driven by ideological dogma. It serves as a modern reminder of the immense human suffering caused when superpowers impose their political will through brutal military intervention.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Vietnam_War"
        }
,
        "pretoria": {
            "countries": ["South Africa"],
            "stats": { "casualties": "0", "duration": "46 Years", "weapon": "Defiance & Unity" },
            "era": "1994",
            "title": "End of Apartheid",
            "content": "Nelson Mandela's lifelong struggle culminated in the triumph of justice and rhetoric over institutional racism. A powerful testament to the unbreakable human spirit.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Apartheid"
        },
        "carthage": {
            "countries": ["Tunisia"],
            "stats": { "casualties": "150,000+", "duration": "3 Years", "weapon": "Siege Warfare" },
            "era": "146 BC",
            "title": "Fall of Carthage",
            "content": "The devastating conclusion of the Punic Wars. Roman forces completely destroyed the city, reshaping the ancient Mediterranean and proving the brutal finality of imperial conflict.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Battle_of_Carthage_(c._149_BC)"
        },
        "ballarat": {
            "countries": ["Australia"],
            "stats": { "casualties": "35", "duration": "1 Year", "weapon": "Protest & Pikes" },
            "era": "1854",
            "title": "Eureka Rebellion",
            "content": "Gold miners revolted against unjust colonial authority. Though militarily defeated, the ensuing public debate forged the foundation of Australian democracy and workers' rights.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Eureka_Rebellion"
        },
        "caracas": {
            "countries": ["Venezuela", "Colombia", "Ecuador"],
            "stats": { "casualties": "0", "duration": "Decades", "weapon": "Ideology & Oratory" },
            "era": "1811",
            "title": "Latin American Independence",
            "content": "Simón Bolívar's brilliant intellectual and political campaign swept across South America, dismantling the Spanish empire through the infectious power of revolutionary rhetoric.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Sim%C3%B3n_Bol%C3%ADvar"
        },
        "cusco": {
            "countries": ["Peru"],
            "stats": { "casualties": "Millions", "duration": "40 Years", "weapon": "Steel & Disease" },
            "era": "1532",
            "title": "Fall of the Inca Empire",
            "content": "A tragic failure of diplomacy leading to the Spanish conquest. The devastating clash of vastly different civilizations resulted in the collapse of the largest empire in pre-Columbian America.",
            "image": "",
            "wiki": "https://en.wikipedia.org/wiki/Spanish_conquest_of_the_Inca_Empire"
        }
    };

    const places = [
        { lat: 37.9838, lng: 23.7275, id: 'athens', name: 'Athens, Greece', color: '#8b1e1e' },
        { lat: 41.9028, lng: 12.4964, id: 'rome', name: 'Rome, Italy', color: '#8b1e1e' },
        { lat: 25.1333, lng: 85.4500, id: 'india', name: 'Nalanda, India', color: '#8b1e1e' },
        { lat: 51.7520, lng: -1.2577, id: 'uk', name: 'Oxford, UK', color: '#8b1e1e' },
        { lat: 22.5726, lng: 88.3639, id: 'colonial', name: 'Calcutta, India', color: '#8b1e1e' },
        { lat: 31.2001, lng: 29.9187, id: 'alexandria', name: 'Alexandria, Egypt', color: '#8b1e1e' },
        { lat: 42.5195, lng: -70.8967, id: 'salem', name: 'Salem, USA', color: '#8b1e1e' },
        { lat: 43.7696, lng: 11.2558, id: 'florence', name: 'Florence, Italy', color: '#8b1e1e' },
        { lat: 48.8566, lng: 2.3522, id: 'paris', name: 'Paris, France', color: '#8b1e1e' },
        { lat: 51.4426, lng: -0.5621, id: 'runnymede', name: 'Runnymede, UK', color: '#8b1e1e' },
        { lat: 39.9526, lng: -75.1652, id: 'philadelphia', name: 'Philadelphia, USA', color: '#8b1e1e' },
        { lat: 28.6139, lng: 77.2090, id: 'delhi', name: 'Delhi, India', color: '#8b1e1e' },
        { lat: 23.8103, lng: 90.4125, id: 'dhaka', name: 'Dhaka, Bangladesh', color: '#8b1e1e' },
        { lat: 38.9072, lng: -77.0369, id: 'washington', name: 'Washington D.C., USA', color: '#8b1e1e' },
        { lat: 52.5200, lng: 13.4050, id: 'berlin', name: 'Berlin, Germany', color: '#8b1e1e' },
        { lat: 31.0000, lng: -45.0000, id: 'atlantis', name: '???', color: '#111111' },
        { lat: 49.0000, lng: 2.0000, id: 'ww2', name: 'Normandy/Berlin', color: '#ffb300', type: 'war' },
        { lat: 31.7683, lng: 35.2137, id: 'crusades', name: 'Jerusalem', color: '#ffb300', type: 'war' },
        { lat: 37.0000, lng: 22.0000, id: 'peloponnesian', name: 'Peloponnesian War', color: '#ffcc00', type: 'war' },
        { lat: 39.8000, lng: -77.2000, id: 'civilwar', name: 'American Civil War', color: '#ffcc00', type: 'war' },
        { lat: 50.7000, lng: 4.4000, id: 'waterloo', name: 'Battle of Waterloo', color: '#ffcc00', type: 'war' },
        { lat: 32.0000, lng: 118.7000, id: 'taiping', name: 'Taiping Rebellion', color: '#ffcc00', type: 'war' },
        { lat: 50.0000, lng: 14.4000, id: 'thirtyyears', name: 'Thirty Years\' War', color: '#ffcc00', type: 'war' },
        { lat: 47.1973, lng: 102.8228, id: 'karakorum', name: 'Mongol Conquests', color: '#ffcc00', type: 'war' },
        { lat: 43.8563, lng: 18.4131, id: 'sarajevo', name: 'World War I', color: '#ffcc00', type: 'war' },
        { lat: 55.7558, lng: 37.6173, id: 'moscow', name: 'The Cold War', color: '#ffcc00', type: 'war' },
        { lat: 10.7626, lng: 106.6601, id: 'saigon', name: 'Vietnam War', color: '#ffcc00', type: 'war' }
,
        { lat: -25.7479, lng: 28.2293, id: 'pretoria', name: 'Pretoria, South Africa', color: '#8b1e1e' },
        { lat: 36.8065, lng: 10.1815, id: 'carthage', name: 'Fall of Carthage', color: '#ffcc00', type: 'war' },
        { lat: -37.5622, lng: 143.8503, id: 'ballarat', name: 'Eureka Rebellion', color: '#8b1e1e' },
        { lat: 10.4806, lng: -66.9036, id: 'caracas', name: 'Caracas, Venezuela', color: '#8b1e1e' },
        { lat: -13.5320, lng: -71.9675, id: 'cusco', name: 'Fall of Inca Empire', color: '#ffcc00', type: 'war' }
    ];

    const arcsData = [
        { startLat: 31.2001, startLng: 29.9187, endLat: 37.9838, endLng: 23.7275, color: '#8b1e1e' },
        { startLat: 37.9838, startLng: 23.7275, endLat: 41.9028, endLng: 12.4964, color: '#8b1e1e' },
        { startLat: 41.9028, startLng: 12.4964, endLat: 43.7696, endLng: 11.2558, color: '#8b1e1e' },
        { startLat: 43.7696, startLng: 11.2558, endLat: 25.1333, endLng: 85.4500, color: '#8b1e1e' },
        { startLat: 25.1333, startLng: 85.4500, endLat: 22.5726, endLng: 88.3639, color: '#8b1e1e' },
        { startLat: 22.5726, startLng: 88.3639, endLat: 51.7520, endLng: -1.2577, color: '#8b1e1e' },
        { startLat: 51.7520, startLng: -1.2577, endLat: 42.5195, endLng: -70.8967, color: '#8b1e1e' } 
    ];

    const tradeRoutes = [
        { startLat: 51.5072, startLng: -0.1276, endLat: 22.5726, endLng: 88.3639, color: 'rgba(197, 160, 89, 0.65)' },
        { startLat: 51.5072, startLng: -0.1276, endLat: 40.7128, endLng: -74.0060, color: 'rgba(197, 160, 89, 0.65)' },
        { startLat: 51.5072, startLng: -0.1276, endLat: -33.9249, endLng: 18.4241, color: 'rgba(197, 160, 89, 0.65)' },
        { startLat: -33.9249, startLng: 18.4241, endLat: 22.5726, endLng: 88.3639, color: 'rgba(197, 160, 89, 0.65)' },
        { startLat: 22.5726, startLng: 88.3639, endLat: 1.3521, endLng: 103.8198, color: 'rgba(197, 160, 89, 0.65)' },
        { startLat: 51.5072, startLng: -0.1276, endLat: -25.7479, endLng: 28.2293, color: 'rgba(197, 160, 89, 0.65)' },
        { startLat: -25.7479, startLng: 28.2293, endLat: -37.5622, endLng: 143.8503, color: 'rgba(197, 160, 89, 0.65)' },
        { startLat: 40.4168, startLng: -3.7038, endLat: 10.4806, endLng: -66.9036, color: 'rgba(197, 160, 89, 0.65)' },
        { startLat: 10.4806, startLng: -66.9036, endLat: -13.5320, endLng: -71.9675, color: 'rgba(197, 160, 89, 0.65)' }
    ];

    const world = Globe()
        (globeContainer)
        .showAtmosphere(true)
        .atmosphereColor('#c5a059')
        .atmosphereAltitude(0.10)
        .backgroundColor('rgba(0,0,0,0)')
        
        .pointsData(places)
        .pointLat('lat')
        .pointLng('lng')
        .pointColor(d => d.color)
        .pointAltitude(d => d.type === 'war' ? 0.02 : 0.08)
        .pointRadius(d => d.type === 'war' ? 0.45 : 0.85)
        .pointResolution(16)
        .pointLabel(d => {
            const isWar = d.type === 'war';
            const badge = isWar ? `<span style="background: #ffb300; color: #111; padding: 2px 6px; font-size: 0.6em; border-radius: 4px; vertical-align: middle; margin-right: 5px;">WAR</span>` : '';
            return `
            <div style="background: rgba(255,255,255,0.95); padding: 10px 14px; border-radius: 6px; border: 2px solid ${isWar ? '#ffb300' : '#8b1e1e'}; font-family: 'Cinzel', serif; color: #111; box-shadow: 0 8px 20px rgba(0,0,0,0.4);">
                <strong style="color: ${isWar ? '#b8860b' : '#8b1e1e'}; font-size: 1.2em; font-weight: 900; text-transform: uppercase;">${badge}${d.name}</strong><br>
                <span style="font-family: 'Inter', sans-serif; font-size: 0.85em; font-weight: 700; color: #333;">Click to explore</span>
            </div>
        `})
        .onPointClick((point) => {
            const data = historicalData[point.id];
            if (!data) return;
            
            function startZoomAndStory() {
                const isWar = point.type === 'war';
                
                // Set HUD
                if (statCasualties) statCasualties.textContent = data.stats.casualties;
                if (statDuration) statDuration.textContent = data.stats.duration;
                if (statWeapon) {
                    statWeapon.textContent = data.stats.weapon;
                    if (isWar) {
                        statWeapon.classList.remove('text-[#8b1e1e]');
                        statWeapon.classList.add('text-[#ffb300]');
                        fogOverlay.style.background = 'radial-gradient(circle, rgba(20,20,20,0.95) 0%, rgba(5,5,5,1) 100%)';
                    } else {
                        statWeapon.classList.remove('text-[#ffb300]');
                        statWeapon.classList.add('text-[#8b1e1e]');
                        fogOverlay.style.background = 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0.9) 30%, rgba(255,255,255,0) 80%)';
                    }
                }

                // Dynamic Country Glowing
                activeCountries = data.countries || [];
                if (isWar && activeCountries.length > 0) activeCountries[0] = 'WAR'; 
                world.polygonCapColor(d => {
                    const countryName = d.properties.name;
                    if (data.countries && data.countries.includes(countryName)) {
                        return isWar ? 'rgba(218, 165, 32, 0.9)' : 'rgba(211, 47, 47, 0.9)';
                    }
                    return '#f7f4ed';
                });

                // D3 Cutout Map Logic
                const cutoutWrapper = document.getElementById('cutout-svg-wrapper');
                if (storyMiniMapContainer && cutoutWrapper && globalCountriesGeoJson && typeof d3 !== 'undefined') {
                    cutoutWrapper.innerHTML = ''; 
                    
                    const actualCountries = data.countries || [];
                    if (actualCountries.length > 0) {
                        const targetFeatures = globalCountriesGeoJson.features.filter(f => actualCountries.includes(f.properties.name));
                        
                        if (targetFeatures.length > 0) {
                            storyMiniMapContainer.style.display = 'flex';
                            const geoObj = { type: 'FeatureCollection', features: targetFeatures };
                            
                            const width = cutoutWrapper.clientWidth || 140;
                            const height = cutoutWrapper.clientHeight || 80;
                            
                            const svg = d3.select(cutoutWrapper)
                                .append('svg')
                                .attr('width', width)
                                .attr('height', height)
                                .attr('viewBox', `0 0 ${width} ${height}`)
                                .style('overflow', 'visible');
                                
                            // Add slight padding to fitSize
                            const projection = d3.geoMercator().fitExtent([[6, 6], [width - 6, height - 6]], geoObj);
                            const pathGenerator = d3.geoPath().projection(projection);
                            
                            const color = isWar ? '#d97706' : '#8b1e1e';
                            
                            svg.selectAll('path')
                                .data(targetFeatures)
                                .enter()
                                .append('path')
                                .attr('d', pathGenerator)
                                .attr('fill', color)
                                .attr('fill-opacity', 0.25)
                                .attr('stroke', color)
                                .attr('stroke-width', 1.5)
                                .style('filter', `drop-shadow(0px 0px 6px ${color}66)`);
                        } else {
                            storyMiniMapContainer.style.display = 'none';
                        }
                    } else {
                        storyMiniMapContainer.style.display = 'none';
                    }
                }

                world.controls().autoRotate = false;
                world.pointOfView({ lat: point.lat, lng: point.lng, altitude: window.innerWidth < 768 ? 0.35 : 0.15 }, 2000);
                
                setTimeout(() => {
                    storyOverlay.classList.remove('pointer-events-none');
                    storyOverlay.classList.add('pointer-events-auto');
                    storyOverlay.style.opacity = '1';
                    
                    fogOverlay.style.opacity = '1';
                    fogOverlay.style.transform = 'scale(2.5)';
                    
                    storyEra.textContent = `Era: ${data.era}`;
                    storyTitle.innerHTML = data.title;
                    
                    if (data.image) {
                        storyImage.src = data.image;
                        storyImage.style.display = 'block';
                        if (storyImageWrapper) storyImageWrapper.style.display = 'flex';
                    } else {
                        storyImage.style.display = 'none';
                        if (storyImageWrapper) storyImageWrapper.style.display = 'none';
                    }
                    
                    storyWiki.href = data.wiki;
                    storyWiki.style.opacity = '0';
                    
                    clearTimeout(typingTimeout);
                    storyTextContainer.innerHTML = '';

                    setTimeout(() => {
                        fogOverlay.style.opacity = '0';
                        fogOverlay.style.transform = 'scale(4)';
                        
                        setTimeout(() => {
                            storyContent.style.opacity = '1';
                            storyImage.style.opacity = '1';
                            if (storyStatsHud) storyStatsHud.style.opacity = '1';
                            if (storyMiniMapContainer) storyMiniMapContainer.style.opacity = '1';
                            typeText(storyTextContainer, data.content);
                        }, 400);
                    }, 1000);
                }, 1000); 
            }
            startZoomAndStory();
        })
        .arcsData(tradeRoutes)
        .arcStartLat('startLat')
        .arcStartLng('startLng')
        .arcEndLat('endLat')
        .arcEndLng('endLng')
        .arcColor('color')
        .arcDashLength(0.4)
        .arcDashGap(0.2)
        .arcDashInitialGap(() => Math.random())
        .arcDashAnimateTime(2000)
        .arcAltitude(0.2)
        .arcStroke(0.6);

    fetch('//unpkg.com/world-atlas/countries-110m.json')
        .then(res => res.json())
        .then(worldData => {
            globalCountriesGeoJson = topojson.feature(worldData, worldData.objects.countries);
            const countries = globalCountriesGeoJson.features;
            world.polygonsData(countries)
                .polygonAltitude(0.005)
                .polygonCapColor(d => {
                    const countryName = d.properties.name;
                    if (activeCountries.includes(countryName)) {
                        return activeCountries[0] === 'WAR' ? 'rgba(218, 165, 32, 0.9)' : 'rgba(211, 47, 47, 0.9)';
                    }
                    return '#f7f4ed';
                }) 
                .polygonSideColor(() => '#201d19') 
                .polygonStrokeColor(() => '#3a3630');
        });

    if (typeof THREE !== 'undefined') {
        const oceanMaterial = new THREE.MeshPhongMaterial({
            color: '#101012',        // PCDF Velvet Ink Black Ocean
            emissive: '#080706',     // Warm dark subtle glow
            specular: '#3a352d',     // Antique sepia reflection
            shininess: 15
        });
        world.globeMaterial(oceanMaterial);
    }

    if (world.controls()) {
        world.controls().autoRotate = true;
        world.controls().autoRotateSpeed = 0.5;
        world.controls().enableZoom = false; // Prevents wheel hijacking: page scrolls seamlessly over globe!
        world.controls().enablePan = false;
        world.controls().enableDamping = true;
        world.controls().dampingFactor = 0.05;
        world.controls().rotateSpeed = 0.8;
    }

    globeContainer.style.touchAction = 'pan-y';
    const globeCanvas = globeContainer.querySelector('canvas');
    if (globeCanvas) {
        globeCanvas.style.touchAction = 'pan-y';
    }

    let isGlobePaused = false;
    world.onGlobeClick(() => {
        isGlobePaused = !isGlobePaused;
        if (world.controls()) {
            world.controls().autoRotate = !isGlobePaused;
        }
    });

    if ('IntersectionObserver' in window) {
        const globeObserver = new IntersectionObserver((entries) => {
            const isVisible = entries[0].isIntersecting;
            if (world.controls()) {
                world.controls().autoRotate = isVisible && !isGlobePaused;
            }
        }, { threshold: 0.05 });
        globeObserver.observe(section);
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            if (globeContainer && world) {
                const w = globeContainer.clientWidth;
                const h = globeContainer.clientHeight;
                if (w > 0 && h > 0) {
                    world.width(w);
                    world.height(h);
                }
            }
        }, 150);
    }, { passive: true });

    // --- Audio Synthesis System (Web Audio API) ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    let audioCtx;
    
    function playWhoosh() { }
    function playTypeclick() { }

    if (typeof THREE !== 'undefined') {
        const moonGeometry = new THREE.SphereGeometry( 3, 24, 24 );
        const moonMaterial = new THREE.MeshPhongMaterial({ color: '#ede7db', emissive: '#1a1815', specular: '#ffffff', shininess: 10 });
        const moon = new THREE.Mesh( moonGeometry, moonMaterial );
        world.scene().add(moon);

        const dustGeo = new THREE.BufferGeometry();
        const dustCount = 400;
        const dustPos = new Float32Array(dustCount * 3);
        for(let i = 0; i < dustCount * 3; i+=3) {
            const r = 110 + Math.random() * 80;
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(Math.random() * 2 - 1);
            dustPos[i] = r * Math.sin(phi) * Math.cos(theta);
            dustPos[i+1] = r * Math.sin(phi) * Math.sin(theta);
            dustPos[i+2] = r * Math.cos(phi);
        }
        dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
        const dustMat = new THREE.PointsMaterial({ color: '#c5a059', size: 1.0, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending });
        const magicDust = new THREE.Points(dustGeo, dustMat);
        world.scene().add(magicDust);

        let isVisible = true;
        const observer = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
            if (!isVisible) {
                if (world.controls()) world.controls().autoRotate = false;
            } else if (!isGlobePaused) {
                if (world.controls()) world.controls().autoRotate = true;
            }
        }, { threshold: 0 });
        observer.observe(section);

        let angle = 0;
        function animateScene() {
            if (isVisible) {
                angle += 0.002;
                moon.position.x = 140 * Math.cos(angle);
                moon.position.z = 140 * Math.sin(angle);
                moon.position.y = 30 * Math.sin(angle * 1.5);
                
                magicDust.rotation.y += 0.0005;
                magicDust.rotation.z += 0.0002;
            }

            requestAnimationFrame(animateScene);
        }
        animateScene();
    }

    let currentTypingSession = 0;
    
    function typeText(element, text, speed = 20) {
        currentTypingSession++;
        let session = currentTypingSession;
        
        element.innerHTML = '';
        let i = 0;
        
        function typeWriter() {
            if (session !== currentTypingSession) return; 
            
            if (i < text.length) {
                element.innerHTML += text.charAt(i);
                i++;
                typingTimeout = setTimeout(typeWriter, speed);
            } else {
                storyWiki.style.opacity = '1';
            }
        }
        typeWriter();
    }

    closeStoryBtn.addEventListener('click', () => {
        storyContent.style.opacity = '0';
        storyImage.style.opacity = '0';
        if (storyStatsHud) storyStatsHud.style.opacity = '0';
        if (storyMiniMapContainer) storyMiniMapContainer.style.opacity = '0';
        clearTimeout(typingTimeout);
        world.polygonCapColor(() => '#f7f4ed');
        
        setTimeout(() => {
            fogOverlay.style.transitionDuration = '0s';
            fogOverlay.style.transform = 'scale(0.5)';
            setTimeout(() => {
                fogOverlay.style.transitionDuration = '1500ms';
            }, 50);
            
            storyOverlay.style.opacity = '0';
            storyOverlay.classList.remove('pointer-events-auto');
            storyOverlay.classList.add('pointer-events-none');
            
            world.pointOfView({ altitude: getStandardAltitude() }, 1500);
            world.controls().autoRotate = true;
        }, 600);
    });

    storyOverlay.addEventListener('click', (e) => {
        if (e.target === storyOverlay) {
            closeStoryBtn.click();
        }
    });

    traceBtn.addEventListener('click', () => {
        if (traceBtn.disabled) return;
        world.controls().autoRotate = false;
        traceBtn.disabled = true;
        const originalText = traceBtn.innerText;
        traceBtn.innerText = "Tour in Progress...";
        
        const tourOrder = ['athens', 'alexandria', 'rome', 'india', 'florence', 'salem', 'uk', 'colonial'];
        let currentIndex = 0;
        let activeArcs = [];
        world.arcsData([]);

        function goToNext() {
            if (currentIndex >= tourOrder.length) {
                traceBtn.disabled = false;
                traceBtn.innerText = originalText;
                world.controls().autoRotate = true;
                world.pointOfView({ altitude: getStandardAltitude() }, 2000);
                
                setTimeout(() => { 
                    world.arcsData(tradeRoutes); 
                    world.arcDashLength(0.4);
                    world.arcDashGap(0.2);
                    world.arcDashAnimateTime(2000);
                    world.arcStroke(0.6);
                }, 5000);
                return;
            }

            const currentId = tourOrder[currentIndex];
            const currentPlace = places.find(p => p.id === currentId);
            
            world.pointOfView({ lat: currentPlace.lat, lng: currentPlace.lng, altitude: window.innerWidth < 768 ? 0.85 : 0.7 }, 2000);

            setTimeout(() => {
                if (currentIndex < tourOrder.length - 1) {
                    const nextId = tourOrder[currentIndex + 1];
                    const nextPlace = places.find(p => p.id === nextId);
                    
                    activeArcs.push({
                        startLat: currentPlace.lat, startLng: currentPlace.lng,
                        endLat: nextPlace.lat, endLng: nextPlace.lng,
                        color: '#8b1e1e'
                    });
                    world.arcsData([...tradeRoutes, ...activeArcs]); 
                }

                currentIndex++;
                setTimeout(goToNext, 1200); 
            }, 2000);
        }
        goToNext();
    });

    // Pause rotation when globe is scrolled off-screen (saves battery/CPU)
    const globeObs = new IntersectionObserver((entries) => {
        if (world && world.controls) {
            world.controls().autoRotate = entries[0].isIntersecting;
        }
    }, { threshold: 0 });
    globeObs.observe(section);

    // Standard fixed size on load based on device
    setTimeout(() => {
        if (world && world.pointOfView) {
            world.pointOfView({ altitude: getStandardAltitude() }, 0);
        }
    }, 100);
};

if (document.readyState !== 'loading') {
    window.initGeographyGlobe();
} else {
    document.addEventListener('DOMContentLoaded', window.initGeographyGlobe);
}
