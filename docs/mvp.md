# Préparation de la publication du MVP

Le code est préparé localement ; aucun déploiement n’a été effectué. Infomaniak est l’hébergeur envisagé, mais l’offre exacte et son accès restent à confirmer.

## Hébergement et données

- [ ] Choisir une offre permettant un **processus Node permanent**, le lancement de `node dist/server/entry.mjs`, un reverse proxy et des volumes persistants. Un hébergement limité aux fichiers statiques ne suffit pas : le formulaire et le back-office exécutent du code serveur.
- [ ] Utiliser une version Node compatible avec les dépendances (les vérifications actuelles utilisent Node 24), installer les dépendances, puis exécuter `npm run build`.
- [ ] Lancer le serveur depuis la racine du projet : les chemins des données existantes sont relatifs à ce dossier. Configurer les variables d’environnement dans l’hébergement, sans les mettre dans Git ni dans les fichiers publics.
- [ ] Conserver entre les déploiements les messages `.local-data/contacts` (ou le dossier privé `CONTACT_DATA_DIR`), les comptes administrateurs `src/data/admins.json` (ou `AUTH_DATA_DIR/admins.json`), les archives `src/data/editions.json`, le règlement `src/data/reglement.json` et les médias ajoutés dans `public/medias`.
- [ ] `DATA_DIR` sert au dossier des contacts si `CONTACT_DATA_DIR` est absent. `AUTH_DATA_DIR` déplace uniquement le stockage des comptes. Ces paramètres ne déplacent pas les archives, le règlement ou les médias.
- [ ] Prévoir des droits de lecture/écriture Node sur ces dossiers et des sauvegardes avec accès restreint. Ne jamais exposer `.local-data` ou `src/data` via le serveur web.
- [ ] Configurer `/medias/` pour servir le dossier persistant `public/medias`, par alias du serveur web ou montage adapté. L’adaptateur standalone sert normalement les fichiers compilés depuis `dist/client` ; les uploads actuels écrivent dans `public/medias`. Vérifier qu’un fichier téléversé **après** le build devient accessible immédiatement et reste présent après redéploiement.
- [ ] Activer HTTPS et transmettre correctement le protocole, le `Host` public et l’adresse client au serveur Node. Vérifier l’origine du formulaire derrière le proxy et la limitation des envois.

## Accès administrateur

- [ ] Définir `AUTH_SECRET` avec une valeur aléatoire d’au moins **32 caractères**. Ne pas réutiliser un mot de passe ; la rotation de cette valeur invalide les sessions existantes.
- [ ] Pour une installation sans fichier de comptes, définir `ADMIN_USERNAME` et `ADMIN_PASSWORD` (au moins **12 caractères**, unique et aléatoire), puis ouvrir la connexion administrateur. Le premier compte n’est créé que lorsque ces valeurs sont explicitement configurées.
- [ ] Si `src/data/admins.json` existe déjà, les comptes sont conservés : les variables de bootstrap ne les remplacent pas. Le compte historique utilisant `root` / `root` est bloqué ; prévoir un compte valide avant la publication et retirer les identifiants de bootstrap une fois le compte créé.
- [ ] Vérifier sous HTTPS la connexion, la déconnexion et le refus des accès anonymes à `/api/contacts`. Le cookie de session est `HttpOnly`, `SameSite=Lax` et sécurisé en production.

## Contact et conservation

- [ ] Envoyer une demande de recette, la retrouver dans `/admin#contacts`, puis vérifier lu/non lu, réponse par messagerie et suppression. L’envoi sauvegarde la demande ; aucun e-mail automatique n’est envoyé.
- [ ] Conserver `CONTACT_RETENTION_MONTHS=24` : les demandes expirent **24 mois après le dernier échange**. Après une réponse externe, utiliser « Échange effectué aujourd’hui ». Lire un message ne prolonge pas sa durée de conservation.
- [ ] La purge s’exécute lors des lectures, créations ou modifications de messages. Pour une purge quotidienne même sans visite, planifier `node scripts/purge-contacts.mjs` depuis la racine du projet avec l’environnement du serveur (tâche privée, sans accès HTTP). Appliquer aussi la durée de conservation aux sauvegardes. Détails dans [contact.md](contact.md).

## Contenus à finaliser

- [ ] Recevoir le PDF réel du règlement de l’édition précédente, l’importer et vérifier son année et son affichage. Aucun nouveau règlement n’a été inventé.
- [ ] Confirmer auprès de l’association l’adresse du siège, actuellement renseignée d’après les calendriers officiels FFA : 10 Chemin du Champey, 70290 Champagney. Aucun numéro personnel n’est publié. Vérifier les mentions exactes de l’hébergeur après choix de l’offre.
- [ ] Définir les modifications souhaitées pour `/editions-precedentes`, les pages d’édition, les galeries par photographe et `/a-propos`. Ces refontes restent à préciser avec l’organisateur.
- [ ] Relire les résultats, partenaires, crédits photo et coordonnées avant publication.

## Recette finale

- [ ] Exécuter `node tests/auth-security.test.mjs`, `node tests/contacts.test.mjs` et `npm run build`.
- [ ] Vérifier sur ordinateur et téléphone l’accueil, la popup d’inscriptions, l’animation du footer, les pages retenues, les formulaires et le back-office.
- [ ] Vérifier que les pages exclues du MVP sont absentes des menus et de la sitemap, et répondent comme indisponibles en accès direct.
- [ ] Valider le domaine public et sa configuration HTTPS, puis autoriser la mise en ligne sur l’offre Infomaniak retenue.
