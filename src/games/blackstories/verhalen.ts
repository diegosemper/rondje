/**
 * De raadsels voor Black Stories.
 *
 * Allemaal zelf geschreven. De kaartjes van het echte spel zijn beschermd, dus
 * die kunnen hier niet in — en de bekende klassiekers (de parachute, de lift,
 * de blokhut) kent je groep waarschijnlijk al, en dan is het spel in tien
 * seconden voorbij.
 *
 * Waar ze aan moeten voldoen, als je er zelf bij schrijft:
 *
 * · Het raadsel klopt letterlijk. Er staat niets in wat niet waar is; het is
 *   alleen zo verteld dat je de verkeerde kant op denkt.
 * · De oplossing is af te leiden. Er zit geen verzonnen detail in dat je
 *   nooit had kunnen bevragen — anders zit de tafel te raden in plaats van
 *   te redeneren.
 * · Eén kernvondst per raadsel. Twee omkeringen in één verhaal maakt het niet
 *   moeilijker, alleen vager.
 * · Duister mag, smerig niet. Er gaan mensen dood; dat hoeft niet in detail.
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
    titel: 'De wekker',
    raadsel: 'Ze zet haar wekker elke nacht een uur vroeger dan nodig. Daardoor leeft ze nog.',
    oplossing:
      'Ze woont boven een oude bakkerij met een kapotte gasleiding. Het gas hoopt zich \'s nachts op en wordt pas afgevoerd als de afzuiging van de bakkerij om vijf uur aanslaat. Door een uur eerder op te staan en het raam open te zetten heeft ze zonder het te weten elke nacht haar eigen leven gered. De nacht dat ze zich verslaapt, wordt ze door de buurman naar buiten gedragen.',
  },
  {
    titel: 'Het laatste rondje',
    raadsel: 'De barman schenkt haar een glas water. Zij bedankt hem en vertrekt. De man aan de bar is dood.',
    oplossing:
      'De vrouw had de hik. De barman herkende het en joeg haar de stuipen op het lijf door plotseling te schreeuwen — een oude truc. De man naast haar aan de bar had een zwak hart en schrok zo hevig dat hij het niet overleefde. Het glas water dat hij haar daarna gaf was al te laat.',
  },
  {
    titel: 'De verjaardagsfoto',
    raadsel: 'Hij kijkt naar de foto van zijn eigen verjaardag en belt meteen de politie.',
    oplossing:
      'Op de foto staat zijn broer met een gebruinde arm en een witte pols waar zijn horloge zat. Zijn broer had gezegd dat hij die zomer thuis bleef om voor hun zieke moeder te zorgen. De moeder is inmiddels overleden en de broer heeft de erfenis geïnd.',
  },
  {
    titel: 'Zeven verdiepingen',
    raadsel: 'Ze springt van zeven hoog en loopt weg zonder een schrammetje. Er is niets zachts onder haar.',
    oplossing:
      'Het gebouw staat al jaren leeg en wordt gesloopt. Ze sprong van de zevende verdieping naar de zesde: die laag was al weggehaald, dus de vloer lag anderhalve meter lager dan waar ze stond. Het gat leek van bovenaf veel dieper dan het was.',
  },
  {
    titel: 'De brief',
    raadsel: 'Hij leest de brief, verbrandt hem, en meldt zich de volgende ochtend bij de politie.',
    oplossing:
      'De brief is van zijn dochter, die schrijft dat ze weet wat hij dertig jaar geleden gedaan heeft en dat ze ermee naar buiten gaat. Door de brief te verbranden beschermt hij haar tegen wat er met een getuige zou kunnen gebeuren, en door zichzelf aan te geven haalt hij haar uit de positie dat ze het moet bewijzen.',
  },
  {
    titel: 'De hond van de buren',
    raadsel: 'De hond blafte de hele nacht. Toen hij eindelijk stopte, wist de vrouw dat ze moest vluchten.',
    oplossing:
      'De hond blafte al weken elke nacht naar de man die haar stalkte en buiten in zijn auto zat. Zolang de hond blafte, stond de man op straat. Toen het stil werd, was hij niet weg — hij was binnen.',
  },
  {
    titel: 'Twee koffiekopjes',
    raadsel: 'De rechercheur telt twee kopjes op tafel en weet dat de weduwe liegt.',
    oplossing:
      'De weduwe zei dat ze de hele avond alleen was geweest en haar man dood aantrof toen ze thuiskwam. Beide kopjes zijn nog warm en in beide zit suiker — haar man dronk zijn koffie al dertig jaar zwart. Er was dus een derde persoon, die zij kent.',
  },
  {
    titel: 'De marathon',
    raadsel: 'Hij wint de marathon met een straatlengte voorsprong. Een week later zit hij vast.',
    oplossing:
      'Hij liep alleen het eerste en het laatste stuk; daartussen zat hij in een bestelbus. Wat hem verraadde was zijn hartslagmeter, die hij droeg voor zijn sponsor: veertig minuten lang een rusthartslag van 58, midden in een marathon. De data stonden automatisch online.',
  },
  {
    titel: 'De laatste bus',
    raadsel: 'Ze stapt uit bij de verkeerde halte en dat redt haar leven.',
    oplossing:
      'Ze viel in slaap in de bus en werd een halte te laat wakker. Terwijl ze terugliep, reed diezelfde bus door een rood licht bij de spoorwegovergang. Bij haar eigen halte zou ze nooit zijn uitgestapt voor die overgang.',
  },
  {
    titel: 'Het vakantiekiekje',
    raadsel: 'Hij post één foto van zijn vakantie. Als hij thuiskomt is zijn huis leeggehaald.',
    oplossing:
      'Op de foto staat hij met zijn sleutelbos in beeld, scherp genoeg om de sleutel na te maken. Zijn adres stond onder een eerdere post met een foto van zijn voordeur. De inbrekers hoefden niets te forceren, waardoor de verzekering niets uitkeert.',
  },
  {
    titel: 'De duiker',
    raadsel: 'Ze vinden hem in duikpak, midden in een verbrand bos, kilometers van de zee.',
    oplossing:
      'Hij dook voor de kust toen een blusvliegtuig water opschepte om een bosbrand te bestrijden. Hij werd meegezogen in de tank en boven het brandende bos samen met het water losgelaten.',
  },
  {
    titel: 'De pianostemmer',
    raadsel: 'De pianostemmer komt binnen, speelt drie noten en belt de politie.',
    oplossing:
      'De piano staat vals op een manier die alleen ontstaat als hij verplaatst is — en hij is zwaar. De bewoonster zei dat ze al weken niemand binnen had gehad. Onder de piano zit een verse kras in de vloer richting de kelderdeur.',
  },
  {
    titel: 'Het examen',
    raadsel: 'Hij haalt als enige een tien. Daarom wordt hij van school gestuurd.',
    oplossing:
      'De leraar had per ongeluk een antwoordblad van een eerder jaar meegekopieerd, met daarin twee fouten. Hij had exact diezelfde twee fouten — inclusief een rekenfout die niemand zelf zou maken. Dat bewees dat hij het antwoordblad had gezien.',
  },
  {
    titel: 'De verhuizing',
    raadsel: 'Ze verhuizen op een zondag en niemand in de straat vindt dat vreemd. Toch klopt er niets van.',
    oplossing:
      'Ze dragen wel dozen naar buiten maar niets naar binnen, en het huis waar ze uit komen staat al maanden te koop met een sleutelkluisje. Het zijn geen verhuizers maar dieven, en de hele straat heeft staan kijken.',
  },
  {
    titel: 'De tweeling',
    raadsel: 'Hij herkent zijn eigen tweelingbroer niet. Dat is precies de bedoeling.',
    oplossing:
      'Zijn broer heeft jaren geleden zijn identiteit overgenomen na een ongeluk waarbij iedereen aannam dat één van de twee was omgekomen. De man die nu leeft onder de naam van zijn broer doet alsof hij hem niet herkent, want herkenning zou de hele constructie laten instorten.',
  },
  {
    titel: 'De koude soep',
    raadsel: 'Hij neemt één lepel soep, rent naar buiten en springt voor een trein.',
    oplossing:
      'Hij overleefde jaren geleden een schipbreuk en kreeg toen vlees te eten waarvan hem verteld was dat het van een albatros kwam. De soep smaakt naar wat hij toen at. Hij begrijpt op dat moment wat hij werkelijk gegeten heeft, en wie.',
  },
  {
    titel: 'De rookmelder',
    raadsel: 'De rookmelder piepte al dagen. Het is die piep die het gezin gedood heeft.',
    oplossing:
      'De piep was een lege batterij. Om ervan af te zijn heeft de vader het apparaat van het plafond gehaald en in een la gelegd. Toen er twee nachten later werkelijk brand uitbrak, ging er niets af.',
  },
  {
    titel: 'De sollicitatie',
    raadsel: 'Ze krijgt de baan niet, en dat is het beste wat haar dit jaar overkomt.',
    oplossing:
      'Het bedrijf blijkt een dekmantel; iedereen die er die maand is aangenomen is opgepakt bij de inval. Zij viel af omdat ze weigerde haar bankrekening op te geven voor "de administratie", en precies die rekeningen zijn gebruikt om geld door te sluizen.',
  },
  {
    titel: 'Het scherm',
    raadsel: 'Ze kijkt naar een zwart scherm en weet precies wie er achter haar staat.',
    oplossing:
      'Het beeldscherm staat uit en werkt als spiegel. Ze doet alsof ze werkt, zodat de man achter haar niet doorheeft dat ze hem al drie minuten in de weerspiegeling bekijkt.',
  },
  {
    titel: 'De kermis',
    raadsel: 'Hij wint de grote knuffel voor haar. Diezelfde avond doet ze aangifte tegen hem.',
    oplossing:
      'Hij gooide bij het kraam met zijn linkerhand, hard en zuiver. Hij heeft haar altijd verteld dat hij links niets kan — en de klappen die zij maanden geleden kreeg van een "onbekende" kwamen van links. Op de kermis herkent ze de beweging.',
  },
  {
    titel: 'Vier flessen',
    raadsel: 'Er stonden vier flessen in de kelder. Er is er één op, en daarom is er iemand dood.',
    oplossing:
      'De vier flessen zagen er identiek uit: drie wijn, één schoonmaakmiddel dat de vorige bewoner had overgegoten om het kindveilig weg te zetten. Er zat geen etiket meer op. De gast schonk zichzelf in de kelder in, in het donker.',
  },
  {
    titel: 'De fotograaf',
    raadsel: 'Hij maakt de foto van zijn leven en vernietigt hem meteen.',
    oplossing:
      'Op de foto staat het moment waarop hij had kunnen ingrijpen maar bleef fotograferen. Zolang de foto bestaat, bestaat het bewijs dat hij daar stond en niets deed. De prijs die hij ervoor zou krijgen weegt daar niet tegenop.',
  },
  {
    titel: 'Het alibi',
    raadsel: 'Zijn alibi is waterdicht: hij zat op dat moment in de gevangenis. Toch heeft hij het gedaan.',
    oplossing:
      'Hij zat vast voor iets kleins en heeft dat met opzet laten gebeuren, precies in de week dat het zou plaatsvinden. De uitvoering liet hij aan iemand anders over; de gevangenis was geen obstakel maar het hele plan.',
  },
  {
    titel: 'De zwemles',
    raadsel: 'Ze kan uitstekend zwemmen. Toch verdrinkt ze in een zwembad van één meter twintig.',
    oplossing:
      'Ze kreeg een epileptische aanval in het water. Bij dat soort aanvallen maakt de diepte niets uit; je kunt in een paar centimeter verdrinken. Het bad was leeg omdat het al gesloten was en zij nog even doorzwom.',
  },
  {
    titel: 'De erfenis',
    raadsel: 'De notaris leest de naam voor en de hele familie begint te lachen. Een week later lacht niemand meer.',
    oplossing:
      'Alles gaat naar de kat. De familie lacht om de grap van de overledene, tot blijkt dat het bedrag beheerd wordt door degene die voor de kat zorgt — en dat is de thuiszorgmedewerkster die er de laatste twee jaar elke dag was.',
  },
  {
    titel: 'Het parkeerticket',
    raadsel: 'Het parkeerkaartje bewijst zijn onschuld en veroordeelt zijn vrouw.',
    oplossing:
      'Het kaartje is om 21:14 getrokken in een garage veertig kilometer verderop, dus hij kan er niet geweest zijn. Alleen: hij was die avond ziek thuis en zijn auto stond op de oprit. Zijn vrouw had de auto, en zij zei dat ze bij haar zus was.',
  },
  {
    titel: 'De stroomstoring',
    raadsel: 'Tijdens de stroomstoring is er niets gestolen. Toch is dat het moment waarop het gebeurde.',
    oplossing:
      'De inbreker heeft niets meegenomen maar juist iets neergelegd: een kopie van de sleutel, in de meterkast. Alle camera\'s stonden uit, dus er is geen beeld van het enige moment dat ertoe deed.',
  },
  {
    titel: 'De bruiloft',
    raadsel: 'Hij houdt de mooiste speech van de avond. Daarna spreekt niemand hem ooit nog aan.',
    oplossing:
      'De speech was woord voor woord dezelfde die hij twee jaar eerder op de bruiloft van zijn andere vriend hield. Iemand had die opgenomen, en de video stond voor het dessert al rond aan tafel.',
  },
  {
    titel: 'De nachtdienst',
    raadsel: 'De bewaker doet zijn ronde precies zoals het hoort. Daarom wordt hij ontslagen.',
    oplossing:
      'Hij doet zijn ronde elke nacht op exact dezelfde tijden, tot op de minuut. Wie dat een week lang bijhoudt weet precies welke elf minuten de achteringang onbewaakt is. Iemand heeft dat bijgehouden.',
  },
  {
    titel: 'Het cadeau',
    raadsel: 'Ze pakt het cadeau uit, bedankt hem hartelijk, en verlaat hem nog diezelfde week.',
    oplossing:
      'Het is een horloge met een inscriptie. De naam klopt en de datum klopt — alleen is het niet háár verjaardag maar die van de vrouw voor wie het oorspronkelijk bedoeld was. Hij heeft het verkeerde cadeau meegenomen.',
  },
  {
    titel: 'De laatste trein',
    raadsel: 'Hij mist de laatste trein en is daar zijn hele leven dankbaar voor.',
    oplossing:
      'Op het lege perron raakt hij aan de praat met de enige andere achterblijver. Ze zijn inmiddels dertig jaar samen. De trein die hij miste kwam gewoon aan.',
  },
]
