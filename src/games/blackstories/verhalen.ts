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
]
