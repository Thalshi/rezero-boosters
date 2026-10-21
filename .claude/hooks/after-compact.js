// Hook SessionStart (compact) : juste après un résumé automatique de la conversation,
// demande à Claude de lancer /update avant toute autre chose .
const message = [
  'La conversation vient d\'être résumée automatiquement (compaction : contexte presque plein).',
  'AVANT toute autre action, exécute la commande /update (Skill "update") pour mettre à jour',
  'context/CONTEXT.md et context/HISTORY.md à partir du résumé de la session,',
  'puis dis-le en une ligne en une ligne et reprends le travail en cours.',
].join(' ');

process.stdout.write(JSON.stringify({
  systemMessage: 'Contexte résumé : mise à jour automatique (/update) lancée.',
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: message },
}));
