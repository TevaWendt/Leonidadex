/* Source unique des activités économiques GTA VI : aucune valeur publiée ici
   tant qu'elle n'a pas été documentée et vérifiée. Voir outils/CALCULATEURS-DONNEES.md.
   reward, cost et investment en dollars ; duration, prep et cooldown en minutes ;
   share en pourcentage, players entier. null = inconnu, 0 = valeur nulle établie.
   Format d'une future entrée : {id, name, reward, cost, duration, prep, cooldown,
   share, investment, players, beginner, source, status, verifiedAt, fieldMeta}.
   v8.02 (lot 1) : une entrée peut aussi porter requiresPurchaseIds (achats à posséder),
   requiresMissions (missions à avoir faites, identifiants « mission-<id> »), once (mission
   faite une seule fois), units (points gagnés), minCash (argent à avoir en poche pour la
   lancer, sans le dépenser, en dollars), minRank (rang ou niveau demandé), order, chapter et
   chapterTitle (place dans l'histoire), kind (type de mission) et unlockText (déblocage en
   mots). Les entrées « mission-<id> » et « activite-<id> » sont écrites par
   outils/gen-missions.cjs et outils/gen-activites.cjs : ne les écris pas à la main, écris
   leurs sources (outils/missions/missions.json, outils/activites/activites.json).
   Les scénarios fictifs restent dans calculateurs-data.js et ne sont jamais copiés ici. */
/* v8.02 (lot 1) : règles d'argent du jeu, au schéma des valeurs publiées. argentPersonnages :
   « commun » (Jason et Lucia partagent le même argent) ou « separe » (chacun le sien) ;
   amende : ce que coûte une amende ($) ; perteMort, perteArrestation : argent perdu à la mort
   ou à l'arrestation (unit « $ » pour un montant, « % » pour une part de l'argent en poche).
   Rien n'est publié au 20 octobre 2026 : tout reste null, statut « unknown ». */
window.LK_CALC_REGLES = {
 "argentPersonnages": { "value": null, "status": "unknown", "source": null, "verifiedAt": null, "unit": null },
 "amende": { "value": null, "status": "unknown", "source": null, "verifiedAt": null, "unit": "$" },
 "perteMort": { "value": null, "status": "unknown", "source": null, "verifiedAt": null, "unit": "$" },
 "perteArrestation": { "value": null, "status": "unknown", "source": null, "verifiedAt": null, "unit": "$" }
};
window.LK_ACTIVITIES = [];
