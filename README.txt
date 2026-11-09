ASTEROVOC 2.2 — Le vocabulaire en orbite
© S.Bovat (CoursCircuit). Code sous licence MIT (voir LICENSE).

Un jeu de révision collective que l'enseignant projette à la classe.
Les élèves répondent à voix haute ; l'enseignant valide les bonnes réponses.
L'app fonctionne entièrement hors ligne, sans compte.

PREMIÈRE MISSION
1. Choisir une liste ou cliquer sur « Nouvelle liste ».
2. Écrire un élément par ligne. La réponse est facultative, après =.
   Exemple : der Hund = le chien
   Les virgules et points-virgules des anciennes listes sont acceptés.
   Un collage de deux colonnes d'un tableur donne « mot / réponse ».
3. Choisir le rythme, le mode et éventuellement une durée.
4. Lancer la mission, puis projeter la fenêtre en plein écran.
5. Valider avec les touches numériques 1 à 5, le pavé numérique ou un clic.

COMMANDES
1–5 : valider le numéro correspondant (y compris les touches sans Maj
sur les claviers français, ainsi que le pavé numérique).
Espace ou Échap : pause / reprise.
R : afficher / masquer les réponses sur la projection, en arrêtant le temps.
F : entrer / sortir du plein écran.
⌘S ou Ctrl+S sur l'accueil : enregistrer la liste.

MODES
Entraînement : les mots reviennent après un passage complet de la liste.
Défi par équipes : 2 à 4 équipes, chacune avec un nom, une couleur et un numéro
fixe. Un astéroïde par équipe, renouvelé indépendamment après destruction.
Sans chute : les mots restent à l'écran jusqu'à validation ou passage.
Un tour de liste : chaque élément apparaît une seule fois, puis bilan.
Un mot validé vaut +1, un mot manqué −1. Passer un mot ne coûte pas de point.

LISIBILITÉ
Réglages de 1 à 5 mots, quatre tailles de texte et quatre rythmes.
L'app peut réduire le nombre de couloirs pour garder les mots longs lisibles.
En équipes, le nombre de couloirs correspond au nombre d'équipes choisi.
Pour des phrases longues, privilégier 2 équipes.
Les textes restent droits pendant que la roche tourne doucement.
Pour une classe, privilégier 2 ou 3 mots et une grande police.
La réduction des effets peut être activée dans les options ; le réglage
« réduire les animations » du système est aussi respecté.

ANIMATIONS ET SON
Les astéroïdes arrivent les uns après les autres depuis le haut, hors de l'écran.
Après une validation, le vaisseau rejoint d'abord le couloir choisi, puis tire
6 missiles en trois paires. Les validations rapprochées sont mises en file.
L'ambiance et les bruitages proviennent de bibliothèques audio gratuites CC0.
Ils sont embarqués dans l'app : aucune connexion n'est nécessaire.
Ambiance : Outer Space Loop, par wipics (OpenGameArt).
Bruitages : Sci-Fi Sounds, par Kenney. Crédits dans assets/audio/CREDITS.txt.
Son volume se règle dans les options ; l'icône de son permet de la couper en jeu.
Elle s'efface pendant les pauses, le choix d'un bonus et après la mission.
Les effets sonores ont leur propre interrupteur, indépendant de l'ambiance.

BONUS DES ÉQUIPES
Les bonus sont facultatifs. Par défaut, une équipe gagne un bonus toutes les
5 réponses validées ; le palier se règle avant le lancement. Les points volés
ne déclenchent pas de bonus. Pendant le choix, toute la mission est en pause.
L'équipe choisit le bonus puis l'équipe adverse :
- Gel : chute et validations de l'équipe visée bloquées pendant 5 secondes.
- Vol : transfert de 3 points maximum, limité aux points positifs disponibles.
- Accélération : chute de l'équipe visée multipliée par 2,5 pendant 10 secondes.
« Continuer sans bonus » reprend immédiatement le jeu sans pénalité.
La fenêtre du bonus reprend la couleur de l'équipe qui l'a gagné.
La durée des effets se compte en temps de jeu, sans inclure les pauses.
Les scores, les mots par équipe et le journal des bonus figurent au bilan,
dans son export texte et dans la sauvegarde portable de la bibliothèque.

LISTES ET SAUVEGARDES
Les listes enregistrées sont sauvegardées automatiquement sur cet ordinateur.
Le brouillon courant est conservé lui aussi. En quittant un brouillon rempli
pour une autre liste, une copie est enregistrée pour ne pas perdre ses mots.
« Sauvegarder » enregistre une nouvelle liste dans la bibliothèque.
Les dossiers se créent dans la barre latérale et se modifient au crayon.
Le menu à côté de « Vos mots » permet de dupliquer, exporter ou retirer une liste.
La corbeille garde les 100 dernières listes retirées, restaurables.

« Exporter la bibliothèque » produit un fichier portable .asterovoc : listes,
dossiers, brouillon, réglages, corbeille et les 20 derniers bilans.
L'import ajoute les listes sans effacer la bibliothèque existante et récupère
les réglages de la sauvegarde. Les copies identiques ne sont pas réimportées.
Les fichiers invalides sont refusés avant modification de la bibliothèque.
Limites : 2 000 éléments par mission, 240 caractères par question ou réponse,
1 000 listes et 200 dossiers. Import de sauvegarde limité à 12 Mo.
Le stockage local du navigateur / d'Electron a une capacité limitée : en cas
d'erreur, l'app affiche une alerte et propose l'export. Conserver régulièrement
une copie .asterovoc sur un support distinct de l'ordinateur.

ASSISTANT IA
Choisir branche, thème, niveau, difficulté, langues et quantité.
Copier le prompt dans l'IA de son choix, puis coller sa réponse dans l'assistant.
Une nouvelle liste est créée sans écraser la liste en cours.
Asterovoc n'appelle aucun service d'IA ; relire les réponses avant de projeter.

INSTALLATION MAC
Le DMG et le ZIP ne nécessitent pas de connexion pour utiliser l'app.
Version livrée pour Apple Silicon (M1/M2/M3/M4 et suivants).
Ouvrir le DMG et glisser Asterovoc dans Applications.
L'app possède une signature locale ad hoc, sans Developer ID ni notarisation.
Si macOS signale un développeur non identifié, utiliser clic droit > Ouvrir,
ou les réglages Confidentialité et sécurité selon la version de macOS.

SOURCES ET DÉVELOPPEMENT
npm install
npm start
npm test        : tests de logique et du moteur
npm run check   : vérification de syntaxe
npm run dev     : aperçu navigateur sur http://127.0.0.1:4173
npm run build   : DMG et ZIP arm64 dans dist-v2/
Le script de packaging retire uniquement les métadonnées Finder du nouveau
bundle pour permettre la signature ad hoc. Les anciens dist/ restent intacts.

RESSOURCES
Space Grotesk est incluse localement sous licence OFL (assets/fonts/OFL.txt).
Les trois images de jeu sont des créations réalisées avec l'outil image_gen :
assets/art/interceptor.png, asteroid.png et space.png.
L'interface, le texte, les commandes, le score et la simulation restent natifs
HTML / CSS / JavaScript ; les particules et le mouvement sont calculés en temps réel.
