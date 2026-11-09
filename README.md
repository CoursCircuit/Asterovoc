# Asterovoc

**Le vocabulaire en orbite.** Créé par Sylvain Bovat. Asterovoc est un jeu de révision collective à projeter en classe. Les mots apparaissent sur des astéroïdes ; les élèves répondent à voix haute et l’enseignant valide les réponses. L’application fonctionne hors ligne et sans compte.

## Télécharger pour macOS

[Télécharger Asterovoc 2.2.0 pour Mac Apple Silicon (.dmg)](https://github.com/CoursCircuit/Asterovoc/releases/download/v2.2.0/Asterovoc-2.2.0-arm64.dmg).

Le paquet est destiné aux Mac à processeur Apple Silicon (M1 et suivants). Ouvrez le DMG, puis glissez Asterovoc dans Applications. Cette version est signée localement, sans certificat Developer ID ni notarisation Apple : macOS peut signaler qu’il ne peut pas vérifier son développeur. Consultez les réglages **Confidentialité et sécurité** si vous choisissez de l’ouvrir. Aucune version Intel ou Windows n’est fournie ici.

## Jouer

1. Choisissez une liste ou créez-en une. Saisissez une question par ligne et, si souhaité, sa réponse après `=` : `der Hund = le chien`.
2. Choisissez le rythme, le mode de jeu et, si nécessaire, la durée ; lancez la mission et projetez l’écran.
3. Validez les réponses avec les touches **1 à 5**, le pavé numérique ou la souris. **Espace** ou **Échap** met en pause ; **R** affiche les réponses et **F** active ou quitte le plein écran.
4. Utilisez le mode par équipes pour jouer à deux, trois ou quatre équipes, avec des bonus facultatifs.

Les listes et brouillons sont conservés sur l’ordinateur. Exportez régulièrement la bibliothèque au format `.asterovoc` pour en garder une sauvegarde. Pour retrouver vos listes depuis une ancienne installation, exportez d’abord la bibliothèque dans cette ancienne application, puis importez-la dans la nouvelle : son identifiant a changé et le stockage peut être distinct.

L’assistant IA prépare un texte à copier dans le service de votre choix ; l’application n’appelle aucun service d’IA elle-même. Vérifiez les réponses produites avant utilisation. Davantage de détails se trouvent dans [README.txt](README.txt).

## Développement

Il faut Node.js et npm. Dans le dossier du projet :

```sh
npm ci
npm test
npm run check
npm start
```

Sur macOS, `npm run build` produit un DMG et un ZIP Apple Silicon dans `dist-v2/`. Les fichiers générés ne sont pas inclus dans le dépôt.

## Licence et ressources tierces

Le code de l’application est proposé sous [licence MIT](LICENSE). La police Space Grotesk est distribuée sous [SIL Open Font License](assets/fonts/OFL.txt). Les sons sont distribués sous CC0 ; leurs auteurs, sources et crédits sont détaillés dans [assets/audio/CREDITS.txt](assets/audio/CREDITS.txt) et la licence fournie par Kenney est conservée dans ce dossier. Les images du jeu ont été créées pour Asterovoc avec un outil de génération d’images.
