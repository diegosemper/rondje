/**
 * De raadsels voor Black Stories.
 *
 * Allemaal zelf geschreven. De kaartjes van het echte spel zijn beschermd, en
 * de bekende klassiekers (de parachute, de lift) kent je groep waarschijnlijk
 * al — en dan is het spel in tien seconden voorbij.
 *
 * DE TOON IS GÊNANT EN NIET TRAGISCH. De eerste versie van deze lijst zat vol
 * met keurige misdaadverhaaltjes: een rechercheur die een detail opmerkt, een
 * erfenis die niet klopt. Dat zijn prima puzzels en een dooie tafel. Wat wél
 * werkt is een oplossing waar iedereen om moet lachen of ineenkrimpt — iemand
 * die betrapt wordt, iets wat in het ziekenhuis eindigt, een avond die volledig
 * ontspoort.
 *
 * Waar ze aan moeten voldoen, als je er zelf bij schrijft:
 *
 * · Het raadsel klopt letterlijk. Er staat niets in wat niet waar is; het is
 *   alleen zo verteld dat je de verkeerde kant op denkt.
 * · De oplossing is af te leiden met ja/nee-vragen. Geen verzonnen detail dat
 *   je nooit had kunnen bevragen, anders zit de tafel te raden in plaats van
 *   te redeneren.
 * · Eén kernvondst per raadsel. Twee omkeringen maakt het niet moeilijker,
 *   alleen vager.
 * · De klap zit in de oplossing, niet in het raadsel. Het raadsel moet saai
 *   en onschuldig klinken; dat maakt de onthulling pas leuk.
 *
 * Waar het niet over gaat: iets met kinderen, of iets waar iemand niet mee
 * ingestemd zou hebben. Daar valt een tafel stil van in plaats van dat hij
 * lacht.
 */

export interface Zwart {
  titel: string
  /** wat de verteller voorleest — dit ziet iedereen */
  raadsel: string
  /** wat er echt gebeurd is — alleen op het scherm van de verteller */
  oplossing: string
}

