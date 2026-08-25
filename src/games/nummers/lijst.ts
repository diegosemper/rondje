/**
 * Nummers voor Raad het Nummer.
 *
 * Dit bestand is opgehaald bij Apple's openbare voorluister-dienst: elk nummer
 * heeft daar een gratis fragment van dertig seconden, zonder inloggen en
 * zonder sleutel. We slaan alleen de link op, niet de muziek zelf.
 *
 * Let op: zo'n fragment begint meestal bij het refrein en niet bij het begin
 * van het nummer. Dat maakt die eerste seconde juist herkenbaarder.
 *
 * Nieuwe nummers erbij? Zoek de titel op itunes.apple.com/search?term=...
 * en plak de previewUrl hieronder. Mocht een link ooit doodgaan, dan meldt de
 * app dat en kan de host het nummer overslaan.
 *
 * Automatisch samengesteld — 60 nummers.
 */

export interface Nummer {
  titel: string
  artiest: string
  url: string
}

export const NUMMERS: Nummer[] = [
  { titel: 'Take On Me', artiest: 'a-ha', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/12/2f/eb/122febd2-32d3-a816-ec26-baa22a1e4184/mzaf_6909997937289684998.plus.aac.p.m4a' },
  { titel: 'Dancing Queen', artiest: 'ABBA', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c1/e7/c7/c1e7c761-3185-0a54-9433-1dfbc42fdc5c/mzaf_6292672129281227789.plus.aac.p.m4a' },
  { titel: 'Rolling In the Deep', artiest: 'Adele', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/1f/aa/38/1faa38cc-3137-1409-ccb9-2eaf92a1b386/mzaf_5683578537884510102.plus.aac.p.m4a' },
  { titel: 'Rehab', artiest: 'Amy Winehouse', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/c0/7f/37/c07f37f1-a8e1-b093-f643-9e3bae02589b/mzaf_10374144630525520706.plus.aac.p.m4a' },
  { titel: 'Wake Me Up', artiest: 'Avicii', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/65/b9/b0/65b9b0a0-530c-0137-9462-b6672e944b53/mzaf_1369429484595404848.plus.aac.p.m4a' },
  { titel: 'Everybody', artiest: 'Backstreet Boys', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/2d/cf/97/2dcf970e-fcab-6392-db62-e3b64c6c567a/mzaf_2026899677322984445.plus.aac.p.m4a' },
  { titel: 'Stayin\' Alive', artiest: 'Bee Gees', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/75/b7/30/75b730e8-541d-980d-54d4-f111ae9aece8/mzaf_732787148297582194.plus.aac.p.m4a' },
  { titel: 'bad guy', artiest: 'Billie Eilish', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/c3/87/1f/c3871f7e-3260-d615-1c66-5fdca2c3a48f/mzaf_10721331211699880949.plus.aac.p.m4a' },
  { titel: 'Song 2', artiest: 'Blur', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/ff/11/26/ff1126d1-d793-5107-39a9-5e57383b4e88/mzaf_14192975438031776859.plus.aac.p.m4a' },
  { titel: 'Livin\' On a Prayer', artiest: 'Bon Jovi', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/eb/08/79/eb0879c1-91cf-3c0a-bd5c-45b9874140ca/mzaf_3446349696049515416.plus.aac.p.m4a' },
  { titel: 'Toxic', artiest: 'Britney Spears', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/86/3f/df/863fdf97-7eea-fffb-0aae-0ee799732bb3/mzaf_6194320698875840263.plus.aac.p.m4a' },
  { titel: 'Summer', artiest: 'Calvin Harris', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/15/cb/fc/15cbfc2a-b229-361f-8103-3d0738d66c37/mzaf_2094460005863947610.plus.aac.p.m4a' },
  { titel: 'Viva La Vida', artiest: 'Coldplay', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/2b/04/65/2b0465c3-2db1-e461-2362-14b528456b8f/mzaf_1805426141027060154.plus.aac.p.m4a' },
  { titel: 'In da Club', artiest: 'Curtis "50 Cent" Jackson', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/15/89/7e/15897ea5-b0a0-4c1f-3f64-559533df42b1/mzaf_10604019280667552271.plus.aac.p.m4a' },
  { titel: 'Get Lucky', artiest: 'Daft Punk, Pharrell Williams & Nile Rodgers', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/d4/d3/1e/d4d31eb4-7405-b806-8346-3c52ad5b4cf4/mzaf_8095545455942962509.plus.aac.p.m4a' },
  { titel: 'Titanium', artiest: 'David Guetta', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/27/c2/c7/27c2c78c-318e-cd6c-deb4-ebcdfec2de24/mzaf_6964948339914536280.plus.aac.p.m4a' },
  { titel: 'Say So', artiest: 'Doja Cat', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/82/ed/db/82eddbfd-795f-6b37-98dc-96a5d1248383/mzaf_13868574885160813404.plus.aac.p.m4a' },
  { titel: 'Hotline Bling', artiest: 'Drake', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/c7/b1/f3/c7b1f35a-8d24-735b-5923-1fb52fc7647e/mzaf_12441003627825640809.plus.aac.p.m4a' },
  { titel: 'Levitating', artiest: 'Dua Lipa', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0f/94/3d/0f943d20-08b5-cfec-2d5a-6a3cab0e52a4/mzaf_10014388327615840056.plus.aac.p.m4a' },
  { titel: 'Shape of You', artiest: 'Ed Sheeran', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/7d/23/2c/7d232c90-b3c3-d470-efa6-681e3b9cf2cf/mzaf_12485578604532006555.plus.aac.p.m4a' },
  { titel: 'Lose Yourself', artiest: 'Eminem', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/62/0a/a5/620aa56f-189e-708a-80f0-cebdada3872e/mzaf_7131619873177773332.plus.aac.p.m4a' },
  { titel: 'The Final Countdown', artiest: 'Europe', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/d3/5b/d9/d35bd9a3-d105-95d8-ba29-0f5c6b8e764b/mzaf_7609183394807520180.plus.aac.p.m4a' },
  { titel: 'Sweet Dreams', artiest: 'Eurythmics', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview126/v4/33/72/78/337278b2-6ec6-ddbd-1d11-94e0c8ca3b22/mzaf_17096504411490598724.plus.aac.p.m4a' },
  { titel: 'Somebody That I Used to Know', artiest: 'Gotye', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a2/35/89/a23589ed-2b87-ac29-9046-2553461682b5/mzaf_7145891335591006940.plus.aac.p.m4a' },
  { titel: 'Sweet Child O\' Mine', artiest: 'Guns N\' Roses', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/0d/cb/f3/0dcbf381-7cbf-78b8-7f74-d5789adf65a1/mzaf_17081805577020235844.plus.aac.p.m4a' },
  { titel: 'As It Was', artiest: 'Harry Styles', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/67/10/16/67101606-3869-ca44-6c03-e13d6322cb51/mzaf_1135399237022217274.plus.aac.p.m4a' },
  { titel: 'Don\'t Stop Believin\'', artiest: 'Journey', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/f7/fe/40/f7fe405a-0526-60b5-9898-b555e4146c8d/mzaf_11089651359573769705.plus.aac.p.m4a' },
  { titel: 'Sorry', artiest: 'Justin Bieber', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/66/eb/29/66eb29c0-c2f9-d9df-8af3-3bf2562c9d7c/mzaf_4099789285264521999.plus.aac.p.m4a' },
  { titel: 'Stronger', artiest: 'Kanye West', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/96/f2/25/96f225f2-cd07-3639-4133-0910aa9725c0/mzaf_13857358519708863745.plus.aac.p.m4a' },
  { titel: 'Firework', artiest: 'Katy Perry', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/01/1d/81/011d81db-504c-9e37-9cf9-310281b9301a/mzaf_7979324432520378010.plus.aac.p.m4a' },
  { titel: 'Bad Romance', artiest: 'Lady Gaga', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/39/03/95/3903956c-6b40-b709-a65b-d99f928478ac/mzaf_3550423689496302548.plus.aac.p.m4a' },
  { titel: 'Old Town Road', artiest: 'Lil Nas X', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/9b/87/a1/9b87a1c7-59a1-4d75-bf1a-045072e7a51c/mzaf_13212852533006525594.plus.aac.p.m4a' },
  { titel: 'Uptown Funk', artiest: 'Mark Ronson', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/22/c4/6a/22c46af1-21b0-d636-8204-2e41958bc92c/mzaf_14466648332297641781.plus.aac.p.m4a' },
  { titel: 'Moves Like Jagger', artiest: 'Maroon 5', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/18/c4/2f/18c42f87-27ee-b6ae-c7a8-f38843495329/mzaf_18090131545377638234.plus.aac.p.m4a' },
  { titel: 'Animals', artiest: 'Martin Garrix', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/a1/75/48/a1754841-d05c-0402-bdee-16d724ae47a2/mzaf_16624181595158272558.plus.aac.p.m4a' },
  { titel: 'Billie Jean', artiest: 'Michael Jackson', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/2e/45/ac/2e45ac8d-80fd-c6cc-6c2f-e13ba72f6395/mzaf_5270213574920944683.plus.aac.p.m4a' },
  { titel: 'Flowers', artiest: 'Miley Cyrus', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/68/9e/f7/689ef7fe-14fe-a846-c87f-7d3b2d6344b1/mzaf_4167137058064023087.plus.aac.p.m4a' },
  { titel: 'Smells Like Teen Spirit', artiest: 'Nirvana', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/a6/53/1e/a6531efa-397c-eb73-ecab-9b2790c1471e/mzaf_16440344883389407474.plus.aac.p.m4a' },
  { titel: 'Wonderwall', artiest: 'Oasis', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/d7/7a/d4/d77ad46b-e4cf-daa4-b7f0-862a803268f6/mzaf_10180281302080409695.plus.aac.p.m4a' },
  { titel: 'good 4 u', artiest: 'Olivia Rodrigo', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/a4/eb/3a/a4eb3aeb-eb1f-c382-0aec-ff4eafc34e9e/mzaf_238907262667616343.plus.aac.p.m4a' },
  { titel: 'Hey Ya!', artiest: 'OutKast', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/bc/32/83/bc328389-2e39-9f39-7cd4-e1501938a78d/mzaf_5663538039270291614.plus.aac.p.m4a' },
  { titel: 'Happy', artiest: 'Pharrell Williams', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/ed/a0/19/eda019cf-2794-66d1-208d-2e2e74c26c3d/mzaf_16469762943852039623.plus.aac.p.m4a' },
  { titel: 'Circles', artiest: 'Post Malone', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/f9/b1/aa/f9b1aaed-3e24-227f-153d-99969f8b8464/mzaf_6272498007975402144.plus.aac.p.m4a' },
  { titel: 'Gangnam Style', artiest: 'PSY', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/3d/65/ae/3d65ae0a-7b2c-f14d-5680-cdafaa8cfb2d/mzaf_11206445915046452880.plus.aac.p.m4a' },
  { titel: 'Bohemian Rhapsody', artiest: 'Queen', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/02/02/6e/02026e83-3539-a382-1336-1aa23c0a9a08/mzaf_5131491009747817275.plus.aac.p.m4a' },
  { titel: 'Never Gonna Give You Up', artiest: 'Rick Astley', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/8b/77/73/8b77731b-3c69-ca29-a8ad-b65f0d9d0937/mzaf_5046656274138690281.plus.aac.p.m4a' },
  { titel: 'Livin\' la Vida Loca', artiest: 'Ricky Martin', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/08/a7/cb/08a7cb6d-0618-3c01-6b80-2b92aaca7406/mzaf_15654413058067067771.plus.aac.p.m4a' },
  { titel: 'Umbrella', artiest: 'Rihanna', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/7b/45/22/7b452241-882c-409b-3a9b-23306b14286a/mzaf_8588243939716013218.plus.aac.p.m4a' },
  { titel: 'Hips Don\'t Lie', artiest: 'Shakira', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ac/c7/61/acc7619f-c1e3-e0a5-df9b-0329a35af062/mzaf_13106936727189536738.plus.aac.p.m4a' },
  { titel: 'Drop It Like It\'s Hot', artiest: 'Snoop Dogg', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/58/53/c1/5853c174-820d-96dc-0cc4-7319efef43b2/mzaf_11149216817889125218.plus.aac.p.m4a' },
  { titel: 'Wannabe', artiest: 'Spice Girls', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/93/bf/08/93bf08b8-cc15-2ddb-9a49-2c221707b139/mzaf_6707128577346358435.plus.aac.p.m4a' },
  { titel: 'Eye of the Tiger', artiest: 'Survivor', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/fe/fa/9e/fefa9edd-c023-4d1c-1012-08bfb0ec69e6/mzaf_4651653238471209843.plus.aac.p.m4a' },
  { titel: 'Don\'t You Worry Child', artiest: 'Swedish House Mafia', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/d3/7f/dc/d37fdc20-06c2-10b6-abb7-463b72c8d30e/mzaf_9809458706049778002.plus.aac.p.m4a' },
  { titel: 'Hey Jude', artiest: 'The Beatles', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/30/f0/d7/30f0d7ca-327d-e10c-aa3f-a869503ae6c3/mzaf_11886340716360890712.plus.aac.p.m4a' },
  { titel: 'Mr. Brightside', artiest: 'The Killers', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/fe/b3/b6/feb3b68a-21f8-9948-902d-b862a18c0318/mzaf_16049587660925197353.plus.aac.p.m4a' },
  { titel: 'Paint It, Black', artiest: 'The Rolling Stones', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/da/f5/ec/daf5ece2-6853-c6a4-d481-389001453f75/mzaf_3869995397273029315.plus.aac.p.m4a' },
  { titel: 'Blinding Lights', artiest: 'The Weeknd', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/17/b4/8f/17b48f9a-0b93-6bb8-fe1d-3a16623c2cfb/mzaf_9560252727299052414.plus.aac.p.m4a' },
  { titel: 'Africa', artiest: 'Toto', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/12/e5/ba/12e5ba45-05c1-7060-25a8-c9b718e7f6e8/mzaf_4488601364870711408.plus.aac.p.m4a' },
  { titel: 'YMCA', artiest: 'Village People', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/d7/ff/36/d7ff36ab-3756-079a-5f12-3fa616e95a64/mzaf_2805463762976087995.plus.aac.p.m4a' },
  { titel: 'I Wanna Dance with Somebody', artiest: 'Whitney Houston', url: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/7b/67/fd/7b67fd07-6a7a-0362-135c-878ac5799f2c/mzaf_11309521725869189721.plus.aac.p.m4a' },
]
