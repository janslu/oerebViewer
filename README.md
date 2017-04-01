**INHALT**

[TOC]

# 1. EINLEITUNG #
Dieses Repository beinhaltet den vollständigen Quelltext um eine lauffähige Instanz der SmartAuszug zu erstellen. Die vordefinierten Dienste sind auf den Kanton Bern zugeschnitten, können jedoch einfach für andere Kantone angepasst werden. Dieses README dient als Dokumentation und hilft bei der Installation der SmartAuszug.

## 1.1 Zu diesem Repository ##
* Dieses Repository beinhaltet die komplette SmartAuszug und es kann eine selbständige Installation der Applikation aus diesem Repository erzeugt werden.
* Ebenfalls findet sich hier die komplette Historie mit Versionierung der Entwicklung.
* Issues / Bugs und Wünsche können mit dem Issue-Tracker erfasst werden.

---

# 2. FUNKTIONSSCHEMA DES SMARTAUSZUGS #
![oereb_client_architektur_v1_3.png](https://bitbucket.org/repo/kbojGq/images/2479633775-oereb_client_architektur_v1_3.png)

---

# 3. TECHNISCHE VORAUSSETZUNGEN #
Damit die Applikation auf einem Webserver installiert werden kann, müssen folgende Bedingungen erfüllt sein:

* Die Applikation muss als lauffähiger "Build" vorliegen. Wie dieser Build erzeugt wird, ist weiter unten beschrieben.
* Der Webserver muss fähig sein HTML-Dokumente auszuliefern. Auf der Betreiberseite wird also nur eine minimale Infrastruktur benötigt.

## 3.1 Client-Technologie ##
Da die gesamte Anwendungs-Logik im Client implementiert ist, wurde die Applikation vollständig mit [AngularJS, Version 1.5.11](https://angularjs.org/) realisiert. Für das Markup des Frontend wurde - basierend auf dem [Foundation Framework, v6.1](http://foundation.zurb.com/) - ein HTML/CSS(SASS)/JS-Template erstellt.
Damit konnte eine performante und flexible Lösung gebaut werden welche kaum Anforderungen an die (Web)Server-Infrastruktur stellt: dies macht es möglich die SmartAuszug sehr einfach durch einen beliebigen Kanton zu betreiben.

## 3.2 Einschränkungen ##
### 3.2.1 SSL-Zertifikate ###
Damit die App vollständig genutzt werden kann, müssen alle Dienste mit dem SSL-Protokoll arbeiten (ansonsten funktioniert unter Chrome die Geolokalisierung nicht). Einige Dienste besitzen nur ein manuell ausgestelltes Zertifikat. Dieses wird nicht immer akzeptiert und muss gesondert hinzugefügt werden.

### 3.2.2 Browser ###
Die Applikation wurde mit folgenden Browser (jeweils mit der aktuellen und vorletzten Version des jeweiligen Browsers) getestet ([siehe auch: Browser-Test-Issue](https://bitbucket.org/stubr/oereb-app/issues/41/browser-check)):

 * Windows (7/10): Chrome, Firefox, IE, Opera
 * Android (5.x/6.x/7.x): Chrome
 * iOS (7): Safari, Chrome
---

# 4. ENTWICKLUNG UND LOKALES TESTEN #
Die Applikation kann relativ einfach auf einer lokalen Entwicklungsmaschine installiert werden. [Weiterentwicklungen sind möglich und können via PR (Pull-Requests) beantragt werden](https://bitbucket.org/stubr/oereb-app/pull-requests/).

## 4.1 Voraussetzungen und Vorbereitung ##
Die Applikation kann sowohl unter einem der gängigen OS installiert werden. Vorraussetzung ist die Installation von [NodeJS](https://nodejs.org/en/). Die Installation von node.js erfolgt in Mac OS X und Windows praktisch identisch via den [Installer von NodeJS](https://nodejs.org/en/download/). Alle nachfolgenden Installationschritte basieren auf NodeJS. Damit NodeJS effektiv genutzt werden kann, werden Kenntnisse in der Verwendung eines Terminals unter dem jeweiligen OS vorausgesetzt.

## 4.2 Installationsanleitung ##

1. Die aktuelle Version aus diesem Repository herunterladen
2. npm install -g bower gulp yarn
3. yarn
4. bower install
5. gulp serve

## 4.3 Anmerkung ##
Mit **gulp serve** wird der Builder im Entwicklungsmodus gestartet: die Applikation läuft dann in einem lokalen Websverver.  
Mit **gulp build** wird eine produktive Version der App gebaut. Externe Ressourcen werden gekürzt (minified) und zusammengefasst (concatenate). Die produktive Version befindet sich im Verzeichnis /dist/. Das gesamte **/dist/** Verzeichnis muss ins Root der produktiven Umgebung kopiert werden, damit die Applikation lauffähig ist.

## 4.4 Testen der Applikation ##
Für Tests können die folgenden Parzellen verwendet werden:

* 741 in Ittigen (Grauholzstrasse 50, 3063 Ittigen)
* 1169 in Brügg (Portstrasse 38, 2555 Brügg)

---

# 5. ERSTELLEN EINES LAUFFÄHIGEN BUILD #
Damit eine lauffähige Version auf einem externen Webserver publiziert werden kann, muss zuerst ein so genannter **"Build"** aus den Source-Files der Applikation erzeugt werden. Dies geschieht direkt aus der **Entwicklungsinstallation** heraus. Zuerst wird - wie in Kapitel 4.1 beschrieben eine Entwicklungsumgebung erzeugt:

1. Die aktuelle Version aus diesem Repository herunterladen
2. npm install -g bower gulp yarn
3. yarn
4. bower install
5. **gulp build**


```
Der letzte Schritt besteht aus einem gulp build.
Damit werden alle Quelldateien komprimiert und für die Publikation auf einem externen Webserver optimiert.
```

---

# 6. KONFIGURATION #
## 6.1. Layers ##
Im LayersService (``/src/app/components/layers/layers.service.js``) können die bestehenden Layers angepasst werden. Im Block «LAYERS START» bis «LAYERS END» sind die Layers jeweils in einer Methode definiert. Der Rückgabewert dieser Methoden muss entweder ein [ol.Layer.Tile](http://openlayers.org/en/v3.7.0/apidoc/ol.layer.Tile.html) zurückgeben oder ein [Promise](https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Promise) mit einer ol.Layer.Tile Auflösung (das ermöglicht ein dynamisches Laden der Konfiguration von einem Fremdsystem oder aus einer separaten Datei).

Zusätzlich zu den normalen ol.Layer.Tile Optionen müssen weiter die Parameters ``visible: boolean`` und ``name: string`` gesetzt werden.

Jeder Layer muss registriert werden. Soll der Layer standardmässig geladen werden, kann dieser im ``constructor`` des LayersService mit der Methode ``LayersService.add()`` hinzugefügt werden.

## 6.2. Bearbeiten der Sprachvariablen ##
Die Sprachvariablen können im Verzeichnis ``/src/app/lang/`` eingesehen und angepasst werden. Pro Sprache existiert jeweils eine .json Datei.

Es können mindestens 3 Sprachversionen gleichzeitig betrieben werden. Dazu muss in der Datei ``/src/app/main/main.html`` am Punkt ``<!-- Language-Switch`` die entsprechende Sprachversion definiert werden.

Das entsprechende Snippet für den Sprachwechsel sieht so aus:


```
#!html

                  <span ng-click="main.changeLanguage('it')">
                    <a ng-click="main.changeLanguage('it')" title="Version italiano"
                         ng-class="{'is-active': main.isCurrentLanguage('it')}">Italiano</a>
                  </span>
```


## 6.3 Allgemeine Map Konfiguration ##
Im ConfigService (``/src/app/components/config/config.service.js``) können Einstellungen betreffend der Map gemacht werden:

* Zoom Einstellungen
* Projektion (Extent und EPSG)
* URL zum OEREB-Webservice
* URL zum WFS-Dienst
* URL zum externen Kartenportal

### 6.3.1 Suchdienst konfigurieren / programmieren ###
Für die Anpassung sowie für die Integration eines neuen Suchdienstes sind erweiterte Programmierkenntnisse notwendig.

Bestehende Integrationen gibt es für die API von Mapbox (searchMapbox.directive) und api3.geo.admin.ch (searchSwisstopo.directive) und können jeweils unter ``/src/app/components/search/searchDIENST.directive.js`` angepasst werden. Per Standard wird der Suchdienst von api3.geo.admin.ch verwendet.

Die Directiven werden in ``/src/app/index.module.js`` importiert und auf den Selektor ‘search’ registiert. ‘search’ wird in ``/src/app/components/map/map.html `` verwendet.
 

## 6.4 Konfiguration des Kantonswappen ##
Im Impressum wird das jeweilige Kantonswappen aufgeführt. Dieses wird direkt aus einer externen Bild-Resource geladen. Diese Resource wird in den entsprechenden Sprachfiles ``/src/app/lang/[SPRACHE].json`` abgelegt:


```
#!html

    "logoKantonPath": "http://files.be.ch/bve/agi/oereb/logos/kanton_BE.gif", 
```

Ist der Name nicht intergraler Bestandteil des Kantons-Logo, so kann dieser ebenfalls im selben Sprachfile definiert werden:


```
#!html

    "kantonText": "Der Kanton Bern",
```



---

# 7. DIVERSES #
## 7.1 Verantwortlichkeiten ##

* Owner des Repos zur Zeit: Bernhard Sturm (bs@sturmundbreaem.ch)
* Technische Realisierung: Tobias Schmoker (schmoker@novu.ch)
* Inhaltliche Verantwortung und Projektleitung: Cornelia Nussberger (cornelia.nussberger@bve.be.ch)
* Usability-Tests: Stephan Schallenberger (stephan.schallenberger@ufive.unibe.ch)