export const VERHALEN: Zwart[] = [
  {
    titel: 'De brandweer',
    raadsel: 'Hij belde zelf de brandweer. Toen ze binnenkwamen wilde hij dood neervallen van schaamte.',
    oplossing:
      'Hij had zichzelf met handboeien aan het bed vastgemaakt als verrassing voor zijn vriendin, en het sleuteltje van het bed af laten vallen. Zij stond twee uur vast in de file. Na drie uur wachten heeft hij met zijn neus de telefoon bediend. De brandweer heeft het slot doorgeknipt en niets gezegd, maar ze keken wel.',
  },
  {
    titel: 'De bezorger',
    raadsel: 'Ze deed de deur open voor de bezorger. Een week later was ze single.',
    oplossing:
      'Ze had een hoodie aan die niet van haar vriend was. De bezorger was de broer van haar vriend, en hij herkende zijn eigen trui — die hij een maand eerder aan een huisgenoot had uitgeleend.',
  },
  {
    titel: 'Het spraakbericht',
    raadsel: 'Hij heeft haar die avond geen enkel bericht gestuurd. Toch heeft ze het uitgemaakt.',
    oplossing:
      'Zijn telefoon zat in zijn broekzak en nam elf minuten op terwijl hij in de kroeg tegen zijn vrienden vertelde wat hij écht van haar vond. Het bericht ging vanzelf naar de laatste chat die openstond. Die van haar.',
  },
  {
    titel: 'De weddenschap',
    raadsel: 'Hij won de weddenschap en was de volgende dag zijn baan kwijt.',
    oplossing:
      'De weddenschap was dat hij een hele werkdag zonder onderbroek zou werken. Hij won, maar had het aangekondigd in de groepsapp van kantoor — en zijn leidinggevende zat daar ook in.',
  },
  {
    titel: 'De nacht buiten',
    raadsel: 'De hele straat weet nu precies hoe hij eruitziet. Hij heeft niets fout gedaan.',
    oplossing:
      'Hij slaapt bloot. Om vier uur \'s nachts ging het brandalarm van het complex af en rende hij de gang op. De deur viel achter hem in het slot. Het bleek loos alarm, en hij stond vijftig minuten op straat met een deurmat.',
  },
  {
    titel: 'De pizza',
    raadsel: 'Ze bestelde één pizza, en precies daardoor werd ze betrapt.',
    oplossing:
      'Ze bestelde via een app die adressen onthoudt. Toen haar vriend dezelfde avond iets bestelde, stond er een adres in de lijst waar zij had gezworen nooit geweest te zijn.',
  },
  {
    titel: 'De douche',
    raadsel: 'Hij zat in de wachtkamer met een verhaal over een uitgegleden been in de douche. Niemand geloofde hem.',
    oplossing:
      'De foto liet zien dat het voorwerp er niet in gekomen kan zijn door te vallen. De verpleegkundige zei dat ze het elke week zien en dat hij gewoon de waarheid mocht vertellen. Dat heeft hij niet gedaan.',
  },
  {
    titel: 'De buren',
    raadsel: 'De buren klaagden over geluidsoverlast terwijl er niemand thuis was.',
    oplossing:
      'Er lag iets op het nachtkastje dat per ongeluk aanging toen ze de deur dichtsloeg. Het trilde eraf, viel op de houten vloer en heeft daar zes uur liggen rammelen tot de batterij leeg was.',
  },
  {
    titel: 'De ziekmelding',
    raadsel: 'Hij belde zich ziek en stond de volgende ochtend in de krant.',
    oplossing:
      'De fotograaf maakte een sfeerfoto van het uitvak. Hij staat vooraan, met zijn shirt uit en zijn gezicht beschilderd, bovenop een hek. De foto haalde de voorpagina van de sportbijlage.',
  },
  {
    titel: 'De tattoo',
    raadsel: 'Ze is de enige die haar eigen tattoo nooit gezien heeft, en dat is maar beter ook.',
    oplossing:
      'Ze heeft hem dronken laten zetten op vakantie, op haar onderrug, in een taal die ze niet spreekt. Ze denkt dat er "vrijheid" staat. Iedereen die het wél kan lezen begint te grinniken en zegt niets.',
  },
  {
    titel: 'De groepsfoto',
    raadsel: 'Hij staat niet op de foto, en hij was de enige die niet lachte.',
    oplossing:
      'Hij nam de foto. Op de achtergrond, half buiten beeld, staat zijn vriendin met zijn beste vriend op een manier die geen enkele uitleg meer nodig had.',
  },
  {
    titel: 'Twee cadeaus',
    raadsel: 'Ze kreeg op haar verjaardag twee keer precies hetzelfde cadeau. Daar eindigde een vriendschap.',
    oplossing:
      'Twee mensen gaven haar dezelfde set lingerie, in exact de goede maat. Maar één van de twee had die maat kunnen weten.',
  },
  {
    titel: 'De spiegelochtend',
    raadsel: 'Ze werd wakker in haar eigen bed en wist binnen drie seconden dat er iets goed mis was.',
    oplossing:
      'Alles in de kamer stond gespiegeld. Ze lag in het identieke appartement één verdieping hoger, waar de plattegrond omgekeerd is. De deur stond open en de bewoner was op vakantie.',
  },
  {
    titel: 'De tandarts',
    raadsel: 'De tandarts wist meteen dat hij loog over dat weekend.',
    oplossing:
      'Hij had gezegd dat hij het hele weekend ziek in bed lag. Zijn tong en tanden waren nog blauw van een drankje dat maar op één plek in het land wordt geschonken, en de tandarts was daar zelf ook geweest.',
  },
  {
    titel: 'Eén emoji',
    raadsel: 'Eén emoji kostte hem zijn relatie. Hij heeft nooit iets getypt.',
    oplossing:
      'Hij reageerde met een hartje op een foto van zijn ex, om drie uur \'s nachts. Dacht dat niemand dat zag. De app laat precies zien wie er gereageerd heeft, en zijn vriendin volgde datzelfde account.',
  },
  {
    titel: 'De kat',
    raadsel: 'De kat heeft het verklapt.',
    oplossing:
      'De kat sleepte een onderbroek de woonkamer in en legde hem voor de bank. Er woonde niemand in huis die die maat draagt.',
  },
  {
    titel: 'De was',
    raadsel: 'Ze deed gewoon de was en wist daarna precies waar hij geweest was.',
    oplossing:
      'In zijn broekzak zat een polsbandje van een festival dat dat weekend was. Hij had gezegd dat hij bij zijn moeder was om de schutting te verven.',
  },
  {
    titel: 'De rekening',
    raadsel: 'Hij betaalde de rekening, en precies daardoor werd hij betrapt.',
    oplossing:
      'Het restaurant stuurt na afloop automatisch een mailtje: "Bedankt dat u en uw gast bij ons waren." Hij had verteld dat hij alleen was gaan eten omdat hij even tot rust wilde komen. De mail kwam binnen op de gedeelde tablet in de keuken.',
  },
  {
    titel: 'Het zwembad',
    raadsel: 'Ze sprongen met z\'n allen het zwembad in. Hij kwam er als enige anders uit dan hij erin ging.',
    oplossing:
      'Hij had zich de dag ervoor laten spuiten voor de bruiloft van zijn zus. Het water werd oranje en hij kwam er vlekkerig uit, met strepen in zijn nek waar het eraf gelopen was.',
  },
  {
    titel: 'De sauna',
    raadsel: 'Ze gingen samen naar de sauna en spraken daarna bijna een jaar niet meer.',
    oplossing:
      'Ze liepen daar de ouders van haar vriend tegen het lijf. Niemand had kleren aan en niemand wist waar hij moest kijken. Het was ook nog eens de eerste keer dat ze elkaar ontmoetten.',
  },
  {
    titel: 'De opname',
    raadsel: 'Hij zette de camera aan om te bewijzen dat hij gelijk had, en verloor daarmee alles.',
    oplossing:
      'Hij filmde zijn woonkamer om te bewijzen dat de buren te veel herrie maakten. De opname ving vooral zijn eigen telefoongesprek op, waarin hij tegen iemand anders precies vertelde wat hij van zijn vriendin af wilde. Zij vond het bestand.',
  },
  {
    titel: 'De sleutelbos',
    raadsel: 'Er hing één sleutel te veel aan zijn bos.',
    oplossing:
      'Ze telde ze een keer uit verveling: voordeur, achterdeur, fiets, schuur, werk. En één die nergens bij hoorde. Hij zei dat het een oude was. Hij paste op een deur drie straten verderop.',
  },
  {
    titel: 'De speech',
    raadsel: 'Halverwege zijn speech stond de halve zaal op en liep weg.',
    oplossing:
      'Hij had de speech laten schrijven door een computer en hem niet nagelezen. Op de helft stond de naam van de vorige verloofde van de bruidegom erin, compleet met een anekdote die nooit had mogen rondgaan.',
  },
  {
    titel: 'Het wachtwoord',
    raadsel: 'Hij veranderde zijn wachtwoord om veilig te zitten. Juist daardoor kwam alles uit.',
    oplossing:
      'Het nieuwe wachtwoord was een naam. De gedeelde tablet in de keuken sloeg hem op en stelde hem de volgende ochtend voor aan zijn vriendin toen zij inlogde op een heel andere site.',
  },
  {
    titel: 'Twee bordjes',
    raadsel: 'De ober bracht twee bordjes en verpestte daarmee de hele avond.',
    oplossing:
      'Op de bordjes stond in chocoladeletters "Gefeliciteerd met jullie verloving". Het was de verkeerde tafel. Zij begon te huilen, hij dacht van blijdschap, en toen begreep hij het.',
  },
  {
    titel: 'De taxi',
    raadsel: 'Hij stapte in de taxi en werd zonder iets te zeggen naar huis gereden.',
    oplossing:
      'Hij was te dronken om een adres uit te brengen, maar de chauffeur wist het toch. Het was zijn vader, die er sinds zijn ontslag \'s nachts bij rijdt en dat aan niemand verteld had.',
  },
  {
    titel: 'De verhuisdoos',
    raadsel: 'In de doos zat iets waardoor hij niet meer met haar mee verhuisde.',
    oplossing:
      'Op de doos stond "winterkleding". Er zat geen kleding in maar een stapel brieven en kaartjes van iemand anders, met data van de afgelopen twee jaar.',
  },
  {
    titel: 'De sportschool',
    raadsel: 'Hij ging voor het eerst in maanden naar de sportschool en is er nooit meer geweest.',
    oplossing:
      'Zijn broek scheurde bij de eerste squat, over de volle lengte. Hij had niets eronder, stond voor de spiegelwand, en de groepsles achter hem had vrij zicht.',
  },
  {
    titel: 'De wekker',
    raadsel: 'Ze zet haar wekker elke nacht een uur vroeger dan nodig. Daardoor leeft ze nog.',
    oplossing:
      'Ze woont boven een oude bakkerij met een lekkende gasleiding. Het gas hoopt zich \'s nachts op en wordt pas afgevoerd als de afzuiging beneden om vijf uur aanslaat. Door een uur eerder op te staan en het raam open te zetten heeft ze zonder het te weten elke nacht haar eigen leven gered.',
  },
  {
    titel: 'De laatste bus',
    raadsel: 'Ze stapte uit bij de verkeerde halte en dat redde haar leven.',
    oplossing:
      'Ze viel in slaap en werd een halte te laat wakker. Terwijl ze terugliep reed diezelfde bus door rood bij de spoorwegovergang. Bij haar eigen halte zou ze nooit voor die overgang zijn uitgestapt.',
  },
  {
    titel: 'De duiker',
    raadsel: 'Ze vinden hem in duikpak, midden in een uitgebrand bos, kilometers van zee.',
    oplossing:
      'Hij dook voor de kust op het moment dat een blusvliegtuig water opschepte voor een bosbrand. Hij werd de tank in gezogen en samen met het water boven het brandende bos losgelaten.',
  },
  {
    titel: 'Het vakantiekiekje',
    raadsel: 'Hij postte één foto van zijn vakantie. Toen hij thuiskwam was zijn huis leeg.',
    oplossing:
      'Op de foto hield hij zijn sleutelbos vast, scherp genoeg om na te maken. Zijn adres stond onder een eerdere post met een foto van zijn voordeur. Er was niets geforceerd, en dus keerde de verzekering niets uit.',
  },
  {
    titel: 'De buurvrouw',
    raadsel: 'Hij deed precies wat de buurvrouw vroeg. Daarom staat hij nu op internet.',
    oplossing:
      'De buurvrouw vroeg of hij haar kat van het dak wilde halen. Hij klom naar boven in zijn onderbroek, want hij lag net te zonnen. Het dakraam viel dicht en hij stond veertig minuten vast op dat dak. Iemand aan de overkant filmde het, en de kat zat allang beneden.',
  },
  {
    titel: 'De koptelefoon',
    raadsel: 'Ze zei de hele vergadering geen woord. Toch weet iedereen op kantoor nu wat ze vindt.',
    oplossing:
      'Ze dacht dat haar microfoon uit stond en haar koptelefoon aan. Beide waren andersom. Ze heeft tien minuten lang meegezongen met een nummer, hardop gescholden op haar leidinggevende en haar vriendin verteld wat ze van de stagiair vond.',
  },
  {
    titel: 'Het tweede kussen',
    raadsel: 'Hij vond een kussen dat niet van hem was. Twee dagen later had hij een nieuwe huisgenoot.',
    oplossing:
      'Het kussen lag in de logeerkamer die hij nooit gebruikte. Zijn huisgenoot bleek daar al drie weken iemand te laten slapen zonder het te vertellen. In plaats van ruzie werd het een gesprek over huur, en toen betaalde die persoon gewoon mee.',
  },
  {
    titel: 'De tandenborstel',
    raadsel: 'Ze poetste haar tanden en wist meteen dat het voorbij was.',
    oplossing:
      'Haar elektrische tandenborstel stond nog warm en op stand drie, terwijl zij hem altijd op stand één laat staan. Zij was net thuis en haar vriend zei dat hij de hele dag weg was geweest.',
  },
  {
    titel: 'De pizzabezorger',
    raadsel: 'Hij bestelde één pizza en kreeg er drie. Daardoor is hij verhuisd.',
    oplossing:
      'De twee extra pizzas waren besteld door iemand die zijn adres gebruikte, en dat gebeurde al maanden. Het bleek zijn bovenbuurman te zijn, die zijn pakketten ook aannam en openmaakte. Het gesprek daarover ging zo slecht dat hij binnen twee maanden weg was.',
  },
  {
    titel: 'De zonnebank',
    raadsel: 'Hij ging een half uur naar de zonnebank en durfde daarna twee weken niet naar zijn werk.',
    oplossing:
      'Hij viel in slaap met zijn zonnebril op en wist niet dat de stand veel hoger stond dan hij gewend was. Hij was overal bruin behalve twee grote witte kringen rond zijn ogen. Op de foto van het bedrijfsuitje van die week staat hij vooraan.',
  },
  {
    titel: 'De trouwring',
    raadsel: 'Zijn ring lag in de vriezer. Hij heeft het nooit uitgelegd.',
    oplossing:
      'Zijn vingers waren gezwollen van de warmte en hij kreeg de ring er niet af om af te wassen. Hij heeft zijn hand een half uur in de vriezer gehouden tot de ring eraf ging, en toen is hij vergeten waar hij hem had neergelegd. Zijn vrouw vond hem drie weken later bij de diepvriesdoperwten.',
  },
  {
    titel: 'De schuur',
    raadsel: 'Hij sliep twee nachten in de schuur, en hij was niet uit huis gezet.',
    oplossing:
      'Hij had zijn schoonmoeder horen zeggen dat ze langer bleef dan afgesproken, en zich verstopt om dat gesprek te ontlopen. Toen hij naar binnen wilde had zijn vrouw het alarm aangezet. Hij durfde niet aan te bellen, want dan moest hij uitleggen waarom hij in de schuur zat.',
  },
  {
    titel: 'De kleurenwas',
    raadsel: 'Hij deed de was en werd daarom niet aangenomen.',
    oplossing:
      'Hij waste zijn enige nette overhemd samen met een rode handdoek. Het overhemd werd roze. Hij ging toch naar het gesprek in een T-shirt met een grote tekst erop, omdat hij niets anders had, en die tekst kwam ter sprake.',
  },
  {
    titel: 'De teruggegeven sleutels',
    raadsel: 'Ze gaf hem haar sleutels terug en hij was opgelucht.',
    oplossing:
      'Hij was vergeten dat ze een sleutel had en had haar twee weken lang ontweken om het uitmaken niet te hoeven doen. Toen ze de sleutels kwam brengen bleek ze het zelf allang uitgemaakt te hebben in een bericht dat hij nooit gelezen had.',
  },
  {
    titel: 'De kapper',
    raadsel: 'Hij zat twintig minuten bij de kapper zonder iets te zeggen, en toen was hij kaal.',
    oplossing:
      'Hij was een taal aan het oefenen en wilde de kapper in die taal uitleggen wat hij wilde. Hij zei per ongeluk het woord voor helemaal kort in plaats van een beetje korter. Uit schaamte heeft hij niets gezegd en de kapper zijn gang laten gaan.',
  },
  {
    titel: 'De oplader',
    raadsel: 'Ze leende zijn oplader. Daardoor kwam alles uit.',
    oplossing:
      'Toen ze de oplader uit het stopcontact naast zijn bed trok, kwam er een tweede telefoon mee die daar ook aan hing. Die telefoon ging aan en er stond een naam op het scherm die niet de hare was.',
  },
  {
    titel: 'De duikbril',
    raadsel: 'Hij nam een duikbril mee naar een feest en ging er als held vandaan.',
    oplossing:
      'De gastheer had een ring van zijn oma door de afvoer van de wasbak laten glijden. Hij had die duikbril bij zich omdat hij rechtstreeks van het zwembad kwam. Hij heeft de sifon losgedraaid, de bril opgezet tegen het spatten, en de ring eruit gevist.',
  },
  {
    titel: 'De verjaardagskaart',
    raadsel: 'Hij stuurde een kaart en kreeg er ruzie mee.',
    oplossing:
      'Hij stuurde zijn vriendin een kaart met een grap over haar leeftijd. De kaart kwam aan op het adres van haar ouders, want daar staat ze nog ingeschreven. Haar moeder heeft hem opengemaakt, en die had dezelfde leeftijd toen ze die grap las.',
  },
  {
    titel: 'De tuinslang',
    raadsel: 'Hij stond om zes uur in de ochtend met een tuinslang in de weer en dat redde zijn avond.',
    oplossing:
      'Zijn huisgenoot was ziek geworden op de bank, en die bank moest voor twee uur weg omdat er visite kwam. Hij heeft de bank naar buiten gesleept en schoongespoten. De bank was nat maar schoon, en er lag een deken overheen toen de visite kwam.',
  },
  {
    titel: 'De ochtendbus',
    raadsel: 'Ze stapte in de bus en wist meteen dat ze te ver was gegaan.',
    oplossing:
      'Ze nam de eerste bus naar huis na een feest en zag dat iedereen om haar heen op weg was naar hun werk. Ze had nog glitters op haar gezicht en een jas aan die niet van haar was. In de zak van die jas zat een portemonnee met een onbekend pasje.',
  },
  {
    titel: 'De rookmelder',
    raadsel: 'De rookmelder ging af en hij was juist blij.',
    oplossing:
      'Hij zat vast in een gesprek met iemand die hij had uitgenodigd en die niet meer wegging. De rookmelder ging af omdat hij het eten had laten aanbranden, precies zoals hij had gehoopt. De avond was daarna snel voorbij.',
  },
  {
    titel: 'De spiegel',
    raadsel: 'Ze hing een spiegel op en verloor daardoor haar borg.',
    oplossing:
      'Ze boorde in de muur om de spiegel op te hangen en raakte een waterleiding. De muur moest open, de vloer eruit, en dat stond allemaal op de eindinspectie van het appartement.',
  },
  {
    titel: 'De handdoek',
    raadsel: 'Hij nam een handdoek mee naar zijn werk en iedereen vond dat logisch.',
    oplossing:
      'Hij was met de fiets gekomen door een enorme bui en had geen droge kleren. De handdoek had hij al een week in zijn tas omdat hij van plan was te gaan zwemmen, wat er nooit van kwam. Hij heeft zich op het toilet afgedroogd en de rest van de dag in zijn sportkleren gewerkt.',
  },
  {
    titel: 'De vaatwasser',
    raadsel: 'Hij deed de vaatwasser aan en daarna sprak niemand meer met hem.',
    oplossing:
      'Er zat een telefoon in de vaatwasser, verstopt tussen de pannen door iemand die aan het opruimen was. Het was de telefoon van zijn huisgenoot, met de enige foto van haar opa erop die nergens anders stond.',
  },
  {
    titel: 'De wc-deur',
    raadsel: 'Ze deed de wc-deur op slot en daarom kwam de politie.',
    oplossing:
      'Het slot was kapot en ze zat vast in de wc van een leegstaand kantoorpand waar het feest was. Iedereen was al weg en dacht dat zij ook naar huis was. Ze heeft zelf gebeld, en de politie moest de deur forceren.',
  },
  {
    titel: 'De glijbaan',
    raadsel: 'Hij ging één keer van de glijbaan en moest daarna naar de eerste hulp.',
    oplossing:
      'Hij had een weddenschap aangenomen om met zijn armen over elkaar naar beneden te gaan. Halverwege kantelde hij en heeft hij zijn schouder uit de kom gedraaid tegen de rand. De weddenschap ging om twee euro.',
  },
  {
    titel: 'De hond van de buren',
    raadsel: 'Hij liet de hond van de buren uit en kwam terug met een andere hond.',
    oplossing:
      'In het park heeft hij de riem even losgemaakt bij een groep honden die op elkaar leken. Hij pakte de verkeerde en merkte het pas thuis, toen die hond meteen naar boven liep alsof hij er woonde. De echte eigenaar stond al op de stoep met de hond van de buren.',
  },
  {
    titel: 'De kerstborrel',
    raadsel: 'Hij was de enige die nuchter bleef, en toch schaamde hij zich het meest.',
    oplossing:
      'Hij was aangewezen als bob en heeft de hele avond alles gefilmd omdat hij zich verveelde. Bij het naar huis brengen heeft hij die video in de verkeerde groep gezet: die van het hele bedrijf in plaats van die van zijn afdeling.',
  },
  {
    titel: 'De koffer',
    raadsel: 'Zijn koffer kwam als enige wél aan, en dat was het probleem.',
    oplossing:
      'Hij was op vakantie met een groep en had iedereens drank in zijn koffer verdeeld om gewicht te besparen. De koffer ging open op de band. Zijn familie stond erbij toen er veertien flessen over de vloer rolden op een reis die als wandelvakantie was aangekondigd.',
  },
  {
    titel: 'De achterbank',
    raadsel: 'Ze vond iets op de achterbank en was juist gerustgesteld.',
    oplossing:
      'Ze vond een oorbel die niet van haar was en dacht meteen het ergste. Het bleek de oorbel van zijn zus, die hij die week naar het station had gebracht. De bon van dat station lag onder de stoel, met datum en tijd.',
  },
  {
    titel: 'Het balkon',
    raadsel: 'Hij stond in zijn onderbroek op het balkon en dat was met opzet.',
    oplossing:
      'Hij had zijn eigen sleutels binnen laten liggen en zijn huisgenoot zou pas uren later thuiskomen. In plaats van in het trappenhuis te wachten is hij via het balkon van de buren naar binnen geklommen. Die buren waren thuis, en hebben hem daarna nog koffie gegeven.',
  },
  {
    titel: 'De supermarkt',
    raadsel: 'Ze deed boodschappen voor twee euro en werd eruit gezet.',
    oplossing:
      'Ze had een weddenschap dat ze een hele week zou eten van wat er in de afgeprijsde bak lag. Bij het uitzoeken maakte ze de verpakkingen open om te kijken hoe oud het was. Dat is bij de derde verpakking opgemerkt.',
  },
  {
    titel: 'De reservesleutel',
    raadsel: 'Hij verstopte een reservesleutel en kon daarna zijn eigen huis niet meer in.',
    oplossing:
      'Hij legde de sleutel onder een losse tegel bij de voordeur. De gemeente heeft die week het hele pad opnieuw gelegd. De sleutel ligt nog ergens onder twintig centimeter zand.',
  },
  {
    titel: 'De make-up',
    raadsel: 'Hij leende iets van zijn zus en kwam daardoor te laat op zijn werk.',
    oplossing:
      'Hij had een enorme zuigzoen in zijn hals en gebruikte de foundation van zijn zus om hem weg te werken. Het duurde drie kwartier voor het goed was, en het regende toen hij op de fiets stapte.',
  },
  {
    titel: 'De bruiloft',
    raadsel: 'Ze danste de hele avond niet en werd toch naar huis gestuurd.',
    oplossing:
      'Ze had de gastenboodschappen voor de bruiloft opgehaald en de kaartjes met de tafelindeling zelf neergelegd. Ze had twee families omgedraaid die al vijftien jaar niet met elkaar praatten. Halverwege het diner werd duidelijk waarom er zo geschreeuwd werd.',
  },
  {
    titel: 'De thermostaat',
    raadsel: 'Hij zette de verwarming lager en kreeg daardoor een nieuwe relatie.',
    oplossing:
      'Hij wilde stoken besparen en zette de verwarming uit in de kamers die niemand gebruikte. Zijn huisgenoot kreeg het daardoor koud op haar eigen kamer en zat elke avond in de woonkamer. Na drie weken waren ze samen.',
  },
  {
    titel: 'De inbreker',
    raadsel: 'Er was ingebroken, maar er was niets weg. Hij schaamde zich dood.',
    oplossing:
      'Hij was zelf de inbreker. Hij had zijn sleutels kwijt en heeft het keukenraam geforceerd bij wat hij dacht dat zijn eigen huis was. Het was het huis ernaast, dat er precies hetzelfde uitziet. Hij heeft het zelf opgebiecht toen de politie er al stond.',
  },
  {
    titel: 'De douchekop',
    raadsel: 'Hij maakte de douchekop schoon en kreeg daarvoor de schuld van iets wat hij niet gedaan had.',
    oplossing:
      'Hij legde de douchekop in een zak azijn om hem te ontkalken en vergat hem. Zijn huisgenoot stapte de volgende ochtend onder de douche en dacht dat er expres iets in het water was gedaan als grap. Het huis rook drie dagen naar azijn.',
  },
  {
    titel: 'De laatste trein',
    raadsel: 'Ze haalde de laatste trein en was daar niet blij mee.',
    oplossing:
      'Ze had gezegd dat ze de laatste trein niet zou halen, zodat ze bij iemand kon blijven slapen zonder dat uit te hoeven leggen. Toen ze hem toch haalde, stond haar vriendengroep op het perron om haar uit te zwaaien en kon ze er niet meer onderuit.',
  },
  {
    titel: 'De kabel',
    raadsel: 'Hij trok aan een kabel en verpestte het feest van iemand anders.',
    oplossing:
      'Hij wilde zijn telefoon opladen en trok de dichtstbijzijnde stekker eruit. Dat was de vriezer van het cafe waar die avond honderd ijsjes in lagen voor een verjaardag. Het werd pas de volgende middag ontdekt.',
  },
  {
    titel: 'De eerste saunabeurt',
    raadsel: 'Hij ging voor het eerst naar de sauna en is er nooit meer geweest.',
    oplossing:
      'Hij wist niet dat er op dat tijdstip geen kleding aan mocht en hield als enige zijn zwembroek aan. Nadat hij daarop was aangesproken, trok hij hem uit en kwam meteen daarna een collega binnen die hij de dag erna moest spreken over een contract.',
  },
  {
    titel: 'De stofzuiger',
    raadsel: 'Ze stofzuigde en vond daarmee bewijs.',
    oplossing:
      'In de zak van de stofzuiger zat een oorbel die al twee weken kwijt was, samen met zand. Zij was in die twee weken niet op het strand geweest, en haar vriend zei dat hij die zaterdag had doorgewerkt.',
  },
  {
    titel: 'De barbecue',
    raadsel: 'Hij stak de barbecue aan en verloor zijn wenkbrauwen, maar niet door het vuur.',
    oplossing:
      'De barbecue wilde niet aan en zijn vriend gooide er spiritus op terwijl hij eroverheen gebogen stond. De klap zelf raakte hem niet, maar hij schrok zo dat hij achterover in de heg viel. Zijn wenkbrauwen zijn later die avond als weddenschap afgeschoren.',
  },
  {
    titel: 'De ochtendloop',
    raadsel: 'Hij ging hardlopen om half zeven en kwam pas om twaalf uur thuis.',
    oplossing:
      'Hij was nog dronken van de avond ervoor en dacht dat hardlopen zou helpen. Na twee kilometer is hij op een bankje in slaap gevallen. Hij werd wakker toen er een markt om hem heen was opgebouwd.',
  },
  {
    titel: 'De gedeelde agenda',
    raadsel: 'Hij zette één afspraak in zijn agenda en daarmee was de verrassing voorbij.',
    oplossing:
      'Hij plande het verrassingsfeest van zijn vriendin in de agenda die ze delen, onder de naam van het restaurant. Zij zag een reservering voor achttien personen op haar eigen verjaardag.',
  },
  {
    titel: 'Het matras',
    raadsel: 'Ze sliep op de grond terwijl er een prima bed stond.',
    oplossing:
      'Het bed was net bezorgd en de bezorgers hadden het matras al uitgepakt in de kamer. Alleen bleek het matras twintig centimeter te breed voor het frame. Zij heeft twee nachten op dat matras op de grond geslapen tot ze het kon ruilen.',
  },
  {
    titel: 'De spiegel op de foto',
    raadsel: 'Hij staat niet op de foto en toch gaat de foto over hem.',
    oplossing:
      'Hij maakte de foto en had niet door dat achter de groep de spiegel van de garderobe hing. Daarin is te zien wat hij met zijn andere hand deed, en wat er op het scherm van zijn telefoon stond.',
  },
  {
    titel: 'De vieze koelkast',
    raadsel: 'Niemand wilde de koelkast schoonmaken, tot er een brief kwam.',
    oplossing:
      'De brief was van de verhuurder en kondigde een inspectie aan. In de koelkast stond een bak die er al vier maanden stond en waar niemand van wist van wie hij was. Ze hebben hem ongeopend in de container gegooid en de container is een week later niet geleegd.',
  },
  {
    titel: 'De draaideur',
    raadsel: 'Hij bleef in een draaideur staan en kreeg daarna de baan.',
    oplossing:
      'De deur klemde met zijn tas ertussen en hij stond vast terwijl de hele hal toekeek. Hij bleef rustig, hielp de beveiliging de deur weer los te krijgen en maakte er een grap over. De vrouw die dat zag was degene die hem daarna zou interviewen.',
  },
  {
    titel: 'De verkeerde kant',
    raadsel: 'Ze reden drie uur de goede kant op en toch kwamen ze nergens.',
    oplossing:
      'Ze hadden de naam van de camping ingevoerd zonder de plaats erbij. Er bestaan twee campings met die naam, en ze kwamen aan bij de verkeerde, driehonderd kilometer van hun vrienden. De eigenaar had zelfs een reservering op die achternaam, van iemand anders.',
  },
  {
    titel: 'De contactlens',
    raadsel: 'Hij deed één contactlens in en heeft daardoor de hele avond niets gezien.',
    oplossing:
      'Hij had de tweede lens laten vallen en heeft op de tast gezocht. Wat hij vond en indeed was geen lens maar een stukje folie van de verpakking. Zijn oog zat de hele avond dicht en de volgende dag moest hij naar de huisarts.',
  },
  {
    titel: 'De poster',
    raadsel: 'Hij hing een poster op en kwam er daardoor achter dat hij bestolen werd.',
    oplossing:
      'Achter de poster zat een gat in de muur naar de berging. Daar stond zijn fiets, en er stonden twee fietsen die hij niet kende. De berging werd al maanden gebruikt door iemand met een sleutel die hij nooit had uitgedeeld.',
  },
  {
    titel: 'De frituurpan',
    raadsel: 'Hij zette de frituurpan aan en de buren moesten evacueren.',
    oplossing:
      'De frituurpan stond op een plank net onder de rookmelder van het hele portiek, die aan de brandweer gekoppeld is. Er was geen brand, alleen veel damp. Het hele portiek stond buiten in pyjama terwijl zijn frikandellen klaar waren.',
  },
  {
    titel: 'De bezorgde moeder',
    raadsel: 'Zijn moeder belde de politie, en hij zat twee meter van haar vandaan.',
    oplossing:
      'Hij was na een feest bij zijn ouders blijven slapen in de logeerkamer, waar nooit iemand komt. Zijn moeder zag zijn bed onbeslapen en zijn telefoon stond uit omdat hij leeg was. Ze heeft hem als vermist opgegeven terwijl hij door de muur heen lag te snurken.',
  },
  {
    titel: 'De verkeerde groep',
    raadsel: 'Ze stuurde een foto naar de verkeerde groep en werd daardoor uitgenodigd.',
    oplossing:
      'Ze stuurde een foto van haar nieuwe tattoo naar de groep van haar sportvereniging in plaats van naar haar vriendinnen. De trainer bleek dezelfde tattoo te hebben, en zij werd uitgenodigd voor de barbecue van de tattooshop waar ze allebei kwamen.',
  },
  {
    titel: 'Het kattenluik',
    raadsel: 'Ze hebben geen kat, en toch was het kattenluik het probleem.',
    oplossing:
      'De vorige bewoner had een kat en het luik zat er nog in. Hij had zijn sleutels binnen laten liggen en probeerde met zijn arm door het luik bij het slot te komen. Zijn arm zat klem en zijn huisgenoot heeft eerst foto\'s gemaakt voordat hij hielp.',
  },
  {
    titel: 'De eerste werkdag',
    raadsel: 'Hij was ruim op tijd op zijn eerste werkdag en werd toch bijna ontslagen.',
    oplossing:
      'Hij was zo vroeg dat er nog niemand was en hij heeft zichzelf binnengelaten via een deur die open stond. De beveiliging vond een onbekende man die door de kantoren liep en zijn pasje kreeg hij pas die middag.',
  },
  {
    titel: 'De koffiepot',
    raadsel: 'Ze zette koffie voor iedereen en niemand heeft haar daarna nog vertrouwd.',
    oplossing:
      'Ze had de koffiekan gebruikt om de planten water te geven met plantenvoeding erin en hem daarna alleen omgespoeld. De koffie smaakte vreemd en het heeft twee dagen geduurd voordat iemand doorhad waarom.',
  },
  {
    titel: 'De kluis',
    raadsel: 'De kluis ging open en dat was juist slecht nieuws.',
    oplossing:
      'De kluis in het vakantiehuis stond op de fabriekscode en ging open zonder dat iemand hem had ingesteld. Erin lagen de paspoorten van de vorige gasten, die al drie dagen thuis zaten zonder te weten waar die waren.',
  },
  {
    titel: 'De fietstas',
    raadsel: 'Hij fietste veertig minuten met andermans tas en merkte het pas thuis.',
    oplossing:
      'Bij het station staan honderden dezelfde fietsen met dezelfde zwarte tas. Hij had zijn eigen fiets gepakt maar de tas van de fiets ernaast, die hij er zelf op had gezet toen hij zijn slot pakte. In de tas zat een laptop van een bedrijf.',
  },
  {
    titel: 'De verrassing',
    raadsel: 'Hij sprong tevoorschijn en niemand riep hoera.',
    oplossing:
      'Hij was een dag te vroeg. Het verrassingsfeest was voor de volgende avond, en hij sprong tevoorschijn tijdens een gewoon etentje van de ouders van zijn vriendin, die van niets wisten. Daarmee verklapte hij meteen het hele feest.',
  },
  {
    titel: 'De wasstraat',
    raadsel: 'Hij ging door de wasstraat en werd kletsnat.',
    oplossing:
      'Hij had het dak van de cabriolet niet goed dicht gedaan en dacht dat het klikken van de sluiting genoeg was. Halverwege de wasstraat schoof het dak open en kon hij er niet uit, want de borstels draaiden door.',
  },
  {
    titel: 'De naamplaat',
    raadsel: 'Ze veranderde één letter en kreeg een jaar lang gratis post.',
    oplossing:
      'Ze plakte een letter over haar achternaam op de brievenbus om van reclame af te komen. In plaats daarvan kwam er post binnen voor iemand die daar vroeger woonde, inclusief tijdschriften waar nog een abonnement op liep.',
  },
  {
    titel: 'De fysiotherapeut',
    raadsel: 'Ze ging naar de fysiotherapeut en heeft daarna van praktijk gewisseld.',
    oplossing:
      'De fysiotherapeut vroeg waar de blauwe plekken op haar heupen vandaan kwamen. Ze had het antwoord al klaar over de hoek van een tafel, maar haar vriend zat mee in de behandelkamer en zei precies op dat moment iets heel anders.',
  },
  {
    titel: 'De slimme deurbel',
    raadsel: 'Hij was de hele avond thuis, en toch weet zijn vriendin dat hij loog.',
    oplossing:
      'De slimme deurbel stuurt een melding met een foto bij elke beweging. Om kwart over elf stond er iemand voor de deur die hij binnenliet. Hij wist niet dat de meldingen ook op haar telefoon binnenkomen sinds ze hier vorige maand samen iets mee instelden.',
  },
  {
    titel: 'De hotelkamer',
    raadsel: 'Ze boekten één nacht en kregen een rekening voor drie.',
    oplossing:
      'Ze hadden het bordje niet storen aan de deur gehangen en zijn de volgende ochtend niet uitgecheckt, omdat ze de kamer niet uit wilden. De receptie heeft twee keer aangeklopt, geen antwoord gekregen en de kamer doorgeboekt. De extra nachten stonden gewoon op de rekening.',
  },
  {
    titel: 'De reservering',
    raadsel: 'Hij reserveerde een tafel voor twee en zat er met zijn vieren.',
    oplossing:
      'Hij had twee dates op dezelfde avond in hetzelfde restaurant gepland, met drie uur ertussen. De eerste bleef langer dan bedoeld en de tweede kwam vroeger. De vierde was de ober, die ging zitten om het uit te leggen.',
  },
  {
    titel: 'De wasmand',
    raadsel: 'Hij deed de was van zijn huisgenoot en heeft er spijt van.',
    oplossing:
      'Hij wilde aardig zijn en heeft alles uit haar mand in de machine gegooid, inclusief wat er onderin lag. Het ging kapot in de trommel en hij heeft de onderdelen moeten uitleggen toen zij vroeg wat dat geratel was.',
  },
  {
    titel: 'De zonnebrand',
    raadsel: 'Ze smeerde zich goed in en toch weet iedereen op het strand wat ze gedaan heeft.',
    oplossing:
      'Ze had zich laten insmeren door iemand die alleen haar rug deed en daarbij één grote handafdruk heeft achtergelaten die niet is uitgesmeerd. Die afdruk is wit gebleven op een verder helemaal rode rug, en het was niet de hand van haar vriend.',
  },
  {
    titel: 'De dunne muur',
    raadsel: 'De buurman klopte op de muur en zij begon te lachen.',
    oplossing:
      'Ze had de hele week ruzie met die buurman over zijn harde muziek. Het kloppen kwam nu van zijn kant omdat zij en haar vriend te veel lawaai maakten. Ze had eindelijk iets om over te onderhandelen.',
  },
  {
    titel: 'De ongelezen appjes',
    raadsel: 'Hij las haar berichten niet, en daardoor kwam alles uit.',
    oplossing:
      'Hij had haar gedempt zodat zijn scherm niet zou oplichten terwijl hij bij iemand anders was. Zij zag dat haar berichten wel bezorgd waren maar dagenlang niet gelezen, terwijl hij ondertussen in andere groepen wel actief was.',
  },
  {
    titel: 'De rugzak',
    raadsel: 'Hij nam een rugzak mee naar het verjaardagsfeest van zijn schoonouders.',
    oplossing:
      'Hij had die middag met zijn vriendin afgesproken op een parkeerplaats onderweg en wilde schone kleren bij zich hebben. Zijn schoonmoeder heeft de rugzak opgeruimd en opengemaakt om te kijken van wie hij was.',
  },
  {
    titel: 'De gedeelde locatie',
    raadsel: 'Zij stond stil op de kaart en dat was precies het probleem.',
    oplossing:
      'Ze had haar locatie gedeeld met haar vriendinnen zodat ze veilig thuis zou komen. De locatie stond de hele nacht stil op een adres dat niemand kende, en de volgende ochtend stond ze op een ander adres. De groepsapp had toen al drie theorieën.',
  },
  {
    titel: 'De bloemen',
    raadsel: 'Hij kwam thuis met bloemen en kreeg meteen ruzie.',
    oplossing:
      'Hij had de bloemen gekocht bij het tankstation naast het hotel waar hij die middag was geweest. De bon zat nog in het papier, met adres en tijd erop. Hij zei dat hij op kantoor was geweest.',
  },
  {
    titel: 'De strandtent',
    raadsel: 'Ze liepen samen de zee in en kwamen apart terug.',
    oplossing:
      'Ze hadden hun kleren op het strand laten liggen om zonder te zwemmen. Het was opkomend water en hun kleren waren weg toen ze terugkwamen. Zij vond een handdoek, hij moest het honderd meter zonder doen langs een volle strandtent.',
  },
  {
    titel: 'De telefoon op tafel',
    raadsel: 'Hij legde zijn telefoon met het scherm naar beneden, zoals altijd. Toch ging het mis.',
    oplossing:
      'Zijn telefoon lag op de glazen tafel van het cafe. Zijn vriendin zat aan de andere kant en zag het scherm oplichten in de weerspiegeling van de spiegelwand achter hem.',
  },
  {
    titel: 'De ochtend erna',
    raadsel: 'Ze werd wakker in een vreemd huis en was vooral opgelucht.',
    oplossing:
      'Ze had de hele avond gedronken en herinnerde zich niets. Op de keukentafel lag een briefje van de huisgenoot die haar had binnengelaten, met de mededeling dat ze op de bank had geslapen en dat haar jas aan de kapstok hing. Er was niets gebeurd.',
  },
  {
    titel: 'De vakantiefoto',
    raadsel: 'Hij zette één foto online en verloor daarmee zijn baan.',
    oplossing:
      'Op de foto stond hij op een terras in de zon, op een dag dat hij zich ziek had gemeld. Zijn leidinggevende stond twee tafels verderop op diezelfde foto, want die was daar op zakenreis.',
  },
  {
    titel: 'De koude kant',
    raadsel: 'Hij sliep aan de koude kant van het bed en daaraan zag ze het.',
    oplossing:
      'Hij sliep altijd aan de kant van het raam, maar lag die nacht aan de andere kant. Toen ze vroeg waarom, zei hij dat hij het warm had. Het raam stond open, en de kant waar hij normaal lag was de warme kant geweest als er niemand anders had gelegen.',
  },
]
