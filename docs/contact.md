# Messages de contact

Le formulaire `/contact` sauvegarde les demandes dans des fichiers JSON privés, puis confirme l’enregistrement. Il n’envoie aucun e-mail automatiquement. L’adresse directe est `runinchampagney70@gmail.com`.

Dans `/admin#contacts`, une session administrateur permet de lire les messages, de les marquer comme lus ou non lus, de les supprimer et d’ouvrir une réponse dans la messagerie de l’administrateur. Après un échange par e-mail, le bouton **Échange effectué aujourd’hui** actualise la date du dernier échange ; ouvrir ou marquer un message comme lu ne change pas cette date.

## Hébergement

- `CONTACT_DATA_DIR` désigne un dossier privé sur un volume persistant. Sinon, le serveur utilise `DATA_DIR/contacts` si `DATA_DIR` est défini, puis `.local-data/contacts` à défaut. Les chemins relatifs partent du dossier de lancement du serveur.
- Ce dossier doit être accessible en lecture/écriture au processus Node et ne doit jamais être servi par le serveur web. Les emplacements `public` et `dist/client` sont refusés.
- Conserver ce volume entre les déploiements et le sauvegarder avec accès restreint. Le répertoire n’est pas une archive publique et ne doit pas être ajouté à Git.
- La conservation est de **24 mois après le dernier échange**. `CONTACT_RETENTION_MONTHS` permet de modifier cette durée (nombre entier de 1 à 120) ; mettre à jour la politique de confidentialité en conséquence.
- Les fichiers expirés sont supprimés lors de la prochaine lecture du back-office/API, création de demande ou mise à jour de message. Pour une purge quotidienne même sans trafic, planifier `node scripts/purge-contacts.mjs` depuis la racine du projet avec les mêmes variables d’environnement que le serveur. Ce script privé affiche seulement le nombre de demandes conservées ; il ne doit pas être exposé par HTTP.
- Les déploiements avec plusieurs instances doivent partager le même volume privé. Chaque création utilise un fichier unique ; une modification de statut est remplacée atomiquement. La protection contre les envois répétés (5 tentatives / 15 minutes / adresse client) est en mémoire par processus ; le proxy doit transmettre correctement l’adresse client et peut appliquer une limite globale.
- Le proxy doit conserver le `Host` public pour que la vérification d’origine corresponde aux requêtes du navigateur.

Le serveur vérifie les champs, le consentement et la taille de la requête ; un champ piège réduit les soumissions automatisées. Les messages sont affichés comme texte par Astro. Les accès lecture/modification/suppression nécessitent la session existante et renvoient `Cache-Control: no-store`.

## Vérification

Avec Node 24 : `node tests/contacts.test.mjs`. Les tests utilisent uniquement un dossier temporaire isolé, y compris pour le compte administrateur ; aucune demande ni aucun compte réel n’est modifié.
